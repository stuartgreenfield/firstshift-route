"""Records the practice race with Emma (Mark, M50): <helpmedia>/coach/<step>-<hash>.mp3 and coach.json.
Run: python3 tools/coach_voice.py <helpmedia folder> <phrases json> [subfolder]
   coach (default): the practice race, coach.json; startcoach: the start coach (M68), start.json, louder for use on deck."""

import json, os, re, sys, subprocess, wave, numpy as np, onnxruntime as ort
from kokoro_onnx.tokenizer import Tokenizer
import kokoro_onnx
SUB = sys.argv[3] if len(sys.argv) > 3 else 'coach'; MANF = 'start.json' if SUB == 'startcoach' else 'coach.json'; LOUD = 'loudnorm=I=-14:TP=-1' if SUB == 'startcoach' else 'loudnorm=I=-18:TP=-2'
SPEED = 1.15 if SUB == 'startcoach' else 1.0   # the start coach: quicker, and trimmed of silence so a count fits in a second
if SUB == 'startcoach': LOUD = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,' + LOUD
OUT = os.path.join(sys.argv[1], SUB); os.makedirs(OUT, exist_ok=True)
cfg = json.load(open(os.path.join(os.path.dirname(kokoro_onnx.__file__), 'config.json'))); tok = Tokenizer(vocab=cfg['vocab'])
sess = ort.InferenceSession('/home/claude/tts/fp/kokoro-v1.0.onnx')
VOICE = np.fromfile('/home/claude/tts/rt/package/voices/bf_emma.bin', dtype=np.float32).reshape(-1, 256)
# how to say the sailing shorthand aloud
SAY = [(r'(\d)\s*°\s*T\b', r'\1 degrees true'), (r'(\d)\s*°\s*M\b', r'\1 degrees magnetic'), (r'(\d)\s*°', r'\1 degrees'), (r'(\d)\s*nm\b', r'\1 nautical miles'),
       (r'(\d)\s*kn\b', r'\1 knots'), (r'(\d)\s*m\b', r'\1 metres'), (r'(\d)\s*MB\b', r'\1 megabytes'), (r'(\d)\s*s\b', r'\1 seconds'), (r'\bnm\b', 'nautical miles'),
       (r'\bMOB\b', 'M O B'), (r'\bAIS\b', 'A I S'), (r'\bTWA\b', 'T W A'), (r'\bTWS\b', 'T W S'), (r'\bTWD\b', 'T W D'), (r'\bAWA\b', 'A W A'), (r'\bAWS\b', 'A W S'),
       (r'\bBSP\b', 'boat speed'), (r'\bSOG\b', 'S O G'), (r'\bCOG\b', 'C O G'), (r'\bVMG\b', 'V M G'), (r'\bVMC\b', 'V M C'), (r'\bXTE\b', 'cross track error'), (r'\bDTW\b', 'distance to waypoint'),
       (r'\bGRIB\b', 'grib'), (r'\bNMEA\b', 'N M E A'), (r'\bTSS\b', 'traffic separation scheme'), (r'\bGPX\b', 'G P X'), (r'\bCSV\b', 'C S V'), (r'\bECMWF\b', 'E C M W F'),
       (r'\bGFS\b', 'G F S'), (r'\bICON-EU\b', 'icon E U'), (r'\bUKV\b', 'U K V'), (r'\bRORC\b', 'R O R C'), (r'\bJOG\b', 'jog'), (r'\bIRC\b', 'I R C'), (r'·', ','), (r'×', 'times'), (r'→', 'to')]
def clean(t):
    for a, b in SAY: t = re.sub(a, b, t)
    return re.sub(r'\s+', ' ', t).strip()
def synth(text):
    parts = []
    for s in re.findall(r'[^.!?;:]+[.!?;:]*', clean(text)):
        s = s.strip()
        if not s: continue
        ids = tok.tokenize(tok.phonemize(s, 'en-gb'))
        for k in range(0, len(ids), 480):
            ch = ids[k:k + 480]; st = VOICE[min(len(ch), 509)][None, :]
            w = sess.run(None, {'tokens': np.array([[0, *ch, 0]], dtype=np.int64), 'style': st, 'speed': np.array([SPEED], dtype=np.float32)})[0].reshape(-1)
            parts.append(w)
        parts.append(np.zeros(int(24000 * 0.28), dtype=np.float32))
    return np.concatenate(parts) if parts else np.zeros(1, dtype=np.float32)

import hashlib
steps = json.load(open(sys.argv[2])); man = {}
for x in steps:
    h = hashlib.sha1(x['words'].encode()).hexdigest()[:8]; f = x['k'] + '-' + h + '.mp3'
    if not os.path.exists(os.path.join(OUT, f)):
        a = np.clip(synth(x['words']), -1, 1); wav = os.path.join(OUT, x['k'] + '.wav')
        with wave.open(wav, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes((a * 32767).astype(np.int16).tobytes())
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-af', LOUD, '-ar', '24000', '-ac', '1', '-b:a', '32k', os.path.join(OUT, f)], check=True); os.remove(wav)
    man[x['k']] = f
for g in os.listdir(OUT):
    if g.endswith('.mp3') and g not in man.values(): os.remove(os.path.join(OUT, g))
json.dump(man, open(os.path.join(OUT, MANF), 'w'), indent=1); print(SUB, len(man))
