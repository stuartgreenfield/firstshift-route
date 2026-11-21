#!/bin/bash
# Puts the night branch live: the same as push_tabtest.sh but on top of the live site branch (keeps its fresh forecasts). Only on Stuart's go.
# and, if given, the two Android apps. Run: bash tools/push_tabtest.sh "<message>" [navigate.apk] [markplus.apk]
set -e
# 20 Nov 22:28: the live site is rebuilt from main by every forecast run, so main must hold the release first, or the next run undoes it.
# The apps go into site/android of this branch, then main moves up to it (fast-forward only: stops if main has something this branch lacks).
cd /tmp/claude-0/night; [ -n "$2" ] && cp "$2" site/android/navigate.apk; [ -n "$3" ] && cp "$3" site/android/markplus.apk
git add site/android; git diff --cached --quiet || git commit -qm "Apps for the live release
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011G6Dp4mrjFjgEiUjrYpsea"
git diff --quiet HEAD -- site || { echo "STOP: site/ has changes not committed; commit them so main and the live site get the same code"; exit 1; }
git push -q origin HEAD:main || { echo "STOP: main has commits this branch lacks; merge them first"; exit 1; }
T=/tmp/claude-0/tabtest; N=/tmp/claude-0/night/site; S=$N/cervantes; MSG="$1"
cd $T && git fetch -q origin && git checkout -q --detach origin/site
for d in cervantes fastnet channel-area northsea-area irishsea-area biscay-area celtic-area mark; do find $S -maxdepth 1 -type f -exec cp {} $T/$d/ \; ; node /tmp/claude-0/night/tools/compact.js $T/$d >/dev/null; done
rm -rf helpmedia && cp -r $N/helpmedia helpmedia; mkdir -p courses && cp $N/courses/* courses/;   # 21 Nov: the course list too (the corrected St Malo waited for the next forecast run)
 cp $N/index.html index.html; cp $N/_routes.json _routes.json; cp -r $N/functions/. functions/; mkdir -p follow && cp $N/follow/* follow/;   # 20 Nov: server functions and the follow page
 mkdir -p lab && cp $N/lab/* lab/
[ -n "$2" ] && cp "$2" android/navigate.apk; [ -n "$3" ] && cp "$3" android/markplus.apk
git add -A; git commit -qm "$MSG

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011G6Dp4mrjFjgEiUjrYpsea" || true
git push -q origin HEAD:site; H=$(git rev-parse --short HEAD)
for i in $(seq 1 40); do s=$(gh api repos/stuartgreenfield/firstshift-route/commits/$H/check-runs --jq '.check_runs[] | .status + " " + (.conclusion // "")' 2>/dev/null); case "$s" in *completed*) echo "$H $s"; break;; esac; timeout 8 tail -f /dev/null; done
echo "Now check the live site matches main: node tools/live_check.js https://firstshift-route.pages.dev --wait 10 (run where pages.dev is reachable; the forecast job also runs it after every publish)"
