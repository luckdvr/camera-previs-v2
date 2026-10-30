"""Dependency tests simulate missing tools; they never install/uninstall software."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import runtime_env as runtime
import setup_env as setup
from convert_video import convert

def report(missing=(),issues=()):
    tools={n:{'path':'/checked/'+n,'version':'test'} for n in ['python','ffmpeg','ffprobe','browser'] if n not in missing}
    return {'ready':not missing,'tools':tools,'missing':list(missing),'issues':list(issues),'mp4_mode':'webcodecs' if not missing else 'unavailable'}

class Dependencies(unittest.TestCase):
    def setUp(self):self.tmp=Path(tempfile.mkdtemp(prefix='previs-dependency-tests-'))

    def test_existing_tools_never_trigger_install(self):
        with patch.object(setup,'check',return_value=report()),patch.object(setup,'run_install') as install:
            for _ in range(2):
                result=setup.setup(install=True,directory=self.tmp)
                self.assertTrue(result['ready']);self.assertEqual(result['actions'],[])
            install.assert_not_called()

    def test_missing_tools_install_then_recheck(self):
        with patch.object(setup,'check',side_effect=[report(['ffmpeg','ffprobe']),report()]) as check,patch.object(setup.platform,'system',return_value='Windows'),patch.object(setup,'manager_path',return_value='winget'),patch.object(setup,'run_install',return_value={'returncode':0}) as install:
            result=setup.setup(install=True,directory=self.tmp)
        self.assertTrue(result['ready']);self.assertEqual(check.call_count,2)
        command=install.call_args.args[0]
        self.assertIn('Gyan.FFmpeg',command);self.assertIn('--no-upgrade',command)
        self.assertNotIn('Python.Python.3.12',command)

    def test_check_only_does_not_install(self):
        with patch.object(setup,'check',return_value=report(['ffmpeg'])),patch.object(setup.platform,'system',return_value='Darwin'),patch.object(setup,'manager_path',return_value='/brew'),patch.object(setup,'run_install') as install:
            result=setup.setup(directory=self.tmp)
        self.assertFalse(result['ready']);self.assertEqual(result['planned_commands'],[['/brew','install','ffmpeg']]);install.assert_not_called()

    def test_failed_install_is_not_ready_and_stops(self):
        with patch.object(setup,'check',return_value=report(['ffmpeg','browser'])),patch.object(setup.platform,'system',return_value='Windows'),patch.object(setup,'manager_path',return_value='winget'),patch.object(setup,'run_install',return_value={'returncode':1,'log':'failure.log'}) as install:
            result=setup.setup(install=True,directory=self.tmp)
        self.assertFalse(result['ready']);self.assertEqual(install.call_count,1)
        self.assertTrue(any(i['dependency']=='installation' for i in result['issues']))

    def test_failed_browser_is_not_silently_reinstalled(self):
        broken=report(['browser'],[{'dependency':'browser','reason':'WebGL failed'}])
        with patch.object(setup,'check',return_value=broken),patch.object(setup,'run_install') as install:
            result=setup.setup(install=True,directory=self.tmp)
        self.assertFalse(result['ready']);install.assert_not_called()

    def test_missing_manager_is_actionable(self):
        with patch.object(setup,'check',return_value=report(['ffmpeg'])),patch.object(setup,'manager_path',return_value=None):
            result=setup.setup(install=True,directory=self.tmp)
        self.assertFalse(result['ready']);self.assertIn('package_manager',[i['dependency'] for i in result['issues']])

    def test_platform_plans_only_include_missing_packages(self):
        self.assertEqual(setup.install_plan('Darwin','brew',['browser']),[['brew','install','--cask','google-chrome']])
        windows=setup.install_plan('Windows','winget',['browser'])
        self.assertIn('Google.Chrome.EXE',windows[0]);self.assertIn('user',windows[0])
        for distro,name in [('debian','chromium'),('ubuntu','chromium-browser')]:
            plan=setup.install_plan('Linux','apt-get',['browser'],distro,sudo='/usr/bin/sudo')
            self.assertEqual(plan[0],['/usr/bin/sudo','-n','apt-get','update']);self.assertIn(name,plan[1])
            self.assertNotIn('python3',plan[1]);self.assertNotIn('ffmpeg',plan[1])
        self.assertEqual(setup.install_plan('Linux','apt-get',['ffmpeg'],is_root=True)[0],['apt-get','update'])

    def test_cached_binary_is_used_without_path(self):
        executable=self.tmp/'ffmpeg';executable.write_text('placeholder',encoding='utf-8')
        (self.tmp/'runtime.json').write_text(json.dumps({'tools':{'ffmpeg':{'path':str(executable)}}}),encoding='utf-8')
        with patch.dict(os.environ,{'PATH':'','CAMERA_PREVIS_FFMPEG':''}),patch.object(runtime,'version',side_effect=lambda p,n:'ffmpeg version test' if p==str(executable) else None):
            self.assertEqual(runtime.find_tool('ffmpeg',self.tmp)['path'],str(executable))

    def test_stale_cached_binary_does_not_hide_working_candidate(self):
        with patch.object(runtime,'candidates',return_value=['/stale','/working']),patch.object(runtime,'version',side_effect=[None,'ffmpeg version test']):
            self.assertEqual(runtime.find_tool('ffmpeg')['path'],'/working')

    def test_python_version_is_actually_checked(self):
        with patch.object(runtime.subprocess,'run',return_value=subprocess.CompletedProcess([],1,'3.7.9','')):
            self.assertIsNone(runtime.version('/old/python','python'))

    def test_windows_browser_version_does_not_launch_gui(self):
        with patch.object(runtime.platform,'system',return_value='Windows'),patch.object(runtime.shutil,'which',return_value='powershell.exe'),patch.object(runtime.subprocess,'run',return_value=subprocess.CompletedProcess([],0,'156.0.8078.74','')) as run:
            self.assertEqual(runtime.version('C:/Program Files/Chrome/chrome.exe','browser'),'156.0.8078.74')
        self.assertEqual(run.call_args.args[0][0],'powershell.exe')
        self.assertEqual(run.call_args.kwargs['env']['CAMERA_PREVIS_CHECK_FILE'],'C:/Program Files/Chrome/chrome.exe')

    def test_build_check_keeps_video_paths(self):
        (self.tmp/'runtime.json').write_text(json.dumps(report()),encoding='utf-8')
        build={'ready':True,'tools':{'python':{'path':'/new/python','version':'3.12'}},'missing':[],'issues':[],'mp4_mode':'not_requested'}
        with patch.object(setup,'check',return_value=build):setup.setup('build',directory=self.tmp)
        saved=runtime.read_state(self.tmp);self.assertIn('ffmpeg',saved['tools']);self.assertEqual(saved['tools']['python']['path'],'/new/python')

    def test_webm_fallback_requires_h264_encoder(self):
        with patch.object(setup,'find_tool',side_effect=lambda n,d:{'path':'/'+n,'version':'ok'}),patch.object(setup,'candidates',return_value=['/browser']),patch.object(setup,'version',return_value='browser'),patch.object(setup,'browser_probe',return_value={'webgl':True,'avc':False,'webm':True}),patch.object(setup,'ffmpeg_encoder',return_value=True):
            result=setup.check('video',self.tmp)
            self.assertTrue(result['ready']);self.assertEqual(result['mp4_mode'],'webm_ffmpeg')
            with patch.object(setup,'ffmpeg_encoder',return_value=False):self.assertFalse(setup.check('video',self.tmp)['ready'])

    def test_conversion_refuses_overwriting(self):
        source=self.tmp/'input.webm';out=self.tmp/'keep.mp4';source.write_bytes(b'source');out.write_bytes(b'original')
        with patch('convert_video.require_tool') as tool:
            with self.assertRaises(FileExistsError):convert(source,out)
            tool.assert_not_called()
        self.assertEqual(out.read_bytes(),b'original');self.assertEqual(source.read_bytes(),b'source')

if __name__=='__main__':unittest.main()
