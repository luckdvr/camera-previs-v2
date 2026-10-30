(function(){'use strict';
const T=THREE,M=PrevisTimeline,$=id=>document.getElementById(id),clone=x=>JSON.parse(JSON.stringify(x));let data=M.validate(JSON.parse($('config').textContent)),time=0,playing=false,exporting=false,selected=0,track='camera',last=0;
const history=[],future=[];let sceneKey='',drag=null,controls=[];
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(960,540);renderer.outputColorSpace=T.SRGBColorSpace;
const map=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});map.setSize(700,370);map.outputColorSpace=T.SRGBColorSpace;
const screen=$('screen'),sc=screen.getContext('2d'),diagram=$('diagram'),dc=diagram.getContext('2d'),combined=document.createElement('canvas');combined.width=960;combined.height=1120;const cc=combined.getContext('2d');
const scene=new T.Scene(),schematic=new T.Scene();scene.background=new T.Color('#b8c2bd');scene.fog=new T.Fog('#b8c2bd',32,110);schematic.background=new T.Color('#f5f4ed');
for(const s of [scene,schematic]){s.add(new T.HemisphereLight('#ffffff','#59665c',2));const l=new T.DirectionalLight('#ffffff',2.3);l.position.set(-15,30,20);s.add(l);}
const camera=new T.PerspectiveCamera(data.fov,16/9,.05,350),mapCam=new T.OrthographicCamera(-14,14,7.4,-7.4,.1,160);
const mat=(c)=>new T.MeshLambertMaterial({color:c,side:T.DoubleSide}),steel=mat('#747d78'),body=mat('#8f9791'),pale=mat('#cdd1c8'),dark=mat('#444f49');
function box(parent,p,s,m=body){const o=new T.Mesh(new T.BoxGeometry(...s),m);o.position.set(...p);parent.add(o);return o;}
function ball(parent,p,s,m=body){const o=new T.Mesh(new T.SphereGeometry(1,16,12),m);o.position.set(...p);o.scale.set(...s);parent.add(o);return o;}
function limb(parent,a,b,r=.07,m=body){const v=new T.Vector3(...b).sub(new T.Vector3(...a)),o=new T.Mesh(new T.CylinderGeometry(r,r,v.length(),8),m);o.position.copy(new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());parent.add(o);}
function seated(g,p){const h=new T.Group();g.add(h);h.position.set(...p);ball(h,[0,.78,0],[.17,.21,.17]);box(h,[0,.42,0],[.36,.48,.25]);for(const k of [-1,1]){limb(h,[k*.15,.23,0],[k*.17,.2,-.5],.09);limb(h,[k*.17,.2,-.5],[k*.17,-.32,-.52],.075);box(h,[k*.17,-.34,-.62],[.17,.1,.3],dark);limb(h,[k*.23,.6,0],[k*.3,.22,-.15]);limb(h,[k*.3,.22,-.15],[k*.28,.28,-.5]);}}
function vehicle(){const g=new T.Group();box(g,[0,.35,.05],[1.75,.45,3.5]);box(g,[0,.7,-1.6],[1.7,.5,.2],steel);box(g,[0,1,.95],[1.55,.18,.65],dark);box(g,[0,1.37,1.28],[1.55,.68,.12]);
 for(const [x,z] of [[-.9,1],[.9,1],[0,-1.4]]){const w=new T.Mesh(new T.CylinderGeometry(.44,.44,.24,20),dark);w.rotation.z=Math.PI/2;w.position.set(x,.12,z);g.add(w);}
 // Open sides preserve a clear view of the occupants.
 for(const x of [-.8,.8])for(const z of [-1.5,1.6])limb(g,[x,.6,z],[x,2.1,z],.045,steel);
 box(g,[0,2.18,.1],[1.9,.12,3.65],pale);box(g,[0,1.62,-1.66],[1.55,.48,.035],new T.MeshLambertMaterial({color:'#abb9b5',transparent:true,opacity:.18,side:T.DoubleSide}));
 seated(g,[0,1.08,.9]);ball(g,[0,1.65,-1.05],[.31,.32,.28],pale);for(const x of [-.4,.4])box(g,[x,1.03,-1.22],[.19,.16,.4],pale);limb(g,[-.6,1.06,-1.35],[.6,1.06,-1.35],.04,steel);
 for(const k of [-1,1]){const wing=new T.Group();g.add(wing);wing.position.set(k*.85,.45,.25);wing.rotation.z=k*.06;for(let i=0;i<5;i++){const f=box(wing,[k*(.48+i*.48),-.06*i,.2+i*.13],[.68,.12,2.15-i*.2],pale);f.rotation.y=k*(.08+i*.05);}}
 return g;}
const cart=vehicle(),mapCart=cart.clone();scene.add(cart);schematic.add(mapCart);
const terrain=new T.Group(),mapTerrain=new T.Group();scene.add(terrain);schematic.add(mapTerrain);
function free(g){g.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});g.clear();}
function environment(){const key=JSON.stringify({track:data.tracks.subject,environment:data.environment});if(key===sceneKey)return;sceneKey=key;free(terrain);free(mapTerrain);
 if(data.environment==='empty')return;
 const end=M.sample(data.tracks.subject,data.duration);box(terrain,[end[0]/2,-4,end[2]/2],[170,2,200],mat('#89958a'));
 for(let i=0;i<30;i++){const t=data.duration*i/29,u=t/data.duration*20,s=M.state(data,t),v=new T.Vector3(Math.cos(s.yaw),0,-Math.sin(s.yaw));const spread=u>14?12+(u-14)*5:12;
  for(const side of [-1,1]){if(side===-1&&u>8.8&&u<15.5)continue;const h=u>16?10:14+6*Math.sin(i*1.8),x=s.p[0]+v.x*spread*side,z=s.p[2]+v.z*spread*side;
   const rock=new T.Mesh(new T.DodecahedronGeometry(1,0),mat(i%2?'#77847b':'#8b968b'));rock.position.set(x,s.p[1]-7,z);rock.scale.set(4+(i%3),h,6);terrain.add(rock);
   if(i%4===0){const r=rock.clone();r.material=new T.MeshBasicMaterial({color:'#c7cebd',transparent:true,opacity:.11,depthWrite:false});mapTerrain.add(r);}
  }
 }
 const fall=M.state(data,data.duration*.62);const f=box(terrain,[fall.p[0]-12*Math.cos(fall.yaw),fall.p[1]+2,fall.p[2]+12*Math.sin(fall.yaw)],[.14,32,10],new T.MeshBasicMaterial({color:'#dce8e4',side:T.DoubleSide}));f.rotation.y=fall.yaw;
 const mf=f.clone();mf.material=new T.MeshBasicMaterial({color:'#adbcaf',transparent:true,opacity:.2,depthWrite:false});mapTerrain.add(mf);
 const grid=new T.GridHelper(160,80,'#cbd0c6','#e0e2d9');grid.position.set(end[0]/2,0,end[2]/2);mapTerrain.add(grid);
}
const camHelperCamera=new T.PerspectiveCamera(data.fov,16/9,.1,8),frustum=new T.CameraHelper(camHelperCamera);frustum.setColors(...Array(5).fill(new T.Color('#ad4835')));schematic.add(frustum);
const route=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:'#a0a797'})),cameraRoute=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:'#ad4835'}));schematic.add(route,cameraRoute);
const mapBox={x:20,y:73,w:700,h:370},ink='#343b38',muted='#8b9188',red='#ad4835';
function text(s,x,y,size=14,color=ink,font='sans',align='left'){dc.font=(font==='serif'?'italic ':font==='bold'?'600 ':'')+size+'px '+(font==='serif'?'Georgia,serif':font==='mono'?'Menlo,monospace':'"PingFang SC",sans-serif');dc.textAlign=align;dc.fillStyle=color;dc.fillText(s,x,y);}
function line(x,y,a,b,c=muted,w=1){dc.strokeStyle=c;dc.lineWidth=w;dc.beginPath();dc.moveTo(x,y);dc.lineTo(a,b);dc.stroke();}
function arrow(x,y,a,b,c=red){line(x,y,a,b,c);const theta=Math.atan2(b-y,a-x);line(a,b,a-7*Math.cos(theta-.45),b-7*Math.sin(theta-.45),c);line(a,b,a-7*Math.cos(theta+.45),b-7*Math.sin(theta+.45),c);}
function project(p){const v=new T.Vector3(...p).project(mapCam);return {x:mapBox.x+(v.x+1)*350,y:mapBox.y+(1-v.y)*185};}
function draw(s){
 dc.fillStyle='#f5f4ed';dc.fillRect(0,0,960,580);text(String(s.phase+1).padStart(2,'0'),24,48,38,ink,'serif');text('/ '+data.phases.length,84,40,12,muted,'mono');text(data.phases[s.phase].name,480,42,25,ink,'bold','center');text('CAMERA / DIRECTION',932,25,12,muted,'mono','right');text(s.t.toFixed(2)+' / '+data.duration.toFixed(2),932,47,12,ink,'mono','right');
 dc.drawImage(map.domElement,20,73);text('主体位置 / 摄影机 / 当前取景范围',25,68,12,muted);line(735,76,735,432,'#d4d8ce');
 const q=project(s.cam),target=project(s.look);dc.fillStyle='#f5f4ed';dc.fillRect(q.x-7,q.y-5,15,10);dc.strokeStyle=red;dc.strokeRect(q.x-7,q.y-5,15,10);text('CAM',q.x+12,q.y+4,11,red,'mono');arrow(q.x,q.y,target.x,target.y,red);
 text('SIDE VIEW',760,100,14,ink,'mono');text('高度 / 注视方向',760,123,12,muted);
 const dist=Math.max(5,new T.Vector3(...s.cam).distanceTo(new T.Vector3(...s.look))),scale=Math.min(9,135/dist),base=350;
 const cy=base-(s.cam[1]-s.p[1])*scale,ty=base-(s.look[1]-s.p[1])*scale;
 line(758,385,935,385,'#bcc3b6');dc.fillStyle='#9fa79b';dc.fillRect(882,base-16,35,12);dc.beginPath();dc.arc(889,base,5,0,Math.PI*2);dc.arc(910,base,5,0,Math.PI*2);dc.fill();dc.strokeStyle=red;dc.strokeRect(770,cy-6,17,12);arrow(788,cy,902,ty);text('车体随路径前进',760,412,12,muted);text('连续移动',760,435,13,red);
 text('CAMERA TRAVEL + SUBJECT MOTION',25,465,12,muted,'mono');text(data.phases[s.phase].note,25,499,21,ink);text('依据成片反推的近似运镜 · 示意坐标，非实测距离',25,528,13,muted);
 arrow(25,551,61,551,red);text('摄影机轨迹 / 取景',72,555,12,muted);arrow(280,551,316,551,'#87957d');text('主体运动',328,555,12,muted);line(25,570,935,570,'#d1d5ca',2);line(25,570,25+910*s.t/data.duration,570,red,3);
}
function render(t){environment();time=Math.max(0,Math.min(data.duration,t));const s=M.state(data,time);cart.position.set(...s.p);cart.rotation.set(0,s.yaw,s.bank*Math.PI/180);mapCart.position.copy(cart.position);mapCart.quaternion.copy(cart.quaternion);
 camera.position.set(...s.cam);camera.fov=data.fov;camera.lookAt(...s.look);camera.updateProjectionMatrix();camera.updateMatrixWorld();renderer.render(scene,camera);sc.drawImage(renderer.domElement,0,0);
 const center=new T.Vector3(...s.p).lerp(new T.Vector3(...s.cam),.25),extent=Math.max(5.2,new T.Vector3(...s.cam).distanceTo(new T.Vector3(...s.p))*.65);
 if(!drag){mapCam.left=-extent*1.9;mapCam.right=extent*1.9;mapCam.top=extent;mapCam.bottom=-extent;mapCam.position.copy(center).add(new T.Vector3(24,34,42));mapCam.lookAt(center);mapCam.updateProjectionMatrix();mapCam.updateMatrixWorld();}
 camHelperCamera.position.copy(camera.position);camHelperCamera.quaternion.copy(camera.quaternion);camHelperCamera.fov=data.fov;camHelperCamera.far=Math.max(1,camera.position.distanceTo(new T.Vector3(...s.look)));camHelperCamera.updateProjectionMatrix();camHelperCamera.updateMatrixWorld();frustum.update();
 for(const [obj,field] of [[route,'p'],[cameraRoute,'cam']]){obj.geometry.dispose();obj.geometry=new T.BufferGeometry().setFromPoints(Array.from({length:35},(_,i)=>new T.Vector3(...M.state(data,Math.max(0,Math.min(data.duration,time-2+i*4/34)))[field])));}
 map.render(schematic,mapCam);draw(s);cc.drawImage(screen,0,0);cc.drawImage(diagram,0,540);$('seek').value=time;$('clock').textContent=time.toFixed(2)+' / '+data.duration.toFixed(2)+'秒';
 const key=data.tracks[track][selected],ks=M.state(data,key.t),point=track==='subject'?ks.p:track==='camera'?ks.cam:ks.look,q=project(point);$('handle').style.left=q.x/960*100+'%';$('handle').style.top=q.y/580*100+'%';$('handle').hidden=playing||exporting||Math.abs(time-key.t)>.1||q.x<20||q.x>720||q.y<73||q.y>443;
 return s;
}
function status(s){$('status').textContent=s;}
function sync(){document.title=data.title+' · 连续运镜预演';$('title').textContent=data.title;$('seek').max=data.duration;$('params').value=JSON.stringify(data,null,2);$('prompt').value=M.prompts(data);$('fov').value=data.fov;const k=data.tracks[track];selected=Math.min(selected,k.length-1);$('key').replaceChildren(...k.map((v,i)=>{const o=document.createElement('option');o.value=i;o.textContent=v.t.toFixed(2)+'秒';return o;}));$('key').value=selected;$('coords').replaceChildren(...['X','Y','Z'].map((a,j)=>{const l=document.createElement('label');l.textContent=a+' ';const input=document.createElement('input');input.type='number';input.step='.1';input.value=k[selected].p[j];input.onchange=()=>{const next=clone(data);next.tracks[track][selected].p[j]=Number(input.value);apply(next)};l.append(input);return l;}));$('space').textContent=track==='subject'||data.cameraSpace==='world'?'场景示意坐标':'相对车体坐标，Y为高度';$('undo').disabled=!history.length;$('redo').disabled=!future.length;}
function apply(next,record=true){M.validate(next);if(record){history.push(clone(data));future.length=0;}data=clone(next);playing=false;sync();render(Math.min(time,data.duration));status('已更新预演、机位图与提示词。');}
$('track').onchange=()=>{track=$('track').value;selected=0;sync();render(data.tracks[track][0].t);};$('key').onchange=()=>{selected=Number($('key').value);playing=false;sync();render(data.tracks[track][selected].t);};$('fov').onchange=()=>{const n=clone(data);n.fov=Number($('fov').value);try{apply(n)}catch(e){status(e.message);sync()}};
$('seek').oninput=()=>{playing=false;render(Number($('seek').value));};$('play').onclick=()=>{if(time>=data.duration)time=0;playing=!playing;last=performance.now();$('play').textContent=playing?'暂停':'播放';};$('rewind').onclick=()=>{playing=false;render(0);};
$('undo').onclick=()=>{if(history.length){future.push(clone(data));apply(history.pop(),false);}};$('redo').onclick=()=>{if(future.length){history.push(clone(data));apply(future.pop(),false);}};
function plane(e,y){const rect=diagram.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*960,z=(e.clientY-rect.top)/rect.height*580,ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((x-20)/700*2-1,1-(z-73)/370*2),mapCam);return ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-y),new T.Vector3());}
$('handle').onpointerdown=e=>{if(exporting)return;const s=M.state(data,time),p=track==='subject'?s.p:track==='camera'?s.cam:s.look;const hit=plane(e,p[1]);if(!hit)return;drag={before:clone(data),y:p[1],offset:[hit.x-p[0],hit.z-p[2]],mapPosition:mapCam.position.clone(),center:s.p};$('handle').setPointerCapture(e.pointerId);};
$('handle').onpointermove=e=>{if(!drag)return;const hit=plane(e,drag.y);if(!hit)return;let p=[hit.x-drag.offset[0],drag.y,hit.z-drag.offset[1]];if(track!=='subject'&&data.cameraSpace==='subject'){const s=M.state(data,time),v=p.map((a,i)=>a-s.p[i]);p=[Math.cos(s.yaw)*v[0]-Math.sin(s.yaw)*v[2],v[1],Math.sin(s.yaw)*v[0]+Math.cos(s.yaw)*v[2]];}data.tracks[track][selected].p=p.map(n=>Number(n.toFixed(3)));sync();render(time);};
function endDrag(){if(!drag)return;history.push(drag.before);future.length=0;drag=null;sync();status('关键点已修改，提示词已同步。');}$('handle').onpointerup=endDrag;$('handle').onpointercancel=endDrag;
function download(b,name,type){const a=document.createElement('a'),url=URL.createObjectURL(b instanceof Blob?b:new Blob([b],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
$('save-json').onclick=()=>download(JSON.stringify(data,null,2),'project.json','application/json');$('save-prompt').onclick=()=>download(M.prompts(data),'同步运镜提示词.txt','text/plain');$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(M.prompts(data));status('已复制提示词。')}catch(e){$('prompt').select();status('请复制已选中的提示词。')}};
$('save-html').onclick=()=>{const doc=document.documentElement.cloneNode(true);doc.querySelector('#config').textContent=JSON.stringify(data).replace(/</g,'\\u003c');download('<!doctype html>\n'+doc.outerHTML,'连续运镜预演.html','text/html')};
$('import').onclick=()=>$('file').click();$('file').onchange=async()=>{try{const f=$('file').files[0];if(f.size>1000000)throw Error('参数文件过大');apply(JSON.parse(await f.text()))}catch(e){status(e.message)}finally{$('file').value=''}};$('apply').onclick=()=>{try{apply(JSON.parse($('params').value))}catch(e){status(e.message)}};
function lock(v){exporting=v;if(v){playing=false;controls=Array.from(document.querySelectorAll('button,input,select,textarea')).map(el=>[el,el.disabled]);controls.forEach(([el])=>el.disabled=true);$('cancel').hidden=false;$('cancel').disabled=false;}else{controls.forEach(([el,d])=>el.disabled=d);$('cancel').hidden=true;sync();}}
const exportCanvas=document.createElement('canvas'),ex=exportCanvas.getContext('2d');let prior=0;
const video=createCanvasVideoExport({canvas:exportCanvas,render:t=>{render(t*Number($('speed').value));const c=$('area').value==='view'?screen:$('area').value==='diagram'?diagram:combined;ex.drawImage(c,0,0);},before:()=>{prior=time;lock(true)},after:r=>{lock(false);render(prior);if(r.blob){download(r.blob,'连续运镜预演.'+r.ext,r.blob.type);status('视频已导出。')}else status(r.error||'已取消导出。')},progress:(t,d,p)=>status(p?'切回页面继续导出':'正在导出 '+Math.round(t/d*100)+'%')});
$('export').onclick=()=>{const c=$('area').value==='view'?screen:$('area').value==='diagram'?diagram:combined;exportCanvas.width=c.width;exportCanvas.height=c.height;video.start(data.duration/Number($('speed').value))};$('cancel').onclick=()=>video.cancel();
let encoding={status:'idle'};
async function encode(fps=30,kind='combined'){if(exporting)throw Error('正在导出');if(typeof VideoEncoder==='undefined')throw Error('此浏览器未提供逐帧编码');const packed=document.createElement('canvas');packed.width=1080;packed.height=1660;const packContext=packed.getContext('2d'),canvas=kind==='showcase'?packed:kind==='view'?screen:combined;const config={codec:'avc1.42002a',width:canvas.width,height:canvas.height,bitrate:kind==='showcase'?14000000:9000000,framerate:fps,latencyMode:'realtime',avc:{format:'annexb'}};if(!(await VideoEncoder.isConfigSupported(config)).supported)throw Error('H264编码不可用');
 const before=time,chunks=[];encoding={status:'running',frame:0,total:Math.ceil(data.duration*fps),fps,kind,width:canvas.width,height:canvas.height};lock(true);let enc;
 try{enc=new VideoEncoder({output:c=>{const b=new Uint8Array(c.byteLength);c.copyTo(b);chunks.push(b)},error:e=>{encoding.error=e.message;}});enc.configure(config);
 for(let i=0;i<encoding.total;i++){render(i/fps);if(kind==='showcase'){packContext.fillStyle='#000';packContext.fillRect(0,0,1080,1660);packContext.drawImage(screen,0,0);packContext.drawImage(studyDiagram(),0,540);}const f=new VideoFrame(canvas,{timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps)});enc.encode(f,{keyFrame:i%60===0});f.close();encoding.frame=i+1;if(i%15===14){await enc.flush();if(encoding.error)throw Error(encoding.error);await new Promise(r=>setTimeout(r,0));}}
 await enc.flush();const len=chunks.reduce((a,b)=>a+b.length,0),bytes=new Uint8Array(len);let offset=0;chunks.forEach(b=>{bytes.set(b,offset);offset+=b.length});encoding={...encoding,status:'done',bytes};
 }catch(e){encoding={...encoding,status:'error',error:e.message};}finally{if(enc&&enc.state!=='closed')enc.close();lock(false);render(before);}}
function encodedBase64(){if(encoding.status!=='done')throw Error('编码未完成');let s='';for(let i=0;i<encoding.bytes.length;i+=32768)s+=String.fromCharCode(...encoding.bytes.subarray(i,i+32768));return btoa(s);}
function inspect(){const s=M.state(data,time),cam=new T.Vector3(...s.cam),look=new T.Vector3(...s.look),d=look.distanceTo(cam),ray=new T.Raycaster(cam,look.clone().sub(cam).normalize(),0,d-.1);scene.updateMatrixWorld(true);const hits=ray.intersectObjects(terrain.children,false).filter(h=>h.object.geometry?.type==='DodecahedronGeometry');return {t:time,cameraLookDistance:d,terrainOccludesTarget:hits.length>0,helperPositionError:camHelperCamera.position.distanceTo(camera.position),helperAngleError:camHelperCamera.quaternion.angleTo(camera.quaternion)};}
const study=document.createElement('canvas');study.width=1080;study.height=1120;
function studyDiagram(){
 const c=study.getContext('2d'),s=M.state(data,time),phase=data.phases[s.phase],en=data.language==='en';
 const txt=(str,x,y,size=18,color=ink,font='sans',align='left')=>{c.fillStyle=color;c.font=(font==='serif'?'italic ':font==='bold'?'600 ':'')+size+'px '+(font==='serif'?'Georgia,serif':font==='mono'?'Menlo,monospace':'Arial,"PingFang SC",sans-serif');c.textAlign=align;c.fillText(str,x,y);};
 const ln=(x,y,u,v,color=muted,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(u,v);c.stroke();};
 const arr=(x,y,u,v,color=red)=>{ln(x,y,u,v,color,1.5);const a=Math.atan2(v-y,u-x);ln(u,v,u-8*Math.cos(a-.45),v-8*Math.sin(a-.45),color,1.5);ln(u,v,u-8*Math.cos(a+.45),v-8*Math.sin(a+.45),color,1.5);};
 c.fillStyle='#f5f4ed';c.fillRect(0,0,1080,1120);
 txt(String(s.phase+1).padStart(2,'0'),42,80,58,ink,'serif');txt('/ '+String(data.phases.length).padStart(2,'0'),118,60,17,muted,'mono');
 txt(en?'CAMERA / DIRECTION':'摄影机 / 方向',1038,45,16,muted,'mono','right');txt(time.toFixed(2)+' / '+data.duration.toFixed(2),1038,73,16,ink,'mono','right');
 txt(en?'SUBJECT / CAMERA / FIELD OF VIEW':'主体 / 摄影机 / 取景范围',44,112,16,muted,'mono');
 const extent=Math.max(5.2,new T.Vector3(...s.cam).distanceTo(new T.Vector3(...s.p))*.65);
 const saved=[mapCam.left,mapCam.right,mapCam.top,mapCam.bottom];mapCam.left=-extent*1.4;mapCam.right=extent*1.4;mapCam.top=extent*1.4*620/760;mapCam.bottom=-mapCam.top;mapCam.updateProjectionMatrix();
 map.setSize(760,620,false);map.render(schematic,mapCam);c.drawImage(map.domElement,40,155);
 const proj=p=>{const v=new T.Vector3(...p).project(mapCam);return{x:40+(v.x+1)*380,y:155+(1-v.y)*310}};
 const q=proj(s.cam),target=proj(s.look);c.fillStyle='#f5f4ed';c.fillRect(q.x-10,q.y-7,20,14);c.strokeStyle=red;c.strokeRect(q.x-10,q.y-7,20,14);arr(q.x+11,q.y,target.x,target.y);txt('CAM',q.x+17,q.y+6,15,red,'mono');
 [mapCam.left,mapCam.right,mapCam.top,mapCam.bottom]=saved;mapCam.updateProjectionMatrix();map.setSize(700,370,false);map.render(schematic,mapCam);
 ln(824,155,824,775,'#d2d6cc');txt('SIDE VIEW',850,184,20,ink,'mono');txt(en?'HEIGHT / LENS AIM':'高度 / 注视方向',850,215,13,muted,'mono');
 const distance=new T.Vector3(...s.cam).distanceTo(new T.Vector3(...s.look)),scale=Math.min(11,145/Math.max(5,distance)),base=564,cy=base-(s.cam[1]-s.p[1])*scale,ty=base-(s.look[1]-s.p[1])*scale;
 ln(850,650,1038,650,'#aeb6a7');c.fillStyle='#9aa696';c.fillRect(985,base-19,42,15);for(const x of [992,1020]){c.beginPath();c.arc(x,base+2,6,0,Math.PI*2);c.fill();}c.strokeStyle=red;c.strokeRect(858,cy-8,22,16);arr(882,cy,1007,ty);txt(en?'MOVING / EST.':'连续移动 / 示意',944,693,15,red,'mono','center');
 txt(en?'CAMERA MOTION':'运镜方式',44,827,16,muted,'mono');txt(phase.name,44,877,40,red,'bold');
 const words=phase.note.split(' ');let line='',lines=[];c.font='25px Arial,"PingFang SC",sans-serif';for(const w of words){if(c.measureText(line+w).width>980&&line){lines.push(line.trim());line='';}line+=w+' ';}if(line)lines.push(line.trim());lines.forEach((l,i)=>txt(l,44,928+i*34,25,ink));
 txt(en?'Approximate camera reconstruction from the finished film.':'依据成片反推的近似运镜。',44,1018,16,muted,'mono');
 arr(44,1053,84,1053);txt(en?'CAMERA / FRUSTUM':'摄影机 / 取景范围',98,1058,15,muted,'mono');arr(470,1053,510,1053,'#87957d');txt(en?'SUBJECT TRAVEL':'主体运动',524,1058,15,muted,'mono');
 ln(44,1081,1038,1081,'#cdd3c7',2);ln(44,1081,44+994*time/data.duration,1081,red,3);txt('CAMERA PREVIS / SPATIAL STUDY',44,1106,12,muted,'mono');txt('EIDOLON',1038,1106,12,muted,'mono','right');
 return study;
}
window.previs={getConfig:()=>clone(data),setConfig:apply,seek:render,getPrompts:()=>M.prompts(data),getState:()=>({...M.state(data,time),playing,exporting}),frame:()=>combined.toDataURL('image/png'),capture:kind=>(kind==='study'?studyDiagram():kind==='view'?screen:kind==='diagram'?diagram:combined).toDataURL('image/png'),project:p=>{const v=new T.Vector3(...p).project(camera);return v.toArray()},inspect,startEncode:encode,encoding:()=>({...encoding,bytes:encoding.bytes?.length}),encodedBase64};
sync();render(0);function tick(now){if(playing&&!exporting){render(Math.min(data.duration,time+(now-last)/1000*Number($('speed').value)));if(time>=data.duration)playing=false;}last=now;requestAnimationFrame(tick)}requestAnimationFrame(tick);
})();
