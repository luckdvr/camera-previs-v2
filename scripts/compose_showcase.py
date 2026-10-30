#!/usr/bin/env python3
"""Render the approved English PiP showcase. Requires FFmpeg; no source overwrite."""
import argparse,json,subprocess
from pathlib import Path
from runtime_env import require_tool
ROOT=Path(__file__).resolve().parents[1]
def probe(path):
    return json.loads(subprocess.check_output([require_tool('ffprobe'),'-v','error','-show_streams','-show_format','-of','json',str(path)]))
def main():
    p=argparse.ArgumentParser(description=__doc__)
    for key in ['source','render','project','out']:p.add_argument('--'+key,required=True,type=Path)
    a=p.parse_args();cfg=json.loads(a.project.read_text(encoding="utf-8"));media=probe(a.source);packed=probe(a.render)
    src=next(s for s in media['streams'] if s['codec_type']=='video');r=next(s for s in packed['streams'] if s['codec_type']=='video');duration=float(media['format']['duration'])
    if abs(src['width']/src['height']-16/9)>.02:raise ValueError('Expected a 16:9 source')
    if (r['width'],r['height'])!=(1080,1660):raise ValueError('Use previs.startEncode(30, "showcase")')
    if max(abs(duration-cfg['duration']),abs(float(packed['format']['duration'])-duration))>1/30:raise ValueError('Inputs differ in duration by more than one frame')
    a.out.mkdir(parents=True,exist_ok=False)
    graph='[0:v]format=rgb24[bg];[1:v]setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=0.1,fps=30,scale=1024:576:flags=lanczos,setsar=1,format=rgb24[src];[2:v]split=2[a][b];[a]crop=960:540:0:0,scale=224:126:flags=lanczos,setpts=PTS-STARTPTS,format=rgb24[pip];[b]crop=1080:1120:0:540,scale=1024:1062:flags=lanczos,setpts=PTS-STARTPTS,format=rgb24[map];[bg][src]overlay=28:224:shortest=1:format=rgb[x];[x]drawbox=x=811:y=657:w=226:h=128:color=0xcccfc3:t=fill[y];[y][pip]overlay=812:658:shortest=1:format=rgb[z];[z][map]overlay=28:824:shortest=1:format=rgb,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[out]'
    cmd=[require_tool('ffmpeg'),'-v','warning','-nostdin','-n','-loop','1','-framerate','30','-i',str(ROOT/'assets/showcase-background.png'),'-i',str(a.source),'-i',str(a.render),'-filter_complex',graph,'-map','[out]','-map','1:a?','-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p','-r','30','-colorspace','bt709','-color_trc','bt709','-color_primaries','bt709','-color_range','tv','-c:a','copy','-t',str(duration),'-movflags','+faststart',str(a.out/'camera-previs-showcase.mp4')]
    (a.out/'render-command.json').write_text(json.dumps(cmd,ensure_ascii=False,indent=2));subprocess.run(cmd,check=True)
    subprocess.run([require_tool('ffmpeg'),'-v','error','-nostdin','-n','-i',str(a.render),'-vf','crop=960:540:0:0','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(a.out/'previs-only.mp4')],check=True)
    (a.out/'media-info.json').write_text(json.dumps({'showcase':probe(a.out/'camera-previs-showcase.mp4'),'previs':probe(a.out/'previs-only.mp4')},indent=2))
if __name__=='__main__':main()
