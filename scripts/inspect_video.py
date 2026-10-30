#!/usr/bin/env python3
"""Extract timestamped reference frames and metadata for an AI to inspect locally."""
import argparse
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('video',type=Path);p.add_argument('--out',type=Path,required=True)
    p.add_argument('--interval',type=float);p.add_argument('--max-frames',type=int,default=80)
    p.add_argument('--width',type=int,default=640)
    a=p.parse_args()
    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):p.error('FFmpeg and FFprobe are required')
    if not a.video.is_file():p.error('Video does not exist')
    if not 1<=a.max_frames<=500 or not 160<=a.width<=1920:p.error('Invalid frame count or width')
    if a.interval is not None and (not math.isfinite(a.interval) or a.interval<=0):p.error('Interval must be positive')
    raw=subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(a.video.resolve())])
    meta=json.loads(raw);video=next((s for s in meta['streams'] if s['codec_type']=='video'),None)
    if video is None:p.error('No video stream')
    duration=float(video.get('duration') or meta['format']['duration'])
    interval=a.interval or max(.5,duration/a.max_frames)
    count=min(a.max_frames,max(1,math.ceil(duration/interval)))
    a.out.mkdir(parents=True,exist_ok=False)
    frames=[]
    for i in range(count):
        t=min(i*interval,max(0,duration-.05));name=f'{i:03d}_{t:08.3f}s.jpg'
        subprocess.run(['ffmpeg','-nostdin','-v','error','-n','-ss',str(t),'-i',str(a.video.resolve()),'-frames:v','1','-vf',f'scale={a.width}:-2','-q:v','3',str(a.out/name)],check=True)
        frames.append({'t':round(t,6),'file':name})
    meta['reference_frames']=frames
    (a.out/'metadata.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),'utf-8')
    print(json.dumps({'duration':duration,'size':[video['width'],video['height']],'fps':video['r_frame_rate'],'frames':len(frames),'output':str(a.out)},ensure_ascii=False))

if __name__=='__main__':
    try:main()
    except (OSError,ValueError,subprocess.CalledProcessError) as e:sys.exit('ERROR: '+str(e))
