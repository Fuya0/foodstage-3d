"""Describe current audio objectively; these proxies do not establish food realism."""
from build_eating_audio import ROOT, SR, decode
from scipy.signal import stft
import json
import numpy as np

def metrics(samples):
    frequency, _, z = stft(samples, fs=SR, nperseg=1024, noverlap=768)
    power = abs(z)**2
    total = max(power.sum(), 1e-12)
    return dict(high_energy_percent=float(100*power[frequency>=3000].sum()/total),
        centroid_hz=float((frequency[:,None]*power).sum()/total),
        peak_rms_db=float(20*np.log10(max(abs(samples))/max(np.sqrt(np.mean(samples**2)),1e-12))))

def main():
    report = {}
    for project in ['foodstage-3d','xlsk']:
        mapping = json.loads((ROOT/project/'src/data/eating-audio.json').read_text(encoding='utf-8'))
        for dish, stages in mapping.items():
            rows = []
            for role, url in stages[0].items():
                rows.append(dict(role=role, url=url, **metrics(decode(ROOT/project/'public'/url.lstrip('/')))))
            report[dish] = rows
            print(dish, '3k+ energy%', [round(r['high_energy_percent'],2) for r in rows],
                  'centroidHz', [round(r['centroid_hz']) for r in rows])
    output = ROOT/'音效库'/'试听-v2'/'texture-analysis.json'
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')

if __name__ == '__main__': main()
