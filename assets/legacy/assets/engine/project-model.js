const PrevisProject=(()=>{
 const clone=x=>JSON.parse(JSON.stringify(x));
 const camera={from:[2.8,2.05,4.8],to:[2.25,1.85,4.15],look:[0,1.35,0],fov:37,move:1,height:0};
 function shot(i=0){return {id:String(i+1).padStart(2,'0'),name:'镜头 '+(i+1),duration:5,...clone(camera),action:'',dialogue:''};}
 function blank(){return {version:2,scene:'camera-previs',aspect:'16:9',project:{title:'我的运镜预演',description:'',script:'',set:'empty',actors:[{name:'人物A',x:-.85,z:0,pose:'stand',facing:90},{name:'人物B',x:.85,z:0,pose:'stand',facing:-90}]},options:{speed:1,dialogue:false,exportArea:'video'},shots:[shot()]};}
 function str(x,label,max,fallback=''){const s=x==null?fallback:x;if(typeof s!=='string'||s.length>max)throw Error(label+'须为不超过'+max+'字的文字。');return s;}
 function number(x,label,min,max){if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw Error(label+'须在 '+min+'–'+max+' 之间。');return x;}
 function normalize(input){
  if(!input||typeof input!=='object')throw Error('不是有效的项目文件。');
  let c=clone(input);
  if(c.version===1&&c.scene==='hospital-dialogue'&&Array.isArray(c.shots)&&c.shots.length===3){
   const old=c;c=blank();c.project.title='导入的旧镜头';c.project.set='bed';
   c.project.actors=[{name:'人物A',x:-1.05,z:.2,pose:'sit',facing:90},{name:'人物B',x:.65,z:.2,pose:'bed',facing:-90}];
   c.shots=old.shots.map(s=>({...s,action:'',dialogue:''}));
  }
  if(c.version!==2||c.scene!=='camera-previs'||c.aspect!=='16:9'||!c.project||!c.options)throw Error('请导入本工具的项目 JSON，或旧版三个镜头的参数 JSON。');
  const p=c.project,o=c.options;
  if(!['empty','table','bed'].includes(p.set))throw Error('场景简模不受支持。');
  if(!Array.isArray(p.actors)||p.actors.length<1||p.actors.length>4)throw Error('每个项目支持1–4个人物。');
  const project={title:str(p.title,'项目名称',60,'我的运镜预演'),description:str(p.description,'场景说明',3000),script:str(p.script,'剧本片段',20000),set:p.set,actors:p.actors.map(a=>({name:str(a.name,'人物名',24),x:number(a.x,'人物X',-4,4),z:number(a.z,'人物Z',-2,4),pose:['stand','sit','bed'].includes(a.pose)?a.pose:'stand',facing:number(a.facing,'朝向',-180,180)}))};
  if(project.actors.some(a=>!a.name.trim())||new Set(project.actors.map(a=>a.name.trim())).size!==project.actors.length)throw Error('人物名不能为空或重复。');
  if(![.5,1,1.5,2,3,4].includes(o.speed)||typeof o.dialogue!=='boolean'||!['video','sheet'].includes(o.exportArea))throw Error('速度、对白或导出区域设置不受支持。');
  if(!Array.isArray(c.shots)||c.shots.length<1||c.shots.length>30)throw Error('每个项目支持1–30个镜头。');
  const shots=c.shots.map((s,i)=>{
   const out={id:String(i+1).padStart(2,'0'),name:str(s.name,'镜头名称',60,'镜头 '+(i+1)),action:str(s.action,'画面动作',5000),dialogue:str(s.dialogue,'对白',4000)};
   for(const k of ['from','to','look']){if(!Array.isArray(s[k])||s[k].length!==3)throw Error('机位坐标需要三个数字。');out[k]=s[k].map(v=>number(v,'机位坐标',-15,15));}
   for(const [k,a,b] of [['duration',1,60],['fov',22,60],['move',0,2],['height',-.35,.55]])out[k]=number(s[k],k,a,b);
   return out;
  });
  if(shots.reduce((t,s)=>t+s.duration,0)>600)throw Error('单个项目原始总时长最多10分钟，请分段制作。');
  return {version:2,scene:'camera-previs',aspect:'16:9',project,options:{speed:o.speed,dialogue:o.dialogue,exportArea:o.exportArea},shots};
 }
 function seat(a){return a.pose==='stand'?.95:a.pose==='bed'?.76:.49;}
 function cues(s){const lines=s.dialogue.split(/\n+/).map(x=>x.trim()).filter(Boolean);return lines.map((line,i)=>[(i+.08)/lines.length,(i+.94)/lines.length,line]);}
 function splitScript(project){
  const paragraphs=project.script.trim().split(/\n\s*\n+/).filter(x=>x.trim());
  if(!paragraphs.length)throw Error('先填剧本片段；每个空行分隔的段落作为一镜。');
  if(paragraphs.length>30)throw Error('段落超过30个，请先取一小段剧本。');
  return paragraphs.map((p,i)=>{
   const s=shot(i),action=[],dialogue=[];
   for(const line of p.split('\n')){
    const m=line.trim().match(/^(.{1,32}?)[：:]\s*(.*)$/);
    if(m&&project.actors.some(a=>a.name===m[1].replace(/（对白）$/,'')))dialogue.push(line.trim());else action.push(line.trim());
   }
   s.action=action.join('\n');s.dialogue=dialogue.join('\n');return s;
  });
 }
 return {blank,shot,normalize,seat,cues,splitScript};
})();
if(typeof module==='object'&&module.exports)module.exports=PrevisProject;
