"""Fetch public licensed preview recordings, retaining page/license evidence."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib, json, re, requests

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / '音效库' / 'freesound'
SOURCES = [
    ('chicken-soft', 'R1nkata', 723596, 'CC0-1.0'),
    ('chicken-crust', 'ty66kill', 503509, 'CC-BY-4.0'),
    ('noodles', 'marcjunker', 204114, 'CC0-1.0'),
    ('soup', 'Eakoontz', 153528, 'CC0-1.0'),
    ('mango', 'zebraphone', 35700, 'CC-BY-4.0'),
]

def fetch(entry):
    name, author, number, license_id = entry
    url = f'https://freesound.org/people/{author}/sounds/{number}/'
    page = requests.get(url, timeout=45); page.raise_for_status()
    preview = re.search(r'https://cdn\.freesound\.org/previews/[^\s<>\"\']+-hq\.mp3', page.text).group()
    audio = requests.get(preview, timeout=60); audio.raise_for_status()
    DEST.mkdir(parents=True, exist_ok=True)
    (DEST / f'{name}.mp3').write_bytes(audio.content)
    (DEST / f'{name}.html').write_text(page.text, encoding='utf-8')
    meta = dict(name=name, author=author, id=number, page=url, preview=preview,
                license=license_id, downloaded='2026-11-17', sha256=hashlib.sha256(audio.content).hexdigest())
    (DEST / f'{name}.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    return meta

if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=5) as pool:
        for result in pool.map(fetch, SOURCES):
            print(json.dumps(result, ensure_ascii=False))
