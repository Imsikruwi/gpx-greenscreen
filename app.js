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
  let s=parseInt(document.getElementById('tfS').value); let e=parseInt(document.getElementById('tfE').value);
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
  document.addEventListener('mousedown',e=>{ const mid=document.getElementById('tfMid'); if(!mid||e.target!==mid)return; e.preventDefault(); _tfMidDrag=true; _tfMidStartX=e.clientX; _tfMidStartS=tfS0; _tfMidStartE=tfE0; });
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
  document.getElementById('tfST').textContent=fmtTime(s0); document.getElementById('tfET').textContent=fmtTime(e0);
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
  
  // EN: Interpolate timestamp so the GPS clock ticks smoothly during GPX gaps
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
function updScrub(sec){ document.getElementById('scrubber').value=curFrame; if(sec!=null) document.getElementById('timeDisplay').textContent=fmtTime(sec); else{ const pt=gpxData.points[curFrame]; const t0=gpxData.points[tfS0].time; const s=pt.time&&t0?(pt.time-t0)/1000:(curFrame-tfS0); document.getElementById('timeDisplay').textContent=fmtTime(s); } }
function drawFrameInterp(idx,frac){ if(!gpxData){drawFrame(idx);return;} const ipt=interpPoint(gpxData.points,idx,frac); drawFrameWithPt(idx,ipt); }

// ═══════════════════════════════════════════════════════════
// FRAME INDICES & ESTIMATION
// ═══════════════════════════════════════════════════════════
function interpPt(a, b, t){
  const lerp=(x,y)=>x+(y-x)*t; const lerpNull=(x,y)=>(x!=null&&y!=null)?lerp(x,y):x??y;
  
  // EN: Fix the time interpolation for ZIP exports as well
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
function setUnit(u,el){ speedUnit=u; document.querySelectorAll('[id^=unit-]').forEach(b=>b.classList.remove('on')); el.classList.add('on'); drawFrame(curFrame); }
function setBGHex(val){ if(/^#[0-9a-fA-F]{6}$/.test(val)){ setCustomBG(val); document.getElementById('bg-color-picker').value=val; } }
function setCustomBG(color){ bgColor=color; document.getElementById('canvasWrapper').style.background=color; document.getElementById('bg-color-picker').value=color; ['green','blue','black','navy'].forEach(k=>{ const b=document.getElementById('bg-'+k); if(b) b.classList.remove('on'); }); document.getElementById('bg-custom').classList.add('on'); drawFrame(curFrame); }
function setBG(color,id,el){ bgColor=color; document.getElementById('canvasWrapper').style.background=color; const hexInp=document.getElementById('bg-hex-input'); if(hexInp) hexInp.value=color; const cpick=document.getElementById('bg-color-picker'); if(cpick) cpick.value=color; ['green','blue','black','navy'].forEach(k=>{const b=document.getElementById('bg-'+k);if(b)b.classList.remove('on')}); el.classList.add('on'); drawFrame(curFrame); }
function toggleOpt(key,row){ opts[key]=!opts[key]; const tog=document.getElementById('tog-'+key); if(tog)tog.classList.toggle('on',opts[key]); const card=document.getElementById('oc-'+key); if(card)card.classList.toggle('off',!opts[key]); drawFrame(curFrame); }
function setPos(key,pos,el){ oPos[key]=pos; const grid=document.getElementById('pos-'+key); if(grid)grid.querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); drawFrame(curFrame); }
function setSpdMax(v,el){ spdMaxMode=v==='auto'?'auto':'custom'; spdMaxCustom=v==='auto'?0:parseInt(v); document.getElementById('spd-max-chips').querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); drawFrame(curFrame); }
function setSpdStyle(style,el){ spdStyle=style; document.querySelectorAll('[id^=spd-style-]').forEach(b=>b.classList.remove('on')); el.classList.add('on'); drawFrame(curFrame); }
function customSpdMax(){ const unit=spdLabel(); const cur=spdMaxCustom||Math.round(cvtSpd(gpxData?.maxSpeedMs||30)); const v=prompt('Max speed for bar ('+unit+'):', cur); if(v===null)return; const n=parseFloat(v); if(isNaN(n)||n<=0){notif('Invalid value','#ff5c5c');return} let ms=n; if(speedUnit==='kmh')ms=n/3.6; else if(speedUnit==='mph')ms=n/2.237; else if(speedUnit==='pace')ms=ms>0?1000/(n*60):0; spdMaxMode='custom'; spdMaxCustom=ms; document.getElementById('spd-max-chips').querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); document.getElementById('spd-max-custom').textContent=n+' '+unit; document.getElementById('spd-max-custom').classList.add('on'); drawFrame(curFrame); }
function setGpsFmt(fmt,el){ gpsFmt=fmt; el.closest('.chips').querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); drawFrame(curFrame); }
function setCoordFmt(fmt,el){ coordFmt=fmt; el.closest('.chips').querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); drawFrame(curFrame); }
function toggleCoordIcon(row){ coordShowIcon=!coordShowIcon; const tog=document.getElementById('tog-coordicon'); if(tog)tog.classList.toggle('on',coordShowIcon); drawFrame(curFrame); }
function toggleGpsDate(row){ gpsShowDate=!gpsShowDate; const tog=document.getElementById('tog-gpsdate'); if(tog)tog.classList.toggle('on',gpsShowDate); drawFrame(curFrame); }
function setTextHex(val){ if(/^#[0-9a-fA-F]{6}$/.test(val)){ textColor=val; const cp=document.getElementById('text-color-picker'); if(cp) cp.value=val; drawFrame(curFrame); } }
function setRouteColor(c,el){ mapRouteColor=c; document.querySelectorAll('[id^="rc-"]').forEach(s=>s.classList.remove('on')); if(el) el.classList.add('on'); const rp=document.getElementById('route-color-picker'); if(rp) rp.value=c; drawFrame(curFrame); }
function setDotColor(c,el){ mapDotColor=c; document.querySelectorAll('[id^="dc-"]').forEach(s=>s.classList.remove('on')); if(el) el.classList.add('on'); const dp=document.getElementById('dot-color-picker'); if(dp) dp.value=c; drawFrame(curFrame); }
function setColor(c,el){ textColor=c; if(el){ el.closest('div').querySelectorAll('.sw').forEach(s=>s.classList.remove('on')); el.classList.add('on'); } const cp=document.getElementById('text-color-picker'); if(cp) cp.value=(c.length===4?c+'000':c).slice(0,7); drawFrame(curFrame); }
function setFS(s,el){ const map={xs:.7,md:1,lg:1.35,xl:1.7,xxl:2.2,xxxl:3.0}; fontScale=map[s]||1; document.querySelectorAll('.chip').forEach(b=>{if(b.closest('.chips')&&b.onclick&&b.getAttribute('onclick')&&b.getAttribute('onclick').startsWith('setFS('))b.classList.remove('on')}); if(el)el.classList.add('on'); const sl=document.getElementById('fs-slider'); if(sl){sl.value=Math.round(fontScale*100)} document.getElementById('fsVal').textContent=fontScale.toFixed(2)+'×'; drawFrame(curFrame); }
function setFSSlider(v){ fontScale=parseInt(v)/100; document.querySelectorAll('.chip').forEach(b=>{if(b.getAttribute('onclick')&&b.getAttribute('onclick').startsWith('setFS('))b.classList.remove('on')}); document.getElementById('fsVal').textContent=fontScale.toFixed(2)+'×'; drawFrame(curFrame); }
function setDistDec(n,el){ distDecimals=n; el.closest('.chips').querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); drawFrame(curFrame); }
function toggleDistOdo(row){ distOdoMode=!distOdoMode; const t=document.getElementById('tog-distodo'); if(t)t.classList.toggle('on',distOdoMode); const sz=document.getElementById('odo-size-opts'); if(sz)sz.style.display=distOdoMode?'block':'none'; drawFrame(curFrame); }
function toggleOdoBorder(row){ odoShowBorder=!odoShowBorder; const t=document.getElementById('tog-odoborder'); if(t)t.classList.toggle('on',odoShowBorder); drawFrame(curFrame); }
function setOdoScale2(v){ odoScale2=parseInt(v)/100; document.getElementById('odoScaleVal2').textContent=odoScale2.toFixed(1)+'×'; drawFrame(curFrame); }
function handleLandingFile(input){ if(input.files&&input.files[0]){ const mainInput=document.getElementById('fileInput'); const file=input.files[0]; const reader=new FileReader(); reader.onload=e=>{try{parseGPX(e.target.result,file.name)}catch(err){notif('Parse error: '+err.message,'#ff5c5c')}}; reader.readAsText(file); } }
function showMainApp(){ const lp=document.getElementById('landingPage'); if(lp){lp.style.opacity='0';lp.style.transition='opacity .3s';setTimeout(()=>lp.style.display='none',300);} const bell=document.getElementById('notifBellBtn'); if(bell) bell.style.display='flex'; }
function savePreset(){ try{ const preset={ version:1, opts:{...opts}, oPos:JSON.parse(JSON.stringify(oPos)), textColor, fontScale, panelOp, bgColor, speedUnit, spdStyle, spdMaxMode, spdMaxCustom, gpsFmt, gpsShowDate, distDecimals, distShowElev, distOdoMode, odoScale, odoScale2, odoShowBorder, spdDistGap: window._spdDistGap||4, osmMapShape, osmShowRoute, mapBgStyle, mapRouteColor, mapDotColor, mapShowNorth, coordFmt, coordShowIcon, canvasOrient, renderFmt, renderRes, fpsVal, bitrateVal, gforceScale: window._gforceScale||2, compassStyle: window._compassStyle||'rose', }; const blob=new Blob([JSON.stringify(preset,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='GPXGreenScreen_preset.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href); notif('✓ Preset saved'); }catch(err){ notif('Save error: '+err.message,'#ff5c5c'); console.error(err); } }
function loadPresetClick(){ document.getElementById('presetFileInput').click(); }
function loadPresetFile(input){ const file=input.files[0]; if(!file)return; const reader=new FileReader(); reader.onload=e=>{ try{ applyPreset(JSON.parse(e.target.result)); notif('✓ Preset loaded'); }catch(err){ notif('Error loading preset: '+err.message,'#ff5c5c'); } }; reader.readAsText(file); input.value=''; }
function applyPreset(p){ if(!p||p.version!==1){notif('Invalid preset file','#ff5c5c');return;} try{ if(p.opts) Object.assign(opts, p.opts); if(p.oPos) Object.assign(oPos, p.oPos); if(p.textColor) textColor=p.textColor; if(p.fontScale!=null) fontScale=p.fontScale; if(p.panelOp!=null) panelOp=p.panelOp; if(p.bgColor){ bgColor=p.bgColor; const cw=document.getElementById('canvasWrapper'); if(cw)cw.style.background=bgColor; } if(p.speedUnit) speedUnit=p.speedUnit; if(p.spdStyle) spdStyle=p.spdStyle; if(p.spdMaxMode) spdMaxMode=p.spdMaxMode; if(p.spdMaxCustom!=null) spdMaxCustom=p.spdMaxCustom; if(p.gpsFmt) gpsFmt=p.gpsFmt; if(p.gpsShowDate!=null) gpsShowDate=p.gpsShowDate; if(p.distDecimals!=null) distDecimals=p.distDecimals; if(p.distShowElev!=null) distShowElev=p.distShowElev; if(p.distOdoMode!=null) distOdoMode=p.distOdoMode; if(p.odoScale!=null) odoScale=p.odoScale; if(p.odoScale2!=null) odoScale2=p.odoScale2; if(p.odoShowBorder!=null) odoShowBorder=p.odoShowBorder; if(p.spdDistGap!=null) window._spdDistGap=p.spdDistGap; if(p.osmMapShape) osmMapShape=p.osmMapShape; if(p.osmShowRoute!=null) osmShowRoute=p.osmShowRoute; if(p.mapBgStyle) mapBgStyle=p.mapBgStyle; if(p.mapRouteColor) mapRouteColor=p.mapRouteColor; if(p.mapDotColor) mapDotColor=p.mapDotColor; if(p.mapShowNorth!=null) mapShowNorth=p.mapShowNorth; if(p.coordFmt) coordFmt=p.coordFmt; if(p.coordShowIcon!=null) coordShowIcon=p.coordShowIcon; if(p.fpsVal!=null) fpsVal=p.fpsVal; if(p.bitrateVal!=null) bitrateVal=p.bitrateVal; if(p.renderFmt) renderFmt=p.renderFmt; if(p.renderRes) renderRes=p.renderRes; if(p.gforceScale!=null) window._gforceScale=p.gforceScale; if(p.compassStyle) window._compassStyle=p.compassStyle; Object.keys(opts).forEach(key=>{ const tog=document.getElementById('tog-'+key); if(tog) tog.classList.toggle('on',opts[key]); const card=document.getElementById('oc-'+key); if(card) card.classList.toggle('off',!opts[key]); }); if(p.canvasOrient){ canvasOrient=p.canvasOrient; const ob=document.getElementById('orient-'+canvasOrient); if(ob) ob.click(); } if(gpxData) drawFrame(curFrame); notif('✓ Preset loaded'); }catch(err){ notif('Load error: '+err.message,'#ff5c5c'); } }
function toggleFullscreen(){ const pc=document.getElementById('centerPanel'); if(!document.fullscreenElement&&!document.webkitFullscreenElement){ const fn=pc.requestFullscreen||pc.webkitRequestFullscreen||pc.mozRequestFullScreen; if(fn) fn.call(pc); document.getElementById('btnFullscreen').textContent='✕ Exit'; } else { const fn=document.exitFullscreen||document.webkitExitFullscreen||document.mozCancelFullScreen; if(fn) fn.call(document); document.getElementById('btnFullscreen').textContent='⛶'; } }
document.addEventListener('keydown',e=>{ if((e.key==='f'||e.key==='F')&&document.activeElement.tagName!=='INPUT') toggleFullscreen(); });
document.addEventListener('fullscreenchange',()=>{ if(!document.fullscreenElement){ const b=document.getElementById('btnFullscreen'); if(b) b.textContent='⛶'; } });
function setSpdGap(v){ window._spdDistGap=parseInt(v); document.getElementById('spdGapVal').textContent=v+'px'; drawFrame(curFrame); }
function setOdoScale(v){ odoScale=parseInt(v)/100; document.getElementById('odoScaleVal').textContent=odoScale.toFixed(1)+'×'; drawFrame(curFrame); }
function toggleDistElev(row){ distShowElev=!distShowElev; const tog=document.getElementById('tog-distelev'); if(tog)tog.classList.toggle('on',distShowElev); drawFrame(curFrame); }
function toggleGlobalBg(row){ showOverlayBg=!showOverlayBg; document.getElementById('tog-global-bg')?.classList.toggle('on',showOverlayBg); Object.keys(overlayBg).forEach(k=>delete overlayBg[k]); document.querySelectorAll('[id^="tog-bg-"]').forEach(el=>el.classList.toggle('on',showOverlayBg)); drawFrame(curFrame); }
function toggleOverlayBg(key,row){ const cur=overlayBg[key]!==undefined?overlayBg[key]:showOverlayBg; overlayBg[key]=!cur; document.getElementById('tog-bg-'+key)?.classList.toggle('on',overlayBg[key]); drawFrame(curFrame); }
function setOp(v){ panelOp=parseInt(v)/100; document.getElementById('opVal').textContent=v+'%'; drawFrame(curFrame); }
function confirmDialog(title, msg, onConfirm){ const bd=document.createElement('div'); bd.className='confirm-backdrop'; bd.innerHTML=`<div class="confirm-box"><div class="confirm-title">${title}</div><div class="confirm-msg">${msg}</div><div class="confirm-btns"><button class="bs" onclick="this.closest('.confirm-backdrop').remove()">Cancel</button><button class="bp" id="confirm-ok" style="padding:7px 18px">Confirm</button></div></div>`; document.body.appendChild(bd); bd.querySelector('#confirm-ok').onclick=()=>{ bd.remove(); onConfirm(); }; bd.addEventListener('click',e=>{ if(e.target===bd)bd.remove(); }); }
function resetDefaults(){ confirmDialog('Reset to Default','Reset all overlay positions, sizes and settings to default? GPX data will not be affected.',()=>{ Object.assign(opts,{speed:true,map:true,info:false,arc:false,prog:false,elev:false, gpstime:true,distov:false,coords:true,gforce:false,compass:false,grade:false,roadname:false}); Object.assign(oPos,{speed:'bl',map:'tr',info:'br',arc:'tl',elev:'bc', gpstime:'tl',coords:'br',gforce:'bl',compass:'tr',grade:'tc',roadname:'bc'}); Object.keys(oScale).forEach(k=>delete oScale[k]); fontScale=2.2; panelOp=0; textColor='#ffffff'; bgColor='#00b140'; renderRes='1080p'; canvasOrient='landscape'; fpsVal=1; const{W:rW,H:rH}=resWH(); canvas.width=rW; canvas.height=rH; const cwReset=document.getElementById('canvasWrapper');if(cwReset)cwReset.style.aspectRatio='16/9'; ['720p','1080p'].forEach(r=>{const b=document.getElementById('res-'+r);if(b)b.classList.toggle('on',r==='1080p');}); ['landscape','portrait','square'].forEach(o=>{const b=document.getElementById('orient-'+o);if(b)b.classList.toggle('on',o==='landscape');}); speedUnit='kmh'; spdStyle='bar'; spdMaxMode='auto'; spdMaxCustom=0; gpsFmt='hms'; gpsShowDate=false; mapBgStyle='trans'; mapRouteColor='#ffffff'; mapDotColor='#ff3333'; mapShowNorth=false; osmMapShape='none'; osmMapSize='md'; osmZoom=15; osmUseOSM=false; osmStyle='standard'; osmTint='none'; osmBrightness=100; coordFmt='dms'; coordShowIcon=true; Object.keys(opts).forEach(k=>{ const t=document.getElementById('tog-'+k); if(t)t.classList.toggle('on',!!opts[k]); const card=document.getElementById('oc-'+k); if(card)card.classList.toggle('off',!opts[k]); }); const slSync=[ ['fs-slider','100'],['fs-md','on'],['opVal','0%'], ['bg-green','on'],['unit-kmh','on'],['spd-style-bar','on'], ['spd-max-auto','on'],['tf-hms','on'], ['osm-shape-none','on'],['osm-style-standard','on'],['osm-tint-none','on'], ['mapbg-trans','on'],['map-mode-simple','on'], ['coord-dms','on'],['gscale-2','on'],['compass-style-rose','on'], ]; slSync.forEach(([id,val])=>{ const el=document.getElementById(id); if(!el)return; if(val==='on') el.classList.add('on'); else el.value=val; }); document.getElementById('tog-gpsdate').classList.remove('on'); 
document.getElementById('tog-mapnorth').classList.remove('on'); // Reset status global overlay BG ke OFF
      showOverlayBg = false;
      document.getElementById('tog-global-bg')?.classList.remove('on');
      document.querySelectorAll('[id^="tog-bg-"]').forEach(el => el.classList.remove('on')); 
	  document.querySelectorAll('.sw').forEach(s=>s.classList.remove('on')); 
	  document.querySelector('.sw[style*="#fff"]')?.classList.add('on'); 
	  document.getElementById('canvasWrapper').style.background=bgColor; (function(){ const{W,H}=resWH(); canvas.width=W; canvas.height=H; })(); 
	  document.getElementById('opVal').textContent='0%'; 
	  document.getElementById('fsVal').textContent='2.20×'; 
	  document.getElementById('fs-slider').value=220; 
	  document.querySelectorAll('.chip').forEach(b=>{ const oc=b.getAttribute('onclick'); if(oc&&oc.startsWith('setFS(')){ b.classList.toggle('on', oc==="setFS('xxl',this)"); } }); if(window._dragHandle)window._dragHandle.updateHandles(); if(gpxData)drawFrame(curFrame); notif('Reset to default settings'); }); }
function clearGPX(){ confirmDialog('Clear GPX','Remove the current GPX file and return to the start screen?',()=>{ gpxData=null; curFrame=0; tfS0=0; tfE0=0; playing=false; cancelAnimationFrame(rafId); document.getElementById('btnPlay').textContent='▶'; document.getElementById('statsSection').style.display='none'; document.getElementById('fmtSection').style.display='none'; document.getElementById('rightPanel').style.display='none'; document.getElementById('tfSection').style.display='none'; document.getElementById('playbar').classList.remove('vis'); document.getElementById('vsb').classList.remove('vis'); document.getElementById('emptyState').style.display='flex'; document.getElementById('btnRender').disabled=true; document.getElementById('btnDownload').style.display='none'; document.getElementById('rpWrap').classList.remove('vis'); const dz2=document.getElementById('dropZone'); dz2.classList.remove('loaded'); dz2.querySelector('.drop-title').textContent='Drop .gpx file here'; dz2.querySelector('.drop-sub').textContent='or click to browse'; document.getElementById('fileInput').value=''; const{W,H}=resWH(); ctx.clearRect(0,0,W,H); ctx.fillStyle=bgColor; ctx.fillRect(0,0,W,H); osmTileCache.clear(); vecCache.clear(); if(window._dragHandle)window._dragHandle.updateHandles(); notif('GPX cleared'); }); }

// ═══════════════════════════════════════════════════════════
// MAP UI CONTROLS (BULLETPROOF VERSION)
// ═══════════════════════════════════════════════════════════
function setMapMode(mode, el){ osmUseOSM = (mode === 'osm'); if(el && el.closest('.chips')) { el.closest('.chips').querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); } drawFrame(curFrame); }
function setMapBg(style, el){ mapBgStyle = style; if(el && el.closest('.chips')) { el.closest('.chips').querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); } drawFrame(curFrame); }
function setMapShape(shape, el){ osmMapShape = shape; if(el && el.closest('.chips')) { el.closest('.chips').querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); } drawFrame(curFrame); }
function setMapSize(sz, el){ osmMapSize = sz; if(el && el.closest('.chips')) { el.closest('.chips').querySelectorAll('.chip').forEach(b=>b.classList.remove('on')); el.classList.add('on'); } drawFrame(curFrame); }
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
ctx.fillStyle = bgColor; // bgColor mengambil nilai '#00b140' dari state.js
ctx.fillRect(0, 0, _initW, _initH);

function toggleExportTrans(row){
  exportTransparent = !exportTransparent;
  const tog = document.getElementById('tog-export-trans');
  if(tog) tog.classList.toggle('on', exportTransparent);
}