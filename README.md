# The Council

**[Open the live website →](https://eman2xr.github.io/the-council/)**

The website currently hosts an interactive demo. Daily autonomous investigations and automatic publication of new guides are not enabled yet.

An open-source visual research lab. Agents investigate an idea, design an intuitive explanation, inspect actual rendered frames, and revise it. The first milestone explains **why gravity bends light** through an interactive introduction to general relativity.

The original persona debate CLI remains in `council.py`. The new visual lab is in `lab/` and `web/`.

## Run locally

Requires Python 3.10+, Node.js for the optional physics checks, and Chromium through Playwright.

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m playwright install chromium
python3 -m lab serve
```

Open **http://127.0.0.1:8765**. The default exploration is explicitly marked as an offline, hand-authored example. It does not claim that live agents have reviewed it.

## Choose Codex or Claude Code

The default runner is **Codex**. Both CLIs use their existing authentication and model configuration; The Council does not extract credentials or require a separate OpenAI API key for these runners. Their normal subscription, organization, or API billing and usage limits still apply.

Install and sign into your chosen CLI first. Managed Claude Code wrappers keep their existing authentication. Run an image-and-JSON compatibility check (one live model request):

```sh
python3 -m lab check --provider codex
python3 -m lab check --provider claude
```

Start an investigation with either runner:

```sh
python3 -m lab run --provider codex --rounds 3
python3 -m lab run --provider claude --rounds 3
```

Or select the runner behind the webpage's Run button:

```sh
python3 -m lab serve --provider codex
# Alternatively, stop the first server and use:
python3 -m lab serve --provider claude
```

Use `--model` only to override your CLI's configured model. You can also set `COUNCIL_PROVIDER`, `COUNCIL_CODEX_MODEL`, or `COUNCIL_CLAUDE_MODEL`. Choose a model that supports images and structured output; research additionally requires the CLI's web tools.

The adapters use `codex exec` with native image attachments and an output schema, or `claude -p` with native image content blocks and `--json-schema`. Wrapper banners are ignored when parsing JSON events. Each role gets a fresh session; continuity comes from the saved research, scene and reviewer feedback. Workers return data; the coordinator writes scene files. Claude exposes only web tools during research and no built-in tools for the other roles. Codex uses its read-only sandbox and disables nested agents. Existing managed policies remain in effect.

Managed Claude installations may require an organization network or VPN. If the check reports that its gateway is unreachable, establish that connection and run `claude diagnose`, then retry. A timeout or gateway failure is not treated as a successful review. The adapter does not change authentication, VPN configuration, or organization policy.

### Work limits

Both CLI runners have the same bounds:

- At most **two concurrent workers**. Physics and visual reviews run independently in parallel.
- Default **three revision rounds**, configurable from 1–4.
- At most `2 + 3 × rounds` CLI requests per investigation (11 by default).
- Default **300 seconds per CLI request**, configurable with `--timeout`.
- Default **30-minute deadline for model work**, configurable with `--minutes`. The renderer can finish its current capture before the next deadline check; this is not a hard wall-clock limit on the entire application.
- On macOS/Linux, a timed-out worker's entire process group is stopped. If one parallel reviewer fails, the other is cancelled. On Windows, process termination covers the direct CLI process only.
- Drafts and completed reviews survive failures; failed or unreviewed work never replaces the latest accepted artifact.

These limits bound work, not dollar cost. A CLI request may contain several model turns. The direct OpenAI API remains available explicitly:

```sh
# Set OPENAI_API_KEY and OPENAI_MODEL securely in your environment first.
python3 -m lab run --provider openai --rounds 3
```

That adapter uses billable API calls, limits each response to 3,000 output tokens and the research request to three tool calls. CLI-only time limits do not apply to it; each HTTP request has a 180-second timeout.

Exercise the complete renderer/revision pipeline without API calls:

```sh
python3 -m lab run --provider fixture --rounds 3
```

The fixture intentionally fails the first visual review (missing comparison and labels), then applies scripted changes in round two. This is a test fixture, not model intelligence. Real runs pass the actual captured images to separate model calls for each reviewer.

## What the loop does

1. Researcher searches for sources and saves source notes.
2. Scientist turns the evidence into a scoped claim, assumptions, prediction, falsifier and limitations.
3. Director creates a validated scene specification: narrative, visual density, reference paths, labels, stroke weight, parameters and pacing.
4. Renderer captures four ordered desktop frames and a mobile page from the actual interactive renderer.
5. Two reviewers run in parallel: physics checks claims and visual implications; visual review checks clarity, comparison and beginner comprehension. Each completed review is saved immediately.
6. Director receives both reviews and the previous scene, then revises. All versions remain inspectable.

Both reviewers must pass with scores ≥7, no blocking issues, and passing numerical/layout checks. Failure or budget exhaustion retains a draft. Passing model review is **not** proof of scientific correctness or novelty.

Runs are saved in `web/runs/<id>/record.json` with scenes, frames, source notes, review findings, timestamps and provider-reported usage. `web/latest.json` is updated only after gates pass. The local UI shows in-progress state; the full record is expandable. At most one run starts at a time through the local server.

## Boundaries of this milestone

- One supported topic and one validated visual primitive: weak-field light deflection around an isolated spherical mass. This is not a general animation-code generator yet.
- The director changes scene **data**, not executable code or the physics implementation.
- First-order model: `m = GM/c² = 0.025 × mass`, impact parameter `b = distance`, and `y(x) = b − 2m/b × (sqrt(x²+b²)+x)`. The asymptotic bending angle is `4m/b`. Controls ensure `m/b ≤ 0.025`.
- Vertical deviation is magnified 6× and labeled. The grid is a coordinate reference; the object's radius and marker speed are illustrative. No black holes or strong-field claims.
- Screen samples support visual review, but do not replace continuous video or temporal-quality review.
- Source URLs are checked against retrieved notes; source reliability and entailment still depend on model review and human inspection.
- Codex, Claude Code, the direct OpenAI API, and the offline fixture share `generate(role, prompt, schema, images, research)`. The coordinator is independent of the model provider.
- HyperFrames video export, voiceover, broader scene generation, daily scheduling and notifications are follow-on work. The current artifact is an interactive webpage with a deterministic `CouncilScene.seek(time, beat)` capture interface.
- Local loopback server only. No authentication or production deployment is provided. Do not expose it publicly without adding authentication and job isolation.

## Publish the demo website

The repository's `.github/workflows/pages.yml` deploys the static demo to GitHub Pages on pushes to `main`, or when manually dispatched. In GitHub, open **Settings → Pages → Build and deployment → Source**, and select **GitHub Actions** before the first deployment.

The workflow runs the offline unit tests and physics checks, then uploads an explicit list of public website assets. It excludes local runs, draft records, credentials, and runtime files. The hosted edition disables the agent-run button; agents still run on your own machine. The expected project URL after a successful deployment is https://eman2XR.github.io/the-council/.

This publishes the labeled example, not a daily autonomous feed. Topic planning, a reviewed-guide archive, scheduled investigations, and export of accepted live results remain follow-on work.

## Verify

```sh
python3 -m unittest discover -s tests -v
node -e "const p=require('./web/physics.js'); console.log(p.checks()); if(p.checks().some(c=>!c.pass))process.exit(1)"
python3 -m lab run --provider fixture
```

Physics checks exercise the same JavaScript functions used by the canvas. Pipeline tests cover feedback-driven revision, draft retention, scientific vetoes, invalid scenes and provider failures. Adapter tests cover actual subprocess timeout/cancellation, image transport, structured-output parsing, concurrent budgets, and wrapper banners. Live checks are separate from these automated tests.

## Sources and API references

- [Einstein Online: gravitational deflection of light](https://www.einstein-online.info/en/spotlight/light_deflection/)
- [Einstein Online: equivalence principle and light](https://www.einstein-online.info/en/spotlight/equivalence_light/)
- [Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)
- [Claude Code programmatic use](https://code.claude.com/docs/en/headless)
- [Claude image input](https://code.claude.com/docs/en/agent-sdk/streaming-vs-single-mode)
- [OpenAI image inputs](https://developers.openai.com/api/docs/guides/images-vision)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)

## License

New visual-lab code is MIT licensed. See `LICENSE`. Existing historical project files retain their original authorship.
