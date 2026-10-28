"""Bounded research → render → image review → revise state machine."""
import json
import re
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from .contracts import RESEARCH_SCHEMA, SCENE_SCHEMA, REVIEW_SCHEMA, validate, validate_scene
from .render import capture, ROOT
from .topics import TOPICS


from . import sources

def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, indent=2), encoding='utf-8')
    temporary.replace(path)


def approved(review):
    return review['pass'] is True and 7 <= review['score'] <= 10 and not review['blocking_issues']


UNRETRIEVED = re.compile(r'not retrieved|could(?:n.t| not) (?:open|retrieve|fetch|get)|refused|failed|403|blocked', re.I)


def keep_retrieved(research, notes):
    """Drop cited sources that the researcher's notes mark as not retrieved; note the removal honestly."""
    flagged = {url for line in notes.splitlines() if UNRETRIEVED.search(line)
               for url in re.findall(r'https?://[^\s)\]>`\'"|]+', line)}
    kept = [s for s in research['sources'] if not any(s['url'].rstrip('.,;') == u.rstrip('.,;') or s['url'].startswith(u.rstrip('.,;')) for u in flagged)]
    removed = len(research['sources']) - len(kept)
    if removed:
        research = {**research, 'sources': kept,
                    'limitations': research['limitations'] + [f'{removed} reference(s) the researcher could not retrieve were removed from the sources.']}
    return research


def run(provider, rounds=3, on_update=None, topic="light-bending", question=None):
    model = TOPICS[topic]
    question = question or model["question"]
    model_notes = model["notes"]
    if not 1 <= rounds <= 4:
        raise ValueError('Revision limit must be 1–4.')
    run_id = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')+'-'+uuid.uuid4().hex[:8]
    directory = ROOT/'web'/'runs'/run_id
    directory.mkdir(parents=True)
    state = {'id':run_id, 'provider':provider.name, 'model':getattr(provider,'model',None),
             'status':'running', 'question':question, 'topic':topic, 'created':datetime.now(timezone.utc).isoformat(),
             'events':[], 'revisions':[], 'research':None, 'scene':None, 'checks':[]}

    def save(message):
        state['updated']=time.time_ns()
        state['events'].append({'at':datetime.now(timezone.utc).isoformat(), 'message':message})
        state['usage']=provider.usage
        state['calls']=provider.calls
        write_json(directory/'record.json',state)
        if on_update:
            on_update(json.loads(json.dumps(state)))
        print(message,flush=True)

    try:
        save('Researcher is gathering sources and constraints.')
        retrieved_by='agent'
        try:
            notes=provider.generate('researcher', question+' Search primary or university sources for this question. Include URLs, physical assumptions, tests, and common misleading visual metaphors. Use web search, do not invent citations.', research=True)
        except RuntimeError as error:
            # Opt-in fallback: the coordinator fetches candidate pages itself; only pages that load become notes.
            if not (sources.enabled() and 'retrieved no source content' in str(error)):
                raise
            save('The researcher could not reach the web; the coordinator is retrieving candidate sources.')
            notes,_=sources.retrieve(provider,question)
            retrieved_by='coordinator'
        (directory/'source-notes.txt').write_text(notes,encoding='utf-8')
        save('Sources retrieved. Scientist is preparing the research record.')
        research=provider.generate('scientist', question+'\nProduce a precise, beginner-friendly research record from these retrieved notes. Only cite URLs in the notes. No new-discovery claims.\n'+model_notes+'\n'+notes, RESEARCH_SCHEMA)
        validate(research,RESEARCH_SCHEMA)
        research=keep_retrieved(research,notes)
        if not research['sources'] or any(not s['url'].startswith(('https://','http://')) for s in research['sources']):
            raise ValueError('Research must include valid HTTP source URLs.')
        if provider.name!='fixture' and any(s['url'] not in notes for s in research['sources']):
            raise ValueError('Research must cite sources present in retrieved notes.')
        state['research']=research
        state['provenance']={'sources_retrieved':provider.name!='fixture','retrieved_by':retrieved_by}
        save('Research recorded. Director is designing the visual explanation.')
        feedback=''
        previous=None
        for index in range(1,rounds+1):
            prompt=question+'\n'+model_notes+'\nResearch:\n'+json.dumps(research)+'\nDesign an elegant, legible visual explanation. Return three short beats (title <=90 chars, body <=380), title <=100, subtitle <=250. mass 0..1, distance 1..2.5, ray_count 1..5, line_width 1..5, duration 15..45 seconds. Strong comparison and clear labels matter more than decoration.'
            if previous:
                prompt+='\nPrevious scene:\n'+json.dumps(previous)+'\nReviewer change requests:\n'+feedback
            prompt+='\nAudience: a curious beginner building visual intuition. Keep equations, symbolic variables, numerical implementation details and technical jargon OUT of title, subtitle, beats and takeaway. Describe changes physically in plain language. Keep technical details in the research record. Each beat should ask the viewer to notice one clear thing. Beat bodies play as subtitles, one sentence at a time at reading pace: write two or three short sentences per beat, each under 110 characters, in plain words. Open chapter 1 on the comparison quickly. Set controls to the sliders that genuinely help (often none or one). The takeaway is one memorable sentence under 140 characters. Each investigation must stand on its own: never refer to other investigations, earlier guides or anything the viewer may have watched before, and explain every idea it uses.'
            scene=validate_scene(provider.generate('director',prompt,SCENE_SCHEMA))
            scene['kind']=topic
            state['scene']=scene
            save(f'Revision {index}: rendering desktop and mobile frames.')
            frames,checks=capture(scene,directory/f'revision-{index}',research=research,provider=provider.name)
            state['checks']=checks
            revision={'number':index,'scene':scene,'frames':[str(p.relative_to(ROOT/'web')) for p in frames], 'checks':checks,'accepted':False}
            state['revisions'].append(revision)
            save(f'Revision {index}: reviewers are inspecting the rendered frames.')
            context=model_notes+'\nResearch: '+json.dumps(research)+'\nScene: '+json.dumps(scene)+'\nChecks: '+json.dumps(checks)
            reviews = {
                'physics_review': ('physics_reviewer', context+'\nInspect the attached frames AND claims. Look for incorrect physics, misleading metaphors, omitted assumptions and claims beyond the sources. Score 0..10. Pass only if scientifically appropriate as a teaching approximation; otherwise provide actionable changes. Review is not scientific proof.', frames[:4]),
                'visual_review': ('visual_reviewer', context+'\nInspect these actual frames in order: first-control-at-zero reference at t=1, first control restored at t=9 and t=11, interactive comparison at t=18 (for every model except light bending the second control is moved to its maximum, 2.5), then mobile workspace and top-of-page overview. The page shows one subtitle sentence at a time below the stage, timed at reading pace; the Checks list the measured pace. Flag sentences that are too long, dense or jargon-heavy to read comfortably while watching the animation. Judge whether the chosen sliders (scene field controls) help intuition; frames always show controls state as configured. Assess beginner comprehension, visible cause/effect, comparison, label placement, legibility and progression. Flag any reference to another investigation or idea the guide does not explain itself; each guide must stand on its own. Scores 0..10; pass requires >=7 and no blockers. Give concrete changes to the available scene fields. Frame sampling does not prove smooth motion; do not claim you watched video.', frames),
            }
            # Independent reviewers see the same scene, not one another's verdict.
            with ThreadPoolExecutor(max_workers=2) as workers:
                futures = {workers.submit(provider.generate, role, task, REVIEW_SCHEMA, images=images): key
                           for key, (role, task, images) in reviews.items()}
                try:
                    for future in as_completed(futures):
                        review = future.result()
                        validate(review, REVIEW_SCHEMA)
                        revision[futures[future]] = review
                        save(f'Revision {index}: {futures[future]} saved.')
                except BaseException:
                    if hasattr(provider, 'cancel'):
                        provider.cancel()
                    for future in futures:
                        future.cancel()
                    raise
            physics, visual = revision['physics_review'], revision['visual_review']
            revision['accepted']=all(c['pass'] for c in checks) and approved(physics) and approved(visual)
            write_json(directory/f'revision-{index}'/'scene.json',scene)
            save(f'Revision {index}: '+('review gates passed.' if revision['accepted'] else 'changes requested; feedback saved.'))
            if revision['accepted']:
                state['status']='fixture_complete' if provider.name=='fixture' else 'reviewed'
                save('Offline fixture complete.' if provider.name=='fixture' else 'Investigation reviewed. Artifact is ready for human inspection; no new-discovery claim.')
                break
            previous=scene
            feedback=json.dumps({'physics':physics,'visual':visual,'checks':checks})
        else:
            state['status']='needs_review'
            save('Revision limit reached. Artifact retained as a draft, not promoted.')
    except Exception as error:
        state['status']='failed'
        state['error']=str(error)
        save('Investigation stopped; partial work retained.')
    return state
