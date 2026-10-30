(function(){
'use strict';
const T=window.THREE,$=id=>document.getElementById(id),copy=x=>JSON.parse(JSON.stringify(x));
const base=PrevisProject.normalize(JSON.parse($('config').textContent));let data=copy(base),time=0,playing=false,last=performance.now();
const paper=$('paper'),ctx=paper.getContext('2d'),ink='#33383a',grey='#90928f',red='#ad4835',stock='#f5f4ed';
const promptCompiler=createCameraPrompts(pos);let promptKey='',promptData=null;
function total(){return data.shots.reduce((a,s)=>a+s.duration,0);}
function outputDuration(){return total()/data.options.speed;}
function shotAt(t){let start=0;for(let i=0;i<data.shots.length;i++){const s=data.shots[i];if(t<start+s.duration||i===data.shots.length-1)return {s,i,start,u:Math.max(0,Math.min(1,(t-start)/s.duration))};start+=s.duration;}}
function check(c){return PrevisProject.normalize(c);}
function pos(s,u){const q=u*u*(3-2*u);return s.from.map((v,j)=>v+(s.to[j]-v)*s.move*q+(j===1?s.height:0));}
const camera=new T.PerspectiveCamera(37,16/9,.05,50),mapCamera=new T.OrthographicCamera(-6.15,6.15,3.075,-3.075,.1,40);mapCamera.position.set(8,10,14);mapCamera.lookAt(0,1.12,1.25);
const scene=new T.Scene(),diagram=new T.Scene();scene.background=new T.Color('#171e1e');diagram.background=new T.Color(stock);
function renderer(w,h){const r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(w,h,false);r.setPixelRatio(1);r.outputColorSpace=T.SRGBColorSpace;return r;}
const view=renderer(1280,720),map=renderer(520,260);
const outputCanvas=document.createElement('canvas'),outputCtx=outputCanvas.getContext('2d');
scene.add(new T.HemisphereLight('#f3f3e8','#4e5554',2.2));diagram.add(new T.HemisphereLight('#ffffff','#b4b7b2',2.0));
for(const sc of [scene,diagram]){const l=new T.DirectionalLight('#ffffff',sc===scene?2:1.1);l.position.set(-4,7,5);sc.add(l);}
const stage=createPrevisStage(T,scene,diagram),{visiblePeople,mapPeople,rings}=stage;
const frameCamera=new T.PerspectiveCamera(37,16/9,.12,5),helper=new T.CameraHelper(frameCamera);helper.setColors(...Array.from({length:5},()=>new T.Color(red)));helper.material.transparent=true;helper.material.opacity=.65;diagram.add(helper);
const pathLine=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:'#636963'}));diagram.add(pathLine);
function line(x1,y1,x2,y2,color=grey,width=.6){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function text(t,x,y,size=10,color=ink,font='mono',align='left'){ctx.fillStyle=color;ctx.textAlign=align;ctx.font=(font==='serif'?'italic '+size+'px Georgia,"Songti SC",serif':font==='bold'?'600 '+size+'px Arial,"PingFang SC",sans-serif':font==='cn'?size+'px "PingFang SC",sans-serif':size+'px "SFMono-Regular",Menlo,monospace');ctx.fillText(t,x,y);ctx.textAlign='left';}
function arrow(x1,y1,x2,y2,color=red,width=.8){line(x1,y1,x2,y2,color,width);const a=Math.atan2(y2-y1,x2-x1),d=4;line(x2,y2,x2-d*Math.cos(a-.5),y2-d*Math.sin(a-.5),color,width);line(x2,y2,x2-d*Math.cos(a+.5),y2-d*Math.sin(a+.5),color,width);}
function camIcon(x,y,scale=1){ctx.fillStyle=stock;ctx.strokeStyle=red;ctx.lineWidth=.9;ctx.fillRect(x-8*scale,y-5*scale,14*scale,10*scale);ctx.strokeRect(x-8*scale,y-5*scale,14*scale,10*scale);ctx.beginPath();ctx.moveTo(x+6*scale,y-3*scale);ctx.lineTo(x+11*scale,y-6*scale);ctx.lineTo(x+11*scale,y+6*scale);ctx.lineTo(x+6*scale,y+3*scale);ctx.closePath();ctx.fill();ctx.stroke();}
const mapRect={x:28,y:558,w:520,h:260};function projectMap(p){const v=new T.Vector3(...p).project(mapCamera);return {x:mapRect.x+(v.x+1)*.5*mapRect.w,y:mapRect.y+(1-v.y)*.5*mapRect.h};}
function inFrame(p){const v=new T.Vector3(...p).project(camera);return Math.abs(v.x)<.94&&Math.abs(v.y)<.98&&v.z>-1&&v.z<1;}
function sideView(s,cam){const x0=584,x1=694,ground=740,px=677;line(x0,ground,x1,ground,'#656966',.7);line(x0,655,x1,655,'#d7d8cf',.5);line(x0,707,x1,707,'#d7d8cf',.5);text('EYE',585,650,8,grey);text('LOW',585,702,8,grey);
 const hh=65;ctx.strokeStyle='#545b59';ctx.lineWidth=.85;ctx.beginPath();ctx.ellipse(px,ground-hh-12,3.4,5,0,0,Math.PI*2);ctx.stroke();line(px,ground-hh-6,px,ground-34,'#545b59',.85);line(px,ground-34,px-7,ground,'#545b59',.85);line(px,ground-34,px+7,ground,'#545b59',.85);line(px,ground-hh,px-9,ground-43,'#545b59',.85);line(px,ground-hh,px+6,ground-41,'#545b59',.85);
 const cy=ground-cam[1]*42,cx=653,ty=ground-s.look[1]*42;camIcon(cx,cy,.7);const distance=Math.hypot(cam[0]-s.look[0],cam[2]-s.look[2]),axis=Math.atan2(ty-cy,Math.max(20,distance*13));const dx=39;for(const a of [axis-s.fov*Math.PI/360,axis+s.fov*Math.PI/360])line(cx+8,cy,cx+dx,cy+Math.tan(a)*(dx-8),red,.55);line(cx+8,cy,px,ty,red,.55);arrow(cx,ground-3,cx,cy+9,'#a8aaa4',.5);
 text(s.move===0?'FIXED / EST.':'MOVING / EST.',638,760,9,ink,'mono','center');}
function short(s,n){return s.length>n?s.slice(0,n-1)+'…':s;}
function drawCaption(c,caption,x,y,w,h){
 c.save();const scale=w/720,font=16*scale,lineHeight=24*scale;c.font=font+'px "PingFang SC",sans-serif';
 const lines=[];let line='';for(const char of caption){if(c.measureText(line+char).width>w-44*scale&&line){lines.push(line);line=char;}else line+=char;}if(line)lines.push(line);
 const visible=lines.slice(0,3);if(lines.length>3)visible[2]=visible[2].slice(0,-1)+'…';const bh=(visible.length*24+16)*scale;
 c.fillStyle='#111916bb';c.fillRect(x,y+h-bh,w,bh);c.fillStyle='#e7e8df';c.textAlign='center';visible.forEach((s,i)=>c.fillText(s,x+w/2,y+h-bh+(i+1)*lineHeight));c.restore();
}
function renderOutput(seconds){const st=render(Math.min(seconds*data.options.speed,total()-1e-6));if(data.options.exportArea==='sheet')outputCtx.drawImage(paper,0,0);else{outputCtx.drawImage(view.domElement,0,0,1280,720);const cue=data.options.dialogue?PrevisProject.cues(st.s).find(c=>st.u>=c[0]&&st.u<c[1]):null;if(cue)drawCaption(outputCtx,cue[2],0,0,1280,720);}}
let prevPath=-1;
function render(t){stage.sync(data.project);time=Math.max(0,Math.min(total(),t));const st=shotAt(time),{s,i,u}=st,cam=pos(s,u);camera.position.set(...cam);camera.fov=s.fov;camera.lookAt(...s.look);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 const captures=mapPeople.map(a=>inFrame([a.actor.x,PrevisProject.seat(a.actor)+.72,a.actor.z]));mapPeople.forEach((a,k)=>{a.m.color.set(captures[k]?'#8c7771':'#949a98');rings[k].visible=captures[k];});
 frameCamera.position.copy(camera.position);frameCamera.quaternion.copy(camera.quaternion);frameCamera.fov=s.fov;frameCamera.far=Math.max(.5,camera.position.distanceTo(new T.Vector3(...s.look))+.3);frameCamera.updateProjectionMatrix();frameCamera.updateMatrixWorld();helper.update();
 if(i!==prevPath){prevPath=i;pathLine.geometry.dispose();pathLine.geometry=new T.BufferGeometry().setFromPoints(Array.from({length:25},(_,j)=>new T.Vector3(...pos(s,j/24))));}
 view.render(scene,camera);map.render(diagram,mapCamera);
 ctx.fillStyle=stock;ctx.fillRect(0,0,720,960);
 text('CAMERA PREVIS',29,31,14,ink,'bold');text('THE ART OF THE CAMERA',691,29,10,grey,'mono','right');text(short(data.project.title||'我的运镜预演',22),360,70,data.project.title.length>14?26:39,ink,'serif','center');line(29,85,691,85,'#d7d8cf',.65);line(29,93,61,93,red,.8);
 ctx.drawImage(view.domElement,0,96,720,405);
 const cue=data.options.dialogue?PrevisProject.cues(s).find(c=>u>=c[0]&&u<c[1]):null;
 if(cue)drawCaption(ctx,cue[2],0,96,720,405);
 text(String(i+1).padStart(2,'0'),29,550,35,ink,'serif');text('/ '+String(data.shots.length).padStart(2,'0'),76,539,10,grey);text('FULL CAST / FIELD OF VIEW',29,563,8,grey);text(short(s.name,20),360,536,20,ink,'bold','center');text('CAMERA / DIRECTION',691,529,10,grey,'mono','right');text('00:'+(time/data.options.speed).toFixed(2).padStart(5,'0'),691,547,9,grey,'mono','right');
 ctx.drawImage(map.domElement,mapRect.x,mapRect.y,mapRect.w,mapRect.h);line(566,565,566,807,'#d5d6cf',.6);
 // Repaint the very top of the map to keep the typography on clean stock.
 ctx.fillStyle=stock;ctx.fillRect(28,551,520,15);text('FULL CAST / FIELD OF VIEW',29,562,8,grey);
 const p=projectMap(cam);camIcon(p.x,p.y,1.1);text('CAM',p.x+15,p.y+6,9,red);const start=projectMap(pos(s,0)),end=projectMap(pos(s,1));if(s.move>0){arrow(start.x,start.y+18,end.x,end.y+18,ink,.65);text('START',start.x-6,start.y+30,7,grey);text('END',end.x+3,end.y+30,7,grey);}
 text('SIDE VIEW',585,575,11,ink);text('HEIGHT / LENS AIM',585,591,8,grey);sideView(s,cam);text('IN FRAME: '+String(captures.filter(Boolean).length).padStart(2,'0'),638,791,10,red,'mono','center');text('MARK = IN FRAME',638,805,8,grey,'mono','center');
 text('CAMERA POSITION + PAN / TILT / FIELD OF VIEW',29,814,8,ink);text(motion(s).en,29,841,20,red,'bold');text(data.options.speed+'x / '+(data.options.dialogue?'CAPTIONS':'NO DIALOGUE'),691,838,9,ink,'mono','right');text(short(s.action.replace(/\n/g,' ')||s.name+' · '+motion(s).cn+'；注视点可独立调整。',48),29,867,12,ink,'cn');text('灰色小人用于站位；文字动作不会自动转成角色动画。',29,890,10,grey,'cn');
 arrow(29,906,52,906);text('LENS DIRECTION',61,909,9,grey);arrow(250,906,273,906,ink);text('CAMERA TRAVEL',282,909,9,grey);text('GRAY FIGURES / SCHEMATIC SET',691,909,8,grey,'mono','right');
 let x=29;data.shots.forEach((sh,j)=>{const w=sh.duration/total()*662;line(x,918,x+w-3,918,j===i?red:'#c6c9bf',2);if(j===i)line(x,918,x+(w-3)*u,918,red,3);x+=w;});text('SCHEMATIC BLOCKING / CAMERA GEOMETRY & TRAVEL',29,937,8,grey);text('TOTAL / '+outputDuration().toFixed(1)+'s',691,937,8,grey,'mono','right');
 const axes=projectMap([0,.02,2.6]);text('+Z 前',axes.x,axes.y+14,8,grey,'cn');const xr=projectMap([2.8,.02,0]);text('+X 右',xr.x,xr.y+14,8,grey,'cn');mapPeople.forEach(a=>{const q=projectMap([a.actor.x,.02,a.actor.z]);text(short(a.actor.name,12),q.x,q.y+17,9,ink,'cn','center');});
 $('seek').value=time;$('clock').textContent=(time/data.options.speed).toFixed(2)+' / '+outputDuration().toFixed(2);syncControls(st);return st;
}
// Editing only changes shot data. The reference-style rendering stays separate.
let exporting=false,exportBefore=null,exportControls=[];
let selected=0,point='from',showHandles=true,playUntil=null,drag=null,beforeEdit=null;
const undoStack=[],redoStack=[],handleKeys=['from','to','look'];
const offsets={from:[-29,-16],to:[29,18],look:[25,-21]};
const names={from:'起点',to:'终点',look:'注视点'};
const savedKey='camera-previs-project-v2:'+location.pathname;
const baselineSignature=JSON.stringify(base);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function status(message,bad=false){$('status').textContent=message;$('status').style.color=bad?'#a33925':'';}
function startOf(i){return data.shots.slice(0,i).reduce((sum,s)=>sum+s.duration,0);}
function currentPoint(s,key){return key==='look'?s.look.slice():pos(s,key==='from'?0:1);}
function bake(s){if(s.move===1&&s.height===0)return;const a=pos(s,0),b=pos(s,1);s.from=a;s.to=b;s.move=1;s.height=0;}
function motion(s){const a=pos(s,0),b=pos(s,1),delta=b.map((v,j)=>v-a[j]);if(Math.hypot(...delta)<.005)return {en:'FIXED / HOLD',cn:'固定机位'};if(Math.abs(delta[1])>Math.hypot(delta[0],delta[2])*1.4)return delta[1]>0?{en:'RISE / REFRAME',cn:'升高机位'}:{en:'LOWER / REFRAME',cn:'降低机位'};const dx=s.look[0]-a[0],dz=s.look[2]-a[2],h=Math.hypot(dx,dz);if(h>.001){const forward=(delta[0]*dx+delta[2]*dz)/h,right=(-delta[0]*dz+delta[2]*dx)/h;if(Math.abs(right)>Math.abs(forward)*1.4)return right>0?{en:'TRACK RIGHT',cn:'向右横移'}:{en:'TRACK LEFT',cn:'向左横移'};if(Math.abs(forward)>Math.abs(right)*1.4)return forward>0?{en:'PUSH IN',cn:'镜头推进'}:{en:'PULL BACK',cn:'镜头拉远'};}return {en:'MOVE / REFRAME',cn:'移动与重新取景'};}
function snap(){return {data:copy(data),time,selected,point};}
function beginEdit(){if(!beforeEdit)beforeEdit=snap();play(false);}
function saveDraft(){try{localStorage.setItem(savedKey,JSON.stringify({signature:baselineSignature,data}));status('已在本页暂存。可撤销；保存页面后能独立打开。');}catch(e){status('当前浏览器不能暂存，请用“保存修改后的页面”。');}}
function syncHistory(){if(exporting)return;$('undo').disabled=!undoStack.length;$('redo').disabled=!redoStack.length;}
function commitEdit(){if(!beforeEdit)return;if(JSON.stringify(beforeEdit.data)!==JSON.stringify(data)){undoStack.push(beforeEdit);if(undoStack.length>50)undoStack.shift();redoStack.length=0;saveDraft();}beforeEdit=null;syncHistory();}
function restoreSnapshot(s){data=check(s.data);point=s.point;selected=s.selected;beforeEdit=null;prevPath=-1;play(false);$('params').value=JSON.stringify(data,null,2);$('seek').max=total();render(clamp(s.time,0,total()));syncHistory();saveDraft();}
function goToPoint(key){commitEdit();point=key;play(false);const st=startOf(selected),s=data.shots[selected];let t=time;if(key==='from')t=st;else if(key==='to')t=st+s.duration-1e-6;else t=clamp(t,st,st+s.duration-1e-6);render(t);}
function selectShot(i){commitEdit();selected=i;point='from';play(false);render(startOf(i));}
function validGeometry(s){const a=pos(s,0),b=pos(s,1);return [...a,...b,...s.look].every(Number.isFinite)&&a[1]>=.15&&b[1]>=.15&&[a,b].every(p=>Math.hypot(...p.map((v,i)=>v-s.look[i]))>=.25);}
function changed(t=time){prevPath=-1;$('params').value=JSON.stringify(data,null,2);$('seek').max=total();render(clamp(t,0,total()));}
function syncControls(st){selected=st.i;const s=st.s,p=currentPoint(s,point);syncProjectControls();for(const k of handleKeys){$('target-'+k).classList.toggle('active',k===point);$('target-'+k).setAttribute('aria-pressed',String(k===point));$('handle-'+k).classList.toggle('selected',k===point);}
 $('shot-name').textContent=s.id+' · '+s.name;$('point-hint').textContent=point==='look'?'拖“看向”改变朝向，摄影机位置不动。':'拖'+names[point]+'改平面位置；滑块调整这个机位的高度。';$('coordinates').textContent=names[point]+'  X '+p[0].toFixed(2)+' / Y '+p[1].toFixed(2)+' / Z '+p[2].toFixed(2)+' m';
 $('height').value=clamp(p[1],.2,3.2);$('height-value').textContent=p[1].toFixed(2)+' m';$('fov').value=s.fov;$('fov-value').textContent=s.fov+'°';$('duration').value=s.duration;$('duration-value').textContent=s.duration.toFixed(1)+' s';
 updateHandles(s);syncHistory();syncPrompts();
}
function handlePosition(s,key){const actual=projectMap(currentPoint(s,key)),offset=offsets[key];return {actual,x:clamp(actual.x+offset[0],52,521),y:clamp(actual.y+offset[1],585,785)};}
function updateHandles(s){const visible=showHandles&&!playing&&!exporting;$('leaders').style.display=visible?'':'none';$('paper-wrap').classList.toggle('editing',visible);for(const k of handleKeys){const h=$('handle-'+k),p=handlePosition(s,k);h.hidden=!visible;h.style.left=(p.x/720*100)+'%';h.style.top=(p.y/960*100)+'%';const l=$('leader-'+k);l.setAttribute('x1',p.actual.x);l.setAttribute('y1',p.actual.y);l.setAttribute('x2',p.x);l.setAttribute('y2',p.y);}}
function pointerPoint(e){const r=paper.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*720,y:(e.clientY-r.top)/r.height*960};}
function hitPlane(p,y){mapCamera.updateMatrixWorld();const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((p.x-mapRect.x)/mapRect.w*2-1,1-(p.y-mapRect.y)/mapRect.h*2),mapCamera);const out=new T.Vector3();return ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-y),out)?out:null;}
function dragStart(e,key){if(e.button!==0&&e.pointerType!=='touch')return;e.preventDefault();goToPoint(key);const p=currentPoint(data.shots[selected],key),hit=hitPlane(pointerPoint(e),p[1]);if(!hit)return;beginEdit();drag={key,index:selected,y:p[1],offset:[hit.x-p[0],hit.z-p[2]],pointerId:e.pointerId,owner:e.currentTarget};e.currentTarget.setPointerCapture(e.pointerId);}
function dragMove(e){if(!drag||drag.pointerId!==e.pointerId)return;e.preventDefault();const hit=hitPlane(pointerPoint(e),drag.y);if(!hit)return;const s=data.shots[drag.index],prior=copy(s);if(drag.key!=='look')bake(s);s[drag.key]=[clamp(hit.x-drag.offset[0],-5,5),drag.y,clamp(hit.z-drag.offset[1],-2.5,6.5)].map(v=>Math.round(v*1000)/1000);if(!validGeometry(s)){data.shots[drag.index]=prior;status('机位与注视点过近，请稍微拉开。',true);return;}changed();}
function dragEnd(e){if(!drag||drag.pointerId!==e.pointerId)return;drag=null;commitEdit();}
for(const k of handleKeys){const h=$('handle-'+k);h.addEventListener('pointerdown',e=>dragStart(e,k));h.addEventListener('pointermove',dragMove);h.addEventListener('pointerup',dragEnd);h.addEventListener('pointercancel',dragEnd);h.addEventListener('lostpointercapture',dragEnd);h.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();goToPoint(k);beginEdit();const s=data.shots[selected],prior=copy(s);if(k!=='look')bake(s);const step=e.shiftKey?.2:.05;const axis=e.key==='ArrowLeft'||e.key==='ArrowRight'?0:2;s[k][axis]=clamp(s[k][axis]+(e.key==='ArrowLeft'||e.key==='ArrowUp'?-step:step),axis===0?-5:-2.5,axis===0?5:6.5);if(!validGeometry(s))data.shots[selected]=prior;changed();commitEdit();});}
$('shot-select').onchange=()=>selectShot(Number($('shot-select').value));
for(const k of handleKeys)$('target-'+k).onclick=()=>goToPoint(k);
for(const k of ['height','fov','duration']){const input=$(k);input.onpointerdown=()=>beginEdit();input.onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))beginEdit();};input.oninput=()=>{beginEdit();const st=shotAt(time),s=data.shots[selected],prior=copy(s),v=Number(input.value);if(k==='height'){if(point!=='look')bake(s);s[point][1]=v;}else s[k]=v;if(!validGeometry(s)||total()>600){data.shots[selected]=prior;changed();status(total()>=600?'原始总时长最多10分钟，请分段制作。':'机位与注视点过近，或总时长超过10分钟。',true);return;}const t=k==='duration'?startOf(selected)+Math.min(st.u,1-1e-7)*s.duration:time;changed(t);};input.onchange=commitEdit;input.onpointerup=commitEdit;input.onkeyup=commitEdit;input.onblur=commitEdit;}
function preset(mode){commitEdit();beginEdit();const st=shotAt(time),s=data.shots[selected];bake(s);if(mode==='hold'){s.from=pos(s,st.u);s.to=s.from.slice();}else{s.to=s.from.map((v,j)=>s.look[j]+(v-s.look[j])*(mode==='in'?.78:1.25));}point='to';changed(startOf(selected)+s.duration-1e-6);commitEdit();}
$('preset-hold').onclick=()=>preset('hold');$('preset-in').onclick=()=>preset('in');$('preset-out').onclick=()=>preset('out');
$('undo').onclick=()=>{commitEdit();if(!undoStack.length)return;redoStack.push(snap());restoreSnapshot(undoStack.pop());};$('redo').onclick=()=>{if(!redoStack.length)return;undoStack.push(snap());restoreSnapshot(redoStack.pop());};
$('restore-shot').onclick=()=>{commitEdit();beginEdit();const camera=base.shots[selected]||PrevisProject.shot();for(const k of ['from','to','look','fov','move','height'])data.shots[selected][k]=copy(camera[k]);point='from';changed(startOf(selected));commitEdit();};
$('show-handles').onchange=()=>{showHandles=$('show-handles').checked;updateHandles(data.shots[selected]);};
function play(v,limit=null){playing=v;playUntil=v?limit:null;last=performance.now();$('play').textContent=v?'暂停':'播放';updateHandles(data.shots[selected]);}
$('play').onclick=()=>{commitEdit();if(time>=total())render(0);play(!playing);};$('reset-time').onclick=()=>{commitEdit();render(0);play(true);};$('play-shot').onclick=()=>{commitEdit();const start=startOf(selected),end=start+data.shots[selected].duration;render(start);play(true,end);};$('seek').oninput=()=>{commitEdit();play(false);render(Number($('seek').value));};
function apply(v){if(exporting)throw Error('请等视频导出完成后再改镜头。');const next=check(v);if(!next.shots.every(validGeometry))throw Error('摄影机与注视点过近，或机位低于地面。');commitEdit();beginEdit();data=next;point='from';changed(0);commitEdit();}
$('apply').onclick=()=>{try{apply(JSON.parse($('params').value));}catch(e){status(e.message,true);}};$('restore').onclick=()=>apply(base);
function safeName(){return (data.project.title||'运镜预演').replace(/[\\/:*?"<>|]/g,'_').slice(0,60);}
function download(content,name,type){const u=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);}
$('save-json').onclick=()=>{commitEdit();download(JSON.stringify(data,null,2),safeName()+'_项目.json','application/json');};$('save-html').onclick=()=>{commitEdit();const doc=document.documentElement.cloneNode(true);doc.querySelector('#config').textContent=JSON.stringify(data).replace(/</g,'\\u003c');doc.querySelector('#status').textContent='';download('<!doctype html>\n'+doc.outerHTML,safeName()+'_可分享预演.html','text/html');status('已另存带当前镜头的独立页面。');};
$('import-json').onclick=()=>$('file').click();$('file').onchange=async()=>{try{const f=$('file').files[0];if(!f)return;if(f.size>1000000)throw Error('项目文件不能超过 1 MB。');const input=JSON.parse(await f.text());apply(input);if(input.version===1)status('已恢复旧机位。旧参数不含剧本和人物资料，可在“项目内容”中补填。');}catch(e){status(e.message,true);}finally{$('file').value='';}};
// Only the camera paragraph and timing are derived from editable data.
function syncPrompts(){
 const key=JSON.stringify(data)+'|'+selected;
 if(key===promptKey)return;
 promptKey=key;promptData=promptCompiler.make(data);
 $('prompt-title').textContent='提示词 · '+promptData.shots[selected].title;
 $('prompt-text').value=promptData.shots[selected].text;
 $('prompt-all').textContent=promptData.full;
 $('prompt-basis').textContent=JSON.stringify(promptData.shots[selected].basis,null,2);
 $('prompt-state').textContent='已同步当前镜头';
}
async function copyPrompt(all){
 commitEdit();syncPrompts();const value=all?promptData.full:promptData.shots[selected].text;
 let ok=false;
 try{await navigator.clipboard.writeText(value);ok=true;}catch(e){
  const field=document.createElement('textarea');field.value=value;field.readOnly=true;field.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(field);field.select();
  try{ok=document.execCommand('copy');}catch(e){}finally{field.remove();}
 }
 if(ok){$('prompt-state').textContent=all?'已复制全部镜头':'已复制本镜提示词';}
 else{$('prompt-text').value=value;$('prompt-text').focus();$('prompt-text').select();$('prompt-state').textContent='浏览器未自动复制，文字已选中，可按 Cmd/Ctrl+C。';}
}
$('copy-prompt').onclick=()=>copyPrompt(false);
$('copy-all-prompts').onclick=()=>copyPrompt(true);
$('download-prompts').onclick=()=>{commitEdit();syncPrompts();download(promptData.full+'\n',safeName()+'_提示词.txt','text/plain;charset=utf-8');$('prompt-state').textContent='已导出全部镜头提示词';};
$('import-old').onclick=()=>$('file').click();
document.addEventListener('keydown',e=>{if(exporting)return;if(['TEXTAREA','INPUT','SELECT'].includes(document.activeElement.tagName))return;if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();$(e.shiftKey?'redo':'undo').click();}});
let menuKey='',formKey='';
function syncProjectControls(){
 const key=JSON.stringify(data.shots.map(s=>s.name));if(key!==menuKey){menuKey=key;$('shot-select').replaceChildren(...data.shots.map((s,i)=>new Option(String(i+1).padStart(2,'0')+' · '+s.name,i)));}
 $('shot-select').value=String(selected);$('speed').value=String(data.options.speed);$('dialogue-enabled').checked=data.options.dialogue;$('export-area').value=data.options.exportArea;
 $('output-info').textContent='输出 '+outputDuration().toFixed(2)+' 秒 · '+(data.options.exportArea==='video'?'1280×720 纯画面':'720×960 含示意图');
 $('project-label').textContent=data.project.title+' · '+data.shots.length+' 镜';
 const shot=data.shots[selected],fk=JSON.stringify([selected,shot.name,shot.action,shot.dialogue]);
 if(fk!==formKey){formKey=fk;for(const [id,key] of [['edit-shot-name','name'],['edit-action','action'],['edit-dialogue','dialogue']])if(document.activeElement!==$(id))$(id).value=shot[key];}
 if(!exporting){$('delete-shot').disabled=data.shots.length===1;$('duplicate-shot').disabled=data.shots.length>=30;$('add-shot').disabled=data.shots.length>=30;$('move-up').disabled=selected===0;$('move-down').disabled=selected===data.shots.length-1;}
}
function mutateProject(fn,index=selected){try{const next=copy(data);fn(next);const checked=check(next);if(!checked.shots.every(validGeometry))throw Error('机位与注视点过近。');commitEdit();beginEdit();data=checked;selected=clamp(index,0,data.shots.length-1);point='from';changed(startOf(selected));commitEdit();}catch(e){status(e.message,true);}}
for(const id of ['speed','dialogue-enabled','export-area'])$(id).onchange=()=>mutateProject(c=>{c.options.speed=Number($('speed').value);c.options.dialogue=$('dialogue-enabled').checked;c.options.exportArea=$('export-area').value;});
$('add-shot').onclick=()=>mutateProject(c=>c.shots.splice(selected+1,0,PrevisProject.shot(selected+1)),selected+1);
$('duplicate-shot').onclick=()=>mutateProject(c=>c.shots.splice(selected+1,0,copy(c.shots[selected])),selected+1);
$('delete-shot').onclick=()=>{if(data.shots.length>1)mutateProject(c=>c.shots.splice(selected,1),Math.min(selected,data.shots.length-2));};
for(const [id,delta] of [['move-up',-1],['move-down',1]])$(id).onclick=()=>{const at=selected+delta;if(at>=0&&at<data.shots.length)mutateProject(c=>{const s=c.shots.splice(selected,1)[0];c.shots.splice(at,0,s);},at);};
for(const [id,key] of [['edit-shot-name','name'],['edit-action','action'],['edit-dialogue','dialogue']]){$(id).onfocus=()=>play(false);$(id).onchange=()=>mutateProject(c=>c.shots[selected][key]=$(id).value);}
function actorRows(actors){$('actor-rows').replaceChildren();actors.forEach((a,i)=>{
 const row=document.createElement('div');row.className='actor-row';
 for(const [key,label] of [['name','人物名'],['pose','姿态'],['x','X'],['z','Z'],['facing','朝向']]){const input=document.createElement(key==='pose'?'select':'input');input.dataset.key=key;input.setAttribute('aria-label','人物'+(i+1)+label);if(key==='pose'){for(const [v,n] of [['stand','站立'],['sit','坐椅子'],['bed','坐床沿']])input.add(new Option(n,v));}else if(key!=='name'){input.type='number';input.step=key==='facing'?'5':'.1';}else input.maxLength=24;input.value=a[key];row.append(input);}
 const button=document.createElement('button');button.textContent='移除';button.type='button';button.onclick=()=>{if($('actor-rows').children.length>1)row.remove();};row.append(button);$('actor-rows').append(row);
 });}
function readProjectForm(){return {title:$('project-title').value,description:$('scene-description').value,script:$('script-input').value,set:$('scene-set').value,actors:[...$('actor-rows').children].map(row=>Object.fromEntries([...row.querySelectorAll('[data-key]')].map(el=>[el.dataset.key,['x','z','facing'].includes(el.dataset.key)?Number(el.value):el.value])))};}
function openProject(){play(false);const p=data.project;$('project-title').value=p.title;$('scene-description').value=p.description;$('script-input').value=p.script;$('scene-set').value=p.set;actorRows(p.actors);$('project-error').textContent='';$('project-dialog').showModal();}
$('edit-project').onclick=openProject;$('close-project').onclick=()=>$('project-dialog').close();
$('new-project').onclick=()=>{apply(PrevisProject.blank());openProject();};
$('add-actor').onclick=()=>{try{const p=readProjectForm();if(p.actors.length>=4)throw Error('最多4个人物。');let n=p.actors.length+1;while(p.actors.some(a=>a.name==='人物'+n))n++;p.actors.push({name:'人物'+n,x:0,z:1.4,pose:'stand',facing:180});actorRows(p.actors);}catch(e){$('project-error').textContent=e.message;}};
function saveProjectForm(split){try{const next=copy(data);next.project=readProjectForm();if(split){next.shots=PrevisProject.splitScript(next.project);next.options.dialogue=next.shots.some(s=>s.dialogue.trim());}apply(next);$('project-dialog').close();if(split)status('已按空行建立 '+data.shots.length+' 镜，默认每镜5秒；可继续调整或撤销。');}catch(e){$('project-error').textContent=e.message;}}
$('apply-project').onclick=()=>saveProjectForm(false);$('split-script').onclick=()=>saveProjectForm(true);
const videoExport=createCanvasVideoExport({canvas:outputCanvas,render:renderOutput,
 before:()=>{
  commitEdit();exportBefore={time,point};play(false);exporting=true;const size=data.options.exportArea==='video'?[1280,720]:[720,960];outputCanvas.width=size[0];outputCanvas.height=size[1];
  exportControls=[...document.querySelectorAll('button,input,textarea,select')].filter(el=>el.id!=='cancel-video').map(el=>({el,disabled:el.disabled}));
  exportControls.forEach(({el})=>el.disabled=true);
  $('cancel-video').hidden=false;$('video-progress').hidden=false;$('video-progress').max=outputDuration();$('video-progress').value=0;
  $('video-status').textContent='正在导出，请保持本页可见…';
 },
 progress:(t,d,paused=false)=>{$('video-progress').value=t;$('video-status').textContent=paused?'已暂停导出，回到本页后继续。':'正在导出 '+t.toFixed(1)+' / '+d.toFixed(1)+' 秒';},
 after:result=>{
  exporting=false;exportControls.forEach(({el,disabled})=>el.disabled=disabled);exportControls=[];
  $('cancel-video').hidden=true;$('video-progress').hidden=true;
  if(exportBefore){point=exportBefore.point;render(exportBefore.time);exportBefore=null;}
  if(result.error){$('video-status').textContent=result.error;return;}
  if(result.cancelled){$('video-status').textContent='已取消，镜头参数未变。';return;}
  download(result.blob,safeName()+'_'+(data.options.exportArea==='video'?'纯画面':'含示意图')+'_'+data.options.speed+'倍速.'+result.ext,result.blob.type);
  $('video-status').textContent='已导出 '+result.ext.toUpperCase()+' · '+outputCanvas.width+'×'+outputCanvas.height+' · 无声';
 }
});
$('export-video').onclick=()=>videoExport.start(outputDuration());$('cancel-video').onclick=()=>videoExport.cancel();
function tick(now){const dt=Math.min(.25,(now-last)/1000);last=now;if(playing&&!document.hidden){const end=playUntil??total(),next=time+dt*data.options.speed;if(next>=end){render(end<total()?end-1e-6:end);play(false);}else render(next);}requestAnimationFrame(tick);}
document.addEventListener('visibilitychange',()=>last=performance.now());
window.previs={seek:t=>{commitEdit();play(false);render(t);},getConfig:()=>copy(data),getPrompts:()=>promptCompiler.make(data),setConfig:apply,frame:(type='image/png')=>paper.toDataURL(type,.93),getState:()=>({time,playing,exporting,shot:shotAt(time).i,point,camera:camera.position.toArray(),aspect:camera.aspect,total:total(),outputDuration:outputDuration(),speed:data.options.speed,undo:undoStack.length,redo:redoStack.length}),project:p=>new T.Vector3(...p).project(camera).toArray()};
let restored=false;try{const draft=JSON.parse(localStorage.getItem(savedKey)||'null');if(draft&&draft.signature===baselineSignature){const next=check(draft.data);if(next.shots.every(validGeometry)){data=next;restored=true;}}}catch(e){/* Invalid or unavailable local storage never replaces the embedded sample. */}
$('params').value=JSON.stringify(data,null,2);$('seek').max=total();render(0);status(restored?'已恢复本页上次的修改。':'可以直接拖机位；点“项目内容”换成自己的剧本。');requestAnimationFrame(tick);
})();
