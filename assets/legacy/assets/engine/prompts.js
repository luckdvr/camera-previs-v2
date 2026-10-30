function createCameraPrompts(position){
 const fmt=(n,d=2)=>String(Number(n.toFixed(d)));
 function place(p){const parts=[];if(Math.abs(p[0])>=.005)parts.push((p[0]>0?'右侧':'左侧')+fmt(Math.abs(p[0]))+'米');if(Math.abs(p[2])>=.005)parts.push((p[2]>0?'前方':'后方')+fmt(Math.abs(p[2]))+'米');return parts.length?'场景中心的'+parts.join('、'):'场景中心';}
 function move(s){const a=position(s,0),b=position(s,1),d=b.map((v,j)=>v-a[j]);if(Math.hypot(...d)<.005)return '摄影机保持固定。';const h=Math.hypot(s.look[0]-a[0],s.look[2]-a[2]),parts=[];
  if(h>.001){const fx=(s.look[0]-a[0])/h,fz=(s.look[2]-a[2])/h,f=d[0]*fx+d[2]*fz,r=-d[0]*fz+d[2]*fx;if(Math.abs(f)>=.005)parts.push((f>0?'向前推进':'向后退移')+fmt(Math.abs(f))+'米');if(Math.abs(r)>=.005)parts.push('向'+(r>0?'右':'左')+'横移'+fmt(Math.abs(r))+'米');}
  else{if(Math.abs(d[0])>=.005)parts.push('沿场景X方向移动'+fmt(d[0])+'米');if(Math.abs(d[2])>=.005)parts.push('沿场景Z方向移动'+fmt(d[2])+'米');}
  if(Math.abs(d[1])>=.005)parts.push((d[1]>0?'升高':'降低')+fmt(Math.abs(d[1]))+'米');return (h>.001?'以开场朝向为准，':'')+(parts.join('、')||'小幅移动')+'；各方向同时进行，沿直线移动，起步和收尾放缓。';
 }
 function make(data){const p=data.project,o=data.options;
  const blocking=p.actors.map(a=>a.name+(a.pose==='stand'?'站':'坐')+'在'+place([a.x,0,a.z])+'，朝向站位图'+fmt(a.facing)+'°').join('；');
  const scene='横屏16:9。'+(p.description.trim()?p.description.trim()+'\n':'')+'预演站位：'+blocking+'。场景方向按站位图固定，正Z为前，朝向0°朝前、90°朝右。';
  let elapsed=0;
  const shots=data.shots.map((s,i)=>{const start=elapsed,duration=s.duration/o.speed;elapsed+=duration;const a=position(s,0),b=position(s,1);
   const near=p.actors.find(actor=>Math.hypot(actor.x-s.look[0],actor.z-s.look[2])<.32);
   const motion='起始机位在'+place(a)+'，高'+fmt(a[1])+'米。'+move(s)+'结束机位高'+fmt(b[1])+'米。全程对准固定注视点'+(near?'（'+near.name+'附近）':'')+'：'+place(s.look)+'，高'+fmt(s.look[1])+'米。竖向取景角度保持'+fmt(s.fov)+'°，镜内不变焦。';
   const lines=o.dialogue&&s.dialogue.trim()?s.dialogue.trim():'';
   const body=(s.action.trim()?'画面与动作：'+s.action.trim()+'\n':'')+'运镜：'+motion+'\n'+(lines?'对白依次为：\n'+lines:'本镜无对白。');
   const title='镜头'+String(i+1).padStart(2,'0')+'｜'+fmt(duration)+'秒';
   return {index:i,start,end:elapsed,duration,title,motion,dialogue:lines,text:scene+'\n\n'+title+'\n'+body,sequenceText:'镜头'+String(i+1).padStart(2,'0')+'｜'+fmt(start)+'–'+fmt(elapsed)+'秒\n'+body,basis:{from:a,to:b,look:s.look,fov:s.fov,sourceDuration:s.duration,speed:o.speed,outputDuration:duration}};
  });
  return {scene,total:elapsed,shots,full:scene+'\n共'+fmt(elapsed)+'秒，'+shots.length+'个镜头'+(shots.length>1?'，镜间直接切换':'')+'。\n\n'+shots.map(s=>s.sequenceText).join('\n\n')};
 }
 return {make};
}
