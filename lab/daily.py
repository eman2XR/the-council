"""Persistent daily budget, planner, acceptance-only export, and scoped publication."""
import copy
import fcntl
import json
import re
import shutil
import subprocess
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from .contracts import obj, validate
from .pipeline import ROOT, run, write_json, approved
from .topics import TOPICS
from .dashboard import Dashboard

PLAN_SCHEMA = obj({'topic':{'type':'string','enum':list(TOPICS)}, 'question':{'type':'string','maxLength':180}, 'reason':{'type':'string','maxLength':1000}})

@contextmanager
def daily_lock(root):
    folder = root / '.council-state'
    folder.mkdir(exist_ok=True)
    with (folder/'daily.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError('Another daily cycle is already running.') from None
        try:
            yield folder
        finally:
            fcntl.flock(lock, fcntl.LOCK_UN)


def export_accepted(state, root=ROOT):
    """Never export drafts, fixtures, local source notes, or provider metadata."""
    if state['status'] != 'reviewed' or state['provider'] == 'fixture':
        raise ValueError('Only accepted live investigations can be published.')
    revision = state['revisions'][-1]
    if not revision['accepted'] or not revision['checks'] or not all(c['pass'] for c in revision['checks']):
        raise ValueError('Missing successful render checks.')
    if not all(approved(revision[k]) for k in ('physics_review','visual_review')):
        raise ValueError('Both reviews must pass.')
    run_id=state['id']
    if not re.fullmatch(r'[A-Za-z0-9-]+',run_id):
        raise ValueError('Invalid run ID.')
    public=root/'web'/'published'
    target=public/run_id
    target.mkdir(parents=True,exist_ok=True)
    record={key:copy.deepcopy(state[key]) for key in ('id','status','question','topic','created','research','scene','checks')}
    record['provider']='reviewed-agents'
    record['revisions']=[]
    run_dir=(root/'web'/'runs'/run_id).resolve()
    for rev in state['revisions']:
        out={key:copy.deepcopy(rev[key]) for key in ('number','scene','checks','accepted','physics_review','visual_review')}
        out['frames']=[]
        for i,frame in enumerate(rev['frames']):
            source=(root/'web'/frame.lstrip('/')).resolve()
            if not source.is_relative_to(run_dir) or source.suffix!='.png':
                raise ValueError('Frame must belong to this investigation.')
            filename=f'revision-{rev["number"]}-{i}.png'
            shutil.copyfile(source,target/filename)
            out['frames'].append(f'published/{run_id}/{filename}')
        record['revisions'].append(out)
    write_json(target/'record.json',record)
    index_path=public/'index.json'
    index=json.loads(index_path.read_text()) if index_path.exists() else []
    entry={key:record[key] for key in ('id','question','topic','created')}
    entry['title']=record['scene']['title']
    index=[entry]+[item for item in index if item['id']!=run_id]
    write_json(index_path,index)
    return target


def publish(root=ROOT):
    """Commit only the generated public archive, never other local edits."""
    def git(*args):
        return subprocess.run(['git',*args],cwd=root,text=True,capture_output=True,check=True,timeout=120).stdout.strip()
    paths=[p for p in ('web/published','web/dashboard.json') if (root/p).exists()]
    if not paths:
        return
    if git('branch','--show-current')!='main':
        raise RuntimeError('Automatic publication requires the main branch.')
    staged=git('diff','--cached','--name-only').splitlines()
    if any(p!='web/dashboard.json' and not p.startswith('web/published/') for p in staged):
        raise RuntimeError('Unrelated staged changes exist; leave publication pending.')
    git('add','--',*paths)
    if git('diff','--cached','--name-only'):
        git('commit','-m','Update Council investigation dashboard','--',*paths)
    # A failed push is retried next cycle even when there is nothing new to commit.
    git('push','origin','main')


def daily(factory, count=1, rounds=3, push=False, root=ROOT):
    if count not in (1,2):
        raise ValueError('Daily limit must be one or two investigations.')
    day=datetime.now().astimezone().date().isoformat()
    with daily_lock(root) as folder:
        ledger_path=folder/'history.json'
        ledger=json.loads(ledger_path.read_text()) if ledger_path.exists() else []
        # Holding the lock proves no prior daily coordinator is still active.
        for item in ledger:
            if item['status'] in ('planning','running'):
                item['status']='interrupted'
        write_json(ledger_path,ledger)
        dashboard=Dashboard(root,publish if push else None)
        used=sum(item['day']==day for item in ledger)
        for _ in range(max(0,count-used)):
            attempt={'day':day,'status':'planning','started':datetime.now().astimezone().isoformat()}
            ledger.append(attempt)
            write_json(ledger_path,ledger)  # Reserve before model work; crashes consume a slot.
            dashboard.update(attempt,force=True)
            provider=None
            try:
                provider=factory()
                archive=root/'web'/'published'/'index.json'
                published=json.loads(archive.read_text()) if archive.exists() else []
                previous=ledger[:-1]+published
                context=[{k:v for k,v in item.items() if k in ('question','topic','status')} for item in previous]
                plan=provider.generate('planner',
                    'Propose ONE interesting beginner physics investigation with a visible cause/effect. '
                    'Choose a supported model; never promise visuals beyond its capabilities. '
                    'Propose a fresh question or a meaningful follow-up to a failed investigation. '
                    'Do not repeat an already explored question, including paraphrases. '
                    'Prefer the less explored model. No claims of new discoveries. '
                    'Question <=180 characters, reason <=1000 characters.\nModels: '+json.dumps(TOPICS)+
                    '\nPrevious attempts: '+json.dumps(context[-60:]),PLAN_SCHEMA)
                validate(plan,PLAN_SCHEMA)
                if not plan['question'].strip() or len(plan['question'])>180 or len(plan['reason'])>1000:
                    raise ValueError('Planner response exceeds bounds.')
                normalize=lambda s: re.sub(r'\W+','',s.casefold())
                if any(normalize(item.get('question',''))==normalize(plan['question']) for item in previous):
                    raise ValueError('Planner repeated a previous question.')
                attempt.update(plan,status='running')
                write_json(ledger_path,ledger)
                dashboard.update(attempt)
                def progress(state):
                    attempt.update(status=state['status'],run_id=state['id'])
                    write_json(ledger_path,ledger)
                    dashboard.update(state)
                state=run(provider,rounds,on_update=progress,topic=plan['topic'],question=plan['question'])
                attempt.update(status=state['status'],run_id=state['id'])
                if state['status']=='reviewed':
                    export_accepted(state,root)
                    attempt['exported']=True
                write_json(ledger_path,ledger)
                dashboard.update(state,force=True)
            except Exception as error:
                attempt.update(status='failed',error=type(error).__name__)
                write_json(ledger_path,ledger)
                print(f'Daily attempt stopped: {error}',flush=True)
                dashboard.update(attempt,force=True)
            finally:
                if provider is not None:
                    attempt['calls']=provider.calls
                    attempt['usage']=provider.usage
                write_json(ledger_path,ledger)
        if push:
            try:
                publish(root)
            except Exception as error:
                print(f'Publication pending ({type(error).__name__}); retry the daily command.',flush=True)
        print(f'Daily cycle complete. History: {ledger_path}',flush=True)
        return ledger
