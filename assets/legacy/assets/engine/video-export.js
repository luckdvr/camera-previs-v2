/* Local, real-time export of the paper canvas; no upload or server required. */
function createCanvasVideoExport({canvas, render, before, after, progress}) {
  let job=null;
  const supported=()=>typeof MediaRecorder!=='undefined'&&typeof canvas.captureStream==='function';
  function finish(j) {
    if(j.finished)return;
    j.finished=true;cancelAnimationFrame(j.frame);
    j.stream.getTracks().forEach(t=>t.stop());job=null;
    if(j.cancelled){after({cancelled:true,error:j.error});return;}
    if(!j.chunks.length){after({error:'浏览器没有生成视频，请重试。'});return;}
    const type=j.recorder.mimeType||j.chunks[0].type;
    const ext=type.includes('mp4')?'mp4':'webm';
    after({blob:new Blob(j.chunks,{type}),ext,duration:j.duration});
  }
  function stop(cancelled=false,error='') {
    const j=job;if(!j||j.stopping)return;
    j.stopping=true;j.cancelled=cancelled;j.error=error;cancelAnimationFrame(j.frame);
    if(j.recorder.state!=='inactive')j.recorder.stop();else finish(j);
  }
  function start(duration) {
    if(job)return;
    if(!supported()){after({error:'当前浏览器不支持导出视频，请在新版 Chrome 或 Edge 中打开此页面。'});return;}
    let stream;
    try {
      before();render(0);
      stream=canvas.captureStream(24);
      const candidates=['video/mp4;codecs=avc1.42001E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
      let recorder=null;
      for(const mimeType of candidates) {
        if(!MediaRecorder.isTypeSupported(mimeType))continue;
        try{recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:6000000});break;}catch(e){}
      }
      if(!recorder)throw Error('当前浏览器没有可用的视频编码器。');
      const j=job={recorder,stream,duration,chunks:[],frame:0,stopping:false,finished:false,cancelled:false,pausedAt:null,pausedMs:0,time:0};
      recorder.ondataavailable=e=>{if(e.data.size)j.chunks.push(e.data);};
      recorder.onstop=()=>finish(j);
      recorder.onerror=()=>stop(true,'浏览器编码失败，请重试或换用 Chrome。');
      recorder.start(1000);
      const startTime=performance.now();
      function tick(now) {
        if(job!==j||j.stopping)return;
        if(j.pausedAt!==null){j.frame=requestAnimationFrame(tick);return;}
        const t=Math.min((now-startTime-j.pausedMs)/1000,duration);j.time=t;
        render(Math.min(t,duration-1e-6));progress(t,duration);
        if(t>=duration)stop();else j.frame=requestAnimationFrame(tick);
      }
      if(document.hidden){j.pausedAt=performance.now();recorder.pause();progress(0,duration,true);}
      j.frame=requestAnimationFrame(tick);
    } catch(e) {
      if(stream)stream.getTracks().forEach(t=>t.stop());job=null;
      after({error:e.message||'无法开始导出视频。'});
    }
  }
  document.addEventListener('visibilitychange',()=>{
    const j=job;if(!j||j.stopping)return;
    if(document.hidden&&j.pausedAt===null){
      j.pausedAt=performance.now();if(j.recorder.state==='recording')j.recorder.pause();progress(j.time,j.duration,true);
    }else if(!document.hidden&&j.pausedAt!==null){
      j.pausedMs+=performance.now()-j.pausedAt;j.pausedAt=null;
      if(j.recorder.state==='paused')j.recorder.resume();progress(j.time,j.duration,false);
    }
  });
  return {start,cancel:()=>stop(true),supported,isRunning:()=>!!job};
}
