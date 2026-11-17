"""Rebuild both projects' recorded eating one-shots (Python + numpy/scipy + ffmpeg).

Run from any directory. Originals and previous runtime assets are never overwritten.
All edits and source cut times are retained in each project's v2 manifest.
"""
from pathlib import Path
import hashlib, json, subprocess
import numpy as np
from scipy.signal import butter, sosfilt, find_peaks

ROOT = Path(__file__).resolve().parents[2]
LIB = ROOT / '音效库'
SR = 44100

def decode(path):
    return np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path),
        '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-']), dtype='<f4').copy()

def local(prefix):
    return next(LIB.glob(prefix + '*.mp3'))

def source(path, cutoff):
    samples = decode(path)
    samples = sosfilt(butter(2, 80, 'highpass', fs=SR, output='sos'), samples)
    samples = sosfilt(butter(2, cutoff, 'lowpass', fs=SR, output='sos'), samples)
    return samples

def events(samples):
    # Rank local jaw closures, not the loudest arbitrary overlapping windows.
    hop = 441
    env = np.sqrt(np.mean(samples[:len(samples)//hop*hop].reshape(-1, hop)**2, axis=1))
    env = np.convolve(env, np.ones(5)/5, mode='same')
    peaks, _ = find_peaks(env, distance=60, prominence=max(1e-6, np.quantile(env, .25)))
    peaks = [int(p) for p in peaks if p > 8 and p*hop < len(samples)-SR*.8]
    ranked = sorted(peaks, key=lambda p: env[p], reverse=True)
    selected = []
    for p in ranked:
        if all(abs(p-q) >= 80 for q in selected): selected.append(p)
        if len(selected) == 8: break
    if not selected: raise ValueError('No usable jaw closure found')
    return sorted(max(0, p*.01-.07) for p in selected)

def excerpt(samples, start, duration):
    part = samples[round(start*SR):round((start+duration)*SR)].copy()
    part = np.pad(part, (0, max(0, round(duration*SR)-len(part))))
    rms = np.sqrt(np.mean(part**2))
    if rms < 1e-6: raise ValueError('Silent source')
    return part * (.075/rms)

def encode(samples, dest, target):
    n = len(samples)
    fade_in, fade_out = round(.008*SR), round(.065*SR)
    samples[:fade_in] *= np.linspace(0, 1, fade_in)
    samples[-fade_out:] *= np.linspace(1, 0, fade_out)
    rms = np.sqrt(np.mean(samples**2))
    samples *= 10**(target/20)/max(rms, 1e-8)
    # Softly limit unusual lip pops, then leave headroom for lossy encoding.
    original = samples.copy()
    threshold = .45
    for _ in range(24):
        samples = threshold*np.tanh(original/threshold)
        rms = np.sqrt(np.mean(samples**2))
        if max(abs(samples))/max(rms, 1e-8) <= 5.5: break
        threshold *= .8
    samples *= 10**(target/20)/max(np.sqrt(np.mean(samples**2)), 1e-8)
    dest.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(3):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ac', '1', '-ar', str(SR),
            '-i', '-', '-codec:a', 'libmp3lame', '-b:a', '96k', '-write_xing', '1', str(dest)],
            input=samples.astype('<f4').tobytes(), check=True)
        actual = decode(dest)
        peak = max(abs(actual))
        if peak <= .75: break
        samples *= .65/peak
    assert max(abs(actual)) <= .75, f'Encoded peak exceeds headroom: {dest}'
    return dict(duration=round(len(actual)/SR, 4), rms_db=round(20*np.log10(np.sqrt(np.mean(actual**2))), 2),
                peak_db=round(20*np.log10(max(abs(actual))), 2), sha256=hashlib.sha256(dest.read_bytes()).hexdigest())

def main():
    remote = lambda name: LIB/'freesound'/f'{name}.mp3'
    # Rice is explicitly a foley approximation: soft cake mouth texture + real mango.
    # Remaining amount changes portion weight slightly, never magically removes all crust.
    recipes = [
        ('foodstage-3d', 'classic-burger', local('吃汉堡'), 6200, None, '面包、肉饼与生菜；剩余量仅轻微改变口量'),
        ('foodstage-3d', 'crispy-chicken', remote('chicken-crust'), 7000, remote('chicken-soft'), '脆壳保留，软鸡肉从 12% 增至 30%'),
        ('foodstage-3d', 'rosemary-fries', local('炸薯条'), 7800, None, '每一根仍有脆壳；不将剩余薯条变成土豆泥'),
        ('foodstage-3d', 'pepperoni-pizza', local('披萨'), 3300, None, '采用披萨实录，软面团与芝士的韧感'),
        ('foodstage-3d', 'mango-cheesecake', local('奶油蛋糕'), 2400, None, '轻柔湿润，保持奶油质感'),
        ('xlsk', 'satay', remote('chicken-soft'), 4500, None, '软鸡肉实录，轻微纤维感，无炸鸡脆壳'),
        ('xlsk', 'pad-thai', remote('noodles'), 4600, None, '面条实录的独立咬合，保留短吸入与柔软咀嚼'),
        ('xlsk', 'tom-yum', remote('soup'), 4800, None, '各口为啜汤实录；不使用空杯吸管声或合成咀嚼'),
        ('xlsk', 'mango-rice', local('奶油蛋糕'), 2300, remote('mango'), '拟音替代：柔软口腔声 + 真芒果，非糯米饭专门录音'),
    ]
    manifests = {'foodstage-3d': {}, 'xlsk': {}}
    for project, dish, raw, cutoff, extra, note in recipes:
        samples = source(raw, cutoff); starts = events(samples)
        if dish == 'rosemary-fries':
            starts = [2.82, 3.54, 4.36, 5.84] # Existing source's documented clean chew windows.
        extras = source(extra, 3200) if extra else None
        extra_starts = events(extras) if extras is not None else []
        base = ROOT/project/'public'/'audio'
        folder = base/('tasting' if project == 'xlsk' else '')/dish/'v2'
        rows, stages = [], []
        for stage in range(4):
            files = {}
            for role_idx, role in enumerate(['bite', 'chew-1', 'chew-2', 'finish']):
                duration = (.86 if role == 'finish' else .68) - stage*.01
                if dish == 'satay': duration += .10 # Retain the fibrous release after jaw closure.
                start = starts[(role_idx + stage*2) % len(starts)]
                part = excerpt(samples, start, duration)
                extra_start, mix = None, 0
                if extras is not None:
                    extra_start = extra_starts[(role_idx+stage) % len(extra_starts)]
                    mix = .12+stage*.06 if dish == 'crispy-chicken' else [.38, .35, .32, .30][stage]
                    part = (1-mix)*part + mix*excerpt(extras, extra_start, duration)
                dest = folder/f'stage-{stage}'/f'{role}.mp3'
                metric = encode(part, dest, -21.0-stage*.25)
                url = '/' + dest.relative_to(ROOT/project/'public').as_posix()
                files[role] = url
                rows.append(dict(url=url, source=raw.relative_to(ROOT).as_posix(), start=round(start, 3),
                    extra_source=extra.relative_to(ROOT).as_posix() if extra else None,
                    extra_start=extra_start, mix=mix, lowpass=cutoff, **metric))
            stages.append(files)
        manifests[project][dish] = stages
        record = dict(dish=dish, note=note, selection='energy onset detection; up to eight closures separated by >=0.8s; takes reused across stages', clips=rows)
        (folder/'manifest.json').write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
        credits = []
        for path in [raw, extra]:
            if not path: continue
            if path.parent.name == 'freesound':
                meta = json.loads(path.with_suffix('.json').read_text(encoding='utf-8'))
                credits.append(f"- {meta['author']} — [Freesound #{meta['id']}]({meta['page']}) — {meta['license']}；已剪辑、滤波、混合、淡入淡出。")
            else: credits.append(f'- {path.name}：用户提供的爱给网素材，授权沿用原素材，不声称为 CC0。')
        (folder/'SOURCE.md').write_text('# 咀嚼音效 v2\n\n'+note+'。\n\n'+'\n'.join(credits)+
            '\n\nCC BY 4.0：<https://creativecommons.org/licenses/by/4.0/>；CC0：<https://creativecommons.org/publicdomain/zero/1.0/>。\n'
            '\n单声道 44.1 kHz / MP3 96 kbps；8 ms 淡入、65 ms 淡出；目标 RMS −21 至 −21.75 dBFS，软限幅保留余量。'
            'manifest.json 包含每个切点、混合比例、滤波参数和编码后实测值。\n'
            '\n阶段对应剩余量，变化保持轻微；finish 表示本阶段最后一口，不额外制造吞咽。'
            '切点由能量起音检测辅助选择，尚需佩戴耳机进行人工听感验收，频谱与响度不能证明语义真实性。\n', encoding='utf-8')
        print(project, dish, 'closures:', [round(s,2) for s in starts], 'clips:', len(rows), flush=True)
    for project, manifest in manifests.items():
        dest = ROOT/project/'src'/'data'/'eating-audio.json'
        dest.parent.mkdir(exist_ok=True)
        dest.write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')

if __name__ == '__main__': main()
