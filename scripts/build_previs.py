#!/usr/bin/env python3
"""Build an offline v4 generic previs; also accepts v3 and v2/compact projects."""
import argparse
import html
import importlib.util
import json
import math
from pathlib import Path
import re
import sys
import hashlib
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
spec = importlib.util.spec_from_file_location('legacy_builder', ASSETS/'legacy/scripts/build_previs.py')
legacy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(legacy)
seq_spec = importlib.util.spec_from_file_location('sequence_model', ROOT/'scripts/sequence_model.py')
sequence = importlib.util.module_from_spec(seq_spec)
seq_spec.loader.exec_module(sequence)

def validate(c):
    if not isinstance(c,dict): raise ValueError('Project must be a JSON object')
    if c.get('version') == 4:
        return sequence.validate(c)
    if c.get('version') != 3:
        return legacy.validate(c if c.get('version') == 2 else legacy.expand(c))
    duration = legacy.num(c.get('duration'), 'duration', .1, 600)
    legacy.text(c.get('title'), 'title', 60)
    legacy.num(c.get('fov'), 'fov', 15, 100)
    legacy.choice(c.get('cameraSpace'), ['subject', 'world'], 'cameraSpace')
    legacy.choice(c.get('environment'), ['valley', 'empty'], 'environment')
    for name in ['subject','camera','look']:
        keys = c['tracks'][name]
        if not isinstance(keys, list) or not 2 <= len(keys) <= 100:
            raise ValueError('Each track needs 2-100 keys')
        if keys[0]['t'] != 0 or abs(keys[-1]['t']-duration) > 1e-6:
            raise ValueError('Tracks must span the full duration')
        for i,k in enumerate(keys):
            legacy.num(k['t'], 'key.t', 0, duration)
            if i and k['t'] <= keys[i-1]['t']: raise ValueError('Key times must increase')
            if len(k['p']) != 3: raise ValueError('Use xyz positions')
            for n in k['p']: legacy.num(n, 'key.p', -10000, 10000)
            legacy.num(k.get('bank',0),'bank',-90,90)
    phases=c['phases']
    if not isinstance(phases,list) or not phases or phases[0]['t']!=0: raise ValueError('Phases must start at zero')
    for i,p in enumerate(phases):
        legacy.num(p['t'],'phase.t',0,duration-1e-6)
        if i and p['t']<=phases[i-1]['t']: raise ValueError('Phase times must increase')
        legacy.text(p['name'],'phase.name',40 if c.get('language')=='en' else 20)
        legacy.text(p['note'],'phase.note',100 if c.get('language')=='en' else 40)
    return c

def read(path):
    if path.stat().st_size>12000000: raise ValueError('Input exceeds 12 MB')
    raw=path.read_text('utf-8-sig')
    if path.suffix.lower() in ('.html','.htm'):
        parser=legacy.ConfigParser();parser.feed(raw)
        if parser.count!=1: raise ValueError('Expected one config data block')
        raw=''.join(parser.parts)
    return validate(json.loads(raw))

def build(c):
    if c['version']==4:
        vendor=ASSETS/'legacy/assets/engine/vendor'
        values={'CONFIG':json.dumps(c,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c'),
                'THREE':'window.THREE=(function(exports){'+(vendor/'three.cjs').read_text()+';return exports;})({});',
                'TIMELINE':(ASSETS/'timeline.js').read_text(),
                'LICENSE':html.escape((vendor/'THREE-LICENSE.txt').read_text())}
        for name in ['MODEL','PROXIES','MP4','ENGINE']:
            values[name]=(ASSETS/'sequence'/f'{name.lower()}.js').read_text()
        return re.sub(r'<!--(CONFIG|THREE|TIMELINE|MODEL|PROXIES|MP4|ENGINE|LICENSE)-->',lambda m:values[m[1]],(ASSETS/'sequence/template.html').read_text())
    if c['version']!=3: return legacy.build_html(c)
    engine=ASSETS/'legacy/assets/engine'
    values={'CONFIG':json.dumps(c,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c'),
        'THREE':'window.THREE=(function(exports){'+(engine/'vendor/three.cjs').read_text()+';return exports;})({});',
        'TIMELINE':(ASSETS/'timeline.js').read_text(), 'ENGINE':(ASSETS/'engine.js').read_text(),
        'VIDEO':(engine/'video-export.js').read_text(), 'LICENSE':html.escape((engine/'vendor/THREE-LICENSE.txt').read_text())}
    return re.sub(r'<!--(CONFIG|THREE|TIMELINE|ENGINE|VIDEO|LICENSE)-->',lambda m:values[m[1]],(ASSETS/'template.html').read_text())

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('input',type=Path)
    g=p.add_mutually_exclusive_group(required=True);g.add_argument('--out',type=Path);g.add_argument('--extract-json',type=Path);g.add_argument('--check',action='store_true')
    args=p.parse_args();c=read(args.input)
    if args.out:
        page=build(c);args.out.mkdir(parents=True,exist_ok=False)
        (args.out/'preview.html').write_text(page,'utf-8');(args.out/'project.json').write_text(json.dumps(c,ensure_ascii=False,indent=2),'utf-8')
        if c['version']==4:
            files=['assets/sequence/'+n for n in ['template.html','model.js','proxies.js','mp4.js','engine.js']]+['assets/timeline.js','assets/legacy/assets/engine/vendor/three.cjs']
            info={'version':4,'engine':'generic-sequence','duration':c['duration'],'frames':round(c['duration']*c['fps']),
                  'project_sha256':hashlib.sha256((args.out/'project.json').read_bytes()).hexdigest(),
                  'engine_files':{f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in files}}
            (args.out/'build-info.json').write_text(json.dumps(info,indent=2),'utf-8')
    if args.extract_json:
        with args.extract_json.open('x',encoding='utf-8') as f:json.dump(c,f,ensure_ascii=False,indent=2)
    print(json.dumps({'version':c['version'],'output':str(args.out) if args.out else None},ensure_ascii=False))
if __name__=='__main__':
    try:main()
    except (ValueError,TypeError,KeyError,OSError) as e:sys.exit('ERROR: '+str(e))
