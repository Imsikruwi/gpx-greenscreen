// ═══════════════════════════════════════════════════════════
// OVERLAY DRAWING MODULE (REVISED WITH LOW SPEED CUTOFF)
// ═══════════════════════════════════════════════════════════

// Helper untuk mengecek apakah background sedang menyala.
function checkBg(key) {
  if(overlayBg[key] !== undefined) return overlayBg[key];
  return showOverlayBg;
}

// HR Zone color berdasarkan % max BPM
function hrZoneColor(hr){
  if(hr==null||isNaN(hr)) return textColor;
  const pct=hr/(hrMaxBpm||190);
  if(pct<0.60) return '#4a9ef0';
  if(pct<0.70) return '#4af0a0';
  if(pct<0.80) return '#f0d04a';
  if(pct<0.90) return '#f0a04a';
  return '#ff4444';
}

// Hitung threshold spdProg (0-1) untuk kuning dan merah
function dialThresholds(maxSpd_ms){
  if(dialInputMode==='speed'){
    return {
      yellow: maxSpd_ms>0 ? Math.min(1, dialYellowMs/maxSpd_ms) : 0.6,
      red:    maxSpd_ms>0 ? Math.min(1, dialRedMs/maxSpd_ms)    : 0.85,
    };
  }
  return { yellow: dialYellowPct/100, red: dialRedPct/100 };
}

// Warna arc berdasarkan posisi prog vs threshold
function dialArcSolidColor(prog, maxSpd_ms){
  if(!dialMode) return null;
  const t = dialThresholds(maxSpd_ms);
  if(prog >= t.red)    return '#ff3a2a';
  if(prog >= t.yellow) return '#f0a020';
  return null;
}

// Base function to draw scrolling Odometer digits
function drawOdometer(c, value, decimals, x, y, digitW, digitH, fs, textColor, bgAlpha, scale=1){
  digitW=Math.round(digitW*scale); digitH=Math.round(digitH*scale);
  const ODO_DEC = 1, SCROLL_ZONE = 0.5, odoBase = Math.pow(10, ODO_DEC); const sv = value * odoBase;
  const stableInt = Math.max(0, Math.floor(value)); const intDigits = Math.max(1, String(stableInt).length); const totalDigits = intDigits + ODO_DEC;
  const cols = [];
  for(let i=0; i<totalDigits; i++){ const posFromRight = totalDigits - 1 - i; const colVal = sv / Math.pow(10, posFromRight); cols.push({ posFromRight, digit: Math.floor(colVal) % 10, frac: colVal % 1 }); }
  const allChars = [];
  for(let i=0; i<totalDigits; i++){ allChars.push(String(cols[i].digit)); if(i === intDigits - 1 && ODO_DEC > 0) allChars.push('.'); }
  const frac0 = cols[totalDigits-1].frac; const scroll0 = frac0 >= SCROLL_ZONE ? (frac0 - SCROLL_ZONE) / (1 - SCROLL_ZONE) : 0;
  const pad = Math.round(2*fs); const r = Math.round(3*fs); let cx = x; let digitIdx = 0;
  for(let ci=0; ci<allChars.length; ci++){
    const ch = allChars[ci];
    if(ch==='.'){ 
      const dotW = Math.round(digitW*0.42); 
      c.save(); c.fillStyle=textColor; c.globalAlpha=0.6; 
      c.beginPath(); c.arc(cx+dotW/2, y+digitH-Math.round(2.5*fs), Math.round(1.5*fs), 0, Math.PI*2); c.fill(); 
      c.globalAlpha=1; c.restore(); 
      cx += dotW + pad; continue; 
    }
    const{posFromRight, digit} = cols[digitIdx];
    let scrollFrac = 0;
    if(posFromRight === 0){ scrollFrac = scroll0; } else { const allRightAre9 = cols.slice(digitIdx+1).every(col => col.digit === 9); scrollFrac = allRightAre9 ? scroll0 : 0; }
    const nextDig = (digit + 1) % 10;
    const ease = scrollFrac < 0.5 ? 2*scrollFrac*scrollFrac : 1 - Math.pow(-2*scrollFrac+2,2)/2;
    const isDecimalDigit = posFromRight < ODO_DEC;
    c.save();
    if(isDecimalDigit){ 
      c.fillStyle = 'rgba(255,255,255,0.95)'; 
    } else { 
      c.fillStyle = 'rgba(0,0,0,0.92)'; 
    }
    c.beginPath(); c.roundRect(cx, y, digitW, digitH, r); c.fill();
    c.beginPath(); c.roundRect(cx, y, digitW, digitH, r); c.clip();
    c.font = `bold ${Math.round(digitH*0.68)}px ${ovFont()}`; c.textAlign='center'; c.textBaseline='middle';
    const digitColor = isDecimalDigit ? '#000000' : textColor;
    if(ease > 0.001){ 
      const off = ease * digitH; 
      c.fillStyle=digitColor; c.globalAlpha = Math.max(0, 1 - ease); c.fillText(String(digit), cx+digitW/2, y+digitH/2 - off); 
      c.fillStyle=digitColor; c.globalAlpha = Math.min(1, ease); c.fillText(String(nextDig), cx+digitW/2, y+digitH/2 + digitH - off); 
    } else { 
      c.fillStyle=digitColor; c.globalAlpha=1; c.fillText(String(digit), cx+digitW/2, y+digitH/2); 
    }
    c.globalAlpha=1; c.strokeStyle='rgba(255,255,255,0.15)'; c.lineWidth=Math.round(fs*0.5);
    c.beginPath(); c.moveTo(cx+2,y); c.lineTo(cx+digitW-2,y); c.stroke(); 
    c.beginPath(); c.moveTo(cx+2,y+digitH); c.lineTo(cx+digitW-2,y+digitH); c.stroke();
    c.restore(); cx += digitW + pad; digitIdx++;
  }
  return cx - x;
}

// ── OVERLAY FUNCTIONS ──

function drawMapOverlay(ctx, pt, points, n, W, H) {
  const fs = ovFS('map'); 
  const bgOn = checkBg('map');
  const mapSizes = { sm:120, md:180, lg:240, xl:320 };
  const mS = Math.round((mapSizes[osmMapSize] || 180) * fs); 
  const {x:mX, y:mY} = posXY(oPos.map, W, H, mS, mS);
  
  const bgMap = { 
    dark:  `rgba(0,0,0,${panelOp})`, 
    light: `rgba(240,240,240,${panelOp})`, 
    trans: `rgba(0,0,0,0)`, 
    navy:  `rgba(10,20,50,${panelOp})`, 
    green: `rgba(14,40,20,${panelOp})` 
  };
  const bgFill = bgMap[mapBgStyle] || bgMap.dark; 
  const hasClip = osmMapShape !== 'none';
  
  ctx.save();
  if(bgOn && mapBgStyle !== 'trans'){ 
    ctx.fillStyle = bgFill; 
    if(osmMapShape === 'circle'){ 
      ctx.beginPath(); ctx.arc(mX+mS/2, mY+mS/2, mS/2, 0, Math.PI*2); ctx.fill(); 
    } else if(osmMapShape === 'hexagon'){
      const hcx=mX+mS/2, hcy=mY+mS/2, hr=mS/2;
      ctx.beginPath();
      for(let i=0;i<6;i++){ const a=Math.PI/6+i*Math.PI/3; i===0?ctx.moveTo(hcx+hr*Math.cos(a),hcy+hr*Math.sin(a)):ctx.lineTo(hcx+hr*Math.cos(a),hcy+hr*Math.sin(a)); }
      ctx.closePath(); ctx.fill();
    } else if(osmMapShape === 'diamond'){
      const dcx=mX+mS/2, dcy=mY+mS/2, dr=mS/2;
      ctx.beginPath(); ctx.moveTo(dcx,dcy-dr); ctx.lineTo(dcx+dr,dcy); ctx.lineTo(dcx,dcy+dr); ctx.lineTo(dcx-dr,dcy); ctx.closePath(); ctx.fill();
    } else { 
      ctx.fillRect(mX, mY, mS, mS); 
    } 
  }
  
  if(hasClip){ 
    ctx.beginPath(); 
    if(osmMapShape === 'circle') ctx.arc(mX+mS/2, mY+mS/2, mS/2, 0, Math.PI*2);
    else if(osmMapShape === 'hexagon'){
      const hcx=mX+mS/2, hcy=mY+mS/2, hr=mS/2;
      for(let i=0;i<6;i++){ const a=Math.PI/6+i*Math.PI/3; i===0?ctx.moveTo(hcx+hr*Math.cos(a),hcy+hr*Math.sin(a)):ctx.lineTo(hcx+hr*Math.cos(a),hcy+hr*Math.sin(a)); }
      ctx.closePath();
    } else if(osmMapShape === 'diamond'){
      const dcx=mX+mS/2, dcy=mY+mS/2, dr=mS/2;
      ctx.moveTo(dcx,dcy-dr); ctx.lineTo(dcx+dr,dcy); ctx.lineTo(dcx,dcy+dr); ctx.lineTo(dcx-dr,dcy); ctx.closePath();
    } else ctx.roundRect(mX, mY, mS, mS, Math.round(8*fs)); 
    ctx.clip(); 
  }
  
  const {minLat, maxLat, minLon, maxLon} = gpxData; 
  const mapPad = 12 * fs; 
  const lR = (maxLat-minLat) || 0.001, nR = (maxLon-minLon) || 0.001;
  const mapSc = Math.min((mS-mapPad*2)/nR, (mS-mapPad*2)/lR); 
  const mapCx = mX+mS/2, mapCy = mY+mS/2;
  
  let originX, originY; 
  const doHeading = osmShowHeading && pt.heading != null && !(playing && playSpeed > 5);
  
  if(doHeading){ 
    originX = mapCx - (pt.lon - minLon) * mapSc; 
    originY = mapCy + (pt.lat - minLat) * mapSc; 
    ctx.translate(mapCx, mapCy); 
    ctx.rotate(-pt.heading * Math.PI / 180); 
    ctx.translate(-mapCx, -mapCy); 
  } else { 
    originX = mX + (mS - nR*mapSc)/2; 
    originY = mY + (mS + lR*mapSc)/2; 
  }
  const toXY = (la,lo) => ({ x: originX + (lo - minLon)*mapSc, y: originY - (la - minLat)*mapSc });
  
  const ghostAlpha = mapGhostColor || (mapBgStyle === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)');
  const step = playing && playSpeed > 2 ? Math.max(1, Math.floor(points.length/200)) : 1;
  
  ctx.beginPath(); 
  ctx.strokeStyle = ghostAlpha; 
  ctx.lineWidth = Math.round(1.5*fs); 
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  let first = true; 
  for(let pi=0; pi<points.length; pi+=step){ 
    const {x,y} = toXY(points[pi].lat, points[pi].lon); 
    first ? ctx.moveTo(x,y) : ctx.lineTo(x,y); 
    first = false; 
  } 
  ctx.stroke();
  
  if(osmShowRoute){
    const step2 = playing && playSpeed > 2 ? Math.max(1, Math.floor((n-tfS0)/150)) : 1;
    ctx.beginPath(); 
    ctx.strokeStyle = mapRouteColor; 
    ctx.lineWidth = Math.round(2.5*fs); 
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    let first2 = true; 
    for(let pi=tfS0; pi<=n; pi+=step2){ 
      const {x,y} = toXY(points[pi].lat, points[pi].lon); 
      first2 ? ctx.moveTo(x,y) : ctx.lineTo(x,y); 
      first2 = false; 
    }
    if(n > tfS0) { const {x,y} = toXY(pt.lat, pt.lon); ctx.lineTo(x,y); } 
    ctx.stroke();
  }
  
  const {x:dcx, y:dcy} = toXY(pt.lat, pt.lon);
  ctx.beginPath(); ctx.arc(dcx, dcy, Math.round(7*fs), 0, Math.PI*2); ctx.fillStyle = mapDotColor+'33'; ctx.fill();
  ctx.beginPath(); ctx.arc(dcx, dcy, Math.round(4*fs), 0, Math.PI*2); ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.round(1.5*fs); ctx.stroke();
  ctx.beginPath(); ctx.arc(dcx, dcy, Math.round(2.5*fs), 0, Math.PI*2); ctx.fillStyle = mapDotColor; ctx.fill();
  ctx.restore();
  
  if(mapShowNorth){
    ctx.save(); 
    const nR = Math.round(9*fs); 
    const nX = mX+mS/2, nY = mY+nR+Math.round(4*fs);
    ctx.beginPath(); ctx.arc(nX, nY, nR, 0, Math.PI*2); ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fill();
    ctx.font = `bold ${Math.round(10*fs)}px ${ovFont()}`; 
    ctx.fillStyle = '#ff4444'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; 
    ctx.fillText('N', nX, nY); 
    ctx.restore();
  }
  
  if(bgOn && hasClip){
    ctx.save(); ctx.beginPath(); 
    if(osmMapShape === 'circle') ctx.arc(mX+mS/2, mY+mS/2, mS/2, 0, Math.PI*2);
    else if(osmMapShape === 'hexagon'){
      const hcx=mX+mS/2, hcy=mY+mS/2, hr=mS/2;
      for(let i=0;i<6;i++){ const a=Math.PI/6+i*Math.PI/3; i===0?ctx.moveTo(hcx+hr*Math.cos(a),hcy+hr*Math.sin(a)):ctx.lineTo(hcx+hr*Math.cos(a),hcy+hr*Math.sin(a)); }
      ctx.closePath();
    } else if(osmMapShape === 'diamond'){
      const dcx=mX+mS/2, dcy=mY+mS/2, dr=mS/2;
      ctx.moveTo(dcx,dcy-dr); ctx.lineTo(dcx+dr,dcy); ctx.lineTo(dcx,dcy+dr); ctx.lineTo(dcx-dr,dcy); ctx.closePath();
    } else ctx.roundRect(mX, mY, mS, mS, Math.round(8*fs));
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = Math.round(1.5*fs); ctx.stroke(); 
    ctx.restore();
  }
}

function drawSpeedOverlay(ctx, pt, n, W, H) {
  const fs=ovFS('speed');
  const bgOn = checkBg('speed');
  
  // --- REVISI: LOW SPEED CUTOFF ---
  // Memaksa kecepatan menjadi 0 jika di bawah 1.1 m/s (sekitar 4 km/jam)
  let spd = pt.speed_ms;
  if (spd < 1.1) {
    spd = 0;
  }
  // --------------------------------
  
  const maxSpd=spdMaxMode==='auto'?gpxData.maxSpeedMs:(spdMaxCustom||gpxData.maxSpeedMs);
  const spdProg=Math.min(1,Math.max(0,cvtSpd(spd)/cvtSpd(maxSpd))); 
  const distKm=((pt.cumDist-gpxData.points[tfS0].cumDist)/1000); 
  const elevStr=Math.round(pt.ele)+' m';
  
  function drawDistStrip(sx,sy,sw){
    if(!opts.distov) return 0;
    const odoSH  = distOdoMode ? Math.round(22*fs*odoScale) + Math.round(10*fs) : 0; const stripH = distOdoMode ? Math.max(Math.round(32*fs), odoSH) : Math.round(28*fs);
    
    if(bgOn){
        ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath(); ctx.roundRect(sx,sy,sw,stripH,Math.round(6*fs)); ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=Math.round(fs*0.5); ctx.beginPath(); ctx.roundRect(sx,sy,sw,stripH,Math.round(6*fs)); ctx.stroke();
    }
    
    if(distOdoMode){
      const digitH=Math.round(22*fs), digitW=Math.round(14*fs); const lfs2=Math.round(8*fs);
      ctx.font=`${lfs2}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.textAlign='left';ctx.textBaseline='middle';ctx.globalAlpha=0.45; ctx.fillText('DIST',sx+Math.round(6*fs),sy+stripH/2); ctx.globalAlpha=1;
      const odoX=sx+Math.round(36*fs), odoY=sy+(stripH-Math.round(digitH*odoScale))/2;
      drawOdometer(ctx,distKm,distDecimals,odoX,odoY,digitW,digitH,fs,textColor,panelOp+0.3,odoScale);
      const dStr=distKm.toFixed(distDecimals); const estW=(dStr.length+1)*(digitW+Math.round(2*fs));
      ctx.font=`${lfs2}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.textAlign='left';ctx.textBaseline='middle';ctx.globalAlpha=0.45; ctx.fillText('km',odoX+estW,sy+stripH/2); ctx.globalAlpha=1;
      if(distShowElev){ const elevStr2=Math.round(pt.ele)+' m'; ctx.font=`${lfs2}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.textAlign='right';ctx.textBaseline='middle';ctx.globalAlpha=0.45; ctx.fillText('ALT '+elevStr2,sx+sw-Math.round(6*fs),sy+stripH/2); ctx.globalAlpha=1; }
    } else {
      const dStr=distKm.toFixed(distDecimals)+' km'; const dfs2=Math.round(14*fs), lfs2=Math.round(9*fs);
      if(distShowElev){
        const halfW=sw/2; 
        if(bgOn){ ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=Math.round(fs*0.5); ctx.beginPath();ctx.moveTo(sx+halfW,sy+5);ctx.lineTo(sx+halfW,sy+stripH-5);ctx.stroke(); }
        function col2(label,val,cx2){ ctx.font=`${lfs2}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.textAlign='center';ctx.textBaseline='top';ctx.globalAlpha=0.45; ctx.fillText(label,cx2,sy+Math.round(3*fs)); ctx.font=`bold ${dfs2}px ${ovFont()}`; ctx.textBaseline='top';ctx.globalAlpha=1; ctx.fillText(val,cx2,sy+Math.round(3*fs)+lfs2+1); }
        col2('DIST',dStr,sx+halfW/2); col2('ALT',elevStr,sx+halfW+halfW/2);
      } else {
        ctx.font=`${lfs2}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.textAlign='left';ctx.textBaseline='top';ctx.globalAlpha=0.45; ctx.fillText('DIST',sx+Math.round(10*fs),sy+Math.round(3*fs));
        ctx.font=`bold ${dfs2}px ${ovFont()}`; ctx.textAlign='right';ctx.textBaseline='top';ctx.globalAlpha=1; ctx.fillText(dStr,sx+sw-Math.round(10*fs),sy+Math.round(3*fs));
      }
    }
    return stripH;
  }

  if(spdStyle==='gauge'){
    const R=Math.round(110*fs); const sz=R*2+Math.round(20*fs); const stripH=opts.distov?Math.round(28*fs):0; const totalH=sz+stripH; const{x:gx0,y:gy0}=posXY(oPos.speed,W,H,sz,totalH); const cx=gx0+sz/2, cy=gy0+sz/2; const startA=Math.PI*(5/6), sweepA=Math.PI*(4/3); const needleA=startA+spdProg*sweepA;
    ctx.save(); 
    if(bgOn){
        ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2); ctx.fillStyle=`rgba(0,0,0,${panelOp})`;ctx.fill();
        ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2); ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=Math.round(3*fs);ctx.stroke();
    }
    for(let t=0;t<=60;t++){ const a=startA+(t/60)*sweepA; const isMaj=t%10===0; ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*(R-Math.round(fs)),cy+Math.sin(a)*(R-Math.round(fs))); ctx.lineTo(cx+Math.cos(a)*(R-Math.round((isMaj?14:8)*fs)),cy+Math.sin(a)*(R-Math.round((isMaj?14:8)*fs))); ctx.strokeStyle=isMaj?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.2)'; ctx.lineWidth=isMaj?Math.round(2*fs):Math.round(fs);ctx.stroke(); }
    const rArc=R-Math.round(22*fs); ctx.beginPath();ctx.arc(cx,cy,rArc,startA,startA+sweepA); ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=Math.round(10*fs);ctx.lineCap='round';ctx.stroke();
    if(spdProg>0.005){
      const _dialCol=dialArcSolidColor(spdProg,maxSpd);
      ctx.beginPath();ctx.arc(cx,cy,rArc,startA,needleA);
      ctx.strokeStyle=_dialCol||textColor;ctx.lineWidth=Math.round(10*fs);ctx.lineCap='round';ctx.stroke();
    }
    ctx.beginPath();ctx.arc(cx,cy,rArc-Math.round(16*fs),0,Math.PI*2); ctx.strokeStyle='rgba(255,255,255,0.07)';ctx.lineWidth=Math.round(1.5*fs);ctx.stroke();
    const ndx=cx+Math.cos(needleA)*rArc, ndy=cy+Math.sin(needleA)*rArc; ctx.beginPath();ctx.arc(ndx,ndy,Math.round(9*fs),0,Math.PI*2);ctx.fillStyle='rgba(255,60,40,0.3)';ctx.fill(); ctx.beginPath();ctx.arc(ndx,ndy,Math.round(5*fs),0,Math.PI*2);ctx.fillStyle='#ff3a2a';ctx.fill(); ctx.beginPath();ctx.arc(ndx,ndy,Math.round(2.5*fs),0,Math.PI*2);ctx.fillStyle=textColor;ctx.fill();
    ctx.font=`bold ${Math.round(58*fs)}px ${ovFont()}`; ctx.textAlign='center';ctx.textBaseline='middle'; ctx.fillStyle=textColor;ctx.shadowColor='rgba(0,0,0,0.5)';ctx.shadowBlur=Math.round(10*fs); ctx.fillText(fmtSpd(spd),cx,cy-Math.round(8*fs));ctx.shadowBlur=0;
    ctx.font=`bold ${Math.round(13*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.globalAlpha=0.65;ctx.textBaseline='top'; ctx.fillText(spdLabel().toUpperCase(),cx,cy+Math.round(32*fs));ctx.globalAlpha=1;
    drawDistStrip(gx0, gy0+sz, sz); ctx.restore();
  } else if(spdStyle==='bar'){
    const gaugeR = Math.round(32*fs); const gcyPad = Math.round(8*fs); const topPad = Math.round(8*fs); const panH = topPad + gaugeR*2 + gcyPad; const panW = Math.round(gaugeR*2 + 108*fs); const gcyRel = topPad + gaugeR;   
    const gap = Math.round((window._spdDistGap||4)*fs); const odoDigH = Math.round(18*fs*odoScale); const distRowH = opts.distov ? Math.max(odoDigH + Math.round(10*fs), Math.round(28*fs)) : 0; const totalH = panH + (opts.distov ? gap + distRowH : 0); const{x:px,y:py}=posXY(oPos.speed,W,H,panW,totalH);
    ctx.save(); 
    if(bgOn){
        ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath();ctx.roundRect(px,py,panW,panH,Math.round(8*fs));ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=Math.round(fs*0.7); ctx.beginPath();ctx.roundRect(px,py,panW,panH,Math.round(8*fs));ctx.stroke();
    }
    const gcx=px+gaugeR+Math.round(10*fs), gcy=py+gcyRel; const sweepStart=Math.PI*(5/6), sweepEnd=Math.PI*(5/6+4/3), sweepRange=sweepEnd-sweepStart; const needleA=sweepStart+spdProg*sweepRange;
    for(let t=0;t<=32;t++){ const a=sweepStart+(t/32)*sweepRange; const isMaj=t%8===0, isMed=t%4===0; const r2=gaugeR-(isMaj?Math.round(8*fs):isMed?Math.round(5*fs):Math.round(3*fs)); ctx.beginPath(); ctx.moveTo(gcx+Math.cos(a)*gaugeR,gcy+Math.sin(a)*gaugeR); ctx.lineTo(gcx+Math.cos(a)*r2,gcy+Math.sin(a)*r2); ctx.strokeStyle=isMaj?'rgba(255,255,255,0.7)':isMed?'rgba(255,255,255,0.35)':'rgba(255,255,255,0.15)'; ctx.lineWidth=isMaj?Math.round(1.8*fs):Math.round(0.8*fs);ctx.stroke(); }
    const rArc=gaugeR-Math.round(11*fs); ctx.beginPath();ctx.arc(gcx,gcy,rArc,sweepStart,sweepEnd); ctx.strokeStyle='rgba(255,255,255,0.07)';ctx.lineWidth=Math.round(4*fs);ctx.lineCap='butt';ctx.stroke();
    if(spdProg>0.005){
      const _dialCol2=dialArcSolidColor(spdProg,maxSpd);
      ctx.beginPath();ctx.arc(gcx,gcy,rArc,sweepStart,needleA);
      ctx.strokeStyle=_dialCol2||'rgba(255,255,255,0.4)';ctx.lineWidth=Math.round(4*fs);ctx.lineCap='butt';ctx.stroke();
    }
    ctx.save();ctx.translate(gcx,gcy);ctx.rotate(needleA); ctx.shadowColor='rgba(255,255,255,0.3)';ctx.shadowBlur=Math.round(4*fs); ctx.beginPath();ctx.moveTo(-Math.round(5*fs),0);ctx.lineTo(gaugeR-Math.round(6*fs),0); ctx.strokeStyle=textColor;ctx.lineWidth=Math.round(1.8*fs);ctx.lineCap='round';ctx.stroke(); ctx.shadowBlur=0;ctx.restore();
    ctx.beginPath();ctx.arc(gcx,gcy,Math.round(5*fs),0,Math.PI*2);ctx.fillStyle=`rgba(0,0,0,0.9)`;ctx.fill(); ctx.beginPath();ctx.arc(gcx,gcy,Math.round(3*fs),0,Math.PI*2);ctx.fillStyle=textColor;ctx.fill(); ctx.beginPath();ctx.arc(gcx,gcy,Math.round(1.5*fs),0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fill();
    const maxV=Math.round(cvtSpd(maxSpd)); const labelStep=maxV<=80?20:maxV<=160?40:maxV<=240?60:80; ctx.font=`${Math.round(7*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.35)';ctx.textAlign='center';ctx.textBaseline='middle';
    for(let v=0;v<=maxV;v+=labelStep){ const a=sweepStart+(v/maxV)*sweepRange; ctx.fillText(String(v),gcx+Math.cos(a)*(gaugeR-Math.round(18*fs)),gcy+Math.sin(a)*(gaugeR-Math.round(18*fs))); }
    const txtX=px+gaugeR*2+Math.round(16*fs); ctx.font=`${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.globalAlpha=0.5;ctx.textAlign='left';ctx.textBaseline='top'; ctx.fillText('SPEED',txtX,py+Math.round(7*fs));ctx.globalAlpha=1;
    ctx.font=`bold ${Math.round(30*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.textBaseline='top'; const numStr=fmtSpd(spd); ctx.fillText(numStr,txtX,py+Math.round(17*fs)); const numWd=ctx.measureText(numStr).width;
    ctx.font=`bold ${Math.round(12*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.globalAlpha=0.65;ctx.textBaseline='bottom'; ctx.fillText(' '+spdLabel().toUpperCase(),txtX+numWd,py+Math.round(17*fs)+Math.round(30*fs)); ctx.globalAlpha=1;
    if(opts.distov){
      const dY=py+panH+gap; const dH=distRowH; const dStr2=distKm.toFixed(distDecimals)+' km'; const dfs2=Math.round(13*fs), lfs2=Math.round(9*fs);
      if(bgOn){
          ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath();ctx.roundRect(px,dY,panW,dH,Math.round(6*fs));ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=Math.round(fs*0.5); ctx.beginPath();ctx.roundRect(px,dY,panW,dH,Math.round(6*fs));ctx.stroke();
      }
      if(distOdoMode){
        const dW=Math.round(12*fs), dH2=Math.round(18*fs); const odoY2=dY+(dH-odoDigH)/2;
        ctx.font=`${lfs2}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.textAlign='left';ctx.textBaseline='middle';ctx.globalAlpha=0.45; ctx.fillText('DIST',px+Math.round(8*fs),dY+dH/2);ctx.globalAlpha=1;
        const odoX2=px+Math.round(34*fs); drawOdometer(ctx,distKm,distDecimals,odoX2,odoY2,dW,dH2,fs,textColor,panelOp+0.3,odoScale);
        const estW2=(distKm.toFixed(1).length+1)*(Math.round(dW*odoScale)+Math.round(2*fs)); ctx.font=`${lfs2}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.textAlign='left';ctx.textBaseline='middle';ctx.globalAlpha=0.45; ctx.fillText('km',odoX2+estW2,dY+dH/2);ctx.globalAlpha=1;
      } else if(distShowElev){
        const hw=panW/2; 
        if(bgOn){ ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=Math.round(fs*0.5); ctx.beginPath();ctx.moveTo(px+hw,dY+4);ctx.lineTo(px+hw,dY+dH-4);ctx.stroke(); }
        function drowB(lbl,val,cx2){ ctx.font=`${lfs2}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.textAlign='center';ctx.textBaseline='middle';ctx.globalAlpha=0.45; ctx.fillText(lbl,cx2,dY+dH*0.25); ctx.font=`bold ${dfs2}px ${ovFont()}`; ctx.textBaseline='middle';ctx.globalAlpha=1; ctx.fillText(val,cx2,dY+dH*0.7); }
        drowB('DIST',dStr2,px+hw/2); drowB('ALT',elevStr,px+hw+hw/2);
      } else { ctx.font=`${lfs2}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.textAlign='left';ctx.textBaseline='middle';ctx.globalAlpha=0.45; ctx.fillText('DIST',px+Math.round(8*fs),dY+dH/2); ctx.font=`bold ${dfs2}px ${ovFont()}`; ctx.textAlign='right';ctx.textBaseline='middle';ctx.globalAlpha=1; ctx.fillText(dStr2,px+panW-Math.round(8*fs),dY+dH/2); }
    }
    ctx.restore();
  } else if(spdStyle==='vbar'){
    const barW=Math.round(18*fs), barH=Math.round(140*fs); const panW=Math.round(barW+80*fs); const distH=opts.distov?Math.round(26*fs):0; const panH=barH+Math.round(16*fs)+distH; const{x:px,y:py}=posXY(oPos.speed,W,H,panW,panH);
    ctx.save(); 
    if(bgOn){
        ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath();ctx.roundRect(px,py,panW,panH,Math.round(8*fs));ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.07)';ctx.lineWidth=Math.round(fs*0.7); ctx.beginPath();ctx.roundRect(px,py,panW,panH,Math.round(8*fs));ctx.stroke();
    }
    const bx=px+Math.round(10*fs), by=py+Math.round(8*fs); ctx.fillStyle='rgba(255,255,255,0.07)'; ctx.beginPath();ctx.roundRect(bx,by,barW,barH,Math.round(barW/2));ctx.fill();
    const fillH=Math.round(spdProg*barH);
    if(fillH>1){ const grad=ctx.createLinearGradient(bx,by+barH,bx,by); grad.addColorStop(0,'rgba(255,255,255,0.9)'); grad.addColorStop(1,'rgba(255,255,255,0.3)'); ctx.fillStyle=grad; ctx.save();ctx.beginPath();ctx.roundRect(bx,by,barW,barH,Math.round(barW/2));ctx.clip(); ctx.fillRect(bx,by+barH-fillH,barW,fillH); ctx.restore(); }
    const nTick=10; for(let t=0;t<=nTick;t++){ const ty=by+barH-(t/nTick)*barH; const isMaj=t%5===0; ctx.strokeStyle=isMaj?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.2)'; ctx.lineWidth=isMaj?Math.round(1.5*fs):Math.round(fs*0.8); ctx.beginPath();ctx.moveTo(bx+barW,ty);ctx.lineTo(bx+barW+Math.round((isMaj?6:3)*fs),ty);ctx.stroke(); if(isMaj){ const v=Math.round(cvtSpd(maxSpd)*(t/nTick)); ctx.font=`${Math.round(7*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.35)';ctx.textAlign='left';ctx.textBaseline='middle'; ctx.fillText(String(v),bx+barW+Math.round(8*fs),ty); } }
    const txtX=bx+barW+Math.round(14*fs); ctx.font=`${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.globalAlpha=0.5;ctx.textAlign='left';ctx.textBaseline='top'; ctx.fillText('SPEED',txtX,py+Math.round(6*fs));ctx.globalAlpha=1;
    ctx.font=`bold ${Math.round(22*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.textBaseline='top'; const numStr=fmtSpd(spd); ctx.fillText(numStr,txtX,py+Math.round(18*fs)); ctx.font=`bold ${Math.round(10*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.globalAlpha=0.65; ctx.fillText(spdLabel().toUpperCase(),txtX,py+Math.round(40*fs)); ctx.globalAlpha=1;
    if(opts.distov){ const dY=py+barH+Math.round(16*fs); const dStr=distKm.toFixed(distDecimals)+' km'; if(bgOn){ ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=Math.round(fs*0.5); ctx.beginPath();ctx.moveTo(px+6,dY);ctx.lineTo(px+panW-6,dY);ctx.stroke(); } ctx.font=`${Math.round(8*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.globalAlpha=0.45;ctx.textAlign='left';ctx.textBaseline='middle'; ctx.fillText('DIST',px+Math.round(8*fs),dY+distH/2); ctx.font=`bold ${Math.round(12*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.globalAlpha=1;ctx.textAlign='right'; ctx.fillText(dStr,px+panW-Math.round(8*fs),dY+distH/2); }
    ctx.restore();
  } else if(spdStyle==='hbar'){
    const barH=Math.round(12*fs), barW=Math.round(180*fs); const panW=barW+Math.round(16*fs); const distH=opts.distov?Math.round(26*fs):0; const panH=Math.round(barH+68*fs)+distH; const{x:px,y:py}=posXY(oPos.speed,W,H,panW,panH);
    ctx.save(); 
    if(bgOn){
        ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath();ctx.roundRect(px,py,panW,panH,Math.round(8*fs));ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.07)';ctx.lineWidth=Math.round(fs*0.7); ctx.beginPath();ctx.roundRect(px,py,panW,panH,Math.round(8*fs));ctx.stroke();
    }
    ctx.font=`${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.globalAlpha=0.5;ctx.textAlign='left';ctx.textBaseline='top'; ctx.fillText('SPEED',px+Math.round(8*fs),py+Math.round(8*fs));ctx.globalAlpha=1; ctx.font=`bold ${Math.round(28*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.textBaseline='top'; const numStr=fmtSpd(spd); ctx.fillText(numStr,px+Math.round(8*fs),py+Math.round(18*fs)); const nw=ctx.measureText(numStr).width; ctx.font=`bold ${Math.round(12*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.globalAlpha=0.65;ctx.textBaseline='bottom'; ctx.fillText(' '+spdLabel().toUpperCase(),px+Math.round(8*fs)+nw,py+Math.round(18*fs)+Math.round(28*fs)); ctx.globalAlpha=1;
    const bx=px+Math.round(8*fs), by=py+Math.round(52*fs); ctx.fillStyle='rgba(255,255,255,0.07)'; ctx.beginPath();ctx.roundRect(bx,by,barW,barH,Math.round(barH/2));ctx.fill(); const fillW=Math.round(spdProg*barW);
    if(fillW>1){ const grad=ctx.createLinearGradient(bx,by,bx+barW,by); grad.addColorStop(0,'rgba(255,255,255,0.5)'); grad.addColorStop(1,'rgba(255,255,255,0.95)'); ctx.fillStyle=grad; ctx.save();ctx.beginPath();ctx.roundRect(bx,by,barW,barH,Math.round(barH/2));ctx.clip(); ctx.fillRect(bx,by,fillW,barH); ctx.restore(); }
    const nTick=10; for(let t=0;t<=nTick;t++){ const tx=bx+(t/nTick)*barW; const isMaj=t%5===0; ctx.strokeStyle=isMaj?'rgba(255,255,255,0.45)':'rgba(255,255,255,0.18)'; ctx.lineWidth=isMaj?Math.round(1.5*fs):Math.round(fs*0.8); ctx.beginPath();ctx.moveTo(tx,by+barH);ctx.lineTo(tx,by+barH+Math.round((isMaj?5:3)*fs));ctx.stroke(); if(isMaj){ const v=Math.round(cvtSpd(maxSpd)*(t/nTick)); ctx.font=`${Math.round(7*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.35)';ctx.textAlign='center';ctx.textBaseline='top'; ctx.fillText(String(v),tx,by+barH+Math.round(6*fs)); } }
    if(opts.distov){ const dY=py+Math.round(barH+68*fs); const dStr=distKm.toFixed(distDecimals)+' km'; if(bgOn){ ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=Math.round(fs*0.5); ctx.beginPath();ctx.moveTo(px+6,dY);ctx.lineTo(px+panW-6,dY);ctx.stroke(); } ctx.font=`${Math.round(8*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.globalAlpha=0.45;ctx.textAlign='left';ctx.textBaseline='middle'; ctx.fillText('DIST',px+Math.round(8*fs),dY+distH/2); ctx.font=`bold ${Math.round(12*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.globalAlpha=1;ctx.textAlign='right'; ctx.fillText(dStr,px+panW-Math.round(8*fs),dY+distH/2); }
    ctx.restore();
  } else if(spdStyle==='donut'){
    const R=Math.round(62*fs); const sz=R*2+Math.round(16*fs); const stripH=opts.distov?Math.round(28*fs):0;
    const totalH=sz+stripH; const{x:gx0,y:gy0}=posXY(oPos.speed,W,H,sz,totalH);
    const cx=gx0+sz/2, cy=gy0+sz/2;
    const startA=Math.PI*(5/6), sweepA=Math.PI*(4/3), endA=startA+sweepA;
    const needleA=startA+spdProg*sweepA;
    const arcW=Math.round(16*fs); const _dialCol=dialArcSolidColor(spdProg,maxSpd);
    ctx.save();
    if(bgOn){ ctx.beginPath();ctx.arc(cx,cy,R+Math.round(4*fs),0,Math.PI*2); ctx.fillStyle=`rgba(0,0,0,${panelOp})`;ctx.fill(); }
    ctx.beginPath(); ctx.arc(cx,cy,R,startA,endA); ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=arcW; ctx.lineCap='round'; ctx.stroke();
    if(spdProg>0.005){
      ctx.beginPath(); ctx.arc(cx,cy,R,startA,needleA);
      ctx.strokeStyle=_dialCol||textColor; ctx.lineWidth=arcW; ctx.lineCap='round'; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(cx,cy,R-arcW/2-Math.round(4*fs),0,Math.PI*2);
    ctx.fillStyle=bgOn?`rgba(0,0,0,${Math.min(0.85,panelOp+0.3)})`:'rgba(0,0,0,0)'; ctx.fill();
    ctx.font=`bold ${Math.round(34*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(fmtSpd(spd), cx, cy-Math.round(4*fs));
    ctx.font=`bold ${Math.round(10*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.6; ctx.textBaseline='top';
    ctx.fillText(spdLabel().toUpperCase(), cx, cy+Math.round(22*fs)); ctx.globalAlpha=1;
    ctx.font=`${Math.round(7*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.textBaseline='middle'; ctx.textAlign='center';
    ctx.fillText('0', cx+Math.cos(startA)*(R+arcW), cy+Math.sin(startA)*(R+arcW));
    ctx.fillText(Math.round(cvtSpd(maxSpd)), cx+Math.cos(endA)*(R+arcW), cy+Math.sin(endA)*(R+arcW));
    drawDistStrip(gx0, gy0+sz, sz); ctx.restore();
  } else if(spdStyle==='segmented'){
    const R=Math.round(60*fs); const sz=R*2+Math.round(16*fs); const stripH=opts.distov?Math.round(28*fs):0;
    const totalH=sz+stripH; const{x:gx0,y:gy0}=posXY(oPos.speed,W,H,sz,totalH);
    const cx=gx0+sz/2, cy=gy0+sz/2;
    const startA=Math.PI*(5/6), sweepA=Math.PI*(4/3);
    const nSeg=24; const segGap=0.04; const arcW=Math.round(12*fs);
    const _dialCol=dialArcSolidColor(spdProg,maxSpd);
    ctx.save();
    if(bgOn){ ctx.beginPath();ctx.arc(cx,cy,R+Math.round(4*fs),0,Math.PI*2); ctx.fillStyle=`rgba(0,0,0,${panelOp})`;ctx.fill(); }
    for(let i=0;i<nSeg;i++){
      const a0=startA+(i/nSeg)*sweepA+segGap;
      const a1=startA+((i+1)/nSeg)*sweepA-segGap;
      const segPct=(i+0.5)/nSeg;
      const isActive=(i+1)/nSeg<=spdProg || (i/nSeg<spdProg && spdProg<(i+1)/nSeg);
      ctx.beginPath();
      if(i/nSeg<spdProg && spdProg<=(i+1)/nSeg){
        const progress=(spdProg-(i/nSeg))*nSeg;
        ctx.arc(cx,cy,R,a0,a0+(a1-a0)*progress);
      } else { ctx.arc(cx,cy,R,a0,a1); }
      if(isActive){
        const thresholds=dialThresholds(maxSpd);
        let segCol=_dialCol||textColor;
        if(dialMode){ segCol=segPct>=thresholds.red?'#ff3a2a':segPct>=thresholds.yellow?'#f0a020':textColor; }
        ctx.strokeStyle=segCol; ctx.globalAlpha=0.5+segPct*0.5;
      } else { ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.globalAlpha=1; }
      ctx.lineWidth=arcW; ctx.lineCap='round'; ctx.stroke(); ctx.globalAlpha=1;
    }
    ctx.beginPath(); ctx.arc(cx,cy,R-arcW/2-Math.round(6*fs),0,Math.PI*2);
    ctx.fillStyle=bgOn?`rgba(0,0,0,${Math.min(0.85,panelOp+0.3)})`:'rgba(0,0,0,0)'; ctx.fill();
    ctx.font=`bold ${Math.round(32*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(fmtSpd(spd), cx, cy-Math.round(3*fs));
    ctx.font=`bold ${Math.round(10*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.6; ctx.textBaseline='top';
    ctx.fillText(spdLabel().toUpperCase(), cx, cy+Math.round(20*fs)); ctx.globalAlpha=1;
    drawDistStrip(gx0, gy0+sz, sz); ctx.restore();
  } else if(spdStyle==='neon'){
    const R=Math.round(58*fs); const sz=R*2+Math.round(20*fs); const stripH=opts.distov?Math.round(28*fs):0;
    const totalH=sz+stripH; const{x:gx0,y:gy0}=posXY(oPos.speed,W,H,sz,totalH);
    const cx=gx0+sz/2, cy=gy0+sz/2;
    const startA=Math.PI*(5/6), sweepA=Math.PI*(4/3), needleA=startA+spdProg*sweepA;
    const _dialCol=dialArcSolidColor(spdProg,maxSpd);
    const accentCol=_dialCol||textColor;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx,cy,R+Math.round(8*fs),0,Math.PI*2);
    ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,R+Math.round(8*fs),0,Math.PI*2);
    ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=Math.round(1.5*fs); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,R,startA,startA+sweepA);
    ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=Math.round(6*fs); ctx.lineCap='round'; ctx.stroke();
    if(spdProg>0.005){
      ctx.shadowColor=accentCol; ctx.shadowBlur=Math.round(12*fs);
      ctx.beginPath(); ctx.arc(cx,cy,R,startA,needleA);
      ctx.strokeStyle=accentCol; ctx.lineWidth=Math.round(4*fs); ctx.lineCap='round'; ctx.stroke();
      ctx.shadowBlur=0;
      const tx2=cx+Math.cos(needleA)*R, ty2=cy+Math.sin(needleA)*R;
      ctx.shadowColor=accentCol; ctx.shadowBlur=Math.round(16*fs);
      ctx.beginPath(); ctx.arc(tx2,ty2,Math.round(5*fs),0,Math.PI*2);
      ctx.fillStyle=accentCol; ctx.fill(); ctx.shadowBlur=0;
    }
    for(let t=0;t<=20;t++){
      const a=startA+(t/20)*sweepA; const isMaj=t%5===0;
      const r1=R+Math.round(4*fs), r2=R+Math.round((isMaj?12:7)*fs);
      ctx.beginPath(); ctx.moveTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);
      ctx.lineTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2);
      ctx.strokeStyle=isMaj?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.2)';
      ctx.lineWidth=isMaj?Math.round(1.5*fs):Math.round(0.8*fs); ctx.lineCap='butt'; ctx.stroke();
    }
    ctx.font=`bold ${Math.round(36*fs)}px ${ovFont()}`; ctx.fillStyle=accentCol;
    ctx.shadowColor=accentCol; ctx.shadowBlur=Math.round(8*fs);
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(fmtSpd(spd),cx,cy-Math.round(4*fs));
    ctx.shadowBlur=0;
    ctx.font=`${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.textBaseline='top';
    ctx.fillText(spdLabel().toUpperCase(),cx,cy+Math.round(24*fs));
    drawDistStrip(gx0, gy0+sz, sz); ctx.restore();
  } else if(spdStyle==='revled'){
    const nLed=16; const ledW=Math.round(14*fs); const ledH=Math.round(26*fs); const ledGap=Math.round(3*fs);
    const stripW=nLed*(ledW+ledGap)-ledGap; const panH=Math.round(ledH+52*fs);
    const panW=stripW+Math.round(16*fs); const distH=opts.distov?Math.round(26*fs):0;
    const{x:px,y:py}=posXY(oPos.speed,W,H,panW,panH+distH);
    const thresholds=dialThresholds(maxSpd);
    ctx.save();
    if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath(); ctx.roundRect(px,py,panW,panH,Math.round(6*fs)); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=Math.round(fs*0.6); ctx.beginPath(); ctx.roundRect(px,py,panW,panH,Math.round(6*fs)); ctx.stroke(); }
    const ledX0=px+Math.round(8*fs); const ledY=py+Math.round(8*fs);
    for(let i=0;i<nLed;i++){
      const pct=(i+1)/nLed; const active=pct<=spdProg;
      let col;
      if(pct>=thresholds.red)        col=active?'#ff2a1a':'rgba(255,42,26,0.12)';
      else if(pct>=thresholds.yellow) col=active?'#f0a020':'rgba(240,160,32,0.12)';
      else                            col=active?textColor:'rgba(255,255,255,0.08)';
      const lx=ledX0+i*(ledW+ledGap);
      ctx.fillStyle=col;
      if(active){ ctx.shadowColor=col; ctx.shadowBlur=Math.round(8*fs); }
      ctx.beginPath(); ctx.roundRect(lx,ledY,ledW,ledH,Math.round(3*fs)); ctx.fill();
      ctx.shadowBlur=0;
    }
    const numY=py+ledH+Math.round(12*fs);
    ctx.font=`bold ${Math.round(22*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;
    ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(fmtSpd(spd), px+Math.round(8*fs), numY);
    const nw=ctx.measureText(fmtSpd(spd)).width;
    ctx.font=`bold ${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.55; ctx.textBaseline='bottom';
    ctx.fillText(' '+spdLabel().toUpperCase(), px+Math.round(8*fs)+nw, numY+Math.round(22*fs)); ctx.globalAlpha=1;
    ctx.font=`${Math.round(8*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.25)';
    ctx.textAlign='right'; ctx.textBaseline='top';
    ctx.fillText('MAX '+Math.round(cvtSpd(maxSpd))+' '+spdLabel(), px+panW-Math.round(8*fs), numY);
    if(opts.distov){
      const dY=py+panH; const dStr=distKm.toFixed(distDecimals)+' km';
      if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath(); ctx.roundRect(px,dY,panW,distH,Math.round(6*fs)); ctx.fill(); }
      ctx.font=`${Math.round(8*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.45; ctx.textAlign='left'; ctx.textBaseline='middle';
      ctx.fillText('DIST',px+Math.round(8*fs),dY+distH/2);
      ctx.font=`bold ${Math.round(12*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=1; ctx.textAlign='right';
      ctx.fillText(dStr,px+panW-Math.round(8*fs),dY+distH/2);
    }
    ctx.restore();
  } else if(spdStyle==='minihud'){
    const numF=Math.round(44*fs); const lblF=Math.round(9*fs); const panW=Math.round(160*fs);
    const distH=opts.distov?Math.round(22*fs):0; const panH=Math.round(numF+lblF*2+18*fs)+distH;
    const{x:px,y:py}=posXY(oPos.speed,W,H,panW,panH);
    const _dialCol=dialArcSolidColor(spdProg,maxSpd); const accentCol=_dialCol||textColor;
    ctx.save();
    if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath(); ctx.roundRect(px,py,panW,panH,Math.round(4*fs)); ctx.fill(); }
    ctx.font=`${lblF}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.4)';
    ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillText('SPEED', px+Math.round(8*fs), py+Math.round(7*fs));
    ctx.font=`bold ${numF}px ${ovFont()}`; ctx.fillStyle=accentCol;
    ctx.textBaseline='top'; ctx.fillText(fmtSpd(spd), px+Math.round(8*fs), py+lblF+Math.round(8*fs));
    const nw=ctx.measureText(fmtSpd(spd)).width;
    ctx.font=`bold ${Math.round(12*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.55; ctx.textBaseline='bottom';
    ctx.fillText(' '+spdLabel().toUpperCase(), px+Math.round(8*fs)+nw, py+lblF+Math.round(8*fs)+numF); ctx.globalAlpha=1;
    const barY=py+lblF+numF+Math.round(12*fs); const barH2=Math.round(3*fs);
    const barX=px+Math.round(8*fs); const barW=panW-Math.round(16*fs);
    ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.roundRect(barX,barY,barW,barH2,barH2/2); ctx.fill();
    if(spdProg>0.005){ ctx.fillStyle=accentCol; ctx.beginPath(); ctx.roundRect(barX,barY,Math.round(spdProg*barW),barH2,barH2/2); ctx.fill(); }
    if(opts.distov){
      const dY=barY+barH2+Math.round(4*fs); const dStr=distKm.toFixed(distDecimals)+' km';
      ctx.font=`${Math.round(8*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.4; ctx.textAlign='left'; ctx.textBaseline='middle';
      ctx.fillText('DIST',px+Math.round(8*fs),dY+distH/2);
      ctx.font=`bold ${Math.round(11*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=1; ctx.textAlign='right';
      ctx.fillText(dStr,px+panW-Math.round(8*fs),dY+distH/2);
    }
    ctx.restore();
  } else if(spdStyle==='digital'){
    const numF=Math.round(52*fs); const lblF=Math.round(9*fs); const panW=Math.round(180*fs);
    const distH=opts.distov?Math.round(22*fs):0; const panH=Math.round(numF+lblF+22*fs)+distH;
    const{x:px,y:py}=posXY(oPos.speed,W,H,panW,panH);
    const _dialCol=dialArcSolidColor(spdProg,maxSpd); const accentCol=_dialCol||textColor;
    ctx.save();
    if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath(); ctx.roundRect(px,py,panW,panH,Math.round(4*fs)); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=Math.round(fs*0.6); ctx.beginPath(); ctx.roundRect(px,py,panW,panH,Math.round(4*fs)); ctx.stroke(); }
    const maxStr=fmtSpd(maxSpd);
    ctx.font=`bold ${numF}px 'DSEG7 Classic', ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.05)';
    ctx.textAlign='right'; ctx.textBaseline='top'; ctx.fillText(maxStr, px+panW-Math.round(10*fs), py+lblF+Math.round(8*fs));
    ctx.fillStyle=accentCol; ctx.fillText(fmtSpd(spd), px+panW-Math.round(10*fs), py+lblF+Math.round(8*fs));
    ctx.font=`${lblF}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText('SPEED', px+Math.round(10*fs), py+Math.round(7*fs));
    ctx.textAlign='right'; ctx.fillText(spdLabel().toUpperCase(), px+panW-Math.round(10*fs), py+Math.round(7*fs));
    ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=Math.round(fs*0.5);
    ctx.beginPath(); ctx.moveTo(px+Math.round(8*fs),py+lblF+numF+Math.round(12*fs)); ctx.lineTo(px+panW-Math.round(8*fs),py+lblF+numF+Math.round(12*fs)); ctx.stroke();
    if(opts.distov){
      const dY=py+lblF+numF+Math.round(15*fs); const dStr=distKm.toFixed(distDecimals)+' km';
      ctx.font=`${Math.round(8*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.textAlign='left'; ctx.textBaseline='middle';
      ctx.fillText('DIST',px+Math.round(10*fs),dY+distH/2);
      ctx.font=`bold ${Math.round(12*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.textAlign='right';
      ctx.fillText(dStr,px+panW-Math.round(10*fs),dY+distH/2);
    }
    ctx.restore();
  }
}

function drawInfoOverlay(ctx, pt, n, W, H) {
  const fs=ovFS('info'); const bgOn = checkBg('info');
  const t0=gpxData.points[tfS0].time||gpxData.points[0].time;
  const elapsed=pt.time&&t0?(pt.time-t0)/1000:(n-tfS0);
  const distKm=((pt.cumDist-gpxData.points[tfS0].cumDist)/1000);
  const avgSpd=elapsed>0?cvtSpd((pt.cumDist-gpxData.points[tfS0].cumDist)/elapsed):0;
  const infoStyle=window._infoStyle||'list';
  ctx.save();

  if(infoStyle==='hrow'){
    const cols=[
      ['DIST', distKm.toFixed(2)+' km'],
      ['ELEV', Math.round(pt.ele)+' m'],
      ['TIME', fmtTime(elapsed)],
      ['AVG',  avgSpd.toFixed(1)+' '+spdLabel()]
    ];
    const colW=Math.round(90*fs); const panW=cols.length*colW; const panH=Math.round(48*fs);
    const{x:px,y:py}=posXY(oPos.info,W,H,panW,panH);
    if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath(); ctx.roundRect(px,py,panW,panH,Math.round(7*fs)); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=Math.round(fs*0.5); ctx.beginPath(); ctx.roundRect(px,py,panW,panH,Math.round(7*fs)); ctx.stroke(); }
    cols.forEach(([lbl,val],i)=>{
      const cx=px+i*colW+colW/2;
      if(i>0 && bgOn){ ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=Math.round(fs*0.5); ctx.beginPath(); ctx.moveTo(px+i*colW,py+Math.round(8*fs)); ctx.lineTo(px+i*colW,py+panH-Math.round(8*fs)); ctx.stroke(); }
      ctx.font=`${Math.round(8*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.45; ctx.textAlign='center'; ctx.textBaseline='top';
      ctx.fillText(lbl, cx, py+Math.round(7*fs));
      ctx.font=`bold ${Math.round(13*fs)}px ${ovFont()}`; ctx.globalAlpha=1; ctx.textBaseline='bottom';
      ctx.fillText(val, cx, py+panH-Math.round(7*fs));
    });

  } else if(infoStyle==='stacked'){
    const cardW=Math.round(120*fs); const cardH=Math.round(46*fs); const gap=Math.round(4*fs);
    const panW=cardW*2+gap; const panH=cardH*2+gap;
    const{x:px,y:py}=posXY(oPos.info,W,H,panW,panH);
    const cards=[
      {lbl:'DIST', val:distKm.toFixed(2)+' km', col:textColor},
      {lbl:'ELEV', val:Math.round(pt.ele)+' m',  col:'#4a9ef0'},
      {lbl:'TIME', val:fmtTime(elapsed),           col:textColor},
      {lbl:'AVG',  val:avgSpd.toFixed(1)+' '+spdLabel(), col:'#4af0a0'},
    ];
    cards.forEach(({lbl,val,col},i)=>{
      const cx=px+(i%2)*(cardW+gap); const cy=py+Math.floor(i/2)*(cardH+gap);
      if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp+0.1})`; ctx.beginPath(); ctx.roundRect(cx,cy,cardW,cardH,Math.round(6*fs)); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=Math.round(fs*0.5); ctx.beginPath(); ctx.roundRect(cx,cy,cardW,cardH,Math.round(6*fs)); ctx.stroke(); }
      ctx.font=`${Math.round(8*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.45; ctx.textAlign='left'; ctx.textBaseline='top';
      ctx.fillText(lbl, cx+Math.round(8*fs), cy+Math.round(7*fs));
      ctx.font=`bold ${Math.round(15*fs)}px ${ovFont()}`; ctx.fillStyle=col; ctx.globalAlpha=1; ctx.textBaseline='bottom';
      ctx.fillText(val, cx+Math.round(8*fs), cy+cardH-Math.round(7*fs));
    });

  } else {
    const pw=Math.round(210*fs),ph=Math.round(118*fs);
    const{x:px,y:py}=posXY(oPos.info,W,H,pw,ph);
    if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath();ctx.roundRect(px,py,pw,ph,10);ctx.fill(); }
    const lh=Math.round(22*fs); const startY=py+Math.round(16*fs);
    const rows=[['DIST',distKm.toFixed(2)+' km'],['ELEV',Math.round(pt.ele)+' m'],['TIME',fmtTime(elapsed)],['AVG',avgSpd.toFixed(1)+' '+spdLabel()]];
    rows.forEach(([lbl,val],i)=>{ const ry=startY+i*lh; ctx.font=`${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.globalAlpha=.45;ctx.textAlign='left'; ctx.fillText(lbl,px+12,ry); ctx.font=`bold ${Math.round(13*fs)}px ${ovFont()}`; ctx.globalAlpha=1; ctx.fillText(val,px+12,ry+Math.round(11*fs)); });
  }
  ctx.restore();
}

function drawArcOverlay(ctx, prog, W, H) {
  const fs=ovFS('arc'); const bgOn = checkBg('arc');
  const arcStyle=window._arcStyle||'ring';
  ctx.save();

  if(arcStyle==='hbar'){
    const panW=Math.round(200*fs), panH=Math.round(38*fs);
    const{x:px,y:py}=posXY(oPos.arc,W,H,panW,panH);
    if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath(); ctx.roundRect(px,py,panW,panH,Math.round(5*fs)); ctx.fill(); }
    const bx=px+Math.round(8*fs), by=py+Math.round(20*fs); const bw=panW-Math.round(16*fs); const bh=Math.round(8*fs);
    ctx.fillStyle='rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,bh/2); ctx.fill();
    if(prog>0){ ctx.fillStyle=textColor; ctx.beginPath(); ctx.roundRect(bx,by,Math.round(prog*bw),bh,bh/2); ctx.fill(); }
    ctx.font=`${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillText('PROGRESS', px+Math.round(8*fs), py+Math.round(6*fs));
    ctx.font=`bold ${Math.round(11*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.textAlign='right'; ctx.textBaseline='top'; ctx.fillText(Math.round(prog*100)+'%', px+panW-Math.round(8*fs), py+Math.round(6*fs));

  } else if(arcStyle==='steps'){
    const nSteps=10; const dotR=Math.round(5*fs); const gap=Math.round(8*fs);
    const panW=(nSteps*(dotR*2+gap))-gap+Math.round(16*fs); const panH=dotR*2+Math.round(20*fs);
    const{x:px,y:py}=posXY(oPos.arc,W,H,panW,panH);
    if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath(); ctx.roundRect(px,py,panW,panH,Math.round(5*fs)); ctx.fill(); }
    const cy=py+panH/2+Math.round(2*fs);
    for(let i=0;i<nSteps;i++){
      const cx2=px+Math.round(8*fs)+i*(dotR*2+gap)+dotR;
      const filled=(i+1)/nSteps<=prog;
      const active=i/nSteps<prog&&prog<(i+1)/nSteps;
      ctx.beginPath(); ctx.arc(cx2,cy,dotR,0,Math.PI*2);
      if(filled){ ctx.fillStyle=textColor; ctx.fill(); }
      else if(active){ ctx.fillStyle=textColor; ctx.globalAlpha=0.4; ctx.fill(); ctx.globalAlpha=1; }
      else { ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=Math.round(fs*0.8); ctx.stroke(); }
    }
    ctx.font=`bold ${Math.round(10*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText(Math.round(prog*100)+'%', px+panW/2, py+Math.round(4*fs));

  } else {
    const ar=Math.round(52*fs),asz=ar*2+4; const{x:ax0,y:ay0}=posXY(oPos.arc,W,H,asz,asz); const ax=ax0+ar+2,ay=ay0+ar+2;
    if(bgOn){
      ctx.beginPath();ctx.arc(ax,ay,ar,0,Math.PI*2); ctx.fillStyle=`rgba(0,0,0,${panelOp})`;ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=Math.round(6*fs);ctx.lineCap='round';
      ctx.beginPath();ctx.arc(ax,ay,ar-Math.round(5*fs),-Math.PI*.75,Math.PI*.75);ctx.stroke();
    }
    ctx.strokeStyle=textColor; ctx.lineWidth=Math.round(6*fs);ctx.lineCap='round';
    const ea=-Math.PI*.75+prog*Math.PI*1.5; ctx.beginPath();ctx.arc(ax,ay,ar-Math.round(5*fs),-Math.PI*.75,ea);ctx.stroke();
    ctx.fillStyle=textColor; ctx.font=`bold ${Math.round(17*fs)}px ${ovFont()}`; ctx.textAlign='center';ctx.textBaseline='middle'; ctx.fillText(Math.round(prog*100)+'%',ax,ay);
  }
  ctx.restore();
}

function drawGpsTimeOverlay(ctx, pt, W, H) {
  const fs=ovFS('gpstime'); const bgOn = checkBg('gpstime');
  const timeStyle=window._gpsTimeStyle||'standard';
  ctx.save();
  let ts='--:--', ds='';
  if(pt.time){
    const d=pt.time;
    const hh=String(d.getHours()).padStart(2,'0');
    const mm=String(d.getMinutes()).padStart(2,'0');
    const ss=String(d.getSeconds()).padStart(2,'0');
    if(gpsFmt==='hms') ts=hh+':'+mm+':'+ss;
    else if(gpsFmt==='hm') ts=hh+':'+mm;
    else{ const t0=gpxData.points[tfS0].time||gpxData.points[0].time; const el=t0?Math.round((d-t0)/1000):0; ts=String(Math.floor(el/60)).padStart(2,'0')+':'+String(el%60).padStart(2,'0'); }
    if(gpsShowDate) ds=d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  }

  if(timeStyle==='minimal'){
    const bigF=Math.round(26*fs), lblF=Math.round(8*fs);
    ctx.font=`bold ${bigF}px ${ovFont()}`; const tw=ctx.measureText(ts).width;
    const bw=Math.max(tw+Math.round(16*fs),Math.round(120*fs));
    const bh=gpsShowDate?Math.round(52*fs):Math.round(36*fs);
    const{x:gx,y:gy}=posXY(oPos.gpstime,W,H,bw,bh);
    ctx.font=`${lblF}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.4;
    ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillText('GPS TIME', gx, gy);
    ctx.globalAlpha=1;
    ctx.font=`bold ${bigF}px ${ovFont()}`; ctx.fillStyle=textColor;
    ctx.textBaseline='top'; ctx.fillText(ts, gx, gy+lblF+Math.round(2*fs));
    ctx.strokeStyle=textColor; ctx.globalAlpha=0.3; ctx.lineWidth=Math.round(fs*0.6);
    ctx.beginPath(); ctx.moveTo(gx,gy+lblF+bigF+Math.round(5*fs)); ctx.lineTo(gx+tw,gy+lblF+bigF+Math.round(5*fs)); ctx.stroke();
    ctx.globalAlpha=1;
    if(gpsShowDate&&ds){ ctx.font=`${lblF}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.45; ctx.textBaseline='top'; ctx.fillText(ds,gx,gy+lblF+bigF+Math.round(8*fs)); }

  } else if(timeStyle==='pill'){
    const bigF=Math.round(22*fs), lblF=Math.round(7*fs);
    ctx.font=`bold ${bigF}px ${ovFont()}`; const tw=ctx.measureText(ts).width;
    const lblW=Math.round(34*fs); const pad=Math.round(10*fs);
    const pillH=Math.round(38*fs);
    const dateH=gpsShowDate&&ds?Math.round(14*fs):0;
    const bw=lblW+tw+pad*2+Math.round(8*fs); const bh=pillH+dateH;
    const{x:gx,y:gy}=posXY(oPos.gpstime,W,H,bw,bh);
    if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath(); ctx.roundRect(gx,gy,bw,pillH,pillH/2); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.lineWidth=Math.round(fs*0.5); ctx.beginPath(); ctx.roundRect(gx,gy,bw,pillH,pillH/2); ctx.stroke(); }
    ctx.font=`${lblF}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.4;
    ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText('TIME', gx+lblW/2, gy+Math.round(6*fs));
    ctx.globalAlpha=1; ctx.textBaseline='bottom'; ctx.fillText(gpsFmt==='hms'?'HH:MM:SS':'MM:SS', gx+lblW/2, gy+pillH-Math.round(6*fs));
    ctx.font=`bold ${bigF}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=1;
    ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillText(ts, gx+lblW+Math.round(8*fs), gy+pillH/2);
    if(gpsShowDate&&ds){
      ctx.font=`${lblF}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.5;
      ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText(ds, gx+bw/2, gy+pillH+Math.round(2*fs));
    }

  } else {
    const bigF=Math.round(30*fs),smF=Math.round(12*fs);
    ctx.font=`bold ${bigF}px ${ovFont()}`; const tw=ctx.measureText(ts).width;
    const bw=Math.max(tw+Math.round(28*fs),Math.round(180*fs)); const bh=gpsShowDate?Math.round(58*fs):Math.round(42*fs);
    const{x:gx,y:gy}=posXY(oPos.gpstime,W,H,bw,bh);
    if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath();ctx.roundRect(gx,gy,bw,bh,8);ctx.fill(); }
    ctx.fillStyle=textColor;ctx.textAlign='center';ctx.textBaseline='top'; ctx.fillText(ts,gx+bw/2,gy+Math.round(7*fs));
    if(gpsShowDate&&ds){ ctx.font=`${smF}px ${ovFont()}`; ctx.globalAlpha=.5; ctx.fillText(ds,gx+bw/2,gy+Math.round(7*fs)+bigF+2); }
  }
  ctx.restore();
}

function drawCoordsOverlay(ctx, pt, W, H) {
  const fs=ovFS('coords'); const bgOn = checkBg('coords');
  const coordStyle=window._coordStyle||'standard';
  ctx.save();
  function toDMS(deg, isLat){ const abs=Math.abs(deg); const d=Math.floor(abs); const mf=(abs-d)*60; const m=Math.floor(mf); const s=((mf-m)*60).toFixed(1); const dir=isLat?(deg>=0?'N':'S'):(deg>=0?'E':'W'); return dir+String(d).padStart(isLat?2:3,'0')+'\u00b0 '+String(m).padStart(2,'0')+"' "+String(s).padStart(4,'0')+'"'; }
  function toDD(deg, isLat){ const dir=isLat?(deg>=0?'N':'S'):(deg>=0?'E':'W'); return dir+' '+Math.abs(deg).toFixed(6)+'\u00b0'; }
  const latStr = coordFmt==='dms' ? toDMS(pt.lat,true) : toDD(pt.lat,true);
  const lonStr = coordFmt==='dms' ? toDMS(pt.lon,false) : toDD(pt.lon,false);

  if(coordStyle==='compact'){
    const lineF=Math.round(11*fs); const pad=Math.round(8*fs); const lineGap=Math.round(3*fs);
    ctx.font=`${lineF}px ${ovFont()}`;
    const latW=ctx.measureText(latStr).width; const lonW=ctx.measureText(lonStr).width;
    const boxW=Math.max(latW,lonW)+pad*2; const boxH=lineF*2+lineGap+pad*2;
    const{x:cx,y:cy}=posXY(oPos.coords,W,H,boxW,boxH);
    if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath(); ctx.roundRect(cx,cy,boxW,boxH,Math.round(5*fs)); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=Math.round(fs*0.4); ctx.beginPath(); ctx.roundRect(cx,cy,boxW,boxH,Math.round(5*fs)); ctx.stroke(); }
    ctx.fillStyle=textColor; ctx.textAlign='left'; ctx.textBaseline='top'; ctx.globalAlpha=0.8;
    ctx.fillText(latStr, cx+pad, cy+pad);
    ctx.fillText(lonStr, cx+pad, cy+pad+lineF+lineGap);
    ctx.globalAlpha=1;

  } else if(coordStyle==='badge'){
    const lineF=Math.round(12*fs); const pad=Math.round(9*fs); const lblF=Math.round(7*fs); const gap=Math.round(4*fs);
    ctx.font=`${lineF}px ${ovFont()}`;
    const latW=ctx.measureText(latStr).width; const lonW=ctx.measureText(lonStr).width;
    const pill1W=lblF*4+latW+pad*2; const pill2W=lblF*4+lonW+pad*2;
    const pillH=Math.round(26*fs); const totalW=Math.max(pill1W,pill2W); const totalH=pillH*2+gap;
    const{x:cx,y:cy}=posXY(oPos.coords,W,H,totalW,totalH);
    [[latStr,'LAT',cy],[lonStr,'LON',cy+pillH+gap]].forEach(([str,lbl,py])=>{
      const pw=totalW;
      if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp+0.1})`; ctx.beginPath(); ctx.roundRect(cx,py,pw,pillH,pillH/2); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=Math.round(fs*0.4); ctx.beginPath(); ctx.roundRect(cx,py,pw,pillH,pillH/2); ctx.stroke(); }
      ctx.font=`bold ${lblF}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.45; ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillText(lbl, cx+Math.round(10*fs), py+pillH/2);
      ctx.font=`${lineF}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=1; ctx.textAlign='right'; ctx.fillText(str, cx+pw-Math.round(10*fs), py+pillH/2);
    });

  } else {
    const lineF=Math.round(15*fs); const pad=Math.round(12*fs); const iconW=coordShowIcon?Math.round(26*fs):0; const lineGap=Math.round(4*fs);
    ctx.font=`bold ${lineF}px ${ovFont()}`; const latW=ctx.measureText(latStr).width; const lonW=ctx.measureText(lonStr).width; const textW=Math.max(latW,lonW); const boxW=iconW+textW+pad*2+(iconW>0?Math.round(6*fs):0); const boxH=lineF*2+lineGap+pad*2;
    const{x:cx,y:cy}=posXY(oPos.coords,W,H,boxW,boxH);
    if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath();ctx.roundRect(cx,cy,boxW,boxH,Math.round(8*fs));ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=Math.round(fs*0.5); ctx.beginPath();ctx.roundRect(cx,cy,boxW,boxH,Math.round(8*fs));ctx.stroke(); }
    if(coordShowIcon){ const icx=cx+pad+iconW/2; const icy=cy+boxH/2; const ir=Math.round(7*fs); ctx.strokeStyle=textColor;ctx.lineWidth=Math.round(1.5*fs); ctx.beginPath();ctx.arc(icx,icy,ir,0,Math.PI*2);ctx.stroke(); ctx.fillStyle=textColor; ctx.beginPath();ctx.arc(icx,icy,Math.round(2.5*fs),0,Math.PI*2);ctx.fill(); }
    const tx=cx+iconW+(iconW>0?Math.round(6*fs):0)+pad; const ty1=cy+pad; const ty2=cy+pad+lineF+lineGap;
    ctx.font=`bold ${lineF}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.textAlign='left';ctx.textBaseline='top'; ctx.fillText(latStr,tx,ty1); ctx.fillText(lonStr,tx,ty2);
  }
  ctx.restore();
}

function drawElevOverlay(ctx, pt, points, n, W, H, prog) {
  const fs=ovFS('elev'); const bgOn = checkBg('elev');
  const gW=Math.round(290*fs), gH=Math.round(58*fs);
  const{x:gX,y:gY}=posXY(oPos.elev,W,H,gW,gH);
  const eStyle=window._elevStyle||'line';
  ctx.save();
  if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath();ctx.roundRect(gX-10,gY-8,gW+20,gH+16,8);ctx.fill(); }
  const eR=(gpxData.maxEle-gpxData.minEle)||1;
  const step=Math.max(1,Math.floor(points.length/gW));
  const toFX=i=>gX+(i/points.length)*gW;
  const toFY=i=>gY+gH-((points[i].ele-gpxData.minEle)/eR)*gH;
  if(eStyle==='area'){
    ctx.beginPath(); let fi=true;
    for(let i=0;i<points.length;i+=step){ fi?ctx.moveTo(toFX(i),toFY(i)):ctx.lineTo(toFX(i),toFY(i)); fi=false; }
    ctx.lineTo(gX+gW,gY+gH); ctx.lineTo(gX,gY+gH); ctx.closePath();
    ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=1; ctx.lineJoin='round'; ctx.stroke();
    if(n>tfS0){
      const step2=Math.max(1,Math.floor((n-tfS0)/150));
      const gradFill=ctx.createLinearGradient(0,gY,0,gY+gH);
      const tc=textColor.startsWith('#')?textColor+'88':'rgba(255,255,255,0.5)';
      gradFill.addColorStop(0,tc); gradFill.addColorStop(1,'rgba(0,0,0,0)');
      ctx.beginPath(); fi=true;
      for(let i=tfS0;i<=n;i+=step2){ fi?ctx.moveTo(toFX(i),toFY(i)):ctx.lineTo(toFX(i),toFY(i)); fi=false; }
      ctx.lineTo(toFX(n),gY+gH); ctx.lineTo(toFX(tfS0),gY+gH); ctx.closePath();
      ctx.fillStyle=gradFill; ctx.fill();
      ctx.beginPath(); fi=true;
      for(let i=tfS0;i<=n;i+=step2){ fi?ctx.moveTo(toFX(i),toFY(i)):ctx.lineTo(toFX(i),toFY(i)); fi=false; }
      ctx.strokeStyle=textColor; ctx.lineWidth=Math.round(1.5*fs); ctx.lineJoin='round'; ctx.lineCap='round'; ctx.stroke();
    }
  } else {
    let fi2=true;
    ctx.beginPath();ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=1.5;ctx.lineJoin='round';
    for(let i=0;i<points.length;i+=step){ fi2=(i===0); fi2?ctx.moveTo(toFX(i),toFY(i)):ctx.lineTo(toFX(i),toFY(i)); } ctx.stroke();
    fi2=true;
    ctx.beginPath();ctx.strokeStyle=textColor;ctx.lineWidth=Math.round(1.5*fs);ctx.lineJoin='round';
    for(let i=0;i<=n;i+=step){ fi2=(i===0); fi2?ctx.moveTo(toFX(i),toFY(i)):ctx.lineTo(toFX(i),toFY(i)); } ctx.stroke();
  }
  const mx=gX+prog*gW; const my=gY+gH-((pt.ele-gpxData.minEle)/eR)*gH;
  ctx.beginPath();ctx.arc(mx,my,Math.round(4*fs),0,Math.PI*2);ctx.fillStyle=textColor;ctx.fill();
  ctx.beginPath();ctx.arc(mx,my,Math.round(2*fs),0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fill();
  ctx.font=`bold ${Math.round(8*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.7;
  ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.fillText(Math.round(pt.ele)+'m', mx, my-Math.round(4*fs)); ctx.globalAlpha=1;
  ctx.restore();
}

function drawGForceOverlay(ctx, pt, W, H) {
  const fs=ovFS('gforce'); const bgOn = checkBg('gforce'); const gl=pt.gLong||0, gla=pt.gLat||0; const gMax=window._gforceScale||2; const sz=Math.round(130*fs); 
  const{x:gx,y:gy}=posXY(oPos.gforce,W,H,sz,sz); const cx=gx+sz/2, cy=gy+sz/2, R=sz/2-Math.round(6*fs); 
  ctx.save(); 
  if(bgOn){
      ctx.beginPath();ctx.arc(cx,cy,sz/2,0,Math.PI*2); ctx.fillStyle=`rgba(0,0,0,${panelOp})`;ctx.fill(); 
      [0.33,0.66,1].forEach(r=>{ ctx.beginPath();ctx.arc(cx,cy,R*r,0,Math.PI*2); ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.lineWidth=Math.round(fs);ctx.stroke(); }); 
      ctx.beginPath();ctx.arc(cx,cy,sz/2,0,Math.PI*2); ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=Math.round(1.5*fs);ctx.stroke(); 
  }
  ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.lineWidth=Math.round(fs); ctx.beginPath();ctx.moveTo(cx-R,cy);ctx.lineTo(cx+R,cy);ctx.stroke(); ctx.beginPath();ctx.moveTo(cx,cy-R);ctx.lineTo(cx,cy+R);ctx.stroke(); 
  ctx.font=`${Math.round(8*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.3)';ctx.textAlign='center';ctx.textBaseline='middle'; ctx.fillText(gMax+'G',cx+R+Math.round(6*fs),cy); 
  const dotX=cx+(gla/gMax)*R; const dotY=cy-(gl/gMax)*R; ctx.strokeStyle='rgba(74,240,160,0.2)';ctx.lineWidth=Math.round(2*fs); ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(dotX,dotY);ctx.stroke(); 
  ctx.beginPath();ctx.arc(dotX,dotY,Math.round(10*fs),0,Math.PI*2); const gGrad=ctx.createRadialGradient(dotX,dotY,0,dotX,dotY,Math.round(10*fs)); const dotCol=Math.abs(gl)>1||Math.abs(gla)>1?'#ff4444':'#4af0a0'; gGrad.addColorStop(0,dotCol+'cc');gGrad.addColorStop(1,'transparent'); ctx.fillStyle=gGrad;ctx.fill(); 
  ctx.beginPath();ctx.arc(dotX,dotY,Math.round(5*fs),0,Math.PI*2); ctx.fillStyle=dotCol;ctx.fill(); ctx.strokeStyle=textColor;ctx.lineWidth=Math.round(fs);ctx.stroke(); 
  ctx.font=`bold ${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText('ACCEL',cx,gy+Math.round(4*fs)); ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText('BRAKE',cx,gy+sz-Math.round(4*fs)); ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('L',gx+Math.round(4*fs),cy); ctx.textAlign='right';ctx.fillText('R',gx+sz-Math.round(4*fs),cy); 
  const totalG=Math.sqrt(gl*gl+gla*gla);
  ctx.font=`bold ${Math.round(16*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.textAlign='center';
  const gtp=window._gforceTextPos||'center';
  if(gtp==='top'){
    ctx.textBaseline='top'; ctx.fillText(totalG.toFixed(2)+'G',cx,gy+Math.round(6*fs));
  } else if(gtp==='bottom'){
    ctx.textBaseline='bottom'; ctx.fillText(totalG.toFixed(2)+'G',cx,gy+sz-Math.round(6*fs));
  } else {
    ctx.textBaseline='middle'; ctx.fillText(totalG.toFixed(2)+'G',cx,cy);
  }
  ctx.restore();
}

function drawCompassOverlay(ctx, pt, W, H) {
  const fs=ovFS('compass'); const bgOn = checkBg('compass'); const hdg=pt.heading||0; const dirs=['N','NE','E','SE','S','SW','W','NW']; 
  ctx.save(); 
  if(window._compassStyle==='arrow'){
    const sz=Math.round(80*fs); const{x:ax,y:ay}=posXY(oPos.compass,W,H,sz,sz);
    const cx=ax+sz/2, cy=ay+sz/2, R=sz/2-Math.round(6*fs);
    if(bgOn){ ctx.beginPath(); ctx.arc(cx,cy,R+Math.round(4*fs),0,Math.PI*2); ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.fill(); }
    ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=Math.round(fs*0.8); ctx.stroke();
    const hdgR=(hdg-90)*Math.PI/180;
    const nx=cx+Math.cos(hdgR)*R*0.72, ny=cy+Math.sin(hdgR)*R*0.72;
    const sx=cx-Math.cos(hdgR)*R*0.4, sy=cy-Math.sin(hdgR)*R*0.4;
    ctx.beginPath(); ctx.moveTo(cx+Math.cos(hdgR-Math.PI/2)*Math.round(3.5*fs),cy+Math.sin(hdgR-Math.PI/2)*Math.round(3.5*fs));
    ctx.lineTo(nx,ny); ctx.lineTo(cx+Math.cos(hdgR+Math.PI/2)*Math.round(3.5*fs),cy+Math.sin(hdgR+Math.PI/2)*Math.round(3.5*fs));
    ctx.closePath(); ctx.fillStyle='#ff4444'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx+Math.cos(hdgR-Math.PI/2)*Math.round(3.5*fs),cy+Math.sin(hdgR-Math.PI/2)*Math.round(3.5*fs));
    ctx.lineTo(sx,sy); ctx.lineTo(cx+Math.cos(hdgR+Math.PI/2)*Math.round(3.5*fs),cy+Math.sin(hdgR+Math.PI/2)*Math.round(3.5*fs));
    ctx.closePath(); ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,Math.round(3*fs),0,Math.PI*2); ctx.fillStyle=textColor; ctx.fill();
    const cardinal=['N','NE','E','SE','S','SW','W','NW'][Math.round(((hdg%360)+360)%360/45)%8];
    ctx.font=`bold ${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText(Math.round(hdg)+'° '+cardinal, cx, ay+sz-Math.round(3*fs));

  } else if(window._compassStyle==='digital'){
    const panW=Math.round(140*fs), panH=Math.round(56*fs);
    const{x:dx,y:dy}=posXY(oPos.compass,W,H,panW,panH);
    if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${Math.min(0.92,panelOp+0.2)})`; ctx.beginPath(); ctx.roundRect(dx,dy,panW,panH,Math.round(6*fs)); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=Math.round(fs*0.5); ctx.beginPath(); ctx.roundRect(dx,dy,panW,panH,Math.round(6*fs)); ctx.stroke(); }
    const hdgStr=Math.round(hdg).toString().padStart(3,'0');
    ctx.font=`bold ${Math.round(30*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(hdgStr, dx+Math.round(10*fs), dy+Math.round(8*fs));
    const numW=ctx.measureText(hdgStr).width;
    ctx.font=`bold ${Math.round(12*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.5; ctx.textBaseline='bottom';
    ctx.fillText('°', dx+Math.round(10*fs)+numW+Math.round(2*fs), dy+Math.round(8*fs)+Math.round(30*fs));
    ctx.globalAlpha=1;
    const cardStr=['N','NE','E','SE','S','SW','W','NW'][Math.round(((hdg%360)+360)%360/45)%8];
    ctx.font=`bold ${Math.round(18*fs)}px ${ovFont()}`; ctx.fillStyle='#ff4444'; ctx.textAlign='right'; ctx.textBaseline='top';
    ctx.fillText(cardStr, dx+panW-Math.round(10*fs), dy+Math.round(10*fs));
    const tickY=dy+panH-Math.round(12*fs); const tickW=panW-Math.round(16*fs); const tickX=dx+Math.round(8*fs);
    const ctrX=tickX+tickW/2;
    for(let deg=Math.floor(hdg/5)*5-30;deg<=hdg+30;deg+=5){
      const x=ctrX+(deg-hdg)*(tickW/60);
      if(x<tickX||x>tickX+tickW) continue;
      const isMaj=deg%45===0, isCard=deg%90===0;
      const th=isCard?Math.round(8*fs):isMaj?Math.round(5*fs):Math.round(3*fs);
      ctx.fillStyle=isCard?textColor:'rgba(255,255,255,0.4)';
      ctx.fillRect(x-Math.round(fs*0.4), tickY, Math.round(fs*0.8), th);
    }
    ctx.fillStyle=textColor; ctx.beginPath(); ctx.moveTo(ctrX,tickY-2); ctx.lineTo(ctrX-Math.round(3*fs),tickY-Math.round(5*fs)); ctx.lineTo(ctrX+Math.round(3*fs),tickY-Math.round(5*fs)); ctx.closePath(); ctx.fill();

  } else if(window._compassStyle==='bar'){ 
    const bW=Math.round(200*fs), bH=Math.round(44*fs); const{x:bx,y:by}=posXY(oPos.compass,W,H,bW,bH); 
    if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath();ctx.roundRect(bx,by,bW,bH,8);ctx.fill(); }
    ctx.save();ctx.beginPath();ctx.roundRect(bx,by,bW,bH,8);ctx.clip(); 
    const tickSpacing=Math.round(15*fs); const centerX=bx+bW/2; 
    for(let deg=Math.floor(hdg/5)*5-60;deg<=hdg+60;deg+=5){ const x=centerX+(deg-hdg)*tickSpacing/5; if(x<bx||x>bx+bW)continue; const isMajor=deg%45===0, isCard=deg%90===0; const h=isCard?Math.round(16*fs):isMajor?Math.round(11*fs):Math.round(6*fs); ctx.fillStyle=isCard?textColor:'rgba(255,255,255,0.5)'; ctx.fillRect(x-Math.round(fs*0.5),by+Math.round(4*fs),Math.round(fs),h); if(isCard){ const label=dirs[Math.round(((deg%360)+360)%360/45)%8]; ctx.font=`bold ${Math.round(10*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.textAlign='center';ctx.textBaseline='top'; ctx.fillText(label,x,by+Math.round(22*fs)); } } 
    ctx.restore(); ctx.fillStyle=textColor; ctx.beginPath();ctx.moveTo(centerX,by+2);ctx.lineTo(centerX-Math.round(5*fs),by+Math.round(10*fs));ctx.lineTo(centerX+Math.round(5*fs),by+Math.round(10*fs));ctx.closePath();ctx.fill(); 
    const hdgStr=Math.round(hdg).toString().padStart(3,'0')+'°'; ctx.font=`bold ${Math.round(11*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.textAlign='center';ctx.textBaseline='bottom'; ctx.fillText(hdgStr,centerX,by+bH-Math.round(3*fs)); 
  } else { 
    const R=Math.round(52*fs), sz2=R*2+Math.round(12*fs); const{x:rx0,y:ry0}=posXY(oPos.compass,W,H,sz2,sz2); const cx=rx0+sz2/2, cy=ry0+sz2/2; 
    if(bgOn){
        ctx.beginPath();ctx.arc(cx,cy,R+Math.round(4*fs),0,Math.PI*2); ctx.fillStyle=`rgba(0,0,0,${panelOp})`;ctx.fill(); 
        ctx.beginPath();ctx.arc(cx,cy,R+Math.round(2*fs),0,Math.PI*2); ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=Math.round(1.5*fs);ctx.stroke(); 
    }
    for(let d=0;d<360;d+=5){ const a=(d-hdg)*Math.PI/180-Math.PI/2; const isMaj=d%45===0; const r1=R,r2=R-(isMaj?Math.round(9*fs):Math.round(5*fs)); ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1); ctx.lineTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2); ctx.strokeStyle=isMaj?'rgba(255,255,255,0.8)':'rgba(255,255,255,0.25)'; ctx.lineWidth=isMaj?Math.round(1.5*fs):Math.round(fs*0.8);ctx.stroke(); } 
    dirs.forEach((d,i)=>{ const a=(i*45-hdg)*Math.PI/180-Math.PI/2; const lr=R-Math.round(16*fs); const isMain=i%2===0; ctx.font=`bold ${Math.round(isMain?11:9)*fs}px ${ovFont()}`; ctx.fillStyle=d==='N'?'#ff4444':textColor; ctx.globalAlpha=isMain?1:0.6; ctx.textAlign='center';ctx.textBaseline='middle'; ctx.fillText(d,cx+Math.cos(a)*lr,cy+Math.sin(a)*lr); }); 
    ctx.globalAlpha=1; ctx.beginPath();ctx.moveTo(cx,cy-R+Math.round(2*fs)); ctx.lineTo(cx-Math.round(4*fs),cy-R+Math.round(10*fs)); ctx.lineTo(cx+Math.round(4*fs),cy-R+Math.round(10*fs));ctx.closePath(); ctx.fillStyle=textColor;ctx.fill(); 
    ctx.font=`bold ${Math.round(13*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.textAlign='center';ctx.textBaseline='middle'; ctx.fillText(Math.round(hdg).toString().padStart(3,'0')+'°',cx,cy); 
  } 
  ctx.restore();
}

function drawGradeOverlay(ctx, pt, W, H) {
  const fs=ovFS('grade'); const bgOn = checkBg('grade');
  const grade=pt.grade||0; const absg=Math.abs(grade);
  const isUp=grade>0.3, isDn=grade<-0.3;
  const gradeStr=(grade>=0?'+':'')+grade.toFixed(1)+'%';
  const gradColor=isUp?'#ff8844':isDn?'#44aaff':textColor;
  const gradeStyle=window._gradeStyle||'bar';
  ctx.save();

  if(gradeStyle==='arc'){
    const R=Math.round(46*fs); const sz=R*2+Math.round(16*fs); const panH=Math.round(R+Math.round(34*fs));
    const{x:gx,y:gy}=posXY(oPos.grade,W,H,sz,panH);
    const cx=gx+sz/2, cy=gy+R+Math.round(8*fs);
    if(bgOn){
      ctx.fillStyle=`rgba(0,0,0,${panelOp})`;
      ctx.beginPath(); ctx.arc(cx,cy,R+Math.round(6*fs),Math.PI,0,false);
      ctx.lineTo(cx+R+Math.round(6*fs),gy+panH); ctx.lineTo(cx-R-Math.round(6*fs),gy+panH); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=Math.round(fs*0.5);
      ctx.beginPath(); ctx.arc(cx,cy,R+Math.round(6*fs),Math.PI,0,false);
      ctx.lineTo(cx+R+Math.round(6*fs),gy+panH); ctx.lineTo(cx-R-Math.round(6*fs),gy+panH); ctx.closePath(); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(cx,cy,R,Math.PI,0,false);
    ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=Math.round(8*fs); ctx.lineCap='round'; ctx.stroke();
    const maxG=25; const clampedGrade=Math.max(-maxG,Math.min(maxG,grade));
    const needleA=-(Math.PI/2)+(clampedGrade/maxG)*(Math.PI/2);
    if(absg>0.3){
      const fillStart=-Math.PI/2;
      const fillEnd=needleA;
      ctx.beginPath();
      if(isUp){ ctx.arc(cx,cy,R,fillStart,fillEnd,false); }
      else if(isDn){ ctx.arc(cx,cy,R,fillEnd,fillStart,false); }
      ctx.strokeStyle=gradColor; ctx.lineWidth=Math.round(8*fs); ctx.lineCap='round'; ctx.stroke();
    }
    [[-maxG,'L'],[-maxG/2,''],[ 0,'─'],[maxG/2,''],[ maxG,'R']].forEach(([g,lbl])=>{
      const a=-(Math.PI/2)+(g/maxG)*(Math.PI/2);
      const r1=R-Math.round(2*fs), r2=R+Math.round(4*fs);
      ctx.beginPath(); ctx.moveTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1); ctx.lineTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2);
      ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=Math.round(fs); ctx.lineCap='butt'; ctx.stroke();
    });
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(needleA);
    ctx.beginPath(); ctx.moveTo(0,-(R-Math.round(10*fs))); ctx.lineTo(-Math.round(3*fs),Math.round(4*fs)); ctx.lineTo(Math.round(3*fs),Math.round(4*fs)); ctx.closePath();
    ctx.fillStyle=gradColor; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(cx,cy,Math.round(5*fs),0,Math.PI*2); ctx.fillStyle=textColor; ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,Math.round(3*fs),0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fill();
    ctx.font=`${Math.round(7*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText('▼', gx+Math.round(4*fs), cy); ctx.textAlign='right'; ctx.fillText('▲', gx+sz-Math.round(4*fs), cy);
    ctx.font=`bold ${Math.round(14*fs)}px ${ovFont()}`; ctx.fillStyle=gradColor; ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText(gradeStr, cx, cy+Math.round(8*fs));
    ctx.font=`${Math.round(7*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.textBaseline='top';
    ctx.fillText('GRADE', cx, cy+Math.round(22*fs));

  } else if(gradeStyle==='road'){
    const panW=Math.round(140*fs), panH=Math.round(80*fs);
    const{x:gx,y:gy}=posXY(oPos.grade,W,H,panW,panH);
    if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath(); ctx.roundRect(gx,gy,panW,panH,Math.round(6*fs)); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=Math.round(fs*0.5); ctx.beginPath(); ctx.roundRect(gx,gy,panW,panH,Math.round(6*fs)); ctx.stroke(); }
    const visualAngle=Math.atan2(Math.min(absg,30),100)*(isUp?-1:1);
    const roadW=Math.round(60*fs);
    const roadCX=gx+panW*0.5, roadCY=gy+panH*0.62;
    ctx.save(); ctx.translate(roadCX,roadCY); ctx.rotate(visualAngle);
    ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.roundRect(-roadW/2,-Math.round(5*fs),roadW,Math.round(10*fs),Math.round(3*fs)); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.lineWidth=Math.round(fs*0.8);
    ctx.beginPath(); ctx.roundRect(-roadW/2,-Math.round(5*fs),roadW,Math.round(10*fs),Math.round(3*fs)); ctx.stroke();
    if(absg>0.1){ ctx.strokeStyle=gradColor; } else { ctx.strokeStyle='rgba(255,255,255,0.4)'; }
    ctx.lineWidth=Math.round(1.5*fs); ctx.setLineDash([Math.round(6*fs),Math.round(4*fs)]);
    ctx.beginPath(); ctx.moveTo(-roadW/2+Math.round(4*fs),0); ctx.lineTo(roadW/2-Math.round(4*fs),0); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    if(absg>0.3){
      const arrX=gx+panW-Math.round(20*fs), arrY=gy+panH*0.5;
      const arrH=Math.round(14*fs); const arrW=Math.round(8*fs);
      ctx.save(); ctx.translate(arrX,arrY);
      ctx.rotate(isDn?Math.PI/2:-Math.PI/2);
      ctx.beginPath(); ctx.moveTo(0,-arrH/2); ctx.lineTo(-arrW/2,arrH/4); ctx.lineTo(-arrW/4,arrH/4); ctx.lineTo(-arrW/4,arrH/2); ctx.lineTo(arrW/4,arrH/2); ctx.lineTo(arrW/4,arrH/4); ctx.lineTo(arrW/2,arrH/4); ctx.closePath();
      ctx.fillStyle=gradColor; ctx.fill(); ctx.restore();
    }
    ctx.font=`bold ${Math.round(16*fs)}px ${ovFont()}`; ctx.fillStyle=gradColor; ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(gradeStr, gx+Math.round(8*fs), gy+Math.round(8*fs));
    ctx.font=`${Math.round(7*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.textBaseline='top';
    ctx.fillText('GRADE', gx+Math.round(8*fs), gy+Math.round(24*fs));

  } else {
    const gW=Math.round(140*fs), gH=Math.round(52*fs); const{x:grx,y:gry}=posXY(oPos.grade,W,H,gW,gH);
    if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath();ctx.roundRect(grx,gry,gW,gH,8);ctx.fill(); }
    const barW=gW-Math.round(20*fs), barH=Math.round(5*fs); const bx=grx+Math.round(10*fs), by=gry+gH-Math.round(12*fs); const maxG=15; const fillW=Math.min(1,absg/maxG)*(barW/2);
    ctx.fillStyle='rgba(255,255,255,0.1)';ctx.beginPath();ctx.roundRect(bx,by,barW,barH,barH/2);ctx.fill();
    const barMid=bx+barW/2; if(fillW>1){ ctx.fillStyle=gradColor; if(isUp){ ctx.beginPath();ctx.roundRect(barMid,by,fillW,barH,barH/2);ctx.fill(); } else if(isDn){ ctx.beginPath();ctx.roundRect(barMid-fillW,by,fillW,barH,barH/2);ctx.fill(); } }
    ctx.fillStyle='rgba(255,255,255,0.4)';ctx.fillRect(barMid-Math.round(fs*0.5),by-2,Math.round(fs),barH+4);
    ctx.font=`${Math.round(10*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.5)';ctx.textAlign='center';ctx.textBaseline='top'; ctx.fillText('GRADE',grx+gW/2,gry+Math.round(5*fs));
    ctx.font=`bold ${Math.round(18*fs)}px ${ovFont()}`; ctx.fillStyle=gradColor;ctx.textBaseline='top'; ctx.fillText((isUp?'▲':isDn?'▼':'—')+' '+gradeStr,grx+gW/2,gry+Math.round(16*fs));
  }
  ctx.restore();
}

function drawOdometerOverlay(ctx, pt, W, H) {
  const fs=ovFS('odometer'); const bgOn = checkBg('odometer'); 
  const distKmO=((pt.cumDist-gpxData.points[tfS0].cumDist)/1000); 
  const intPart=Math.floor(distKmO); 
  const dW=Math.round(12*fs), dH=Math.round(18*fs); 
  const scaledW=Math.round(dW*odoScale2), scaledH=Math.round(dH*odoScale2); 
  const dotW=Math.round(scaledW*0.45); const pad2=Math.round(2*fs); 
  const totalIntDigits = 3;
  const drumsTotalW = totalIntDigits*(scaledW+pad2) + 1*(scaledW+pad2) + dotW + pad2; 
  const kmLblW=Math.round(28*fs); const distLblW=Math.round(30*fs); 
  const panW=distLblW + drumsTotalW + kmLblW + Math.round(12*fs); 
  const panH=scaledH+Math.round(14*fs); 
  const{x:ox,y:oy}=posXY(oPos.odometer,W,H,panW,panH); 
  ctx.save(); 
  if(odoShowBorder && bgOn){ 
    ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath();ctx.roundRect(ox,oy,panW,panH,Math.round(5*fs));ctx.fill(); 
    ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=Math.round(fs*0.6); ctx.beginPath();ctx.roundRect(ox,oy,panW,panH,Math.round(5*fs));ctx.stroke(); 
  } 
  const lfs=Math.round(8*fs); ctx.font=`bold ${lfs}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.globalAlpha=0.55;ctx.textAlign='left';ctx.textBaseline='middle'; ctx.fillText('ODO',ox+Math.round(6*fs),oy+panH/2);ctx.globalAlpha=1; 
  const odoXO=ox+distLblW, odoYO=oy+(panH-scaledH)/2; let cx2=odoXO; const r2=Math.round(3*fs); 
  const nIntDigits=Math.max(1, String(intPart).length); 
  const leadZeros=Math.max(0, totalIntDigits - nIntDigits); 
  for(let z=0;z<leadZeros;z++){ 
    ctx.save(); 
    ctx.fillStyle='rgba(0,0,0,0.92)'; 
    ctx.beginPath();ctx.roundRect(cx2,odoYO,scaledW,scaledH,r2);ctx.fill(); 
    ctx.beginPath();ctx.roundRect(cx2,odoYO,scaledW,scaledH,r2);ctx.clip(); 
    ctx.font=`bold ${Math.round(scaledH*0.68)}px ${ovFont()}`; 
    ctx.fillStyle=`rgba(255,255,255,0.25)`;ctx.textAlign='center';ctx.textBaseline='middle'; 
    ctx.fillText('0',cx2+scaledW/2,odoYO+scaledH/2); 
    ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=Math.round(fs*0.5); 
    ctx.beginPath();ctx.moveTo(cx2+2,odoYO);ctx.lineTo(cx2+scaledW-2,odoYO);ctx.stroke(); 
    ctx.beginPath();ctx.moveTo(cx2+2,odoYO+scaledH);ctx.lineTo(cx2+scaledW-2,odoYO+scaledH);ctx.stroke(); 
    ctx.restore(); cx2+=scaledW+pad2; 
  } 
  const usedW=drawOdometer(ctx,distKmO,1,cx2,odoYO,dW,dH,fs,textColor,panelOp+0.3,odoScale2); 
  ctx.font=`bold ${Math.round(11*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.globalAlpha=0.8;ctx.textAlign='left';ctx.textBaseline='middle'; ctx.fillText('km',cx2+usedW+Math.round(5*fs),oy+panH/2);ctx.globalAlpha=1; 
  ctx.restore();
}

function drawHeartrateOverlay(ctx, pt, W, H) {
  const fs=ovFS('heartrate'); const bgOn = checkBg('heartrate'); const hr = pt.hr; const zColor = hrZoneColor(hr); const panW=Math.round(160*fs), panH=Math.round(56*fs); const{x:hx,y:hy}=posXY(oPos.heartrate,W,H,panW,panH); 
  ctx.save(); 
  if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath();ctx.roundRect(hx,hy,panW,panH,Math.round(7*fs));ctx.fill(); }
  ctx.font=`bold ${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.45)';ctx.textAlign='left';ctx.textBaseline='top'; ctx.fillText('🫀 HR',hx+Math.round(8*fs),hy+Math.round(6*fs)); 
  const hrStr = hr!=null ? String(Math.round(hr)) : '--'; ctx.font=`bold ${Math.round(26*fs)}px ${ovFont()}`; ctx.fillStyle=hr!=null?zColor:textColor;ctx.textBaseline='top'; ctx.fillText(hrStr,hx+Math.round(8*fs),hy+Math.round(16*fs)); 
  const numW=ctx.measureText(hrStr).width; ctx.font=`${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.5)';ctx.textBaseline='bottom'; ctx.fillText('bpm',hx+Math.round(8*fs)+numW+Math.round(3*fs),hy+panH-Math.round(8*fs)); 
  if(hr!=null){ const barX=hx+Math.round(8*fs), barY=hy+panH-Math.round(7*fs); const barW=panW-Math.round(16*fs), barH=Math.round(3*fs); ['#4a9ef0','#4af0a0','#f0d04a','#f0a04a','#ff4444'].forEach((col,i)=>{ ctx.fillStyle=col;ctx.fillRect(barX+i*(barW/5),barY,barW/5-1,barH); }); const pct=Math.min(1,Math.max(0,hr/hrMaxBpm)); ctx.fillStyle=textColor;ctx.fillRect(barX+pct*barW-1,barY-Math.round(fs),2,barH+Math.round(2*fs)); } 
  ctx.restore();
}

function drawCadenceOverlay(ctx, pt, W, H) {
  const fs=ovFS('cadence'); const bgOn = checkBg('cadence');
  const cad = pt.cad; const cadStyle=window._cadStyle||'standard';
  ctx.save();

  if(cadStyle==='ring'){
    const cadMax=120; const cadProg=cad!=null?Math.min(1,cad/cadMax):0;
    const R=Math.round(36*fs); const sz=R*2+Math.round(12*fs);
    const{x:cx0,y:cy0}=posXY(oPos.cadence,W,H,sz,sz+Math.round(14*fs));
    const cx=cx0+sz/2, cy=cy0+sz/2;
    const startA=-Math.PI*0.8, sweepA=Math.PI*1.6;
    if(bgOn){ ctx.beginPath(); ctx.arc(cx,cy,R+Math.round(4*fs),0,Math.PI*2); ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.fill(); }
    ctx.beginPath(); ctx.arc(cx,cy,R,startA,startA+sweepA);
    ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=Math.round(7*fs); ctx.lineCap='round'; ctx.stroke();
    if(cadProg>0.005){
      const cadCol=cad<60?'#888':cad<80?'#4a9ef0':cad<100?'#4af0a0':'#f0d04a';
      ctx.beginPath(); ctx.arc(cx,cy,R,startA,startA+cadProg*sweepA);
      ctx.strokeStyle=cadCol; ctx.lineWidth=Math.round(7*fs); ctx.lineCap='round'; ctx.stroke();
    }
    const cadStr=cad!=null?String(Math.round(cad)):'--';
    ctx.font=`bold ${Math.round(16*fs)}px ${ovFont()}`; ctx.fillStyle='#4a9ef0';
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(cadStr,cx,cy-Math.round(2*fs));
    ctx.font=`${Math.round(7*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.textBaseline='top';
    ctx.fillText('rpm',cx,cy+Math.round(10*fs));
    ctx.font=`${Math.round(7*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.textBaseline='bottom';
    ctx.fillText('CADENCE',cx,cy0+sz+Math.round(12*fs));
  } else {
    const panW=Math.round(150*fs), panH=Math.round(56*fs);
    const{x:cx2,y:cy2}=posXY(oPos.cadence,W,H,panW,panH);
    if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath();ctx.roundRect(cx2,cy2,panW,panH,Math.round(7*fs));ctx.fill(); }
    ctx.font=`bold ${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.45)';ctx.textAlign='left';ctx.textBaseline='top'; ctx.fillText('🔄 CADENCE',cx2+Math.round(8*fs),cy2+Math.round(6*fs));
    const cadStr = cad!=null ? String(Math.round(cad)) : '--'; ctx.font=`bold ${Math.round(26*fs)}px ${ovFont()}`; ctx.fillStyle='#4a9ef0';ctx.textBaseline='top'; ctx.fillText(cadStr,cx2+Math.round(8*fs),cy2+Math.round(16*fs));
    const cW=ctx.measureText(cadStr).width; ctx.font=`${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.5)';ctx.textBaseline='bottom'; ctx.fillText('rpm',cx2+Math.round(8*fs)+cW+Math.round(3*fs),cy2+panH-Math.round(8*fs));
  }
  ctx.restore();
}

function drawPowerOverlay(ctx, pt, W, H) {
  const fs=ovFS('power'); const bgOn = checkBg('power'); const pw = pt.power; const pctFTP = (pw!=null&&ftpWatts>0) ? pw/ftpWatts : 0; let pwColor=textColor; 
  if(pw!=null){ if(pctFTP<0.55) pwColor='#888888'; else if(pctFTP<0.75) pwColor='#4a9ef0'; else if(pctFTP<0.90) pwColor='#4af0a0'; else if(pctFTP<1.05) pwColor='#f0d04a'; else if(pctFTP<1.20) pwColor='#f0a04a'; else pwColor='#ff4444'; } 
  const panW=Math.round(160*fs), panH=Math.round(56*fs); const{x:pwx,y:pwy}=posXY(oPos.power,W,H,panW,panH); 
  ctx.save(); 
  if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath();ctx.roundRect(pwx,pwy,panW,panH,Math.round(7*fs));ctx.fill(); }
  ctx.font=`bold ${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.45)';ctx.textAlign='left';ctx.textBaseline='top'; ctx.fillText('⚡ POWER',pwx+Math.round(8*fs),pwy+Math.round(6*fs)); 
  const pwStr = pw!=null ? String(Math.round(pw)) : '--'; ctx.font=`bold ${Math.round(26*fs)}px ${ovFont()}`; ctx.fillStyle=pwColor;ctx.textBaseline='top'; ctx.fillText(pwStr,pwx+Math.round(8*fs),pwy+Math.round(16*fs)); 
  const pW2=ctx.measureText(pwStr).width; ctx.font=`${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.5)';ctx.textBaseline='bottom'; ctx.fillText('W',pwx+Math.round(8*fs)+pW2+Math.round(3*fs),pwy+panH-Math.round(8*fs)); 
  if(pw!=null){ ctx.textAlign='right'; ctx.fillText(Math.round(pctFTP*100)+'% FTP',pwx+panW-Math.round(8*fs),pwy+panH-Math.round(8*fs)); } 
  ctx.restore();
}

function drawHeartrateWaveOverlay(ctx, pt, n, W, H){
  const fs=ovFS('heartrate'); const bgOn=checkBg('heartrate');
  const hr=pt.hr; const zColor=hrZoneColor(hr);
  const panW=Math.round(220*fs), panH=Math.round(70*fs);
  const{x:hx,y:hy}=posXY(oPos.heartrate,W,H,panW,panH);
  const histLen=60;
  const pts=gpxData.points; const buf=[];
  for(let i=Math.max(0,n-histLen);i<=n;i++) buf.push(pts[i].hr!=null?pts[i].hr:0);
  ctx.save();
  if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath(); ctx.roundRect(hx,hy,panW,panH,Math.round(7*fs)); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=Math.round(fs*0.5); ctx.beginPath(); ctx.roundRect(hx,hy,panW,panH,Math.round(7*fs)); ctx.stroke(); }
  ctx.font=`bold ${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText('🫀 HR', hx+Math.round(8*fs), hy+Math.round(6*fs));
  const hrStr=hr!=null?String(Math.round(hr)):'--';
  ctx.font=`bold ${Math.round(28*fs)}px ${ovFont()}`; ctx.fillStyle=hr!=null?zColor:textColor; ctx.textBaseline='top';
  ctx.fillText(hrStr, hx+Math.round(8*fs), hy+Math.round(14*fs));
  const numW=ctx.measureText(hrStr).width;
  ctx.font=`${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.textBaseline='bottom';
  ctx.fillText('bpm', hx+Math.round(8*fs)+numW+Math.round(3*fs), hy+panH-Math.round(8*fs));
  if(hr!=null){
    const bx=hx+Math.round(8*fs), bby=hy+panH-Math.round(5*fs), bw=Math.round(80*fs), bh=Math.round(3*fs);
    ['#4a9ef0','#4af0a0','#f0d04a','#f0a04a','#ff4444'].forEach((col,i)=>{ ctx.fillStyle=col; ctx.fillRect(bx+i*(bw/5),bby,bw/5-1,bh); });
    const pct=Math.min(1,Math.max(0,hr/hrMaxBpm)); ctx.fillStyle=textColor; ctx.fillRect(bx+pct*bw-1,bby-Math.round(fs),2,bh+Math.round(2*fs));
  }
  if(buf.length>1){
    const waveX=hx+Math.round(100*fs); const waveW=panW-Math.round(108*fs);
    const waveY=hy+Math.round(8*fs); const waveH=panH-Math.round(16*fs);
    const validBuf=buf.filter(v=>v>0);
    const minH=validBuf.length?Math.max(40,Math.min(...validBuf)):60;
    const maxH=validBuf.length?Math.max(180,Math.max(...validBuf)):180;
    const range=maxH-minH||1;
    ctx.save(); ctx.beginPath(); ctx.rect(waveX,waveY,waveW,waveH); ctx.clip();
    ctx.beginPath();
    buf.forEach((v,i)=>{
      const x=waveX+waveW*(i/(buf.length-1));
      const y=waveY+waveH-Math.max(0,Math.min(waveH,(v-minH)/range*waveH));
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.strokeStyle=zColor; ctx.lineWidth=Math.round(1.5*fs); ctx.lineJoin='round'; ctx.lineCap='round'; ctx.stroke();
    const grad=ctx.createLinearGradient(0,waveY,0,waveY+waveH);
    const hexCol=zColor.startsWith('#')?zColor:'#4af0a0';
    grad.addColorStop(0,hexCol+'44'); grad.addColorStop(1,'rgba(0,0,0,0)');
    ctx.beginPath();
    buf.forEach((v,i)=>{ const x=waveX+waveW*(i/(buf.length-1)); const y=waveY+waveH-Math.max(0,Math.min(waveH,(v-minH)/range*waveH)); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
    ctx.lineTo(waveX+waveW,waveY+waveH); ctx.lineTo(waveX,waveY+waveH); ctx.closePath();
    ctx.fillStyle=grad; ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawPowerArcOverlay(ctx, pt, W, H){
  const fs=ovFS('power'); const bgOn=checkBg('power');
  const pw=pt.power; const pctFTP=(pw!=null&&ftpWatts>0)?pw/ftpWatts:0;
  let pwColor=textColor;
  if(pw!=null){ if(pctFTP<0.55) pwColor='#888888'; else if(pctFTP<0.75) pwColor='#4a9ef0'; else if(pctFTP<0.90) pwColor='#4af0a0'; else if(pctFTP<1.05) pwColor='#f0d04a'; else if(pctFTP<1.20) pwColor='#f0a04a'; else pwColor='#ff4444'; }
  const R=Math.round(52*fs); const sz=R*2+Math.round(16*fs); const panW=sz+Math.round(80*fs); const panH=sz;
  const{x:px,y:py}=posXY(oPos.power,W,H,panW,panH);
  const cx=px+R+Math.round(8*fs), cy=py+panH/2;
  const startA=Math.PI*(5/6), sweepA=Math.PI*(4/3);
  const wattMax=ftpWatts*1.5; const wattProg=pw!=null?Math.min(1,pw/wattMax):0;
  const ftpProg=Math.min(1,Math.max(0,pctFTP));
  ctx.save();
  if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath(); ctx.roundRect(px,py,panW,panH,Math.round(8*fs)); ctx.fill(); }
  ctx.beginPath(); ctx.arc(cx,cy,R,startA,startA+sweepA);
  ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=Math.round(8*fs); ctx.lineCap='round'; ctx.stroke();
  const zones=[
    {end:0.55,col:'rgba(136,136,136,0.7)'},{end:0.75,col:'rgba(74,158,240,0.7)'},
    {end:0.90,col:'rgba(74,240,160,0.7)'},{end:1.05,col:'rgba(240,208,74,0.7)'},
    {end:1.20,col:'rgba(240,160,74,0.7)'},{end:2.0, col:'rgba(255,68,68,0.7)'}
  ];
  let prevPct=0;
  zones.forEach(z=>{
    const a0=startA+prevPct*sweepA; const a1=startA+Math.min(ftpProg,z.end)*sweepA;
    if(a1>a0){ ctx.beginPath(); ctx.arc(cx,cy,R,a0,a1); ctx.strokeStyle=z.col; ctx.lineWidth=Math.round(7*fs); ctx.lineCap='butt'; ctx.stroke(); }
    prevPct=z.end;
  });
  ctx.beginPath(); ctx.arc(cx,cy,R-Math.round(12*fs),startA,startA+sweepA);
  ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=Math.round(5*fs); ctx.lineCap='round'; ctx.stroke();
  if(wattProg>0.005){
    ctx.beginPath(); ctx.arc(cx,cy,R-Math.round(12*fs),startA,startA+wattProg*sweepA);
    ctx.strokeStyle=pwColor; ctx.lineWidth=Math.round(4*fs); ctx.lineCap='round'; ctx.stroke();
  }
  const ftpA=startA+Math.min(1,1.0/1.5)*sweepA;
  ctx.beginPath(); ctx.moveTo(cx+Math.cos(ftpA)*(R-Math.round(16*fs)),cy+Math.sin(ftpA)*(R-Math.round(16*fs)));
  ctx.lineTo(cx+Math.cos(ftpA)*(R+Math.round(4*fs)),cy+Math.sin(ftpA)*(R+Math.round(4*fs)));
  ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=Math.round(1.5*fs); ctx.stroke();
  ctx.font=`bold ${Math.round(22*fs)}px ${ovFont()}`; ctx.fillStyle=pwColor; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(pw!=null?Math.round(pw):'--', cx, cy-Math.round(4*fs));
  ctx.font=`${Math.round(8*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.textBaseline='top';
  ctx.fillText('W', cx, cy+Math.round(12*fs));
  const tx=cx+R+Math.round(14*fs);
  ctx.font=`bold ${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText('⚡ POWER', tx, py+Math.round(8*fs));
  ctx.font=`bold ${Math.round(16*fs)}px ${ovFont()}`; ctx.fillStyle=pwColor; ctx.textBaseline='top';
  ctx.fillText(pw!=null?Math.round(pw)+'W':'--W', tx, py+Math.round(18*fs));
  ctx.font=`${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.textBaseline='top';
  ctx.fillText(pw!=null?Math.round(pctFTP*100)+'% FTP':'-- FTP', tx, py+Math.round(36*fs));
  ctx.restore();
}

function drawDistanceOverlay(ctx, pt, W, H) {
  const fs=ovFS('distance'); const bgOn=checkBg('distance');
  const distKm=((pt.cumDist-gpxData.points[tfS0].cumDist)/1000);
  const dStyle=window._distStyle||'panel';
  ctx.save();

  if(dStyle==='odo'){
    const dW=Math.round(12*fs), dH=Math.round(18*fs);
    const scaledW=Math.round(dW*odoScale), scaledH=Math.round(dH*odoScale);
    const dotW=Math.round(scaledW*0.45); const pad2=Math.round(2*fs);
    const totalIntDigits=3;
    const drumsTotalW=totalIntDigits*(scaledW+pad2)+(scaledW+pad2)+dotW+pad2;
    const lblW=Math.round(30*fs); const unitW=Math.round(28*fs);
    const panW=lblW+drumsTotalW+unitW+Math.round(12*fs);
    const panH=scaledH+Math.round(14*fs);
    const{x:ox,y:oy}=posXY(oPos.distance,W,H,panW,panH);
    if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath(); ctx.roundRect(ox,oy,panW,panH,Math.round(5*fs)); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=Math.round(fs*0.6); ctx.beginPath(); ctx.roundRect(ox,oy,panW,panH,Math.round(5*fs)); ctx.stroke(); }
    ctx.font=`bold ${Math.round(8*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.55; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText('DIST',ox+Math.round(6*fs),oy+panH/2); ctx.globalAlpha=1;
    const intPart=Math.floor(distKm);
    const nIntDigits=Math.max(1,String(intPart).length);
    const leadZeros=Math.max(0,totalIntDigits-nIntDigits);
    let cx2=ox+lblW; const r2=Math.round(3*fs);
    const odoYO=oy+(panH-scaledH)/2;
    for(let z=0;z<leadZeros;z++){
      ctx.save(); ctx.fillStyle='rgba(0,0,0,0.92)'; ctx.beginPath(); ctx.roundRect(cx2,odoYO,scaledW,scaledH,r2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(cx2,odoYO,scaledW,scaledH,r2); ctx.clip();
      ctx.font=`bold ${Math.round(scaledH*0.68)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.25; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('0',cx2+scaledW/2,odoYO+scaledH/2); ctx.restore(); cx2+=scaledW+pad2;
    }
    const usedW=drawOdometer(ctx,distKm,distDecimals,cx2,odoYO,dW,dH,fs,textColor,panelOp+0.3,odoScale);
    ctx.font=`bold ${Math.round(11*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.8; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText('km',cx2+usedW+Math.round(5*fs),oy+panH/2); ctx.globalAlpha=1;

  } else {
    const panW=Math.round(140*fs), panH=Math.round(42*fs);
    const{x:px,y:py}=posXY(oPos.distance,W,H,panW,panH);
    if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath(); ctx.roundRect(px,py,panW,panH,Math.round(6*fs)); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=Math.round(fs*0.5); ctx.beginPath(); ctx.roundRect(px,py,panW,panH,Math.round(6*fs)); ctx.stroke(); }
    const dStr=distKm.toFixed(distDecimals)+' km';
    ctx.font=`${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.5; ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText('DIST', px+Math.round(8*fs), py+Math.round(6*fs));
    ctx.font=`bold ${Math.round(16*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=1; ctx.textBaseline='bottom';
    ctx.fillText(dStr, px+Math.round(8*fs), py+panH-Math.round(6*fs));
  }
  ctx.restore();
}

function drawAltitudeOverlay(ctx, pt, W, H) {
  const fs=ovFS('altitude'); const bgOn=checkBg('altitude');
  const ele=Math.round(pt.ele); const grade=pt.grade||0;
  const isUp=grade>0.3, isDn=grade<-0.3;
  const gradeColor=isUp?'#ff8844':isDn?'#44aaff':textColor;
  const aStyle=window._altStyle||'panel';
  ctx.save();

  if(aStyle==='gauge'){
    const minE=Math.round(gpxData.minEle), maxE=Math.round(gpxData.maxEle);
    const range=maxE-minE||1; const prog=Math.min(1,Math.max(0,(pt.ele-minE)/range));
    const R=Math.round(44*fs); const sz=R*2+Math.round(12*fs);
    const{x:ax,y:ay}=posXY(oPos.altitude,W,H,sz,sz);
    const cx=ax+sz/2, cy=ay+sz/2;
    const startA=Math.PI*(5/6), sweepA=Math.PI*(4/3);
    if(bgOn){ ctx.beginPath(); ctx.arc(cx,cy,R+Math.round(4*fs),0,Math.PI*2); ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.fill(); }
    ctx.beginPath(); ctx.arc(cx,cy,R,startA,startA+sweepA); ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=Math.round(7*fs); ctx.lineCap='round'; ctx.stroke();
    if(prog>0.005){
      ctx.beginPath(); ctx.arc(cx,cy,R,startA,startA+prog*sweepA); ctx.strokeStyle=textColor; ctx.lineWidth=Math.round(7*fs); ctx.lineCap='round'; ctx.stroke();
    }
    ctx.font=`bold ${Math.round(16*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(ele+'m',cx,cy-Math.round(3*fs));
    ctx.font=`${Math.round(7*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.4; ctx.textBaseline='top'; ctx.fillText('ALT',cx,cy+Math.round(12*fs)); ctx.globalAlpha=1;
    ctx.font=`${Math.round(7*fs)}px ${ovFont()}`; ctx.fillStyle=gradeColor; ctx.globalAlpha=0.7; ctx.textBaseline='bottom';
    ctx.fillText((isUp?'▲':isDn?'▼':'─')+' '+grade.toFixed(1)+'%',cx,ay+sz-Math.round(4*fs)); ctx.globalAlpha=1;

  } else {
    const panW=Math.round(140*fs), panH=Math.round(42*fs);
    const{x:px,y:py}=posXY(oPos.altitude,W,H,panW,panH);
    if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath(); ctx.roundRect(px,py,panW,panH,Math.round(6*fs)); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=Math.round(fs*0.5); ctx.beginPath(); ctx.roundRect(px,py,panW,panH,Math.round(6*fs)); ctx.stroke(); }
    ctx.font=`${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=0.5; ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText('ALT', px+Math.round(8*fs), py+Math.round(6*fs));
    ctx.font=`bold ${Math.round(16*fs)}px ${ovFont()}`; ctx.fillStyle=textColor; ctx.globalAlpha=1; ctx.textBaseline='bottom';
    ctx.fillText(ele+' m', px+Math.round(8*fs), py+panH-Math.round(6*fs));
    if(Math.abs(grade)>0.3){
      ctx.font=`${Math.round(8*fs)}px ${ovFont()}`; ctx.fillStyle=gradeColor; ctx.globalAlpha=0.85; ctx.textAlign='right'; ctx.textBaseline='bottom';
      ctx.fillText((isUp?'▲':isDn?'▼':'─')+grade.toFixed(1)+'%', px+panW-Math.round(8*fs), py+panH-Math.round(6*fs));
    }
    ctx.globalAlpha=1;
  }
  ctx.restore();
}

function drawProgOverlay(ctx, W, H, prog) {
  ctx.save();
  ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(0,H-5,W,5); 
  ctx.fillStyle=textColor;ctx.fillRect(0,H-5,W*prog,5);
  ctx.restore();
}

function drawWatermarkOverlay(ctx, W, H) {
  const fs = ovFS('watermark');
  ctx.save();
  ctx.globalAlpha = customWatermarkOpacity;

  if(customWatermarkImage && customWatermarkImage.complete && customWatermarkImage.naturalWidth > 0){
    const img = customWatermarkImage;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const maxH = Math.round(60 * fs);
    const dw = Math.round(iw * (maxH / ih));
    const dh = maxH;
    const {x, y} = posXY(oPos.watermark, W, H, dw, dh);
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = Math.round(4*fs);
    ctx.shadowOffsetY = Math.round(1*fs);
    ctx.drawImage(img, x, y, dw, dh);
  } else {
    const text = "GPXGreenscreen";
    ctx.font = `800 ${Math.round(24*fs)}px 'Syne', sans-serif`;
    if('letterSpacing' in ctx) ctx.letterSpacing = `-${Math.round(0.8*fs)}px`;
    const boxW = ctx.measureText(text).width;
    const boxH = Math.round(26*fs);
    const {x, y} = posXY(oPos.watermark, W, H, boxW, boxH);
    ctx.fillStyle = textColor;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = Math.round(6*fs);
    ctx.shadowOffsetY = Math.round(2*fs);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}