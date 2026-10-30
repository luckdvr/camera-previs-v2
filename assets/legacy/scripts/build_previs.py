#!/usr/bin/env python3
"""Build an offline previs from a compact plan, a v2 project, or a saved page.

Python 3 standard library only. Inputs are data; no HTML or script is executed.
"""
import argparse
import copy
import html
from html.parser import HTMLParser
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
ENGINE = ROOT / 'assets' / 'engine'


def fail(message):
    raise ValueError(message)


def text(value, label, limit, default=''):
    value = default if value is None else value
    if not isinstance(value, str) or len(value.encode('utf-16-le')) // 2 > limit:
        fail(f'{label}: expected text, at most {limit} characters')
    return value


def num(value, label, low, high):
    if type(value) not in (int, float) or not math.isfinite(value) or not low <= value <= high:
        fail(f'{label}: expected a finite number in [{low}, {high}]')
    return value


def vec(value, label):
    if not isinstance(value, list) or len(value) != 3:
        fail(f'{label}: expected [x, y, z]')
    return [num(v, label, -15, 15) for v in value]


def choice(value, choices, label):
    if value not in choices:
        fail(f'{label}: choose one of {", ".join(map(str, choices))}')
    return value


def keys(value, allowed, label):
    if not isinstance(value, dict):
        fail(f'{label}: expected an object')
    extra = set(value) - set(allowed)
    if extra:
        fail(f'{label}: unknown fields {sorted(extra)}')


def head(actor):
    return {'stand': 1.75, 'sit': 1.29, 'bed': 1.56}[actor['pose']]


def actor(value, i, count):
    if isinstance(value, str):
        value = {'name': value}
    keys(value, ['name', 'x', 'z', 'pose', 'facing'], 'cast')
    x, z = value.get('x', (i - (count - 1) / 2) * 1.7), value.get('z', 0)
    x, z = num(x, 'cast.x', -4, 4), num(z, 'cast.z', -2, 4)
    return {'name': text(value.get('name'), 'cast.name', 24, f'人物{i+1}'),
            'x': x, 'z': z, 'pose': choice(value.get('pose', 'stand'), ['stand', 'sit', 'bed'], 'cast.pose'),
            'facing': num(value.get('facing', math.degrees(math.atan2(-x, -z)) if x or z else 0), 'cast.facing', -180, 180)}


def camera_for(shot, cast):
    target = cast[0]
    if 'target' in shot:
        target = next((a for a in cast if a['name'] == shot['target']), None)
        if target is None:
            fail(f'Unknown target: {shot["target"]}')
    cx, cz = sum(a['x'] for a in cast) / len(cast), sum(a['z'] for a in cast) / len(cast)
    span = max(1.7, max(a['x'] for a in cast) - min(a['x'] for a in cast),
               max(a['z'] for a in cast) - min(a['z'] for a in cast))
    view = choice(shot.get('view', 'wide'), ['wide', 'single', 'over'], 'view')
    if view == 'wide':
        r = max(4.5, span * 1.45)
        look = [cx, sum(head(a) for a in cast) / len(cast) - .4, cz]
        start = [cx + r * .48, min(3.2, max(head(a) for a in cast) + .5), cz + r * .9]
        fov = 40
    elif view == 'single':
        look = [target['x'], head(target) - .12, target['z']]
        start = [target['x'] + .4, head(target) + .12, target['z'] + 2.4]
        fov = 32
    else:
        foreground = next((a for a in cast if a['name'] == shot.get('over')), None) if 'over' in shot else next((a for a in cast if a is not target), None)
        if foreground is None or foreground is target:
            fail('over view needs a second, distinct foreground actor')
        dx, dz = target['x'] - foreground['x'], target['z'] - foreground['z']
        length = math.hypot(dx, dz)
        if length < .5:
            fail('over view needs separated actors')
        dx, dz = dx / length, dz / length
        start = [foreground['x'] - dx * .85 - dz * .4, head(foreground) + .15,
                 foreground['z'] - dz * .85 + dx * .4]
        look = [target['x'], head(target) - .1, target['z']]
        fov = 37
    camera = shot.get('camera', {})
    keys(camera, ['from', 'to', 'look', 'fov'], 'camera')
    start, look = vec(camera.get('from', start), 'camera.from'), vec(camera.get('look', look), 'camera.look')
    fov = num(camera.get('fov', fov), 'fov', 22, 60)
    move = choice(shot.get('move', 'hold'), ['hold', 'push', 'pull', 'left', 'right', 'up', 'down'], 'move')
    travel = num(shot.get('travel', .45), 'travel', 0, 5)
    end = start[:]
    if 'to' in camera:
        if move != 'hold':
            fail('Use either camera.to or a move preset, not both')
        end = vec(camera['to'], 'camera.to')
    elif move in ('push', 'pull'):
        direction = [look[j] - start[j] for j in range(3)]
        length = math.sqrt(sum(v*v for v in direction))
        if length < .25:
            fail('Camera is too close to its look point')
        end = [start[j] + direction[j] / length * travel * (1 if move == 'push' else -1) for j in range(3)]
    elif move in ('left', 'right'):
        dx, dz = look[0] - start[0], look[2] - start[2]
        length = math.hypot(dx, dz)
        if length < .01:
            fail('Horizontal moves need a nonvertical camera direction')
        sign = 1 if move == 'right' else -1
        end = [start[0] - dz / length * travel * sign, start[1], start[2] + dx / length * travel * sign]
    elif move in ('up', 'down'):
        end[1] += travel * (1 if move == 'up' else -1)
    return {'from': [round(v, 4) for v in start], 'to': [round(v, 4) for v in end],
            'look': [round(v, 4) for v in look], 'fov': fov, 'move': 1, 'height': 0}


def expand(plan):
    keys(plan, ['title', 'scene', 'script', 'set', 'cast', 'shots', 'speed', 'dialogue', 'export'], 'plan')
    values = plan.get('cast', ['人物A', '人物B'])
    if not isinstance(values, list) or not 1 <= len(values) <= 4:
        fail('cast needs 1–4 actors')
    cast = [actor(a, i, len(values)) for i, a in enumerate(values)]
    shots = []
    if not isinstance(plan.get('shots'), list):
        fail('shots must be an array')
    for i, s in enumerate(plan['shots']):
        keys(s, ['name', 'view', 'target', 'over', 'move', 'travel', 'dur', 'action', 'dialogue', 'camera'], 'shot')
        shots.append({'id': f'{i+1:02}', 'name': s.get('name', f'镜头 {i+1}'), 'duration': s.get('dur', 5),
                      'action': s.get('action', ''), 'dialogue': s.get('dialogue', ''), **camera_for(s, cast)})
    return {'version': 2, 'scene': 'camera-previs', 'aspect': '16:9',
            'project': {'title': plan.get('title', '运镜预演'), 'description': plan.get('scene', ''),
                        'script': plan.get('script', ''), 'set': plan.get('set', 'empty'), 'actors': cast},
            'options': {'speed': plan.get('speed', 1), 'dialogue': plan.get('dialogue', any(s['dialogue'] for s in shots)),
                        'exportArea': plan.get('export', 'video')}, 'shots': shots}


def validate(c):
    if not isinstance(c, dict) or (c.get('version'), c.get('scene'), c.get('aspect')) != (2, 'camera-previs', '16:9'):
        fail('Expected a v2 camera-previs project')
    p, o = c['project'], c['options']
    actors = p['actors']
    if not isinstance(actors, list) or not 1 <= len(actors) <= 4:
        fail('project.actors needs 1–4 actors')
    actors = [actor(a, i, len(actors)) for i, a in enumerate(actors)]
    names = [a['name'].strip() for a in actors]
    if any(not n for n in names) or len(set(names)) != len(names):
        fail('Actor names must be unique and nonempty')
    project = {'title': text(p.get('title'), 'title', 60, '运镜预演'),
               'description': text(p.get('description'), 'scene', 3000), 'script': text(p.get('script'), 'script', 20000),
               'set': choice(p.get('set', 'empty'), ['empty', 'table', 'bed'], 'set'), 'actors': actors}
    speed = num(o.get('speed', 1), 'speed', .5, 4)
    choice(speed, [.5, 1, 1.5, 2, 3, 4], 'speed')
    if type(o.get('dialogue')) is not bool:
        fail('dialogue must be true or false')
    options = {'speed': speed, 'dialogue': o['dialogue'], 'exportArea': choice(o.get('exportArea', 'video'), ['video', 'sheet'], 'export')}
    if not isinstance(c['shots'], list) or not 1 <= len(c['shots']) <= 30:
        fail('Use 1–30 shots per project')
    shots = []
    for i, s in enumerate(c['shots']):
        out = {'id': f'{i+1:02}', 'name': text(s.get('name'), 'shot.name', 60, f'镜头 {i+1}'),
               'action': text(s.get('action'), 'action', 5000), 'dialogue': text(s.get('dialogue'), 'shot.dialogue', 4000)}
        for key in ['from', 'to', 'look']:
            out[key] = vec(s[key], key)
        for key, low, high in [('duration', 1, 60), ('fov', 22, 60), ('move', 0, 2), ('height', -.35, .55)]:
            out[key] = num(s[key], key, low, high)
        start = [v + (out['height'] if j == 1 else 0) for j, v in enumerate(out['from'])]
        end = [start[j] + (out['to'][j] - out['from'][j]) * out['move'] for j in range(3)]
        delta = [end[j] - start[j] for j in range(3)]
        length2 = sum(v*v for v in delta)
        q = max(0, min(1, sum((out['look'][j]-start[j])*delta[j] for j in range(3)) / length2)) if length2 else 0
        near = [start[j] + q*delta[j] for j in range(3)]
        if min(start[1], end[1]) < .15 or math.dist(near, out['look']) < .25:
            fail(f'Shot {i+1}: camera crosses the ground or its look point; adjust the path')
        shots.append(out)
    if sum(s['duration'] for s in shots) > 600:
        fail('Split projects longer than 10 minutes')
    return {'version': 2, 'scene': 'camera-previs', 'aspect': '16:9', 'project': project, 'options': options, 'shots': shots}


class ConfigParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.active = False
        self.parts = []
        self.count = 0

    def handle_starttag(self, tag, attrs):
        if tag == 'script' and dict(attrs).get('id') == 'config':
            self.active = True
            self.count += 1

    def handle_endtag(self, tag):
        if tag == 'script':
            self.active = False

    def handle_data(self, data):
        if self.active:
            self.parts.append(data)


def read_input(path):
    if path.stat().st_size > 12_000_000:
        fail('Input is larger than 12 MB; export project JSON instead')
    raw = path.read_text(encoding='utf-8-sig')
    if path.suffix.lower() in ('.html', '.htm'):
        parser = ConfigParser()
        parser.feed(raw)
        if parser.count != 1:
            fail('Saved page must contain exactly one config JSON script')
        raw = ''.join(parser.parts)
    data = json.loads(raw)
    return data, validate(data if isinstance(data, dict) and data.get('version') == 2 else expand(data))


def build_html(project):
    template = (ENGINE / 'template.html').read_text(encoding='utf-8')
    values = {'CONFIG': json.dumps(project, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c'),
              'THREE': 'window.THREE=(function(exports){' + (ENGINE / 'vendor/three.cjs').read_text(encoding='utf-8') + ';return exports;})({});',
              'LICENSE': html.escape((ENGINE / 'vendor/THREE-LICENSE.txt').read_text(encoding='utf-8'))}
    for key, name in [('MODEL', 'project-model.js'), ('STAGE', 'stage.js'), ('PROMPTS', 'prompts.js'), ('VIDEO', 'video-export.js'), ('APP', 'app.js')]:
        values[key] = (ENGINE / name).read_text(encoding='utf-8')
    # Substitute template markers once: user text is never treated as a marker.
    import re
    return re.sub(r'<!--(CONFIG|THREE|LICENSE|MODEL|STAGE|PROMPTS|VIDEO|APP)-->', lambda m: values[m[1]], template)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--out', type=Path, help='New output directory; existing directories are refused')
    mode.add_argument('--extract-json', type=Path, help='Extract validated project JSON to a new file')
    mode.add_argument('--check', action='store_true', help='Validate input without writing files')
    args = parser.parse_args()
    original, project = read_input(args.input)
    summary = {'shots': len(project['shots']), 'actors': len(project['project']['actors']),
               'output_seconds': round(sum(s['duration'] for s in project['shots']) / project['options']['speed'], 4)}
    if args.out:
        page = build_html(project)
        args.out.mkdir(parents=True, exist_ok=False)
        for name, value in [('project.json', json.dumps(project, ensure_ascii=False, indent=2)),
                            ('plan.json', json.dumps(original, ensure_ascii=False, indent=2)), ('preview.html', page)]:
            with (args.out / name).open('x', encoding='utf-8') as f:
                f.write(value + '\n')
        summary['preview'] = str((args.out / 'preview.html').resolve())
    elif args.extract_json:
        with args.extract_json.open('x', encoding='utf-8') as f:
            json.dump(project, f, ensure_ascii=False, indent=2)
            f.write('\n')
        summary['project'] = str(args.extract_json.resolve())
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, TypeError, OSError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        sys.exit(1)
