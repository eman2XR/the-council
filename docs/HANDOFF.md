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

## Current checkpoint — read before resuming

Implemented and deployed in source commit `c48b69f` (later verification/fix commits may follow):

- `lab/topics.py`: light-bending and stationary gravitational-clock models with scoped scientific notes.
- `lab/daily.py`: structured planner, per-day cap, OS lock, persistent history, recovery of interrupted attempts, acceptance-only export and scoped Git publication.
- `lab/dashboard.py`: safe status snapshots, throttled publishing (120 seconds plus start/completion), no raw errors/usage metadata.
- `lab/schedule.py` and `scripts/run_daily.py`: generate a macOS launch agent with an explicit absolute Python/script path.
- `lab/__main__.py`: `daily`, `schedule`, `--topic`, `--count`, `--publish`, `--hour`.
- `web/physics.js` / `web/scene.js`: two clock model, labeled 12× magnification, actual rate readout, distance/mass controls, reference hand, and outward sweep during playback; original ray model preserved.
- Public archive and `?guide=<id>` navigation, dashboard with phase/revision/activity/schedule and stale-status warnings. Browser polls status once a minute; Pages deployment adds latency.
- Pages workflow packages only explicit public assets, accepted guides and dashboard.

Verification:

- **31 unit tests passed**, plus 12 numerical model checks and JavaScript syntax checks.
- `python3 -m lab.sitecheck` checks static hosting under `/web/` (project-prefix equivalent), disabled live-run button, revision images, archive links, dashboard loading, mobile overflow and JS errors.
- Clock fixture `20261027T041255-383a6d3b` passed with corrected mobile capture; its screenshot was inspected.
- First daily planner attempt exceeded a text bound and consumed a slot. Bounds are now included in the response schema.
- First live daily investigation `20261027T040910-6d813087` exhausted three rounds and stayed `needs_review`; physics eventually passed, visual review correctly rejected missing moved-radius evidence. It was **not published**.
- Mobile full-page screenshots initially repeated the top of the page due to browser capture behavior. The renderer now captures a mobile workspace in a tall viewport and a separate top-of-page viewport. The final clock comparison frame explicitly moves radius to 2.5.
- Separate bounded live regression `20261027T041411-61589ffe` **passed on revision two**, physics score **8.5**, visual score **7.5**, all 12 renderer/model checks passed. It has been exported to `web/published/20261027T041411-61589ffe/`. Its question is “Why do clocks at different heights tick at different rates?” This did not reset the daily ledger. No live model workers remain after this check.
- The dashboard deployment at commit `c48b69f` succeeded in GitHub Actions run `40448748038`. Check later workflows for the accepted-guide deployment.

### Scheduler status — enabled from a worker checkout

The user chose a separate worker checkout. The launch agent `org.the-council.daily` (9 AM local, Claude, `--count 1 --rounds 3 --publish`) runs from `~/Projects/the-council-worker`, outside macOS-protected folders. The Desktop checkout remains the interactive development workspace; do not point launchd at it.

Worker setup:

- Cloned from GitHub; repo-local `commit.gpgsign=false` and the personal `gh auth git-credential` helper/username, matching the Desktop checkout. Global work signing is untouched.
- `.council-state/history.json` was copied from the Desktop checkout so today's used slots carry over. The worker's ledger is now authoritative for scheduled runs; manual Desktop `daily` runs keep a separate ledger and can therefore duplicate a day's work.
- Plist generated with `/Library/Frameworks/Python.framework/Versions/3.13/bin/python3` (has Playwright) and a minimal PATH (`~/.local/bin` first for managed `claude`, then Homebrew for `gh`/`node`/`codex`).
- The user's global `core.hooksPath` previously pointed to `~/Desktop/weekly notes/scripts`, which background jobs cannot read, so every push failed under launchd. At the user's direction those Git LFS hooks were copied to `~/Projects/weekly-notes-hooks` and the global hooksPath now points there. Desktop originals remain.
- Registration: Claude Code's sandbox cannot `launchctl bootstrap` (error 5); the user ran it in Terminal. `launchctl kickstart` works from the agent session.

Smoke test 2026-10-26: kickstart exited 0, no permission errors, and the publish step pushed successfully (the day's cap was already reached, so no model calls were made). Not yet verified under launchd: a real Claude call (managed auth/VPN in the background context) and Chrome rendering. The first 9 AM run is that test; inspect `~/Projects/the-council-worker/.council-state/daily*.log` and the ledger afterwards.

## Next steps

1. After the next 9 AM run, check the worker logs, ledger and GitHub Actions. If Claude auth or rendering fails under launchd, set the dashboard schedule back to blocked with an honest reason.
2. Pull source changes into the worker (`git -C ~/Projects/the-council-worker pull --ff-only`) after pushing from the Desktop checkout; regenerate the plist only if interpreter/paths change.
3. Expand visual model families over time. The planner currently creates questions within two models, not arbitrary physics animations. Semantic novelty is model-assisted rather than guaranteed.
4. Update this handoff after material changes so either coding agent can resume.

### Website design (2026-10-26)

Light, minimal layout: today's guide at the top with a poster play button, word-by-word subtitles per chapter, chapter progress bar, and sliders the last chapter moves by itself; then lab status (now / up next / drafts on the bench), past-investigation cards with previews drawn by the same renderer (still until hovered; "New"/"Watched" stored in localStorage), and a collapsed "How the Council checked this" section. Nothing animates until the viewer presses play or touches a control.

`lab/render.py` depends on these IDs and behaviors: `.workspace`, `#universe`, `#mass`, `#distance`, `#mass-value`, `#bend-value` (real, unmagnified value, now a small stage label), `#beat-title`, `#title`/`#subtitle`/`#takeaway`, global `show(record)`, and `CouncilScene.load/seek/checks/getState`. `seek()` must stay deterministic and hide the poster. Reviewer frames now show one light-themed workspace with chapter subtitles instead of the old side panel.

Not yet verified after the redesign: `python3 -m lab.sitecheck` and a fixture render. This Claude Code session cannot bind sockets or launch headless Chrome; run them from Terminal with the Framework Python that has Playwright. Do not pull this design into the worker checkout until a fixture render passes.

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
