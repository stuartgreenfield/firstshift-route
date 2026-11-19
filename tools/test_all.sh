#!/bin/bash
# Every automated test, on the tool it is for (19 Nov 2026 full check). Starts both test servers (tools/testserver.py), runs the tests
# two at a time with a 20 minute limit each, and prints one line per test. Route and Mark tests run on 8779; the Route+ and Mark+ list
# runs on 8778. Retired tests (tests/retired-*) and the film and help-picture makers are left out.
# Run: bash tools/test_all.sh <navigate checkout>   (default /tmp/claude-0/navnight)
N=$(cd "$(dirname "$0")/.." && pwd); NAV=${1:-/tmp/claude-0/navnight}; OUT=${OUT:-/tmp/fs-test-all}; mkdir -p $OUT
python3 $N/tools/testserver.py --web $N/site/cervantes --media $N/site --port 8779 & S1=$!
python3 $N/tools/testserver.py --web $NAV/web --media $NAV/web --port 8778 & S2=$!
until curl -s -o /dev/null http://localhost:8779/mark/ && curl -s -o /dev/null http://localhost:8778/mark/; do sleep 1; done
one() { U=$1; T=$2; s=$(date +%s); out=$(cd $N && timeout 1200 node tests/$T $U 2>&1); rc=$?; d=$(( $(date +%s) - s ))
  sum=$(echo "$out" | grep -E "[0-9]+ passed|all passed" | tail -1); f=$(echo "$out" | grep -E "^FAIL" | head -3 | cut -c1-160 | tr '\n' '~'); [ -z "$sum" ] && sum=$(echo "$out" | grep -E "Error" | head -1 | cut -c1-160)
  echo "$U|$T|rc=$rc|${d}s|$sum|$f"; }
export -f one; export N OUT
PLUS="l-starlink.js tact.js deck.js help-find.js mark-crew2.js k1-wind.js k4-line.js a14-labels.js e3-turn.js tide-timing.js startup-one.js test-mode-real.js m80-startscreen.js windows-slideoff.js move-windows.js screen-rules.js mark-test-mode.js mark-startscr.js mark-wl.js"
( cd $N/tests && ls *.js | grep -vE '^(_|retired-|film-app|help-shots|evidence|l-starlink|tact)' | sed 's#^#http://localhost:8779 #'; for t in $PLUS; do echo "http://localhost:8778 $t"; done ) | xargs -P 2 -L1 bash -c 'one $0 $1'
kill $S1 $S2
