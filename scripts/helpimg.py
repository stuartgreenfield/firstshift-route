"""Pack Help screen pictures into one script: python3 scripts/helpimg.py shotsdir site/cervantes/fshelpimg.js
Each PNG becomes WebP, 880 px wide at most, quality 62, as a data URI under its file name."""
import base64, json, os, subprocess, sys, tempfile
src, out = sys.argv[1], sys.argv[2]
imgs = {}
for f in sorted(os.listdir(src)):
    if not f.endswith('.png'): continue
    with tempfile.NamedTemporaryFile(suffix='.webp') as t:
        subprocess.run(['convert', os.path.join(src, f), '-resize', '880x>', '-quality', '62', t.name], check=True)
        imgs[f[:-4]] = 'data:image/webp;base64,' + base64.b64encode(open(t.name, 'rb').read()).decode()
open(out, 'w').write('/* FirstShift Route: help screen pictures, loaded only when Help opens (13 Nov 2026). */\nwindow.__navHelpImg = ' + json.dumps(imgs) + ';\n')
print(len(imgs), 'pictures,', os.path.getsize(out) // 1024, 'KB')
