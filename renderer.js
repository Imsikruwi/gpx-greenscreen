// ═══════════════════════════════════════════════════════════
// PREVIEW BACKGROUND IMAGE RENDERER
// ═══════════════════════════════════════════════════════════

function drawPreviewBgImage(ctx, img, fit, W, H){
  const iw=img.naturalWidth, ih=img.naturalHeight;
  if(!iw||!ih) return;
  const scaleX=W/iw, scaleY=H/ih;
  ctx.save();
  switch(fit){
    case 'fit': {
      const s=Math.min(scaleX,scaleY);
      const dw=iw*s, dh=ih*s;
      ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);
      ctx.drawImage(img,0,0,iw,ih,(W-dw)/2,(H-dh)/2,dw,dh);
      break;
    }
    case 'fill': {
      const s=Math.max(scaleX,scaleY);
      const dw=iw*s, dh=ih*s;
      ctx.drawImage(img,0,0,iw,ih,(W-dw)/2,(H-dh)/2,dw,dh);
      break;
    }
    case 'stretch':
      ctx.drawImage(img,0,0,iw,ih,0,0,W,H);
      break;
    case 'center':
      ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);
      ctx.drawImage(img,(W-iw)/2,(H-ih)/2);
      break;
    case 'span': {
      const s=Math.max(scaleX,scaleY);
      ctx.drawImage(img,0,0,iw,ih,0,0,iw*s,ih*s);
      break;
    }
    default:
      ctx.drawImage(img,0,0,iw,ih,0,0,W,H);
  }
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════
// MAIN DRAWING ENGINE
// ═══════════════════════════════════════════════════════════

function drawFrame(fi){ 
  if(!gpxData) return; 
  const n = Math.min(Math.max(fi, tfS0), tfE0); 
  drawFrameWithPt(n, gpxData.points[n]); 
}

function drawFrameIfChanged(fi){ 
  if(!gpxData) return; 
  const n = Math.min(Math.max(fi, tfS0), tfE0); 
  if(n === _lastDrawnFrame) return; 
  _lastDrawnFrame = n; 
  drawFrameWithPt(n, gpxData.points[n]); 
}

function drawFrameWithPt(n, pt){
  if(!gpxData) return;
  const {points} = gpxData; 
  const {W,H} = resWH();
  const tfLen = tfE0 - tfS0 || 1; 
  const prog = (n - tfS0) / tfLen;

  ctx.clearRect(0,0,W,H);

  const _useBgImg = previewBgImage && previewBgEnabled &&
                    (previewBgIncludeExport || !isRendering);
  if(_useBgImg){
    drawPreviewBgImage(ctx, previewBgImage, previewBgFit, W, H);
  } else {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0,0,W,H);
  }

  if(opts.map)       drawMapOverlay(ctx, pt, points, n, W, H);
  if(opts.speed)     drawSpeedOverlay(ctx, pt, n, W, H);
  if(opts.info)      drawInfoOverlay(ctx, pt, n, W, H);
  if(opts.arc)       drawArcOverlay(ctx, prog, W, H);
  if(opts.gpstime)   drawGpsTimeOverlay(ctx, pt, W, H);
  if(opts.coords)    drawCoordsOverlay(ctx, pt, W, H);
  if(opts.elev)      drawElevOverlay(ctx, pt, points, n, W, H, prog);
  if(opts.gforce)    drawGForceOverlay(ctx, pt, W, H);
  if(opts.compass)   drawCompassOverlay(ctx, pt, W, H);
  if(opts.grade)     drawGradeOverlay(ctx, pt, W, H);
  if(opts.odometer)  drawOdometerOverlay(ctx, pt, W, H);
  if(opts.distance)  drawDistanceOverlay(ctx, pt, W, H);
  if(opts.altitude)  drawAltitudeOverlay(ctx, pt, W, H);
  if(opts.heartrate){
    if(window._hrStyle==='wave') drawHeartrateWaveOverlay(ctx, pt, n, W, H);
    else drawHeartrateOverlay(ctx, pt, W, H);
  }
  if(opts.cadence)   drawCadenceOverlay(ctx, pt, W, H);
  if(opts.power){
    if(window._powerStyle==='arc') drawPowerArcOverlay(ctx, pt, W, H);
    else drawPowerOverlay(ctx, pt, W, H);
  }
  if(opts.prog)      drawProgOverlay(ctx, W, H, prog);
  if(opts.watermark) drawWatermarkOverlay(ctx, W, H);
}
