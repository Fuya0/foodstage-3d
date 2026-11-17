"""Decode, verify and make four-stage audition reels. No UI/server needed."""
from build_eating_audio import ROOT, SR, decode
import json, subprocess
import numpy as np

def main():
    all_rows = []
    auditions = ROOT/'音效库'/'试听-v2'
    auditions.mkdir(exist_ok=True)
    for project in ['foodstage-3d', 'xlsk']:
        manifest = json.loads((ROOT/project/'src/data/eating-audio.json').read_text(encoding='utf-8'))
        for dish, stages in manifest.items():
            reel = []
            for stage, files in enumerate(stages):
                for role, url in files.items():
                    path = ROOT/project/'public'/url.lstrip('/')
                    samples = decode(path)
                    duration, peak = len(samples)/SR, float(max(abs(samples)))
                    rms = float(np.sqrt(np.mean(samples**2)))
                    assert .5 < duration < 1, (url, duration)
                    assert peak <= .75, (url, peak)
                    if any(f'/v{revision}/' in url for revision in [5,6,7,8,9]):
                        # Natural dynamics: inspect against the recorded source,
                        # rather than requiring the former noise-boosting RMS target.
                        meta = json.loads((path.parent.parent/'manifest.json').read_text(encoding='utf-8'))
                        record = next(clip for clip in meta['clips'] if clip['url']==url)
                        assert record['source_gain_db'] <= (12.001 if '/v9/' in url else 6.001), url
                        assert record['peak_attenuation'] <= 1, url
                        assert abs(20*np.log10(rms)-record['rms_db']) < .02, url
                        assert rms > 1e-5 and np.isfinite(samples).all(), url
                    else:
                        assert -27 < 20*np.log10(rms) < -19, (url, rms)
                    all_rows.append(dict(project=project, dish=dish, stage=stage, role=role,
                        duration=duration, peak_db=20*np.log10(peak), rms_db=20*np.log10(rms)))
                # Each group is opening bite -> chew -> closing mouthful; 0.9 s gap between stages.
                for role in ['bite', 'chew-1' if stage%2 == 0 else 'chew-2', 'finish']:
                    reel.extend([decode(ROOT/project/'public'/files[role].lstrip('/')), np.zeros(round(SR*.20))])
                reel.append(np.zeros(round(SR*.9)))
            revision = stages[0]['bite'].split('/')[-3]
            suffix = '-'+revision if revision != 'v2' else ''
            subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','1','-i','-',
                '-codec:a','libmp3lame','-b:a','128k',str(auditions/f'{dish}-four-stages{suffix}.mp3')],
                input=np.concatenate(reel).astype('<f4').tobytes(), check=True)
    report = dict(count=len(all_rows), peak_db_max=max(r['peak_db'] for r in all_rows),
        rms_db_range=[min(r['rms_db'] for r in all_rows),max(r['rms_db'] for r in all_rows)], clips=all_rows)
    (auditions/'audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2), encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='clips'}, indent=2))

if __name__ == '__main__': main()
