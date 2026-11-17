"""Rice v8: use the full user-approved cake reference, preserving its variations.

Copy the approved encoded waveform without another render or gain pass. Runtime
files and provenance are all installed inside xlsk; the cake is read-only.
"""
from pathlib import Path
import copy, hashlib, json, shutil
from build_eating_audio import ROOT

def main():
    current=json.loads((ROOT/'xlsk/src/data/eating-audio.json').read_text(encoding='utf-8'))
    if any('/v9/' in take.get('bite','') for take in current.get('mango-rice',[])):
        print('mango-rice uses new soft-dessert v9; rebuild with tools/build_pudding_rice_audio.py')
        return
    reference=ROOT/'foodstage-3d/public/audio/mango-cheesecake/v6'
    original=json.loads((reference/'manifest.json').read_text(encoding='utf-8'))
    source_mapping=ROOT/'foodstage-3d/src/data/eating-audio.json'
    untouched={path:hashlib.sha256(path.read_bytes()).hexdigest() for path in [source_mapping,*reference.rglob('*')] if path.is_file()}
    base=ROOT/'xlsk/public'
    folder=base/'audio/tasting/mango-rice/v8'
    stages,rows=[],[]
    for stage in range(4):
        files={}
        for role_index,role in enumerate(['bite','chew-1','chew-2','finish']):
            ref=next(row for row in original['clips'] if f'/stage-{stage}/' in row['url'] and row['url'].endswith(f'/{role}.mp3'))
            src=ROOT/'foodstage-3d/public'/ref['url'].lstrip('/')
            dst=folder/f'stage-{stage}'/f'{role}.mp3'
            dst.parent.mkdir(parents=True,exist_ok=True)
            shutil.copyfile(src,dst)
            record=copy.deepcopy(ref)
            record['url']='/'+dst.relative_to(base).as_posix()
            record['selection']='complete approved cake soft reference; same stage and role; bit-for-bit copy; no new gain/filter/codec pass'
            assert hashlib.sha256(dst.read_bytes()).hexdigest()==record['sha256']
            rows.append(record);files[role]=record['url']
        stages.append(files)
    note='采用用户认可的蛋糕v6完整软糯声组，保留三段原始口段及四阶段的角色变化。仍是香蕉软食口腔代理，非糯米饭专门录音。'
    (folder/'manifest.json').write_text(json.dumps(dict(dish='mango-rice',revision='v8',note=note,
        selection='complete user-approved cake v6 reference; identical stage/role assignment and encoded waveforms; three takes reused across stages',
        clips=rows),ensure_ascii=False,indent=2),encoding='utf-8')
    (folder/'SOURCE.md').write_text('# 糯米饭柔软咀嚼 v8\n\n'+note+'\n\n'
        '- CAT-FOX_ALEX — [Chewing_Banana_Raw / Freesound #880393](https://freesound.org/people/CAT-FOX_ALEX/sounds/880393/) — CC0-1.0。\n\n'
        '按用户“采用和蛋糕差不多的”反馈，采用完整组25.28s、42.16s、32.70s口段及原阶段/角色对应，避免仅两段机械轮换。不声称16次独立录制。'
        '使用已通过反馈的编码波形，未再次增响、滤波、变速、压缩、叠层或重编码。每个MP3均已复制在本项目v8目录内，运行时不依赖食刻或音效库。'
        '具体源切点、原增益、尾部数据和SHA-256见manifest.json；参考蛋糕文件未修改。\n',encoding='utf-8')
    mapping_path=ROOT/'xlsk/src/data/eating-audio.json'
    mapping=json.loads(mapping_path.read_text(encoding='utf-8'));mapping['mango-rice']=stages
    mapping_path.write_text(json.dumps(mapping,indent=2)+'\n',encoding='utf-8')
    assert all(hashlib.sha256(path.read_bytes()).hexdigest()==digest for path,digest in untouched.items()), 'Approved cake changed'
    print('mango-rice v8: full 16-file cake reference copied locally; same stage/role; approved cake assets and mapping unchanged; SHA-256 match')

if __name__=='__main__': main()
