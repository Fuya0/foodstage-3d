"""v6 soft-food substitution: select an entirely soft take with a quiet tail.

No older cake/dumpling/mango material, no mixed layers, no nonlinear compression.
The exact 0.78s interval tested is also the exact interval exported for finish.
"""
import json
import numpy as np
from build_eating_audio import ROOT, LIB, SR, decode
from build_natural_eating_audio import prepare, write_clip

DURATION = .78

def texture(y):
    rms = np.sqrt(np.mean(y*y))
    def high_fraction(part):
        p = abs(np.fft.rfft(part))**2
        f = np.fft.rfftfreq(len(part),1/SR)
        return float(p[f>3000].sum()/max(p.sum(),1e-12))
    tail = y[-round(.16*SR):]
    return dict(rms_db=float(20*np.log10(max(rms,1e-12))), high=high_fraction(y),
        tail_high=high_fraction(tail),crest_db=float(20*np.log10(max(abs(y))/max(rms,1e-12))),
        tail_peak_ratio=float(max(abs(tail))/max(max(abs(y)),1e-12)),
        tail_rms_ratio=float(np.sqrt(np.mean(tail*tail))/max(rms,1e-12)))

def select(x):
    candidates=[]
    for start in np.arange(.2,len(x)/SR-.80,.02):
        part=x[round(start*SR):round((start+DURATION)*SR)]
        metric=texture(part)
        if metric['rms_db'] < -42 or metric['high']>.13 or metric['tail_high']>.04: continue
        if metric['crest_db']>27 or metric['tail_peak_ratio']>.45 or metric['tail_rms_ratio']>.70: continue
        score=metric['high']+metric['tail_high']+.01*max(metric['crest_db']-20,0)
        candidates.append((score,float(start),metric))
    chosen=[]
    for _,start,metric in sorted(candidates):
        if all(abs(start-item['start'])>.9 for item in chosen): chosen.append(dict(start=start,**metric))
        if len(chosen)==5: break
    if len(chosen)<4: raise ValueError('Not enough soft intervals with clean tails; do not fabricate extra takes')
    return chosen

def main():
    raw=LIB/'freesound/banana-soft.mp3'
    meta=json.loads(raw.with_suffix('.json').read_text(encoding='utf-8'))
    x=prepare(raw,'soft')
    takes=select(x)
    for project,dish,indexes in [('foodstage-3d','mango-cheesecake',[0,3,4]),('xlsk','mango-rice',[2,1])]:
        if dish=='mango-rice':
            existing=json.loads((ROOT/project/'src/data/eating-audio.json').read_text(encoding='utf-8'))
            if any(any(f'/v{revision}/' in take.get('bite','') for revision in [7,8,9]) for take in existing.get(dish,[])):
                print('mango-rice uses a newer reference; rebuild with tools/build_mango_rice_audio.py',flush=True)
                continue
        base=ROOT/project/'public'
        folder=base/'audio'/('tasting' if project=='xlsk' else '')/dish/'v6'
        stages,rows=[],[]
        for stage in range(4):
            files={}
            for role_index,role in enumerate(['bite','chew-1','chew-2','finish']):
                take=takes[indexes[(role_index+stage)%len(indexes)]]
                start=take['start']
                # Finish is not made longer: extending a soft take previously
                # captured a subsequent brittle mouth click outside the selected interval.
                part=x[round(start*SR):round((start+DURATION)*SR)].copy()
                part*=10**((6-stage*.2)/20)
                dest=folder/f'stage-{stage}'/f'{role}.mp3'
                metric=write_clip(part,dest,fade_out=.080)
                observed=texture(decode(dest))
                assert observed['tail_peak_ratio'] < .50
                assert observed['tail_high'] < .06
                url='/'+dest.relative_to(base).as_posix()
                files[role]=url
                rows.append(dict(url=url,source=raw.relative_to(ROOT).as_posix(),start=round(start,3),
                    source_gain_db=6,stage_gain_db=-stage*.2,raw_tail=take,
                    decoded_tail=observed,processing='direct soft-food recording; exact .78s selection including finish; one-pole 65Hz/6500Hz filtering; 8ms/80ms fades; linear peak protection only',**metric))
            stages.append(files)
        folder.mkdir(parents=True,exist_ok=True)
        note='真实香蕉软食咀嚼作柔软口腔代理，非蛋糕或糯米饭专门实录；避免原片中的脆裂/硬颗粒收尾。'
        (folder/'manifest.json').write_text(json.dumps(dict(dish=dish,revision='v6',note=note,
            selection='sustained soft-food windows; whole interval and final 160ms screened separately; 0.78s tested/exported identically',
            clips=rows),ensure_ascii=False,indent=2),encoding='utf-8')
        (folder/'SOURCE.md').write_text('# 纯软食咀嚼 v6\n\n'+note+'\n\n'
            f"- {meta['author']} — [Chewing_Banana_Raw / Freesound #{meta['id']}]({meta['page']}) — CC0-1.0。真实软果进食录音，已剪辑、轻滤波、调整固定电平和淡入淡出。\n\n"
            '每口一个原始录音窗口，原速、原动态、无叠层、无非线性压缩、无逐段RMS归一化。固定源增益+6dB，保留自然轻声。每段包含末尾160ms的筛选指标和编码后复测值；finish不再延长到下一次咬合，80ms平滑淡出。\n\n'
            '筛选指标只排查突发高频和峰值，不等于人工听感验收；两个食物均明确为软食拟音代理。本项目实际播放文件已内置，可独立部署。\n',encoding='utf-8')
        mapping_path=ROOT/project/'src/data/eating-audio.json'
        mapping=json.loads(mapping_path.read_text(encoding='utf-8'));mapping[dish]=stages
        mapping_path.write_text(json.dumps(mapping,indent=2)+'\n',encoding='utf-8')
        print(dish, 'takes', [round(takes[index]['start'],2) for index in indexes], '16 clips; tails passed',flush=True)

if __name__=='__main__': main()
