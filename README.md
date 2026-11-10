# firstshift-routing

The FirstShift race router and its forecast job.

- `site/` is the web app (one folder per race) published by Cloudflare Pages from the `site` branch.
- `scripts/build.py` fetches the newest free forecasts (ECMWF, AIFS, GFS, Met Office UKV and Global, Copernicus tides and waves) and builds the packs.
- `static/<race>/` holds the parts that do not change: seabed depth, coastline, course and fleet.
- `.github/workflows/forecast.yml` runs the build every six hours and pushes the result to the `site` branch, using only GitHub's own built-in permission. No keys are stored anywhere.

Run locally: `pip install numpy numcodecs eccodes netCDF4 pyproj tifffile && python3 scripts/build.py cervantes`, then serve `site/`.
