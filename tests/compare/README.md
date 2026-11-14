# Route's router against an open-source router (14 Nov 2026)

Same polar (FirstShift generic, TCC 1.000, sampled every 5 degrees and 2 kn), same synthetic wind, open water, no tide,
no tack or gybe loss, finish circle 0.1 nm. Other router: weatherrouting 0.2.3 (PyPI, by dakk), LinearBestIsoRouter,
5 degree headings. It stops about an hour short of the finish, so its time is its last isochrone point plus the rest at the
best speed made good from its own polar and wind. Analytic: distance less 0.1 nm over best VMG (beat, run) or speed (reach).

Run: `python3 scen.py; node ours.js > ours.json; python3 wr.py` (needs `pip install weatherrouting scipy`).

| Case | Analytic h | Route 600 s | Route 180 s | weatherrouting 600 s | weatherrouting 180 s |
| --- | --- | --- | --- | --- | --- |
| Beat 20 nm, 12 kn steady | 4.637 | 4.643 | 4.652 | 4.650 | 4.623 |
| Run 20 nm, 12 kn steady | 3.503 | 3.504 | 3.504 | 3.507 | 3.504 |
| Reach 20 nm, 12 kn steady | 2.688 | 2.690 | 2.689 | 2.699 | 2.699 |
| Beat 30 nm, wind veers 340 to 020 over 6 h | | 6.118 | 6.190 | 6.155 | 6.349 |
| Reach 30 nm, wind builds 8 to 16 kn over 6 h | | 4.318 | 4.303 | 4.334 | 4.304 |
| Beat 30 nm, 6 kn | 11.209 | 11.274 | 11.213 | 11.205 | 11.220 |

Reading: in steady wind both routers are within 0.6% of the best possible time, Route within 0.3% at 180 s steps.
In the veering beat Route is 0.6% to 2.5% quicker than weatherrouting, which drops any point that does not close on the
finish; Route's own answer moves 1.2% between 600 s and 180 s steps because the wind is read once a step (a known limit in
METHOD-ROUTING.md). The 6 kn beat at 600 s is 0.6% slow; at 180 s it matches.
