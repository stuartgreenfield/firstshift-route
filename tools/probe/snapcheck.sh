#!/bin/bash
# the screens check on a frozen copy of the two trees, on its own ports, so work can go on meanwhile
# usage: snapcheck.sh <name> [quick|full] [tools...]
N=$1; shift; S=/tmp/claude-0/snap-$N; rm -rf $S; mkdir -p $S; cp -a /tmp/claude-0/navnight/web $S/web; mkdir -p $S/site; cp -a /tmp/claude-0/night/site/cervantes $S/site/cervantes; for d in /tmp/claude-0/night/site/*; do b=$(basename $d); [ "$b" = cervantes ] || ln -s $d $S/site/$b; done
cd /tmp/claude-0/night
python3 tools/testserver.py --web $S/web --media $S/web --port 8790 --site /tmp/claude-0/tabtest >$S/ts90.log 2>&1 & A=$!
python3 tools/testserver.py --web $S/site/cervantes --media $S/site --port 8791 --site /tmp/claude-0/tabtest >$S/ts91.log 2>&1 & B=$!
sleep 2; date -u > $S/start.txt
P_ROUTE=8791 P_PLUS=8790 OUT=$S/shots node tests/screens-check.js "$@" > $S/screens.txt 2>&1; echo "screens exit $?" > $S/done.txt; date -u >> $S/done.txt
kill $A $B 2>/dev/null
