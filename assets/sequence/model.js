/* v4 project data: no video-specific modes or executable project code. */
(function(root){'use strict';
const TYPES=['person','car','chair','table','box','sphere','cylinder','cone','torus','plane','group'];
const ENV=['empty','ground','room','studio','road','city','valley','gallery','bridge'];
const ACTIONS=['idle','walk','run','punch','kick','duck','wave','sit'];
const clone=x=>JSON.parse(JSON.stringify(x));
function assert(v,m){if(!v)throw Error(m);}
function num(v,min=-10000,max=10000){assert(typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max,'Invalid numeric parameter');}
function vec(v,min=-10000,max=10000){assert(Array.isArray(v)&&v.length===3,'Expected xyz');v.forEach(n=>num(n,min,max));}
function id(v){assert(typeof v==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(v),'Invalid identifier');}
function text(v,max=1000){assert(typeof v==='string'&&v.length<=max,'Invalid text');}
function transform(o){if(o.p)vec(o.p);if(o.r)vec(o.r);if(o.s)vec(o.s,.001,1000);}
function descriptor(d,depth=0,count={n:0}){assert(d&&TYPES.includes(d.type)&&depth<=4&&++count.n<=256,'Invalid model');transform(d);if(d.color!==undefined)assert(/^#[0-9a-fA-F]{6}$/.test(d.color),'Invalid color');if(d.opacity!==undefined)num(d.opacity,.05,1);if(d.pose!==undefined)assert(ACTIONS.includes(d.pose),'Invalid pose');if(d.cutaway!==undefined)assert(typeof d.cutaway==='boolean','Invalid cutaway');if(d.occupants!==undefined)assert([0,1,2].includes(d.occupants),'Invalid occupants');assert(Array.isArray(d.parts||[]),'Invalid parts');for(const p of d.parts||[])descriptor(p,depth+1,count);}
function track(keys,dur,camera=false){assert(Array.isArray(keys)&&keys.length>=1&&keys.length<=100,'Use 1–100 keys');assert(keys[0].t===0&&(keys.length===1||Math.abs(keys.at(-1).t-dur)<1e-6),'Keys must span the shot');keys.forEach((k,i)=>{num(k.t,0,dur);assert(!i||k.t>keys[i-1].t,'Key times must increase');vec(k.p);if(camera){vec(k.look);num(k.fov??42,10,100);num(k.roll??0,-7200,7200);}else{if(k.r)vec(k.r);if(k.s)vec(k.s,.001,1000);}});}
function validate(value){
 const c=clone(value);assert(c.version===4,'Expected version 4');c.title??='Camera previs';text(c.title,120);c.fps??=25;num(c.fps,12,60);assert(Number.isInteger(c.fps),'Integer fps required');c.size??=[960,540];assert(Array.isArray(c.size)&&c.size.length===2,'Expected width,height');c.size.forEach(n=>{num(n,160,1920);assert(Number.isInteger(n)&&n%2===0,'Even integer dimensions required');});
 for(const name of ['models','scenes'])assert(c[name]&&typeof c[name]==='object'&&!Array.isArray(c[name])&&Object.keys(c[name]).length>=1&&Object.keys(c[name]).length<=100,'Invalid '+name);
 for(const [name,d] of Object.entries(c.models)){id(name);descriptor(d);}
 for(const [name,s] of Object.entries(c.scenes)){id(name);assert(ENV.includes(s.environment||'ground'),'Unknown environment');assert(Array.isArray(s.objects||[])&&(s.objects||[]).length<=100,'Invalid objects');const ids=new Set();for(const o of s.objects||[]){id(o.id);assert(!ids.has(o.id)&&Object.hasOwn(c.models,o.model),'Duplicate id or unknown model');ids.add(o.id);transform(o);}}
 assert(Array.isArray(c.shots)&&c.shots.length>=1&&c.shots.length<=120,'Use 1–120 shots');let total=0;
 for(const s of c.shots){num(s.duration,1/c.fps,600);assert(Math.abs(s.duration*c.fps-Math.round(s.duration*c.fps))<1e-5,'Duration must be whole frames');total+=s.duration;assert(Object.hasOwn(c.scenes,s.scene),'Unknown scene');text(s.name||'',120);text(s.note||'');const ids=new Set((c.scenes[s.scene].objects||[]).map(o=>o.id));assert(s.camera&&(!s.camera.follow||ids.has(s.camera.follow)),'Invalid follow target');track(s.camera.keys,s.duration,true);
  assert(!s.motion||(typeof s.motion==='object'&&!Array.isArray(s.motion)),'Invalid motion');for(const [id,keys] of Object.entries(s.motion||{})){assert(ids.has(id),'Unknown motion target');track(keys,s.duration);}
  assert(!s.actions||(typeof s.actions==='object'&&!Array.isArray(s.actions)),'Invalid actions');for(const [id,clips] of Object.entries(s.actions||{})){assert(ids.has(id)&&Array.isArray(clips)&&clips.length<=100,'Invalid action target');let end=0;for(const a of clips){num(a.t,0,s.duration);num(a.duration,.01,s.duration);assert(a.t>=end-1e-6&&a.t+a.duration<=s.duration+1e-6&&ACTIONS.includes(a.name),'Invalid/overlapping action');end=a.t+a.duration;}}
  assert(['cut','continue'].includes(s.transition||'cut'),'Invalid transition');
 }assert(total<=600,'Maximum duration 600s');c.duration=+total.toFixed(8);return c;
}
function sample(keys,t,field='p',fallback=[0,0,0]){
 const k=keys.map(v=>({t:v.t,p:v[field]??fallback}));if(k.length===1)return k[0].p.slice();return root.PrevisTimeline.sample(k,t);
}
function bounded(keys,t,field,fallback){const result=sample(keys,t,field,fallback);if(keys.length===1)return result;let i=0;while(i<keys.length-2&&t>keys[i+1].t)i++;const a=keys[i][field]??fallback,b=keys[i+1][field]??fallback;return result.map((n,j)=>Math.max(Math.min(a[j],b[j]),Math.min(Math.max(a[j],b[j]),n)));}
function lens(keys,t){const adapted=keys.map(k=>({t:k.t,p:[k.fov??42,k.roll??0]}));return bounded(adapted,t,'p',[42,0]);}
function locate(c,t){let start=0;for(let i=0;i<c.shots.length;i++){const s=c.shots[i],end=start+s.duration;if(t<end-1e-8||i===c.shots.length-1)return {i,start,end,local:Math.max(0,Math.min(s.duration,t-start)),shot:s};start=end;}}
function objects(c,s,t){return (c.scenes[s.scene].objects||[]).map(o=>{const k=s.motion?.[o.id];return {...o,p:k?sample(k,t):o.p||[0,0,0],r:k?sample(k,t,'r',o.r||[0,0,0]):o.r||[0,0,0],s:k?bounded(k,t,'s',o.s||[1,1,1]):o.s||[1,1,1]};});}
function prompts(c){let start=0;return c.shots.map((s,i)=>{const end=start+s.duration,fmt=v=>v.map(n=>+n.toFixed(3)).join(',');const out=[`${String(i+1).padStart(2,'0')} | ${start.toFixed(2)}–${end.toFixed(2)} s | ${s.name||s.scene}`,s.note||'',`相机坐标：${s.camera.follow?'相对 '+s.camera.follow+'（跟随其平移、旋转）':'世界空间'}。`];for(const k of s.camera.keys)out.push(`${(start+k.t).toFixed(2)} s：机位 [${fmt(k.p)}]，看向 [${fmt(k.look)}]，竖向视角 ${k.fov??42}°，翻转 ${k.roll??0}°。`);for(const [id,keys] of Object.entries(s.motion||{}))out.push(`${id}：`+keys.map(k=>`${(start+k.t).toFixed(2)}s [${fmt(k.p)}]${k.r?' 朝向['+fmt(k.r)+']':''}`).join(' → '));for(const [id,clips] of Object.entries(s.actions||{}))out.push(`${id} 动作：`+clips.map(a=>`${(start+a.t).toFixed(2)}s ${a.name} ${a.duration}s`).join('；'));start=end;return out.filter(Boolean).join('\n');}).join('\n\n');}
root.SequenceModel={validate,sample,bounded,lens,locate,objects,prompts,TYPES,ENV,ACTIONS};
})(typeof window!=='undefined'?window:globalThis);
