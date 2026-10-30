"""Validation for the reusable v4 scene/sequence format; Python standard library."""
import copy
import math
import re

TYPES = {'person', 'car', 'chair', 'table', 'box', 'sphere', 'cylinder', 'cone', 'torus', 'plane', 'group'}
ENVIRONMENTS = {'empty', 'ground', 'room', 'studio', 'road', 'city', 'valley', 'gallery', 'bridge'}
ACTIONS = {'idle', 'walk', 'run', 'punch', 'kick', 'duck', 'wave', 'sit'}

def num(x, name, lo=-10000, hi=10000):
    if isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) or not lo <= x <= hi:
        raise ValueError(name + ': invalid number')

def vec(x, name, lo=-10000, hi=10000):
    if not isinstance(x, list) or len(x) != 3: raise ValueError(name + ': expected xyz')
    for v in x: num(v, name, lo, hi)

def text(x, name, limit=1000):
    if not isinstance(x, str) or len(x) > limit: raise ValueError(name + ': invalid text')

def ident(x):
    if not isinstance(x, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,64}', x): raise ValueError('Invalid identifier')

def transform(o):
    for k in ['p', 'r']:
        if k in o: vec(o[k], k)
    if 's' in o: vec(o['s'], 'scale', .001, 1000)

def descriptor(d, depth=0, count=None):
    if count is None: count=[0]
    count[0]+=1
    if depth > 4 or count[0] > 256 or not isinstance(d, dict) or d.get('type') not in TYPES:
        raise ValueError('Unsupported proxy type or too many parts')
    transform(d)
    if 'color' in d and not re.fullmatch(r'#[0-9a-fA-F]{6}', str(d['color'])): raise ValueError('Use #rrggbb colors')
    if 'opacity' in d: num(d['opacity'], 'opacity', .05, 1)
    if 'pose' in d and d['pose'] not in ACTIONS: raise ValueError('Unsupported pose')
    if 'cutaway' in d and not isinstance(d['cutaway'], bool): raise ValueError('cutaway must be boolean')
    if 'occupants' in d and d['occupants'] not in (0,1,2): raise ValueError('occupants must be 0, 1 or 2')
    parts=d.get('parts', [])
    if not isinstance(parts, list): raise ValueError('parts must be an array')
    for part in parts: descriptor(part, depth+1, count)

def track(keys, dur, camera=False):
    if not isinstance(keys, list) or not 1 <= len(keys) <= 100: raise ValueError('Use 1–100 keys')
    if any(not isinstance(k,dict) for k in keys): raise ValueError('Each key must be an object')
    if keys[0].get('t') != 0 or (len(keys)>1 and abs(keys[-1].get('t', -1)-dur)>1e-6): raise ValueError('Track must span its shot')
    for i,k in enumerate(keys):
        num(k.get('t'), 'key.t', 0, dur)
        if i and k['t']<=keys[i-1]['t']: raise ValueError('Key times must increase')
        vec(k.get('p'), 'key.p')
        if camera:
            vec(k.get('look'), 'key.look');num(k.get('fov',42),'fov',10,100);num(k.get('roll',0),'roll',-7200,7200)
        else:
            if 'r' in k: vec(k['r'], 'key.r')
            if 's' in k: vec(k['s'], 'key.s', .001, 1000)

def validate(value):
    c=copy.deepcopy(value)
    if not isinstance(c,dict) or c.get('version')!=4: raise ValueError('Expected version 4')
    c.setdefault('title','Camera previs');text(c['title'],'title',120)
    c.setdefault('fps',25);num(c['fps'],'fps',12,60)
    if int(c['fps'])!=c['fps']: raise ValueError('fps must be an integer')
    c.setdefault('size',[960,540])
    if not isinstance(c['size'],list) or len(c['size'])!=2: raise ValueError('size must be [width,height]')
    for v in c['size']:
        num(v,'size',160,1920)
        if int(v)!=v or v%2: raise ValueError('Dimensions must be even integers')
    for name in ['models','scenes']:
        if not isinstance(c.get(name),dict) or not 1<=len(c[name])<=100: raise ValueError(name+': expected 1–100 entries')
    for name,d in c['models'].items(): ident(name);descriptor(d)
    for name,scene in c['scenes'].items():
        if not isinstance(scene,dict): raise ValueError('Scene must be an object')
        ident(name);env=scene.get('environment','ground')
        if env not in ENVIRONMENTS: raise ValueError('Unknown environment: '+str(env))
        objects=scene.get('objects',[])
        if not isinstance(objects,list) or len(objects)>100: raise ValueError('Too many scene objects')
        ids=set()
        for o in objects:
            if not isinstance(o,dict): raise ValueError('Scene entry must be an object')
            ident(o.get('id'))
            if o['id'] in ids: raise ValueError('Duplicate object id')
            ids.add(o['id'])
            if o.get('model') not in c['models']: raise ValueError('Unknown model')
            transform(o)
    shots=c.get('shots')
    if not isinstance(shots,list) or not 1<=len(shots)<=120: raise ValueError('Use 1–120 shots')
    total=0
    for shot in shots:
        if not isinstance(shot,dict): raise ValueError('Shot must be an object')
        dur=shot.get('duration');num(dur,'shot.duration',1/c['fps'],600)
        if abs(dur*c['fps']-round(dur*c['fps']))>1e-5: raise ValueError('Shot duration must be a whole number of frames')
        total+=dur
        if shot.get('scene') not in c['scenes']: raise ValueError('Unknown scene')
        ids={o['id'] for o in c['scenes'][shot['scene']].get('objects',[])}
        text(shot.get('name',''),'shot.name',120);text(shot.get('note',''),'shot.note',1000)
        camera=shot.get('camera',{})
        if not isinstance(camera,dict): raise ValueError('Camera must be an object')
        if camera.get('follow') is not None and camera['follow'] not in ids: raise ValueError('Camera follow target not in scene')
        track(camera.get('keys'),dur,True)
        motion=shot.get('motion',{})
        if not isinstance(motion,dict): raise ValueError('motion must be an object')
        for target,keys in motion.items():
            if target not in ids: raise ValueError('Motion target not in scene')
            track(keys,dur)
        actions=shot.get('actions',{})
        if not isinstance(actions,dict): raise ValueError('actions must be an object')
        for target,clips in actions.items():
            if target not in ids or not isinstance(clips,list) or len(clips)>100: raise ValueError('Invalid action target or clips')
            last=0
            for clip in clips:
                num(clip.get('t'),'action.t',0,dur);num(clip.get('duration'),'action.duration',.01,dur)
                if clip['t']<last-1e-6 or clip['t']+clip['duration']>dur+1e-6: raise ValueError('Action clips overlap or exceed shot')
                last=clip['t']+clip['duration']
                if clip.get('name') not in ACTIONS: raise ValueError('Unknown action')
        if shot.get('transition','cut') not in ['cut','continue']: raise ValueError('Unknown transition')
    if total>600: raise ValueError('Sequence exceeds 600 seconds')
    c['duration']=round(total,8)
    return c
