# The Council: coding-agent handoff

Updated during implementation on 2026-10-26 (America/Los_Angeles). This is a checkpoint, not a claim that every feature below is deployed. Update the current-state section before handing off again.

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

### Paused (2026-10-27) — read first

The owner paused new investigations while the investigation format is reworked. `~/Projects/the-council-worker/.council-state/paused` makes `daily()` return without using a slot (the daily project review still runs); `web/dashboard.json` shows "New investigations paused". Delete the file and set the dashboard schedule back to enabled to resume. Do not start batches until the owner says the format is ready.

Open design work the owner raised: illustrations must be concrete and intuitive (the twin-trip engine is the model; graph-style engines — spacetime diagram, tunnelling, wave packet, falling-time — still need concrete redesigns); sliders only where they build intuition (scene field `controls`); subtitles live inside the animation box; the end of playback shows the idea. `python3 -m lab.qa` captures every page and state at desktop and phone sizes for review; run it after any UI change. New geometric engines (2026-10-27, not yet used by any published investigation): `spacetime-paths` explains the twins as path length (clock time = sqrt(time² − distance²), worked lengths beside the diagram, draggable turnaround) and `falling-time` was rebuilt as a most-time comparison (height gain against speed loss for four paths). Re-run curriculum 2.3 with `spacetime-paths` and 2.5 with `falling-time` once investigations resume; the owner found the twin-trip guide showed what happens but not why. Pending owner confirmation: retract `20261027T060526-17d8ad17` (old twin diagram) and `20261027T160508-98dddabc` (duplicate wave look). Eleven investigations are published; the two from 2026-10-26 carry "sources not retrieved" labels, and the old spacetime-diagram twin guide is superseded by the twin-trip one (retraction is the owner's call).

### Site structure after the owner's audit (2026-10-27 night)

- Home: one featured investigation (`web/featured.json`, copied by the Pages workflow; falls back to the newest), then a single "Investigations" index grouped by curriculum chapter (small cards; unexplored questions listed as "Not yet" while paused, "Pick for tomorrow" when the schedule is enabled). The old long card list and the tabbed path are gone; `lab.sitecheck` checks the featured card appears once and every other investigation once in `#chapters`.
- Drafts live on their own page (`?drafts`, linked in the footer), not on the home page. Draft pages hide the review section and the agent credit line and show the illustration note under the player.
- While `body[data-paused=yes]` (schedule not enabled in `dashboard.json`), Ask/Feedback and pick buttons are hidden. The idea box under the player was removed (the end card shows the idea); `#takeaway` stays in the DOM because `lab/render.py` writes it.
- "More investigations" lists the same chapter first.
- Removed with owner approval: published `20261027T060526-17d8ad17` (old twin diagram) and `20261027T160508-98dddabc` (duplicate interference look), drafts `bend-the-map` and `roll-the-paper` (files in Git history). Later the same night, with owner approval, both twin-trip guides (`20261027T160039-39e9e79b`, `20261027T163733-b49c8bee`) were unpublished too: identical pictures, and they showed what happens rather than why. Seven investigations remain published; curriculum 2.3 now uses `spacetime-paths`.
- Every investigation must stand on its own: no references to other guides in narration or on-screen text. The director prompt and the visual reviewer now enforce this for agent runs.
- Still to do once runs resume: new guides for 2.1 and 2.3 (2.3 via `spacetime-paths`; 2.1 still maps to `twin-trip`, which shows what rather than why), and a re-run of the clocks guide (sources not retrieved).

### Drafts and intuition testing (2026-10-27 evening)

`web/drafts/` holds owner-review visual prototypes (`?draft=<id>`, listed under "Drafts" on the home page, labelled "Draft visual · not reviewed"). They have hand-written subtitles, no research or review, and must never be copied into `web/published/`. The Pages workflow copies the folder. Current order (drafts page): `twin-paths`, `falling-scoreboard`, `who-is-falling` (engine `fall-views`: one toss seen from the ground and from the ball; scales and clocks decide which view is unpushed), `curvature` (engine `tides`: walkers on a ball, two balls let go side by side whose paths through time converge, tidal stretching), then `twin-paths`, `falling-scoreboard`, `bend-the-map` and `roll-the-paper` (earlier versions built on a Euclidean map whose upper strips are shorter, which contradicts faster clocks higher up), and `river-black-hole`.

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

### Research is blocked for the managed Claude CLI — read this

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

Use `--provider codex` interchangeably. `daily --count N` is a total cap per local calendar day, not N additional runs. Crashes and failed planning consume slots. Do not delete ledger entries to circumvent it. Daily attempts use up to 12 model calls at three rounds (one planner plus two research/record calls plus three calls per revision). Two reviewers run concurrently. Default 300 seconds per worker; 30-minute model-work deadline. Rendering may extend beyond that deadline; this is not a total wall-clock guarantee.

Scheduler installation, inspection and removal are documented in README. It runs `caffeinate -i <absolute-python> <checkout>/scripts/run_daily.py ... --publish` from this checkout. Changing checkout/interpreter paths requires regenerating it. It cannot wake a powered-off Mac, keep working through a closed lid, or connect VPN automatically.

## Architecture and boundaries

`lab/pipeline.py` owns research → scientist record → director scene → actual browser capture → parallel physics/visual reviews → bounded revisions. Both reviews must pass (score >=7, no blockers), with successful model/browser checks. Failures stay drafts. Passing AI review does not prove truth or novelty.

Models return scene data, not arbitrary executable animation code. Light bending uses the first-order weak-field approximation; clocks compare stationary supported observers outside a spherical nonrotating mass. Clock animation magnifies the relative rate difference 12×, while the numeric readout is physical. The sketch is not an Earth/GPS/black-hole simulator. Sources and assumptions are visible.

`web/runs/<id>/record.json` is the private runtime record. `web/published/<id>/record.json` is an export of scientific content, revision reviews, and copied images; `web/published/index.json` drives the archive. Daily history is local. The planner sees recent history and published questions; exact duplicates are blocked, paraphrase/semantic novelty is model-reviewed rather than guaranteed. Only two visual model families currently exist; arbitrary domains, voiceover, video export, notifications, and cloud workers remain future work.

The publisher stages/commits only `web/published`, refuses unrelated staged changes, and pushes normally. If a push fails, retry on a later daily invocation; do not force-push. The original source repository was empty before initialization.
