"""Rice v9: actual soft foam-dessert chewing, no cake/banana or brittle layers."""
import hashlib, json
import numpy as np
from scipy.ndimage import median_filter
from build_eating_audio import ROOT, LIB, SR, decode
from build_natural_eating_audio import prepare, write_clip

def main():
    raw=LIB/'freesound/dessert-soft.mp3'
    meta=json.loads(raw.with_suffix('.json').read_text(encoding='utf-8'))
    cake=ROOT/'foodstage-3d/public/audio/mango-cheesecake/v6'
    cake_mapping=ROOT/'foodstage-3d/src/data/eating-audio.json'
    frozen={p:hashlib.sha256(p.read_bytes()).hexdigest() for p in [cake_mapping,*cake.rglob('*')] if p.is_file()}
    x=prepare(raw,'soft')
    # These are separate closures in a recording whose actual material is a
    # foam-like soft dessert, screened as whole intervals and at the tail.
    takes=[(12.08,.68),(24.92,.68),(3.20,.68)]
    base=ROOT/'xlsk/public'; folder=base/'audio/tasting/mango-rice/v9'
    stages,rows=[],[]
    for stage in range(4):
        files={}
        for index,role in enumerate(['bite','chew-1','chew-2','finish']):
            start,duration=takes[(index+stage)%len(takes)]
            part=x[round(start*SR):round((start+duration)*SR)].copy()
            # Repair only isolated sub-millisecond clicks. Do not reshape the
            # sustained jaw envelope or compress all mouth sounds.
            baseline=median_filter(abs(part),size=133)
            spikes=abs(part)>np.maximum(8*baseline,.00004)
            changed=np.zeros(len(part),dtype=bool)
            for peak in np.flatnonzero(spikes):
                changed[max(0,peak-22):min(len(part),peak+23)]=True
            assert changed.mean()<.01, 'Too many clicks: reject the source interval'
            if changed.any():
                positions=np.arange(len(part)); good=~changed
                part[changed]=np.interp(positions[changed],positions[good],part[good])
            # A single +12dB source setting makes the inherently quiet dessert
            # audible; no per-take RMS normalization or makeup after peak control.
            part*=10**((12-stage*.2)/20)
            dest=folder/f'stage-{stage}'/f'{role}.mp3'
            metric=write_clip(part,dest,fade_out=.08)
            url='/'+dest.relative_to(base).as_posix();files[role]=url
            rows.append(dict(url=url,source=raw.relative_to(ROOT).as_posix(),start=start,
                source_gain_db=12,stage_gain_db=-stage*.2,click_repair_fraction=float(changed.mean()),
                processing='single actual soft foam-dessert recording; gentle 65/6500Hz one-pole filter; isolated click interpolation; original speed/dynamics; 8/80ms fades; linear peak attenuation',**metric))
        stages.append(files)
    note='使用真正吃柔软泡沫状甜点的原始录音，表现柔软压合与黏连；非糯米饭专门录制，不使用蛋糕/香蕉旧片段或脆响层。'
    (folder/'manifest.json').write_text(json.dumps(dict(dish='mango-rice',revision='v9',note=note,
        selection='soft material verified by original recorder description; three whole mouthfuls reused across four stages; no role extends into another closure',clips=rows),ensure_ascii=False,indent=2),encoding='utf-8')
    (folder/'SOURCE.md').write_text('# 糯米饭柔软压合 v9\n\n'+note+'\n\n'
        f"- {meta['author']} — [eating.wav / Freesound #{meta['id']}]({meta['page']}) — {meta['license']}。原作者描述：Me eating a soft foam-like dessert。\n\n"
        '只使用一个原始声源：不叠脆壳、果肉硬裂、牙齿敲击或合成音。原速、原动态，不逐段RMS拉齐；轻滤波、极少量孤立点击插值、短淡入淡出与只衰减的峰值保护。录音本身很轻，整源固定+12dB，未对弱段单独增响。'
        '原始录音描述支持软食来源，但处理和频谱检查不能代替耳机听感验收。仍明确为软甜点口腔代理，非糯米饭专门录音。所有实际播放MP3均在本项目，可独立部署。蛋糕文件保持不变。\n',encoding='utf-8')
    mapping_path=ROOT/'xlsk/src/data/eating-audio.json'
    mapping=json.loads(mapping_path.read_text(encoding='utf-8'));mapping['mango-rice']=stages
    mapping_path.write_text(json.dumps(mapping,indent=2)+'\n',encoding='utf-8')
    assert all(hashlib.sha256(p.read_bytes()).hexdigest()==digest for p,digest in frozen.items())
    print('mango-rice v9: 16 soft-dessert one-shots; cake unchanged; max click-repair fraction',max(r['click_repair_fraction'] for r in rows),flush=True)

if __name__=='__main__': main()
