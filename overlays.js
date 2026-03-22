// ═══════════════════════════════════════════════════════════
// OVERLAY DRAWING MODULE
// ═══════════════════════════════════════════════════════════

// Helper untuk mengecek apakah background sedang menyala.
// Per-overlay toggle selalu override global — bukan fallback.
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
// bekerja di kedua mode: pct (% of max) dan speed (fixed m/s)
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
    // Desimal: background putih; Integer: background hitam solid (tanpa gradasi)
    if(isDecimalDigit){ 
      c.fillStyle = 'rgba(255,255,255,0.95)'; 
    } else { 
      c.fillStyle = 'rgba(0,0,0,0.92)'; 
    }
    c.beginPath(); c.roundRect(cx, y, digitW, digitH, r); c.fill();
    // Clip untuk scroll
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
    // Garis tipis atas-bawah sebagai divider
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
  
  // 3. Draw Minimap Background
  if(bgOn && mapBgStyle !== 'trans'){ 
    ctx.fillStyle = bgFill; 
    if(osmMapShape === 'circle'){ 
      ctx.beginPath(); ctx.arc(mX+mS/2, mY+mS/2, mS/2, 0, Math.PI*2); ctx.fill(); 
    } else { 
      ctx.fillRect(mX, mY, mS, mS); 
    } 
  }
  
  // 4. Clip area if the shape is circular/rounded
  if(hasClip){ 
    ctx.beginPath(); 
    if(osmMapShape === 'circle') ctx.arc(mX+mS/2, mY+mS/2, mS/2, 0, Math.PI*2); 
    else ctx.roundRect(mX, mY, mS, mS, Math.round(8*fs)); 
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
  
  const ghostAlpha = mapBgStyle === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)';
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
    else ctx.roundRect(mX, mY, mS, mS, Math.round(8*fs));
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = Math.round(1.5*fs); ctx.stroke(); 
    ctx.restore();
  }
}

function drawSpeedOverlay(ctx, pt, n, W, H) {
  const fs=ovFS('speed');
  const bgOn = checkBg('speed');
  const spd=pt.speed_ms; const maxSpd=spdMaxMode==='auto'?gpxData.maxSpeedMs:(spdMaxCustom||gpxData.maxSpeedMs);
  const spdProg=Math.min(1,Math.max(0,cvtSpd(spd)/cvtSpd(maxSpd))); const distKm=((pt.cumDist-gpxData.points[tfS0].cumDist)/1000); const elevStr=Math.round(pt.ele)+' m';
  
  function drawDistStrip(sx,sy,sw){
    if(!opts.distov) return 0;
    const odoSH  = distOdoMode ? Math.round(22*fs*odoScale) + Math.round(10*fs) : 0; const stripH = distOdoMode ? Math.max(Math.round(32*fs), odoSH) : Math.round(28*fs);
    
    if(bgOn){
        ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.fillRect(sx, sy, sw, stripH);
        ctx.beginPath(); ctx.moveTo(sx, sy);ctx.lineTo(sx+sw, sy); ctx.lineTo(sx+sw, sy+stripH-Math.round(6*fs)); ctx.quadraticCurveTo(sx+sw, sy+stripH, sx+sw-Math.round(6*fs), sy+stripH); ctx.lineTo(sx+Math.round(6*fs), sy+stripH); ctx.quadraticCurveTo(sx, sy+stripH, sx, sy+stripH-Math.round(6*fs)); ctx.lineTo(sx, sy);
        ctx.fillStyle=`rgba(255,255,255,0.05)`;ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=Math.round(fs*0.5); ctx.beginPath();ctx.moveTo(sx+6,sy);ctx.lineTo(sx+sw-6,sy);ctx.stroke();
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
    const ndx=cx+Math.cos(needleA)*rArc, ndy=cy+Math.sin(needleA)*rArc; ctx.beginPath();ctx.arc(ndx,ndy,Math.round(9*fs),0,Math.PI*2);ctx.fillStyle='rgba(255,60,40,0.3)';ctx.fill(); ctx.beginPath();ctx.arc(ndx,ndy,Math.round(5*fs),0,Math.PI*2);ctx.fillStyle='#ff3a2a';ctx.fill(); ctx.beginPath();ctx.arc(ndx,ndy,Math.round(2.5*fs),0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
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
    ctx.beginPath();ctx.arc(gcx,gcy,Math.round(5*fs),0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.9)';ctx.fill(); ctx.beginPath();ctx.arc(gcx,gcy,Math.round(3*fs),0,Math.PI*2);ctx.fillStyle=textColor;ctx.fill(); ctx.beginPath();ctx.arc(gcx,gcy,Math.round(1.5*fs),0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fill();
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
  } else if(spdStyle==='hud'){
    const gaugeR = Math.round(28*fs); const gcyPadH = Math.round(5*fs); const panH = Math.round(gaugeR*2 + 12*fs + gcyPadH); const panW = Math.round(gaugeR*2 + 90*fs); const odoHH = distOdoMode ? Math.round(16*fs*odoScale) + Math.round(8*fs) : 0; const distH = opts.distov ? (distOdoMode ? Math.max(Math.round(22*fs), odoHH) : Math.round(22*fs)) : 0; const{x:px,y:py}=posXY(oPos.speed,W,H,panW,panH+distH);
    ctx.save(); 
    if(bgOn){
        ctx.fillStyle=`rgba(10,10,10,${Math.min(0.92,panelOp+0.25)})`; ctx.beginPath();ctx.roundRect(px,py,panW,panH+distH,Math.round(5*fs));ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=Math.round(fs*0.7); ctx.beginPath();ctx.roundRect(px,py,panW,panH+distH,Math.round(5*fs));ctx.stroke();
    }
    const gcx = px + gaugeR + Math.round(8*fs); const gcy = py + panH - gcyPadH - gaugeR; const sweepStart = Math.PI*(5/6), sweepEnd = Math.PI*(5/6+4/3); const sweepRange = sweepEnd - sweepStart; const needleA = sweepStart + spdProg*sweepRange;
    const nTick=32; for(let t=0;t<=nTick;t++){ const a=sweepStart+(t/nTick)*sweepRange; const isMaj=t%8===0, isMed=t%4===0; const r1=gaugeR, r2=gaugeR-(isMaj?Math.round(7*fs):isMed?Math.round(4*fs):Math.round(2.5*fs)); ctx.beginPath(); ctx.moveTo(gcx+Math.cos(a)*r1,gcy+Math.sin(a)*r1); ctx.lineTo(gcx+Math.cos(a)*r2,gcy+Math.sin(a)*r2); ctx.strokeStyle=isMaj?'rgba(255,255,255,0.65)':isMed?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.15)'; ctx.lineWidth=isMaj?Math.round(1.5*fs):Math.round(0.8*fs); ctx.stroke(); }
    const rArc=gaugeR-Math.round(10*fs); ctx.beginPath();ctx.arc(gcx,gcy,rArc,sweepStart,sweepEnd); ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=Math.round(3.5*fs);ctx.lineCap='butt';ctx.stroke();
    if(spdProg>0.005){
      const _dialCol3=dialArcSolidColor(spdProg,maxSpd);
      ctx.beginPath();ctx.arc(gcx,gcy,rArc,sweepStart,needleA);
      ctx.strokeStyle=_dialCol3||'rgba(255,255,255,0.5)';ctx.lineWidth=Math.round(3.5*fs);ctx.lineCap='butt';ctx.stroke();
    }
    ctx.save(); ctx.translate(gcx,gcy);ctx.rotate(needleA); ctx.shadowColor='rgba(255,255,255,0.4)';ctx.shadowBlur=Math.round(4*fs); ctx.beginPath(); ctx.moveTo(-Math.round(4*fs),0); ctx.lineTo(gaugeR-Math.round(5*fs),0); ctx.strokeStyle='#ffffff';ctx.lineWidth=Math.round(1.5*fs);ctx.lineCap='round';ctx.stroke(); ctx.shadowBlur=0; ctx.restore();
    ctx.beginPath();ctx.arc(gcx,gcy,Math.round(4*fs),0,Math.PI*2); ctx.fillStyle='rgba(10,10,10,1)';ctx.fill(); ctx.beginPath();ctx.arc(gcx,gcy,Math.round(2.5*fs),0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,0.85)';ctx.fill();
    const maxV=Math.round(cvtSpd(maxSpd)); const labelStep=maxV<=80?20:maxV<=160?40:maxV<=240?60:80; ctx.font=`${Math.round(7*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.35)';ctx.textAlign='center';ctx.textBaseline='middle'; for(let v=0;v<=maxV;v+=labelStep){ const a=sweepStart+(v/maxV)*sweepRange; const lr=gaugeR-Math.round(16*fs); ctx.fillText(String(v),gcx+Math.cos(a)*lr,gcy+Math.sin(a)*lr); }
    const txtX=px+gaugeR*2+Math.round(14*fs); ctx.font=`${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.textAlign='left';ctx.textBaseline='top'; ctx.fillText('SPEED',txtX,py+Math.round(7*fs));
    ctx.font=`bold ${Math.round(28*fs)}px ${ovFont()}`; ctx.fillStyle='#ffffff';ctx.textBaseline='top'; const numStr=fmtSpd(spd); ctx.fillText(numStr,txtX,py+Math.round(16*fs));
    const numWd=ctx.measureText(numStr).width; ctx.font=`bold ${Math.round(11*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.6)';ctx.textBaseline='bottom'; ctx.fillText(' '+spdLabel().toUpperCase(),txtX+numWd,py+Math.round(16*fs)+Math.round(28*fs));
    if(opts.distov){
      const dStr=distKm.toFixed(distDecimals)+' km'; const dY=py+panH; const lfsH=Math.round(7*fs); 
      if(bgOn){ ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=Math.round(fs*0.5); ctx.beginPath();ctx.moveTo(px+6,dY);ctx.lineTo(px+panW-6,dY);ctx.stroke(); }
      if(distOdoMode){
        const digitH=Math.round(16*fs), digitW=Math.round(11*fs); ctx.font=`${lfsH}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.45)';ctx.textAlign='left';ctx.textBaseline='middle';ctx.globalAlpha=1; ctx.fillText('DIST',px+Math.round(6*fs),dY+distH/2);
        const odoXH=px+Math.round(30*fs), odoYH=dY+(distH-digitH)/2; drawOdometer(ctx,distKm,distDecimals,odoXH,odoYH,digitW,digitH,fs,'#ffffff',0.9,odoScale);
        const estWH=(distKm.toFixed(distDecimals).length+1)*(digitW+Math.round(2*fs)); ctx.font=`${lfsH}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.45)';ctx.textAlign='left';ctx.textBaseline='middle'; ctx.fillText('km',odoXH+estWH,dY+distH/2);
        if(distShowElev){ ctx.textAlign='right'; ctx.fillText('ALT '+elevStr,px+panW-Math.round(6*fs),dY+distH/2); }
      } else if(distShowElev){
        const hw=panW/2; 
        if(bgOn){ ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=Math.round(fs*0.5); ctx.beginPath();ctx.moveTo(px+hw,dY+3);ctx.lineTo(px+hw,dY+distH-3);ctx.stroke(); }
        [[' DIST',dStr,px+hw/2],[' ALT',elevStr,px+hw+hw/2]].forEach(([lbl,val,cx2])=>{ ctx.font=`${lfsH}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.45)';ctx.textAlign='center';ctx.textBaseline='top'; ctx.fillText(lbl,cx2,dY+Math.round(3*fs)); ctx.font=`bold ${Math.round(10*fs)}px ${ovFont()}`; ctx.fillStyle='#ffffff';ctx.textBaseline='top'; ctx.fillText(val,cx2,dY+Math.round(3*fs)+Math.round(8*fs)); });
      } else { ctx.font=`${lfsH}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.45)';ctx.textAlign='left';ctx.textBaseline='top'; ctx.fillText('DIST',px+Math.round(6*fs),dY+Math.round(4*fs)); ctx.font=`bold ${Math.round(10*fs)}px ${ovFont()}`; ctx.fillStyle='#ffffff';ctx.textAlign='right';ctx.textBaseline='top'; ctx.fillText(dStr,px+panW-Math.round(6*fs),dY+Math.round(4*fs)); }
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
  }
}

function drawInfoOverlay(ctx, pt, n, W, H) {
  const fs=ovFS('info'); const bgOn = checkBg('info'); const pw=Math.round(210*fs),ph=Math.round(118*fs); const{x:px,y:py}=posXY(oPos.info,W,H,pw,ph); 
  ctx.save(); 
  if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath();ctx.roundRect(px,py,pw,ph,10);ctx.fill(); }
  const lh=Math.round(22*fs); const startY=py+Math.round(16*fs); const t0=gpxData.points[tfS0].time||gpxData.points[0].time; 
  const elapsed=pt.time&&t0?(pt.time-t0)/1000:(n-tfS0); const distKm=((pt.cumDist-gpxData.points[tfS0].cumDist)/1000).toFixed(2); 
  const avgSpd=elapsed>0?cvtSpd((pt.cumDist-gpxData.points[tfS0].cumDist)/elapsed):0; 
  const rows=[['DIST',distKm+' km'],['ELEV',Math.round(pt.ele)+' m'],['TIME',fmtTime(elapsed)],['AVG',avgSpd.toFixed(1)+' '+spdLabel()]]; 
  rows.forEach(([lbl,val],i)=>{ const ry=startY+i*lh; ctx.font=`${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.globalAlpha=.45;ctx.textAlign='left'; ctx.fillText(lbl,px+12,ry); ctx.font=`bold ${Math.round(13*fs)}px ${ovFont()}`; ctx.globalAlpha=1; ctx.fillText(val,px+12,ry+Math.round(11*fs)); }); 
  ctx.restore();
}

function drawArcOverlay(ctx, prog, W, H) {
  const fs=ovFS('arc'); const bgOn = checkBg('arc'); const ar=Math.round(52*fs),asz=ar*2+4; const{x:ax0,y:ay0}=posXY(oPos.arc,W,H,asz,asz); const ax=ax0+ar+2,ay=ay0+ar+2; 
  ctx.save(); 
  if(bgOn){
      ctx.beginPath();ctx.arc(ax,ay,ar,0,Math.PI*2); ctx.fillStyle=`rgba(0,0,0,${panelOp})`;ctx.fill(); 
      ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=Math.round(6*fs);ctx.lineCap='round'; 
      ctx.beginPath();ctx.arc(ax,ay,ar-Math.round(5*fs),-Math.PI*.75,Math.PI*.75);ctx.stroke(); 
  }
  ctx.strokeStyle=textColor; ctx.lineWidth=Math.round(6*fs);ctx.lineCap='round'; 
  const ea=-Math.PI*.75+prog*Math.PI*1.5; ctx.beginPath();ctx.arc(ax,ay,ar-Math.round(5*fs),-Math.PI*.75,ea);ctx.stroke(); 
  ctx.fillStyle=textColor; ctx.font=`bold ${Math.round(17*fs)}px ${ovFont()}`; ctx.textAlign='center';ctx.textBaseline='middle'; ctx.fillText(Math.round(prog*100)+'%',ax,ay); 
  ctx.restore();
}

function drawGpsTimeOverlay(ctx, pt, W, H) {
  const fs=ovFS('gpstime'); const bgOn = checkBg('gpstime'); ctx.save(); let ts='--:--',ds=''; 
  if(pt.time){ const d=pt.time; const hh=String(d.getHours()).padStart(2,'0'); const mm=String(d.getMinutes()).padStart(2,'0'); const ss=String(d.getSeconds()).padStart(2,'0'); 
    if(gpsFmt==='hms')ts=hh+':'+mm+':'+ss; else if(gpsFmt==='hm')ts=hh+':'+mm; 
    else{ const t0=gpxData.points[tfS0].time||gpxData.points[0].time; const el=t0?Math.round((d-t0)/1000):0; ts=String(Math.floor(el/60)).padStart(2,'0')+':'+String(el%60).padStart(2,'0'); } 
    if(gpsShowDate)ds=d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); } 
  const bigF=Math.round(30*fs),smF=Math.round(12*fs); ctx.font=`bold ${bigF}px ${ovFont()}`; const tw=ctx.measureText(ts).width; const bw=Math.max(tw+Math.round(28*fs),Math.round(180*fs)); const bh=gpsShowDate?Math.round(58*fs):Math.round(42*fs); 
  const{x:gx,y:gy}=posXY(oPos.gpstime,W,H,bw,bh); 
  if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath();ctx.roundRect(gx,gy,bw,bh,8);ctx.fill(); }
  ctx.fillStyle=textColor;ctx.textAlign='center';ctx.textBaseline='top'; ctx.fillText(ts,gx+bw/2,gy+Math.round(7*fs)); 
  if(gpsShowDate&&ds){ ctx.font=`${smF}px ${ovFont()}`; ctx.globalAlpha=.5; ctx.fillText(ds,gx+bw/2,gy+Math.round(7*fs)+bigF+2); } 
  ctx.restore();
}

function drawCoordsOverlay(ctx, pt, W, H) {
  const fs=ovFS('coords'); const bgOn = checkBg('coords'); ctx.save(); 
  function toDMS(deg, isLat){ const abs=Math.abs(deg); const d=Math.floor(abs); const mf=(abs-d)*60; const m=Math.floor(mf); const s=((mf-m)*60).toFixed(1); const dir=isLat?(deg>=0?'N':'S'):(deg>=0?'E':'W'); return dir+String(d).padStart(isLat?2:3,'0')+'° '+String(m).padStart(2,'0')+"' "+String(s).padStart(4,'0')+'"'; } 
  function toDD(deg, isLat){ const dir=isLat?(deg>=0?'N':'S'):(deg>=0?'E':'W'); return dir+' '+Math.abs(deg).toFixed(6)+'°'; } 
  const latStr = coordFmt==='dms' ? toDMS(pt.lat,true) : toDD(pt.lat,true); const lonStr = coordFmt==='dms' ? toDMS(pt.lon,false) : toDD(pt.lon,false); 
  const lineF=Math.round(15*fs); const iconF=Math.round(18*fs); const pad=Math.round(12*fs); const iconW=coordShowIcon?Math.round(26*fs):0; const lineGap=Math.round(4*fs); 
  ctx.font=`bold ${lineF}px ${ovFont()}`; const latW=ctx.measureText(latStr).width; const lonW=ctx.measureText(lonStr).width; const textW=Math.max(latW,lonW); const boxW=iconW+textW+pad*2+(iconW>0?Math.round(6*fs):0); const boxH=lineF*2+lineGap+pad*2; 
  const{x:cx,y:cy}=posXY(oPos.coords,W,H,boxW,boxH); 
  if(bgOn){
      ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath();ctx.roundRect(cx,cy,boxW,boxH,Math.round(8*fs));ctx.fill(); 
      ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=Math.round(fs*0.5); ctx.beginPath();ctx.roundRect(cx,cy,boxW,boxH,Math.round(8*fs));ctx.stroke(); 
  }
  if(coordShowIcon){ const icx=cx+pad+iconW/2; const icy=cy+boxH/2; const ir=Math.round(7*fs); ctx.strokeStyle=textColor;ctx.lineWidth=Math.round(1.5*fs); ctx.beginPath();ctx.arc(icx,icy,ir,0,Math.PI*2);ctx.stroke(); ctx.fillStyle=textColor; ctx.beginPath();ctx.arc(icx,icy,Math.round(2.5*fs),0,Math.PI*2);ctx.fill(); } 
  const tx=cx+iconW+(iconW>0?Math.round(6*fs):0)+pad; const ty1=cy+pad; const ty2=cy+pad+lineF+lineGap; 
  ctx.font=`bold ${lineF}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.textAlign='left';ctx.textBaseline='top'; ctx.globalAlpha=1; ctx.fillText(latStr,tx,ty1); ctx.fillText(lonStr,tx,ty2); 
  ctx.restore();
}

function drawElevOverlay(ctx, pt, points, n, W, H, prog) {
  const fs=ovFS('elev'); const bgOn = checkBg('elev'); const gW=Math.round(290*fs),gH=Math.round(58*fs); const{x:gX,y:gY}=posXY(oPos.elev,W,H,gW,gH); 
  ctx.save(); 
  if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath();ctx.roundRect(gX-10,gY-8,gW+20,gH+16,8);ctx.fill(); }
  const eR=(gpxData.maxEle-gpxData.minEle)||1; const step=Math.max(1,Math.floor(points.length/gW)); 
  ctx.beginPath();ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=1.5;ctx.lineJoin='round'; 
  for(let i=0;i<points.length;i+=step){ const fx=gX+(i/points.length)*gW; const fy=gY+gH-((points[i].ele-gpxData.minEle)/eR)*gH; i===0?ctx.moveTo(fx,fy):ctx.lineTo(fx,fy); } ctx.stroke(); 
  ctx.beginPath();ctx.strokeStyle=textColor;ctx.lineWidth=2; 
  for(let i=0;i<=n;i+=step){ const fx=gX+(i/points.length)*gW; const fy=gY+gH-((points[i].ele-gpxData.minEle)/eR)*gH; i===0?ctx.moveTo(fx,fy):ctx.lineTo(fx,fy); } ctx.stroke(); 
  const mx=gX+prog*gW; const my=gY+gH-((pt.ele-gpxData.minEle)/eR)*gH; ctx.beginPath();ctx.arc(mx,my,4,0,Math.PI*2);ctx.fillStyle=textColor;ctx.fill(); 
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
  ctx.beginPath();ctx.arc(dotX,dotY,Math.round(5*fs),0,Math.PI*2); ctx.fillStyle=dotCol;ctx.fill(); ctx.strokeStyle='#fff';ctx.lineWidth=Math.round(fs);ctx.stroke(); 
  ctx.font=`bold ${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText('ACCEL',cx,gy+Math.round(4*fs)); ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText('BRAKE',cx,gy+sz-Math.round(4*fs)); ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('L',gx+Math.round(4*fs),cy); ctx.textAlign='right';ctx.fillText('R',gx+sz-Math.round(4*fs),cy); 
  const totalG=Math.sqrt(gl*gl+gla*gla); ctx.font=`bold ${Math.round(16*fs)}px ${ovFont()}`; ctx.fillStyle=textColor;ctx.textAlign='center';ctx.textBaseline='middle'; ctx.fillText(totalG.toFixed(2)+'G',cx,cy); 
  ctx.restore();
}

function drawCompassOverlay(ctx, pt, W, H) {
  const fs=ovFS('compass'); const bgOn = checkBg('compass'); const hdg=pt.heading||0; const dirs=['N','NE','E','SE','S','SW','W','NW']; 
  ctx.save(); 
  if(window._compassStyle==='bar'){ 
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
  const fs=ovFS('grade'); const bgOn = checkBg('grade'); const grade=pt.grade||0; const absg=Math.abs(grade); const isUp=grade>0.3, isDn=grade<-0.3; const gradeStr=(grade>=0?'+':'')+grade.toFixed(1)+'%'; const icon=isUp?'▲':isDn?'▼':'—'; const gradColor=isUp?'#ff8844':isDn?'#44aaff':textColor; 
  const gW=Math.round(140*fs), gH=Math.round(52*fs); const{x:grx,y:gry}=posXY(oPos.grade,W,H,gW,gH); 
  ctx.save(); 
  if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath();ctx.roundRect(grx,gry,gW,gH,8);ctx.fill(); }
  const barW=gW-Math.round(20*fs), barH=Math.round(5*fs); const bx=grx+Math.round(10*fs), by=gry+gH-Math.round(12*fs); const maxG=15; const fillW=Math.min(1,absg/maxG)*(barW/2); 
  ctx.fillStyle='rgba(255,255,255,0.1)';ctx.beginPath();ctx.roundRect(bx,by,barW,barH,barH/2);ctx.fill(); 
  const barMid=bx+barW/2; if(fillW>1){ ctx.fillStyle=gradColor; if(isUp){ ctx.beginPath();ctx.roundRect(barMid,by,fillW,barH,barH/2);ctx.fill(); } else if(isDn){ ctx.beginPath();ctx.roundRect(barMid-fillW,by,fillW,barH,barH/2);ctx.fill(); } } 
  ctx.fillStyle='rgba(255,255,255,0.4)';ctx.fillRect(barMid-Math.round(fs*0.5),by-2,Math.round(fs),barH+4); 
  ctx.font=`${Math.round(10*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.5)';ctx.textAlign='center';ctx.textBaseline='top'; ctx.fillText('GRADE',grx+gW/2,gry+Math.round(5*fs)); 
  ctx.font=`bold ${Math.round(18*fs)}px ${ovFont()}`; ctx.fillStyle=gradColor;ctx.textBaseline='top'; ctx.fillText(icon+' '+gradeStr,grx+gW/2,gry+Math.round(16*fs)); 
  ctx.restore();
}


function drawOdometerOverlay(ctx, pt, W, H) {
  const fs=ovFS('odometer'); const bgOn = checkBg('odometer'); 
  const distKmO=((pt.cumDist-gpxData.points[tfS0].cumDist)/1000); 
  const intPart=Math.floor(distKmO); 
  const dW=Math.round(12*fs), dH=Math.round(18*fs); 
  const scaledW=Math.round(dW*odoScale2), scaledH=Math.round(dH*odoScale2); 
  const dotW=Math.round(scaledW*0.45); const pad2=Math.round(2*fs); 
  // Selalu 3 digit integer + 1 desimal = 4 kolom + 1 titik
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
  // Hitung berapa leading zeros yang perlu digambar (selalu total 3 digit integer)
  const nIntDigits=Math.max(1, String(intPart).length); 
  const leadZeros=Math.max(0, totalIntDigits - nIntDigits); 
  for(let z=0;z<leadZeros;z++){ 
    ctx.save(); 
    // Hitam solid — tanpa gradasi
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
  if(hr!=null){ const barX=hx+Math.round(8*fs), barY=hy+panH-Math.round(7*fs); const barW=panW-Math.round(16*fs), barH=Math.round(3*fs); ['#4a9ef0','#4af0a0','#f0d04a','#f0a04a','#ff4444'].forEach((col,i)=>{ ctx.fillStyle=col;ctx.fillRect(barX+i*(barW/5),barY,barW/5-1,barH); }); const pct=Math.min(1,Math.max(0,hr/hrMaxBpm)); ctx.fillStyle='#fff';ctx.fillRect(barX+pct*barW-1,barY-Math.round(fs),2,barH+Math.round(2*fs)); } 
  ctx.restore();
}

function drawCadenceOverlay(ctx, pt, W, H) {
  const fs=ovFS('cadence'); const bgOn = checkBg('cadence'); const cad = pt.cad; const panW=Math.round(150*fs), panH=Math.round(56*fs); const{x:cx2,y:cy2}=posXY(oPos.cadence,W,H,panW,panH); 
  ctx.save(); 
  if(bgOn){ ctx.fillStyle=`rgba(0,0,0,${panelOp})`; ctx.beginPath();ctx.roundRect(cx2,cy2,panW,panH,Math.round(7*fs));ctx.fill(); }
  ctx.font=`bold ${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.45)';ctx.textAlign='left';ctx.textBaseline='top'; ctx.fillText('🔄 CADENCE',cx2+Math.round(8*fs),cy2+Math.round(6*fs)); 
  const cadStr = cad!=null ? String(Math.round(cad)) : '--'; ctx.font=`bold ${Math.round(26*fs)}px ${ovFont()}`; ctx.fillStyle='#4a9ef0';ctx.textBaseline='top'; ctx.fillText(cadStr,cx2+Math.round(8*fs),cy2+Math.round(16*fs)); 
  const cW=ctx.measureText(cadStr).width; ctx.font=`${Math.round(9*fs)}px ${ovFont()}`; ctx.fillStyle='rgba(255,255,255,0.5)';ctx.textBaseline='bottom'; ctx.fillText('rpm',cx2+Math.round(8*fs)+cW+Math.round(3*fs),cy2+panH-Math.round(8*fs)); 
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

function drawProgOverlay(ctx, W, H, prog) {
  ctx.save();
  ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(0,H-5,W,5); 
  ctx.fillStyle=textColor;ctx.fillRect(0,H-5,W*prog,5);
  ctx.restore();
}

// Ensure Watermark function is here (Outside other functions)
function drawWatermarkOverlay(ctx, W, H) {
  const fs = ovFS('watermark'); 
  const text = "GPXGreenscreen";
  
  ctx.save();
  
  // 1. Font disamakan dengan header: Syne, tebal (800), ukuran proporsional (24px)
  ctx.font = `800 ${Math.round(24*fs)}px 'Syne', sans-serif`; 
  
  // Rapatkan jarak huruf agar identik dengan logo di header (jika browser mendukung)
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = `-${Math.round(0.8 * fs)}px`;
  }

  // Hitung ukuran aktual dari teks
  const boxW = ctx.measureText(text).width;
  const boxH = Math.round(26*fs); 

  const {x, y} = posXY(oPos.watermark, W, H, boxW, boxH);

  // 2. Warna font putih murni, tanpa background kotak & tanpa titik
  ctx.fillStyle = '#ffffff'; 
  
  // 3. Beri drop shadow tipis agar tetap terbaca jika background video terang
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = Math.round(6*fs);
  ctx.shadowOffsetY = Math.round(2*fs);

  ctx.textAlign = 'left'; 
  ctx.textBaseline = 'top';
  
  // 4. Gambar teksnya
  ctx.fillText(text, x, y);
  
  ctx.restore();
}