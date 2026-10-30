function createPrevisStage(T,scene,diagram){
 const visiblePeople=[],mapPeople=[],rings=[],groups=[new T.Group(),new T.Group()];scene.add(groups[0]);diagram.add(groups[1]);
 const sph=new T.SphereGeometry(1,16,12),cyl=new T.CylinderGeometry(1,1,1,10),ringGeometry=new T.RingGeometry(.17,.185,40),shared=new Set([sph,cyl,ringGeometry]),up=new T.Vector3(0,1,0);
 const mat=c=>new T.MeshLambertMaterial({color:c});let key='';
 function ball(g,m,p,s){const o=new T.Mesh(sph,m);o.position.set(...p);o.scale.set(...s);g.add(o);return o;}
 function bone(g,m,a,b,r){const A=new T.Vector3(...a),B=new T.Vector3(...b),v=B.clone().sub(A),o=new T.Mesh(cyl,m);o.position.copy(A.add(B).multiplyScalar(.5));o.scale.set(r,v.length(),r);o.quaternion.setFromUnitVectors(up,v.normalize());g.add(o);}
 function box(g,c,p,s){const o=new T.Mesh(new T.BoxGeometry(...s),mat(c));o.position.set(...p);g.add(o);}
 function mannequin(parent,actor,isMap){const g=new T.Group(),seat=PrevisProject.seat(actor),standing=actor.pose==='stand';g.position.set(actor.x,seat,actor.z);g.rotation.y=actor.facing*Math.PI/180;parent.add(g);const m=mat(isMap?'#939795':'#929b98'),head=new T.Group();g.add(head);head.position.set(0,.8,0);ball(head,m,[0,0,0],[.13,.17,.13]);ball(head,m,[0,-.01,.13],[.027,.035,.035]);ball(g,m,[0,.34,0],[.2,.26,.13]);ball(g,m,[0,.035,0],[.18,.11,.13]);bone(g,m,[0,.51,0],[0,.67,0],.05);
  for(const k of [-1,1]){const elbow=[k*.23,standing?.21:.24,standing?.02:.12],hand=[k*(standing?.24:.12),standing?-.06:.09,standing?.08:.35];bone(g,m,[k*.18,.5,0],elbow,.055);bone(g,m,elbow,hand,.05);ball(g,m,hand,[.055,.03,.07]);const knee=[k*.13,standing?-.43:-.08,standing?.02:.4],ankle=[k*.14,-seat+.1,standing?.04:.44];bone(g,m,[k*.11,.025,0],knee,.075);bone(g,m,knee,ankle,.06);ball(g,m,[k*.14,-seat+.06,standing?.11:.51],[.08,.055,.14]);}
  return {g,m,head,actor};
 }
 function release(g){const materials=new Set(),geometries=new Set();g.traverse(o=>{if(o.geometry&&!shared.has(o.geometry))geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());g.clear();}
 function sync(p){const next=JSON.stringify({set:p.set,actors:p.actors});if(next===key)return;key=next;groups.forEach(release);visiblePeople.length=0;mapPeople.length=0;rings.length=0;
  groups.forEach((g,index)=>{const isMap=index===1;
   box(g,isMap?'#e3e4dd':'#242e2c',[0,-.04,1],[8,.08,8]);const grid=new T.GridHelper(8,20,isMap?'#bec2b9':'#48524e',isMap?'#cdd0c7':'#343f3b');grid.position.set(0,.008,1);grid.material.transparent=true;grid.material.opacity=isMap?.55:.35;g.add(grid);
   if(p.set==='table'){box(g,isMap?'#d9dcd4':'#4c5852',[0,.7,0],[1.3,.08,1.1]);for(const x of [-.52,.52])for(const z of [-.42,.42])box(g,isMap?'#bfc5bd':'#414e47',[x,.34,z],[.05,.68,.05]);}
   if(p.set==='bed'){const anchor=p.actors.find(a=>a.pose==='bed')||{x:.65,z:.2},x=anchor.x+.4,z=anchor.z-.58;box(g,isMap?'#d9dcd4':'#4c5852',[x,.66,z],[1.27,.13,2.25]);box(g,isMap?'#c8cec4':'#4f5b54',[x,.91,z-1.11],[1.28,.46,.04]);for(const dx of [-.57,.57])for(const dz of [-1.02,1])box(g,isMap?'#bfc5bd':'#414e47',[x+dx,.3,z+dz],[.035,.6,.035]);}
   p.actors.forEach(a=>{if(a.pose==='sit'||(a.pose==='bed'&&p.set!=='bed')){const chair=new T.Group(),height=PrevisProject.seat(a)-.03;chair.position.set(a.x,0,a.z);chair.rotation.y=a.facing*Math.PI/180;g.add(chair);box(chair,isMap?'#d7dbd2':'#46534b',[0,height,0],[.47,.05,.47]);box(chair,isMap?'#c9d0c5':'#4b584f',[0,height+.23,-.23],[.47,.48,.04]);for(const x of [-.18,.18])for(const z of [-.18,.18])box(chair,isMap?'#b9c1b7':'#3e4c43',[x,height/2,z],[.035,height,.035]);}
    (isMap?mapPeople:visiblePeople).push(mannequin(g,a,isMap));if(isMap){const r=new T.Mesh(ringGeometry,new T.MeshBasicMaterial({color:'#ad4835',transparent:true,opacity:.7,side:T.DoubleSide}));r.rotation.x=-Math.PI/2;r.position.set(a.x,.015,a.z);g.add(r);rings.push(r);}
   });
  });
 }
 return {sync,visiblePeople,mapPeople,rings};
}
