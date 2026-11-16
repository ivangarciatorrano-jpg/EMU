/* ---------- JUEGOS ---------- */
const GM_LIST=[
 {id:"snake",e:"🐍",n:"Serpiente",d:"Come, crece y no te muerdas",c:"#16A34A"},
 {id:"blocks",e:"🧱",n:"Bloques",d:"Encaja piezas y completa líneas",c:"#6366F1"},
 {id:"brick",e:"🏓",n:"Rompeladrillos",d:"Rebota la bola y rompe el muro",c:"#F59E0B"},
 {id:"g2048",e:"🔢",n:"2048",d:"Desliza y junta números iguales",c:"#CA8A04"},
 {id:"bird",e:"🐤",n:"Pajarito",d:"Toca para volar entre tubos",c:"#0EA5E9"},
 {id:"mines",e:"💣",n:"Buscaminas",d:"Despeja el campo sin pisar minas",c:"#64748B",low:true,unit:"s"}
];
let GMREC={},GMRECP=null;
function gmRecLoad(){if(GMRECP===profile)return;GMRECP=profile;try{GMREC=JSON.parse(localStorage.getItem("gfGames_"+profile)||"{}")}catch(e){GMREC={}}
  try{if(dbRaw){const d=dbRaw.doc("profiles/"+profile+"/ajustes/juegos");const p=d.get&&d.get();p&&p.then&&p.then(s=>{const o=s&&s.exists?JSON.parse(JSON.stringify(s.data()||{})):{};const r=o.rec||{};let ch=false;for(const k in r){const L=(GM_LIST.find(g=>g.id===k)||{}).low;if(GMREC[k]==null||(L?r[k]<GMREC[k]:r[k]>GMREC[k])){GMREC[k]=r[k];ch=true}}if(ch){try{localStorage.setItem("gfGames_"+profile,JSON.stringify(GMREC))}catch(e){}if(curApp==="juegos")renderJuegos()}}).catch(()=>{})}}catch(e){}}
function gmRecSave(id,v){const L=(GM_LIST.find(g=>g.id===id)||{}).low;if(!(v>0))return false;if(GMREC[id]!=null&&(L?v>=GMREC[id]:v<=GMREC[id]))return false;GMREC[id]=v;
  try{localStorage.setItem("gfGames_"+profile,JSON.stringify(GMREC))}catch(e){}
  try{if(dbRaw)dbRaw.doc("profiles/"+profile+"/ajustes/juegos").set({rec:GMREC,at:Date.now()})}catch(e){}return true}
/* ---- ROM library (IndexedDB, only on this device) ---- */
let NESDBP=null;function nesDB(){if(NESDBP)return NESDBP;NESDBP=new Promise((ok,ko)=>{try{const r=indexedDB.open("gfNes",2);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains("cores"))d.createObjectStore("cores",{keyPath:"id"});if(!d.objectStoreNames.contains("roms"))d.createObjectStore("roms",{keyPath:"id"});if(!d.objectStoreNames.contains("saves"))d.createObjectStore("saves",{keyPath:"id"})};r.onsuccess=()=>{const d=r.result;d.onversionchange=()=>{try{d.close()}catch(_){}NESDBP=null};ok(d)};r.onerror=()=>{NESDBP=null;ko(r.error)};r.onblocked=()=>{}}catch(e){NESDBP=null;ko(e)}});NESDBP.catch(()=>{NESDBP=null});return NESDBP}
async function nesTx(store,mode,fn){const d=await Promise.race([nesDB(),new Promise((_,ko)=>setTimeout(()=>ko(new Error("idb timeout")),2500))]);return new Promise((ok,ko)=>{const t=d.transaction(store,mode),s=t.objectStore(store);let out;const q=fn(s);if(q)q.onsuccess=()=>{out=q.result};t.oncomplete=()=>ok(out);t.onerror=()=>ko(t.error)})}
let NESROMS=null;
async function nesList(){let loc=[];try{const all=await nesTx("roms","readonly",s=>s.getAll());loc=(all||[]).map(({data,...r})=>r)}catch(e){}Object.values(EMU_ROM_MEM).forEach(({data,...r})=>{if(!loc.some(x=>x.id===r.id))loc.push(r)});const L=loc.map(r=>({...r,cloud:GMCLOUD.roms.some(x=>x.id===r.id)}));GMCLOUD.roms.forEach(c=>{if(!L.some(x=>x.id===c.id))L.push({id:c.id,sys:c.sys||"nes",name:c.name,size:c.size,added:c.added||c.at,last:c.last||0,plays:c.plays||0,rate:c.rate||0,cloud:true,remote:true})});NESROMS=L.sort((a,b)=>(b.last||b.added)-(a.last||a.added));if(curApp==="juegos")renderJuegos()}
const gmNiceName=f=>f.replace(/\.(nes|zip|sfc|smc|fig|swc|gbc?|sgb|gba|md|gen|smd|bin|sms)$/i,"").replace(/[_\.]+/g," ").replace(/\s*[\(\[].*?[\)\]]\s*/g," ").replace(/\s+/g," ").trim()||f;
async function nesAddFiles(files){let n=0,bad=0;for(const f of files){if(f.size>4*1024*1024){bad++;continue}const buf=new Uint8Array(await f.arrayBuffer());
    if(!(buf[0]===0x4E&&buf[1]===0x45&&buf[2]===0x53&&buf[3]===0x1A)){bad++;continue}
    const id="r"+f.size+"_"+f.name.replace(/[^a-z0-9]/gi,"").slice(0,40);
    try{await nesTx("roms","readwrite",s=>s.put({id,name:gmNiceName(f.name),file:f.name,size:f.size,added:Date.now(),data:buf}));n++}catch(e){bad++}}
  toast(n?`${n} juego${n>1?"s":""} añadido${n>1?"s":""} a tu consola.`:bad?"Ese archivo no es un juego de NES (.nes).":"");await nesList()}
/* ---- launcher view ---- */
/* ---------- CONSOLAS (wasm cores installed once by the user) ---------- */
const EMU_SYS={
 nes:{n:"NES",e:"🎮",ext:["nes"],eng:"jsnes",c:"#DC2626"},
 snes:{n:"Super Nintendo",e:"🟣",ext:["sfc","smc","fig","swc"],eng:"snes9x",c:"#7C3AED"},
 gb:{n:"Game Boy / Color",e:"🟩",ext:["gb","gbc","sgb"],eng:"mgba",c:"#16A34A"},
 gba:{n:"Game Boy Advance",e:"🟦",ext:["gba"],eng:"mgba",c:"#4F46E5"},
 md:{n:"Mega Drive",e:"⚫",ext:["md","gen","smd","bin"],eng:"blastem",c:"#111827"},
 sms:{n:"Master System",e:"🔴",ext:["sms"],eng:"blastem",c:"#B91C1C"}};
const EMU_ENG={
 snes9x:{pkg:"@wasm-gaming/snes9x-wasm@0.2.0",dir:"dist/snes9x",sdk:"snes9x.sdk.js",wasm:"snes9x.wasm",size:2153535,n:"Super Nintendo",mb:"2,1 MB"},
 mgba:{pkg:"@wasm-gaming/mgba-wasm@0.2.1",dir:"dist/mgba",sdk:"mgba.sdk.js",wasm:"mgba.wasm",size:810352,n:"Game Boy, Color y Advance",mb:"0,8 MB"},
 blastem:{pkg:"@wasm-gaming/blastem-wasm@0.1.3",dir:"dist/blastem",sdk:"blastem.sdk.js",wasm:"blastem.wasm",size:31436806,n:"Mega Drive y Master System",mb:"31 MB"}};
const emuBase=k=>`https://cdn.jsdelivr.net/npm/${EMU_ENG[k].pkg}/${EMU_ENG[k].dir}/`;
const emuWasmUrl=k=>emuBase(k)+EMU_ENG[k].wasm;
const EMU_KEYS={
 snes9x:{up:"ArrowUp",down:"ArrowDown",left:"ArrowLeft",right:"ArrowRight",a:"KeyS",b:"KeyX",x:"KeyA",y:"KeyZ",l:"KeyQ",r:"KeyW",start:"Enter",select:"ShiftRight"},
 mgba:{up:"ArrowUp",down:"ArrowDown",left:"ArrowLeft",right:"ArrowRight",a:"KeyX",b:"KeyZ",l:"KeyA",r:"KeyS",start:"Enter",select:"ShiftRight"},
 blastem:{up:"ArrowUp",down:"ArrowDown",left:"ArrowLeft",right:"ArrowRight",a:"KeyA",b:"KeyS",c:"KeyD",start:"Enter"}};
const EMU_PADS={
 nes:{face:[["b","B"],["a","A"]],mid:[["select","SELECT"],["start","START"]]},
 gb:{face:[["b","B"],["a","A"]],mid:[["select","SELECT"],["start","START"]]},
 gba:{face:[["b","B"],["a","A"]],mid:[["select","SELECT"],["start","START"]],sh:[["l","L"],["r","R"]]},
 snes:{diamond:true,face:[["y","Y"],["x","X"],["b","B"],["a","A"]],mid:[["select","SELECT"],["start","START"]],sh:[["l","L"],["r","R"]]},
 md:{face:[["a","A"],["b","B"],["c","C"]],mid:[["start","START"]],three:true},
 sms:{face:[["a","1"],["b","2"]],mid:[["start","START"],["pause","PAUSA"]]}};
/* the page cannot download from other sites: wasm the user installed is served from IndexedDB */
const EMU_BYTES=new Map();
(function(){try{const of=window.fetch.bind(window);window.fetch=function(u,o){const k=typeof u==="string"?u:(u&&(u.href||u.url));if(k&&EMU_BYTES.has(k))return Promise.resolve(new Response(EMU_BYTES.get(k),{headers:{"Content-Type":"application/wasm"}}));const eng=k&&Object.keys(EMU_ENG).find(e=>emuWasmUrl(e)===k);if(eng)return of(u,o).then(async r=>{if(!r.ok)return r;const b=await r.arrayBuffer();try{nesTx("cores","readwrite",s=>s.put({id:eng,size:b.byteLength,at:Date.now(),data:new Uint8Array(b)})).then(emuCoresLoad)}catch(e){}return new Response(b,{headers:{"Content-Type":"application/wasm"}})});return of(u,o)}}catch(e){}
  try{const AC=window.AudioContext||window.webkitAudioContext;if(AC){const W=function(...a){const c=new AC(...a);(window.__gmACs=window.__gmACs||[]).push(c);if(window.__gmACs.length>6)window.__gmACs.shift();return c};W.prototype=AC.prototype;Object.setPrototypeOf(W,AC);window.AudioContext=W}}catch(e){}})();
const emuWake=()=>{try{(window.__gmACs||[]).forEach(c=>c.state==="suspended"&&c.resume())}catch(e){}};
let EMUCORES={};
async function emuCoresLoad(){EMUCORES={};try{const all=await nesTx("cores","readonly",s=>s.getAll());(all||[]).forEach(c=>EMUCORES[c.id]={size:c.size,at:c.at,local:true})}catch(e){}Object.keys(EMU_CORE_MEM).forEach(k=>EMUCORES[k]={size:EMU_CORE_MEM[k].length,local:true});Object.keys(GMCLOUD.cores).forEach(k=>{EMUCORES[k]={...(EMUCORES[k]||{}),cloud:true}})}
const emuSysOf=f=>{const x=(f.split(".").pop()||"").toLowerCase();return Object.keys(EMU_SYS).find(k=>EMU_SYS[k].ext.includes(x))||null};
/* ---------- archives: .zip (DecompressionStream) and .7z (own LZMA/LZMA2 decoder) ---------- */
function lzmaDecoder(outSize){
  const out=new Uint8Array(outSize);let outPos=0;let dictStart=0;
  let lc=3,lp=0,pb=2;let probs=null;let state=0,rep0=0,rep1=0,rep2=0,rep3=0;
  let inb=null,ip=0,range=0,code=0;
  const initRC=()=>{range=0xFFFFFFFF;code=0;ip++;for(let i=0;i<4;i++)code=((code<<8)|inb[ip++])>>>0};
  const norm=()=>{if(range<0x1000000){range=(range<<8)>>>0;code=((code<<8)|inb[ip++])>>>0}};
  const bit=(i)=>{const p=probs[i];const b=(range>>>11)*p>>>0;if(code<b){range=b;probs[i]=p+((2048-p)>>5);norm();return 0}range=(range-b)>>>0;code=(code-b)>>>0;probs[i]=p-(p>>5);norm();return 1};
  const direct=(n)=>{let r=0;for(;n>0;n--){range=range>>>1;let t=(code-range)>>>0;let m=(code<range)?0:1;if(m)code=t;r=((r<<1)|m)>>>0;norm()}return r};
  // prob layout
  let P_ISMATCH,P_ISREP,P_ISREPG0,P_ISREPG1,P_ISREPG2,P_ISREP0LONG,P_POSSLOT,P_SPECPOS,P_ALIGN,P_LEN,P_REPLEN,P_LIT;
  const LEN_SIZE=2+16*8+16*8+256;
  const setProps=(c,l,p)=>{lc=c;lp=l;pb=p;let o=0;P_ISMATCH=o;o+=192;P_ISREP=o;o+=12;P_ISREPG0=o;o+=12;P_ISREPG1=o;o+=12;P_ISREPG2=o;o+=12;P_ISREP0LONG=o;o+=192;P_POSSLOT=o;o+=256;P_SPECPOS=o;o+=114;P_ALIGN=o;o+=16;P_LEN=o;o+=LEN_SIZE;P_REPLEN=o;o+=LEN_SIZE;P_LIT=o;o+=0x300<<(lc+lp);probs=new Uint16Array(o)};
  const resetState=()=>{probs.fill(1024);state=0;rep0=rep1=rep2=rep3=0};
  const bitTree=(base,nb)=>{let m=1;for(let i=0;i<nb;i++)m=(m<<1)|bit(base+m);return m-(1<<nb)};
  const revTree=(base,nb)=>{let m=1,s=0;for(let i=0;i<nb;i++){const b=bit(base+m);m=(m<<1)|b;s|=b<<i}return s};
  const len=(base,posState)=>{if(!bit(base))return bitTree(base+2+posState*8,3);if(!bit(base+1))return 8+bitTree(base+2+128+posState*8,3);return 16+bitTree(base+2+256,8)};
  const decodeChunk=(src,start,unpack,allowEnd)=>{inb=src;ip=start;initRC();const end=outPos+unpack;
    while(outPos<end||allowEnd){if(!allowEnd&&outPos>=end)break;
      const posState=outPos&((1<<pb)-1);
      if(!bit(P_ISMATCH+(state<<4)+posState)){
        const prev=outPos>dictStart?out[outPos-1]:0;const lb=P_LIT+0x300*(((outPos&((1<<lp)-1))<<lc)+(prev>>(8-lc)));
        let s=1;if(state>=7){let mb=out[outPos-rep0-1];while(s<0x100){const m=(mb>>7)&1;mb<<=1;const b=bit(lb+((1+m)<<8)+s);s=(s<<1)|b;if(m!==b)break}}
        while(s<0x100)s=(s<<1)|bit(lb+s);out[outPos++]=s&0xFF;state=state<4?0:state<10?state-3:state-6;continue}
      let l;
      if(bit(P_ISREP+state)){if(outPos===dictStart)throw new Error("lzma data");
        if(!bit(P_ISREPG0+state)){if(!bit(P_ISREP0LONG+(state<<4)+posState)){state=state<7?9:11;out[outPos]=out[outPos-rep0-1];outPos++;continue}}
        else{let d;if(!bit(P_ISREPG1+state)){d=rep1}else{if(!bit(P_ISREPG2+state)){d=rep2}else{d=rep3;rep3=rep2}rep2=rep1}rep1=rep0;rep0=d}
        l=len(P_REPLEN,posState);state=state<7?8:11}
      else{rep3=rep2;rep2=rep1;rep1=rep0;l=len(P_LEN,posState);state=state<7?7:10;
        const ls=l<3?l:3;const slot=bitTree(P_POSSLOT+(ls<<6),6);
        if(slot<4)rep0=slot;else{const nd=(slot>>1)-1;let d=((2|(slot&1))<<nd)>>>0;
          if(slot<14)d=(d+revTree(P_SPECPOS+d-slot,nd))>>>0;else{d=(d+(direct(nd-4)<<4))>>>0;d=(d+revTree(P_ALIGN,4))>>>0}
          if(d===0xFFFFFFFF){if(allowEnd)return;throw new Error("lzma end")}rep0=d}
        if(rep0>=outPos-dictStart&&rep0>=outPos)throw new Error("lzma dist")}
      l+=2;if(outPos+l>out.length)l=out.length-outPos;for(let i=0;i<l;i++){out[outPos]=out[outPos-rep0-1];outPos++}
      if(allowEnd&&outPos>=out.length)return}};
  return{out,get pos(){return outPos},setProps,resetState,decodeChunk,
    copy(src,start,n){out.set(src.subarray(start,start+n),outPos);outPos+=n},
    propsByte(b){const c=b%9,r=(b/9)|0,l=r%5,p=(r/5)|0;setProps(c,l,p)}}}
function lzmaDecode(src,props,outSize){const D=lzmaDecoder(outSize);D.propsByte(props[0]);D.resetState();D.decodeChunk(src,0,outSize,false);return D.out}
function lzma2Decode(src,outSize){const D=lzmaDecoder(outSize);let i=0,needProps=true;
  while(i<src.length){const c=src[i++];if(c===0)break;
    if(c<0x80){const n=((src[i]<<8)|src[i+1])+1;i+=2;D.copy(src,i,n);i+=n;continue}
    const unp=(((c&0x1F)<<16)|(src[i]<<8)|src[i+1])+1;const pk=((src[i+2]<<8)|src[i+3])+1;i+=4;const mode=(c>>5)&3;
    if(mode>=2){D.propsByte(src[i++]);needProps=false}
    if(needProps)throw new Error("lzma2 props");
    if(mode>=1)D.resetState();
    D.decodeChunk(src,i,unp,false);i+=pk}
  return D.out.subarray(0,D.pos)}
function bcjX86(data){const T=b=>(((b+1)&0xFE)===0);let size=data.length;if(size<5)return data;let pos=0,mask=0;const ip=5;size-=4;
  for(;;){let p=pos;while(p<size&&(data[p]&0xFE)!==0xE8)p++;const d=p-pos;pos=p;if(p>=size)break;
    if(d>2)mask=0;else{mask>>>=d;if(mask!==0&&(mask>4||mask===3||T(data[p+(mask>>>1)+1]))){mask=(mask>>>1)|4;pos++;continue}}
    if(T(data[p+4])){let v=((data[p+4]<<24)|(data[p+3]<<16)|(data[p+2]<<8)|data[p+1])>>>0;const cur=(ip+pos)>>>0;pos+=5;v=(v-cur)>>>0;
      if(mask!==0){const sh=(mask&6)<<2;if(T((v>>>sh)&0xFF)){v=(v^(((0x100<<sh)>>>0)-1))>>>0;v=(v-cur)>>>0}mask=0}
      data[p+1]=v&0xFF;data[p+2]=(v>>>8)&0xFF;data[p+3]=(v>>>16)&0xFF;data[p+4]=(0-((v>>>24)&1))&0xFF}
    else{mask=(mask>>>1)|4;pos++}}return data}
function sevenZipFiles(buf){const u=buf;const dv=new DataView(u.buffer,u.byteOffset,u.byteLength);
  if(!(u[0]===0x37&&u[1]===0x7A&&u[2]===0xBC&&u[3]===0xAF&&u[4]===0x27&&u[5]===0x1C))throw new Error("no 7z");
  const nhOff=32+Number(dv.getBigUint64(12,true)),nhSize=Number(dv.getBigUint64(20,true));
  const R=(b,p)=>({b,p,byte(){return this.b[this.p++]},num(){const f=this.b[this.p++];let mask=0x80,v=0;for(let i=0;i<8;i++){if(!(f&mask)){const hi=f&(mask-1);return v+hi*Math.pow(2,8*i)}v+=this.b[this.p++]*Math.pow(2,8*i);mask>>=1}return v},
    bits(n){const a=[];let m=0,cur=0;for(let i=0;i<n;i++){if(!m){cur=this.b[this.p++];m=0x80}a.push(!!(cur&m));m>>=1}return a},
    defs(n){const all=this.byte();return all?Array(n).fill(true):this.bits(n)}});
  const readStreams=(r)=>{const S={packPos:0,packSizes:[],folders:[],unpackSizes:[],subCounts:null,subSizes:null};let id;
    while((id=r.byte())!==0){
      if(id===0x06){S.packPos=r.num();const n=r.num();let t;while((t=r.byte())!==0){if(t===0x09)for(let i=0;i<n;i++)S.packSizes.push(r.num());else if(t===0x0A){const d=r.defs(n);d.forEach(x=>{if(x)r.p+=4})}}}
      else if(id===0x07){let t=r.byte();if(t!==0x0B)throw new Error("7z folder");const nf=r.num();if(r.byte()!==0)throw new Error("7z ext");
        for(let f=0;f<nf;f++){const nc=r.num();const coders=[];let tin=0,tout=0;for(let c=0;c<nc;c++){const fl=r.byte();const id=[...r.b.subarray(r.p,r.p+(fl&0xF))].map(x=>x.toString(16).padStart(2,"0")).join("");r.p+=fl&0xF;let ni=1,no=1;if(fl&0x10){ni=r.num();no=r.num()}let props=null;if(fl&0x20){const ps=r.num();props=r.b.slice(r.p,r.p+ps);r.p+=ps}coders.push({id,ni,no,props});tin+=ni;tout+=no}
          const bp=[];for(let i=0;i<tout-1;i++)bp.push([r.num(),r.num()]);const npk=tin-bp.length;if(npk>1)for(let i=0;i<npk;i++)r.num();S.folders.push({coders,tout,bp})}
        while((t=r.byte())!==0){if(t===0x0C){S.folders.forEach(f=>{f.sizes=[];for(let i=0;i<f.tout;i++)f.sizes.push(r.num())})}else if(t===0x0A){const d=r.defs(nf);d.forEach(x=>{if(x)r.p+=4})}}}
      else if(id===0x08){let t;S.subCounts=S.folders.map(()=>1);while((t=r.byte())!==0){
          if(t===0x0D){S.subCounts=S.folders.map(()=>r.num())}
          else if(t===0x09){S.subSizes=[];S.folders.forEach((f,i)=>{const n=S.subCounts[i];if(!n)return;let sum=0;for(let k=0;k<n-1;k++){const s=r.num();S.subSizes.push(s);sum+=s}S.subSizes.push(folderSize(f)-sum)})}
          else if(t===0x0A){const nd=S.subCounts.reduce((a,b)=>a+b,0);const d=r.defs(nd);d.forEach(x=>{if(x)r.p+=4})}}}}
    return S};
  const folderSize=f=>{const bound=new Set(f.bp.map(x=>x[1]));for(let i=f.sizes.length-1;i>=0;i--)if(!bound.has(i))return f.sizes[i];return f.sizes[0]};
  const decodeFolder=(S,fi)=>{let off=32+S.packPos;for(let i=0;i<fi;i++)off+=S.packSizes[i];const f=S.folders[fi];const src=u.subarray(off,off+S.packSizes[fi]);const size=folderSize(f);
    const dec=(c,n)=>{if(c.id==="00")return src.slice(0,n);if(c.id==="030101")return lzmaDecode(src,c.props,n);if(c.id==="21")return lzma2Decode(src,n);
      if(c.id==="06f10701")throw new Error("7z con contraseña");throw new Error("7z: método "+c.id+" no soportado (usa LZMA/LZMA2)")};
    if(f.coders.length===1)return dec(f.coders[0],size);
    const bi=f.coders.findIndex(c=>c.id==="03030103");if(f.coders.length===2&&bi>=0){const ci=1-bi;const raw=dec(f.coders[ci],f.sizes[ci]);return bcjX86(raw.length===f.sizes[bi]?raw:raw.slice(0,f.sizes[bi]))}
    throw new Error("7z: compresión no soportada (filtros)")};
  let r=R(u,nhOff);let t=r.byte();
  if(t===0x17){const S=readStreams(r);const hb=decodeFolder(S,0);r=R(hb,0);t=r.byte()}
  if(t!==0x01)throw new Error("7z header");
  let S=null,names=[],empty=[];let id;
  while((id=r.byte())!==0){
    if(id===0x02||id===0x03){let x;while((x=r.byte())!==0){const s=r.num();r.p+=s}}
    else if(id===0x04)S=readStreams(r);
    else if(id===0x05){const nfiles=r.num();empty=Array(nfiles).fill(false);let pt;
      while((pt=r.byte())!==0){const sz=r.num();const e=r.p+sz;
        if(pt===0x11){r.p++;let s="";names=[];while(names.length<nfiles&&r.p<e){const ch=r.b[r.p]|(r.b[r.p+1]<<8);r.p+=2;if(ch===0){names.push(s);s=""}else s+=String.fromCharCode(ch)}}
        else if(pt===0x0E){empty=r.bits(nfiles)}
        r.p=e}}}
  const files=[];if(!S)return files;let fi=0,si=0,inF=0,folderData=null,fOff=0;
  const counts=S.subCounts||S.folders.map(()=>1);const sizes=S.subSizes||S.folders.map(folderSize);
  for(let i=0;i<names.length;i++){if(empty[i])continue;
    while(fi<S.folders.length&&inF>=counts[fi]){fi++;inF=0;folderData=null;fOff=0}
    if(fi>=S.folders.length)break;
    const size=sizes[si++];const name=names[i];const f=fi;const off=fOff;inF++;fOff+=size;
    files.push({name,size,get:(()=>{let cache=null;return()=>{if(!folderData||folderData.f!==f){folderData={f,d:decodeFolder(S,f)}}return folderData.d.subarray(off,off+size)}})()})}
  return files}
async function zipFiles(u){const dv=new DataView(u.buffer,u.byteOffset,u.byteLength);let e=-1;for(let i=u.length-22;i>=Math.max(0,u.length-70000);i--)if(dv.getUint32(i,true)===0x06054b50){e=i;break}
  if(e<0)throw new Error("zip");const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const out=[];
  for(let k=0;k<n;k++){if(dv.getUint32(p,true)!==0x02014b50)break;const meth=dv.getUint16(p+10,true),csz=dv.getUint32(p+20,true),usz=dv.getUint32(p+24,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),lo=dv.getUint32(p+42,true);
    const name=new TextDecoder().decode(u.subarray(p+46,p+46+nl));p+=46+nl+xl+cl;if(name.endsWith("/"))continue;
    const ds=lo+30+dv.getUint16(lo+26,true)+dv.getUint16(lo+28,true);const raw=u.subarray(ds,ds+csz);
    out.push({name,size:usz,get:async()=>{if(meth===0)return raw.slice();if(meth!==8)throw new Error("zip método "+meth);
      const st=new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));return new Uint8Array(await new Response(st).arrayBuffer())}})}
  return out}
async function arcExpand(file){const u=new Uint8Array(await file.arrayBuffer());const x=(file.name.split(".").pop()||"").toLowerCase();
  let list;if(x==="7z"||(u[0]===0x37&&u[1]===0x7A&&u[2]===0xBC))list=sevenZipFiles(u);else if(x==="zip"||(u[0]===0x50&&u[1]===0x4B))list=await zipFiles(u);else return null;
  const outF=[];for(const it of list){const base=it.name.split(/[\\/]/).pop();if(!emuSysOf(base)&&!/\.nes$/i.test(base))continue;if(it.size>48*1024*1024)continue;
    const d=await it.get();outF.push(new File([d],base))}
  return outF}

async function romAddFiles(files0){let n=0,bad=[],cores=0;const files=[];
  for(const f of files0){if(/\.(7z|zip)$/i.test(f.name)){toast("📦 Descomprimiendo "+f.name+"…");try{const xs=await arcExpand(f);if(xs&&xs.length)files.push(...xs);else{bad.push(f.name);toast("Ese archivo comprimido no tiene juegos que el Hub entienda.")}}catch(e){bad.push(f.name);toast("No pude abrir "+f.name+": "+String(e&&e.message||e).slice(0,80))}}else files.push(f)}
  const up=[];
  for(const f of files){const buf=new Uint8Array(await f.arrayBuffer());
    if(buf[0]===0&&buf[1]===0x61&&buf[2]===0x73&&buf[3]===0x6D){const k=Object.keys(EMU_ENG).find(k=>EMU_ENG[k].size===buf.length)||Object.keys(EMU_ENG).find(k=>f.name.toLowerCase().includes(k.replace(/\d+x?$/,"")));
      if(!k){bad.push(f.name);continue}try{await nesTx("cores","readwrite",s=>s.put({id:k,size:buf.length,at:Date.now(),data:buf}))}catch(e){}EMU_CORE_MEM[k]=buf;cores++;toast(`✅ Consola instalada: ${EMU_ENG[k].n}.`);
      if(!GMCLOUD.cores[k])up.push(()=>cloudPut("core",k,buf,{eng:k},"la consola "+EMU_ENG[k].n));continue}
    let sys=emuSysOf(f.name);if(buf[0]===0x4E&&buf[1]===0x45&&buf[2]===0x53&&buf[3]===0x1A)sys="nes";
    if(!sys||f.size>48*1024*1024){bad.push(f.name);continue}
    const id="r"+f.size+"_"+f.name.replace(/[^a-z0-9]/gi,"").slice(0,40);const rec={id,sys,name:gmNiceName(f.name),file:f.name,size:buf.length,added:Date.now(),data:buf};
    try{await nesTx("roms","readwrite",s=>s.put(rec))}catch(e){}EMU_ROM_MEM[id]=rec;n++;
    if(!GMCLOUD.roms.some(x=>x.id===id)&&buf.length<=40*1024*1024)up.push(()=>cloudPut("rom",id,buf,{name:rec.name,sys,file:f.name,added:rec.added},rec.name))}
  if(n)toast(`${n} juego${n>1?"s":""} añadido${n>1?"s":""} a tu consola.`);else if(bad.length&&!cores)toast("No reconozco ese archivo. Usa juegos .nes .sfc .gb .gbc .gba .md .bin .sms, .zip/.7z o el motor .wasm");
  await emuCoresLoad();await nesList();
  for(const u of up){await u();}if(up.length){toast("☁️ Guardado en tu nube: ya lo tienes en cualquier móvil.");await nesList()}}
async function romPlay(id){const r=(NESROMS||[]).find(x=>x.id===id);const sys=(r&&r.sys)||"nes";if(GMBUSY){toast(GMBUSY);return}
  if(r&&r.remote){try{await gmEnsureRom(id);r.remote=false}catch(e){toast("No pude bajar el juego de tu nube: "+(e.message||e));return}}
  if(sys==="nes"){nesOpen(id);return}
  

  emuOpen(id)}
let EMU=null;
const smsSwap=()=>{try{return localStorage.getItem("gjSmsSwap")==="1"}catch(e){return false}};
function emuPadHTML(sys){let p=EMU_PADS[sys]||EMU_PADS.nes;if(sys==="sms"&&smsSwap())p={...p,face:[["a","2"],["b","1"]]};
  const sh=p.sh?`<div class="gm-sh">${p.sh.map(([k,l])=>`<button data-gk="${k}">${l}</button>`).join("")}</div>`:"";
  const face=p.diamond?`<div class="gm-dia">${p.face.map(([k,l])=>`<button data-gk="${k}" class="ab f-${k}">${l}</button>`).join("")}</div>`:`<div class="gm-ab${p.three?" three":""}">${p.face.map(([k,l])=>`<button data-gk="${k}" class="ab">${l}</button>`).join("")}</div>`;
  return `${sh}<div class="gm-dpad">${[["up","▲"],["left","◀"],["right","▶"],["down","▼"]].map(([k,l])=>`<button data-gk="${k}" class="d-${k}">${l}</button>`).join("")}</div><div class="gm-mid">${p.mid.map(([k,l])=>`<button data-gk="${k}" class="sm">${l}</button>`).join("")}</div>${face}`}
const KC={ArrowUp:38,ArrowDown:40,ArrowLeft:37,ArrowRight:39,Enter:13,ShiftRight:16};
function emuKey(k,down){if(!EMU||!EMU.play)return;const code=(EMU.sys==="sms"?({...(smsSwap()?{a:"KeyD",b:"KeyS"}:{a:"KeyS",b:"KeyD"}),start:"KeyS",pause:"KeyZ"})[k]:null)||(EMU_KEYS[EMU.eng]||{})[k];if(!code)return;if(down)emuWake();
  const key=code.startsWith("Key")?code.slice(3).toLowerCase():code==="ShiftRight"?"Shift":code;const kc=KC[code]||(code.startsWith("Key")?code.charCodeAt(3):0);
  const ev=new KeyboardEvent(down?"keydown":"keyup",{code,key,bubbles:true,cancelable:true,location:code==="ShiftRight"?2:0});
  try{Object.defineProperty(ev,"keyCode",{get:()=>kc});Object.defineProperty(ev,"which",{get:()=>kc})}catch(e){}
  EMU.synth=true;try{window.dispatchEvent(ev);document.dispatchEvent(new KeyboardEvent(ev.type,{code,key,bubbles:false}))}catch(e){}EMU.synth=false}
async function emuOpen(id){gmEnsure();let rom,core;try{rom=await nesTx("roms","readonly",s=>s.get(id))}catch(e){}rom=rom||EMU_ROM_MEM[id];if(!rom){toast("No encuentro ese juego en este dispositivo.");return}
  const sys=rom.sys,eng=EMU_SYS[sys].eng;try{core=await nesTx("cores","readonly",s=>s.get(eng))}catch(e){}if(!core&&EMU_CORE_MEM[eng])core={data:EMU_CORE_MEM[eng]};
  GM={id:"emu",emu:true,nes:false,def:{e:EMU_SYS[sys].e,n:rom.name},g:{LW:256,LH:224},state:"play",rom:id};EMU={eng,sys,play:null,paused:false};
  $("#gm-t").textContent=EMU_SYS[sys].e+" "+rom.name;$("#gm-s").textContent=EMU_SYS[sys].n+" · cargando…";
  $("#gm-tx").innerHTML=`<button class="gm-ib sm" data-nesact="save" aria-label="Guardar partida">💾</button><button class="gm-ib sm" data-nesact="load" aria-label="Cargar partida">▶︎💾</button>`;
  $("#gm-pad").innerHTML=emuPadHTML(sys);if(sys==="sms")$("#gm-tx").insertAdjacentHTML("afterbegin",`<button class="gm-ib sm" data-smsswap aria-label="Cambiar botones 1 y 2">1⇄2</button>`);$("#gm-pad").dataset.kind="nes";$("#gm-ov").classList.add("nes","emu");$("#gm-stage").classList.add("nes");$("#gm-msg").hidden=true;
  let host=$("#gm-emu");if(!host){host=document.createElement("div");host.id="gm-emu";$("#gm-stage").appendChild(host)}host.innerHTML="";
  $("#gm-ov").hidden=false;document.body.classList.add("gm-on");emuWake();
  const fail=(t,s)=>{if(!GM||!GM.emu)return;$("#gm-s").textContent="";$("#gm-msg").innerHTML=`<div class="gm-box"><div class="gm-big">😕</div><b>${t}</b><span>${s||""}</span><div class="gm-bb"><button class="btn sec" data-gmx>Salir</button></div></div>`;$("#gm-msg").hidden=false};
  try{if(core)EMU_BYTES.set(emuWasmUrl(eng),core.data.buffer?core.data.buffer.slice(core.data.byteOffset,core.data.byteOffset+core.data.byteLength):core.data);if(!core)gmBusy("⬇️ Descargando la consola "+EMU_SYS[sys].n+" (solo la primera vez)…");
    const m=await import(emuBase(eng)+EMU_ENG[eng].sdk);const SDK=m.default||Object.values(m).find(v=>typeof v==="function"&&v.id);
    if(!GM||!GM.emu)return;const bytes=rom.data.slice?rom.data.slice(0):rom.data;
    let s=new SDK();s=s.assets({rom:()=>bytes});try{s=s.storage({namespace:id})}catch(e){}
    await emuSaveRestore(eng,id);if(!GM||!GM.emu)return;EMU.play=await s.mount(host).start();gmBusy(null);EMU.rom=id;
    if(!GM||!GM.emu){try{EMU&&EMU.play&&EMU.play.destroy()}catch(e){}return}
    try{EMU.play.on&&EMU.play.on("error",ev=>fail("El juego se ha detenido",String(ev&&ev.detail&&ev.detail.message||"").slice(0,120)))}catch(e){}
    $("#gm-s").textContent=EMU_SYS[sys].n+" · START para empezar";rom.last=Date.now();rom.plays=(rom.plays||0)+1;if(EMU_ROM_MEM[rom.id])Object.assign(EMU_ROM_MEM[rom.id],{last:rom.last,plays:rom.plays});cloudMetaSoon(rom);nesTx("roms","readwrite",s=>s.put(rom)).catch(()=>{})}
  catch(e){console.error(e);fail("No se pudo arrancar la consola",(navigator.onLine===false?"Necesitas conexión la primera vez. ":"")+String(e&&e.message||e).slice(0,140))}}
function emuPause(){if(!EMU||!EMU.play)return;if(EMU.paused){emuResume();return}EMU.paused=true;try{EMU.play.pause("hub")}catch(e){}$("[data-gmp]").textContent="▶︎";
  $("#gm-msg").innerHTML=`<div class="gm-box"><div class="gm-big">⏸</div><b>Pausa</b><div class="gm-bb"><button class="btn" data-gmres>Seguir</button><button class="btn sec" data-nesact="reset">Reiniciar</button></div></div>`;$("#gm-msg").hidden=false}
function emuResume(){if(!EMU)return;EMU.paused=false;try{EMU.play&&EMU.play.resume("hub")}catch(e){}emuWake();$("[data-gmp]").textContent="❚❚";$("#gm-msg").hidden=true}
function emuStop(){if(!EMU)return;const p=EMU.play,eng=EMU.eng,rid=EMU.rom;EMU=null;(async()=>{try{p&&p.flushSaves&&await p.flushSaves()}catch(e){}try{p&&await p.destroy()}catch(e){}if(p&&rid)emuSaveSync(eng,rid,null,true)})();const h=$("#gm-emu");if(h)h.innerHTML="";$("#gm-ov").classList.remove("emu")}
async function emuAct(a){if(!EMU||!EMU.play)return;const P=EMU.play;
  if(a==="reset"){try{await P.restart()}catch(e){}emuResume();return}
  if(a==="save"){try{await P.states.save(0);try{P.flushSaves&&await P.flushSaves()}catch(e){}const ok=await emuSaveSync(EMU.eng,EMU.rom,P);toast(ok?"💾 Partida guardada ☁️ (también en tu nube)":"💾 Partida guardada en este dispositivo.");$("#gm-s").textContent="Partida guardada"}catch(e){toast("No se pudo guardar la partida.")}return}
  if(a==="load"){try{await P.states.load(0);emuResume();toast("▶︎ Partida cargada.");$("#gm-s").textContent="Partida cargada"}catch(e){toast("Aún no has guardado partida de este juego.")}return}}
/* ---- free homebrew catalogue (links open outside: the page itself can't download) ---- */
const GM_CAT_REPO={nes:"nes-games",snes:"snes-games",gb:"gbc-games",gba:"gba-games",md:"md-games",sms:"sms-games"};
const GM_CAT={"nes":[["31 In 1 Real Game!","Mojon Twins","31in1realgame-multicart.nes",384],["3-In-1 2P Pak","SlyDog Studios","3in12ppak.nes",40],["Ambushed","SlyDog Studios","ambushed.nes",16],["Assimilate","Nessylum Games","assimilate.nes",256],["Babel Blox","SlyDog Studios","babelblox.nes",512],["Black Box Challenge","SlyDog Studios","blackboxchallenge.nes",512],["Bomb Array","SlyDog Studios","bombarray.nes",16],["Bootèe","Mojon Twins","bootee.nes",40],["Brony Blaster","FG Software","bronyblaster.nes",160],["Cheril The Goddess","Mojon Twins","cheril-the-goddess.nes",64],["Cl1k","SlyDog Studios","cl1k.nes",16],["Debris Dodger","SlyDog Studios","debrisdodger.nes",16],["Driar","Adolfsson, Eriksson","driar.nes",128],["Falling","Tragicmuffin (Jesse Williams)","falling.nes",40],["F-FF","Pubby","fff.nes",64],["Filthy Kitchen","Dustmop","filthykitchen.nes",64],["Flappy Bird","Nioreh","flappybird.nes",24],["Flappy Block","SlyDog Studios","flappyblock.nes",16],["Flappy Jack","Dougeff","flappyjack.nes",40],["For Points","SlyDog Studios","forpoints.nes",16],["GSM","SlyDog Studios","gsm.nes",16],["Indivisible On NES","KasumiDirect","indivisibleonnes.nes",256],["Invaders Must Die","Sebastian Mihai","invaders.nes",32],["Jet Paco - Space Agent!","Mojon Twins","jetpaco.nes",40],["K.Y.F.F.","SlyDog Studios","kyff.nes",40],["Lightshields","Zutano Games","lightshields.nes",24],["Lunar Limit","Pubby","lunarlimit.nes",40],["Mad Wizard","SlyDog Studios","madwizard.nes",40],["Mashymashy","Mitch3a","mashymashy.nes",24],["Mega Mountain","AdrianMakesGames, Damian Yerrick (pinoba","megamountain.nes",40],["Memory","SlyDog Studios","memory.nes",16],["Meteor Guard","SlyDog Studios","mguard.nes",16],["Meteor Guard 2","SlyDog Studios","mguard2.nes",16],["Midnight Jogger","SlyDog Studios","midnightjogger.nes",16],["Mineshaft","Nioreh","mineshaft.nes",24],["Mouser II","Tony Young","mouser2.nes",24],["Nesertbus","Redslash12","nesertbus.nes",24],["Ninja Muncher","SlyDog Studios","ninjamuncher.nes",16],["Nintencat: The Parody","SlyDog Studios","nintencattheparody.nes",40],["No Points","SlyDog Studios","nopoints.nes",16],["Nova The Squirrel","NovaSquirrel","novathesquirrel.nes",256],["Obstacle Trek","SlyDog Studios","obstacletrek.nes",16],["Pegs","SlyDog Studios","pegs.nes",40],["Pong 1K","SlyDog Studios","pong1k.nes",16],["Pong 1K 2P","SlyDog Studios","pong1k2p.nes",16],["Ralph 4","Pubby","ralph4.nes",24],["Rise Of Amondus","SlyDog Studios","riseofamondus.nes",128],["Robo-Ninja Climb","Nathan Tolbert","roboninjaclimb.nes",48],["RobotFindsKitten","Damian Yerrick (pinobatch)","robotfindskitten.nes",32],["Russian Roulette [Damian]","Damian Yerrick (pinobatch)","roulette.nes",24],["Sgt. Helmet - Training Day","Mojon Twins","sgthelmet.nes",40],["Simone Says","SlyDog Studios","simonesays.nes",16],["Sir Adabol Remastered","Mojon Twins","sir-ababol-remastered.nes",40],["Snail Maze","SlyDog Studios","snailmaze.nes",40],["Spacey Mcracey","Nathan Tolbert","spaceymcracey.nes",40],["Star Evil","Pubby","starevil.nes",40],["Super Pakpak","AOH Games","superpakpak.nes",64],["Super Tilt Bro.","Sylvain Gadrat","super-tilt-bro.nes",40],["Super Uwol","Mojon Twins","superuwol.nes",40],["That's Whack!","SlyDog Studios","thatswhack.nes",16],["The Invasion","SlyDog Studios","theinvasion.nes",16],["The One With The Walls","SlyDog Studios","theonewiththewalls.nes",16],["The Wit.Nes","Dustmop","thewit.nes",40],["Thwaite","Damian Yerrick (pinobatch)","thwaite.nes",24],["Tic Tac Two P","SlyDog Studios","tictactwop.nes",16],["Tic Tac Xo","SlyDog Studios","tictacxo.nes",40],["Tiger Jenny","Ludosity","tigerjenny.nes",40],["Twin Dragons","Antoine Gohin","twindragons.nes",256],["Vigilante Ninja","Dougeff","vigilanteninja.nes",24],["Virus Cleaner","SlyDog Studios","viruscleaner.nes",40],["Wo Xiang Niao Niao","Mojon Twins","wo-xiang-niao-niao.nes",40],["Yun","Mojon Twins","yun.nes",64]],"snes":[["Astrohawk","Paul Lay","astrohawk.smc",768],["Blt","Charles Doty (cdoty)","blt.sfc",256],["Bucket","Sebastian Mihai","bucket.smc",256],["Furry RPG","Ramsis","furryrpg.sfc",6144],["Hilda","Orochii Zouveleki (O_manko)","hilda.sfc",256],["Horizontal Shooter","Marcus Rowe (Undisbeliever)","horizontal-shooter.sfc",107],["Jet Pilot Rising","Dieter Von Laser (D4S)","jetpilotrising.sfc",512],["Mega Family Bros","Debray Matthieu (Dieudunet)","megafamilybros.smc",1024],["N-Warp Daisakusen","Dieter Von Laser (D4S)","nwarpdaisakusen.smc",2048],["Uwol, Quest For Money","Alekmaul, Mojon Twins, KungfuFurby","questformoney.sfc",256],["Rockfall","Paul Lay, Harvey A. Kong Tin","rockfall.smc",384],["Super Boss Gaiden","Chrono Moogle and Dieter Von Laser (D4S)","superbossgaiden.sfc",512],["Tchou 2","Debray Matthieu (Dieudunet)","tchouv2.smc",896]],"gb":[["Blastah","Black Box","blastah.gb",64],["Brickster","Stephane Hockenhull","brickster.gbc",32],["Combat Soccer","Mike Kasprzak","combatsoccer.gbc",32],["Geometrix","AntonioND/SkyLyrac (Antonio Nino Diaz)","geometrix.gbc",32],["InitialD","GGracia10","initiald.gbc",128],["Klondike","Harold Toler","klondike.gbc",32],["Poke Da Mon","Mike Kasprzak","pokedamon.gbc",32],["uCity","AntonioND/SkyLyrac (Antonio Nino Diaz)","ucity.gbc",128]],"gba":[["3 WEEKS IN PARADISE","Bootlegger","3weeksinparadise.gba",3729],["A WEREWOLF TALE","Genecyst","awerewolftale.gba",7187],["AIRBALL","Foxy","airball.gba",1334],["ANGUNA","Nathan Tolbert, Chris Hildenbrand","anguna.gba",1671],["ANOTHER WORLD","Foxy","anotherworld.gba",1963],["ASTEROIDS [BAGLEY]","Jim Bagley","asteroidsb.gba",78],["ASTEROIDS [PRINCE]","Russ Prince","asteroidsp.bin",120],["ASTROHAWK","Paul Lay","astrohawk.bin",1353],["BALLE","Brunni","balle.gba",335],["BATTLE PICROSS","Sean Reid","battlepicross.gba",190],["BLAST ARENA ADVANCE","Mathew Carr","blastarenaadvance.gba",1213],["BLOCKTRAP","Francois Pessaux","blocktrap.gba",224],["BRIDGE RACER","Bootlegger","bridgeracer.gba",43],["BUNNY XMAS","Shen Mansell","bunnyxmas.gba",574],["BUST A MOVE","Russ Prince","bustamove.bin",921],["BYTES","Ekid","bytes.gba",41],["CASTLE MASTER","Quirky","castlemaster.gba",253],["CCCP","Torlus","cccp.gba",488],["CHAOS","Quirky","chaos.bin",496],["CHAOS - THE BATTLE OF WIZARDS","Quirky","chaosthebattleofwizards.gba",217],["CHIP ADVANCE","Alekmaul","chipadvance.gba",4176],["CHOCOBO WORLD DELUXE","Davgav","chocoboworlddeluxe.gba",531],["CLAY SHOOTER","Jim Bagley","clayshooter.gba",239],["CLEANGAME ADVANCE","S. Clarke","cleangameadvance.gba",340],["CODENAME HACKER","Alekmaul, Lobo, Daydream","codenamehacker.gba",3970],["CRYSTAL CLEAR CLONE","Torlus","crystalclearclone.gba",488],["CYCLONE","Quirky","cyclone.bin",198],["CYLER","Gener Gabasa","cyler.gba",79],["DEFLEKTOR","Foxy","deflektor.gba",377],["DOOMDARKS REVENGE","Quirky","doomdarksrevenge.gba",107],["ELEVATOR","Shen Mansell","elevator.gba",4],["ELIMINATOR","Foxy","eliminator.gba",730],["FACTORY BOTS","Nicholas Scheltema","factorybots.gba",251],["FRED FIREFIGHTER","Lord Graga","fredfirefighter.gba",175],["FROGGER","Bootlegger","frogger.gba",435],["FROGTRIS","Shen Mansell","frogtris.gba",359],["GAPMAN","Bootlegger","gapman.gba",119],["GBA CARDS","Flavor","gbacards.gba",289],["GBA TACTICS","Davgav","gbatactics.gba",246],["GOLDRUNNER","Foxy","goldrunner.gba",515],["GOODBOY ADVANCE","Exelotl","goodboyadvance.gba",2722],["GORF","Jess Ragan","gorf.gba",4629],["HEXAVIRUS","Alelmaul, Mollusk","hexavirus.gba",1353],["HIEROGLYPHIC MAN","Shen Mansell","hierogyphicman.gba",149],["HOLY HELL","Genecyst","holyhell.gba",1713],["IMPACT","Gener Gabasa","impact.gba",69],["JETPACK 2","Mukunda Johnson","jetpack2.gba",1068],["JUMPING BARNABE","Alekmaul","jumpingbarnabe.gba",1819],["JUMPING JIM","Alekmaul","jumpingjim.gba",280],["KLAN WARS","Lord Graga","klanwars.gba",172],["LASER CHESS","Russ Prince","laserchess.bin",77],["LLAMABOOOST","Lord Graga","llamaboost.gba",563],["LOOP THE LOOP","Shen Mansell","looptheloop.gba",505],["LOOPED","Bootlegger (Jason Bullough)","looped.gba",513],["MATRIX RUNNER","Nicholas Scheltema","matrixrunner.gba",57],["MEMORY MUNCHA","Lord Graga","memorymuncha.gba",150],["METAL WARRIOR 4: AGENTS OF METAL","Covert Bitops","metalwarrior4.gba",512],["MONOCHROMANCY","Nicholas Scheltema","monochromancy.bin",416],["MOSHPIT","Shen Mansell","moshpit.gba",34],["NEBULUS","Foxy","nebulus.gba",532],["NEGATIVE SPACE","Gener Gabasa, Mia","negativespace.gba",285],["NINJA SACK","Lord Graga","ninjasack.gba",259],["PAC RUN","Jake Reardon","pacrun.gba",354],["PAPER SCISSOR ROCKS","Stian Hole","paperscissorrocks.gba",221],["PNAKYS","Torlus","pnakys.bin",230],["POCKET MEAT","BomberDev","pocketmeat.gba",842],["POWER PIG","Genecyst","powerpig.gba",2254],["PUSH-IT","Bootlegger","pushit.gba",240],["S WORLD 3","Shen Mansell","sworld3.gba",297],["SANTA'S SWEATSHOP","Sumiguchi","santassweatshop.gba",1477],["SHAPES","Gener Gabasa","shapes.gba",666],["SNAKE IN THE GRASS","Shen Mansell","snakeinthegrass.gba",247],["SPOUT","Alekmaul","spout.gba",735],["SUPER WINGS","Mukunda Johnson","superwings.gba",233],["TAILGUNNER","Gener Gabasa","tailgunner.gba",214],["TETRAVEX","Francois Pessaux","tetravex.gba",60],["TETRIGRAM","Francois Pessaux","tetrigram.gba",134],["THE LORDS OF MIDNIGHT","Quirky","thelordsofmidnight.gba",67],["TIME WALKER","Gener Gabasa","timewalker.gba",79],["TRON [LORD GRAGA]","Lord Graga","tronlordgraga.gba",1],["WONKIE GUY","Sean Reid","wonkieguy.gba",2224],["YAHTZEE [HERG]","Herg","yahtzeeherg.gba",173]],"md":[["30 Years Of Nintendont","Dr. Ludos","30yearsofnintendont.bin",512],["ASCII WAR","ComradeOj","asciiwar.bin",2331],["Astronauta Perdido (Lost Astronaut)","Nemezes Games (Laudelino)","astroperdido.bin",180],["Barbarian (CPC)","F.L.","barbarian.bin",2242],["Bare Knuckled Princess","OhCarson","bareknuckleprincesss.bin",384],["Bomb on Basic City","Studio Vetea","bombonbasiccity.bin",1897],["BombX","Josh Tari (Captain Dreamcast)","bombx.bin",212],["BoTTleD - Tower Defense","Cero (Calima)","oldtowers.bin",768],["Break An Egg","Dr. Ludos","breakanegg.bin",256],["Cave Story","Andy Grind","cavestory.bin",3904],["Crazy Cars","F.L.","crazycars.bin",100],["Crazy Driver","M-374 LX (Alexandre Almeida)","crazydriver.bin",50],["Dragon's Castle","Javier Degirolmo (Sik)","dragonscastle.bin",172],["Error Rush","ComradeOj","errorrush.bin",101],["Fix It Felix Jr.","Airwalk Studios (dra600n)","fixitfelixjr.bin",588],["Gen Poker","Sebastian Mihai","genpoker.bin",308],["Glass Breaker","Tmeeco co.(TM)","glassbreakermd.bin",320],["Gold Rush","Andy Grind","goldrush.bin",2880],["Goplanes","DjCouchyCouch","goplanes.bin",512],["Gravity Pig","ComradeOj","gravitypig.bin",512],["Griels Quest for the Holy Porron","MoonWatcherMD","grielsquest.bin",2304],["Headship with Lasers","Nemezes Games (Laudelino)","headship.bin",705],["IK+ Deluxe version","Igor, Troudki","ikplusdeluxe.bin",1664],["Junkbots","Moon Watcher, Bitslap","junkbots.bin",128],["Leovigildo's Murcian Conspiracy","1985 Alternativo","leomurconspiracy.bin",384],["Mega Cheril Perils","Mojon Twins","mega-cheril-perils.bin",2040],["Mega Flappy Sis","Lennart Brink-Abeler","megaflappysis.bin",467],["Megamindtris","1985 Alternativo","megamindtris.bin",1088],["Miniplanets","Javier Degirolmo (Sik)","miniplanets.bin",256],["Odeio Carros (I hate cars)","Nemezes Games (Laudelino)","odeiocarros.bin",63],["Oh Mummy!","1985 Alternativo","ohmummy.bin",1024],["Papi Commando (Remix)","Studio Vetea","papicommandoremix.bin",3612],["Papi Commando Tennis","Studio Vetea","papicommandotennis.bin",1757],["Pingouin Bleu","DjCouchyCouch","pingouinbleu.bin",256],["Pingouin Rose","DjCouchyCouch","pingouinrose.bin",256],["Plataforma Ultimate","Nemezes Games (Laudelino)","plataforma-ultimate.bin",145],["Pong RAM","Tmeeco co.(TM)","pongram.bin",4],["Project MD","Javier Degirolmo (Sik)","projectmd.bin",768],["Racer","TOF Studio","racer.bin",443],["Rad Rhino","Triger Mountain","radrhino.bin",512],["Red Queen Rampage","Demens Deum (Ilya Prokhorov)","redqueenrampage.bin",88],["Return To Genesis","Igor, Troudki","returntogenesis.bin",1024],["Rick Dangerous","Pascal-O-Rama","rickdangerous.bin",3968],["Rick Dangerous II","Alekmaul","rickdangerous2.bin",1152],["Scorpion Illuminati","MoonWatcherMD","scorpionilluminati.bin",27],["Shattering Jaws","MoonWatcherMD","shatteringjaws.md",384],["Star Chaser","Javier Degirolmo (Sik)","starchaser.bin",45],["T-Gun II","Robot Urchin","tgunii.smd",768],["Tro-Now","1985 Alternativo","tronow.bin",320],["Two Cyclops (Dois Ciclopes)","Nemezes Games (Laudelino)","twocyclops.bin",961],["Two Cyclops - Fight Game","Nemezes Games (Laudelino)","twocyclops-fight.bin",417],["Ultimate Tetris","Haroldo OK!","ultimatetetris.bin",832],["VilQ","AceMan, Axi0maT, tehKaiN","vilq.bin",384],["VilQ Adventure","AceMan, Axi0maT, Koyot1222","vilqadventure.bin",512],["Violence Pingouin","DjCouchyCouch","violencepingouin.bin",384],["Virtua Worm","ComradeOj","virtuaworm.bin",82],["Virtua Worm 2","ComradeOj","virtuaworm2.bin",202]],"sms":[["2048 [GRZ]","Julien Verneuil (Grz-)","2048grz.sms",32],["2048 [Sanqui]","Sanqui","2048sanqui.sms",32],["3D City","Steven Boland (SteveProXNA)","3dcity.sms",64],["Acid Reflux","Furrtek, Robotwo","acidreflux.sms",32],["Artillery Master 8k","Haroldo Pinheiro (Haroldoop)","artillerymaster8k.sms",32],["Astro Force","Enrique Ruiz (Eruiz00)","astroforce.sms",256],["Astroswab","Hang-on","astroswab.sms",256],["Bacachase","Paulo Silva (Nitrofurano)","bacachase.sms",8],["Baluba Balok","Enrique Ruiz (Eruiz00)","balubabalok.sms",32],["Bara Buru","Kagesan","baraburu.sms",128],["Battleships","Killer Bean 2 (Jens Kristian, Krarup Kel","battleships.sms",32],["Bay Third Dungeon","Tibone","baythirddungeon.sms",512],["Block Quest","Hang-on","blockquest.sms",32],["Bloki","Tripledonkey, Sherpa","bloki.sms",48],["Bock Bock Revolution [Bock's Birthday 2003]","Maxim","bocksbirthday2003.sms",80],["Bread and Butter","Dragonfeet","breadandbutter.sms",48],["Bread and Butter World","Dragonfeet","breadandbutterworld.sms",48],["Burgers of Hanoi","Smccd (Sebastian Mihai)","burgersofhanoi.sms",3],["Chappie's ears Simon game","Furrtek","chappiesears.sms",32],["Cix","PkK","cix.sms",32],["Colossal Cave Adventure SAM Edition","Haroldo Pinheiro (Haroldoop)","colossalcaveadventure.sms",512],["Cye","PkK","cye.sms",29],["Data Storm","Haroldo Pinheiro (Haroldoop)","datastorm.sms",32],["Dating Sim","Haroldo Pinheiro (Haroldoop)","datingsim.sms",512],["Derpy's Mail","Aypok","derpysmail.sms",32],["Digger Ball","Aypok","diggerball.sms",80],["Digger Chan","Aypok","diggerchan.sms",48],["Duckslayer Adventures","Haroldo Pinheiro (Haroldoop)","duckslayeradventures.sms",32],["Freeway '86","Tibone","freeway.sms",48],["Galactic Revenge","Enrique Ruiz (Eruiz00)","galacticrevenge.sms",128],["Gaudream","DanySnowman, Davidian, Kusfo","gaudream.sms",128],["Gemitas","Cyttorak","gemitas.sms",64],["Gravity Beam: Master Gaiden","Mathew Carr (MrD)","gravitybeam.sms",32],["Gotris","Kusfo, ManuTrigger, Davidian","gotris.sms",64],["Headless Ninja Volley","Haroldo Pinheiro (Haroldoop)","headlessninjavolley.sms",12],["Io","PkK","io.sms",38],["Jump'n Run [Bock's Birthday 20011 II]","Maxim","bocksbirthday2011ii.sms",32],["KunKun & KokoKun","Omar Cornut (Bock)","kunkunkokokun.sms",32],["KunKun & KokoKun 2 - Return of the Kun","Omar Cornut (Bock)","kunkunkokokun2.sms",64],["Lander1","Jmimu","lander1.sms",32],["Lander2","Jmimu","lander2.sms",48],["Little Sokoban","Jean Monos","littlesokoban.sms",32],["Lost Raider","vingazole, Ichigobankai","lostraider.sms",128],["Minesweepers [Bock's Birthday 2003]","Maxim","bocksbirthday2004.sms",48],["Moggy Master","Mojon Twins (Na_th_an, Anjuel, Davidian)","moggymaster.sms",64],["NanoWars 8k","Haroldo Pinheiro (Haroldoop)","nanowars8k.sms",32],["Picross","Maxim","picross.sms",48],["Platform Explorer","Steven Boland (SteveProXNA)","platformexplorer.sms",256],["Pong Master","Haroldo Pinheiro (Haroldoop)","pongmaster.sms",6],["Porkpolis","Dragonfeet","porkpolis.sms",128],["Prisonnier II","Loic Lete, Jean Monos, Aezur, Patrice Ce","prisonnier2.sms",32],["Racer 1 (classic)","Hang-on","racerclassic.sms",32],["Racer 2 (rebooted)","Hang-on","racerrebooted.sms",32],["Scope","DragonFeet","scope.sms",256],["Shooting Stars","DragonFeet","shootingstars.sms",32],["Silver Valley","Enrique Ruiz (Eruiz00)","silvervalley.sms",256],["Simpsons Trivia","Steven Boland (SteveProXNA)","simpsonstrivia.sms",128],["SMS Chip 8 Interpreter","Maxim","smschip8.sms",32],["SokoMaster","Haroldo Pinheiro (Haroldoop)","sokomaster.sms",128],["Space Hawks","KanedaFr","spacehawks.sms",32],["Sword Strike","DragonFeet","swordstrike.sms",256],["Versus","Hang-on","versus.sms",64],["Wah Munchers","JoppyFur","wahmunchers.sms",16],["Waimanu","Disjointed Studio","waimanu.sms",128],["Weka Invaders","Disjointed Studio","wekainvaders.sms",288]]};

function gmCatList(cs,q){const n=nrm(q||"");const L=(GM_CAT[cs]||[]).filter(g=>!n||nrm(g[0]+" "+g[1]).includes(n));
  return L.length?L.map(([t,a,f,kb])=>{const have=(NESROMS||[]).some(r=>r.file===f);return `<button class="gm-ci" data-dl="${cs}|${esc(f)}"><span>${EMU_SYS[cs].e}</span><div><b>${esc(t)}</b><small>${a?esc(a)+" · ":""}${kb>=1024?(kb/1024).toFixed(1).replace(".",",")+" MB":kb+" KB"}</small></div><em>${have?"✅":"⬇️"}</em></button>`}).join(""):`<div class="empty2">Nada con “${esc(q)}”.</div>`}
document.addEventListener("input",e=>{if(e.target.id==="gm-cq"){miState.cq=e.target.value;const l=$("#gm-catlist");if(l)l.innerHTML=gmCatList(miState.cs||"sms",e.target.value)}});

let GMGV=(()=>{try{return localStorage.getItem("gfGv")||"sys"}catch(e){return"sys"}})();
const gmStars=r=>`<span class="gm-stars">${[1,2,3,4,5].map(n=>`<button data-rate="${esc(r.id)}:${n}" aria-label="${n} estrellas" class="${n<=(r.rate||0)?"on":""}">★</button>`).join("")}</span>`;
function gmRomRow(r,pos){const S=EMU_SYS[r.sys||"nes"];const med=pos?(pos<=3?["🥇","🥈","🥉"][pos-1]:`<i>${pos}</i>`):"";
  return `<div class="gm-rom${med?" ranked":""}"><button class="gm-romplay" data-nesplay="${esc(r.id)}">${med?`<em class="gm-pos">${med}</em>`:""}<span style="--c:${S.c}">${S.e}</span><div><b>${esc(r.name)}</b><small>${r.remote?"☁️ ":""}${S.n}${r.plays?` · ${r.plays} partida${r.plays>1?"s":""}`:""}${r.last?` · ${relD(daysTo(iso2(new Date(r.last))))}`:""}</small></div></button>${gmStars(r)}<button class="gm-del" data-nesdel="${esc(r.id)}" aria-label="Quitar">🗑️</button></div>`}
function gmMyGames(xs){const gv=GMGV;const segv=`<div class="gm-gv" role="tablist">${[["sys","🎮 Por consola"],["rank","🏆 Ranking"],["rec","🕑 Recientes"]].map(([k,l])=>`<button data-gv="${k}" aria-pressed="${k===gv}">${l}</button>`).join("")}</div>`;let html="";
  if(gv==="sys"){html=Object.keys(EMU_SYS).map(k=>{const L=xs.filter(r=>(r.sys||"nes")===k).sort((a,b)=>(b.rate||0)-(a.rate||0)||(b.plays||0)-(a.plays||0)||a.name.localeCompare(b.name));if(!L.length)return"";const S=EMU_SYS[k];
      return `<div class="gm-grp"><div class="gm-gh" style="--c:${S.c}"><span>${S.e}</span><b>${S.n}</b><small>${L.length} juego${L.length>1?"s":""}</small></div><div class="gm-roms">${L.map(r=>gmRomRow(r)).join("")}</div></div>`}).join("")}
  else if(gv==="rank"){const L=[...xs].sort((a,b)=>(b.rate||0)-(a.rate||0)||(b.plays||0)-(a.plays||0)||(b.last||0)-(a.last||0));
    html=`<div class="gm-roms">${L.map((r,i)=>gmRomRow(r,i+1)).join("")}</div>${xs.some(r=>r.rate)?"":`<div class="sub2 gm-tip">Puntúa tus juegos con las ★ para ordenar el ranking. Sin estrellas, manda el que más partidas tiene.</div>`}`}
  else{html=`<div class="gm-roms">${[...xs].sort((a,b)=>(b.last||b.added)-(a.last||a.added)).map(r=>gmRomRow(r)).join("")}</div>`}
  return `<h2 class="h-sec">Mis juegos · ${xs.length}</h2>${segv}${html}`}
document.addEventListener("click",async e=>{if(curApp!=="juegos")return;const g=e.target.closest("[data-gv]");if(g){GMGV=g.dataset.gv;try{localStorage.setItem("gfGv",GMGV)}catch(_){}miState.force=true;renderJuegos();return}
  const rt=e.target.closest("[data-rate]");if(rt){const i=rt.dataset.rate.lastIndexOf(":"),id=rt.dataset.rate.slice(0,i),n=+rt.dataset.rate.slice(i+1);
    const cur=(NESROMS||[]).find(x=>x.id===id);const nv=cur&&cur.rate===n?0:n;try{const r=await nesTx("roms","readonly",s=>s.get(id));if(r){r.rate=nv;await nesTx("roms","readwrite",s=>s.put(r))}}catch(_){}if(EMU_ROM_MEM[id])EMU_ROM_MEM[id].rate=nv;const cm=GMCLOUD.roms.find(x=>x.id===id);if(cm){cm.rate=nv;cloudMetaSoon({...cm,id,rate:nv})}try{navigator.vibrate&&navigator.vibrate(8)}catch(_){}nesList()}});

/* ---------- nube del Hub: consolas y juegos guardados en la base del artefacto (Safari borra lo local) ---------- */
const GMCH=384*1024;
function b64enc(u){let s="";for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)}
function b64into(str,dst,off){const bin=atob(str);for(let i=0;i<bin.length;i++)dst[off+i]=bin.charCodeAt(i);return bin.length}
let GMCLOUD={cores:{},roms:[],saves:{}},GMCLOUD_OK=false,GMBUSY=null;
const gmMetaRom=p=>`profiles/${p||profile}/gmroms`;
function gmBusy(t){GMBUSY=t;const el=$("#gm-busy");if(el){el.hidden=!t;el.textContent=t||""}}

const gmMetaPath=(kind,id)=>kind==="core"?`gmcores/${id}`:kind==="save"?`profiles/${profile}/gmsaves/${id}`:`${gmMetaRom()}/${id}`;
const gmSum=u=>{let h=2166136261>>>0;for(let i=0;i<u.length;i+=7)h=Math.imul(h^u[i],16777619)>>>0;return (h^u.length)>>>0};
function gmPack(files){const head=new TextEncoder().encode(JSON.stringify(files.map(f=>[f.n,f.d.length])));const tot=4+head.length+files.reduce((a,f)=>a+f.d.length,0);const o=new Uint8Array(tot);new DataView(o.buffer).setUint32(0,head.length,true);o.set(head,4);let p=4+head.length;files.forEach(f=>{o.set(f.d,p);p+=f.d.length});return o}
function gmUnpack(u){const hl=new DataView(u.buffer,u.byteOffset).getUint32(0,true);const list=JSON.parse(new TextDecoder().decode(u.subarray(4,4+hl)));let p=4+hl;return list.map(([n,l])=>{const d=u.slice(p,p+l);p+=l;return{n,d}})}
async function gmOpfs(eng,id,create){try{if(!navigator.storage||!navigator.storage.getDirectory)return null;let d=await navigator.storage.getDirectory();d=await d.getDirectoryHandle(eng,{create});return await d.getDirectoryHandle(id,{create})}catch(e){return null}}
async function emuSaveRestore(eng,id){const key=eng+"-"+id;const m=GMCLOUD.saves[key];if(!m||!dbRaw)return;const dir=await gmOpfs(eng,id,true);if(!dir)return;
  try{const files=gmUnpack(await cloudGet("save",key,m,"tu partida"));for(const f of files){const h=await dir.getFileHandle(f.n,{create:true});const w=await h.createWritable();await w.write(f.d);await w.close()}}catch(e){}}
async function emuSaveSync(eng,id,P,quiet){try{P&&P.flushSaves&&await P.flushSaves()}catch(e){}const dir=await gmOpfs(eng,id,false);if(!dir||!dbRaw)return false;const files=[];
  try{for await(const [n,h] of dir.entries()){if(h.kind!=="file")continue;files.push({n,d:new Uint8Array(await (await h.getFile()).arrayBuffer())})}}catch(e){return false}
  if(!files.length)return false;const pk=gmPack(files.sort((a,b)=>a.n.localeCompare(b.n)));const h=gmSum(pk);const key=eng+"-"+id;const m=GMCLOUD.saves[key];if(m&&m.h===h&&m.size===pk.length)return true;
  return cloudPut("save",key,pk,{h,eng,rom:id},quiet?"tu partida":"tu partida")}
async function cloudLoad(){if(!dbRaw)return;try{
  const [c,r,sv]=await Promise.all([dbRaw.collection("gmcores").get(),dbRaw.collection(gmMetaRom()).get(),dbRaw.collection(`profiles/${profile}/gmsaves`).get().catch(()=>null)]);GMCLOUD.saves={};(sv&&sv.docs||[]).forEach(d=>{const x=d.data()||{};if(x.chunks)GMCLOUD.saves[d.id]=x});
  GMCLOUD.cores={};(c&&c.docs||[]).forEach(d=>{const x=d.data()||{};if(x.chunks)GMCLOUD.cores[d.id]=x});
  GMCLOUD.roms=(r&&r.docs||[]).map(d=>({id:d.id,...(d.data()||{})})).filter(x=>x.chunks);GMCLOUD_OK=true}catch(e){GMCLOUD_OK=false}}
async function cloudPut(kind,id,u8,meta,label){if(!dbRaw)return false;
  let ch=GMCH;for(let att=0;att<4;att++){try{const n=Math.ceil(u8.length/ch);
      for(let i=0;i<n;i++){gmBusy(`☁️ Guardando ${label} en tu nube… ${Math.round(i/n*100)}%`);await dbRaw.doc(`gmbin/${kind}_${id}_${i}`).set({d:b64enc(u8.subarray(i*ch,(i+1)*ch))})}
      const m={...meta,size:u8.length,chunks:n,ch,at:Date.now()};await dbRaw.doc(gmMetaPath(kind,id)).set(m);
      if(kind==="save"){GMCLOUD.saves[id]=m}else if(kind==="core")GMCLOUD.cores[id]=m;else{GMCLOUD.roms=GMCLOUD.roms.filter(x=>x.id!==id);GMCLOUD.roms.push({id,...m})}
      gmBusy(null);return true}catch(e){ch=Math.floor(ch/2)}}
  gmBusy(null);toast("No se pudo guardar en la nube: "+label);return false}
async function cloudGet(kind,id,meta,label){const out=new Uint8Array(meta.size);let off=0;
  for(let i=0;i<meta.chunks;i++){gmBusy(`☁️ Cargando ${label}… ${Math.round(i/meta.chunks*100)}%`);const sn=await dbRaw.doc(`gmbin/${kind}_${id}_${i}`).get();const d=sn&&sn.exists?(sn.data()||{}).d:null;if(!d){gmBusy(null);throw new Error("Falta un trozo en la nube")}off+=b64into(d,out,off)}
  gmBusy(null);return out}
async function cloudDel(kind,id,meta){if(!dbRaw)return;try{for(let i=0;i<(meta&&meta.chunks||0);i++)await dbRaw.doc(`gmbin/${kind}_${id}_${i}`).delete();await dbRaw.doc(gmMetaPath(kind,id)).delete()}catch(e){}}
let gmMetaT={};
function cloudMetaSoon(r){if(!dbRaw||!r||!r.id)return;clearTimeout(gmMetaT[r.id]);gmMetaT[r.id]=setTimeout(()=>{const c=GMCLOUD.roms.find(x=>x.id===r.id);if(!c)return;const m={...c,name:r.name,sys:r.sys||"nes",last:r.last||0,plays:r.plays||0,rate:r.rate||0};delete m.id;Object.assign(c,m);try{dbRaw.doc(`${gmMetaRom()}/${r.id}`).set(m)}catch(e){}},400)}
async function gmEnsureCore(eng){let c=null;try{c=await nesTx("cores","readonly",s=>s.get(eng))}catch(e){}if(c)return true;const m=GMCLOUD.cores[eng];if(!m)return false;
  try{const d=await cloudGet("core",eng,m,"la consola "+EMU_ENG[eng].n);try{await nesTx("cores","readwrite",s=>s.put({id:eng,size:d.length,at:Date.now(),data:d}))}catch(e){}EMU_BYTES.set(emuWasmUrl(eng),d.buffer);EMU_CORE_MEM[eng]=d;return true}catch(e){toast(String(e.message||e));return false}}
const EMU_CORE_MEM={};
async function gmEnsureRom(id){let r=null;try{r=await nesTx("roms","readonly",s=>s.get(id))}catch(e){}if(r)return r;const m=GMCLOUD.roms.find(x=>x.id===id);if(!m)return null;
  const d=await cloudGet("rom",id,m,m.name);const rec={id,sys:m.sys||"nes",name:m.name,file:m.file||m.name,size:d.length,added:m.added||Date.now(),last:m.last||0,plays:m.plays||0,rate:m.rate||0,data:d};
  try{await nesTx("roms","readwrite",s=>s.put(rec))}catch(e){}EMU_ROM_MEM[id]=rec;return rec}
const EMU_ROM_MEM={};

let GMSYNCED=false;
async function gmSyncUp(){if(GMSYNCED||!dbRaw||!GMCLOUD_OK)return;GMSYNCED=true;let did=0;
  try{const cs=await nesTx("cores","readonly",s=>s.getAll());for(const c of cs||[])if(!GMCLOUD.cores[c.id]){await cloudPut("core",c.id,c.data,{eng:c.id},"la consola "+EMU_ENG[c.id].n);did++}}catch(e){}
  try{const rs=await nesTx("roms","readonly",s=>s.getAll());for(const r of rs||[])if(!GMCLOUD.roms.some(x=>x.id===r.id)&&r.size<=40*1024*1024){await cloudPut("rom",r.id,r.data,{name:r.name,sys:r.sys||"nes",file:r.file,added:r.added,last:r.last||0,plays:r.plays||0,rate:r.rate||0},r.name);did++}}catch(e){}
  if(did){await emuCoresLoad();await nesList()}}
(function(){try{const d=document.createElement("div");d.id="gm-busy";d.hidden=true;document.body.appendChild(d)}catch(e){}})();
async function gmStoreDiag(){try{if(!dbRaw)return;const o={at:Date.now(),ua:navigator.userAgent.slice(0,120),cores:Object.keys(EMUCORES),roms:(NESROMS||[]).length};
  try{o.persisted=navigator.storage&&navigator.storage.persisted?await navigator.storage.persisted():"n/a"}catch(e){o.persisted="err"}
  try{const e=navigator.storage&&navigator.storage.estimate?await navigator.storage.estimate():null;if(e){o.usageMB=Math.round(e.usage/1e5)/10;o.quotaMB=Math.round(e.quota/1e5)/10}}catch(e){}
  try{o.ls=localStorage.getItem("gfGv")||"-"}catch(e){o.ls="err"}
  dbRaw.doc("diag/juegos_"+profile).set(o)}catch(e){}}
function renderJuegos(){gmRecLoad();if(NESROMS===null){NESROMS=[];cloudLoad().then(emuCoresLoad).then(nesList).then(()=>{setTimeout(gmStoreDiag,300);gmSyncUp()})}
  keepFocus(()=>{const tab=miState.tab||"arcade";const tabs=[["arcade","Arcade"],["consolas","Consolas"],["bajar","Juegos gratis"]];let body="";
  if(tab==="arcade"){body=`<div class="gm-hero"><div><small>Para el móvil · se juega con el dedo</small><b>Arcade CrisVan</b><span>Clásicos de siempre, rehechos para pantalla táctil. Tus récords se guardan en tu perfil.</span></div><div class="gm-hball">🕹️</div></div>
    <div class="gm-grid">${GM_LIST.map(g=>{const r=GMREC[g.id];return `<button class="gm-card" style="--c:${g.c}" data-gmplay="${g.id}"><span class="gm-ic">${g.e}</span><b>${g.n}</b><small>${g.d}</small><em>${r!=null?`🏆 ${r}${g.unit||""}`:"Sin récord aún"}</em></button>`}).join("")}</div>`}
  else if(tab==="bajar"){const cs=miState.cs||"sms";body=`<div class="gm-hero dl"><div><small>Homebrew · gratis y legal</small><b>Descargar juegos</b><span>Juegos hechos por aficionados que sus autores comparten gratis (colección <i>retrobrews</i>). Pulsa ⬇️ y se añade a tus <b>Consolas</b> al momento.</span></div><div class="gm-hball">⬇️</div></div>
    <div class="gm-chips">${Object.keys(GM_CAT).map(k=>`<button data-gmcs="${k}" aria-pressed="${k===cs}">${EMU_SYS[k].e} ${EMU_SYS[k].n} <small>${GM_CAT[k].length}</small></button>`).join("")}</div>
    <input class="gm-q" id="gm-cq" type="search" placeholder="Buscar juego…" value="${esc(miState.cq||"")}" autocomplete="off">
    <div class="gm-cat" id="gm-catlist">${gmCatList(cs,miState.cq||"")}</div>
    <div class="hcard gm-note"><b>ℹ️ Sobre estos juegos</b><div class="sub2">Son juegos <i>homebrew</i>: creados por aficionados y compartidos gratis por sus autores. Cuando uno ya está añadido sale ✅ y al tocarlo se abre.</div></div>`}
  else{const xs=NESROMS||[];const engs=Object.keys(EMU_ENG);const inst=engs.filter(k=>EMUCORES[k]).length;
    body=`<div class="gm-hero nes"><div><small>NES · SNES · Game Boy · GBA · Mega Drive · Master System</small><b>Consolas retro</b><span>Añade juegos desde el móvil y juega con mando táctil y guardado de partida. Todo se queda en este dispositivo.</span></div><div class="gm-hball">🎮</div></div>
    <button class="btn wa-full" data-nesadd>📂 Añadir juego desde el móvil</button><input type="file" id="nes-file" multiple hidden>
    <h2 class="h-sec">Consolas</h2>
    <div class="gm-engs">${Object.keys(EMU_SYS).map(k=>{const S=EMU_SYS[k],e=S.eng,ok=e==="jsnes"||EMUCORES[e];return `<div class="gm-eng${ok?" ok":""}"><b>${S.e} ${S.n}</b><small>${ok?"✅ Lista (también sin conexión)":"Se descarga sola la primera vez ("+EMU_ENG[e].mb+")"}</small></div>`}).join("")}</div>
    ${xs.length?gmMyGames(xs):`<div class="empty2">Aún no hay juegos.<br>Bájate alguno gratis en <b>Juegos gratis</b> o pulsa <b>Añadir juego</b> y elige un archivo de tu móvil.</div>`}
    <div class="hcard gm-note"><b>ℹ️ Cómo va</b><div class="sub2">• Archivos que entiende: .nes · .sfc/.smc · .gb/.gbc · .gba · .md/.bin/.gen · .sms, también dentro de <b>.zip</b> o <b>.7z</b><br>• Cada consola se descarga sola la primera vez que juegas y queda guardada para jugar sin conexión.<br>• Todo (juegos, partidas, estrellas) se guarda en este móvil. Añade la app a la pantalla de inicio para que iOS no lo borre.<br>• Usa juegos gratuitos (<i>homebrew</i>) o copias de cartuchos tuyos.<br>• 💾 guarda la partida y ▶︎💾 la recupera. En horizontal se ve más grande.</div></div>`}
  B().innerHTML=seg(tabs,tab,"gmtab")+body})}
document.addEventListener("click",e=>{if(curApp!=="juegos")return;
  const tb=e.target.closest("[data-gmtab]");if(tb){miState.tab=tb.dataset.gmtab;miState.force=true;renderJuegos();window.scrollTo(0,0);return}
  const p=e.target.closest("[data-gmplay]");if(p){gmOpen(p.dataset.gmplay);return}
  if(e.target.closest("[data-nesadd]")){$("#nes-file")?.click();return}
  const np=e.target.closest("[data-nesplay]");if(np){romPlay(np.dataset.nesplay);return}
  const cs=e.target.closest("[data-gmcs]");if(cs){miState.cs=cs.dataset.gmcs;miState.force=true;renderJuegos();return}
  const nd=e.target.closest("[data-nesdel]");if(nd){const r=(NESROMS||[]).find(x=>x.id===nd.dataset.nesdel);if(!r)return;
    if(nd.dataset.sure!=="1"){nd.dataset.sure="1";nd.textContent="¿Quitar?";nd.classList.add("sure");setTimeout(()=>{if(nd.isConnected){nd.dataset.sure="";nd.textContent="🗑️";nd.classList.remove("sure")}},2500);return}
    delete EMU_ROM_MEM[r.id];const cm=GMCLOUD.roms.find(x=>x.id===r.id);GMCLOUD.roms=GMCLOUD.roms.filter(x=>x.id!==r.id);if(cm)cloudDel("rom",r.id,cm);Object.keys(GMCLOUD.saves).filter(k=>k.endsWith("-"+r.id)).forEach(k=>{cloudDel("save",k,GMCLOUD.saves[k]);delete GMCLOUD.saves[k]});nesTx("roms","readwrite",s=>s.delete(r.id)).then(()=>nesTx("saves","readwrite",s=>s.delete(r.id))).catch(()=>{}).then(nesList);toast("Juego quitado.");return}});
document.addEventListener("change",e=>{if(e.target.id==="nes-file"&&e.target.files&&e.target.files.length){romAddFiles([...e.target.files]);e.target.value=""}});

/* ---- game shell (full-screen overlay) ---- */
let GM=null;
const GM_PADS={
  dir:[["up","▲"],["left","◀"],["right","▶"],["down","▼"]],
  blocks:[["left","◀",1],["down","▼",1],["right","▶",1],["rot","⟳"],["drop","⤓"]],
  lr:[["left","◀"],["right","▶"],["fire","●"]],
  mines:[["flag","🚩 Modo bandera"]],
  none:[],
  nes:"nes"};
function gmEnsure(){if($("#gm-ov"))return;const d=document.createElement("div");d.id="gm-ov";d.setAttribute("data-noswipe","");d.hidden=true;
  d.innerHTML=`<div class="gm-top"><button class="gm-ib" data-gmx aria-label="Salir">✕</button><div class="gm-tt"><b id="gm-t"></b><small id="gm-s"></small></div><span class="gm-tx" id="gm-tx"></span><button class="gm-ib" data-gmp aria-label="Pausa">❚❚</button></div>
  <div class="gm-stage" id="gm-stage"><canvas id="gm-c"></canvas><div class="gm-msg" id="gm-msg" hidden></div></div><div class="gm-pad" id="gm-pad"></div>`;
  document.body.appendChild(d);
  const st=$("#gm-stage");let ps=null;
  const lp=ev=>{const c=$("#gm-c"),r=c.getBoundingClientRect(),g=GM&&GM.g;if(!g)return{x:0,y:0};return{x:(ev.clientX-r.left)/r.width*g.LW,y:(ev.clientY-r.top)/r.height*g.LH}};
  st.addEventListener("pointerdown",ev=>{if(!GM||GM.state!=="play"||ev.target.closest(".gm-msg"))return;ev.preventDefault();const p=lp(ev);ps={...p,cx:ev.clientX,cy:ev.clientY,t:Date.now(),id:ev.pointerId};GM.g.pdown&&GM.g.pdown(p.x,p.y);
    if(GM.g.long){clearTimeout(GM.lt);GM.lt=setTimeout(()=>{if(ps&&GM){GM.g.long(ps.x,ps.y);ps.used=true;try{navigator.vibrate&&navigator.vibrate(20)}catch(_){}}},380)}});
  st.addEventListener("pointermove",ev=>{if(!GM||!ps||GM.state!=="play")return;const p=lp(ev);if(Math.hypot(ev.clientX-ps.cx,ev.clientY-ps.cy)>12)clearTimeout(GM.lt);GM.g.pmove&&GM.g.pmove(p.x,p.y)});
  const up=ev=>{if(!GM||!ps)return;clearTimeout(GM.lt);const p=lp(ev),dx=ev.clientX-ps.cx,dy=ev.clientY-ps.cy;const used=ps.used;ps=null;if(GM.state!=="play"||used)return;
    if(Math.hypot(dx,dy)>26&&GM.g.swipe){GM.g.swipe(Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up"))}else GM.g.tap&&GM.g.tap(p.x,p.y);GM.g.pup&&GM.g.pup(p.x,p.y)};
  st.addEventListener("pointerup",up);st.addEventListener("pointercancel",()=>{ps=null;GM&&clearTimeout(GM.lt)});
  st.addEventListener("contextmenu",ev=>ev.preventDefault());
  const pad=$("#gm-pad");const held=new Map();
  pad.addEventListener("pointerdown",ev=>{const b=ev.target.closest("[data-gk]");if(!b||!GM)return;ev.preventDefault();try{b.setPointerCapture(ev.pointerId)}catch(_){}b.classList.add("on");const k=b.dataset.gk;
    if(GM.state!=="play"&&!GM.nes)return;emuWake();gmKey(k,true);try{navigator.vibrate&&navigator.vibrate(8)}catch(_){}
    if(b.dataset.rep){const t1=setTimeout(function rp(){gmKey(k,true,true);held.set(ev.pointerId,setTimeout(rp,55))},190);held.set(ev.pointerId,t1)}});
  const pend=ev=>{const b=ev.target.closest("[data-gk]");clearTimeout(held.get(ev.pointerId));held.delete(ev.pointerId);if(!b||!GM)return;b.classList.remove("on");gmKey(b.dataset.gk,false)};
  pad.addEventListener("pointerup",pend);pad.addEventListener("pointercancel",pend);pad.addEventListener("contextmenu",ev=>ev.preventDefault());
  d.addEventListener("click",ev=>{if(ev.target.closest("[data-gmx]")){gmClose();return}if(ev.target.closest("[data-gmp]")){gmPause();return}
    if(ev.target.closest("[data-gmagain]")){gmStart();return}if(ev.target.closest("[data-gmres]")){gmResume();return}
    const ns=ev.target.closest("[data-nesact]");if(ns){nesAct(ns.dataset.nesact);return}});
  addEventListener("keydown",ev=>{if(!GM||$("#gm-ov").hidden||GM.emu)return;const m={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"," ":"fire",Enter:"start",x:"a",X:"a",z:"b",Z:"b",Shift:"select"}[ev.key];
    if(ev.key==="Escape"){gmPause();return}if(!m)return;ev.preventDefault();if(GM.state!=="play")return;const k=GM.nes?m:(m==="fire"&&GM.id==="blocks"?"drop":m==="up"&&GM.id==="blocks"?"rot":m);gmKey(k,true,ev.repeat)});
  addEventListener("keyup",ev=>{if(!GM||!GM.nes||GM.emu)return;const m={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",Enter:"start",x:"a",X:"a",z:"b",Z:"b",Shift:"select"}[ev.key];if(m)gmKey(m,false)});
  addEventListener("resize",()=>{if(GM&&!$("#gm-ov").hidden)gmFit()});
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"&&GM&&GM.state==="play"&&!(EMU&&EMU.paused)&&!(NES&&NES.paused))gmPause()});
}
function gmKey(k,down,rep){if(!GM)return;if(GM.emu){emuKey(k,down);return}if(GM.nes){nesBtn(k,down);return}if(GM.state!=="play")return;GM.g.key&&GM.g.key(k,down,rep)}
function gmPadHTML(kind){if(kind==="nes")return `<div class="gm-dpad">${[["up","▲"],["left","◀"],["right","▶"],["down","▼"]].map(([k,l])=>`<button data-gk="${k}" class="d-${k}">${l}</button>`).join("")}</div>
   <div class="gm-mid"><button data-gk="select" class="sm">SELECT</button><button data-gk="start" class="sm">START</button></div><div class="gm-ab"><button data-gk="b" class="ab b">B</button><button data-gk="a" class="ab a">A</button></div>`;
  const ks=GM_PADS[kind]||[];if(!ks.length)return "";
  if(kind==="dir")return `<div class="gm-dpad wide">${ks.map(([k,l])=>`<button data-gk="${k}" class="d-${k}">${l}</button>`).join("")}</div>`;
  return `<div class="gm-row">${ks.map(([k,l,r])=>`<button data-gk="${k}"${r?' data-rep="1"':""} class="k-${k}">${l}</button>`).join("")}</div>`}
function gmFit(){if(!GM)return;const g=GM.g,st=$("#gm-stage"),c=$("#gm-c");const W=st.clientWidth-16,H=st.clientHeight-16;const s=Math.max(.2,Math.min(W/g.LW,H/g.LH));
  const dpr=Math.min(3,devicePixelRatio||1);c.style.width=Math.floor(g.LW*s)+"px";c.style.height=Math.floor(g.LH*s)+"px";
  if(GM.emu)return;if(GM.nes){c.width=256;c.height=240;c.style.imageRendering="pixelated";return}
  c.width=Math.round(g.LW*s*dpr);c.height=Math.round(g.LH*s*dpr);GM.cx=c.getContext("2d");GM.cx.setTransform(s*dpr,0,0,s*dpr,0,0);GM.g.draw&&GM.state!=="idle"&&GM.g.draw(GM.cx)}
function gmOpen(id){gmEnsure();const def=GM_LIST.find(g=>g.id===id);const g=GMG[id]();GM={id,def,g,state:"idle",score:0};
  $("#gm-t").textContent=def.e+" "+def.n;$("#gm-pad").innerHTML=gmPadHTML(g.pad||"none");$("#gm-pad").dataset.kind=g.pad||"none";$("#gm-tx").textContent="";
  $("#gm-ov").hidden=false;document.body.classList.add("gm-on");gmFit();gmStart()}
function gmStart(){if(!GM)return;GM.score=0;GM.over=false;GM.g.init();GM.state="play";$("#gm-msg").hidden=true;$("[data-gmp]").textContent="❚❚";gmHud();gmFit();cancelAnimationFrame(GM.raf);GM.last=performance.now();GM.raf=requestAnimationFrame(gmLoop)}
function gmLoop(t){if(!GM)return;const dt=Math.min(.05,(t-GM.last)/1000);GM.last=t;if(GM.state==="play"){GM.g.update&&GM.g.update(dt);GM.g.draw(GM.cx);if(GM.g.hud)gmHud()}GM.raf=requestAnimationFrame(gmLoop)}
function gmHud(){if(!GM)return;const r=GMREC[GM.id];const u=GM.def.unit||"";$("#gm-s").textContent=`${GM.g.label?GM.g.label():"Puntos "+GM.score} · Récord ${r!=null?r+u:"—"}`}
function gmEnd(win,txt){if(!GM||GM.over)return;GM.over=true;GM.state="over";const v=GM.g.result?GM.g.result(win):GM.score;const rec=(GM.def.low?win:true)&&gmRecSave(GM.id,v);gmHud();
  try{navigator.vibrate&&navigator.vibrate(win?[30,40,30]:60)}catch(_){}
  const m=$("#gm-msg");m.innerHTML=`<div class="gm-box"><div class="gm-big">${win?"🏆":rec?"🎉":"💥"}</div><b>${txt||(win?"¡Lo conseguiste!":"Fin de la partida")}</b><span>${GM.def.low?(win?`Tiempo: ${v}${GM.def.unit}`:""):`${v} puntos`}${rec?" · ¡Nuevo récord!":GMREC[GM.id]!=null?` · récord ${GMREC[GM.id]}${GM.def.unit||""}`:""}</span><div class="gm-bb"><button class="btn" data-gmagain>Otra vez</button><button class="btn sec" data-gmx>Salir</button></div></div>`;m.hidden=false;
  if(curApp==="juegos")renderJuegos()}
function gmPause(){if(!GM)return;if(GM.emu){emuPause();return}if(GM.nes){nesPause();return}if(GM.state!=="play")return;GM.state="pause";$("#gm-msg").innerHTML=`<div class="gm-box"><div class="gm-big">⏸</div><b>Pausa</b><div class="gm-bb"><button class="btn" data-gmres>Seguir</button><button class="btn sec" data-gmagain>Reiniciar</button></div></div>`;$("#gm-msg").hidden=false}
function gmResume(){if(!GM)return;if(GM.emu){emuResume();return}if(GM.nes){nesResume();return}GM.state="play";$("#gm-msg").hidden=true;GM.last=performance.now()}
function gmClose(){if(!GM)return;if(GM.emu)emuStop();if(GM.nes)nesStop();cancelAnimationFrame(GM.raf);clearTimeout(GM.lt);GM=null;$("#gm-ov").hidden=true;document.body.classList.remove("gm-on");$("#gm-stage").classList.remove("nes");$("#gm-ov").classList.remove("nes");if(curApp==="juegos")renderJuegos()}
/* drawing helpers */
const gmRR=(cx,x,y,w,h,r,f)=>{cx.beginPath();cx.roundRect?cx.roundRect(x,y,w,h,r):cx.rect(x,y,w,h);cx.fillStyle=f;cx.fill()};
const gmDark=()=>document.documentElement.dataset.theme==="dark"||(document.documentElement.dataset.theme!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);
const gmBG=cx=>{const g=GM.g;cx.fillStyle=gmDark()?"#0E1220":"#F6F7FB";cx.fillRect(0,0,g.LW,g.LH)};
const gmTxt=(cx,t,x,y,sz,col,al)=>{cx.font=`700 ${sz}px Figtree,system-ui,sans-serif`;cx.fillStyle=col;cx.textAlign=al||"center";cx.textBaseline="middle";cx.fillText(t,x,y)};

/* ---------- the games ---------- */
const GMG={
snake(){const C=18,R=24,S=20;let sn,dir,q,food,acc,spd,grow,eaten,bonus;
  const place=()=>{let p;do{p={x:Math.random()*C|0,y:Math.random()*R|0}}while(sn.some(s=>s.x===p.x&&s.y===p.y));return p};
  return{LW:C*S,LH:R*S,pad:"dir",
  init(){sn=[{x:8,y:14},{x:8,y:15},{x:8,y:16}];dir={x:0,y:-1};q=[];food=place();acc=0;spd=7;grow=0;eaten=0;GM.score=0},
  key(k,d){if(!d)return;const v={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}}[k];if(!v)return;const last=q.length?q[q.length-1]:dir;if(v.x===-last.x&&v.y===-last.y||v.x===last.x&&v.y===last.y)return;if(q.length<3)q.push(v)},
  swipe(k){this.key(k,true)},
  update(dt){acc+=dt;const step=1/spd;while(acc>=step){acc-=step;if(q.length)dir=q.shift();const h={x:sn[0].x+dir.x,y:sn[0].y+dir.y};
    if(h.x<0||h.y<0||h.x>=C||h.y>=R||sn.some((s,i)=>i<sn.length-(grow?0:1)&&s.x===h.x&&s.y===h.y)){gmEnd(false);return}
    sn.unshift(h);if(h.x===food.x&&h.y===food.y){eaten++;GM.score+=10;grow+=2;food=place();spd=Math.min(16,7+eaten*.35);gmHud();try{navigator.vibrate&&navigator.vibrate(10)}catch(_){}}
    if(grow>0)grow--;else sn.pop()}},
  draw(cx){gmBG(cx);const dk=gmDark();cx.fillStyle=dk?"#151A2B":"#E9ECF4";for(let y=0;y<R;y++)for(let x=(y%2);x<C;x+=2)cx.fillRect(x*S,y*S,S,S);
    cx.font=`${S*.9}px system-ui`;cx.textAlign="center";cx.textBaseline="middle";cx.fillText("🍎",food.x*S+S/2,food.y*S+S/2+1);
    sn.forEach((s,i)=>{const t=i/sn.length;gmRR(cx,s.x*S+1.5,s.y*S+1.5,S-3,S-3,6,i===0?"#15803D":`hsl(${142-t*30} 65% ${42+t*12}%)`)});
    const h=sn[0];cx.fillStyle="#fff";const ex=dir.y?5:0,ey=dir.x?5:0;[[-1],[1]].forEach(([m])=>{cx.beginPath();cx.arc(h.x*S+S/2+dir.x*4+ex*m,h.y*S+S/2+dir.y*4+ey*m,2.6,0,7);cx.fill()})}}},

blocks(){const C=10,R=20,S=24;const SH={I:[[0,1],[1,1],[2,1],[3,1]],O:[[1,0],[2,0],[1,1],[2,1]],T:[[1,0],[0,1],[1,1],[2,1]],S:[[1,0],[2,0],[0,1],[1,1]],Z:[[0,0],[1,0],[1,1],[2,1]],J:[[0,0],[0,1],[1,1],[2,1]],L:[[2,0],[0,1],[1,1],[2,1]]};
  const COL={I:"#06B6D4",O:"#EAB308",T:"#A855F7",S:"#22C55E",Z:"#EF4444",J:"#3B82F6",L:"#F97316"};let B,cur,nxt,bag,acc,lines,level,flash;
  const take=()=>{if(!bag.length)bag="IOTSZJL".split("").sort(()=>Math.random()-.5);return bag.pop()};
  const cells=p=>p.c.map(([x,y])=>[p.x+x,p.y+y]);
  const fits=p=>cells(p).every(([x,y])=>x>=0&&x<C&&y<R&&(y<0||!B[y][x]));
  const spawn=()=>{cur={t:nxt,c:SH[nxt].map(a=>[...a]),x:3,y:-1};nxt=take();if(!fits(cur)){cur.y--;if(!fits(cur))gmEnd(false)}};
  const rot=()=>{if(cur.t==="O")return;const n=cur.t==="I"?3:2;const c=cur.c.map(([x,y])=>[n-y,x]);for(const k of[0,-1,1,-2,2]){const p={...cur,c,x:cur.x+k};if(fits(p)){cur=p;return}}};
  const lock=()=>{cells(cur).forEach(([x,y])=>{if(y>=0)B[y][x]=cur.t});const full=[];for(let y=0;y<R;y++)if(B[y].every(Boolean))full.push(y);
    if(full.length){full.forEach(y=>{B.splice(y,1);B.unshift(Array(C).fill(0))});lines+=full.length;GM.score+=[0,100,300,500,800][full.length]*level;level=1+Math.floor(lines/10);flash=.15;try{navigator.vibrate&&navigator.vibrate(15)}catch(_){}}
    if(cells(cur).some(([,y])=>y<0)){gmEnd(false);return}spawn();gmHud()};
  const move=(dx,dy)=>{const p={...cur,x:cur.x+dx,y:cur.y+dy};if(fits(p)){cur=p;return true}return false};
  return{LW:C*S+92,LH:R*S,pad:"blocks",label:()=>`Puntos ${GM.score} · Nivel ${level}`,
  init(){B=Array.from({length:R},()=>Array(C).fill(0));bag=[];nxt=take();acc=0;lines=0;level=1;flash=0;GM.score=0;spawn()},
  key(k,d){if(!d)return;if(k==="left")move(-1,0);else if(k==="right")move(1,0);else if(k==="down"){if(move(0,1))GM.score+=1;else lock()}else if(k==="rot")rot();else if(k==="drop"){let n=0;while(move(0,1))n++;GM.score+=n*2;lock()}else if(k==="up")rot()},
  swipe(k){if(k==="down")this.key("drop",true);else if(k==="up")rot();else this.key(k,true)},
  tap(x){if(x<C*S)rot()},
  update(dt){flash=Math.max(0,flash-dt);acc+=dt;const sp=Math.max(.07,.8*Math.pow(.84,level-1));if(acc>=sp){acc=0;if(!move(0,1))lock()}},
  draw(cx){gmBG(cx);const dk=gmDark();cx.fillStyle=dk?"#141A2C":"#E6E9F2";cx.fillRect(0,0,C*S,R*S);cx.strokeStyle=dk?"#1D2438":"#DADFEA";cx.lineWidth=1;
    for(let x=1;x<C;x++){cx.beginPath();cx.moveTo(x*S,0);cx.lineTo(x*S,R*S);cx.stroke()}for(let y=1;y<R;y++){cx.beginPath();cx.moveTo(0,y*S);cx.lineTo(C*S,y*S);cx.stroke()}
    const blk=(x,y,c,a)=>{cx.globalAlpha=a||1;gmRR(cx,x*S+1,y*S+1,S-2,S-2,5,c);cx.globalAlpha=(a||1)*.35;gmRR(cx,x*S+3,y*S+3,S-6,5,3,"#fff");cx.globalAlpha=1};
    for(let y=0;y<R;y++)for(let x=0;x<C;x++)if(B[y][x])blk(x,y,COL[B[y][x]]);
    if(cur){let g={...cur};while(fits({...g,y:g.y+1}))g.y++;cells(g).forEach(([x,y])=>y>=0&&blk(x,y,COL[cur.t],.22));cells(cur).forEach(([x,y])=>y>=0&&blk(x,y,COL[cur.t]))}
    if(flash){cx.fillStyle=`rgba(255,255,255,${flash*3})`;cx.fillRect(0,0,C*S,R*S)}
    const px=C*S+10,ink=dk?"#E7EAF2":"#161B2C",mu=dk?"#98A0B3":"#5D6578";gmTxt(cx,"Siguiente",px+36,16,12,mu);
    SH[nxt].forEach(([x,y])=>gmRR(cx,px+8+x*16,32+y*16,15,15,4,COL[nxt]));
    gmTxt(cx,"Nivel",px+36,100,12,mu);gmTxt(cx,String(level),px+36,120,22,ink);gmTxt(cx,"Líneas",px+36,156,12,mu);gmTxt(cx,String(lines),px+36,176,22,ink);gmTxt(cx,"Puntos",px+36,212,12,mu);gmTxt(cx,String(GM.score),px+36,232,18,ink);
    gmTxt(cx,"Toca: girar",px+36,R*S-46,10,mu);gmTxt(cx,"Desliza ↓:",px+36,R*S-30,10,mu);gmTxt(cx,"caer",px+36,R*S-16,10,mu)}}},

brick(){const W=360,H=540,PW0=74;let pad,ball,bricks,lives,lvl,stuck,held,pw;
  const wall=()=>{bricks=[];const cols=8,rows=Math.min(8,4+lvl),bw=(W-20)/cols;const hue=[0,25,45,140,195,230,265,300];
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){if(lvl>2&&(r+c)%5===0&&r>1)continue;bricks.push({x:10+c*bw,y:60+r*22,w:bw-4,h:18,hp:lvl>1&&r<2?2:1,col:`hsl(${hue[r%8]} 75% 55%)`})}};
  const reset=()=>{stuck=true;ball={x:pad,y:H-52,vx:0,vy:0,r:7}};
  return{LW:W,LH:H,pad:"lr",label:()=>`Puntos ${GM.score} · ❤️ ${lives} · Nivel ${lvl}`,hud:false,
  init(){pad=W/2;lives=3;lvl=1;held={};pw=PW0;GM.score=0;wall();reset()},
  launch(){if(!stuck)return;stuck=false;const sp=310+lvl*25;const a=-Math.PI/2+(Math.random()-.5)*.6;ball.vx=Math.cos(a)*sp;ball.vy=Math.sin(a)*sp},
  key(k,d){if(k==="fire"){if(d)this.launch();return}held[k]=d},
  pdown(x){pad=Math.max(pw/2,Math.min(W-pw/2,x))},pmove(x){pad=Math.max(pw/2,Math.min(W-pw/2,x))},tap(){this.launch()},
  update(dt){const sp=420;if(held.left)pad-=sp*dt;if(held.right)pad+=sp*dt;pad=Math.max(pw/2,Math.min(W-pw/2,pad));
    if(stuck){ball.x=pad;ball.y=H-52;return}
    const n=Math.ceil(Math.hypot(ball.vx,ball.vy)*dt/5);for(let i=0;i<n;i++){const d=dt/n;ball.x+=ball.vx*d;ball.y+=ball.vy*d;
      if(ball.x<ball.r){ball.x=ball.r;ball.vx=Math.abs(ball.vx)}if(ball.x>W-ball.r){ball.x=W-ball.r;ball.vx=-Math.abs(ball.vx)}if(ball.y<ball.r+30){ball.y=ball.r+30;ball.vy=Math.abs(ball.vy)}
      if(ball.vy>0&&ball.y+ball.r>=H-40&&ball.y+ball.r<=H-28&&Math.abs(ball.x-pad)<pw/2+ball.r){const sp2=Math.hypot(ball.vx,ball.vy)*1.01,o=(ball.x-pad)/(pw/2),a=-Math.PI/2+o*1.05;ball.vx=Math.cos(a)*sp2;ball.vy=Math.sin(a)*sp2;ball.y=H-40-ball.r}
      for(const b of bricks){if(b.hp<=0)continue;if(ball.x+ball.r>b.x&&ball.x-ball.r<b.x+b.w&&ball.y+ball.r>b.y&&ball.y-ball.r<b.y+b.h){
        const ox=Math.min(ball.x+ball.r-b.x,b.x+b.w-(ball.x-ball.r)),oy=Math.min(ball.y+ball.r-b.y,b.y+b.h-(ball.y-ball.r));if(ox<oy)ball.vx*=-1;else ball.vy*=-1;
        b.hp--;GM.score+=b.hp>0?5:10;gmHud();break}}}
    if(ball.y>H+20){lives--;gmHud();try{navigator.vibrate&&navigator.vibrate(40)}catch(_){}if(lives<=0){gmEnd(false);return}reset()}
    if(bricks.every(b=>b.hp<=0)){lvl++;GM.score+=100;wall();reset();gmHud()}},
  draw(cx){gmBG(cx);const dk=gmDark();gmTxt(cx,"❤️".repeat(lives),10,16,14,"#fff","left");gmTxt(cx,`Nivel ${lvl}`,W-10,16,13,dk?"#98A0B3":"#5D6578","right");
    bricks.forEach(b=>{if(b.hp<=0)return;gmRR(cx,b.x,b.y,b.w,b.h,5,b.col);if(b.hp>1){cx.globalAlpha=.45;gmRR(cx,b.x+3,b.y+3,b.w-6,b.h-6,3,"#fff");cx.globalAlpha=1}});
    gmRR(cx,pad-pw/2,H-40,pw,12,6,dk?"#8EA6EE":"#3550A3");cx.beginPath();cx.arc(ball.x,ball.y,ball.r,0,7);cx.fillStyle="#F59E0B";cx.fill();
    if(stuck)gmTxt(cx,"Toca para lanzar · arrastra para mover",W/2,H-12,12,dk?"#98A0B3":"#5D6578")}}},

g2048(){const N=4,S=400,P=12,CS=(S-P*(N+1))/N;let g,won,keep,pop;
  const COLS={2:"#EEE4DA",4:"#EDE0C8",8:"#F2B179",16:"#F59563",32:"#F67C5F",64:"#F65E3B",128:"#EDCF72",256:"#EDCC61",512:"#EDC850",1024:"#EDC53F",2048:"#EDC22E"};
  const add=()=>{const e=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(!g[y][x])e.push([x,y]);if(!e.length)return;const[x,y]=e[Math.random()*e.length|0];g[y][x]=Math.random()<.9?2:4;pop={x,y,t:.15}};
  const canMove=()=>{for(let y=0;y<N;y++)for(let x=0;x<N;x++){const v=g[y][x];if(!v)return true;if(x<N-1&&g[y][x+1]===v)return true;if(y<N-1&&g[y+1][x]===v)return true}return false};
  const slide=dir=>{let moved=false;for(let i=0;i<N;i++){let line=[];for(let j=0;j<N;j++){const[x,y]=dir==="left"?[j,i]:dir==="right"?[N-1-j,i]:dir==="up"?[i,j]:[i,N-1-j];line.push(g[y][x])}
      const v=line.filter(Boolean),o=[];for(let k=0;k<v.length;k++){if(v[k]===v[k+1]){o.push(v[k]*2);GM.score+=v[k]*2;if(v[k]*2===2048&&!won)won=true;k++}else o.push(v[k])}while(o.length<N)o.push(0);
      for(let j=0;j<N;j++){const[x,y]=dir==="left"?[j,i]:dir==="right"?[N-1-j,i]:dir==="up"?[i,j]:[i,N-1-j];if(g[y][x]!==o[j])moved=true;g[y][x]=o[j]}}return moved};
  return{LW:S,LH:S,pad:"dir",
  init(){g=Array.from({length:N},()=>Array(N).fill(0));won=false;keep=false;GM.score=0;add();add()},
  key(k,d){if(!d||!["up","down","left","right"].includes(k))return;if(slide(k)){add();gmHud();try{navigator.vibrate&&navigator.vibrate(6)}catch(_){}
      if(won&&!keep){keep=true;gmRecSave("g2048",GM.score);toast("🏆 ¡Has llegado a 2048! Puedes seguir.")}if(!canMove())setTimeout(()=>gmEnd(false,"Sin movimientos"),250)}},
  swipe(k){this.key(k,true)},
  update(dt){if(pop)pop.t-=dt;if(pop&&pop.t<=0)pop=null},
  draw(cx){gmBG(cx);gmRR(cx,0,0,S,S,16,"#BBADA0");for(let y=0;y<N;y++)for(let x=0;x<N;x++){const v=g[y][x];let px=P+x*(CS+P),py=P+y*(CS+P),cs=CS;
      if(pop&&pop.x===x&&pop.y===y){const k=1-pop.t/.15*.5;px+=CS*(1-k)/2;py+=CS*(1-k)/2;cs=CS*k}
      gmRR(cx,px,py,cs,cs,10,v?(COLS[v]||"#3C3A32"):"rgba(238,228,218,.35)");if(v)gmTxt(cx,String(v),px+cs/2,py+cs/2+2,v<100?40:v<1000?34:26,v<=4?"#776E65":"#fff")}}}},

bird(){const W=360,H=560,G=1350,FL=-400,GAP=150,PWD=62;let b,pipes,t,started,dead,gnd;
  return{LW:W,LH:H,pad:"none",
  init(){b={x:100,y:H/2-40,vy:0};pipes=[];t=0;started=false;dead=false;gnd=0;GM.score=0},
  pdown(){if(dead)return;started=true;b.vy=FL},key(k,d){if(d)this.pdown()},
  update(dt){gnd=(gnd+dt*140)%24;if(!started){b.y=H/2-40+Math.sin(performance.now()/250)*8;return}
    b.vy+=G*dt;b.y+=b.vy*dt;t+=dt;const sp=140+Math.min(60,GM.score*2);
    if(!pipes.length||pipes[pipes.length-1].x<W-210){const top=60+Math.random()*(H-90-GAP-80);pipes.push({x:W+10,top,ok:false})}
    pipes.forEach(p=>{p.x-=sp*dt;if(!p.ok&&p.x+PWD<b.x){p.ok=true;GM.score++;gmHud();try{navigator.vibrate&&navigator.vibrate(6)}catch(_){}}});pipes=pipes.filter(p=>p.x>-PWD-5);
    const hit=b.y+14>H-60||b.y-14<0||pipes.some(p=>b.x+13>p.x&&b.x-13<p.x+PWD&&(b.y-12<p.top||b.y+12>p.top+GAP));if(hit){dead=true;gmEnd(false)}},
  draw(cx){const sky=cx.createLinearGradient(0,0,0,H);sky.addColorStop(0,gmDark()?"#0B1530":"#7DD3FC");sky.addColorStop(1,gmDark()?"#1E293B":"#E0F2FE");cx.fillStyle=sky;cx.fillRect(0,0,W,H);
    pipes.forEach(p=>{gmRR(cx,p.x,-10,PWD,p.top+10,8,"#22C55E");gmRR(cx,p.x-4,p.top-22,PWD+8,22,6,"#16A34A");gmRR(cx,p.x,p.top+GAP,PWD,H,8,"#22C55E");gmRR(cx,p.x-4,p.top+GAP,PWD+8,22,6,"#16A34A")});
    cx.fillStyle="#D97706";cx.fillRect(0,H-60,W,60);cx.fillStyle="#84CC16";cx.fillRect(0,H-60,W,12);cx.fillStyle="#65A30D";for(let x=-gnd;x<W;x+=24)cx.fillRect(x,H-60,12,12);
    cx.save();cx.translate(b.x,b.y);cx.rotate(Math.max(-.5,Math.min(1.2,b.vy/600)));cx.fillStyle="#FACC15";cx.beginPath();cx.ellipse(0,0,16,13,0,0,7);cx.fill();cx.fillStyle="#EAB308";cx.beginPath();cx.ellipse(-5,3+Math.sin(performance.now()/60)*3,8,5,-.3,0,7);cx.fill();cx.fillStyle="#fff";cx.beginPath();cx.arc(7,-4,5,0,7);cx.fill();cx.fillStyle="#111";cx.beginPath();cx.arc(8.5,-4,2.2,0,7);cx.fill();cx.fillStyle="#F97316";cx.beginPath();cx.moveTo(12,1);cx.lineTo(22,4);cx.lineTo(12,8);cx.closePath();cx.fill();cx.restore();
    gmTxt(cx,String(GM.score),W/2,60,46,"#fff");if(!started)gmTxt(cx,"Toca para volar",W/2,H/2+40,18,gmDark()?"#E7EAF2":"#0C4A6E")}}},

mines(){const C=9,R=12,S=40,M=16;let g,first,flagMode,left,t0,tt,done;
  const nb=(x,y)=>{const o=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const a=x+dx,b=y+dy;if(a>=0&&b>=0&&a<C&&b<R)o.push([a,b])}return o};
  const lay=(sx,sy)=>{let n=0;while(n<M){const x=Math.random()*C|0,y=Math.random()*R|0;if(g[y][x].m||Math.abs(x-sx)<=1&&Math.abs(y-sy)<=1)continue;g[y][x].m=true;n++}
    for(let y=0;y<R;y++)for(let x=0;x<C;x++)g[y][x].n=nb(x,y).filter(([a,b])=>g[b][a].m).length};
  const open=(x,y)=>{const st=[[x,y]];while(st.length){const[a,b]=st.pop();const c=g[b][a];if(c.o||c.f)continue;c.o=true;left--;if(!c.n&&!c.m)nb(a,b).forEach(p=>st.push(p))}};
  const time=()=>Math.round(((done?tt:performance.now())-t0)/1000)||0;
  const setMode=()=>{const k=$("#gm-pad .k-flag");if(k){k.classList.toggle("act",flagMode);k.textContent=flagMode?"🚩 Bandera: SÍ":"🚩 Modo bandera"}};
  return{LW:C*S,LH:R*S,pad:"mines",hud:true,label:()=>`💣 ${M-g.flat().filter(c=>c.f).length} · ⏱ ${t0?time():0}s`,result:()=>time(),
  init(){g=Array.from({length:R},()=>Array.from({length:C},()=>({m:false,n:0,o:false,f:false})));first=true;flagMode=false;left=C*R;t0=0;done=false;setTimeout(setMode,0)},
  key(k,d){if(k==="flag"&&d){flagMode=!flagMode;setMode()}},
  flag(x,y){const c=g[y]&&g[y][x];if(!c||c.o)return;c.f=!c.f},
  long(px,py){this.flag(px/S|0,py/S|0)},
  tap(px,py){const x=px/S|0,y=py/S|0;if(x<0||y<0||x>=C||y>=R)return;const c=g[y][x];
    if(flagMode){this.flag(x,y);return}if(c.f)return;
    if(c.o){const f=nb(x,y).filter(([a,b])=>g[b][a].f).length;if(f===c.n)nb(x,y).forEach(([a,b])=>{const d=g[b][a];if(!d.o&&!d.f){if(d.m){d.o=true;d.boom=true;this.lose()}else open(a,b)}});this.check();return}
    if(first){first=false;lay(x,y);t0=performance.now()}
    if(c.m){c.o=true;c.boom=true;this.lose();return}open(x,y);this.check()},
  lose(){if(done)return;done=true;tt=performance.now();g.flat().forEach(c=>{if(c.m)c.o=true});setTimeout(()=>gmEnd(false,"¡Boom! Pisaste una mina"),450)},
  check(){if(!done&&left===M){done=true;tt=performance.now();g.flat().forEach(c=>{if(c.m)c.f=true});setTimeout(()=>gmEnd(true,"¡Campo despejado!"),300)}},
  update(){},
  draw(cx){gmBG(cx);const dk=gmDark();const NC=["","#2563EB","#16A34A","#DC2626","#7C3AED","#B45309","#0891B2","#111827","#6B7280"];
    for(let y=0;y<R;y++)for(let x=0;x<C;x++){const c=g[y][x],px=x*S,py=y*S;
      if(!c.o){gmRR(cx,px+2,py+2,S-4,S-4,7,dk?"#2B3550":"#AEB9D0");cx.globalAlpha=.35;gmRR(cx,px+4,py+4,S-8,6,3,"#fff");cx.globalAlpha=1;if(c.f){cx.font="20px system-ui";cx.textAlign="center";cx.textBaseline="middle";cx.fillText("🚩",px+S/2,py+S/2+1)}}
      else{gmRR(cx,px+2,py+2,S-4,S-4,7,c.boom?"#FCA5A5":dk?"#161C2C":"#EEF1F7");
        if(c.m){cx.font="20px system-ui";cx.textAlign="center";cx.textBaseline="middle";cx.fillText("💣",px+S/2,py+S/2+1)}else if(c.n)gmTxt(cx,String(c.n),px+S/2,py+S/2+1,20,dk&&c.n===7?"#E5E7EB":NC[c.n])}}}}}
};

/* ---------- NES (jsnes, loaded on demand) ---------- */
let NESJS=null;
function nesLib(){if(window.jsnes)return Promise.resolve(window.jsnes);if(NESJS)return NESJS;
  const srcs=["https://cdn.jsdelivr.net/npm/jsnes@3.0.0/dist/jsnes.min.js","https://unpkg.com/jsnes@3.0.0/dist/jsnes.min.js"];
  NESJS=new Promise((ok,ko)=>{const tryN=i=>{if(i>=srcs.length){NESJS=null;ko(new Error("x"));return}const s=document.createElement("script");s.src=srcs[i];s.onload=()=>window.jsnes?ok(window.jsnes):tryN(i+1);s.onerror=()=>tryN(i+1);document.head.appendChild(s)};tryN(0)});return NESJS}
let NES=null;const NES_SAVE_MEM={};
async function nesOpen(id){gmEnsure();let rom;try{rom=await nesTx("roms","readonly",s=>s.get(id))}catch(e){}rom=rom||EMU_ROM_MEM[id];if(!rom){toast("No encuentro ese juego en este dispositivo.");return}
  GM={id:"nes",nes:true,def:{e:"🎮",n:rom.name},g:{LW:256,LH:240},state:"play",rom:id};
  $("#gm-t").textContent="🎮 "+rom.name;$("#gm-s").textContent="Cargando…";$("#gm-tx").innerHTML=`<button class="gm-ib sm" data-nesact="save" aria-label="Guardar partida">💾</button><button class="gm-ib sm" data-nesact="load" aria-label="Cargar partida">▶︎💾</button><button class="gm-ib sm" data-nesact="snd" aria-label="Sonido">🔊</button>`;
  $("#gm-pad").innerHTML=gmPadHTML("nes");$("#gm-pad").dataset.kind="nes";$("#gm-stage").classList.add("nes");$("#gm-ov").classList.add("nes");$("#gm-msg").hidden=true;$("#gm-ov").hidden=false;document.body.classList.add("gm-on");gmFit();
  let lib;try{lib=await nesLib()}catch(e){$("#gm-s").textContent="";$("#gm-msg").innerHTML=`<div class="gm-box"><div class="gm-big">⚠️</div><b>No se pudo cargar el emulador</b><span>Revisa la conexión y vuelve a intentarlo.</span><div class="gm-bb"><button class="btn sec" data-gmx>Salir</button></div></div>`;$("#gm-msg").hidden=false;return}
  if(!GM||!GM.nes)return;
  const c=$("#gm-c"),cx=c.getContext("2d"),img=cx.createImageData(256,240),b32=new Uint32Array(img.data.buffer);
  let actx=null,node=null,ring=new Float32Array(16384),wp=0,rp=0,cnt=0,snd=true;try{snd=localStorage.getItem("gfNesSnd")!=="0"}catch(e){}
  try{const AC=window.AudioContext||window.webkitAudioContext;actx=new AC();node=actx.createScriptProcessor(2048,0,2);
    node.onaudioprocess=ev=>{const L=ev.outputBuffer.getChannelData(0),R2=ev.outputBuffer.getChannelData(1);for(let i=0;i<L.length;i++){if(cnt>0&&snd&&NES&&!NES.paused){const v=ring[rp];rp=(rp+1)&16383;cnt--;L[i]=R2[i]=v}else L[i]=R2[i]=0}};node.connect(actx.destination);actx.resume&&actx.resume()}catch(e){actx=null}
  const nes=new lib.NES({sampleRate:actx?actx.sampleRate:48000,emulateSound:!!actx,
    onFrame:fb=>{for(let i=0;i<61440;i++)b32[i]=0xFF000000|fb[i];cx.putImageData(img,0,0)},
    onAudioSample:(l,r)=>{if(!snd)return;if(cnt>=16000){rp=(rp+1)&16383;cnt--}ring[wp]=(l+r)/2;wp=(wp+1)&16383;cnt++}});
  try{nes.loadROM(rom.data)}catch(e){$("#gm-s").textContent="";$("#gm-msg").innerHTML=`<div class="gm-box"><div class="gm-big">😕</div><b>Este juego no es compatible</b><span>El emulador no soporta este cartucho (mapper). Prueba con otro.</span><div class="gm-bb"><button class="btn sec" data-gmx>Salir</button></div></div>`;$("#gm-msg").hidden=false;try{actx&&actx.close()}catch(_){}return}
  NES={nes,lib,actx,paused:false,raf:0,acc:0,last:performance.now(),get snd(){return snd},set snd(v){snd=v;try{localStorage.setItem("gfNesSnd",v?"1":"0")}catch(e){}}};
  $("[data-nesact=snd]").textContent=snd?"🔊":"🔇";
  rom.last=Date.now();rom.plays=(rom.plays||0)+1;if(EMU_ROM_MEM[rom.id])Object.assign(EMU_ROM_MEM[rom.id],{last:rom.last,plays:rom.plays});cloudMetaSoon(rom);nesTx("roms","readwrite",s=>s.put(rom)).catch(()=>{});
  let has=!!(GMCLOUD.saves["nes-"+id]||NES_SAVE_MEM[id]);try{has=has||!!(await nesTx("saves","readonly",s=>s.get(id)))}catch(e){}
  $("#gm-s").textContent=has?"Tienes una partida guardada (▶︎💾)":"START para empezar";
  const loop=t=>{if(!NES)return;const dt=Math.min(100,t-NES.last);NES.last=t;if(!NES.paused){NES.acc+=dt;let n=0;while(NES.acc>=1000/60&&n<3){try{nes.frame()}catch(e){}NES.acc-=1000/60;n++}if(n===3)NES.acc=0}NES.raf=requestAnimationFrame(loop)};NES.raf=requestAnimationFrame(loop)}
function nesBtn(k,down){if(!NES||NES.paused)return;const C=NES.lib.Controller;const m={up:C.BUTTON_UP,down:C.BUTTON_DOWN,left:C.BUTTON_LEFT,right:C.BUTTON_RIGHT,a:C.BUTTON_A,b:C.BUTTON_B,start:C.BUTTON_START,select:C.BUTTON_SELECT}[k];
  if(m==null)return;try{down?NES.nes.buttonDown(1,m):NES.nes.buttonUp(1,m)}catch(e){}if(down&&NES.actx&&NES.actx.state==="suspended")NES.actx.resume()}
function nesPause(){if(!NES)return;if(NES.paused){nesResume();return}NES.paused=true;$("[data-gmp]").textContent="▶︎";$("#gm-msg").innerHTML=`<div class="gm-box"><div class="gm-big">⏸</div><b>Pausa</b><div class="gm-bb"><button class="btn" data-gmres>Seguir</button><button class="btn sec" data-nesact="reset">Reiniciar</button></div></div>`;$("#gm-msg").hidden=false}
function nesResume(){if(!NES)return;NES.paused=false;NES.last=performance.now();NES.acc=0;$("[data-gmp]").textContent="❚❚";$("#gm-msg").hidden=true;NES.actx&&NES.actx.resume&&NES.actx.resume()}
function nesStop(){if(!NES)return;cancelAnimationFrame(NES.raf);try{NES.actx&&NES.actx.close()}catch(e){}NES=null}
async function nesAct(a){if(GM&&GM.emu){emuAct(a);return}if(!NES||!GM)return;
  if(a==="snd"){NES.snd=!NES.snd;$("[data-nesact=snd]").textContent=NES.snd?"🔊":"🔇";NES.actx&&NES.actx.resume&&NES.actx.resume();return}
  if(a==="reset"){try{NES.nes.reset()}catch(e){}nesResume();return}
  if(a==="save"){try{const st=JSON.stringify(NES.nes.toJSON());try{await nesTx("saves","readwrite",s=>s.put({id:GM.rom,st,at:Date.now()}))}catch(e){}NES_SAVE_MEM[GM.rom]=st;cloudPut("save","nes-"+GM.rom,new TextEncoder().encode(st),{eng:"nes",rom:GM.rom},"tu partida");toast("💾 Partida guardada en este dispositivo.");$("#gm-s").textContent="Partida guardada"}catch(e){toast("No se pudo guardar la partida.")}return}
  if(a==="load"){try{let s=null;try{s=await nesTx("saves","readonly",s=>s.get(GM.rom))}catch(e){}if(!s&&NES_SAVE_MEM[GM.rom])s={st:NES_SAVE_MEM[GM.rom]};const cm=GMCLOUD.saves["nes-"+GM.rom];if(!s&&cm){s={st:new TextDecoder().decode(await cloudGet("save","nes-"+GM.rom,cm,"tu partida"))}}if(!s){toast("Aún no has guardado partida de este juego.");return}NES.nes.fromJSON(JSON.parse(s.st));nesResume();toast("▶︎ Partida cargada.");$("#gm-s").textContent="Partida cargada"}catch(e){toast("No se pudo cargar la partida.")}return}}


document.addEventListener("click",async e=>{const d=e.target.closest("[data-dl]");if(!d)return;const [cs,f]=d.dataset.dl.split("|");if((NESROMS||[]).some(r=>r.file===f)){const r=NESROMS.find(r=>r.file===f);romPlay(r.id);return}
  const em=d.querySelector("em");em.textContent="⏳";try{const r=await fetch(`https://raw.githubusercontent.com/retrobrews/${GM_CAT_REPO[cs]}/master/${encodeURIComponent(f)}`);if(!r.ok)throw new Error(r.status);const b=await r.blob();await romAddFiles([new File([b],f)]);em.textContent="✅";toast("Añadido a Consolas. Tócalo otra vez para jugar.")}catch(err){em.textContent="⬇️";toast("No se pudo descargar ("+(err.message||err)+")")}});

document.addEventListener("click",e=>{if(!e.target.closest("[data-smsswap]")||!EMU||EMU.sys!=="sms")return;const v=!smsSwap();try{localStorage.setItem("gjSmsSwap",v?"1":"0")}catch(_){}$("#gm-pad").innerHTML=emuPadHTML("sms");toast(v?"Botones cambiados: ahora el de la izquierda es el 2.":"Botones normales: el de la izquierda es el 1.")});
