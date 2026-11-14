"""Reference values for tests/evidence.js from numpy and scipy (independent of the app's code). Run: python3 tests/evidence_ref.py"""
import json, numpy as np
from scipy.stats import norm
t = np.array([0, 7, 14, 21, 28]) * 86400.0 + 1.7e9; n = np.array([120, 90, 150, 100, 130.]); m = np.array([6.00, 6.15, 6.22, 6.41, 6.50])
est, sd, neff, old = 6.25, 0.3, 98.0, 6.0
W = n.sum(); M = (n * m).sum() / W
slope, icpt = np.polyfit(t - t.mean(), m, 1, w=np.sqrt(n))   # weighted least squares (weights on residuals squared = n)
k = len(m); vb = (n * (m - M) ** 2).sum() / W * k / (k - 1)
sew = 1.25 * sd / np.sqrt(neff); se = np.sqrt(sew ** 2 + vb / k)
T = (n * t).sum() / W; sxx = (n * (t - T) ** 2).sum()
res = (n * (m - M - slope * (t - T)) ** 2).sum(); s2 = res / W * k / max(1, k - 2); seS = np.sqrt(s2 / sxx)
assert abs(slope) > 2 * seS
v = est + slope * (t[-1] - T); se = np.sqrt(se ** 2 + ((t[-1] - T) * seS) ** 2)
p = norm.cdf(abs(v - old) / (2 * se))
json.dump({'sessions': [[float(a), float(b), float(c)] for a, b, c in zip(t, n, m)], 'est': est, 'sd': sd, 'neff': neff, 'old': old, 'slope': float(slope), 'p': float(p), 'v': float(v)}, open('tests/data/evidence-ref.json', 'w'), indent=1)
print('slope', slope, 'p', p, 'v', v)
