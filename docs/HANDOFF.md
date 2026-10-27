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
- No credentials belong in Git. `.env`, `.council-runtime`, `.council-state`, `web/runs`, and `web/latest.json` are ignored.

The website is static. GitHub does not run the model agents; the Mac runs them and pushes accepted public files. A deployed website remains available when the Mac is off. Research needs an awake, logged-in Mac and the managed Claude VPN connection.

## Current checkpoint — read before resuming

The daily-loop and dashboard implementation is in progress locally. Check `git status` and later commits rather than assuming this checkpoint is the latest state.

Implemented locally:

- `lab/topics.py`: supported light-bending and gravitational-clock models, with scoped scientific notes.
- `lab/daily.py`: agent planner, daily history/budget, OS lock, two-review acceptance gate, public export, archive index, scoped Git publication and retry of pending pushes.
- `lab/schedule.py`: generates a macOS launch-agent plist at `.council-state/org.the-council.daily.plist`; generation alone does not install or enable it.
- `lab/__main__.py`: `daily`, `schedule`, `--topic`, `--count`, `--publish`, `--hour`.
- `web/physics.js` and `web/scene.js`: stationary clock ratio model, exaggerated and labeled clock-hand motion, mass/radius controls, alongside original ray model.
- `web/app.js`: static archive and `?guide=<id>` navigation. Defaults to newest accepted guide, otherwise the fixture.
- Pages workflow now includes `web/published/` if present.
- `tests/test_daily.py`: daily caps, duplicate rejection, lock, export gates/path validation, scoped publication, scheduler config.
- README explains operation and limitations.

Verification at this checkpoint:

- 28 unit tests passed before the latest small history/renderer/documentation edits; rerun once final edits are done.
- 12 numerical model checks passed (six per model).
- Clock fixture completed two render/review rounds: `web/runs/20261027T040817-bb4f520f/record.json`. Desktop and mobile screenshots inspected. Afterwards, contrast/reference labels and radius-dependent clock positions were improved; recapture final version.
- A first live planner attempt exceeded its text bound and correctly stopped. Limits are now expressed in the planner schema. This consumed one daily slot.
- A second live cycle started with `python3 -m lab daily --provider claude --count 2 --rounds 3 --timeout 300 --minutes 30` (without `--publish`). Its run is `web/runs/20261027T040910-6d813087/record.json`. It finished three rounds as `needs_review`: physics passed in round three; visual review rejected the missing moved-radius frame and label mismatch. It was not exported. The capture and label issues have since been fixed. Inspect the record and `.council-state/history.json` for the actual outcome. Do not start a duplicate cycle while its lock is held.
- The planner chose: “If two clocks keep the same height gap, how does moving the pair farther from the mass change how much slower the lower clock ticks?”
- The 9 AM local / one-attempt Claude schedule was installed and verified with `launchctl print gui/501/org.the-council.daily`. It has not yet executed as a launch agent at this checkpoint. Do not install a duplicate. The user accepted the OS approval for this default.
- This implementation has not yet been pushed at this checkpoint; previous committed README link is `ce92cd8`.

## Next steps

1. Inspect the live cycle's outcome and reviewer feedback. Fix actual failures, retaining all evidence and revision records. Do not weaken review gates to force publication.
2. Run unit tests, shared numerical checks, JavaScript syntax checks, and final browser captures for changed scenes. Verify mobile layout, deterministic seek, zero-mass controls, and archive links under `/the-council/` (not only at site root).
3. Confirm accepted export excludes private runtime notes and usage metadata. Fixtures must never enter the live archive.
4. Commit code/documentation, then publish accepted artifacts and verify GitHub Actions and the public archive. Existing public demo may remain if no live guide passes.
5. Generate and install the chosen launch-agent schedule. The installation writes outside this repository and may require explicit OS/tool approval. Inspect `launchctl print` to verify it loaded. A default 9 AM local, one-attempt schedule is reasonable unless the user chooses otherwise.
6. Update this checkpoint with exact results, known limitations, and whether the scheduler is actually enabled.

If coding-agent limits interrupt work, leave bounded live CLI workers to finish if healthy. Do not kill unrelated Claude/Codex sessions. Runtime session IDs from another agent's tool environment are not portable; records and process state are the source of truth.

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

Scheduler installation, inspection and removal are documented in README. It runs `caffeinate -i <absolute-python> -m lab daily ... --publish` from this checkout. Changing checkout/interpreter paths requires regenerating it. It cannot wake a powered-off Mac, keep working through a closed lid, or connect VPN automatically.

## Architecture and boundaries

`lab/pipeline.py` owns research → scientist record → director scene → actual browser capture → parallel physics/visual reviews → bounded revisions. Both reviews must pass (score >=7, no blockers), with successful model/browser checks. Failures stay drafts. Passing AI review does not prove truth or novelty.

Models return scene data, not arbitrary executable animation code. Light bending uses the first-order weak-field approximation; clocks compare stationary supported observers outside a spherical nonrotating mass. Clock animation magnifies the relative rate difference 12×, while the numeric readout is physical. The sketch is not an Earth/GPS/black-hole simulator. Sources and assumptions are visible.

`web/runs/<id>/record.json` is the private runtime record. `web/published/<id>/record.json` is an export of scientific content, revision reviews, and copied images; `web/published/index.json` drives the archive. Daily history is local. The planner sees recent history and published questions; exact duplicates are blocked, paraphrase/semantic novelty is model-reviewed rather than guaranteed. Only two visual model families currently exist; arbitrary domains, voiceover, video export, notifications, and cloud workers remain future work.

The publisher stages/commits only `web/published`, refuses unrelated staged changes, and pushes normally. If a push fails, retry on a later daily invocation; do not force-push. The original source repository was empty before initialization.

## Dashboard and follow-up checkpoint

The user additionally requested a website dashboard showing the live/current investigation. `lab/dashboard.py` now writes a safe status snapshot; `daily --publish` pushes snapshots at phase boundaries, throttled to 120 seconds plus start/completion. The static site polls once a minute and flags stale progress. `web/dashboard.json` is public; local raw errors, source notes and usage are not. Publish paths are scoped to this file and `web/published/`. Do not describe this as instantaneous streaming.

Mobile full-page Chrome captures were actually repeating the top of the page. Capture now uses a tall viewport and the mobile workspace element, plus a separate top-of-page overview. The fourth clock frame sets radius to 2.5, providing visible evidence of the core comparison. Final fixture `20261027T041255-383a6d3b` passed with the corrected capture; its mobile workspace screenshot was inspected. Thirty tests passed before the latest small dashboard/direct-run integration edits.

A separate bounded verification (not a reset of the daily ledger) is running via `python3 -m lab run --provider claude --topic gravity-clocks --rounds 2 --timeout 300 --minutes 20`. Inspect the newest run record before starting anything else. It uses the final capture implementation. No automatic promotion of the earlier rejected draft is allowed.
