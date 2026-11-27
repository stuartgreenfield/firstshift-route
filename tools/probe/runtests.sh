#!/bin/bash
# usage: runtests.sh <out> <base> test...   (run through with78.sh; tests found in navnight/tests then night/tests)
OUT=$1; BASE=$2; shift 2; : > $OUT
for t in "$@"; do f=/tmp/claude-0/navnight/tests/$t.js; [ -f $f ] || f=/tmp/claude-0/night/tests/$t.js
  echo "### $t" >> $OUT; (cd /tmp/claude-0/night && timeout 500 node $f $BASE 2>&1 | grep -E "passed|^FAIL|Error|rror:" | head -6 | cut -c1-220) >> $OUT
done; echo DONE >> $OUT
