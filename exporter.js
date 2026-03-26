// ═══════════════════════════════════════════════════════════
// EXPORTER MODULE (MP4 & ZIP)
// ═══════════════════════════════════════════════════════════

// --- TAMBAHAN: Proteksi Tutup Tab (Lebih dari 1 menit) ---
window.addEventListener('beforeunload', function (e) {
  if (isRendering && window._renderStartTime) {
    const elapsedSec = (Date.now() - window._renderStartTime) / 1000;
    if (elapsedSec > 60) {
      e.preventDefault();
      e.returnValue = ''; 
      return '';
    }
  }
});
// ---------------------------------------------------------

// Fungsi untuk format waktu menjadi HH:MM:SS atau MM:SS
function formatRenderTime(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds < 0) return "00:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = n => String(n).padStart(2, '0');
  
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

// Fungsi untuk format waktu natural ("2 Hours 15 Minutes")
function formatNaturalTime(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds < 0) return "a few seconds";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  
  let res = [];
  if (h > 0) res.push(`${h} Hour${h > 1 ? 's' : ''}`);
  if (m > 0) res.push(`${m} Minute${m > 1 ? 's' : ''}`);
  
  if (res.length === 0) return "less than a minute";
  return res.join(' ');
}

function rpSet(pct,stage,sub,enc=false){
  document.getElementById('rpFill').style.width=pct+'%';
  document.getElementById('rpFill').className='rp-fill'+(enc?' enc':'');
  document.getElementById('rpStage').textContent=stage;
  document.getElementById('rpPct').textContent=Math.round(pct)+'%';
  if(sub!=null)document.getElementById('rpSub').textContent=sub;
}

// ── STATE PAUSE & RESUME ──
let renderPaused = false;
let pauseStartTime = 0;

function togglePauseRender() {
  renderPaused = !renderPaused;
  const btn = document.getElementById('btnPause');
  if(renderPaused) {
    btn.textContent = '▶ Resume';
    pauseStartTime = Date.now();
    notif('Render paused', '#f0d04a');
    document.getElementById('rpStage').textContent = 'Paused...';
  } else {
    btn.textContent = '⏸ Pause';
    const pausedDuration = Date.now() - pauseStartTime;
    window._renderStartTime += pausedDuration; // Offset waktu mulai agar ETA tidak rusak
    notif('Render resumed', '#4af0a0');
  }
}

// ── KONFIRMASI CANCEL RENDER ──
function cancelRenderPrompt() {
  if(!isRendering) return;
  confirmDialog('Cancel Render', 'Are you sure you want to cancel the rendering process? All progress will be lost.', () => {
    renderPaused = false; // Lepas pause agar loop bisa exit
    cancelRender();
  });
}

async function prefetchMapData(idx){
  const pts = gpxData.points;
  const needed = new Set();
  const step = Math.max(1, Math.floor(idx.length / 50));
  for(let i=0; i<idx.length; i+=step){
    const pt = pts[idx[i]];
    const k = vecCacheKey(pt.lat, pt.lon, osmZoom);
    if(!vecCache.has(k) || !vecCache.get(k).fetched) needed.add(k);
  }
  if(needed.size === 0) return;

  const keys = [...needed];
  for(let i=0; i<keys.length; i+=3){
    if(renderCancelled) return;
    const batch = keys.slice(i, i+3);
    rpSet(
      Math.round((i/keys.length)*80),
      'Fetching map data '+(i+1)+' / '+keys.length,
      batch.length+' area(s) · Overpass API',
      false
    );
    await Promise.all(batch.map(k=>{
      const pt = pts[idx[Math.floor(i/keys.length*idx.length)]];
      const bbox = vecBBox(pt.lat, pt.lon, osmZoom, osmMapPxSize());
      return fetchVecDataSync(bbox, k);
    }));
    await new Promise(r=>setTimeout(r,800)); 
  }
  rpSet(80,'Map data ready','All areas fetched',false);
  await new Promise(r=>setTimeout(r,200));
}

function fetchVecDataSync(bbox, cacheKey){
  const existing = vecCache.get(cacheKey);
  if(existing && existing.fetched) return Promise.resolve();
  if(existing && existing.fetching) return new Promise(res=>{
    const check=setInterval(()=>{
      const v=vecCache.get(cacheKey);
      if(v&&v.fetched){clearInterval(check);res();}
    },200);
    setTimeout(()=>{clearInterval(check);res();},8000);
  });
  return fetchVecData(bbox, cacheKey);
}

async function startRender(){
  if(!gpxData) { notif('Tolong muat file GPX terlebih dahulu', '#f0a04a'); return; }
  if(isRendering) return; 
  
  const idx=buildFrameIndices();
  const nf=idx.length;
  
  if (!_skipWarnCheck) {
    if (renderFmt === 'zip' && nf > 5000) {
      showWarnPopup(nf, 'zip');
      return;
    }
    if (renderFmt === 'mp4' && nf > 30000) {
      showWarnPopup(nf, 'mp4');
      return;
    }
  }
  
  _skipWarnCheck=false;

  if(renderFmt==='mp4'&&typeof VideoEncoder==='undefined'){
    notif('WebCodecs API not available. Use Chrome 94+, Edge 94+, or Safari 16.4+','#ff5c5c');
    return;
  }

  isRendering=true; 
  renderedBlob=null;
  renderCancelled=false;
  renderPaused=false;
  pauseStartTime=0;

  window._renderStartTime=Date.now();
  window._renderFrameCount=nf;
  
  notif('⏳ Render started — '+window._renderFrameCount.toLocaleString()+' frames · '+fpsVal+' fps','#f0a04a');
  playing=false; cancelAnimationFrame(rafId);
  
  document.getElementById('btnPlay').textContent='▶';
  document.getElementById('btnRender').disabled=true;
  document.getElementById('btnRender').textContent='⏳ Rendering...';
  document.getElementById('btnDownload').style.display='none';
  
  const actBtns = document.getElementById('renderActionBtns');
  if(actBtns) actBtns.style.display='flex';
  
  const pb = document.getElementById('btnPause');
  if(pb) { pb.style.display='block'; pb.textContent='⏸ Pause'; pb.disabled=false; }
  
  const bc = document.getElementById('btnCancel');
  if(bc) { bc.style.display='block'; bc.textContent='✕ Cancel'; bc.disabled=false; }

// --- KUNCI TIMEFRAME & SCRUBBER ---
  const tfBox = document.getElementById('tfBox');
  if (tfBox) { tfBox.style.pointerEvents = 'none'; tfBox.style.opacity = '0.5'; }
  const scrubber = document.getElementById('scrubber');
  if (scrubber) scrubber.disabled = true;
  const tfS = document.getElementById('tfS');
  if (tfS) tfS.disabled = true;
  const tfE = document.getElementById('tfE');
  if (tfE) tfE.disabled = true;

  // --- TAMBAHAN: KUNCI SEMUA PANEL UI LAINNYA ---
  const rightPanel = document.getElementById('rightPanel');
  if (rightPanel) { rightPanel.style.pointerEvents = 'none'; rightPanel.style.opacity = '0.4'; }

  const playbar = document.getElementById('playbar');
  if (playbar) { playbar.style.pointerEvents = 'none'; playbar.style.opacity = '0.4'; }

  const dropZone = document.getElementById('dropZone');
  if (dropZone) { dropZone.style.pointerEvents = 'none'; dropZone.style.opacity = '0.5'; }

  const canvasWrap = document.getElementById('canvasWrapper');
  if (canvasWrap) { canvasWrap.style.pointerEvents = 'none'; } // Mematikan drag & resize overlay di layar
  // ----------------------------------------------
  
  document.getElementById('rpWrap').classList.add('vis');
  rpSet(0,'Building frame list...','');
  rpSet(0,'Starting render',nf+' frames at '+fpsVal+' fps');

  if(opts.map && osmUseOSM){
    rpSet(1,'Pre-fetching map data...','Fetching road/building data from Overpass API...',false);
    await prefetchMapData(idx);
  }

  if(renderFmt==='mp4') await renderMP4(idx,nf);
  else await renderZIP(idx,nf);
}

const MP4 = (() => {
  function u8(n){ return [(n>>>0)&0xFF] }
  function u16be(n){ return [(n>>8)&0xFF, n&0xFF] }
  function u32be(n){ return [(n>>>24)&0xFF,(n>>>16)&0xFF,(n>>>8)&0xFF,n&0xFF] }
  function u64be(n){ 
    const b=BigInt(n);
    return [
      Number((b>>56n)&0xFFn),Number((b>>48n)&0xFFn),
      Number((b>>40n)&0xFFn),Number((b>>32n)&0xFFn),
      Number((b>>24n)&0xFFn),Number((b>>16n)&0xFFn),
      Number((b>>8n)&0xFFn), Number(b&0xFFn)
    ];
  }
  function flattenToUint8(arr){
    function calcSize(a){
      let s=0;
      for(const x of a) s+=(Array.isArray(x)||x instanceof Uint8Array)?calcSize(x):1;
      return s;
    }
    const out=new Uint8Array(calcSize(arr));
    let pos=0;
    function fill(a){
      for(const x of a){
        if(Array.isArray(x)||x instanceof Uint8Array) fill(x);
        else out[pos++]=x&0xFF;
      }
    }
    fill(arr);
    return out;
  }

  function box(type,...payloads){
    const name=[...type].map(c=>c.charCodeAt(0));
    const body=flattenToUint8(payloads);
    const size=8+body.length;
    const out=new Uint8Array(size);
    const dv=new DataView(out.buffer);
    dv.setUint32(0,size,false);
    out[4]=name[0];out[5]=name[1];out[6]=name[2];out[7]=name[3];
    out.set(body,8);
    return out;
  }
  function fullbox(type,ver,flags,...payloads){
    const body=flattenToUint8(payloads);
    const size=12+body.length;
    const out=new Uint8Array(size);
    const dv=new DataView(out.buffer);
    dv.setUint32(0,size,false);
    [...type].forEach((c,i)=>out[4+i]=c.charCodeAt(0));
    out[8]=ver&0xFF;
    out[9]=(flags>>16)&0xFF; out[10]=(flags>>8)&0xFF; out[11]=flags&0xFF;
    out.set(body,12);
    return out;
  }

  function parseAnnexB(buf){
    const nal=[];
    const u=buf instanceof Uint8Array?buf:new Uint8Array(buf);
    let i=0;
    function findNext(from){
      for(let j=from;j<u.length-3;j++){
        if(u[j]===0&&u[j+1]===0&&u[j+2]===1) return j;
        if(u[j]===0&&u[j+1]===0&&u[j+2]===0&&u[j+3]===1) return j;
      }
      return u.length;
    }
    let start=0;
    while(start<u.length){
      let off=start;
      if(u[off]===0&&u[off+1]===0&&u[off+2]===0&&u[off+3]===1) off+=4;
      else if(u[off]===0&&u[off+1]===0&&u[off+2]===1) off+=3;
      else { start++; continue; }
      const next=findNext(off);
      if(off<next){
        nal.push({type:u[off]&0x1F, data:u.slice(off,next)});
      }
      start=next;
    }
    return nal;
  }

  function extractSPSPPS(annexbBuf){
    const nals=parseAnnexB(annexbBuf);
    let sps=null,pps=null;
    for(const n of nals){
      if(n.type===7&&!sps) sps=n.data; 
      if(n.type===8&&!pps) pps=n.data; 
    }
    return{sps,pps};
  }

  function annexbToAvcc(annexbBuf){
    const nals=parseAnnexB(annexbBuf);
    let totalLen = 0;
    for(const n of nals){
      if(n.type===7||n.type===8) continue; 
      totalLen += 4 + n.data.length;
    }
    const out = new Uint8Array(totalLen);
    let pos = 0;
    for(const n of nals){
      if(n.type===7||n.type===8) continue; 
      const len = n.data.length;
      out[pos++] = (len>>>24)&0xFF;
      out[pos++] = (len>>>16)&0xFF;
      out[pos++] = (len>>>8)&0xFF;
      out[pos++] = len&0xFF;
      out.set(n.data, pos);
      pos += len;
    }
    return out;
  }

  function avcC(sps,pps){
    return [
      0x01, sps[1], sps[2], sps[3], 0xFF, 0xE1, 
      ...u16be(sps.length), ...sps, 0x01, ...u16be(pps.length), ...pps
    ];
  }

 function buildMoov(W,H,fps,nframes,sps,pps,stts,stss,stsc,stsz,co64){
    const timescale=fps*100; 
    const duration=nframes*100; 
    const mvhd=fullbox('mvhd',1,0,...u64be(0),...u64be(0),...u32be(timescale),...u64be(duration),...u32be(0x00010000),...u16be(0x0100),...[0,0],...u32be(0),...u32be(0),...u32be(0x00010000),...u32be(0),...u32be(0),...u32be(0),...u32be(0x00010000),...u32be(0),...u32be(0),...u32be(0),...u32be(0x40000000),...new Array(24).fill(0),...u32be(2));
    const tkhd=fullbox('tkhd',1,3,...u64be(0),...u64be(0),...u32be(1),...u32be(0),...u64be(duration),...u32be(0),...u32be(0),...u16be(0),...u16be(0),...u16be(0),...u16be(0),...u32be(0x00010000),...u32be(0),...u32be(0),...u32be(0),...u32be(0x00010000),...u32be(0),...u32be(0),...u32be(0),...u32be(0x40000000),...u32be(W<<16),...u32be(H<<16));
    const mdhd=fullbox('mdhd',1,0,...u64be(0),...u64be(0),...u32be(timescale),...u64be(duration),...u16be(0x55C4),...u16be(0));
    const hdlr=fullbox('hdlr',0,0,...u32be(0),...[...'vide'].map(c=>c.charCodeAt(0)),...u32be(0),...u32be(0),...u32be(0),...[...'VideoHandler '].map(c=>c.charCodeAt(0)));
    const vmhd=fullbox('vmhd',0,1,...u16be(0),...u16be(0),...u16be(0),...u16be(0));
    const url=fullbox('url ',0,1); 
    const dref=fullbox('dref',0,0,...u32be(1),url);
    const dinf=box('dinf',dref);
    const avcc=avcC(sps,pps);
    const avc1_correct=box('avc1',0,0,0,0,0,0,...u16be(1),0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,...u16be(W),...u16be(H),0x00,0x48,0x00,0x00,0x00,0x48,0x00,0x00,0,0,0,0,0,1,...new Array(32).fill(0),0,0x18,0xFF,0xFF,box('avcC',...avcc));
    const stsd=fullbox('stsd',0,0,...u32be(1),avc1_correct);
    
    const stts_box=fullbox('stts',0,0,...u32be(stts.length/2), stts.map(v=>u32be(v)));
    const stss_box=fullbox('stss',0,0,...u32be(stss.length), stss.map(v=>u32be(v)));
    const stsc_box=fullbox('stsc',0,0,...u32be(stsc.length/3), stsc.map(v=>u32be(v)));
    const stsz_box=fullbox('stsz',0,0,...u32be(0),...u32be(stsz.length), stsz.map(v=>u32be(v)));
    const co64_box=fullbox('co64',0,0,...u32be(co64.length), co64.map(v=>u64be(v)));
    
    const stbl=box('stbl',stsd,stts_box,stss_box,stsc_box,stsz_box,co64_box);
    const minf=box('minf',vmhd,dinf,stbl);
    const mdia=box('mdia',mdhd,hdlr,minf);
    const trak=box('trak',tkhd,mdia);
    return box('moov',mvhd,trak);
  }

  return {
    mux(W, H, fps, chunks) {
      const kf = chunks.find(c => c.keyFrame);
      if (!kf) throw new Error('No keyframe found');
      const {sps, pps} = extractSPSPPS(kf.data);
      if (!sps || !pps) throw new Error('Could not extract SPS/PPS from keyframe');

      const frames = chunks.map(c => annexbToAvcc(c.data));
      const nframes = frames.length;
      const stts = [nframes, 100]; 
      const stss = chunks.map((c,i) => c.keyFrame ? i+1 : 0).filter(v=>v>0);
      const stsc = [1, nframes, 1]; 
      const stsz = frames.map(f => f.length);

      const ftyp = box('ftyp',...[...'isom'].map(c=>c.charCodeAt(0)),...u32be(0x200),...[...'isom'].map(c=>c.charCodeAt(0)),...[...'iso2'].map(c=>c.charCodeAt(0)),...[...'avc1'].map(c=>c.charCodeAt(0)),...[...'mp41'].map(c=>c.charCodeAt(0)));
      const ftypBytes = new Uint8Array(ftyp);
      const mdatHeaderSize = 8; 

      let mdatDataSize = 0;
      for (const f of frames) mdatDataSize += f.length;

      const placeholderMoov = buildMoov(W, H, fps, nframes, sps, pps, stts, stss, stsc, stsz, [0]);
      const placeholderMoovBytes = new Uint8Array(placeholderMoov);

      const mdatOffset = ftypBytes.length + placeholderMoovBytes.length;
      let frameOffset = mdatOffset + mdatHeaderSize;
      const co64 = [frameOffset];  

      const moovArr = buildMoov(W, H, fps, nframes, sps, pps, stts, stss, stsc, stsz, co64);
      const moovBytes = new Uint8Array(moovArr);

      const mdatSize = mdatHeaderSize + mdatDataSize;
      const mdatHeader = new Uint8Array([...u32be(mdatSize),...[...'mdat'].map(c=>c.charCodeAt(0))]);

      const total = ftypBytes.length + moovBytes.length + mdatHeader.length + mdatDataSize;
      const out = new Uint8Array(total);
      let pos = 0;
      out.set(ftypBytes, pos); pos += ftypBytes.length;
      out.set(moovBytes, pos); pos += moovBytes.length;
      out.set(mdatHeader, pos); pos += mdatHeader.length;
      for (const f of frames) { out.set(f, pos); pos += f.length; }

      return out;
    }
  };
})();

async function detectCodec(W,H){
  const candidates=[
    {codec:'avc1.42001f', label:'H.264 Baseline', fmt:'mp4', mimeType:'video/mp4', avc:true},
    {codec:'avc1.4D001F', label:'H.264 Main',     fmt:'mp4', mimeType:'video/mp4', avc:true},
    {codec:'avc1.640028', label:'H.264 High',      fmt:'mp4', mimeType:'video/mp4', avc:true},
    {codec:'vp09.00.10.08', label:'VP9',           fmt:'webm',mimeType:'video/webm', avc:false},
    {codec:'vp8',           label:'VP8',           fmt:'webm',mimeType:'video/webm', avc:false},
    {codec:'av01.0.04M.08', label:'AV1',           fmt:'mp4', mimeType:'video/mp4', avc:false},
  ];
  for(const c of candidates){
    try{
      const r=await VideoEncoder.isConfigSupported({codec:c.codec,width:W,height:H,framerate:fpsVal,bitrate:bitrateVal*1000});
      if(r.supported) return c;
    }catch(e){}
  }
  return null;
}

async function renderMP4(idx,nf){
  const{W,H}=resWH();
  const bitrate=bitrateVal*1000;

  rpSet(1,'Detecting codec support...','Checking H.264, VP9, VP8...',true);
  await new Promise(r=>setTimeout(r,0));

  const codec=await detectCodec(W,H);
  if(!codec){
    notif('No supported video codec found in this browser','#ff5c5c');
    resetRenderUI(); return;
  }

  rpSet(3,'Codec: '+codec.label,'Encoding at '+bitrateVal+' kbps...',true);
  await new Promise(r=>setTimeout(r,0));

  const chunks=[]; 
  let encErr=null;

  const encoder=new VideoEncoder({
    output:(chunk)=>{
      const buf=new Uint8Array(chunk.byteLength);
      chunk.copyTo(buf);
      chunks.push({data:buf, keyFrame:chunk.type==='key'});
    },
    error:(e)=>{encErr=e}
  });

  const cfg={codec:codec.codec, width:W, height:H, framerate:fpsVal, bitrate, bitrateMode:'constant'};
  if(codec.avc) cfg.avc={format:'annexb'};
  encoder.configure(cfg);

  const usPerFrame=Math.round(1_000_000/fpsVal);
  const keyInterval=Math.max(1,Math.round(fpsVal*2));

  for(let k=0;k<nf;k++){
    if(encErr) break;

    while(renderPaused) {
      if(renderCancelled) break;
      await new Promise(r => setTimeout(r, 100));
    }

    if(renderCancelled){encoder.close();rpSet(0,'Cancelled','');resetRenderUI();return;}

    const pts=gpxData.points;
    let currentFrameIndex = idx[k];

    if(pts[tfS0].time && pts[tfE0].time){
      const t0=pts[tfS0].time.getTime();
      const targetMs=t0+(k/fpsVal)*1000;
      let lo=tfS0, hi=tfE0;
      while(lo<hi){
        const mid=(lo+hi+1)>>1;
        if(pts[mid].time&&pts[mid].time.getTime()<=targetMs) lo=mid;
        else hi=mid-1;
      }
      const next=Math.min(lo+1,tfE0);
      const tA=pts[lo].time.getTime();
      const tB=pts[next].time?pts[next].time.getTime():tA;
      const frac=tB>tA?Math.min(1,Math.max(0,(targetMs-tA)/(tB-tA))):0;
      const ipt=interpPoint(pts,lo,frac);
      drawFrameWithPt(lo,ipt);
      currentFrameIndex = lo;
    } else {
      drawFrame(idx[k]);
    }

    // Update Playhead di UI
    const ph = document.getElementById('tfPlayhead');
    if (ph && gpxData) {
      ph.style.display = 'block';
      const maxPts = gpxData.points.length - 1;
      ph.style.left = (currentFrameIndex / maxPts * 100) + '%';
    }

    const vf=new VideoFrame(canvas,{timestamp:k*usPerFrame,duration:usPerFrame});
    encoder.encode(vf,{keyFrame:k%keyInterval===0});
    vf.close();

    if (encoder.encodeQueueSize >= 5) {
      await new Promise(resolve => {
        let attempts = 0;
        const checkQueue = setInterval(() => {
          attempts++;
          if (encoder.encodeQueueSize <= 2 || encErr || attempts > 3000) {
            clearInterval(checkQueue);
            resolve();
          }
        }, 5);
      });
    } else {
      await new Promise(r => setTimeout(r, 0));
    }

    const pct=3+(k/nf)*88;
    const elapsed=((Date.now()-window._renderStartTime)/1000);
    const elapsedStr=formatRenderTime(elapsed);
    const eta=k>0?((elapsed/k)*(nf-k)):0;
    const etaStr=formatRenderTime(eta);
    
    rpSet(pct,
      'Encoding '+codec.label+' ⏱ '+elapsedStr+' elapsed',
      'Frame '+(k+1)+'/'+nf+' · '+bitrateVal+' kbps · ETA '+etaStr,
      true);
      
    if(k>0&&nf>100&&k%(Math.floor(nf/4))===0){
      notif('⏳ Encoding '+Math.round(pct)+'% — '+elapsedStr+' elapsed, ETA '+etaStr,'#f0d04a');
    }
  }

  if(encErr){notif('Encode error: '+encErr.message,'#ff5c5c');resetRenderUI();return}

  rpSet(92,'Flushing encoder...','Writing final frames...',true);
  await encoder.flush();
  encoder.close();

  rpSet(96,'Muxing container...','Building '+codec.fmt.toUpperCase()+'...',true);
  await new Promise(r=>setTimeout(r,20));

  let outBytes;
  try{
    if(codec.avc){
      outBytes=MP4.mux(W,H,fpsVal,chunks);
    } else {
      outBytes=buildIVF(W,H,fpsVal,chunks,codec.codec.startsWith('vp09')?'VP90':'VP80');
    }
  }catch(e){
    notif('Mux error: '+e.message,'#ff5c5c');
    resetRenderUI(); return;
  }

  const mimeType=codec.mimeType;
  const ext=codec.fmt==='webm'?'.webm':'.mp4';
  renderedBlob=new Blob([outBytes],{type:mimeType});
  const sizeStr=renderedBlob.size>1048576
    ?(renderedBlob.size/1048576).toFixed(2)+' MB'
    :Math.round(renderedBlob.size/1024)+' KB';
  window._renderExt=ext;

  rpSet(100,'Done! '+codec.label+' ready',sizeStr+' · '+nf+' frames · '+fpsVal+' fps');
  document.getElementById('btnDownload').style.display='block';
  
  const _renderElapsed=(Date.now()-window._renderStartTime)/1000;
  const _renderElStr=formatRenderTime(_renderElapsed);
  const _gpxDurSec=gpxData&&gpxData.points[tfE0]&&gpxData.points[tfS0]&&gpxData.points[tfS0].time&&gpxData.points[tfE0].time?(gpxData.points[tfE0].time-gpxData.points[tfS0].time)/1000:0;
  const _vidDurSec=nf/fpsVal;
  
  const _richInfo=codec.label+' · '+sizeStr+' · '+nf+' frames · '+fpsVal+' fps'
    +'\nVideo duration: '+fmtTime(_vidDurSec)
    +(_gpxDurSec?' · GPX: '+fmtTime(_gpxDurSec):'')
    +'\nRender time: '+_renderElStr;
  const _logMsg='✅ '+codec.label+' · '+sizeStr+' · '+nf+' frames · '+fpsVal+' fps · '+fmtTime(_vidDurSec)+' · '+_renderElStr;
  notif(_logMsg,'#4af0a0');
  showRenderPopup(_richInfo);
  resetRenderUI();
}

function buildIVF(W,H,fps,chunks,fourcc){
  function le32(n){return[n&0xFF,(n>>8)&0xFF,(n>>16)&0xFF,(n>>24)&0xFF]}
  function le64(n){const b=BigInt(n);return[0,1,2,3,4,5,6,7].map(i=>Number((b>>(BigInt(i)*8n))&0xFFn))}
  const fc=[...fourcc].map(c=>c.charCodeAt(0));
  const hdr=[
    0x44,0x4B,0x49,0x46, 0,0, 0x20,0, ...fc, ...le32(W),...le32(H),
    ...le32(fps),...le32(1), ...le32(chunks.length), ...le32(0)
  ];
  const frames=[];
  let totalSize=hdr.length;
  chunks.forEach((ch,i)=>{
    const fhdr=[...le32(ch.data.length),...le64(i)]; 
    frames.push(fhdr,ch.data);
    totalSize+=12+ch.data.length;
  });
  const out=new Uint8Array(totalSize);
  let pos=0;
  out.set(hdr,pos);pos+=hdr.length;
  for(const f of frames){
    const a=f instanceof Array?new Uint8Array(f):f;
    out.set(a,pos);pos+=a.length;
  }
  return out;
}

async function renderZIP(idx,nf){
  let JSZip;
  rpSet(0,'Loading JSZip...','');
  try{
    JSZip=await new Promise((res,rej)=>{
      if(window.JSZip){res(window.JSZip);return}
      const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload=()=>res(window.JSZip);
      s.onerror=()=>rej(new Error('Failed to load JSZip'));
      document.head.appendChild(s);
    });
  }catch(e){notif('Failed to load JSZip. Check internet.','#ff5c5c');resetRenderUI();return}

  const zip=new JSZip(),folder=zip.folder('frames');
  let done=0;

  async function chunk(start){
    const end=Math.min(start+20,nf);
    for(let k=start;k<end;k++){
        while(renderPaused) {
          if(renderCancelled) break;
          await new Promise(r => setTimeout(r, 100));
        }
        
        if(renderCancelled){resetRenderUI();return;}
        
        const origBg = bgColor;
        if(exportTransparent) bgColor = 'rgba(0,0,0,0)'; 
        
        let currentFrameIndex = idx[k];

        if(fpsVal>1){
          const pts=gpxData.points, pi=idx[k];
          const next=Math.min(pi+1,pts.length-1);
          if(pi!==next&&pts[pi].time&&pts[next].time){
            const t0=pts[tfS0].time.getTime();
            const frameMs=(k/fpsVal)*1000;
            const span=pts[next].time-pts[pi].time;
            const frac=span>0?((t0+frameMs)-pts[pi].time)/span:0;
            const ipt=frac>0&&frac<1?interpPt(pts[pi],pts[next],Math.min(1,Math.max(0,frac))):pts[pi];
            drawFrameWithPt(pi,ipt);
            currentFrameIndex = pi;
          } else { drawFrame(idx[k]); }
        } else { drawFrame(idx[k]); }

        // Update Playhead di UI
        const ph = document.getElementById('tfPlayhead');
        if (ph && gpxData) {
          ph.style.display = 'block';
          const maxPts = gpxData.points.length - 1;
          ph.style.left = (currentFrameIndex / maxPts * 100) + '%';
        }
        
        bgColor = origBg;
        
        if(renderCancelled){resetRenderUI();return;}

        await new Promise(resolve => {
          canvas.toBlob(blob => {
            folder.file('frame_'+String(k).padStart(6,'0')+'.png', blob);
            resolve();
          }, 'image/png');
        });

        await new Promise(r => setTimeout(r, 2));
        done++;
    }
    const pct=(done/nf)*88;
    rpSet(pct,'Rendering frame '+done+'/'+nf,'PNG sequence · '+fpsVal+' fps');
    if(done<nf){await new Promise(r=>setTimeout(r,0));await chunk(end);return}

    rpSet(90,'Packing ZIP...','Compressing '+done+' PNG files...');
    const base=(gpxData?.fname||'activity').replace('.gpx','');
    zip.file('README.txt',[
      'GPX Greenscreen Frames','======================',
      'Source: '+(gpxData?.fname||'activity'),
      'Frames: '+nf+', FPS: '+fpsVal,
      '','Import: DaVinci > Import Media > frame_000000.png > check Sequence',
      '        Premiere > Import > frame_000000.png > check Image Sequence',
      '        Set timeline FPS to '+fpsVal,
      'Chroma Key color: '+bgColor
    ].join('\n'));
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:3}},
      m=>{rpSet(90+m.percent*.1,'Packing ZIP...',Math.round(m.percent)+'% compressed')});
    renderedBlob=blob;
    const mb=(blob.size/1024/1024).toFixed(1);
    rpSet(100,'Done!',nf+' PNG frames · '+mb+' MB zip');
    document.getElementById('btnDownload').style.display='block';
    
    const _pngElapsed=(Date.now()-window._renderStartTime)/1000;
    const _pngElStr=formatRenderTime(_pngElapsed);
    const _pngVidDur=nf/fpsVal;
    
    const _pngInfo='PNG+ZIP · '+mb+' MB · '+nf+' frames · '+fpsVal+' fps'
      +'\nVideo duration: '+fmtTime(_pngVidDur)
      +'\nRender time: '+_pngElStr;
    const _pngLogMsg='✅ PNG+ZIP · '+mb+' MB · '+nf+' frames · '+fpsVal+' fps · '+fmtTime(_pngVidDur)+' · '+_pngElStr;
    notif(_pngLogMsg,'#4af0a0');
    showRenderPopup(_pngInfo);
    resetRenderUI();
  }
  await chunk(0);
}

function cancelRender(){
  if(!isRendering) return;
  renderCancelled=true;
  document.getElementById('rpStage').textContent='Cancelling…';
  
  const bc=document.getElementById('btnCancel');
  if(bc){ bc.disabled=true; bc.textContent='✖ Cancelling…'; }
  const bp=document.getElementById('btnPause');
  if(bp) bp.disabled=true;
  
  notif('Cancelling…','#f0a04a');
}

function resetRenderUI(){
  isRendering=false;
  renderCancelled=false;
  renderPaused=false;
  
  document.getElementById('btnRender').disabled=false;
  document.getElementById('btnRender').textContent='▶ RENDER';
  
  const actBtns = document.getElementById('renderActionBtns');
  if(actBtns) actBtns.style.display='none';

// --- KEMBALIKAN FUNGSI KLIK TIMEFRAME ---
  const tfBox = document.getElementById('tfBox');
  if (tfBox) { tfBox.style.pointerEvents = 'auto'; tfBox.style.opacity = '1'; }
  const scrubber = document.getElementById('scrubber');
  if (scrubber) scrubber.disabled = false;
  const tfS = document.getElementById('tfS');
  if (tfS) tfS.disabled = false;
  const tfE = document.getElementById('tfE');
  if (tfE) tfE.disabled = false;

  // --- TAMBAHAN: BUKA KUNCI SEMUA PANEL UI LAINNYA ---
  const rightPanel = document.getElementById('rightPanel');
  if (rightPanel) { rightPanel.style.pointerEvents = 'auto'; rightPanel.style.opacity = '1'; }

  const playbar = document.getElementById('playbar');
  if (playbar) { playbar.style.pointerEvents = 'auto'; playbar.style.opacity = '1'; }

  const dropZone = document.getElementById('dropZone');
  if (dropZone) { dropZone.style.pointerEvents = 'auto'; dropZone.style.opacity = '1'; }

  const canvasWrap = document.getElementById('canvasWrapper');
  if (canvasWrap) { canvasWrap.style.pointerEvents = 'auto'; }
  // ----------------------------------------------------
  
  document.getElementById('rpWrap').classList.remove('vis');
}

function playBeep(){
  try{
    const ac=new AudioContext();
    const osc=ac.createOscillator();
    const gain=ac.createGain();
    osc.connect(gain);gain.connect(ac.destination);
    osc.frequency.setValueAtTime(880,ac.currentTime);
    osc.frequency.setValueAtTime(1100,ac.currentTime+0.1);
    gain.gain.setValueAtTime(0.3,ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.5);
    osc.start(ac.currentTime);osc.stop(ac.currentTime+0.5);
  }catch(e){}
}

function showWarnPopup(nf, format) {
  const popup = document.getElementById('warnPopup');
  const title = document.getElementById('warnTitle');
  const box = document.getElementById('warnBox');
  const msg = document.getElementById('warnMessage');
  const icon = document.getElementById('warnIcon');
  const btnRender = document.getElementById('btnRenderAnyway');
  
  if(document.getElementById('warnFrameCount')){
    document.getElementById('warnFrameCount').textContent = nf.toLocaleString() + ' frames selected';
  }

  const estSec = nf / 50; 
  const estStr = formatNaturalTime(estSec);

  if (format === 'zip') {
    if(icon) icon.textContent = '❌';
    if(title) {
      title.textContent = 'Render Blocked (Out of Memory)';
      title.style.color = '#ff5c5c';
    }
    if(box) {
      box.style.borderColor = '#ff5c5c';
      box.style.boxShadow = '0 0 40px rgba(255,92,92,0.2)';
    }
    if(msg) {
      msg.innerHTML = `
        <b style="color:var(--text)">Why is this blocked?</b><br>
        Exporting more than 5,000 frames as a PNG sequence (ZIP) will consume too much RAM and crash your browser.<br><br>
        <b style="color:var(--text)">Solutions:</b><br>
        1. Change output format to <b>MP4</b> (handles unlimited frames).<br>
        2. Reduce the timeframe to make it shorter.<br>
        3. Lower the video FPS.
      `;
    }
    if (btnRender) btnRender.style.display = 'none';
  } else {
    if(icon) icon.textContent = '⚠️';
    if(title) {
      title.textContent = 'Large Render Warning';
      title.style.color = '#f0a04a';
    }
    if(box) {
      box.style.borderColor = '#f0a04a';
      box.style.boxShadow = '0 0 40px rgba(240,160,74,0.2)';
    }
    if(msg) {
      msg.innerHTML = `
        <b style="color:var(--text)">Please note:</b><br>
        You are about to render a massive amount of frames. The browser will handle it safely using MP4 WebCodecs, but:<br><br>
        • It may take <b>${estStr}</b> to complete.<br>
        • Keep this tab open and do not minimize the window.<br>
        • Your computer fans might spin up loudly.
      `;
    }
    if (btnRender) btnRender.style.display = 'block';
  }

  if(popup) popup.style.display = 'flex';
}

function closeWarnPopup() {
  const popup = document.getElementById('warnPopup');
  if(popup) popup.style.display = 'none';
}

let _skipWarnCheck=false;

function startRenderConfirmed(){
  _skipWarnCheck=true;
  closeWarnPopup(); 
  startRender();
}

function showRenderPopup(info){
  document.getElementById('popupInfo').textContent=info||'';
  const p=document.getElementById('renderPopup');
  p.style.display='flex';
  playBeep();
}

function closePopup(){
  document.getElementById('renderPopup').style.display='none';
}

function downloadResult(){
  if(!renderedBlob){notif('Render first','#f0a04a');return}
  const url=URL.createObjectURL(renderedBlob);
  const a=document.createElement('a');a.href=url;
  const base=(gpxData?.fname||'activity').replace(/\.gpx$/i,'').replace(/\s+/g,'_');
  const nFrames=buildFrameIndices().length;
  a.download=renderFmt==='mp4'
    ?`${base}_${fpsVal}fps_${nFrames}fr_GPXGreenscreen.mp4`
    :`${base}_${fpsVal}fps_${nFrames}fr_GPXGreenscreen_frames.zip`;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),15000);
  notif((renderFmt==='mp4'?'MP4':'ZIP')+' download started...');
}