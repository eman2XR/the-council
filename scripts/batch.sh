#!/bin/zsh
# Bounded, human-started batch of live investigations from scripts/batch-questions.txt (topic|question per line).
# Runs from a snapshot copy so edits to the main checkout cannot change the page mid-capture. Nothing is
# published here; export accepted runs afterwards with: python3 -m lab export --run-dir <run folder> --publish
set -u
SNAP="$HOME/Projects/council-batch"
PY=/Library/Frameworks/Python.framework/Versions/3.13/bin/python3
SRC="$(cd "$(dirname "$0")/.." && pwd)"
rsync -a --delete --exclude .git --exclude web/runs --exclude .council-state --exclude __pycache__ "$SRC/" "$SNAP/"
cd "$SNAP" || exit 1
LOG="$SNAP/batch.log"
echo "Started $(date) · coordinator fetch: ${COUNCIL_COORDINATOR_FETCH:-0}" > "$LOG"
count=0
while IFS='|' read -r topic question; do
  [[ -z "$topic" || "$topic" == \#* ]] && continue
  (( count++ >= 12 )) && { echo "Stopping at the 12-run cap." | tee -a "$LOG"; break; }
  echo "=== $(date '+%H:%M') $topic :: $question" | tee -a "$LOG"
  "$PY" -m lab run --provider "${COUNCIL_PROVIDER:-claude}" --rounds 3 --topic "$topic" --question "$question" 2>&1 | tee -a "$LOG" | tail -2
done < "$SRC/scripts/batch-questions.txt"
echo "Finished $(date)" | tee -a "$LOG"
