# Going back to an earlier Route

Every change to Route is saved on GitHub (stuartgreenfield/firstshift-route, branch main), so any earlier version can be put back. Named restore points:

- restore-2026-11-12-0850: with the set-up card and the "Can you trust it?" checks.
- restore-2026-11-12-0745: known good before the set-up card (start days, edge warning, separate race and start buttons, Help ?).
- restore-2026-11-11-2300: before the overnight work of 11 to 12 November.
- v0.4: version 0.4.1, 11 November.

To go back (Claude can do this on request): restore the app files from a restore point onto main, then put them on the live site:

    git checkout <restore point> -- site/cervantes site/help site/courses
    git commit -m "Back to <restore point>" && git push origin main
    (then copy site/cervantes/{app.js,index.html,ais.js,router.js} into each race folder on the site branch and push, or run the forecast build)

Forecast data is not affected: it is rebuilt every six hours.
