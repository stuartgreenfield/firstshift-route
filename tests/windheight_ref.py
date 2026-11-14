"""Reference ratios U(z)/U(10) from NOAA COARE 3.5 (github.com/NOAA-PSL/COARE-algorithm, Python/COARE3.5, with the reference
height made a parameter). Air 12 C at 2 m, humidity 80%, night, latitude 50. Output: tests/data/coare35-ratios.json"""
import sys, json, numpy as np, warnings; warnings.filterwarnings('ignore')
sys.path.insert(0,'/tmp/claude-0/ext/c35')
from coare35vn import coare35vn as C
out=[]
for kn in (6,10,15,20,25):
  for dT in (-4,-2,0,2,4):
    for z in (15,18):
      ta=12.0; ts=ta-dT; u=kn*0.514444
      A=C(np.array([u]),np.array([ta]),np.array([80.0]),np.array([ts]),P=1013,Rs=0,Rl=370,zu=10,zt=2,zq=2,lat=50,zi=600,jcool=1,zrf=z)
      out.append(dict(kn=kn,dT=dT,z=z,r=float(A[0,21]/A[0,22]),zeta=float(A[0,13])))
print(json.dumps(out))
