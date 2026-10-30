"""Run: python3 -m unittest discover -s tests -v. Test artifacts are kept in /tmp."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('builder',ROOT/'scripts/build_previs.py')
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)

class Projects(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=Path(tempfile.mkdtemp(prefix='camera-previs-tests-'))
        cls.example=json.loads((ROOT/'examples/vehicle-v4.json').read_text(encoding='utf-8'))

    def check_bad(self,change):
        c=copy.deepcopy(self.example);change(c)
        with self.assertRaises((ValueError,TypeError,KeyError)):b.validate(c)

    def test_examples(self):
        for f in (ROOT/'examples').glob('*-v4.json'):
            with self.subTest(f=f.name):
                c=b.read(f);self.assertEqual(c['duration']*c['fps'],round(c['duration']*c['fps']))
                self.assertIn('SequenceModel',b.build(c))

    def test_whole_frame_durations(self):self.check_bad(lambda c:c['shots'][0].update(duration=1.01))
    def test_unknown_proxy(self):self.check_bad(lambda c:c['models']['sedan'].update(type='custom-video-code'))
    def test_missing_follow(self):self.check_bad(lambda c:c['shots'][0]['camera'].update(follow='missing'))
    def test_missing_motion_target(self):self.check_bad(lambda c:c['shots'][0]['motion'].update(missing=[{'t':0,'p':[0,0,0]}]))
    def test_duplicate_ids(self):self.check_bad(lambda c:c['scenes']['road']['objects'].append(copy.deepcopy(c['scenes']['road']['objects'][0])))
    def test_nonfinite(self):self.check_bad(lambda c:c['shots'][0]['camera']['keys'][0]['p'].__setitem__(0,float('nan')))
    def test_no_zero_start(self):self.check_bad(lambda c:c['shots'][0]['camera']['keys'][0].update(t=1))
    def test_action_overrun(self):self.check_bad(lambda c:c['shots'][0].update(actions={'car':[{'t':9,'duration':2,'name':'walk'}]}))
    def test_action_overlap(self):self.check_bad(lambda c:c['shots'][0].update(actions={'car':[{'t':0,'duration':2,'name':'walk'},{'t':1,'duration':2,'name':'walk'}]}))
    def test_odd_dimensions(self):self.check_bad(lambda c:c.update(size=[961,540]))
    def test_group_depth(self):
        def change(c):
            d={'type':'box'}
            for i in range(7):d={'type':'group','parts':[d]}
            c['models']['sedan']=d
        self.check_bad(change)

    def test_html_roundtrip_escapes_script(self):
        c=copy.deepcopy(self.example);c['title']='</script><script>throw Error("should not execute")</script>'
        c=b.validate(c);page=b.build(c);self.assertNotIn('<script>throw Error',page)
        path=self.tmp/'safe.html';path.write_text(page,encoding='utf-8')
        self.assertEqual(b.read(path),c)

    def test_legacy_examples(self):
        for file,version in [('examples/two-person.json',2),('references/flight-example.json',3)]:
            with self.subTest(file=file):
                c=b.read(ROOT/file);self.assertEqual(c['version'],version);self.assertIn('THREE',b.build(c))

    def test_one_engine_across_inputs(self):
        manifests=[]
        for name in ['vehicle','dialogue','fight']:
            out=self.tmp/name
            subprocess.run([sys.executable,str(ROOT/'scripts/build_previs.py'),str(ROOT/f'examples/{name}-v4.json'),'--out',str(out)],check=True,capture_output=True)
            manifests.append(json.loads((out/'build-info.json').read_text(encoding='utf-8'))['engine_files'])
        self.assertEqual(manifests[0],manifests[1]);self.assertEqual(manifests[1],manifests[2])

    def test_refuses_output_overwrite(self):
        out=self.tmp/'existing';out.mkdir();sentinel=out/'keep.txt';sentinel.write_text('original',encoding='utf-8')
        r=subprocess.run([sys.executable,str(ROOT/'scripts/build_previs.py'),str(ROOT/'examples/vehicle-v4.json'),'--out',str(out)],capture_output=True)
        self.assertNotEqual(r.returncode,0);self.assertEqual(sentinel.read_text(encoding='utf-8'),'original');self.assertEqual(list(out.iterdir()),[sentinel])

if __name__=='__main__':unittest.main()
