# The Council — working instructions

Read `docs/HANDOFF.md` first, then `README.md`. Inspect `git status` before editing: ongoing work may be uncommitted. Do not discard local changes or delete run history to bypass daily budgets.

The product is a visual physics research lab, not the historical persona debate in `council.py`. Prioritize intuitive interactive visuals, actual browser captures, bounded revision, and honest scientific status. Keep the name **The Council**.

The coordinator owns writes, validation, scheduling and publication. Models return structured data. Support both Claude Code and Codex using their existing authentication; direct OpenAI API is optional. Preserve organization-managed CLI settings. Never bypass tool permissions or extract credentials.

Tests: `python3 -m unittest discover -s tests -v`. Renderer check: `python3 -m lab run --provider fixture --topic gravity-clocks --rounds 2`. Live calls consume usage; inspect existing run records before starting another. Read the handoff's current-state section for unfinished verification.

Only accepted live investigations may enter `web/published/`. Never promote fixtures, failed scientific reviews, or drafts. Never force-push. The daily scheduler must retain its per-day cap and lock, and must not execute an unbounded agent loop.
