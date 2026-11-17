"""v5: direct recorded mouthfuls with minimal, linear processing.

Local authoring only. Does not use prior v2-v4 renders, synthesize layers,
compress, spectrally denoise, or normalize each mouthful to a target RMS.
"""
import json, subprocess, hashlib
import numpy as np
from scipy.signal import butter, sosfilt
from build_eating_audio import ROOT, LIB, SR, decode, local

def prepare(path, kind):
    x = decode(path)
    x = sosfilt(butter(1, 65, 'highpass', fs=SR, output='sos'), x)
    if kind == 'fries':
        # Mild shelf: keep the fry's crack, reduce its piercing upper texture.
        low = sosfilt(butter(1, 3200, 'lowpass', fs=SR, output='sos'), x)
        x = low + (x-low)*10**(-4/20)
    else:
        # A gentle upper cut only; no aggressive spectral masks or body boosts.
        x = sosfilt(butter(1, 6500, 'lowpass', fs=SR, output='sos'), x)
    return x

def mouthfuls(x):
    candidates = []
    for start in np.arange(.08, len(x)/SR-.89, .06):
        part = x[round(start*SR):round((start+.78)*SR)]
        rms = np.sqrt(np.mean(part**2))
        if rms < 1e-7: continue
        frames = part[:len(part)//882*882].reshape(-1, 882)
        env = np.sqrt(np.mean(frames**2, axis=1))
        crest = 20*np.log10(max(abs(part))/rms)
        # Prefer sustained closures over an isolated click or a quiet tail.
        score = 20*np.log10(max(np.quantile(env,.75),1e-8)) - .25*max(crest-14,0)
        candidates.append((float(score),float(start),float(20*np.log10(rms))))
    strongest_rms = max(rms for _,_,rms in candidates)
    candidates = [(score,start,rms) for score,start,rms in candidates if rms >= strongest_rms-6]
    best = max(score for score,_,_ in candidates)
    selected = []
    for score,start,_ in sorted(candidates,reverse=True):
        if score < best-7: break
        if all(abs(start-other) >= .80 for other in selected): selected.append(start)
        if len(selected) == 4: break
    if not selected: raise ValueError('No clear mouthfuls')
    return sorted(selected)

def write_clip(part, path, fade_out=.035):
    part = part.copy()
    n_in, n_out = round(SR*.008), round(SR*fade_out)
    part[:n_in] *= np.linspace(0,1,n_in)
    part[-n_out:] *= np.linspace(1,0,n_out)
    # Peak protection only attenuates; preserve the original waveform/dynamics.
    attenuation = min(1., .58/max(max(abs(part)),1e-8))
    part *= attenuation
    path.parent.mkdir(parents=True,exist_ok=True)
    for _ in range(3):
        subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','1','-i','-',
            '-codec:a','libmp3lame','-b:a','128k',str(path)], input=part.astype('<f4').tobytes(),check=True)
        result = decode(path)
        peak = max(abs(result))
        if peak <= .72: break
        part *= .66/peak
    assert peak <= .72
    return dict(duration=round(len(result)/SR,4),rms_db=round(float(20*np.log10(np.sqrt(np.mean(result**2)))),2),
        peak_db=round(float(20*np.log10(peak)),2),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),peak_attenuation=attenuation)

def main():
    remote = lambda name: LIB/'freesound'/f'{name}.mp3'
    recipes = [
        ('foodstage-3d','crispy-chicken',remote('chicken-natural'),'meat',-1., '真实吃鸡腿录音为主体；仅第一口使用原炸鸡录音，不叠加脆壳或人造肉声。'),
        ('foodstage-3d','mango-cheesecake',local('奶油蛋糕'),'cream',0., '直接从原奶油蛋糕录音重切，保留原始动态和口腔声，不提升弱片段底噪。'),
        ('foodstage-3d','rosemary-fries',local('炸薯条'),'fries',-2.5, '原薯条咀嚼实录，轻收高频并降低2.5dB，保留细脆壳与薯芯。'),
        ('xlsk','satay',remote('chicken-natural'),'meat',-1., '改用真实吃鸡腿录音的清楚口段，保留肉的咬合；不用低响度软鸡肉片段强行增响。'),
        ('xlsk','mango-rice',local('吃饺子'),'soft',0., '清楚的软食真实咀嚼为糯米口腔代理，前两阶段入口单独使用真芒果片段；不叠层，仍非糯米饭专门实录。'),
    ]
    for project,dish,path,kind,level_db,note in recipes:
        mapping_path = ROOT/project/'src/data/eating-audio.json'
        mapping = json.loads(mapping_path.read_text(encoding='utf-8'))
        if any(any(f'/v{revision}/' in take.get('bite','') for revision in [6,7,8,9]) for take in mapping.get(dish,[])):
            print(dish, 'uses v6/v7; use its current soft/rice recipe',flush=True)
            continue
        x = prepare(path,kind); takes = mouthfuls(x)
        # One gain for the entire source set; cap upward gain at +6dB. Weak takes
        # are rejected rather than heavily boosted; quiet foods remain quieter.
        reference = np.median([np.sqrt(np.mean(x[round(t*SR):round((t+.78)*SR)]**2)) for t in takes])
        gain_db = min(6., 20*np.log10(.04/max(reference,1e-8))) + level_db
        x *= 10**(gain_db/20)
        fruit = prepare(remote('mango'),'fruit') if dish=='mango-rice' else None
        fruit_takes = mouthfuls(fruit) if fruit is not None else []
        base = ROOT/project/'public'
        folder = base/'audio'/('tasting' if project=='xlsk' else '')/dish/'v5'
        stages,rows = [],[]
        for stage in range(4):
            files = {}
            for index,role in enumerate(['bite','chew-1','chew-2','finish']):
                duration = .86 if role=='finish' else .76
                start = takes[(index+stage)%len(takes)]
                raw_path, clip_gain = path,gain_db
                part = x[round(start*SR):round((start+duration)*SR)].copy()
                if dish=='crispy-chicken' and stage==0 and role=='bite':
                    raw_path = remote('chicken-crust'); start=.16
                    crust = prepare(raw_path,'meat')
                    clip_gain=3.
                    part = crust[round(start*SR):round((start+duration)*SR)]*10**(clip_gain/20)
                if dish=='mango-rice' and stage < 2 and role=='bite':
                    raw_path = remote('mango'); start=fruit_takes[stage%len(fruit_takes)]
                    clip_gain=6.
                    part=fruit[round(start*SR):round((start+duration)*SR)]*10**(clip_gain/20)
                part *= 10**(-stage*.20/20)
                dest = folder/f'stage-{stage}'/f'{role}.mp3'
                metric = write_clip(part,dest)
                url = '/'+dest.relative_to(base).as_posix()
                files[role]=url
                rows.append(dict(url=url,source=raw_path.relative_to(ROOT).as_posix(),start=round(start,3),
                    source_gain_db=round(float(clip_gain),3),stage_gain_db=-stage*.20,
                    processing='one-pole 65Hz highpass; mild upper cut; short fades; linear peak protection; no compression, no layers, no per-clip RMS target',**metric))
            stages.append(files)
        folder.mkdir(parents=True,exist_ok=True)
        record=dict(dish=dish,note=note,revision='v5',takes=takes,source_gain_db=float(gain_db),
            selection='strong sustained original mouthfuls within 7dB of best; >=0.8s apart; quiet sections excluded; source takes reused across stages',clips=rows)
        (folder/'manifest.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
        credits=[]
        extra_sources = [remote('chicken-crust')] if dish=='crispy-chicken' else [remote('mango')] if dish=='mango-rice' else []
        for source_path in {path,*extra_sources}:
            if source_path.parent.name=='freesound':
                meta=json.loads(source_path.with_suffix('.json').read_text(encoding='utf-8'))
                credits.append(f"- {meta['author']} — [Freesound #{meta['id']}]({meta['page']}) — {meta['license']}；已剪辑、轻滤波和调整电平。")
            else: credits.append(f'- {source_path.name}：用户提供的爱给网原始录音，沿用其原授权，不标为CC0。')
        (folder/'SOURCE.md').write_text('# 原始实录轻处理 v5\n\n'+note+'\n\n'+'\n'.join(credits)+
            '\n\n单声道44.1kHz / MP3 128kbps。固定源增益（最多上调6dB）、8ms淡入/35ms淡出、只衰减的线性峰值保护。无变速、无压缩、无逐段响度拉齐、无频谱掩膜和动态门限、无合成层。不同食物允许自然响度差异。薯条另作3200Hz附近约4dB的轻高频衰减。\n\n'
            '来源、切点、实际增益与编码后实测值见manifest.json。原始源只存本地音效库，实际播放MP3全部在本项目。清晰度与真实感仍需人工耳机试听，技术指标不等于听审。\n',encoding='utf-8')
        mapping[dish]=stages
        mapping_path.write_text(json.dumps(mapping,indent=2)+'\n',encoding='utf-8')
        print(project,dish,'takes',takes,'fixed gain dB',round(float(gain_db),2),
            'RMS range',min(r['rms_db'] for r in rows),max(r['rms_db'] for r in rows),flush=True)

if __name__=='__main__': main()
