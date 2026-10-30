/* Run: node tests/model.test.cjs. Pure data and interpolation checks. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),ctx={};vm.createContext(ctx);
for(const f of ['assets/timeline.js','assets/sequence/model.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const m=ctx.SequenceModel;const c=m.validate(JSON.parse(fs.readFileSync(path.join(root,'examples/vehicle-v4.json'))));
assert.equal(c.duration,10);assert.equal(m.locate(c,10).local,10);
for(let i=0;i<=250;i++){const s=m.locate(c,i/25),o=m.objects(c,s.shot,s.local);assert(o.every(o=>[...o.p,...o.r,...o.s].every(Number.isFinite)));}
const keys=[{t:0,p:[0,0,0],look:[0,0,-1],roll:180},{t:1,p:[0,0,0],look:[0,0,-1],roll:0},{t:3,p:[0,0,0],look:[0,0,-1],roll:0}];
for(let t=1;t<=3;t+=.02)assert.equal(m.lens(keys,t)[1],0,'Roll must not overshoot a hold');
assert.deepEqual(Array.from(m.sample([{t:0,p:[1,2,3]}],7)),[1,2,3]);
const before=m.prompts(c);c.shots[0].camera.keys[0].p[0]=-9;assert.notEqual(m.prompts(c),before);assert(m.prompts(c).includes('-9'));
const bad=JSON.parse(JSON.stringify(c));bad.shots[0].camera.follow='missing';assert.throws(()=>m.validate(bad));
const two=m.validate(JSON.parse(fs.readFileSync(path.join(root,'examples/dialogue-v4.json'))));assert.equal(m.locate(two,4).i,1);assert.equal(m.locate(two,3.999).i,0);
console.log('model: interpolation, boundaries, validation, and prompt updates passed');
