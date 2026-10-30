"""Find checked executables without changing the user's PATH or shell profile."""
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys

def state_dir():
    override=os.environ.get('CAMERA_PREVIS_STATE_DIR')
    if override:return Path(override).expanduser()
    if platform.system()=='Windows':return Path(os.environ.get('LOCALAPPDATA',Path.home()/'AppData/Local'))/'camera-previs'
    if platform.system()=='Darwin':return Path.home()/'Library/Caches/camera-previs'
    return Path(os.environ.get('XDG_CACHE_HOME',Path.home()/'.cache'))/'camera-previs'

def read_state(directory=None):
    try:return json.loads(((directory or state_dir())/'runtime.json').read_text(encoding='utf-8'))
    except (OSError,ValueError):return {}

def candidates(name,directory=None,system=None):
    system=system or platform.system();home=Path.home();seen=set()
    cached=read_state(directory).get('tools',{}).get(name,{})
    paths=[os.environ.get('CAMERA_PREVIS_'+name.upper()),cached.get('path')]
    if name=='python':paths += [sys.executable]
    aliases={'python':['python3','python'], 'browser':['google-chrome','google-chrome-stable','chromium','chromium-browser','msedge']}.get(name,[name])
    paths += [shutil.which(a) for a in aliases]
    if system=='Darwin':
        if name=='browser':
            for base in [Path('/Applications'),home/'Applications']:
                paths += [str(base/'Google Chrome.app/Contents/MacOS/Google Chrome'),str(base/'Microsoft Edge.app/Contents/MacOS/Microsoft Edge'),str(base/'Chromium.app/Contents/MacOS/Chromium')]
        else:
            binary='python3' if name=='python' else name
            paths += [str(Path(base)/binary) for base in ['/opt/homebrew/bin','/usr/local/bin','/usr/bin']]
    elif system=='Windows':
        local=Path(os.environ.get('LOCALAPPDATA',home/'AppData/Local'))
        if name=='browser':
            for base in [local,Path(os.environ.get('PROGRAMFILES','C:/Program Files')),Path(os.environ.get('PROGRAMFILES(X86)','C:/Program Files (x86)'))]:
                paths += [str(base/'Google/Chrome/Application/chrome.exe'),str(base/'Microsoft/Edge/Application/msedge.exe')]
        elif name=='python':
            for base in [local/'Programs/Python',Path(os.environ.get('PROGRAMFILES','C:/Program Files'))]:
                paths += [str(p) for p in base.glob('Python*/python.exe')]
        else:
            paths += [str(local/'Microsoft/WinGet/Links'/(name+'.exe'))]
            # WinGet portable packages may not be in the current process PATH yet.
            for base in [local/'Microsoft/WinGet/Packages',Path(os.environ.get('PROGRAMFILES','C:/Program Files'))/'WinGet/Packages']:
                paths += [str(p) for p in base.glob('Gyan.FFmpeg*/**/'+name+'.exe')]
    else:
        binary='python3' if name=='python' else name
        paths += [str(Path(base)/binary) for base in ['/usr/bin','/usr/local/bin','/snap/bin']]
    for p in paths:
        if p and str(p) not in seen and Path(p).is_file():seen.add(str(p));yield str(p)

def version(path,name):
    args=['-c','import sys; print(sys.version.split()[0]); sys.exit(0 if sys.version_info >= (3,8) else 1)'] if name=='python' else (['-version'] if name in ['ffmpeg','ffprobe'] else ['--version'])
    command=[path]+args;env=None
    if name=='browser' and platform.system()=='Windows':
        # Windows GUI browsers do not reliably print --version to stdout.
        powershell=shutil.which('powershell') or str(Path(os.environ.get('SystemRoot','C:/Windows'))/'System32/WindowsPowerShell/v1.0/powershell.exe')
        command=[powershell,'-NoProfile','-NonInteractive','-Command','(Get-Item -LiteralPath $env:CAMERA_PREVIS_CHECK_FILE).VersionInfo.ProductVersion']
        env=dict(os.environ,CAMERA_PREVIS_CHECK_FILE=path)
    try:
        r=subprocess.run(command,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=15,env=env)
        lines=(r.stdout or r.stderr).strip().splitlines()
        if r.returncode!=0 or not lines:return None
        value=lines[0][:240]
        if name in ['ffmpeg','ffprobe'] and not value.lower().startswith(name+' version'):return None
        return value
    except (OSError,subprocess.SubprocessError):return None

def find_tool(name,directory=None):
    for path in candidates(name,directory):
        v=version(path,name)
        if v:return {'path':path,'version':v}
    return None

def require_tool(name):
    found=find_tool(name)
    if not found:raise RuntimeError('Missing '+name+'. Run scripts/setup.sh --install (Windows: scripts/setup.ps1 -Install).')
    return found['path']
