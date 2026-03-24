// ═══════════════════════════════════════════════════════════
// DRAG-TO-POSITION SYSTEM
// ═══════════════════════════════════════════════════════════
const oScale = {};

function getOverlayBounds(key){
  const{W,H}=resWH();
  const fs=fontScale*(oScale[key]||1);
  let w=100, h=60;

  switch(key){

    case 'speed': {
      if(spdStyle==='gauge'){
        // gauge: full circle
        const R=Math.round(110*fs); const sz=R*2+Math.round(20*fs);
        const stripH=opts.distov?Math.round(28*fs):0;
        w=sz; h=sz+stripH;
      } else if(spdStyle==='bar'){
        // bar = arc gaugeR32
        const gaugeR=Math.round(32*fs); const gcyPad=Math.round(8*fs); const topPad=Math.round(8*fs);
        const panH=topPad+gaugeR*2+gcyPad;
        const panW=Math.round(gaugeR*2+108*fs);
        const gap=Math.round((window._spdDistGap||4)*fs);
        const odoDigH=Math.round(18*fs*odoScale);
        const distRowH=opts.distov?Math.max(odoDigH+Math.round(10*fs),Math.round(28*fs)):0;
        w=panW; h=panH+(opts.distov?gap+distRowH:0);
      } else if(spdStyle==='hud'){
        // hud: arc gaugeR28
        const gaugeR=Math.round(28*fs); const gcyPadH=Math.round(5*fs);
        const panH=Math.round(gaugeR*2+12*fs+gcyPadH);
        const panW=Math.round(gaugeR*2+90*fs);
        const odoHH=distOdoMode?Math.round(16*fs*odoScale)+Math.round(8*fs):0;
        const distH=opts.distov?(distOdoMode?Math.max(Math.round(22*fs),odoHH):Math.round(22*fs)):0;
        w=panW; h=panH+distH;
      } else if(spdStyle==='vbar'){
        // vertical bar
        const barW=Math.round(18*fs), barH=Math.round(140*fs);
        const distH=opts.distov?Math.round(26*fs):0;
        w=Math.round(barW+80*fs); h=barH+Math.round(16*fs)+distH;
      } else if(spdStyle==='hbar'){
        const barH=Math.round(12*fs), barW=Math.round(180*fs);
        const distH=opts.distov?Math.round(26*fs):0;
        w=barW+Math.round(16*fs); h=Math.round(barH+68*fs)+distH;
      } else if(spdStyle==='donut'){
        const R=Math.round(62*fs); const sz=R*2+Math.round(16*fs);
        const stripH=opts.distov?Math.round(28*fs):0;
        w=sz; h=sz+stripH;
      } else if(spdStyle==='segmented'){
        const R=Math.round(60*fs); const sz=R*2+Math.round(16*fs);
        const stripH=opts.distov?Math.round(28*fs):0;
        w=sz; h=sz+stripH;
      } else if(spdStyle==='neon'){
        const R=Math.round(58*fs); const sz=R*2+Math.round(20*fs);
        const stripH=opts.distov?Math.round(28*fs):0;
        w=sz; h=sz+stripH;
      } else if(spdStyle==='revled'){
        const nLed=16; const ledW=Math.round(14*fs); const ledGap=Math.round(3*fs);
        const stripW=nLed*(ledW+ledGap)-ledGap;
        const distH=opts.distov?Math.round(26*fs):0;
        w=stripW+Math.round(16*fs); h=Math.round(26*fs+52*fs)+distH;
      } else if(spdStyle==='minihud'){
        const numF=Math.round(44*fs); const lblF=Math.round(9*fs);
        const distH=opts.distov?Math.round(22*fs):0;
        w=Math.round(160*fs); h=Math.round(numF+lblF*2+18*fs)+distH;
      } else if(spdStyle==='digital'){
        const numF=Math.round(52*fs); const lblF=Math.round(9*fs);
        const distH=opts.distov?Math.round(22*fs):0;
        w=Math.round(180*fs); h=Math.round(numF+lblF+22*fs)+distH;
      } else {
        const gaugeR=Math.round(32*fs); const gcyPad=Math.round(8*fs); const topPad=Math.round(8*fs);
        w=Math.round(gaugeR*2+108*fs); h=topPad+gaugeR*2+gcyPad;
      }
      break;
    }

    case 'map': {
      const mS=Math.round(osmMapPxSize()*fs);
      w=mS; h=mS;
      break;
    }

    case 'info': {
      const iStyle=window._infoStyle||'list';
      if(iStyle==='hrow'){ w=Math.round(360*fs); h=Math.round(48*fs); }
      else if(iStyle==='stacked'){ w=Math.round(248*fs); h=Math.round(96*fs); }
      else { w=Math.round(210*fs); h=Math.round(118*fs); }
      break;
    }

    case 'arc': {
      const aStyle=window._arcStyle||'ring';
      if(aStyle==='hbar'){ w=Math.round(200*fs); h=Math.round(38*fs); }
      else if(aStyle==='steps'){ const nS=10; const dR=Math.round(5*fs); const g=Math.round(8*fs); w=nS*(dR*2+g)-g+Math.round(16*fs); h=dR*2+Math.round(20*fs); }
      else { w=Math.round(108*fs); h=Math.round(108*fs); }
      break;
    }

    case 'gpstime': {
      const tStyle=window._gpsTimeStyle||'standard';
      const _mc=document.createElement('canvas').getContext('2d');
      if(tStyle==='minimal'){
        const bigF=Math.round(26*fs); _mc.font=`bold ${bigF}px ${ovFont()}`;
        const tw=_mc.measureText('23:59:59').width;
        w=Math.max(tw+Math.round(16*fs), Math.round(120*fs));
        h=gpsShowDate?Math.round(52*fs):Math.round(36*fs);
      } else if(tStyle==='pill'){
        const bigF=Math.round(22*fs); _mc.font=`bold ${bigF}px ${ovFont()}`;
        const tw=_mc.measureText('23:59:59').width;
        w=Math.round(34*fs)+tw+Math.round(28*fs); h=Math.round(38*fs);
      } else {
        const bigF=Math.round(30*fs); _mc.font=`bold ${bigF}px ${ovFont()}`;
        const tw=_mc.measureText('23:59:59').width;
        w=Math.max(tw+Math.round(28*fs), Math.round(180*fs));
        h=gpsShowDate ? Math.round(58*fs) : Math.round(42*fs);
      }
      break;
    }

    case 'coords': {
      const cStyle=window._coordStyle||'standard';
      if(cStyle==='compact'){
        const lineF=Math.round(11*fs); const pad=Math.round(8*fs); const lineGap=Math.round(3*fs);
        const charW=lineF*0.62;
        const estW=coordFmt==='dms'?Math.round(charW*15):Math.round(charW*11);
        w=estW+pad*2; h=lineF*2+lineGap+pad*2;
      } else if(cStyle==='badge'){
        const lineF=Math.round(12*fs); const pad=Math.round(9*fs); const lblF=Math.round(7*fs);
        const charW=lineF*0.62; const estW=coordFmt==='dms'?Math.round(charW*15):Math.round(charW*11);
        w=lblF*4+estW+pad*2; h=Math.round(26*fs)*2+Math.round(4*fs);
      } else {
        const lineF=Math.round(15*fs); const lineGap=Math.round(4*fs);
        const pad=Math.round(12*fs); const iconW=coordShowIcon?Math.round(26*fs):0;
        const charW=lineF*0.62;
        const estTextW=coordFmt==='dms'?Math.round(charW*15):Math.round(charW*11);
        w=iconW+estTextW+pad*2+(iconW>0?Math.round(6*fs):0);
        h=lineF*2+lineGap+pad*2;
      }
      break;
    }

    case 'elev': {
      w=Math.round(290*fs); h=Math.round(58*fs);
      break;
    }

    case 'distov': {
      w=Math.round(140*fs); h=Math.round(42*fs);
      break;
    }

    case 'gforce': {
      w=Math.round(130*fs); h=Math.round(130*fs);
      break;
    }

    case 'compass': {
      if(window._compassStyle==='bar'){
        w=Math.round(200*fs); h=Math.round(44*fs);
      } else if(window._compassStyle==='arrow'){
        w=Math.round(80*fs); h=Math.round(80*fs);
      } else if(window._compassStyle==='digital'){
        w=Math.round(140*fs); h=Math.round(56*fs);
      } else {
        const R=Math.round(52*fs); const sz2=R*2+Math.round(12*fs);
        w=sz2; h=sz2;
      }
      break;
    }

    case 'grade': {
      const gStyle=window._gradeStyle||'bar';
      if(gStyle==='arc'){
        const R=Math.round(46*fs); w=R*2+Math.round(12*fs); h=Math.round(R+Math.round(30*fs));
      } else if(gStyle==='road'){
        w=Math.round(120*fs); h=Math.round(70*fs);
      } else {
        w=Math.round(140*fs); h=Math.round(52*fs);
      }
      break;
    }


    case 'odometer': {
      const dW=Math.round(12*fs);
      const scaledW=Math.round(dW*odoScale2);
      const dH=Math.round(18*fs);
      const scaledH=Math.round(dH*odoScale2);
      const pad2=Math.round(2*fs);
      const dotW=Math.round(scaledW*0.45);
      const drumsTotalW=3*(scaledW+pad2)+(scaledW+pad2)+dotW+pad2;
      const kmLblW=Math.round(28*fs); const distLblW=Math.round(30*fs);
      w=distLblW+drumsTotalW+kmLblW+Math.round(12*fs);
      h=scaledH+Math.round(14*fs);
      break;
    }

    case 'distance': {
      const dStyle=window._distStyle||'panel';
      if(dStyle==='odo'){
        const dW=Math.round(12*fs); const scaledW=Math.round(dW*odoScale);
        const dH=Math.round(18*fs); const scaledH=Math.round(dH*odoScale);
        const pad2=Math.round(2*fs); const dotW=Math.round(scaledW*0.45);
        const drumsTotalW=3*(scaledW+pad2)+(scaledW+pad2)+dotW+pad2;
        w=Math.round(30*fs)+drumsTotalW+Math.round(28*fs)+Math.round(12*fs);
        h=scaledH+Math.round(14*fs);
      } else {
        w=Math.round(140*fs); h=Math.round(42*fs);
      }
      break;
    }

    case 'altitude': {
      const aStyle=window._altStyle||'panel';
      if(aStyle==='gauge'){
        const R=Math.round(44*fs); const sz=R*2+Math.round(12*fs);
        w=sz; h=sz;
      } else {
        w=Math.round(140*fs); h=Math.round(42*fs);
      }
      break;
    }

    case 'heartrate': {
      w=Math.round(160*fs); h=Math.round(56*fs);
      break;
    }

    case 'cadence': {
      if(window._cadStyle==='ring'){
        const R=Math.round(36*fs); const sz=R*2+Math.round(12*fs);
        w=sz; h=sz+Math.round(14*fs);
      } else { w=Math.round(150*fs); h=Math.round(56*fs); }
      break;
    }

    case 'power': {
      w=Math.round(160*fs); h=Math.round(56*fs);
      break;
    }

    case 'watermark': {
      if(customWatermarkImage){
        // Mirror drawWatermarkOverlay: skala proporsional, tinggi maxH=60*fs
        const img=customWatermarkImage;
        const iw=img.naturalWidth, ih=img.naturalHeight;
        if(iw&&ih){
          const maxH=Math.round(60*fs);
          w=Math.round(iw*(maxH/ih));
          h=maxH;
        } else { w=Math.round(120*fs); h=Math.round(60*fs); }
      } else {
        // Mirror teks "GPXGreenscreen" dengan font Syne 800
        const _mc=document.createElement('canvas').getContext('2d');
        _mc.font=`800 ${Math.round(24*fs)}px 'Syne', sans-serif`;
        if('letterSpacing' in _mc) _mc.letterSpacing=`-${Math.round(0.8*fs)}px`;
        w=Math.ceil(_mc.measureText('GPXGreenscreen').width)+Math.round(4*fs);
        h=Math.round(26*fs);
      }
      break;
    }

    default:
      w=100; h=60;
  }

  const{x:ox,y:oy}=posXY(oPos[key],W,H,w,h);
  return{ox,oy,w,h};
}

function initDragPos(){
  const cw=document.getElementById('canvasWrapper'); const overlay=document.createElement('div'); overlay.id='dragOverlay'; overlay.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:10'; cw.style.position='relative'; cw.appendChild(overlay);
  let activeKey=null, mode=null, startX=0, startY=0, origPos=null, origScale=1, _dragRafPending=false; const HANDLE=10;
  function canvasXY(e){ const r=canvas.getBoundingClientRect(); const{W,H}=resWH(); const scaleX=W/r.width, scaleY=H/r.height; const src=e.touches?e.touches[0]:e; return{x:(src.clientX-r.left)*scaleX, y:(src.clientY-r.top)*scaleY, px:src.clientX-r.left, py:src.clientY-r.top, cssW:r.width, cssH:r.height}; }
  function toCss(cx,cy,cssW,cssH){ const{W,H}=resWH(); return{px:cx/W*cssW, py:cy/H*cssH}; }
  function updateHandles(){
    overlay.innerHTML='';
    if(!activeKey) return;
    // watermark pakai opts.watermark, overlay lain pakai opts[key]
    if(!opts[activeKey]) return;
    const{ox,oy,w,h}=getOverlayBounds(activeKey);
    const r=canvas.getBoundingClientRect();
    const cssW=r.width, cssH=r.height;
    const{W,H}=resWH();
    const x=ox/W*cssW, y=oy/H*cssH;
    const bw=w/W*cssW, bh=h/H*cssH;
    const hh=HANDLE;
    const box=document.createElement('div');
    box.style.cssText=`position:absolute;left:${x}px;top:${y}px;width:${bw}px;height:${bh}px;border:1.5px dashed rgba(74,240,160,0.8);box-sizing:border-box;pointer-events:auto;cursor:grab`;
    box.dataset.mode='move';
    overlay.appendChild(box);
    const corners=[
      {mode:'resize-nw',left:x-hh/2,top:y-hh/2},
      {mode:'resize-ne',left:x+bw-hh/2,top:y-hh/2},
      {mode:'resize-sw',left:x-hh/2,top:y+bh-hh/2},
      {mode:'resize-se',left:x+bw-hh/2,top:y+bh-hh/2}
    ];
    corners.forEach(({mode:m,left,top})=>{
      const hEl=document.createElement('div');
      hEl.style.cssText=`position:absolute;left:${left}px;top:${top}px;width:${hh}px;height:${hh}px;background:#4af0a0;border:1.5px solid #fff;border-radius:2px;pointer-events:auto;cursor:${m==='resize-se'||m==='resize-nw'?'nwse-resize':'nesw-resize'};box-shadow:0 0 4px rgba(0,0,0,0.5)`;
      hEl.dataset.mode=m;
      overlay.appendChild(hEl);
    });
  }
  function hitTest(cx,cy){
    if(!gpxData) return null;
    // Semua overlay yang valid — termasuk watermark yang tidak ada di opts
    const ALL_KEYS = ['speed','map','info','arc','elev','gpstime','coords','gforce',
                      'compass','grade','odometer','distance','altitude','heartrate','cadence','power','watermark'];
    const hits = [];
    for(const key of ALL_KEYS){
      // watermark selalu aktif jika opts.watermark, overlay lain cek opts[key]
      if(!opts[key]) continue;
      const{ox,oy,w,h}=getOverlayBounds(key);
      if(cx>=ox && cx<=ox+w && cy>=oy && cy<=oy+h) hits.push(key);
    }
    return hits.pop()||null;
  }
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
    if(!mode||!activeKey)return;
    e.preventDefault();
    const{x,y}=canvasXY(e);
    const dx=x-startX, dy=y-startY;
    if(mode==='move'){
      oPos[activeKey]={x:origPos.x+dx, y:origPos.y+dy};
    } else {
      let delta=0;
      if(mode==='resize-se') delta=(dx+dy)/2;
      else if(mode==='resize-sw') delta=(-dx+dy)/2;
      else if(mode==='resize-ne') delta=(dx-dy)/2;
      else if(mode==='resize-nw') delta=(-dx-dy)/2;
      const{W}=resWH();
      oScale[activeKey]=Math.max(0.1, origScale+(delta/W)*3);
    }
    // Update handle langsung (tidak tunggu drawFrame)
    updateHandles();
    // Draw canvas via rAF agar tidak block handle update
    if(!_dragRafPending){
      _dragRafPending=true;
      requestAnimationFrame(()=>{ _dragRafPending=false; drawFrame(curFrame); });
    }
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