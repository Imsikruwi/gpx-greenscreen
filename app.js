// ═══════════════════════════════════════════════════════════
// FILE INPUT LISTENERS
// ═══════════════════════════════════════════════════════════
const dz=document.getElementById('dropZone');
const fi=document.getElementById('fileInput');
dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag-over')});
dz.addEventListener('dragleave',()=>dz.classList.remove('drag-over'));
dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag-over');const f=e.dataTransfer.files[0];if(f&&f.name.endsWith('.gpx'))loadGPX(f);else notif('File must be .gpx','#ff5c5c')});
fi.addEventListener('change',e=>{if(e.target.files[0])loadGPX(e.target.files[0])});

// ═══════════════════════════════════════════════════════════
// TIMEFRAME
// ═══════════════════════════════════════════════════════════
function initTF(){
  const n=gpxData.points.length-1; tfS0=0; tfE0=n;
  const s=document.getElementById('tfS'),e=document.getElementById('tfE');
  s.max=n; s.value=0; e.max=n; e.value=n;
  drawTFChart(); updateTFUI(); updateTFMid(); initTFMidDrag();
}
function drawTFChart(){
  const cv=document.getElementById('tfCanvas'); cv.width=cv.offsetWidth||260;
  const c=cv.getContext('2d'),pts=gpxData.points,W=cv.width,H=48;
  c.clearRect(0,0,W,H); drawTFBase(c,W,H,pts); redrawTFSel(c,W,H,pts);
}
function drawTFBase(c,W,H,pts){
  const minE=gpxData.minEle,rE=(gpxData.maxEle-gpxData.minEle)||1;
  const maxS=gpxData.maxSpeedMs||1;
  const step=Math.max(1,Math.floor(pts.length/W));
  c.fillStyle='#0a0c0f'; c.fillRect(0,0,W,H); c.beginPath(); c.moveTo(0,H);
  for(let i=0;i<pts.length;i+=step){ const x=(i/(pts.length-1))*W; const y=H-4-((pts[i].ele-minE)/rE)*(H-8); c.lineTo(x,y); }
  c.lineTo(W,H); c.closePath(); c.fillStyle='rgba(255,255,255,.06)'; c.fill();
  c.strokeStyle='rgba(255,255,255,.14)'; c.lineWidth=1; c.stroke(); c.beginPath();
  for(let i=0;i<pts.length;i+=step){ const x=(i/(pts.length-1))*W; const y=H-4-(pts[i].speed_ms/maxS)*(H-8); i===0?c.moveTo(x,y):c.lineTo(x,y); }
  c.strokeStyle='rgba(74,240,160,.4)'; c.lineWidth=1.5; c.stroke();
}
function redrawTFSel(c,W,H,pts){
  const n=gpxData.points.length-1; const x1=(tfS0/n)*W, x2=(tfE0/n)*W;
  c.fillStyle='rgba(0,0,0,.55)'; if(x1>0)c.fillRect(0,0,x1,H); if(x2<W)c.fillRect(x2,0,W-x2,H);
  c.strokeStyle='rgba(74,240,160,.9)'; c.lineWidth=2;
  c.beginPath();c.moveTo(x1,0);c.lineTo(x1,H);c.stroke();
  c.beginPath();c.moveTo(x2,0);c.lineTo(x2,H);c.stroke();
  c.fillStyle='rgba(74,240,160,.2)'; c.fillRect(x1,0,x2-x1,3);
  const hl=document.getElementById('rHL'); const pct1=(tfS0/n)*100, pct2=(tfE0/n)*100;
  hl.style.left=pct1+'%'; hl.style.width=(pct2-pct1)+'%';
}
function onTfChange(){
  // Menolak perubahan jika sedang render
  if (typeof isRendering !== 'undefined' && isRendering) return;
  
  let s=parseInt(document.getElementById('tfS').value); 
  let e=parseInt(document.getElementById('tfE').value);
  const mg=Math.max(1,Math.floor(gpxData.points.length*0.01));
  if(document.activeElement===document.getElementById('tfS')){ if(s>e-mg){s=e-mg; document.getElementById('tfS').value=s} } 
  else { if(e<s+mg){e=s+mg; document.getElementById('tfE').value=e} }
  tfS0=s; tfE0=e; updateTFUI();
  const cv=document.getElementById('tfCanvas'); const c=cv.getContext('2d');
  drawTFBase(c,cv.width,48,gpxData.points); redrawTFSel(c,cv.width,48,gpxData.points);
  curFrame=Math.max(tfS0,Math.min(curFrame,tfE0));
  document.getElementById('scrubber').min=tfS0; document.getElementById('scrubber').max=tfE0;
  document.getElementById('scrubber').value=curFrame;
  updateTFMid(); drawFrame(curFrame); updateEstimate();
}
function updateTFMid(){
  const wrap=document.getElementById('drWrap'); const mid=document.getElementById('tfMid');
  if(!mid||!wrap||!gpxData)return;
  const n=gpxData.points.length-1||1; const pct1=tfS0/n*100, pct2=tfE0/n*100;
  mid.style.left=pct1+'%'; mid.style.width=(pct2-pct1)+'%';
}
let _tfMidDrag=false, _tfMidStartX=0, _tfMidStartS=0, _tfMidStartE=0;
function initTFMidDrag(){
  if(window._tfMidDragInited)return; window._tfMidDragInited=true;
  document.addEventListener('mousedown',e=>{
    // Menolak fungsi geser tengah jika sedang render
    if (typeof isRendering !== 'undefined' && isRendering) return;
    
    const mid=document.getElementById('tfMid'); 
    if(!mid||e.target!==mid)return; 
    e.preventDefault(); 
    _tfMidDrag=true; _tfMidStartX=e.clientX; _tfMidStartS=tfS0; _tfMidStartE=tfE0; 
  });
  document.addEventListener('mousemove',e=>{
    if(!_tfMidDrag||!gpxData)return; const n=gpxData.points.length-1; const ww=document.getElementById('drWrap')?.offsetWidth||1;
    const dx=e.clientX-_tfMidStartX; const delta=Math.round(dx/ww*n); const dur=_tfMidStartE-_tfMidStartS;
    let ns=_tfMidStartS+delta, ne=ns+dur;
    if(ns<0){ns=0;ne=dur;} if(ne>n){ne=n;ns=Math.max(0,n-dur);}
    tfS0=ns; tfE0=ne; document.getElementById('tfS').value=ns; document.getElementById('tfE').value=ne;
    updateTFUI(); updateTFMid();
    const cv=document.getElementById('tfCanvas');
    if(cv){const c=cv.getContext('2d');drawTFBase(c,cv.width,48,gpxData.points);redrawTFSel(c,cv.width,48,gpxData.points);}
    curFrame=Math.max(tfS0,Math.min(curFrame,tfE0));
    document.getElementById('scrubber').min=tfS0; document.getElementById('scrubber').max=tfE0;
    drawFrame(curFrame); updateEstimate();
  });
  document.addEventListener('mouseup',()=>{ _tfMidDrag=false; });
}
function updateTFUI(){
  const pts=gpxData.points,n=pts.length-1; const p0=pts[tfS0],p1=pts[tfE0]; let s0=0,e0=0;
  if(p0.time&&pts[0].time)s0=(p0.time-pts[0].time)/1000;
  if(p1.time&&pts[0].time)e0=(p1.time-pts[0].time)/1000;
  if(!p0.time){s0=tfS0;e0=tfE0}
  
  // Fungsi format jam aktual GPS
  function getGpsTimeStr(dateObj) {
    if (!dateObj) return '';
    const hh = String(dateObj.getHours()).padStart(2, '0');
    const mm = String(dateObj.getMinutes()).padStart(2, '0');
    const ss = String(dateObj.getSeconds()).padStart(2, '0');
    return ` (${hh}:${mm}:${ss})`;
  }

  // Gabungkan durasi dengan jam aktual
  document.getElementById('tfST').textContent = fmtTime(s0) + getGpsTimeStr(p0.time); 
  document.getElementById('tfET').textContent = fmtTime(e0) + getGpsTimeStr(p1.time);
  
  const dur=(e0-s0)/60; document.getElementById('tfDur').textContent=dur.toFixed(1)+' min';
  document.getElementById('tfPts').textContent=(tfE0-tfS0+1)+' pts';
  document.getElementById('tfBox').classList.toggle('active',tfS0>0||tfE0<n);
}
function resetTF(){
  const n=gpxData.points.length-1; tfS0=0; tfE0=n;
  document.getElementById('tfS').value=0; document.getElementById('tfE').value=n;
  document.getElementById('scrubber').min=0; document.getElementById('scrubber').max=n;
  updateTFUI(); const cv=document.getElementById('tfCanvas'); const c=cv.getContext('2d');
  drawTFBase(c,cv.width,48,gpxData.points); redrawTFSel(c,cv.width,48,gpxData.points);
  drawFrame(curFrame); updateEstimate(); notif('Timeframe reset');
}

// ═══════════════════════════════════════════════════════════
// PLAYBACK (Preview & Interpolation)
// ═══════════════════════════════════════════════════════════
function onScrubInput(v){ scrubTo(v); if(playing){ lastPlayT=0; _playStartFrame=curFrame; _playStartMs=null; } }
function scrubTo(v){ if(!gpxData)return; curFrame=Math.min(Math.max(parseInt(v),tfS0),tfE0); document.getElementById('scrubber').value=curFrame; const pt=gpxData.points[curFrame]; const t0=gpxData.points[tfS0]?.time; const sec=pt?.time&&t0?(pt.time-t0)/1000:(curFrame-tfS0); document.getElementById('timeDisplay').textContent=fmtTime(sec); drawFrameWithPt(curFrame, pt); }
function setPlaySpeed(v,el){ playSpeed=v; document.querySelectorAll('.playbar .chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); if(playing){ lastPlayT=0; cancelAnimationFrame(rafId); rafId=requestAnimationFrame(playLoop); } }
function togglePlay(){ playing=!playing; document.getElementById('btnPlay').textContent=playing?'⏸':'▶'; if(playing){ lastPlayT=0; _lastPlayDraw=0; _playStartFrame=curFrame; _playStartMs=null; rafId=requestAnimationFrame(playLoop); } else { cancelAnimationFrame(rafId); rafId=null; } }
function lerpN(a,b,t){return a+(b-a)*t}
function interpPoint(pts,i,t){
  if(i>=pts.length-1||t<=0) return pts[i]; if(t>=1) return pts[i+1];
  const a=pts[i],b=pts[i+1]; const lN=(x,y)=>x+(y-x)*t; const lNull=(x,y)=>(x!=null&&y!=null)?lN(x,y):(x??y); let dh=(b.heading-a.heading+540)%360-180;
  
  // Interpolate timestamp so the GPS clock ticks smoothly during GPX gaps
  const interpTime = (a.time && b.time) ? new Date(a.time.getTime() + (b.time.getTime() - a.time.getTime()) * t) : a.time;
  
  return{ lat:lN(a.lat,b.lat), lon:lN(a.lon,b.lon), ele:lN(a.ele,b.ele), speed_ms:lN(a.speed_ms,b.speed_ms), cumDist:lN(a.cumDist,b.cumDist), heading:(a.heading+dh*t+360)%360, grade:lN(a.grade,b.grade), gLong:lN(a.gLong,b.gLong), gLat:lN(a.gLat,b.gLat), hr:lNull(a.hr,b.hr), cad:lNull(a.cad,b.cad), power:lNull(a.power,b.power), time:interpTime };
}
function playLoop(ts){
  if(!playing||!gpxData)return; 
  if(ts-_lastPlayDraw < 33){ rafId=requestAnimationFrame(playLoop); return; } 
  _lastPlayDraw=ts; const pts=gpxData.points; const hasT=pts[tfS0].time!=null;
  
  if(!lastPlayT){ lastPlayT=ts; _playStartFrame=curFrame; _playStartMs=hasT?pts[curFrame].time.getTime():null; }
  
  if(hasT){
    const gpxElapsed=(ts-lastPlayT)*playSpeed; const targetMs=_playStartMs+gpxElapsed; let hi=curFrame;
    while(hi<tfE0 && pts[hi+1].time.getTime()<=targetMs) hi++;
    
    if(hi>=tfE0 && targetMs>=pts[tfE0].time.getTime()){ 
      playing=false; cancelAnimationFrame(rafId); rafId=null; document.getElementById('btnPlay').textContent='▶'; drawFrame(tfE0); return; 
    }
    
    let frac=0; 
    if(hi<tfE0){ 
      const tA=pts[hi].time.getTime(); const tB=pts[hi+1].time.getTime(); frac=tB>tA?Math.min(1,(targetMs-tA)/(tB-tA)):0; 
    }
    
    curFrame=hi; const dispSec=(pts[hi].time.getTime()-pts[tfS0].time.getTime())/1000; updScrub(dispSec);
    
    drawFrameInterp(hi, frac);
    
  } else {
    const elapsed=ts-lastPlayT; const ptsPerSec=playSpeed; const targetPt=_playStartFrame+Math.floor(elapsed/1000*ptsPerSec);
    if(targetPt>tfE0){ 
      playing=false; cancelAnimationFrame(rafId); rafId=null; document.getElementById('btnPlay').textContent='▶'; drawFrame(tfE0); 
    } else { 
      curFrame=Math.min(targetPt,tfE0); updScrub((curFrame-tfS0)/ptsPerSec); drawFrame(curFrame); 
    }
  }
  rafId=requestAnimationFrame(playLoop);
}

function updScrub(sec){ 
  document.getElementById('scrubber').value=curFrame; 
  
  // --- Update posisi garis playhead di Timeframe ---
  const ph = document.getElementById('tfPlayhead');
  if(ph && gpxData) {
    const n = gpxData.points.length - 1;
    ph.style.display = 'block';
    // Menghitung persentase posisi saat ini terhadap total frame
    ph.style.left = (curFrame / n * 100) + '%';
  }
  // -----------------------------------------------------------

  if(sec!=null) {
    document.getElementById('timeDisplay').textContent=fmtTime(sec); 
  } else { 
    const pt=gpxData.points[curFrame]; 
    const t0=gpxData.points[tfS0]?.time; 
    const s=pt?.time&&t0?(pt.time-t0)/1000:(curFrame-tfS0); 
    document.getElementById('timeDisplay').textContent=fmtTime(s); 
  } 
}

function drawFrameInterp(idx,frac){ if(!gpxData){drawFrame(idx);return;} const ipt=interpPoint(gpxData.points,idx,frac); drawFrameWithPt(idx,ipt); }

// ═══════════════════════════════════════════════════════════
// FRAME INDICES & ESTIMATION
// ═══════════════════════════════════════════════════════════
function interpPt(a, b, t){
  const lerp=(x,y)=>x+(y-x)*t; const lerpNull=(x,y)=>(x!=null&&y!=null)?lerp(x,y):x??y;
  
  // Fix the time interpolation for ZIP exports as well
  const iTime = (a.time && b.time) ? new Date(a.time.getTime() + (b.time.getTime() - a.time.getTime()) * t) : a.time;
  
  return { lat:lerp(a.lat,b.lat), lon:lerp(a.lon,b.lon), ele:lerp(a.ele,b.ele), speed_ms:lerp(a.speed_ms,b.speed_ms), heading:lerp(a.heading,b.heading), grade:lerp(a.grade,b.grade), gLong:lerp(a.gLong,b.gLong), gLat:lerp(a.gLat,b.gLat), cumDist:lerp(a.cumDist,b.cumDist), hr:lerpNull(a.hr,b.hr), cad:lerpNull(a.cad,b.cad), power:lerpNull(a.power,b.power), time:iTime };
}
function buildFrameIndices(){
  const pts=gpxData.points; const hasT=pts[tfS0].time!=null&&pts[tfE0].time!=null; const idx=[];
  if(hasT){ const t0=pts[tfS0].time.getTime(),t1=pts[tfE0].time.getTime(); const totalSec=(t1-t0)/1000; const nf=Math.max(1,Math.round(totalSec*fpsVal)); for(let f=0;f<nf;f++){ const target=t0+(f/fpsVal)*1000; let lo=tfS0,hi=tfE0,best=tfS0; while(lo<=hi){ const mid=(lo+hi)>>1; const mt=pts[mid].time.getTime(); if(Math.abs(mt-target)<Math.abs(pts[best].time.getTime()-target))best=mid; if(mt<target)lo=mid+1;else hi=mid-1; } idx.push(best); } } 
  else { for(let i=tfS0;i<=tfE0;i++)idx.push(i); }
  return idx;
}
function updateEstimate(){
  if(!gpxData)return; const idx=buildFrameIndices(); const nf=idx.length; const durSec=nf/fpsVal; const durEl=document.getElementById('fmtDur');
  if(durEl){ const pts=gpxData.points; const hasT=pts[tfS0].time&&pts[tfE0].time; let realDur=0; if(hasT) realDur=(pts[tfE0].time-pts[tfS0].time)/1000; durEl.style.display='block'; durEl.innerHTML= 'Duration: <span>'+fmtTime(realDur)+'</span><br>Frames: <span>'+nf+'</span>'; }
  const el=document.getElementById('fmtEst'); const{W,H}=resWH();
  if(renderFmt==='mp4'){ const compressionFactor = Math.min(0.50, 0.12 + fpsVal * 0.016); const sizeBytes=(bitrateVal*1000*durSec)/8 * compressionFactor; const sizeMB=sizeBytes/1048576; el.textContent='≈ '+(sizeMB>=1?sizeMB.toFixed(1)+' MB':Math.round(sizeBytes/1024)+' KB')+' · '+W+'×'+H; } 
  else { const kbPerFrame=W>=1920?120:60; const sizeMB=(nf*kbPerFrame)/1024; el.textContent='≈ '+(sizeMB>=1?sizeMB.toFixed(0)+' MB':'<1 MB')+' zip · '+W+'×'+H; }
}

// ═══════════════════════════════════════════════════════════
// UI CONTROLS & SETTINGS
// ═══════════════════════════════════════════════════════════
function setFormat(fmt,el){ 
  renderFmt=fmt; 
  document.querySelectorAll('#fmt-zip,#fmt-mp4').forEach(b=>b.classList.remove('on')); 
  el.classList.add('on'); 
  
  const showBR = fmt==='mp4'; 
  document.getElementById('bitrate-group').style.display=showBR?'flex':'none'; 
  
  // Tampilkan opsi Transparan JIKA formatnya ZIP
  const transOpt = document.getElementById('opt-export-trans');
  if(transOpt) transOpt.style.display = (fmt==='zip') ? 'flex' : 'none';
  
  const hint=document.getElementById('fmtHint'); 
  if(fmt==='mp4'){ 
    const ok=typeof VideoEncoder!=='undefined'; 
    hint.textContent=ok?'MP4 via WebCodecs · H.264 · no CDN · in-browser encoding — Chrome/Edge 94+':'⚠ WebCodecs not supported in this browser. Use Chrome or Edge 94+.'; 
    hint.style.color=ok?'':'var(--warn)'; 
  } else { 
    hint.textContent='PNG sequence — import into any video editor as image sequence'; 
    hint.style.color=''; 
  } 
  updateEstimate(); 
}
function setFPS(v,el){ fpsVal=parseInt(v); el.closest('.chips').querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); updateEstimate(); }
function resWH(){ if(canvasOrient==='portrait') return renderRes==='1080p'?{W:1080,H:1920}:{W:720,H:1280}; if(canvasOrient==='square') return renderRes==='1080p'?{W:1080,H:1080}:{W:720,H:720}; return renderRes==='1080p'?{W:1920,H:1080}:{W:1280,H:720}; }
function setRes(res,el){ renderRes=res; ['720p','1080p'].forEach(r=>{const b=document.getElementById('res-'+r);if(b)b.classList.remove('on')}); el.classList.add('on'); const{W,H}=resWH(); canvas.width=W; canvas.height=H; drawFrame(curFrame); updateEstimate(); }
function setOrient(orient, el){ canvasOrient=orient; ['landscape','portrait','square'].forEach(o=>{ const b=document.getElementById('orient-'+o); if(b)b.classList.remove('on'); }); el.classList.add('on'); const{W,H}=resWH(); canvas.width=W; canvas.height=H; const cw=document.getElementById('canvasWrapper'); cw.classList.remove('square-ratio','portrait-ratio'); if(orient==='portrait'){ cw.style.aspectRatio='9/16'; cw.style.height='calc(100vh - 260px)'; cw.style.width='auto'; cw.style.maxWidth='calc((100vh - 260px) * 9 / 16)'; cw.style.maxHeight='calc(100vh - 260px)'; cw.classList.add('portrait-ratio'); } else if(orient==='square'){ cw.style.aspectRatio='1/1'; cw.style.height=''; cw.style.width='100%'; cw.style.maxWidth='calc(100vh - 260px)'; cw.style.maxHeight='calc(100vh - 260px)'; cw.classList.add('square-ratio'); } else { cw.style.aspectRatio='16/9'; cw.style.height='calc(100vh - 260px)'; cw.style.width='calc((100vh - 260px) * 16 / 9)'; cw.style.maxWidth='100%'; cw.style.maxHeight=''; cw.style.width='100%'; cw.style.height='auto'; cw.style.maxWidth='800px'; } if(gpxData) drawFrame(curFrame); updateEstimate(); }
function setBitrate(v){ bitrateVal=parseInt(v); const kbps=bitrateVal; const mbps=(kbps/1000).toFixed(1); document.getElementById('br-label').textContent=kbps+' kbps'; document.getElementById('br-tag').textContent=mbps+' Mbps'; document.querySelectorAll('.br-presets .chip').forEach(b=>b.classList.remove('on')); updateEstimate(); }
function setBitratePreset(kbps,el){ bitrateVal=kbps; document.getElementById('br-slider').value=kbps; const mbps=(kbps/1000).toFixed(1); document.getElementById('br-label').textContent=kbps+' kbps'; document.getElementById('br-tag').textContent=mbps+' Mbps'; document.querySelectorAll('.br-presets .chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); updateEstimate(); }
function setUnit(u,el){ speedUnit=u; document.querySelectorAll('[id^=unit-]').forEach(b=>b.classList.remove('on')); el.classList.add('on'); if(dialMode && dialInputMode==='speed') updateDialSpeedLabels(); updateSpdMaxSliderUI(); drawFrame(curFrame); }
function setBGHex(val){ if(/^#[0-9a-fA-F]{6}$/.test(val)){ setCustomBG(val); document.getElementById('bg-color-picker').value=val; } }
function setCustomBG(color){ bgColor=color; document.getElementById('canvasWrapper').style.background=color; document.getElementById('bg-color-picker').value=color; ['green','blue','black','navy'].forEach(k=>{ const b=document.getElementById('bg-'+k); if(b) b.classList.remove('on'); }); document.getElementById('bg-custom').classList.add('on'); drawFrame(curFrame); }
function setBG(color,id,el){ bgColor=color; document.getElementById('canvasWrapper').style.background=color; const hexInp=document.getElementById('bg-hex-input'); if(hexInp) hexInp.value=color; const cpick=document.getElementById('bg-color-picker'); if(cpick) cpick.value=color; ['green','blue','black','navy'].forEach(k=>{const b=document.getElementById('bg-'+k);if(b)b.classList.remove('on')}); el.classList.add('on'); drawFrame(curFrame); }
function toggleDistovOpt(row){
  opts.distov=!opts.distov;
  const tog=document.getElementById('tog-distov');
  if(tog) tog.classList.toggle('on',opts.distov);
  const opts_div=document.getElementById('distov-opts');
  if(opts_div) opts_div.style.display=opts.distov?'flex':'none';
  drawFrame(curFrame);
  if(window._dragHandle) window._dragHandle.updateHandles();
}
function toggleOpt(key,row){ opts[key]=!opts[key]; const tog=document.getElementById('tog-'+key); if(tog)tog.classList.toggle('on',opts[key]); const card=document.getElementById('oc-'+key); if(card)card.classList.toggle('off',!opts[key]); drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }
function setPos(key,pos,el){ oPos[key]=pos; const grid=document.getElementById('pos-'+key); if(grid)grid.querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); drawFrame(curFrame); }
function toggleSpdMaxMode(){
  if(spdMaxMode==='auto'){
    const autoMs = gpxData ? gpxData.maxSpeedMs : 30;
    const displayVal = Math.round(autoMs * (speedUnit==='mph'?2.237:speedUnit==='ms'?1:3.6));
    const sliderVal = Math.max(10, Math.min(400, displayVal));
    spdMaxMode='custom';
    spdMaxCustom = sliderVal / (speedUnit==='mph'?2.237:speedUnit==='ms'?1:3.6);
    const slider = document.getElementById('spd-max-slider');
    if(slider) slider.value = sliderVal;
  } else {
    spdMaxMode='auto'; spdMaxCustom=0;
  }
  updateSpdMaxSliderUI();
  drawFrame(curFrame);
}
function setSpdMaxAuto(el){ spdMaxMode='auto'; spdMaxCustom=0; updateSpdMaxSliderUI(); drawFrame(curFrame); }
function setSpdMaxSlider(v){
  const val=parseInt(v);
  let ms=val;
  if(speedUnit==='kmh') ms=val/3.6;
  else if(speedUnit==='mph') ms=val/2.237;
  else ms=val;
  spdMaxMode='custom'; spdMaxCustom=ms;
  document.getElementById('spd-max-auto').classList.remove('on');
  const unitLbl=speedUnit==='mph'?'mph':speedUnit==='ms'?'m/s':'km/h';
  document.getElementById('spdMaxVal').textContent=val+' '+unitLbl;
  drawFrame(curFrame);
}
function updateSpdMaxSliderUI(){
  const slider=document.getElementById('spd-max-slider');
  const unitLbl=document.getElementById('spd-max-unit-lbl');
  const valEl=document.getElementById('spdMaxVal');
  const autoBtn=document.getElementById('spd-max-auto');
  const customBtn=document.getElementById('spd-max-custom-btn');
  const row=document.getElementById('spd-max-slider-row');
  if(!slider||!row) return;
  const maxUnit=speedUnit==='mph'?250:speedUnit==='ms'?100:400;
  slider.max=maxUnit;
  slider.step=speedUnit==='ms'?1:5;
  const unitName=speedUnit==='mph'?'mph':speedUnit==='ms'?'m/s':'km/h';
  if(unitLbl) unitLbl.textContent='Max '+unitName;
  if(spdMaxMode==='auto'){
    if(autoBtn){ autoBtn.classList.add('on'); autoBtn.style.display=''; }
    if(customBtn){ customBtn.classList.remove('on'); customBtn.style.display='none'; }
    row.style.display='none';
  } else {
    if(autoBtn){ autoBtn.classList.remove('on'); autoBtn.style.display='none'; }
    if(customBtn){ customBtn.classList.add('on'); customBtn.style.display=''; }
    row.style.display='';
    const displayVal=Math.round(spdMaxCustom*(speedUnit==='mph'?2.237:speedUnit==='ms'?1:3.6));
    const clamped=Math.max(parseInt(slider.min),Math.min(maxUnit,displayVal));
    slider.value=clamped;
    if(valEl) valEl.textContent=clamped+' '+unitName;
  }
}
function setSpdStyle(style,el){ spdStyle=style; document.querySelectorAll('[id^=spd-style-]').forEach(b=>b.classList.remove('on')); el.classList.add('on'); drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }

function toggleDialMode(row){
  dialMode=!dialMode;
  document.getElementById('tog-dial-mode')?.classList.toggle('on',dialMode);
  const el=document.getElementById('dial-opts');
  if(el) el.style.display=dialMode?'flex':'none';
  drawFrame(curFrame);
}

function setDialInputMode(mode, el){
  dialInputMode=mode;
  document.getElementById('dial-mode-pct')?.classList.toggle('on', mode==='pct');
  document.getElementById('dial-mode-speed')?.classList.toggle('on', mode==='speed');
  document.getElementById('dial-pct-opts').style.display   = mode==='pct'   ? 'block' : 'none';
  document.getElementById('dial-speed-opts').style.display = mode==='speed' ? 'block' : 'none';
  if(mode==='speed') updateDialSpeedLabels();
  drawFrame(curFrame);
}

function dialDisplayToMs(val){
  val=parseFloat(val);
  if(speedUnit==='kmh')  return val/3.6;
  if(speedUnit==='mph')  return val/2.237;
  if(speedUnit==='ms')   return val;
  if(speedUnit==='pace') return val>0?1000/(val*60):0;
  return val/3.6;
}

function dialMsToDisplay(ms){
  return Math.round(cvtSpd(ms));
}

function updateDialSpeedLabels(){
  const unit=spdLabel();
  const yDisp=dialMsToDisplay(dialYellowMs);
  const rDisp=dialMsToDisplay(dialRedMs);
  const yMax=Math.round(cvtSpd(gpxData?.maxSpeedMs||80)*1.5)||200;
  const rMax=Math.round(cvtSpd(gpxData?.maxSpeedMs||80)*1.5)||250;

  const ySlider=document.getElementById('dial-yellow-spd');
  const rSlider=document.getElementById('dial-red-spd');
  if(ySlider){ ySlider.max=yMax; ySlider.value=yDisp; }
  if(rSlider){ rSlider.max=rMax; rSlider.value=rDisp; }
  document.getElementById('dialYellowSpdVal').textContent=yDisp+' '+unit;
  document.getElementById('dialRedSpdVal').textContent=rDisp+' '+unit;
}

function setDialThreshold(color, mode, val){
  val=parseFloat(val);
  if(mode==='pct'){
    if(color==='yellow'){
      dialYellowPct=val;
      document.getElementById('dialYellowVal').textContent=val+'%';
      if(val>=dialRedPct){ dialRedPct=Math.min(99,val+5); document.getElementById('dial-red-pct').value=dialRedPct; document.getElementById('dialRedVal').textContent=dialRedPct+'%'; }
    } else {
      dialRedPct=val;
      document.getElementById('dialRedVal').textContent=val+'%';
      if(val<=dialYellowPct){ dialYellowPct=Math.max(10,val-5); document.getElementById('dial-yellow-pct').value=dialYellowPct; document.getElementById('dialYellowVal').textContent=dialYellowPct+'%'; }
    }
  } else {
    const ms=dialDisplayToMs(val);
    const unit=spdLabel();
    if(color==='yellow'){
      dialYellowMs=ms;
      document.getElementById('dialYellowSpdVal').textContent=val+' '+unit;
      if(dialYellowMs>=dialRedMs){ dialRedMs=dialYellowMs*1.1; updateDialSpeedLabels(); }
    } else {
      dialRedMs=ms;
      document.getElementById('dialRedSpdVal').textContent=val+' '+unit;
      if(dialRedMs<=dialYellowMs){ dialYellowMs=dialRedMs*0.9; updateDialSpeedLabels(); }
    }
  }
  drawFrame(curFrame);
}

function setGpsFmt(fmt,el){ gpsFmt=fmt; el.closest('.chips').querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); drawFrame(curFrame); }
function setCoordFmt(fmt,el){ coordFmt=fmt; el.closest('.chips').querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }
function toggleCoordIcon(row){ coordShowIcon=!coordShowIcon; const tog=document.getElementById('tog-coordicon'); if(tog)tog.classList.toggle('on',coordShowIcon); drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }
function toggleGpsDate(row){ gpsShowDate=!gpsShowDate; const tog=document.getElementById('tog-gpsdate'); if(tog)tog.classList.toggle('on',gpsShowDate); drawFrame(curFrame); }
function setTextHex(val){ if(/^#[0-9a-fA-F]{6}$/.test(val)){ textColor=val; const cp=document.getElementById('text-color-picker'); if(cp) cp.value=val; drawFrame(curFrame); } }
function setRouteColor(c,el){ mapRouteColor=c; document.querySelectorAll('[id^="rc-"]').forEach(s=>s.classList.remove('on')); if(el) el.classList.add('on'); const rp=document.getElementById('route-color-picker'); if(rp) rp.value=c; drawFrame(curFrame); }
function setDotColor(c,el){ mapDotColor=c; document.querySelectorAll('[id^="dc-"]').forEach(s=>s.classList.remove('on')); if(el) el.classList.add('on'); const dp=document.getElementById('dot-color-picker'); if(dp) dp.value=c; drawFrame(curFrame); }
function setColor(c,el){ textColor=c; if(el){ el.closest('div').querySelectorAll('.sw').forEach(s=>s.classList.remove('on')); el.classList.add('on'); } const cp=document.getElementById('text-color-picker'); if(cp) cp.value=(c.length===4?c+'000':c).slice(0,7); drawFrame(curFrame); }
function setFS(s,el){ const map={xs:.7,md:1,lg:1.35,xl:1.7,xxl:2.2,xxxl:3.0}; fontScale=map[s]||1; document.querySelectorAll('.chip').forEach(b=>{if(b.closest('.chips')&&b.onclick&&b.getAttribute('onclick')&&b.getAttribute('onclick').startsWith('setFS('))b.classList.remove('on')}); if(el)el.classList.add('on'); const sl=document.getElementById('fs-slider'); if(sl){sl.value=Math.round(fontScale*100)} document.getElementById('fsVal').textContent=fontScale.toFixed(2)+'×'; drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }
function setFSSlider(v){ fontScale=parseInt(v)/100; document.querySelectorAll('.chip').forEach(b=>{if(b.getAttribute('onclick')&&b.getAttribute('onclick').startsWith('setFS('))b.classList.remove('on')}); document.getElementById('fsVal').textContent=fontScale.toFixed(2)+'×'; drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }
function setDistDec(n,el){ distDecimals=n; el.closest('.chips').querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); drawFrame(curFrame); }
function toggleDistOdo(row){ distOdoMode=!distOdoMode; const t=document.getElementById('tog-distodo'); if(t)t.classList.toggle('on',distOdoMode); const sz=document.getElementById('odo-size-opts'); if(sz)sz.style.display=distOdoMode?'block':'none'; drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }
function toggleOdoBorder(row){ odoShowBorder=!odoShowBorder; const t=document.getElementById('tog-odoborder'); if(t)t.classList.toggle('on',odoShowBorder); drawFrame(curFrame); }
function setOdoScale2(v){ odoScale2=parseInt(v)/100; document.getElementById('odoScaleVal2').textContent=odoScale2.toFixed(1)+'×'; drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }
function setCompassStyle(style,el){ window._compassStyle=style; if(el&&el.closest('.chips')){ el.closest('.chips').querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); } drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }
function setHRStyle(style,el){ window._hrStyle=style; document.querySelectorAll('[id^="hr-style-"]').forEach(b=>b.classList.remove('on')); document.getElementById('hr-style-'+style)?.classList.add('on'); drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }
function setPowerStyle(style,el){ window._powerStyle=style; document.querySelectorAll('[id^="power-style-"]').forEach(b=>b.classList.remove('on')); document.getElementById('power-style-'+style)?.classList.add('on'); drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }
function setInfoStyle(style,el){ window._infoStyle=style; document.querySelectorAll('[id^="info-style-"]').forEach(b=>b.classList.remove('on')); document.getElementById('info-style-'+style)?.classList.add('on'); drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }
function setElevStyle(style,el){ window._elevStyle=style; document.querySelectorAll('[id^="elev-style-"]').forEach(b=>b.classList.remove('on')); document.getElementById('elev-style-'+style)?.classList.add('on'); drawFrame(curFrame); }
function setGpsTimeStyle(style,el){ window._gpsTimeStyle=style; document.querySelectorAll('[id^="gpstime-style-"]').forEach(b=>b.classList.remove('on')); document.getElementById('gpstime-style-'+style)?.classList.add('on'); drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }
function setCoordStyle(style,el){ window._coordStyle=style; document.querySelectorAll('[id^="coord-style-"]').forEach(b=>b.classList.remove('on')); document.getElementById('coord-style-'+style)?.classList.add('on'); drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }
function setCadStyle(style,el){ window._cadStyle=style; document.querySelectorAll('[id^="cad-style-"]').forEach(b=>b.classList.remove('on')); document.getElementById('cad-style-'+style)?.classList.add('on'); drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }
function setGforceTextPos(pos,el){ window._gforceTextPos=pos; document.querySelectorAll('[id^="gftext-"]').forEach(b=>b.classList.remove('on')); document.getElementById('gftext-'+pos)?.classList.add('on'); drawFrame(curFrame); }
function setArcStyle(style,el){ window._arcStyle=style; document.querySelectorAll('[id^="arc-style-"]').forEach(b=>b.classList.remove('on')); document.getElementById('arc-style-'+style)?.classList.add('on'); drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }
function setDistStyle(style,el){ window._distStyle=style; document.querySelectorAll('[id^="dist-style-"]').forEach(b=>b.classList.remove('on')); document.getElementById('dist-style-'+style)?.classList.add('on'); drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }
function setAltStyle(style,el){ window._altStyle=style; document.querySelectorAll('[id^="alt-style-"]').forEach(b=>b.classList.remove('on')); document.getElementById('alt-style-'+style)?.classList.add('on'); drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }
function setGradeStyle(style,el){ window._gradeStyle=style; document.querySelectorAll('[id^="grade-style-"]').forEach(b=>b.classList.remove('on')); document.getElementById('grade-style-'+style)?.classList.add('on'); drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }
function handleLandingFile(input){ if(input.files&&input.files[0]){ const mainInput=document.getElementById('fileInput'); const file=input.files[0]; const reader=new FileReader(); reader.onload=e=>{try{parseGPX(e.target.result,file.name)}catch(err){notif('Parse error: '+err.message,'#ff5c5c')}}; reader.readAsText(file); } }
function showMainApp(){ const lp=document.getElementById('landingPage'); if(lp){lp.style.opacity='0';lp.style.transition='opacity .3s';setTimeout(()=>lp.style.display='none',300);} const bell=document.getElementById('notifBellBtn'); if(bell) bell.style.display='flex'; }
function savePreset(){
  function imgToDataURL(img){
    if(!img || !img.naturalWidth) return null;
    try{
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img,0,0);
      return c.toDataURL('image/png');
    }catch(e){ return null; }
  }

  notif('💾 Saving preset…','#f0a04a');

  setTimeout(()=>{
    try{
      const preset = {
        version: 3,
        _savedAt: new Date().toISOString(),
        opts: {...opts},
        oPos: JSON.parse(JSON.stringify(oPos)),
        oScale: JSON.parse(JSON.stringify(oScale)),
        overlayBg: JSON.parse(JSON.stringify(overlayBg)),
        showOverlayBg,
        textColor, fontScale, panelOp, bgColor,
        overlayFont,
        speedUnit, spdStyle, spdMaxMode, spdMaxCustom,
        spdDistGap: window._spdDistGap||4,
        gpsFmt, gpsShowDate,
        distDecimals, distShowElev, distOdoMode,
        odoScale, odoScale2, odoShowBorder,
        osmMapShape, osmMapSize, osmZoom, osmStyle,
        osmTint, osmBrightness, osmContrast,
        osmShowRoute, osmShowHeading, osmUseOSM,
        mapBgStyle, mapRouteColor, mapDotColor, mapGhostColor, mapShowNorth,
        coordFmt, coordShowIcon,
        gforceScale: window._gforceScale||1,
        compassStyle: window._compassStyle||'rose',
        hrStyle: window._hrStyle||'standard',
        powerStyle: window._powerStyle||'standard',
        infoStyle: window._infoStyle||'list',
        elevStyle: window._elevStyle||'line',
        gpsTimeStyle: window._gpsTimeStyle||'standard',
        coordStyle: window._coordStyle||'standard',
        cadStyle: window._cadStyle||'standard',
        arcStyle: window._arcStyle||'ring',
        gradeStyle: window._gradeStyle||'bar',
        gforceTextPos: window._gforceTextPos||'center',
        distStyle: window._distStyle||'panel',
        altStyle: window._altStyle||'panel',
        dialMode, dialInputMode, dialYellowPct, dialRedPct, dialYellowMs, dialRedMs,
        hrMaxBpm, ftpWatts,
        customWatermarkOpacity,
        customWatermarkImageData: imgToDataURL(customWatermarkImage),
        previewBgEnabled, previewBgFit, previewBgIncludeExport,
        previewBgImageData: (previewBgImage && previewBgEnabled) ? imgToDataURL(previewBgImage) : null,
        exportTransparent, renderFmt, renderRes, fpsVal, bitrateVal,
        canvasOrient, playSpeed,
      };

      const json = JSON.stringify(preset, null, 2);
      const blob = new Blob([json], {type:'application/json'});
      const sizeKB = Math.round(blob.size/1024);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const ts = new Date().toISOString().slice(0,10);
      a.download = `GPXGreenScreen_preset_${ts}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      notif(`✓ Preset saved — ${sizeKB} KB`);
    }catch(err){ notif('Save error: '+err.message,'#ff5c5c'); console.error(err); }
  }, 50);
}

function loadPresetClick(){ document.getElementById('presetFileInput').click(); }

function loadPresetFile(input){
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try{ applyPreset(JSON.parse(e.target.result)); }
    catch(err){ notif('Error loading preset: '+err.message,'#ff5c5c'); }
  };
  reader.readAsText(file); input.value='';
}

function applyPreset(p){
  if(!p || ![1,2,3].includes(p.version)){ notif('Invalid or incompatible preset file','#ff5c5c'); return; }
  try{
    if(p.opts) Object.assign(opts, p.opts);
    if(p.oPos) Object.assign(oPos, p.oPos);
    if(p.oScale){ Object.keys(oScale).forEach(k=>delete oScale[k]); Object.assign(oScale, p.oScale); }
    if(p.overlayBg !== undefined){ Object.keys(overlayBg).forEach(k=>delete overlayBg[k]); Object.assign(overlayBg, p.overlayBg); }
    if(p.showOverlayBg !== undefined) showOverlayBg = p.showOverlayBg;
    if(p.textColor)       textColor = p.textColor;
    if(p.fontScale!=null) fontScale = p.fontScale;
    if(p.panelOp!=null)   panelOp   = p.panelOp;
    if(p.bgColor){
      bgColor = p.bgColor;
      const cw = document.getElementById('canvasWrapper'); if(cw) cw.style.background = bgColor;
    }
    if(p.speedUnit)          speedUnit    = p.speedUnit;
    if(p.spdStyle)           spdStyle     = p.spdStyle;
    if(p.spdMaxMode)         spdMaxMode   = p.spdMaxMode;
    if(p.spdMaxCustom!=null) spdMaxCustom = p.spdMaxCustom;
    if(p.spdDistGap!=null)   window._spdDistGap = p.spdDistGap;
    if(p.gpsFmt)            gpsFmt      = p.gpsFmt;
    if(p.gpsShowDate!=null)  gpsShowDate = p.gpsShowDate;
    if(p.distDecimals!=null)  distDecimals  = p.distDecimals;
    if(p.distShowElev!=null)  distShowElev  = p.distShowElev;
    if(p.distOdoMode!=null)   distOdoMode   = p.distOdoMode;
    if(p.odoScale!=null)      odoScale      = p.odoScale;
    if(p.odoScale2!=null)     odoScale2     = p.odoScale2;
    if(p.odoShowBorder!=null) odoShowBorder = p.odoShowBorder;
    if(p.osmMapShape)          osmMapShape    = p.osmMapShape;
    if(p.osmMapSize)           osmMapSize     = p.osmMapSize;
    if(p.osmZoom!=null)        osmZoom        = p.osmZoom;
    if(p.osmStyle)             osmStyle       = p.osmStyle;
    if(p.osmTint)              osmTint        = p.osmTint;
    if(p.osmBrightness!=null)  osmBrightness  = p.osmBrightness;
    if(p.osmContrast!=null)    osmContrast    = p.osmContrast;
    if(p.osmShowRoute!=null)   osmShowRoute   = p.osmShowRoute;
    if(p.osmShowHeading!=null) osmShowHeading = p.osmShowHeading;
    if(p.osmUseOSM!=null)      osmUseOSM      = p.osmUseOSM;
    if(p.mapBgStyle)           mapBgStyle     = p.mapBgStyle;
    if(p.mapRouteColor)        mapRouteColor  = p.mapRouteColor;
    if(p.mapDotColor)          mapDotColor    = p.mapDotColor;
    if(p.mapGhostColor)        mapGhostColor  = p.mapGhostColor;
    if(p.mapShowNorth!=null)   mapShowNorth   = p.mapShowNorth;
    if(p.coordFmt)            coordFmt      = p.coordFmt;
    if(p.coordShowIcon!=null)  coordShowIcon = p.coordShowIcon;
    if(p.gforceScale!=null)  window._gforceScale  = p.gforceScale;
    if(p.compassStyle)       window._compassStyle = p.compassStyle;
    if(p.hrStyle)            setHRStyle(p.hrStyle, null);
    if(p.powerStyle)         setPowerStyle(p.powerStyle, null);
    if(p.infoStyle)          setInfoStyle(p.infoStyle, null);
    if(p.elevStyle)          setElevStyle(p.elevStyle, null);
    if(p.gpsTimeStyle)       setGpsTimeStyle(p.gpsTimeStyle, null);
    if(p.coordStyle)         setCoordStyle(p.coordStyle, null);
    if(p.cadStyle)           setCadStyle(p.cadStyle, null);
    if(p.arcStyle)           setArcStyle(p.arcStyle, null);
    if(p.gradeStyle)         setGradeStyle(p.gradeStyle, null);
    if(p.gforceTextPos)      setGforceTextPos(p.gforceTextPos, null);
    if(p.distStyle)          setDistStyle(p.distStyle, null);
    if(p.altStyle)           setAltStyle(p.altStyle, null);
    if(p.dialMode!=null){
      dialMode = p.dialMode;
      document.getElementById('tog-dial-mode')?.classList.toggle('on', dialMode);
      const de = document.getElementById('dial-opts'); if(de) de.style.display = dialMode?'flex':'none';
    }
    if(p.dialInputMode)       setDialInputMode(p.dialInputMode, null);
    if(p.dialYellowPct!=null){ dialYellowPct=p.dialYellowPct; const s=document.getElementById('dial-yellow-pct'); if(s) s.value=dialYellowPct; document.getElementById('dialYellowVal').textContent=dialYellowPct+'%'; }
    if(p.dialRedPct!=null)   { dialRedPct=p.dialRedPct; const s=document.getElementById('dial-red-pct'); if(s) s.value=dialRedPct; document.getElementById('dialRedVal').textContent=dialRedPct+'%'; }
    if(p.dialYellowMs!=null)  dialYellowMs = p.dialYellowMs;
    if(p.dialRedMs!=null)     dialRedMs    = p.dialRedMs;
    if(dialInputMode==='speed') updateDialSpeedLabels();
    if(p.hrMaxBpm!=null) hrMaxBpm = p.hrMaxBpm;
    if(p.ftpWatts!=null) ftpWatts = p.ftpWatts;
    if(p.customWatermarkOpacity!=null) customWatermarkOpacity = p.customWatermarkOpacity;
    if(p.previewBgEnabled!=null)        previewBgEnabled        = p.previewBgEnabled;
    if(p.previewBgFit)                  previewBgFit            = p.previewBgFit;
    if(p.previewBgIncludeExport!=null)  previewBgIncludeExport  = p.previewBgIncludeExport;
    if(p.exportTransparent!=null) exportTransparent = p.exportTransparent;
    if(p.renderFmt)    renderFmt  = p.renderFmt;
    if(p.renderRes)    renderRes  = p.renderRes;
    if(p.fpsVal!=null) fpsVal     = p.fpsVal;
    if(p.bitrateVal!=null) bitrateVal = p.bitrateVal;
    if(p.playSpeed!=null) playSpeed = p.playSpeed;

    Object.keys(opts).forEach(key=>{
      document.getElementById('tog-'+key)?.classList.toggle('on', !!opts[key]);
      document.getElementById('oc-'+key)?.classList.toggle('off', !opts[key]);
    });

    document.getElementById('tog-global-bg')?.classList.toggle('on', showOverlayBg);
    document.querySelectorAll('[id^="tog-bg-"]').forEach(el=>{
      const key = el.id.replace('tog-bg-','');
      el.classList.toggle('on', overlayBg[key] !== undefined ? overlayBg[key] : showOverlayBg);
    });

    const fsSlider = document.getElementById('fs-slider');
    if(fsSlider){ fsSlider.value = Math.round(fontScale*100); document.getElementById('fsVal').textContent = fontScale.toFixed(2)+'×'; }

    const opSlider = document.querySelector('input[oninput="setOp(this.value)"]');
    if(opSlider){ opSlider.value = Math.round(panelOp*100); document.getElementById('opVal').textContent = Math.round(panelOp*100)+'%'; }

    const bgMap = {'#00b140':'green','#0047ab':'blue','#000000':'black','#1a1a2e':'navy'};
    document.querySelectorAll('.chips [id^="bg-"]').forEach(b=>b.classList.remove('on'));
    const knownKey = bgMap[bgColor.toLowerCase()];
    if(knownKey) document.getElementById('bg-'+knownKey)?.classList.add('on');
    else document.getElementById('bg-custom')?.classList.add('on');
    const bgPicker = document.getElementById('bg-color-picker');
    const bgHex    = document.getElementById('bg-hex-input');
    if(bgPicker) bgPicker.value = bgColor;
    if(bgHex)    bgHex.value   = bgColor;

    const tcPicker = document.getElementById('text-color-picker');
    const tcHex    = document.getElementById('text-hex-input');
    if(tcPicker) tcPicker.value = textColor;
    if(tcHex)    tcHex.value   = textColor;
    document.querySelectorAll('.sw').forEach(sw=>{
      sw.classList.toggle('on', sw.style.background === textColor || sw.style.backgroundColor === textColor);
    });

    if(p.overlayFont && OVERLAY_FONTS[p.overlayFont]) setOverlayFont(p.overlayFont, null);

    document.querySelectorAll('[id^="unit-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('unit-'+speedUnit)?.classList.add('on');

    document.querySelectorAll('[id^="spd-style-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('spd-style-'+spdStyle)?.classList.add('on');

    document.querySelectorAll('[id^="spd-max-"]').forEach(b=>b.classList.remove('on'));
    updateSpdMaxSliderUI();
    const distovOptsEl=document.getElementById('distov-opts');
    if(distovOptsEl) distovOptsEl.style.display=opts.distov?'flex':'none';
    document.getElementById('tog-distov')?.classList.toggle('on',opts.distov);

    const sgSlider = document.getElementById('spd-gap-slider');
    if(sgSlider){ sgSlider.value = window._spdDistGap; document.getElementById('spdGapVal').textContent = window._spdDistGap+'px'; }

    document.querySelectorAll('[id^="tf-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('tf-'+gpsFmt)?.classList.add('on');
    document.getElementById('tog-gpsdate')?.classList.toggle('on', gpsShowDate);

    document.querySelectorAll('[onclick^="setDistDec"]').forEach(b=>{
      b.classList.toggle('on', b.getAttribute('onclick').includes('('+distDecimals+','));
    });
    document.getElementById('tog-distelev')?.classList.toggle('on', distShowElev);

    document.getElementById('tog-distodo')?.classList.toggle('on', distOdoMode);
    const odoSizeOpts = document.getElementById('odo-size-opts');
    if(odoSizeOpts) odoSizeOpts.style.display = distOdoMode ? 'block' : 'none';
    const odoSl = document.getElementById('odo-scale-slider');
    if(odoSl){ odoSl.value = Math.round(odoScale*100); document.getElementById('odoScaleVal').textContent = odoScale.toFixed(1)+'×'; }
    const odoSl2 = document.getElementById('odo-scale-slider2');
    if(odoSl2){ odoSl2.value = Math.round(odoScale2*100); document.getElementById('odoScaleVal2').textContent = odoScale2.toFixed(1)+'×'; }
    document.getElementById('tog-bg-odometer')?.classList.toggle('on', overlayBg['odometer'] !== undefined ? overlayBg['odometer'] : showOverlayBg);

    document.querySelectorAll('[id^="osm-shape-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('osm-shape-'+osmMapShape)?.classList.add('on');
    document.querySelectorAll('[id^="osm-style-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('osm-style-'+osmStyle)?.classList.add('on');
    document.querySelectorAll('[id^="osm-tint-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('osm-tint-'+osmTint)?.classList.add('on');
    document.querySelectorAll('[id^="map-size-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('map-size-'+osmMapSize)?.classList.add('on');
    document.querySelectorAll('[id^="mapbg-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('mapbg-'+mapBgStyle)?.classList.add('on');
    document.getElementById('tog-maproute')?.classList.toggle('on', osmShowRoute);
    document.getElementById('tog-mapnorth')?.classList.toggle('on', mapShowNorth);
    document.getElementById('tog-osmheading')?.classList.toggle('on', osmShowHeading);
    const ozSlider = document.getElementById('osmZoomSlider');
    if(ozSlider){ ozSlider.value = osmZoom; const ozVal = document.getElementById('osmZoomVal'); if(ozVal) ozVal.textContent = osmZoom; }
    const brSlider = document.getElementById('osmBrightnessSlider');
    if(brSlider) brSlider.value = osmBrightness;
    const rcp = document.getElementById('route-color-picker');
    if(rcp) rcp.value = mapRouteColor;
    document.querySelectorAll('[id^="rc-"]').forEach(b=>b.classList.remove('on'));
    const dcp = document.getElementById('dot-color-picker');
    if(dcp) dcp.value = mapDotColor;
    document.querySelectorAll('[id^="dc-"]').forEach(b=>b.classList.remove('on'));

    document.querySelectorAll('[id^="coord-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('coord-'+coordFmt)?.classList.add('on');
    document.getElementById('tog-coordicon')?.classList.toggle('on', coordShowIcon);

    const gfsVal = window._gforceScale||1;
    document.querySelectorAll('[onclick^="setGforceScale"]').forEach(b=>{
      const match = b.getAttribute('onclick').match(/setGforceScale\((\d+)/);
      if(match) b.classList.toggle('on', parseInt(match[1]) === gfsVal);
    });

    document.querySelectorAll('[id^="compass-style-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('compass-style-'+(window._compassStyle||'rose'))?.classList.add('on');
    document.querySelectorAll('[id^="gftext-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('gftext-'+(window._gforceTextPos||'center'))?.classList.add('on');
    document.querySelectorAll('[id^="dist-style-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('dist-style-'+(window._distStyle||'panel'))?.classList.add('on');
    document.querySelectorAll('[id^="alt-style-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('alt-style-'+(window._altStyle||'panel'))?.classList.add('on');
    document.querySelectorAll('[id^="arc-style-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('arc-style-'+(window._arcStyle||'ring'))?.classList.add('on');
    document.querySelectorAll('[id^="grade-style-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('grade-style-'+(window._gradeStyle||'bar'))?.classList.add('on');
    document.querySelectorAll('[id^="hr-style-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('hr-style-'+(window._hrStyle||'standard'))?.classList.add('on');
    document.querySelectorAll('[id^="power-style-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('power-style-'+(window._powerStyle||'standard'))?.classList.add('on');
    document.querySelectorAll('[id^="info-style-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('info-style-'+(window._infoStyle||'list'))?.classList.add('on');
    document.querySelectorAll('[id^="elev-style-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('elev-style-'+(window._elevStyle||'line'))?.classList.add('on');
    document.querySelectorAll('[id^="gpstime-style-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('gpstime-style-'+(window._gpsTimeStyle||'standard'))?.classList.add('on');
    document.querySelectorAll('[id^="coord-style-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('coord-style-'+(window._coordStyle||'standard'))?.classList.add('on');
    document.querySelectorAll('[id^="cad-style-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('cad-style-'+(window._cadStyle||'standard'))?.classList.add('on');

    const hrSlider = document.getElementById('hr-slider');
    if(hrSlider){ hrSlider.value = hrMaxBpm; document.getElementById('hrMaxVal').textContent = hrMaxBpm+' bpm'; }
    const ftpSlider = document.getElementById('ftp-slider');
    if(ftpSlider){ ftpSlider.value = ftpWatts; document.getElementById('ftpVal').textContent = ftpWatts+' W'; }
    const wmSlider = document.getElementById('wm-opacity-slider');
    if(wmSlider){ wmSlider.value = Math.round(customWatermarkOpacity*100); document.getElementById('wmOpacityVal').textContent = Math.round(customWatermarkOpacity*100)+'%'; }

    document.getElementById('tog-preview-bg-enabled')?.classList.toggle('on', previewBgEnabled);
    document.getElementById('tog-preview-bg-export')?.classList.toggle('on', previewBgIncludeExport);
    const bgFitChips = document.getElementById('previewBgFitChips');
    if(bgFitChips) bgFitChips.querySelectorAll('.chip').forEach(b=>{
      const m = b.getAttribute('onclick').match(/'([^']+)'/);
      if(m) b.classList.toggle('on', m[1] === previewBgFit);
    });

    document.getElementById('tog-export-trans')?.classList.toggle('on', exportTransparent);
    document.querySelectorAll('[id^="fmt-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('fmt-'+renderFmt)?.classList.add('on');
    document.querySelectorAll('[id^="res-"]').forEach(b=>b.classList.remove('on'));
    document.getElementById('res-'+renderRes)?.classList.add('on');
    document.querySelectorAll('.chips .chip[onclick^="setFPS"]').forEach(b=>{
      b.classList.toggle('on', b.textContent.trim() === String(fpsVal));
    });

    const brSlider2 = document.getElementById('br-slider');
    if(brSlider2){
      brSlider2.value = bitrateVal;
      document.getElementById('br-label').textContent = bitrateVal+' kbps';
      document.getElementById('br-tag').textContent   = (bitrateVal/1000).toFixed(1)+' Mbps';
      document.querySelectorAll('.br-presets .chip').forEach(b=>b.classList.remove('on'));
      document.querySelector(`.br-presets .chip[onclick*="${bitrateVal}"]`)?.classList.add('on');
    }

    document.querySelectorAll('.playbar .chip[onclick^="setPlaySpeed"]').forEach(b=>{
      const m = b.getAttribute('onclick').match(/setPlaySpeed\((\d+)/);
      if(m) b.classList.toggle('on', parseInt(m[1]) === playSpeed);
    });

    if(p.canvasOrient){
      canvasOrient = p.canvasOrient;
      document.getElementById('orient-'+canvasOrient)?.click();
    }

    function restoreImage(dataURL, onDone){
      if(!dataURL){ onDone(null); return; }
      const img = new Image();
      img.onload  = () => onDone(img);
      img.onerror = () => { console.warn('Preset: failed to restore image'); onDone(null); };
      img.src = dataURL;
    }

    let pendingImages = 0;
    const tryFinalDraw = () => {
      pendingImages--;
      if(pendingImages <= 0){
        if(gpxData) drawFrame(curFrame);
        if(window._dragHandle) window._dragHandle.updateHandles();
        notif('✓ Preset loaded'+(p._savedAt ? ' (saved '+p._savedAt.slice(0,10)+')' : ''));
      }
    };

    pendingImages++;
    restoreImage(p.customWatermarkImageData, img => {
      customWatermarkImage = img;
      if(img){
        document.getElementById('wmLoaded')?.style && (document.getElementById('wmLoaded').style.display = 'flex');
        const fn = document.getElementById('wmFileName');
        if(fn) fn.textContent = 'from preset';
        const btn = document.getElementById('wmUploadBtn');
        if(btn) btn.innerHTML = `<input type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" id="wmImageInput" onchange="loadCustomWatermark(this)" style="display:none">🔄 Change Logo`;
      }
      tryFinalDraw();
    });

    pendingImages++;
    restoreImage(p.previewBgImageData, img => {
      if(img){
        previewBgImage   = img;
        previewBgEnabled = p.previewBgEnabled !== false;
        document.getElementById('previewBgLoaded')?.style && (document.getElementById('previewBgLoaded').style.display = 'block');
        const pbn = document.getElementById('previewBgName');
        if(pbn) pbn.textContent = 'from preset';
        const lbl = document.getElementById('previewBgUploadBtn');
        if(lbl) lbl.innerHTML = `<input type="file" accept="image/*" id="previewBgInput" onchange="loadPreviewBgImage(this)" style="display:none">🔄 Change Image`;
        document.getElementById('tog-preview-bg-enabled')?.classList.toggle('on', previewBgEnabled);
      } else {
        previewBgImage   = null;
        previewBgEnabled = false;
        document.getElementById('previewBgLoaded')?.style && (document.getElementById('previewBgLoaded').style.display = 'none');
        document.getElementById('tog-preview-bg-enabled')?.classList.remove('on');
      }
      tryFinalDraw();
    });

  }catch(err){ notif('Load error: '+err.message,'#ff5c5c'); console.error(err); }
}
function toggleFullscreen(){ const pc=document.getElementById('centerPanel'); if(!document.fullscreenElement&&!document.webkitFullscreenElement){ const fn=pc.requestFullscreen||pc.webkitRequestFullscreen||pc.mozRequestFullScreen; if(fn) fn.call(pc); document.getElementById('btnFullscreen').textContent='✕ Exit'; } else { const fn=document.exitFullscreen||document.webkitExitFullscreen||document.mozCancelFullScreen; if(fn) fn.call(document); document.getElementById('btnFullscreen').textContent='⛶'; } }
document.addEventListener('keydown',e=>{ if((e.key==='f'||e.key==='F')&&document.activeElement.tagName!=='INPUT') toggleFullscreen(); });
document.addEventListener('fullscreenchange',()=>{ if(!document.fullscreenElement){ const b=document.getElementById('btnFullscreen'); if(b) b.textContent='⛶'; } });
function setSpdGap(v){ window._spdDistGap=parseInt(v); document.getElementById('spdGapVal').textContent=v+'px'; drawFrame(curFrame); }
function setOdoScale(v){ odoScale=parseInt(v)/100; document.getElementById('odoScaleVal').textContent=odoScale.toFixed(1)+'×'; drawFrame(curFrame); }
function toggleDistElev(row){ distShowElev=!distShowElev; const tog=document.getElementById('tog-distelev'); if(tog)tog.classList.toggle('on',distShowElev); drawFrame(curFrame); }
function toggleGlobalBg(row){
  showOverlayBg=!showOverlayBg;
  document.getElementById('tog-global-bg')?.classList.toggle('on',showOverlayBg);
  Object.keys(overlayBg).forEach(k=>delete overlayBg[k]);
  document.querySelectorAll('[id^="tog-bg-"]').forEach(el=>el.classList.toggle('on',showOverlayBg));
  drawFrame(curFrame);
}
function toggleOverlayBg(key,row){
  const cur = overlayBg[key] !== undefined ? overlayBg[key] : showOverlayBg;
  overlayBg[key] = !cur;
  document.getElementById('tog-bg-'+key)?.classList.toggle('on', overlayBg[key]);
  if(key === 'odometer'){ odoShowBorder = overlayBg[key]; }
  drawFrame(curFrame);
}
function setOp(v){ panelOp=parseInt(v)/100; document.getElementById('opVal').textContent=v+'%'; drawFrame(curFrame); }
function confirmDialog(title, msg, onConfirm){ const bd=document.createElement('div'); bd.className='confirm-backdrop'; bd.innerHTML=`<div class="confirm-box"><div class="confirm-title">${title}</div><div class="confirm-msg">${msg}</div><div class="confirm-btns"><button class="bs" onclick="this.closest('.confirm-backdrop').remove()">Cancel</button><button class="bp" id="confirm-ok" style="padding:7px 18px">Confirm</button></div></div>`; document.body.appendChild(bd); bd.querySelector('#confirm-ok').onclick=()=>{ bd.remove(); onConfirm(); }; bd.addEventListener('click',e=>{ if(e.target===bd)bd.remove(); }); }
function resetDefaults(){ 
  confirmDialog('Reset to Default','Reset all overlay positions, sizes and settings to default? GPX data will not be affected.',()=>{ 
    Object.assign(opts,{speed:true,map:true,info:false,arc:false,prog:false,elev:false, gpstime:true,distov:false,coords:true,gforce:false,compass:false,grade:false,distance:false,altitude:false}); 
    Object.assign(oPos,{speed:'bl',map:'tr',info:'br',arc:'tl',elev:'bc', gpstime:'tl',coords:'br',gforce:'bl',compass:'tr',grade:'tc',distance:'bc',altitude:'tc'}); 
    Object.keys(oScale).forEach(k=>delete oScale[k]); 
    fontScale=2.2; panelOp=0; textColor='#ffffff'; bgColor='#00b140'; renderRes='1080p'; canvasOrient='landscape'; fpsVal=1; 
    const{W:rW,H:rH}=resWH(); canvas.width=rW; canvas.height=rH; 
    const cwReset=document.getElementById('canvasWrapper');if(cwReset)cwReset.style.aspectRatio='16/9'; 
    ['720p','1080p'].forEach(r=>{const b=document.getElementById('res-'+r);if(b)b.classList.toggle('on',r==='1080p');}); 
    ['landscape','portrait','square'].forEach(o=>{const b=document.getElementById('orient-'+o);if(b)b.classList.toggle('on',o==='landscape');}); 
    speedUnit='kmh'; spdStyle='bar'; spdMaxMode='auto'; spdMaxCustom=0; gpsFmt='hms'; gpsShowDate=false; mapBgStyle='trans'; mapRouteColor='#ffffff'; mapDotColor='#ff3333'; mapShowNorth=false; osmMapShape='none'; osmMapSize='md'; osmZoom=15; osmUseOSM=false; osmStyle='standard'; osmTint='none'; osmBrightness=100; coordFmt='dms'; coordShowIcon=true; 
    Object.keys(opts).forEach(k=>{ const t=document.getElementById('tog-'+k); if(t)t.classList.toggle('on',!!opts[k]); const card=document.getElementById('oc-'+k); if(card)card.classList.toggle('off',!opts[k]); }); 
    const slSync=[ ['fs-slider','100'],['fs-md','on'],['opVal','0%'], ['bg-green','on'],['unit-kmh','on'],['spd-style-bar','on'],['spd-max-auto','on'],['tf-hms','on'], ['osm-shape-none','on'],['osm-style-standard','on'],['osm-tint-none','on'], ['mapbg-trans','on'],['map-mode-simple','on'], ['coord-dms','on'],['gscale-2','on'],['compass-style-rose','on'], ]; 
    slSync.forEach(([id,val])=>{ const el=document.getElementById(id); if(!el)return; if(val==='on') el.classList.add('on'); else el.value=val; }); 
    document.getElementById('tog-gpsdate').classList.remove('on'); 
    setOverlayFont('mono', null); setHRStyle('standard',null); setPowerStyle('standard',null); setInfoStyle('list',null); setElevStyle('line',null); setGpsTimeStyle('standard',null); setCoordStyle('standard',null); setCadStyle('standard',null); setArcStyle('ring',null); setGradeStyle('bar',null); setGforceTextPos('center',null); updateSpdMaxSliderUI(); setDistStyle('panel',null); setAltStyle('panel',null); 
    document.getElementById('tog-mapnorth').classList.remove('on'); showOverlayBg = false; document.getElementById('tog-global-bg')?.classList.remove('on'); document.querySelectorAll('[id^="tog-bg-"]').forEach(el => el.classList.remove('on')); document.querySelectorAll('.sw').forEach(s=>s.classList.remove('on')); document.querySelector('.sw[style*="#fff"]')?.classList.add('on'); document.getElementById('canvasWrapper').style.background=bgColor; 
    (function(){ const{W,H}=resWH(); canvas.width=W; canvas.height=H; })(); document.getElementById('opVal').textContent='0%'; document.getElementById('fsVal').textContent='2.20×'; document.getElementById('fs-slider').value=220; 
    document.querySelectorAll('.chip').forEach(b=>{ const oc=b.getAttribute('onclick'); if(oc&&oc.startsWith('setFS(')){ b.classList.toggle('on', oc==="setFS('xxl',this)"); } }); 
    
    // --- KEMBALIKAN STATUS AKTIF KE TOMBOL DEFAULT ---
    document.getElementById('btn-preset-default')?.classList.add('on');
    document.getElementById('btn-preset-1')?.classList.remove('on');
    // -------------------------------------------------

    if(window._dragHandle)window._dragHandle.updateHandles(); if(gpxData)drawFrame(curFrame); notif('Reset to default settings'); 
  }); 
}
function clearGPX(){ confirmDialog('Clear GPX','Remove the current GPX file and return to the start screen?',()=>{ gpxData=null; curFrame=0; tfS0=0; tfE0=0; playing=false; cancelAnimationFrame(rafId); document.getElementById('btnPlay').textContent='▶'; document.getElementById('statsSection').style.display='none'; document.getElementById('fmtSection').style.display='none'; document.getElementById('rightPanel').style.display='none'; document.getElementById('tfSection').style.display='none'; document.getElementById('playbar').classList.remove('vis'); document.getElementById('vsb').classList.remove('vis'); document.getElementById('emptyState').style.display='flex'; document.getElementById('btnRender').disabled=true; document.getElementById('btnDownload').style.display='none'; document.getElementById('rpWrap').classList.remove('vis'); const dz2=document.getElementById('dropZone'); dz2.classList.remove('loaded'); dz2.querySelector('.drop-title').textContent='Drop .gpx file here'; dz2.querySelector('.drop-sub').textContent='or click to browse'; document.getElementById('fileInput').value=''; const{W,H}=resWH(); ctx.clearRect(0,0,W,H); ctx.fillStyle=bgColor; ctx.fillRect(0,0,W,H); osmTileCache.clear(); vecCache.clear(); if(window._dragHandle)window._dragHandle.updateHandles(); const pbSec=document.getElementById('previewBgSection'); if(pbSec) pbSec.style.display='none'; notif('GPX cleared'); }); }

// ═══════════════════════════════════════════════════════════
// MAP UI CONTROLS
// ═══════════════════════════════════════════════════════════
function setMapMode(mode, el){ osmUseOSM = (mode === 'osm'); if(el && el.closest('.chips')) { el.closest('.chips').querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); } drawFrame(curFrame); }
function setMapBg(style, el){ mapBgStyle = style; if(el && el.closest('.chips')) { el.closest('.chips').querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); } drawFrame(curFrame); }
function setMapShape(shape, el){ osmMapShape = shape; if(el && el.closest('.chips')) { el.closest('.chips').querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); } drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }
function setMapSize(sz, el){ osmMapSize = sz; if(el && el.closest('.chips')) { el.closest('.chips').querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); } drawFrame(curFrame); if(window._dragHandle) window._dragHandle.updateHandles(); }
function setOsmStyle(style, el){ osmStyle = style; if(el && el.closest('.chips')) { el.closest('.chips').querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); } drawFrame(curFrame); }
function setOsmZoom(z){ osmZoom = parseInt(z); const zl = document.getElementById('osmZoomVal'); if(zl) zl.textContent = z; drawFrame(curFrame); }
function setOsmTint(tint, el){ osmTint = tint; if(el && el.closest('.chips')) { el.closest('.chips').querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); } drawFrame(curFrame); }
function toggleMapRoute(row){ osmShowRoute = !osmShowRoute; const t = document.getElementById('tog-maproute') || (row && row.querySelector('.tt')); if(t) t.classList.toggle('on', osmShowRoute); drawFrame(curFrame); }
function toggleMapNorth(row){ mapShowNorth = !mapShowNorth; const t = document.getElementById('tog-mapnorth') || (row && row.querySelector('.tt')); if(t) t.classList.toggle('on', mapShowNorth); drawFrame(curFrame); }
function toggleOsmHeading(row){ osmShowHeading = !osmShowHeading; const t = document.getElementById('tog-osmheading') || (row && row.querySelector('.tt')); if(t) t.classList.toggle('on', osmShowHeading); drawFrame(curFrame); }

// ── NOTIFICATION ──
const _notifLog=[]; let _notifUnread=0; let _notifToastTimer=null;
function notif(msg, color='#4af0a0'){
  const n=document.getElementById('notif'); document.getElementById('nt').textContent=msg; document.getElementById('nd').style.background=color; n.classList.add('show');
  if(_notifToastTimer) clearTimeout(_notifToastTimer); _notifToastTimer=setTimeout(()=>n.classList.remove('show'), 4500);
  const now=new Date(); const timeStr=now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0')+':'+now.getSeconds().toString().padStart(2,'0');
  _notifLog.unshift({msg, color, time:timeStr}); if(_notifLog.length>50) _notifLog.pop();
  const panelOpen=document.getElementById('notifPanel')?.classList.contains('open');
  if(!panelOpen){ _notifUnread++; const badge=document.getElementById('notifBadge'); if(badge){ badge.style.display='flex'; badge.textContent=_notifUnread>9?'9+':_notifUnread; } }
  renderNotifList();
}
function renderNotifList(){ const list=document.getElementById('notifList'); const empty=document.getElementById('notifEmpty'); if(!list) return; if(_notifLog.length===0){ if(empty) empty.style.display='block'; list.innerHTML='<div class="notif-empty">No notifications yet</div>'; return; } if(empty) empty.style.display='none'; list.innerHTML=_notifLog.map(n=>`<div class="notif-item"><span class="notif-dot" style="background:${n.color}"></span><div style="flex:1"><div>${n.msg}</div><div class="notif-time">${n.time}</div></div></div>`).join(''); }
function toggleNotifPanel(){ const panel=document.getElementById('notifPanel'); if(!panel) return; panel.classList.toggle('open'); if(panel.classList.contains('open')){ _notifUnread=0; const badge=document.getElementById('notifBadge'); if(badge) badge.style.display='none'; renderNotifList(); } }
function clearNotifLog(){ _notifLog.length=0; _notifUnread=0; const badge=document.getElementById('notifBadge'); if(badge) badge.style.display='none'; renderNotifList(); }
document.addEventListener('click', e=>{ const panel=document.getElementById('notifPanel'); const btn=document.getElementById('notifBellBtn'); if(panel&&btn&&!panel.contains(e.target)&&!btn.contains(e.target)){ panel.classList.remove('open'); } });

// Init
document.getElementById('canvasWrapper').style.background=bgColor;
const _initW = canvas.width || 1920;
const _initH = canvas.height || 1080;
ctx.fillStyle = bgColor;
ctx.fillRect(0, 0, _initW, _initH);

// ═══════════════════════════════════════════════════════════
// PREVIEW BACKGROUND IMAGE HANDLERS
// ═══════════════════════════════════════════════════════════
function loadPreviewBgImage(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      previewBgImage = img;
      previewBgEnabled = true;
      document.getElementById('tog-preview-bg-enabled')?.classList.add('on');
      document.getElementById('previewBgLoaded').style.display = 'block';
      const shortName = file.name.length > 24 ? file.name.slice(0,22)+'…' : file.name;
      document.getElementById('previewBgName').textContent = shortName;
      const lbl = document.getElementById('previewBgUploadBtn');
      lbl.innerHTML = `<input type="file" accept="image/*" id="previewBgInput" onchange="loadPreviewBgImage(this)" style="display:none">🔄 Change Image`;
      drawFrame(curFrame);
      notif('Preview background loaded');
    };
    img.onerror = () => notif('Failed to load image','#ff5c5c');
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function togglePreviewBgEnabled(row){
  previewBgEnabled = !previewBgEnabled;
  const tog = document.getElementById('tog-preview-bg-enabled');
  if(tog) tog.classList.toggle('on', previewBgEnabled);
  drawFrame(curFrame);
}
function setPreviewBgFit(mode, el){
  previewBgFit = mode;
  const chips = document.getElementById('previewBgFitChips');
  if(chips) chips.querySelectorAll('.chip').forEach(b => b.classList.remove('on'));
  if(el) el.classList.add('on');
  drawFrame(curFrame);
}
function togglePreviewBgExport(row){
  previewBgIncludeExport = !previewBgIncludeExport;
  const tog = document.getElementById('tog-preview-bg-export');
  if(tog) tog.classList.toggle('on', previewBgIncludeExport);
  notif(previewBgIncludeExport ? 'Background image: included in export' : 'Background image: preview only');
}
function clearPreviewBg(){
  previewBgImage = null;
  previewBgEnabled = false;
  previewBgIncludeExport = false;
  document.getElementById('previewBgLoaded').style.display = 'none';
  document.getElementById('previewBgName').textContent = '—';
  document.getElementById('tog-preview-bg-enabled')?.classList.remove('on');
  document.getElementById('tog-preview-bg-export')?.classList.remove('on');
  const chips = document.getElementById('previewBgFitChips');
  if(chips){
    chips.querySelectorAll('.chip').forEach(b => b.classList.remove('on'));
    chips.querySelector('.chip')?.classList.add('on');
  }
  const lbl = document.getElementById('previewBgUploadBtn');
  if(lbl) lbl.innerHTML = `<input type="file" accept="image/*" id="previewBgInput" onchange="loadPreviewBgImage(this)" style="display:none">📷 Upload Image`;
  drawFrame(curFrame);
  notif('Preview background removed');
}

// ═══════════════════════════════════════════════════════════
// OVERLAY FONT
// ═══════════════════════════════════════════════════════════
function setOverlayFont(font, el){
  overlayFont = font;
  document.querySelectorAll('[id^="ofnt-"]').forEach(b => b.classList.remove('on'));
  const active = document.getElementById('ofnt-' + font);
  if(active) active.classList.add('on');
  const fam = OVERLAY_FONTS[font]?.family || OVERLAY_FONTS.mono.family;
  const prev = document.getElementById('font-preview-text');
  if(prev) prev.style.fontFamily = fam;
  drawFrame(curFrame);
}

// ═══════════════════════════════════════════════════════════
// CUSTOM WATERMARK / LOGO
// ═══════════════════════════════════════════════════════════
function loadCustomWatermark(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      customWatermarkImage = img;
      document.getElementById('wmLoaded').style.display = 'flex';
      const short = file.name.length > 24 ? file.name.slice(0,22)+'…' : file.name;
      document.getElementById('wmFileName').textContent = short;
      const btn = document.getElementById('wmUploadBtn');
      if(btn) btn.innerHTML = `<input type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" id="wmImageInput" onchange="loadCustomWatermark(this)" style="display:none">🔄 Change Logo`;
      drawFrame(curFrame);
      if(window._dragHandle) window._dragHandle.updateHandles();
      notif('Custom watermark loaded');
    };
    img.onerror = () => notif('Failed to load image','#ff5c5c');
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function setWmOpacity(v){
  customWatermarkOpacity = parseInt(v)/100;
  document.getElementById('wmOpacityVal').textContent = v+'%';
  drawFrame(curFrame);
}
function clearCustomWatermark(){
  customWatermarkImage = null;
  customWatermarkOpacity = 1.0;
  document.getElementById('wmLoaded').style.display = 'none';
  document.getElementById('wmFileName').textContent = '—';
  const sl = document.getElementById('wm-opacity-slider');
  if(sl) sl.value = 100;
  document.getElementById('wmOpacityVal').textContent = '100%';
  const btn = document.getElementById('wmUploadBtn');
  if(btn) btn.innerHTML = `<input type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" id="wmImageInput" onchange="loadCustomWatermark(this)" style="display:none">📷 Upload PNG / JPG Logo`;
  drawFrame(curFrame);
  if(window._dragHandle) window._dragHandle.updateHandles();
  notif('Watermark reset to default');
}

// ═══════════════════════════════════════════════════════════
// LOAD SAMPLE GPX
// ═══════════════════════════════════════════════════════════
async function loadSampleGPX() {
  const btn = event.target;
  const originalText = btn.textContent;
  
  try {
    // Ubah teks tombol jadi loading
    btn.textContent = '⏳ Loading sample...';
    btn.disabled = true;

    // Ambil file dari repository (pastikan nama file sesuai dengan yang Anda upload)
    const response = await fetch('https://imsikruwi.github.io/gpx-greenscreen/sample.gpx');
    
    if (!response.ok) {
      throw new Error('Sample file not found');
    }

    const gpxText = await response.text();
    
    // Tutup landing page
    const lp = document.getElementById('landingPage');
    if (lp) {
      lp.style.opacity = '0';
      lp.style.transition = 'opacity .3s';
      setTimeout(() => lp.style.display = 'none', 300);
    }
    
    const bell = document.getElementById('notifBellBtn');
    if (bell) bell.style.display = 'flex';

    // Proses teks GPX menggunakan fungsi parseGPX yang sudah ada
    // (Diasumsikan 'sample.gpx' adalah nama file sementaranya)
    parseGPX(gpxText, 'sample_activity.gpx');
    
    notif('Sample GPX loaded successfully', '#4af0a0');

  } catch (error) {
    notif('Failed to load sample: ' + error.message, '#ff5c5c');
  } finally {
    // Kembalikan tombol ke keadaan semula
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

// ═══════════════════════════════════════════════════════════
// FETCH PRESET DARI GITHUB (preset1.json)
// ═══════════════════════════════════════════════════════════
async function fetchPreset1(btn) {
  const originalText = btn.innerHTML;
  
  try {
    btn.innerHTML = '⏳ Loading...';
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.style.cursor = 'wait';

    const response = await fetch('https://imsikruwi.github.io/gpx-greenscreen/preset1.json');
    
    if (!response.ok) {
      throw new Error('File preset1.json tidak ditemukan.');
    }

    const presetData = await response.json();
    applyPreset(presetData);
    
    // --- PINDAHKAN STATUS AKTIF KE PRESET 1 ---
    document.getElementById('btn-preset-default')?.classList.remove('on');
    btn.classList.add('on');
    // ------------------------------------------

    notif('✨ Preset 1 berhasil dimuat!', '#4af0a0');

  } catch (error) {
    notif('Gagal memuat Preset 1: ' + error.message, '#ff5c5c');
    console.error('Fetch Preset Error:', error);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  }
}