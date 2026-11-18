#!/bin/bash
# Puts the night branch live: the same as push_tabtest.sh but on top of the live site branch (keeps its fresh forecasts). Only on Stuart's go.
# and, if given, the two Android apps. Run: bash tools/push_tabtest.sh "<message>" [navigate.apk] [markplus.apk]
set -e; T=/tmp/claude-0/tabtest; N=/tmp/claude-0/night/site; S=$N/cervantes; MSG="$1"
cd $T && git fetch -q origin && git checkout -q --detach origin/site
for d in cervantes fastnet channel-area northsea-area irishsea-area biscay-area celtic-area mark; do find $S -maxdepth 1 -type f -exec cp {} $T/$d/ \; ; node /tmp/claude-0/night/tools/compact.js $T/$d >/dev/null; done
rm -rf helpmedia && cp -r $N/helpmedia helpmedia; cp $N/index.html index.html; cp $N/_routes.json _routes.json; cp $N/functions/_middleware.js functions/; mkdir -p lab && cp $N/lab/* lab/
[ -n "$2" ] && cp "$2" android/navigate.apk; [ -n "$3" ] && cp "$3" android/markplus.apk
git add -A; git commit -qm "$MSG

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011G6Dp4mrjFjgEiUjrYpsea" || true
git push -q origin HEAD:site; H=$(git rev-parse --short HEAD)
for i in $(seq 1 40); do s=$(gh api repos/stuartgreenfield/firstshift-route/commits/$H/check-runs --jq '.check_runs[] | .status + " " + (.conclusion // "")' 2>/dev/null); case "$s" in *completed*) echo "$H $s"; break;; esac; timeout 8 tail -f /dev/null; done
