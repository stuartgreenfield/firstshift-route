#!/bin/bash
# Pushes the night branch's site files to the test copy (tabtest), compacted (F28), with Help media, the Pages middleware (F27)
# and, if given, the two Android apps. Run: bash tools/push_tabtest.sh "<message>" [navigate.apk] [markplus.apk]
set -e; T=/tmp/claude-0/tabtest; N=/tmp/claude-0/night/site; S=$N/cervantes; MSG="$1"
cd $T && git fetch -q origin && git checkout -q --detach origin/tabtest
# 20 Nov 15:10: the test copy's forecasts come fresh from the live site branch with every push (they had stood still since 18 Nov 06Z, so Route fetched wind
# for itself and said Offline). Each area's pack and pre-routes, and status.json, are replaced by the live ones.
git fetch -q origin site; for d in $(git ls-tree -d --name-only origin/site); do if git cat-file -e origin/site:$d/pack 2>/dev/null; then git rm -rq --ignore-unmatch $d/pack $d/pre; git checkout -q origin/site -- $d/pack; git cat-file -e origin/site:$d/pre 2>/dev/null && git checkout -q origin/site -- $d/pre; fi; done; git checkout -q origin/site -- status.json
for d in cervantes fastnet channel-area northsea-area irishsea-area biscay-area celtic-area tasman-area mark; do mkdir -p $T/$d; find $S -maxdepth 1 -type f -exec cp {} $T/$d/ \; ; node /tmp/claude-0/night/tools/compact.js $T/$d >/dev/null; done
rm -rf helpmedia && cp -r $N/helpmedia helpmedia; mkdir -p courses && cp $N/courses/* courses/;   # 21 Nov: the course list too (the corrected St Malo waited for the next forecast run)
 cp $N/index.html index.html; cp $N/_routes.json _routes.json; cp -r $N/functions/. functions/; mkdir -p follow && cp $N/follow/* follow/;   # 20 Nov: the server functions (boat code, follow) and the follow page go too
 mkdir -p lab && cp $N/lab/* lab/
[ -n "$2" ] && cp "$2" android/navigate.apk; [ -n "$3" ] && cp "$3" android/markplus.apk
git add -A; git commit -qm "$MSG

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011G6Dp4mrjFjgEiUjrYpsea" || true
git push -qf origin HEAD:tabtest; H=$(git rev-parse --short HEAD)
for i in $(seq 1 40); do s=$(gh api repos/stuartgreenfield/firstshift-route/commits/$H/check-runs --jq '.check_runs[] | .status + " " + (.conclusion // "")' 2>/dev/null); case "$s" in *completed*) echo "$H $s"; break;; esac; timeout 8 tail -f /dev/null; done
