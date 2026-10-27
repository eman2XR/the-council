#!/bin/zsh
# Bounded, human-started batch of live investigations. Runs from a snapshot copy so ongoing
# edits to the main checkout cannot change the page while frames are captured. Nothing is
# published here; accepted runs are exported afterwards, and drafts stay private.
set -u
SNAP="$HOME/Projects/council-overnight"
PY=/Library/Frameworks/Python.framework/Versions/3.13/bin/python3
rsync -a --delete --exclude .git --exclude web/runs --exclude .council-state --exclude __pycache__ "$(cd "$(dirname "$0")/.." && pwd)/" "$SNAP/"
cd "$SNAP" || exit 1
LOG="$SNAP/overnight.log"
echo "Started $(date)" > "$LOG"
run() {
  echo "=== $(date '+%H:%M') $1 :: $2" | tee -a "$LOG"
  "$PY" -m lab run --provider claude --rounds 3 --topic "$1" --question "$2" 2>&1 | tee -a "$LOG" | tail -3
}
run light-bending      "Why does gravity bend light?"
run spacetime          "Why does a moving clock tick slowly?"
run spacetime          "Can two events be simultaneous for one person but not another?"
run spacetime          "Why is the travelling twin younger?"
run spacetime          "Why can nothing travel faster than light?"
run interference       "What happens when two waves meet?"
run interference       "How do two slits turn waves into stripes?"
run standing-waves     "Why does a guitar string only play certain notes?"
run two-slit-particles "Why do particles fired one at a time still make stripes?"
run interference       "How can two waves cancel each other out completely?"
echo "Finished $(date)" | tee -a "$LOG"
