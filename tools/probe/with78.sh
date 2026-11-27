#!/bin/bash
# runs a command with the Route+ test server (8778) and the Route test server (8779) up for its duration
cd /tmp/claude-0/night
python3 tools/testserver.py --web /tmp/claude-0/navnight/web --media /tmp/claude-0/navnight/web --port 8778 --site /tmp/claude-0/tabtest >/tmp/claude-0/ts78.log 2>&1 & A=$!
python3 tools/testserver.py --web site/cervantes --media site --port 8779 --site /tmp/claude-0/tabtest >/tmp/claude-0/ts79.log 2>&1 & B=$!
sleep 2; "$@"; R=$?; kill $A $B 2>/dev/null; exit $R
