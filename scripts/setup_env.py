#!/usr/bin/env python3
"""Check dependencies, install only missing packages, and save verified tool paths."""
import argparse
from datetime import datetime,timezone
import hashlib
from http.server import BaseHTTPRequestHandler,HTTPServer
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys
import time
import uuid
from runtime_env import candidates,find_tool,read_state,state_dir,version

ROOT=Path(__file__).resolve().parents[1]

def distro_id():
    try:
        raw=Path('/etc/os-release').read_text(encoding='utf-8')
        match=re.search(r'^ID=(.*)$',raw,re.M)
        return match.group(1).strip('"') if match else ''
    except OSError:return ''

def manager_path(system):
    names=['brew'] if system=='Darwin' else ['winget'] if system=='Windows' else ['apt-get']
    for name in names:
        p=shutil.which(name)
        if p:return p
    if system=='Darwin':
        for p in ['/opt/homebrew/bin/brew','/usr/local/bin/brew']:
            if Path(p).is_file():return p
    return None

def install_plan(system,manager,missing,distro='',is_root=False,sudo=None):
    """Pure planning: never upgrade or uninstall tools that already work."""
    if not missing:return []
    if not manager:return []
    needs_ffmpeg=any(k in missing for k in ['ffmpeg','ffprobe'])
    plan=[]
    if system=='Darwin':
        packages=(['python'] if 'python' in missing else [])+(['ffmpeg'] if needs_ffmpeg else [])
        if packages:plan.append([manager,'install']+packages)
        if 'browser' in missing:plan.append([manager,'install','--cask','google-chrome'])
    elif system=='Windows':
        ids=(['Python.Python.3.12'] if 'python' in missing else [])+(['Gyan.FFmpeg'] if needs_ffmpeg else [])+(['Google.Chrome'] if 'browser' in missing else [])
        for package in ids:
            if package=='Google.Chrome':package='Google.Chrome.EXE'
            plan.append([manager,'install','--id',package,'--exact','--source','winget','--scope','user','--silent','--accept-package-agreements','--accept-source-agreements','--disable-interactivity','--no-upgrade'])
    elif system=='Linux':
        packages=(['python3'] if 'python' in missing else [])+(['ffmpeg'] if needs_ffmpeg else [])
        if 'browser' in missing:packages.append('chromium-browser' if distro=='ubuntu' else 'chromium')
        if packages:
            prefix=[] if is_root else [sudo or 'sudo','-n']
            plan=[prefix+[manager,'update'],prefix+[manager,'install','-y','--no-install-recommends']+packages]
    return plan

def run_install(command,directory):
    log=directory/('install-'+uuid.uuid4().hex[:10]+'.log')
    print('Installing missing dependency: '+json.dumps(command,ensure_ascii=False),file=sys.stderr,flush=True)
    env=os.environ.copy();env['HOMEBREW_NO_AUTO_UPDATE']='1';env['HOMEBREW_NO_INSTALL_CLEANUP']='1';env['DEBIAN_FRONTEND']='noninteractive'
    try:
        with log.open('w',encoding='utf-8') as out:
            r=subprocess.run(command,stdout=out,stderr=subprocess.STDOUT,stdin=subprocess.DEVNULL,env=env,timeout=900)
        tail=log.read_text(encoding='utf-8',errors='replace')[-2500:]
        return {'command':command,'returncode':r.returncode,'log':str(log),'detail':tail if r.returncode else ''}
    except (OSError,subprocess.SubprocessError) as e:return {'command':command,'returncode':-1,'log':str(log),'detail':str(e)}

def ffmpeg_encoder(tool):
    if not tool:return False
    try:
        r=subprocess.run([tool['path'],'-hide_banner','-encoders'],capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=20)
        return r.returncode==0 and bool(re.search(r'\blibx264\b',r.stdout))
    except (OSError,subprocess.SubprocessError):return False

def browser_probe(tool,directory,force=False):
    probe=ROOT/'assets/sequence/capability-probe.html'
    digest=hashlib.sha256((tool['path']+'\n'+tool['version']).encode()+probe.read_bytes()).hexdigest()
    cache=directory/'browser-probes'/digest
    result_file=cache/'result.json'
    if not force and result_file.is_file():
        try:
            saved=json.loads(result_file.read_text(encoding='utf-8'))
            if saved.get('webgl') and time.time()-result_file.stat().st_mtime<7*86400:return dict(saved,cached=True)
        except (OSError,ValueError):pass
    cache.mkdir(parents=True,exist_ok=True)
    # Wait for actual encoder completion; a DOM snapshot can finish before flush().
    received=[];token=uuid.uuid4().hex;route='/'+token
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args):pass
        def do_GET(self):
            if self.path.split('?')[0]!=route:self.send_error(404);return
            body=probe.read_bytes();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
        def do_POST(self):
            if self.path!=route+'/result':self.send_error(404);return
            try:
                size=int(self.headers.get('Content-Length','0'))
                if not 0<size<=8192:raise ValueError('Invalid probe size')
                data=json.loads(self.rfile.read(size))
                if not isinstance(data,dict) or data.get('complete') is not True:raise ValueError('Incomplete probe')
            except (ValueError,OSError):self.send_error(400);return
            received.append(data);self.send_response(204);self.end_headers()
    # Loopback only, unique endpoint and isolated profile; no logged-in user data.
    profile=cache/('profile-'+uuid.uuid4().hex[:8])
    server=None;process=None;log=cache/'last-stderr.log'
    try:
        server=HTTPServer(('127.0.0.1',0),Handler);server.timeout=.25
        url='http://127.0.0.1:'+str(server.server_port)+route+'?report='+route+'/result'
        command=[tool['path'],'--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--user-data-dir='+str(profile),url]
        with log.open('w',encoding='utf-8') as error_log:
            process=subprocess.Popen(command,stdout=subprocess.DEVNULL,stderr=error_log,stdin=subprocess.DEVNULL)
            deadline=time.monotonic()+30
            while not received and process.poll() is None and time.monotonic()<deadline:server.handle_request()
        if not received:return {'webgl':False,'avc':False,'webm':False,'error':'Browser capability probe did not finish','returncode':process.poll(),'log':str(log)}
        result=received[0]
        result.update(cached=False,browser_version=tool['version'])
        result_file.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
        return result
    except (OSError,ValueError,subprocess.SubprocessError) as e:return {'webgl':False,'avc':False,'webm':False,'error':str(e),'log':str(log)}
    finally:
        if process and process.poll() is None:
            process.terminate()
            try:process.wait(timeout=5)
            except subprocess.TimeoutExpired:process.kill();process.wait(timeout=5)
        if server:server.server_close()

def check(profile,directory,force=False):
    tools={};issues=[]
    python=find_tool('python',directory)
    if python:tools['python']=python
    if profile!='build':
        for name in ['ffmpeg','ffprobe']:
            tool=find_tool(name,directory)
            if tool:tools[name]=tool
        tested=[]
        for path in candidates('browser',directory):
            ver=version(path,'browser')
            if not ver:continue
            tool={'path':path,'version':ver};probe=browser_probe(tool,directory,force);tool['capabilities']=probe;tested.append(tool)
            if probe.get('webgl') and probe.get('avc'):break
        browser=next((b for b in tested if b['capabilities'].get('webgl') and b['capabilities'].get('avc')),None) or next((b for b in tested if b['capabilities'].get('webgl')),None)
        if browser:tools['browser']=browser
        elif tested:issues.append({'dependency':'browser','reason':'Browser found but local rendering probe failed','attempts':tested})
    required=['python']+(['ffmpeg','ffprobe','browser'] if profile!='build' else [])
    missing=[name for name in required if name not in tools]
    mode='not_requested'
    if profile!='build':
        caps=tools.get('browser',{}).get('capabilities',{})
        mode='webcodecs' if caps.get('avc') else 'webm_ffmpeg' if caps.get('webm') and ffmpeg_encoder(tools.get('ffmpeg')) else 'unavailable'
        if not missing and mode=='unavailable':issues.append({'dependency':'mp4','reason':'Neither AVC export nor WebM + libx264 conversion is available'})
    return {'ready':not missing and mode!='unavailable','tools':tools,'missing':missing,'mp4_mode':mode,'issues':issues}

def setup(profile='video',install=False,directory=None,force=False):
    directory=directory or state_dir();directory.mkdir(parents=True,exist_ok=True)
    system=platform.system();report=check(profile,directory,force);actions=[]
    # A browser that exists but fails its probe is not silently reinstalled.
    missing=[x for x in report['missing'] if not (x=='browser' and any(i['dependency']=='browser' for i in report['issues']))]
    manager=manager_path(system)
    plan=install_plan(system,manager,missing,distro_id(),getattr(os,'geteuid',lambda:1)()==0,shutil.which('sudo'))
    if install and plan:
        for command in plan:
            action=run_install(command,directory);actions.append(action)
            if action['returncode']!=0:break
        report=check(profile,directory,force)
    if report['missing'] and not manager:report['issues'].append({'dependency':'package_manager','reason':'No supported package manager found; Codex must bootstrap an official manager or use an available runtime, then retry.'})
    if actions and actions[-1]['returncode']!=0:report['issues'].append({'dependency':'installation','reason':'Installer failed or requires OS/network permission; inspect the reported command and log, then retry after resolving the cause.'})
    report.update(profile=profile,platform=system,actions=actions,planned_commands=plan if not install else [],checked_at=datetime.now(timezone.utc).isoformat(),state_file=str(directory/'runtime.json'))
    # A build-only check must not forget verified video paths from an earlier run.
    previous=read_state(directory);persist=dict(report);persist['tools']={**previous.get('tools',{}),**report['tools']}
    temp=directory/('runtime-'+uuid.uuid4().hex[:8]+'.json');temp.write_text(json.dumps(persist,ensure_ascii=False,indent=2),encoding='utf-8');os.replace(temp,directory/'runtime.json')
    return report

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--install',action='store_true');p.add_argument('--profile',choices=['build','video'],default='video');p.add_argument('--state-dir',type=Path);p.add_argument('--recheck-browser',action='store_true')
    a=p.parse_args();r=setup(a.profile,a.install,a.state_dir,a.recheck_browser);print(json.dumps(r,ensure_ascii=False,indent=2));return 0 if r['ready'] else 2

if __name__=='__main__':
    try:sys.exit(main())
    except (OSError,ValueError) as e:print(json.dumps({'ready':False,'error':str(e)},ensure_ascii=False));sys.exit(2)
