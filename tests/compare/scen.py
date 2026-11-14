import json, math
k = math.cos(math.radians(50))
def pt(nm, brg): return [50 + nm * math.cos(math.radians(brg)) / 60, -2 + nm * math.sin(math.radians(brg)) / 60 / k]
S = [dict(name='beat 20 nm, 12 kn steady', to=pt(20, 0), nm=20, w0=12, w1=12, d0=0, d1=0, hrs=6, analytic='up'),
     dict(name='run 20 nm, 12 kn steady', to=pt(20, 180), nm=20, w0=12, w1=12, d0=0, d1=0, hrs=6, analytic='down'),
     dict(name='reach 20 nm, 12 kn steady', to=pt(20, 90), nm=20, w0=12, w1=12, d0=0, d1=0, hrs=6, analytic='reach'),
     dict(name='beat 30 nm, wind veers 340 to 020 over 6 h', to=pt(30, 0), nm=30, w0=12, w1=12, d0=340, d1=20, hrs=6),
     dict(name='reach 30 nm, wind builds 8 to 16 kn over 6 h', to=pt(30, 90), nm=30, w0=8, w1=16, d0=0, d1=0, hrs=6),
     dict(name='beat 30 nm, 6 kn light air', to=pt(30, 0), nm=30, w0=6, w1=6, d0=0, d1=0, hrs=6, analytic='up')]
json.dump(S, open('scen.json', 'w'))
