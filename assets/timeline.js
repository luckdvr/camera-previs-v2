/* Timed Hermite curves: shared by camera, proxy and schematic. No per-stage stops. */
(function(root){
const lerp=(a,b,q)=>a+(b-a)*q;
function sample(keys,t,field='p'){
 let i=0;while(i<keys.length-2&&t>keys[i+1].t)i++;
 const a=keys[i],b=keys[i+1],dt=b.t-a.t,u=Math.max(0,Math.min(1,(t-a.t)/dt));
 const deriv=j=>{const l=keys[Math.max(0,j-1)],r=keys[Math.min(keys.length-1,j+1)];return l[field].map((v,k)=>(r[field][k]-v)/(r.t-l.t));};
 const da=deriv(i),db=deriv(i+1),h00=2*u*u*u-3*u*u+1,h10=u*u*u-2*u*u+u,h01=-2*u*u*u+3*u*u,h11=u*u*u-u*u;
 return a[field].map((v,k)=>h00*v+h10*dt*da[k]+h01*b[field][k]+h11*dt*db[k]);
}
function validate(c){
 if(c.version!==3||!Number.isFinite(c.duration)||c.duration<=0||c.duration>600)throw Error('需要版本3，时长为0–600秒。');
 for(const name of ['subject','camera','look']){const k=c.tracks?.[name];if(!Array.isArray(k)||k.length<2||k.length>100)throw Error('每条轨迹需要2–100个关键点。');
  if(k[0].t!==0||Math.abs(k[k.length-1].t-c.duration)>1e-6)throw Error('轨迹必须覆盖从0到总时长。');
  k.forEach((v,i)=>{if(!Number.isFinite(v.t)||(i&&v.t<=k[i-1].t)||!Array.isArray(v.p)||v.p.length!==3||!v.p.every(n=>Number.isFinite(n)&&Math.abs(n)<=10000))throw Error('关键点时间递增，坐标必须是有效三维数值。');});
 }
 if(!['subject','world'].includes(c.cameraSpace)||!Number.isFinite(c.fov)||c.fov<15||c.fov>100)throw Error('请检查相机坐标空间和取景角度。');
 if(!Array.isArray(c.phases)||!c.phases.length||c.phases[0].t!==0||c.phases.some((p,i)=>!Number.isFinite(p.t)||p.t<0||p.t>=c.duration||(i&&p.t<=c.phases[i-1].t)||typeof p.name!=='string'||typeof p.note!=='string'))throw Error('阶段时间必须递增并从0开始。');
 return c;
}
function state(c,t){
 t=Math.max(0,Math.min(c.duration,t));const p=sample(c.tracks.subject,t),a=sample(c.tracks.subject,Math.max(0,t-.025)),b=sample(c.tracks.subject,Math.min(c.duration,t+.025));
 const yaw=Math.atan2(-(b[0]-a[0]),-(b[2]-a[2]));
 const rotate=v=>[Math.cos(yaw)*v[0]+Math.sin(yaw)*v[2],v[1],-Math.sin(yaw)*v[0]+Math.cos(yaw)*v[2]];
 const world=v=>rotate(v).map((n,i)=>n+p[i]);
 const cam=sample(c.tracks.camera,t),look=sample(c.tracks.look,t);
 let phase=0;while(phase<c.phases.length-1&&t>=c.phases[phase+1].t)phase++;
 const bank=c.tracks.subject.map(k=>({t:k.t,p:[k.bank||0]}));
 return {t,p,yaw,bank:sample(bank,t)[0],cam:c.cameraSpace==='subject'?world(cam):cam,look:c.cameraSpace==='subject'?world(look):look,phase};
}
function prompts(c){const fmt=n=>Number(n.toFixed(2)),en=c.language==='en',lines=[c.title,en?'Approximate camera reconstruction; coordinates are illustrative, not measured.':'依据成片反推的近似运镜；示意坐标，不代表实测距离。',en?'Continuous shot. Subject and camera move together. Fixed vertical FOV: '+c.fov+' degrees.':'连续镜头，主体与摄影机同时移动，固定竖向视角'+c.fov+'°。'];
 c.phases.forEach((p,i)=>{const end=c.phases[i+1]?.t||c.duration;lines.push('\n'+fmt(p.t)+'–'+fmt(end)+(en?' s | ':'秒｜')+p.name+'\n'+p.note);});
 lines.push(en?'\nMotion keys (smooth continuous interpolation):':'\n当前运动参数（关键点之间连续平滑连接）：');
 for(const k of c.tracks.camera){const s=state(c,k.t);lines.push(en?fmt(k.t)+' s: subject ['+s.p.map(fmt)+']; camera ['+s.cam.map(fmt)+']; look at ['+s.look.map(fmt)+'].':fmt(k.t)+'秒：主体['+s.p.map(fmt)+']；机位['+s.cam.map(fmt)+']；看向['+s.look.map(fmt)+']。');}
 return lines.join('\n');
}
root.PrevisTimeline={sample,validate,state,prompts};
})(typeof window!=='undefined'?window:globalThis);
