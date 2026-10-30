#!/usr/bin/env python3
"""Convert a locally exported WebM to MP4 without overwriting existing files."""
import argparse
import json
from pathlib import Path
import subprocess
import sys
from runtime_env import require_tool

def convert(source,out):
    source=Path(source).resolve();out=Path(out).resolve()
    if not source.is_file():raise ValueError('Source video does not exist')
    if out.exists():raise FileExistsError('Output already exists: '+str(out))
    if out.suffix.lower()!='.mp4':raise ValueError('Output must have an .mp4 extension')
    ffmpeg=require_tool('ffmpeg');ffprobe=require_tool('ffprobe')
    out.parent.mkdir(parents=True,exist_ok=True)
    # No input frame-rate override: retain the recording timestamps.
    command=[ffmpeg,'-nostdin','-v','error','-n','-i',str(source),'-map','0:v:0','-map','0:a?',
        '-c:v','libx264','-crf','18','-preset','medium','-pix_fmt','yuv420p',
        '-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:a','aac','-movflags','+faststart',str(out)]
    subprocess.run(command,check=True)
    metadata=json.loads(subprocess.check_output([ffprobe,'-v','error','-show_streams','-show_format','-of','json',str(out)]))
    return {'output':str(out),'metadata':metadata}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('source',type=Path);p.add_argument('--out',type=Path,required=True)
    a=p.parse_args();print(json.dumps(convert(a.source,a.out),ensure_ascii=False,indent=2))

if __name__=='__main__':
    try:main()
    except (OSError,ValueError,RuntimeError,subprocess.CalledProcessError) as e:sys.exit('ERROR: '+str(e))
