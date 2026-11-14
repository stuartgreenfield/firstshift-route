# Wind with height over the sea

Shared engine `web/engine.js` (`windRatio`, `windAt`, `windTo10`), used by Route's router and Navigate's polars. Decided by
Stuart, 14 Nov 2026 (D): correct for wind height, using air and sea temperature where available, in Route and Navigate;
learned polars kept at 10 m like ORC. Background: docs/RESEARCH-2026-11-13-grib-wind-height.md.

## Why

GRIB wind is the model's wind 10 m above the sea. ORC and most designer polars are against 10 m wind. A masthead sensor at
15 to 20 m sees more, and how much more depends on the wind speed and on whether the air is warmer or colder than the sea.

## Method

Monin-Obukhov similarity, as in the COARE 3.0 bulk algorithm (Fairall et al. 2003):

- Sea roughness by Charnock, 0.011 up to 10 m/s rising to 0.018 at 18 m/s, plus the smooth-flow term 0.11 nu / u*.
- Stability functions psiu_26 and psit_26 from COARE (Beljaars and Holtslag when stable; Kansas and convective blend when unstable).
- Air temperature at 2 m (as in a GRIB), sea surface temperature, humidity 80% unless given. No temperatures: neutral profile.
- Stability parameter z/L limited to plus or minus 10.
- Result clamped: at masthead heights 1.00 to 1.20, and no more than 1.10 under 8 kn with stable air (warm air over a cold sea),
  where neither the theory nor the forecast models are reliable (research report, section 6.2; KNMI: models are "too neutral").

## Size of the change (U at height over U at 10 m, air 12 °C, humidity 80%)

Air minus sea temperature across the top. Computed by the engine; COARE 3.5 in brackets where it differs by more than 0.005.

| 18 m | −4 °C | −2 °C | 0 | +2 °C | +4 °C | no temperatures |
| --- | --- | --- | --- | --- | --- | --- |
| 6 kn | 1.016 | 1.018 | 1.033 | 1.100 (1.189) | 1.100 (1.180) | 1.046 |
| 10 kn | 1.022 | 1.027 | 1.040 | 1.156 | 1.198 | 1.047 |
| 15 kn | 1.032 | 1.036 | 1.047 | 1.097 | 1.145 | 1.050 |
| 20 kn | 1.039 | 1.043 | 1.051 | 1.077 | 1.103 | 1.053 |
| 25 kn | 1.046 | 1.050 | 1.056 | 1.070 | 1.085 | 1.057 |

| 15 m | −4 °C | −2 °C | 0 | +2 °C | +4 °C | no temperatures |
| --- | --- | --- | --- | --- | --- | --- |
| 6 kn | 1.011 | 1.013 | 1.023 | 1.100 (1.130) | 1.100 (1.118) | 1.032 |
| 10 kn | 1.016 | 1.019 | 1.028 | 1.102 | 1.134 | 1.033 |
| 15 kn | 1.023 | 1.025 | 1.033 | 1.064 | 1.095 | 1.035 |
| 20 kn | 1.027 | 1.030 | 1.036 | 1.051 | 1.068 | 1.037 |
| 25 kn | 1.032 | 1.035 | 1.039 | 1.048 | 1.057 | 1.040 |

In words: in autumn and winter (air colder than the sea) the masthead sees 1% to 5% more than 10 m; in ordinary air 3% to 6%;
with warm air over a cold sea in spring and early summer 5% to 20%, most in light winds. With equal air and sea temperature the
air is still slightly unstable, because the sea gives off moisture, so the ratio is a little below the no-temperature value.

## Checks against published solutions

- NOAA COARE 3.5 (github.com/NOAA-PSL/COARE-algorithm, Python, reference height made a parameter): 46 cases at 15 and 18 m,
  6 to 25 kn, air 4 °C colder to 4 °C warmer than the sea: worst difference 0.45%. The 4 light, stable cases differ on purpose
  (the 10% cap). Route tests/windheight.js, reference values tests/data/coare35-ratios.json from tests/windheight_ref.py.
- Hoffman, "Neutral stability height correction for ocean winds" (arXiv 1107.1416), Table 1, 19.5 m to 10 m in neutral air:
  1.054, 1.065, 1.085 against 1.056, 1.067, 1.085 at 5.4, 12.6 and 28.2 m/s.
- COARE 3.6 was tried first; its Python version stops with an error in its sea-ice branch with current numpy, so 3.5 was used.

## Where it is used

- **Navigate, learning:** with the wind sensor height set on the Polars screen, each masthead reading is reduced to 10 m before
  it is learned (`Logger` option `sensorHeight`), using the boat's air and sea temperatures when fresh, else the ECMWF forecast
  at the boat. Stores learned this way are marked `ref: 10`; data learned before is at masthead height and the screen says so.
- **Navigate, helm targets and target heel:** the live masthead wind is reduced to 10 m before the polar is read.
- **Navigate, exports:** 10 m by default; "The masthead" raises the wind speeds with the neutral ratio (a polar file cannot
  carry temperatures). For Expedition, a 10 m polar goes with Expedition's wind height set to 10 m.
- **Route, routing:** Boat tab, Wind height. "10 m" (default) changes nothing. "The masthead" with a sensor height raises the
  forecast wind to that height at each point and time, with the ECMWF 2 m air and sea temperatures when "Allow for warm or cold
  air over the sea" is on (`FSRouter.heightWind`). Route tests/windheight.js and tests/windheight-ui.js.
- **Forecast data:** ECMWF skin temperature over the sea (land-sea mask under 0.5) is added to the ECMWF weather layer as `sst`
  from the next forecast build (scripts/fetch.py, pack_live.py). Until then there is air temperature only, and the ratio is neutral.

## Not done

- Twist (veer with height) is not corrected; no evidence for a correction by TWA (research report, section 2.3 and 6).
- Per-model wind bias learned from logs (research report, section 6.4).
- A 10 m polar is used as it is in stable or unstable air, although the wind over the rig below 10 m changes a little with
  stability (about 1% to 2%).
