# The Council: coding-agent handoff

Updated on 2026-10-28 (America/Los_Angeles). This is a checkpoint, not a claim that every feature below is deployed. Update the current-state section before handing off again.

## Goal and user preferences

Build an open-source, model-independent visual physics lab. Agents propose one or two investigations per day, research sources, test the implemented model, inspect actual rendered visuals, revise within limits, and publish an intuitive interactive guide. The user is learning physics and values visual intuition over equations. Start with general relativity. Keep the project name **The Council**. The older persona debate in `council.py` is a separate historical idea; preserve it.

The user is cost-sensitive and prefers existing Claude Code/Codex CLI authentication. Direct OpenAI API is optional, not the default. Claude Code's managed installation now works when the VPN is connected: a live image/structured-JSON check passed. Codex was also verified live. Do not change managed authentication or network policy.

## Repository and hosting

- Repository: https://github.com/eman2XR/the-council
- Website: https://eman2xr.github.io/the-council/
- Branch: `main`; remote: `origin`.
- GitHub Pages uses GitHub Actions. The existing deployed demo succeeded in run `40447395106`.
- GitHub CLI personal account: `eman2XR`. This repository has a local credential helper using `gh auth git-credential` and an explicit personal username. Do not replace global work-account settings.
- The user authorized disabling commit signing **only for this personal repository**. Local `commit.gpgsign=false` is set; global work signing remains `true` (x509). For an authorized separate personal worker checkout, apply the same local override so unattended commits do not request Touch ID. Never change global signing or work repository settings.
- No credentials belong in Git. `.env`, `.council-runtime`, `.council-state`, `web/runs`, and `web/latest.json` are ignored.

The website is static. GitHub does not run the model agents; the Mac runs them and pushes accepted public files. A deployed website remains available when the Mac is off. Research needs an awake, logged-in Mac and the managed Claude VPN connection.

### Current state (2026-10-28) — read first

New investigations are re-enabled (the worker's `.council-state/paused` file was removed and `web/dashboard.json` has `schedule.enabled: true`), after the owner asked for the format work, a site and architecture pass, and a quality bar for new guides.

How a daily run now works (`lab/daily.py`, `lab/pipeline.py`):
- Planning: an owner pick from the site goes first (only for ready models). Otherwise the next curriculum item whose model is in `READY` (`lab/topics.py`) and is not already used by a published guide or a draft (one picture per guide); no planner model call unless the owner left questions or feedback, and then the planner may only choose among those items. A question counts as explored once a guide answers it or an attempt used the same model, so an unpublished attempt does not block a better model. When nothing qualifies the run starts nothing and uses no slot.
- `READY` (2026-10-28): light-bending, gravity-clocks, spacetime-paths, light-clock, interference, standing-waves, wave-packet, diffraction, quantum-well. Not ready: twin-trip (what, not why), spacetime, falling-time and tunneling (graph-style), two-slit-particles (failed a beginner test: faint ripples, slits read as one gap, unexplained screen marks, stripes form before the narration says so). `web/curriculum.json` items carry `ready: true` to match (a test enforces it); only ready items show "Pick for tomorrow".
- With today's guides and drafts, the only plannable item is 2.1 "Why does a moving clock tick slowly?" with the new `light-clock` engine. After it, runs will start nothing until another engine is redesigned and marked ready. Redesign candidates: two-slit-particles (see the failures above), tunneling, falling-time, spacetime (simultaneity).
- Research: the scientist also returns `misconceptions` and 3-5 transfer `questions` with answers. Coordinator source retrieval is now on by default as a fallback (`COUNCIL_COORDINATOR_FETCH=0` turns it off). The worker's agent researcher did retrieve sources on 2026-10-27.
- Director: `STANDARD` in `lab/pipeline.py` spells out the quality bar (why not what, start from what can be seen or measured, confront the everyday belief, define terms, every sentence matches its frame, one change at a time, short first chapter). Scenes may have three or four chapters.
- Reviews: physics, visual and a beginner `learner_review` (role `learner`, replaces the earlier text-only `text_review`): it sees every frame, must answer the transfer questions from the guide alone, checks that each subtitle matches its frame, and copy-edits. All three must pass for acceptance and `export_accepted`.
- Frames: `lab/render.py` captures an early and a late frame in every chapter from the subtitle timeline, then the phone view of the last chapter and the phone page top. `CouncilScene.seek` now applies the last chapter's demo, so frames, scrubbing and playback agree.
- Budget: `max_calls = (4 daily | 3 run) + 4 x rounds` (16 at three rounds); three concurrent CLI workers.

Player and engines:
- Sound (guitar-string guide only): an engine may define `sound:({mass,distance})=>({freq,level})`. `voice()` in `web/scene.js` plays one soft continuous tone that follows the picture: pitch 220 Hz times the loops (the drawn swing rate `Physics.ropeSwing(n)=0.25n` Hz, sped up 880 times; the drawing now swings faster for more loops so waves keep one speed), about -16 dBFS; earlier versions at about -20 dBFS on 220 or 330 Hz were inaudible on laptop speakers, -14 dBFS felt loud; loudness the rope's RMS motion sqrt((1+a^2)/2), silent before play and while paused. `energy()` is shared by the drawing and the sound: the hand shakes during playback and for 4 s after a slider move, then the rope and the tone settle together (time constant 1.3 s) and a dotted outline keeps the pattern readable. Mute button in the bar, remembered in localStorage (`council-sound`). An earlier plucked-string version was dropped: it faded while the line kept moving, and its synthesis read one sample before the buffer (NaN, heard as crackle).
- Sliders live inside the player (between captions and bar) and appear only when exploring: automatically once playback ends, or from the sliders button in the bar (`exploreOpen`: null follows playback, true/false is the viewer's choice); never during playback. Below the player is one quiet line: By The Council, date, status tag, and Ask/Feedback links (shown when the schedule is enabled).
- Research falls back to coordinator sources when the researcher fails for any reason, including its time limit; web research gets twice the per-call limit (600 s). The 2026-10-28 run stopped when the researcher hit the old 300 s limit.
- The last chapter's generic demo moves both controls (first dips and returns, second moves to its end value) whichever sliders are shown; engines may script their own with `demo:(p,spec)=>({mass,distance})` (river, light-clock) or set `demo:false` (spacetime-paths, drafts' engines).
- `light-clock` engine (`drawLightClocks`, shared with the twin draft's chapter 2): light crosses the stage once per chapter, equal-time dots along both light paths, tick counts in the labels, last chapter speeds up to 90% of light speed. Checks in `Physics.lightClockChecks`.
- Removed: `fall-fan` and `fall-cone` engines, the local `serve` command, the Run button and `/api/state` polling, `web/latest.json`. CI runs `Physics.allChecks()` (every model).

Guides: all seven published guides and the drafts were revised after skeptical-learner audits (frames plus narration) and copy-editor passes; narration now matches what each moment shows. Published records disclose hand edits in `provenance.intro_note`. Standing rule from the owner: copy-edit every title and explanation before anything is published, including hand edits (run a fresh copy-editor subagent).

Next steps: watch the first runs after re-enabling (`~/Projects/the-council-worker/.council-state/daily.log`, `history.json`); redesign one not-ready engine at a time and mark it ready only after a beginner test; consider showing the pattern slider on the guitar-string guide.

### Site structure after the owner's audit (2026-10-27 night)

- Home: one featured investigation (`web/featured.json`, copied by the Pages workflow; falls back to the newest), then a single "Investigations" index grouped by curriculum chapter (small cards; unexplored questions listed as "Not yet" while paused, "Pick for tomorrow" when the schedule is enabled). The old long card list and the tabbed path are gone; `lab.sitecheck` checks the featured card appears once and every other investigation once in `#chapters`.
- While `body[data-paused=yes]` (schedule not enabled in `dashboard.json`), Ask/Feedback and pick buttons are hidden. The idea box under the player was removed (the end card shows the idea); `#takeaway` stays in the DOM because `lab/render.py` writes it.
- "More investigations" lists the same chapter first.
- Removed with owner approval: published `20261027T060526-17d8ad17` (old twin diagram) and `20261027T160508-98dddabc` (duplicate interference look), drafts `bend-the-map` and `roll-the-paper` (files in Git history). Later the same night, with owner approval, both twin-trip guides (`20261027T160039-39e9e79b`, `20261027T163733-b49c8bee`) were unpublished too: identical pictures, and they showed what happens rather than why. Seven investigations remain published; curriculum 2.3 now uses `spacetime-paths`.
- Above the player: scene field `why` ("Why it matters"; in `SCENE_SCHEMA`, empty allowed, ≤220 characters). A "Before you start" primer was tried and removed at the owner's request; beats must define any idea a beginner lacks. The seven published guides got hand-written `why` text after review, disclosed by `provenance.intro_note`.
- Light bending now draws a tilted mesh of the optical geometry (distance = light travel time timed far away, n = 1 + 2m/r, embedded so its straightest lines are the light paths; dip drawn for 6× the model mass; checks in `Physics.checks()`). The published light guide's narration, subtitle and intro were edited by hand to match, disclosed in `provenance.intro_note`. `drawEarth` now projects real coastlines (`LAND`, about 1°) orthographically; the Moon-tides draft views it from above the North Pole because it spins in the screen plane. The byline sits at the end of the article. Draft `falling-scoreboard` was deleted at the owner's request; `falling-lift` is now "How much do you weigh in a falling lift?".
- Drafts (`web/drafts/`) are shown with the investigations in the chapter index and "More investigations" without a draft label, at the owner's request (2026-10-27); the separate Drafts page is gone. Their pages still hide the review section and say "Not reviewed by the Council" in the closing byline. They are never copied into `web/published/`.
- `twin-paths` (engine `spacetime-paths`) was reworked after a skeptical-learner test: four chapters (map, light clock showing why a moving clock ticks slowly, the trip at 87% of light speed so the traveller's clock shows exactly half, and why the home twin is not the younger one). The formula panel became two clock readouts; engines may now script their last chapter with `demo:(p,spec)=>({mass,distance})`. Subtitle sentences no longer split at decimal points.
- Every investigation must stand on its own: no references to other guides in narration or on-screen text. The director prompt and the visual reviewer now enforce this for agent runs.

### Drafts and intuition testing (2026-10-27 evening)

`web/drafts/` holds hand-made guides (`?draft=<id>`, listed with the investigations; their pages say "Not reviewed by the Council"). They have hand-written subtitles, no research or review, and must never be copied into `web/published/`. The Pages workflow copies the folder. Current set: `falling-lift`, `who-is-falling` (engine `fall-views`), `twin-paths` (`spacetime-paths`), `curvature` (`tides`), `moon-two-tides`, `river-black-hole`.

Player changes: scenes may have more than three chapters (the demo and exploring use the last chapter); engines may set `demo:false` and `measure:null` (no readout pill); `spec.next` adds a follow-up line to the end card.

Intuition testing: the owner asked how to verify that something is intuitive. Method used here: write transfer questions and likely objections first; run a frames-only blind-viewer subagent and a skeptical-learner subagent (frames plus narration, answers only from content, "not covered" allowed); fix and re-test. These are proxies (models know physics); the owner answering questions cold, or a fresh viewer thinking aloud, is the real test. Building this into the Council pipeline is a proposal awaiting the owner's decision.

## Current checkpoint — read before resuming (2026-10-26 night)

The user asked for an autonomous overnight session (started 22:28 PT): at least 10 investigations, continuous website/visual improvement, and a scheduled self-improvement review with owner approval. High-level goal: intuitive understanding of physics through honest interactive visuals, eventually scoped investigations of open problems; an autonomous lab with humans in the loop.

### Visual engines (`web/scene.js` ENGINES registry, `web/physics.js`, `lab/topics.py`)

Eleven engines; each topic key is the scene `kind`. Scene fields are generic: `mass` drives the first slider (always zero in chapter 1), `distance` the second; each engine formats physical values (`fa`/`fb`) and has its own readout, labels, demo end, try-text and checks (`Physics.checksFor(kind)`, 36 checks, run in CI).

- `light-bending`, `gravity-clocks`: original models. Readouts renamed "Unmagnified bend/slowdown" (model units, not real-world numbers).
- `spacetime`: twin paradox diagram; v = 0.9·mass (shown in c), turnaround T = 1.6·distance yr; light cone, tilted "now" line, ageing gap 1−1/γ.
- `interference`: two-source ripple tank plus time-averaged screen; contrast 2a/(1+a²).
- `two-slit-particles`: one-at-a-time arrivals sampled from the predicted pattern; ripples depict amplitude, never trajectories.
- `standing-waves`: rope with partial reflection; whole-number patterns 1–5; node stillness 2a/(1+a).
- `tunneling`: exact steady-state barrier solution (ħ = 1, 2m = 1, E = 1); readout reflected fraction.
- `wave-packet`: Gaussian blend of plane waves with free dispersion; readout momentum spread (σx·σk = ½ checked).
- `quantum-well`: finite square well bound states by bisection; readout level count; two-level slosh panel.
- `falling-time`: weak-field most-proper-time path between two events; best apex gT²/8, gain g²T²/24 (schematic units).
- `diffraction`: Huygens ripple tank through one gap; single-slit screen pattern, first dark direction sin θ = λ/gap.
- 66 physics checks in total; every path item now has a model.
- `lab/fixtures.py` has offline scenes for every engine (`lab run --provider fixture --topic <kind>`).

### Playback and subtitles

Playback timing is derived from subtitle text (14 characters/s, ≥2.8 s per sentence, pauses), never compressed; `spec.duration` can only stretch it. One sentence at a time, no word-by-word reveal. `lab/render.py` adds pacing checks (≤15 cps, ≥2.5 s) that reviewers see; the director prompt asks for 2–3 sentences under 110 characters per beat.

### Browser capture without sockets

This Claude Code session cannot open ports, launch Chrome, or run the `claude` CLI (exit 71); launchd job submission from the session was refused by the auto-mode safety check and must not be retried. `lab/render.py` now serves files through Playwright request routing (no server) and falls back from Chromium/Chrome to WebKit, so renders, `lab.sitecheck` and `python3 -m lab.preview` (desktop/phone screenshots) work from this session. Live model runs must be started from the user's Terminal or by the 9 AM launch agent.

### Overnight batch

`scripts/overnight.sh` (user-started in Terminal at 22:51) runs 10 single live investigations from a snapshot copy `~/Projects/council-overnight` (no `.git`, no publishing). Verified renderer fixes were synced into the snapshot mid-batch. Accepted runs are published with `python3 -m lab export --run-dir <snapshot>/web/runs/<id> --publish`, which copies the run into this checkout and applies the same gates as daily exports. Final results (batch ended 23:16): light bending stopped (beat too long for layout); moving clock 3 rounds needs_review (control labels showed raw values — fixed); simultaneity needs_review; **twin paradox passed (physics 8.5, visuals 7.4) and is published** (`20261027T060526-17d8ad17`, curriculum 2.3); speed limit `20261027T060759-72aebbf0` passed (8/7) but is **held, not published**; the five wave/particle runs stopped at research.

### Research was blocked for the managed Claude CLI (2026-10-26; the scheduled worker retrieved sources on 2026-10-27)

Every live run's researcher had no WebSearch tool and every WebFetch was refused by Apple Claude Code's network proxy ("proxy refused the connection"). Before the fix, the citation check only required cited URLs to appear in the notes, and the notes listed URLs that were tried and failed, so unretrieved references passed. Both published guides (clocks `20261027T041411-61589ffe`, twins) are therefore labelled `provenance.sources_retrieved=false` with a visible "Reviewed · sources not retrieved" tag and note; retracting them is the owner's decision. `lab/cli_providers.retrieved()` now requires at least one successful search/fetch result, so unsourced research fails. Fixes are the owner's: allow educational domains in the ACC Dashboard (Domains tab) or `~/.claude/apple/dangerous_allowed_domains.csv`, or opt in to coordinator retrieval with `COUNCIL_COORDINATOR_FETCH=1` (`lab/sources.py`: the model proposes URLs as data, the coordinator fetches them with size/time bounds, only pages that load become notes). Never edit the ACC allowlist or sandbox settings without an explicit owner request. Until fixed, the 9 AM worker run will stop at research (honestly) and consume its slot.

`scripts/batch.sh` reruns `scripts/batch-questions.txt` (12 questions, 12-run cap) from `~/Projects/council-batch`; start it from Terminal, optionally with `COUNCIL_COORDINATOR_FETCH=1`.

### Website

Light minimal layout: slim lab status strip (expands for steps/drafts), hero investigation with poster play, captions, chapter bar, physical-unit sliders, ask/feedback links; past investigations cards (still previews, animate on hover, New/Watched in localStorage); compact path (four chapter tiles + selected chapter list; `web/curriculum.json`, 15 items, items with a `model` are runnable); collapsed "How the Council checked this"; Proposals sheet (header button). Asset links get `?v=<sha>` per deploy to prevent mixed caches.

`lab/render.py` depends on: `.workspace`, `#universe`, `#mass`, `#distance`, `#mass-value` (with `data-value`), `#bend-value`, `#beat-title`, `#title`/`#subtitle`/`#takeaway`, global `show(record)`, `CouncilScene.load/seek/checks/getState/timeline`. `seek()` must stay deterministic and hide the poster.

### Picks, questions, feedback, proposals (`lab/inbox.py`, `lab/improve.py`)

Owner-authored issues only (`eman2XR`; public repo). Labels: `council:choose`, `council:question`, `council:feedback`, `council:approve`, `council:decline`. Picks of runnable items become the plan without a planner call; questions/feedback are quoted data for the planner; the coordinator comments and closes picks/questions after an attempt. The scheduled `daily --publish` also runs `improve.daily_review` once per local day (one web-search "scout" call and one structured "architect" call): up to four proposals merged into `web/proposals.json` with owner decisions applied; published with the dashboard. Nothing is implemented automatically; approved proposals wait for a supervised coding session — check the Proposals sheet and `council:approve` issues when resuming.

### Scheduler — enabled from a worker checkout

Launch agent `org.the-council.daily` (9 AM, Claude, `--count 1 --rounds 3 --publish`) runs from `~/Projects/the-council-worker` (repo-local signing off, personal gh credentials, Framework Python with Playwright). Global `core.hooksPath` now points to `~/Projects/weekly-notes-hooks` (user's choice) so background pushes work. Smoke test passed without model calls; the first real background Claude call and render is the next 9 AM run — inspect `~/Projects/the-council-worker/.council-state/daily*.log`, the ledger and `improve.json`. Pull into the worker after every push: `git -C ~/Projects/the-council-worker pull --ff-only`.

## Next steps

1. Resolve research retrieval (owner decision above), then run `scripts/batch.sh`; export accepted runs with `lab export --run-dir … --publish`; decide whether to publish the held speed-limit run after rerunning it with real sources.
2. After 9 AM: verify the worker's live run, project review and publication.
3. Plan the next chapter of the path (toward open problems, honestly scoped) and the engines it needs.
4. Act on approved proposals; keep the handoff current.

## Commands

```sh
python3 -m unittest discover -s tests -v
node --check web/app.js
node --check web/scene.js
node -e "const p=require('./web/physics.js'); const c=[...p.checks(),...p.clockChecks()]; console.log(c); if(c.some(x=>!x.pass))process.exit(1)"
python3 -m lab run --provider fixture --topic gravity-clocks --rounds 2
python3 -m lab check --provider claude --timeout 180
python3 -m lab daily --provider claude --count 1 --rounds 3 --publish
python3 -m lab schedule --provider claude --hour 9 --count 1
```

Use `--provider codex` interchangeably. `daily --count N` is a total cap per local calendar day, not N additional runs. Crashes and failed planning consume slots. Do not delete ledger entries to circumvent it. Daily attempts use up to 16 model calls at three rounds (an optional planner, researcher, coordinator source fallback and scientist, plus four calls per revision). Three reviewers (physics, visual, beginner) run concurrently. Default 300 seconds per worker; 30-minute model-work deadline. Rendering may extend beyond that deadline; this is not a total wall-clock guarantee.

Scheduler installation, inspection and removal are documented in README. It runs `caffeinate -i <absolute-python> <checkout>/scripts/run_daily.py ... --publish` from this checkout. Changing checkout/interpreter paths requires regenerating it. It cannot wake a powered-off Mac, keep working through a closed lid, or connect VPN automatically.

## Architecture and boundaries

`lab/pipeline.py` owns research → scientist record → director scene → actual browser capture → parallel physics/visual reviews → bounded revisions. Both reviews must pass (score >=7, no blockers), with successful model/browser checks. Failures stay drafts. Passing AI review does not prove truth or novelty.

Models return scene data, not arbitrary executable animation code. Light bending uses the first-order weak-field approximation; clocks compare stationary supported observers outside a spherical nonrotating mass. Clock animation magnifies the relative rate difference 12×, while the numeric readout is physical. The sketch is not an Earth/GPS/black-hole simulator. Sources and assumptions are visible.

`web/runs/<id>/record.json` is the private runtime record. `web/published/<id>/record.json` is an export of scientific content, revision reviews, and copied images; `web/published/index.json` drives the archive. Daily history is local. The planner sees recent history and published questions; exact duplicates are blocked, paraphrase/semantic novelty is model-reviewed rather than guaranteed. Only two visual model families currently exist; arbitrary domains, voiceover, video export, notifications, and cloud workers remain future work.

The publisher stages/commits only `web/published`, refuses unrelated staged changes, and pushes normally. If a push fails, retry on a later daily invocation; do not force-push. The original source repository was empty before initialization.
