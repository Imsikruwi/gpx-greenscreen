// ═══════════════════════════════════════════════════════════
// DRAG-TO-POSITION SYSTEM
// ═══════════════════════════════════════════════════════════
const oScale = {};

function getOverlayBounds(key){
  const{W,H}=resWH(); const fs=fontScale*(oScale[key]||1);
  const sizes={ speed:{w:Math.round(260*fs),h:Math.round(100*fs)}, map:{w:Math.round(osmMapPxSize()*fontScale*(oScale[key]||1)*fs/fontScale),h:Math.round(osmMapPxSize()*fontScale*(oScale[key]||1)*fs/fontScale)}, info:{w:Math.round(210*fs),h:Math.round(118*fs)}, gpstime:{w:Math.round(200*fs),h:Math.round(58*fs)}, coords:{w:Math.round(200*fs),h:Math.round(44*fs)}, arc:{w:Math.round(108*fs),h:Math.round(108*fs)}, elev:{w:Math.round(310*fs),h:Math.round(74*fs)}, distov:{w:Math.round(140*fs),h:Math.round(42*fs)}, gforce:{w:Math.round(130*fs),h:Math.round(130*fs)}, compass:{w:Math.round(116*fs),h:Math.round(116*fs)}, grade:{w:Math.round(140*fs),h:Math.round(52*fs)}, roadname:{w:Math.round(200*fs),h:Math.round(34*fs)}, heartrate:{w:Math.round(160*fs),h:Math.round(56*fs)}, cadence:{w:Math.round(150*fs),h:Math.round(56*fs)}, power:{w:Math.round(160*fs),h:Math.round(56*fs)}, odometer:{w:Math.round(200*fs),h:Math.round(44*fs)},watermark:{w:Math.round(210*fs),h:Math.round(28*fs)} };
  const{w,h}=sizes[key]||{w:100,h:60}; const{x:ox,y:oy}=posXY(oPos[key],W,H,w,h); return{ox,oy,w,h};
}

function initDragPos(){
  const cw=document.getElementById('canvasWrapper'); const overlay=document.createElement('div'); overlay.id='dragOverlay'; overlay.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:10'; cw.style.position='relative'; cw.appendChild(overlay);
  let activeKey=null, mode=null, startX=0, startY=0, origPos=null, origScale=1; const HANDLE=10;
  function canvasXY(e){ const r=canvas.getBoundingClientRect(); const{W,H}=resWH(); const scaleX=W/r.width, scaleY=H/r.height; const src=e.touches?e.touches[0]:e; return{x:(src.clientX-r.left)*scaleX, y:(src.clientY-r.top)*scaleY, px:src.clientX-r.left, py:src.clientY-r.top, cssW:r.width, cssH:r.height}; }
  function toCss(cx,cy,cssW,cssH){ const{W,H}=resWH(); return{px:cx/W*cssW, py:cy/H*cssH}; }
  function updateHandles(){
    overlay.innerHTML=''; if(!activeKey||!opts[activeKey])return;
    const{ox,oy,w,h}=getOverlayBounds(activeKey); const r=canvas.getBoundingClientRect(); const cssW=r.width, cssH=r.height; const{W,H}=resWH(); const x=ox/W*cssW, y=oy/H*cssH; const bw=w/W*cssW, bh=h/H*cssH; const hh=HANDLE;
    const box=document.createElement('div'); box.style.cssText=`position:absolute;left:${x}px;top:${y}px;width:${bw}px;height:${bh}px;border:1.5px dashed rgba(74,240,160,0.8);box-sizing:border-box;pointer-events:auto;cursor:grab`; box.dataset.mode='move'; overlay.appendChild(box);
    const corners=[ {mode:'resize-nw',left:x-hh/2,top:y-hh/2}, {mode:'resize-ne',left:x+bw-hh/2,top:y-hh/2}, {mode:'resize-sw',left:x-hh/2,top:y+bh-hh/2}, {mode:'resize-se',left:x+bw-hh/2,top:y+bh-hh/2} ];
    corners.forEach(({mode:m,left,top})=>{ const h=document.createElement('div'); h.style.cssText=`position:absolute;left:${left}px;top:${top}px;width:${hh}px;height:${hh}px;background:#4af0a0;border:1.5px solid #fff;border-radius:2px;pointer-events:auto;cursor:${m==='resize-se'||m==='resize-nw'?'nwse-resize':'nesw-resize'};box-shadow:0 0 4px rgba(0,0,0,0.5)`; h.dataset.mode=m; overlay.appendChild(h); });
  }
  function hitTest(cx,cy){ if(!gpxData)return null; const hits=[]; for(const key of Object.keys(oScale).concat(Object.keys(oPos))){ if(!opts[key])continue; const{ox,oy,w,h}=getOverlayBounds(key); if(cx>=ox&&cx<=ox+w&&cy>=oy&&cy<=oy+h) hits.push(key); } return[...new Set(hits)].pop()||null; }
  canvas.style.pointerEvents='auto';
  cw.addEventListener('mousedown',e=>{
    if(isRendering)return; if(e.target!==canvas)return; const{x,y}=canvasXY(e); const key=hitTest(x,y); activeKey=key;
    if(key){ mode='move'; startX=x; startY=y; const{ox,oy}=getOverlayBounds(key); origPos=typeof oPos[key]==='object'?{...oPos[key]}:{x:ox,y:oy}; e.preventDefault(); }
    updateHandles();
  });
  overlay.addEventListener('mousedown',e=>{
    if(isRendering||!activeKey)return; mode=e.target.dataset.mode; if(!mode)return; e.preventDefault(); e.stopPropagation();
    const{x,y,px,py}=canvasXY(e); startX=x; startY=y; origScale=oScale[activeKey]||1; const{ox,oy}=getOverlayBounds(activeKey); origPos=typeof oPos[activeKey]==='object'?{...oPos[activeKey]}:{x:ox,y:oy};
  });
  document.addEventListener('mousemove',e=>{
    if(!mode||!activeKey)return; e.preventDefault(); const{x,y}=canvasXY(e); const dx=x-startX, dy=y-startY;
    if(mode==='move'){ oPos[activeKey]={x:origPos.x+dx, y:origPos.y+dy}; } 
    else { const{w:origW,h:origH}=getOverlayBounds(activeKey); let delta=0; if(mode==='resize-se') delta=(dx+dy)/2; else if(mode==='resize-sw') delta=(-dx+dy)/2; else if(mode==='resize-ne') delta=(dx-dy)/2; else if(mode==='resize-nw') delta=(-dx-dy)/2; const{W}=resWH(); const newScale=Math.max(0.1, origScale+(delta/W)*3); oScale[activeKey]=newScale; }
    drawFrame(curFrame); updateHandles();
  });
  function endDrag(){ if(mode){ mode=null; updateHandles(); } } document.addEventListener('mouseup',endDrag);
  cw.addEventListener('mousedown',e=>{ if(e.target===canvas){ const{x,y}=canvasXY(e); if(!hitTest(x,y)){ activeKey=null; updateHandles(); } } },true);
  function mkMouseEv(type,touch){ return new MouseEvent(type,{clientX:touch.clientX,clientY:touch.clientY,bubbles:true}); }
  canvas.addEventListener('touchstart',e=>{e.preventDefault();canvas.dispatchEvent(mkMouseEv('mousedown',e.touches[0]));},{passive:false});
  canvas.addEventListener('touchmove',e=>{e.preventDefault();document.dispatchEvent(mkMouseEv('mousemove',e.touches[0]));},{passive:false});
  canvas.addEventListener('touchend',e=>{document.dispatchEvent(new MouseEvent('mouseup'));},{passive:false});
  window.addEventListener('resize',updateHandles);
  return{updateHandles};
}