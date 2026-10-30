/* Reusable primitive proxy library. All project differences are JSON data. */
(function(global){'use strict';const T=THREE,V=a=>new T.Vector3(...a),rad=T.MathUtils.degToRad;
function apply(o,d){o.position.set(...(d.p||[0,0,0]));o.rotation.set(...(d.r||[0,0,0]).map(rad));o.scale.set(...(d.s||[1,1,1]));}
function create(d){const root=new T.Group(),wheels=[],ticks=[];

const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.8,metalness:0,...extra});
const bodyMat=mat(d.color||0x989e9e),lightMat=mat(0xeeeeea),darkMat=mat(0x474d50),tireMat=mat(0x393d3e),skinMat=mat(d.color||0xbcbeb9),shirtMat=mat(d.color||0x858d8b),hairMat=mat(0x62696b);
const glass=mat(0x72858c,{transparent:true,opacity:.22,depthWrite:false,side:T.DoubleSide});
function mesh(g,m,p,parent=root){const o=new T.Mesh(g,m);o.position.set(...p);parent.add(o);return o;}
function box(p,s,m=bodyMat,parent=root){return mesh(new T.BoxGeometry(...s),m,p,parent);}
function ball(p,s,m=skinMat,parent=root){const o=mesh(new T.SphereGeometry(1,18,12),m,p,parent);o.scale.set(...s);return o;}
function limb(a,b,r,m=shirtMat,parent=root){const av=V(a),bv=V(b),d=bv.clone().sub(av);const o=mesh(new T.CylinderGeometry(r*.85,r,d.length(),10),m,av.add(bv).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}

function person(parent,p=[0,0,0],seated=false,angle=0){
 const g=new T.Group();parent.add(g);g.position.set(...p);g.rotation.y=angle;
 const torso=ball([0,1.15,0],[.21,.3,.13],shirtMat,g),head=new T.Group();g.add(head);
 ball([0,0,0],[.14,.19,.145],skinMat,head);ball([0,.09,.025],[.146,.115,.135],hairMat,head);ball([0,-.01,-.144],[.032,.045,.045],skinMat,head);
 const neck=limb([0,0,0],[0,1,0],.055,skinMat,g),parts=[],driving=seated&&d.type==='car';
 for(const sign of [-1,1]){parts.push({sign,thigh:limb([0,0,0],[0,1,0],.085,darkMat,g),shin:limb([0,0,0],[0,1,0],.06,darkMat,g),shoe:ball([0,0,0],[.09,.055,.16],darkMat,g),upper:limb([0,0,0],[0,1,0],.065,shirtMat,g),fore:limb([0,0,0],[0,1,0],.05,shirtMat,g),hand:ball([0,0,0],[.045,.07,.035],skinMat,g)});}
 function segment(o,a,b){const av=V(a),bv=V(b),delta=bv.clone().sub(av);o.position.copy(av.add(bv).multiplyScalar(.5));o.scale.y=delta.length();o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());}
 const animate=(t,clip)=>{
  const action=seated?'sit':clip.name||d.pose||'idle',q=Math.max(0,Math.min(1,(t-(clip.t||0))/(clip.duration||1))),pulse=Math.sin(q*Math.PI),walking=['walk','run'].includes(action),phase=t*(action==='run'?12:8),weight=clip.duration?Math.max(0,Math.min(1,q*6,(1-q)*6)):1,bob=walking?Math.abs(Math.sin(phase))*.025*weight:0;
  const mix=(a,b,w)=>a.map((x,i)=>x+(b[i]-x)*w);
  const crouch=action==='duck'?pulse*.45:0,hip=action==='sit'?(driving?.8:.55):.9-crouch+bob,h=action==='sit'?(driving?1.29:1.12):1.65-crouch+bob,n=action==='sit'?(driving?1.1:.93):1.44-crouch+bob;
  torso.position.y=(hip+n)/2;torso.scale.y=(n-hip)/2+.07;head.position.set(0,h,action==='duck'?-pulse*.18:0);head.rotation.y=action==='wave'?-.25:0;
  segment(neck,[0,n,0],[0,h-.12,head.position.z]);
  for(const a of parts){const x=a.sign*.11,swing=walking?Math.sin(phase+a.sign*Math.PI/2)*(action==='run'?.4:.25)*weight:0;
   let knee=action==='sit'?[x,driving?.65:.49,-.32]:[x,.47-crouch/2,-swing*.45],foot=action==='sit'?[x,driving?.51:.06,-.55]:[x,.06+Math.max(0,swing)*.4,-swing];
   if(action==='kick'&&a.sign===-1){knee=mix(knee,[x,.7,-.55],pulse);foot=mix(foot,[x,.85,-.95],pulse);}
   segment(a.thigh,[x,hip,0],knee);segment(a.shin,knee,foot);a.shoe.position.set(foot[0],foot[1],foot[2]-.065);
   let shoulder=[x*1.8,n-.06,0],elbow=action==='sit'?[x*2.25,driving?1:.72,-.28]:[x*2.25,n-.3,swing*.6],hand=action==='sit'?[x*1.8,driving?1.08:.65,-.55]:[x*2.35,n-.53,swing];
   if(action==='punch'&&a.sign===-1){elbow=mix(elbow,[x*2,n-.13,-.43],pulse);hand=mix(hand,[x*1.2,n-.1,-.8],pulse);}
   if(action==='wave'&&a.sign===1){elbow=mix(elbow,[.36,n+.08,0],pulse);hand=mix(hand,[.35+Math.sin(q*12)*.09,n+.43,0],pulse);}
   segment(a.upper,shoulder,elbow);segment(a.fore,elbow,hand);a.hand.position.set(...hand);
  }
 };ticks.push(animate);animate(0,{name:seated?'sit':d.pose||'idle'});return g;
}
function car(parent,x=0,z=0,interior=false){
 const g=new T.Group();g.position.set(x,0,z);parent.add(g);const shell=new T.Group();g.add(shell);
 box([0,.66,0],[1.82,.46,4.5],bodyMat,shell);box([0,.92,-1.45],[1.77,.15,1.4],bodyMat,shell);box([0,.94,1.65],[1.77,.15,1.12],bodyMat,shell);
 box([0,.5,-2.26],[1.75,.16,.10],darkMat,shell);box([0,.5,2.26],[1.75,.16,.10],darkMat,shell);
 for(const x of [-.58,.58]){box([x,.89,-2.255],[.48,.12,.05],lightMat,shell);box([x,.9,2.255],[.48,.12,.05],darkMat,shell);}
 box([0,.72,-2.26],[.65,.26,.06],darkMat,shell);for(const x of [-.25,-.12,0,.12,.25])box([x,.72,-2.3],[.028,.22,.025],bodyMat,shell);
 const points=[[-.92,.94],[-.52,1.55],[.79,1.55],[1.3,.94]];
 // Four cabin side corners, with glazing between narrow pillars.
 const A=[[-.78,.97,-.95],[.78,.97,-.95],[-.70,1.5,-.52],[.70,1.5,-.52],[-.70,1.5,.76],[.70,1.5,.76],[-.78,.97,1.25],[.78,.97,1.25]];
 function pane(ids){const vs=ids.flatMap(i=>A[i]);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vs,3));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();mesh(geo,glass,[0,0,0],shell);}
 pane([0,1,3,2]);pane([2,3,5,4]);pane([4,5,7,6]);pane([0,2,4,6]);pane([1,7,5,3]);
 for(const [a,b] of [[0,2],[1,3],[2,4],[3,5],[4,6],[5,7]])limb(A[a],A[b],.035,bodyMat,shell);
 box([0,1.52,.1],[1.42,.07,1.32],bodyMat,shell);
 for(const wx of [-.92,.92])for(const wz of [-1.4,1.4]){
   const w=new T.Group();w.position.set(wx,.36,wz);g.add(w);const tire=mesh(new T.CylinderGeometry(.36,.36,.22,28),tireMat,[0,0,0],w);tire.rotation.z=Math.PI/2;
   const rim=mesh(new T.CylinderGeometry(.26,.26,.23,24),bodyMat,[0,0,0],w);rim.rotation.z=Math.PI/2;
   for(let a=0;a<5;a++){const sp=box([wx>0?.121:-.121,0,0],[.025,.49,.035],lightMat,w);sp.rotation.x=a*Math.PI/5;}
   wheels.push(w);
 }
 for(const sx of [-.43,.43]){if(interior&&sx>0)continue;box([sx,.62,.03],[.55,.13,.6],darkMat,g);const back=box([sx,.97,.32],[.55,.65,.14],darkMat,g);back.rotation.x=-.13;ball([sx,1.32,.36],[.17,.18,.1],darkMat,g);}
 box([0,.99,-.89],[1.5,.23,.35],darkMat,g);box([.18,1.15,-.85],[.55,.22,.05],lightMat,g);
 const steering=new T.Group();steering.position.set(-.43,1.06,-.69);steering.rotation.x=-.35;g.add(steering);mesh(new T.TorusGeometry(.19,.025,8,24),darkMat,[0,0,0],steering);box([0,0,0],[.16,.09,.06],bodyMat,steering);
 if((d.occupants??1)>0)person(g,[-.43,0,-.12],true);if(d.occupants===2)person(g,[.43,0,-.12],true);if(interior)shell.visible=false;
 return g;
}

switch(d.type){
 case 'person':person(root,[0,0,0],d.pose==='sit');break;
 case 'car':car(root,0,0,!!d.cutaway);break;
 case 'chair':box([0,.44,0],[.5,.08,.5]);box([0,.76,.24],[.5,.6,.06]);for(const x of [-.21,.21])for(const z of [-.21,.21])box([x,.2,z],[.05,.4,.05]);break;
 case 'table':box([0,.76,0],[1.6,.09,.9]);for(const x of [-.7,.7])for(const z of [-.35,.35])box([x,.36,z],[.07,.72,.07]);break;
 case 'box':box([0,0,0],[1,1,1]);break;
 case 'sphere':ball([0,0,0],[.5,.5,.5],bodyMat);break;
 case 'cylinder':mesh(new T.CylinderGeometry(.5,.5,1,24),bodyMat,[0,0,0]);break;
 case 'cone':mesh(new T.ConeGeometry(.5,1,20),bodyMat,[0,0,0]);break;
 case 'torus':mesh(new T.TorusGeometry(.42,.08,10,32),bodyMat,[0,0,0]);break;
 case 'plane':{const m=mesh(new T.PlaneGeometry(1,1),bodyMat,[0,0,0]);m.rotation.x=-Math.PI/2;break;}
 case 'group':break;
 default:throw Error('Unknown model type: '+d.type);
}
for(const part of d.parts||[])root.add(create(part));
if(d.opacity!==undefined)root.traverse(o=>{if(o.material){o.material.transparent=d.opacity<1;o.material.opacity=d.opacity;o.material.depthWrite=d.opacity===1;}});
root.userData.tick=(t,clip,distance)=>{ticks.forEach(fn=>fn(t,clip));wheels.forEach(w=>w.rotation.x=distance/.36);};
apply(root,d);return root;
}
function environment(type){const d={};const root=new T.Group();

const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.8,metalness:0,...extra});
const bodyMat=mat(d.color||0x989e9e),lightMat=mat(0xeeeeea),darkMat=mat(0x474d50),tireMat=mat(0x393d3e),skinMat=mat(d.color||0xbcbeb9),shirtMat=mat(d.color||0x858d8b),hairMat=mat(0x62696b);
const glass=mat(0x72858c,{transparent:true,opacity:.22,depthWrite:false,side:T.DoubleSide});
function mesh(g,m,p,parent=root){const o=new T.Mesh(g,m);o.position.set(...p);parent.add(o);return o;}
function box(p,s,m=bodyMat,parent=root){return mesh(new T.BoxGeometry(...s),m,p,parent);}
function ball(p,s,m=skinMat,parent=root){const o=mesh(new T.SphereGeometry(1,18,12),m,p,parent);o.scale.set(...s);return o;}
function limb(a,b,r,m=shirtMat,parent=root){const av=V(a),bv=V(b),d=bv.clone().sub(av);const o=mesh(new T.CylinderGeometry(r*.85,r,d.length(),10),m,av.add(bv).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
function buildEnvironment(type){
 const environment=new T.Group(),root=environment;if(type==='empty')return environment;
 box([0,-.15,-50],[220,.2,520],mat(type==='studio'||type==='gallery'?0xc3c4c1:0xc9ccc8),environment);
 if(['road','city','valley','bridge'].includes(type)){
   box([0,-.03,-80],[12,.04,440],mat(0xa5aaa8),environment);
   for(let z=90;z>-260;z-=6){box([0,.001,z],[.11,.012,2.5],lightMat,environment);for(const x of [-5.3,5.3])box([x,.001,z],[.10,.012,5.9],lightMat,environment);}
   if(type==='city')for(let i=0;i<22;i++)for(const side of [-1,1]){const h=8+(i*7%17);box([side*(12+i%3),h/2,-i*14+30],[7,h,9],mat(0xc4c7c5),environment);}
   if(type==='valley')for(let i=0;i<18;i++)for(const side of [-1,1]){const h=3+i%5;const r=mesh(new T.IcosahedronGeometry(1,0),mat(0xbfc1b9),[side*(17+i%3*4),h/2,-i*23+40],environment);r.scale.set(9,h,13);}
   if(type==='bridge')for(const side of [-1,1])box([side*6,.6,-80],[.3,1.2,440],lightMat,environment);
 } else if(type==='gallery'){
   box([0,3,3],[16,6,.15],lightMat,environment);for(let i=-8;i<9;i++)box([i,3,2.9],[.14,6,.04],bodyMat,environment);box([0,4.5,0],[16,.15,10],bodyMat,environment);
 } else if(type==='studio'||type==='room')box([0,4,5],[40,8,.15],mat(0xb7bbb9),environment);
 return environment;
}
return buildEnvironment(type);}
function dispose(g){const gs=new Set(),ms=new Set();g.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m)ms.add(m);});g.clear();gs.forEach(x=>x.dispose());ms.forEach(x=>x.dispose());}
global.PrevisProxies={create,environment,dispose,apply};})(window);
