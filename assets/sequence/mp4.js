/* Minimal single-track, constant-frame-rate AVC MP4 writer. No audio, no B frames. */
(function(root){'use strict';
const u8=(...x)=>new Uint8Array(x),u16=n=>u8(n>>>8,n),u32=n=>u8(n>>>24,n>>>16,n>>>8,n),zero=n=>new Uint8Array(n),str=s=>new TextEncoder().encode(s);
function join(...a){const out=new Uint8Array(a.reduce((n,x)=>n+x.length,0));let p=0;for(const x of a){out.set(x,p);p+=x.length;}return out;}
const box=(name,...a)=>{const content=join(...a);return join(u32(content.length+8),str(name),content);};
const full=(name,version,flags,...a)=>box(name,u8(version,flags>>>16,flags>>>8,flags),...a);
const matrix=join(u32(0x10000),u32(0),u32(0),u32(0),u32(0x10000),u32(0),u32(0),u32(0),u32(0x40000000));
function mux(samples,avcc,width,height,fps){
 if(!samples.length||!avcc?.length)throw Error('No AVC samples or decoder configuration');
 for(let i=1;i<samples.length;i++)if(samples[i].timestamp<=samples[i-1].timestamp)throw Error('Encoder returned reordered frames; MP4 writer requires real-time AVC');
 const ftyp=box('ftyp',str('isom'),u32(512),str('isomiso2avc1mp41')),mdat=box('mdat',...samples.map(x=>x.bytes)),duration=samples.length*1000,scale=fps*1000;
 const mvhd=full('mvhd',0,0,u32(0),u32(0),u32(scale),u32(duration),u32(0x10000),u16(0x100),zero(10),matrix,zero(24),u32(2));
 const tkhd=full('tkhd',0,7,u32(0),u32(0),u32(1),u32(0),u32(duration),zero(8),u16(0),u16(0),u16(0),u16(0),matrix,u32(width*65536),u32(height*65536));
 const mdhd=full('mdhd',0,0,u32(0),u32(0),u32(scale),u32(duration),u16(0x55c4),u16(0));
 const hdlr=full('hdlr',0,0,u32(0),str('vide'),zero(12),str('Camera Previs\0'));
 const avc1=box('avc1',zero(6),u16(1),zero(16),u16(width),u16(height),u32(0x480000),u32(0x480000),u32(0),u16(1),zero(32),u16(24),u16(65535),box('avcC',avcc));
 const stsd=full('stsd',0,0,u32(1),avc1),stts=full('stts',0,0,u32(1),u32(samples.length),u32(1000));
 const stsc=full('stsc',0,0,u32(1),u32(1),u32(samples.length),u32(1));
 const stsz=full('stsz',0,0,u32(0),u32(samples.length),...samples.map(s=>u32(s.bytes.length)));
 const stco=full('stco',0,0,u32(1),u32(ftyp.length+8)),sync=samples.flatMap((s,i)=>s.key?[i+1]:[]),stss=full('stss',0,0,u32(sync.length),...sync.map(u32));
 const stbl=box('stbl',stsd,stts,stsc,stsz,stco,stss),dinf=box('dinf',full('dref',0,0,u32(1),full('url ',0,1)));
 const minf=box('minf',full('vmhd',0,1,zero(8)),dinf,stbl),mdia=box('mdia',mdhd,hdlr,minf);
 return join(ftyp,mdat,box('moov',mvhd,box('trak',tkhd,mdia)));
}
root.PrevisMP4={mux};
})(typeof window!=='undefined'?window:globalThis);
