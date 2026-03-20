// ═══════════════════════════════════════════════════════════
// PREVIEW BACKGROUND IMAGE RENDERER
// ═══════════════════════════════════════════════════════════

function drawPreviewBgImage(ctx, img, fit, W, H){
  const iw = img.naturalWidth, ih = img.naturalHeight;
  if(!iw || !ih) return;
  const scaleX = W / iw, scaleY = H / ih;
  let sx=0, sy=0, sw=iw, sh=ih, dx=0, dy=0, dw=W, dh=H;

  switch(fit){
    case 'fit': {
      // Gambar penuh masuk canvas, ada letterbox
      const s = Math.min(scaleX, scaleY);
      dw = iw*s; dh = ih*s;
      dx = (W-dw)/2; dy = (H-dh)/2;
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);
      ctx.drawImage(img, 0,0,iw,ih, dx,dy,dw,dh);
      break;
    }
    case 'fill': {
      // Gambar memenuhi canvas, dipotong sisi-sisi
      const s = Math.max(scaleX, scaleY);
      dw = iw*s; dh = ih*s;
      dx = (W-dw)/2; dy = (H-dh)/2;
      ctx.drawImage(img, 0,0,iw,ih, dx,dy,dw,dh);
      break;
    }
    case 'stretch': {
      // Gambar diregangkan penuh
      ctx.drawImage(img, 0,0,iw,ih, 0,0,W,H);
      break;
    }
    case 'center': {
      // Gambar di tengah tanpa scaling
      dx = (W-iw)/2; dy = (H-ih)/2;
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);
      ctx.drawImage(img, dx,dy);
      break;
    }
    case 'span': {
      // Alias fill tapi crop dari atas-kiri (tidak center)
      const s = Math.max(scaleX, scaleY);
      dw = iw*s; dh = ih*s;
      ctx.drawImage(img, 0,0,iw,ih, 0,0,dw,dh);
      break;
    }
    default:
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);
      ctx.drawImage(img, 0,0,iw,ih, 0,0,W,H);
  }
}



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

  // Clear Canvas Background
  ctx.clearRect(0,0,W,H);

  // Cek apakah bg image aktif untuk frame ini (preview atau export)
  const _useBgImg = previewBgImage && previewBgEnabled && (previewBgIncludeExport || !isRendering);
  if(_useBgImg){
    drawPreviewBgImage(ctx, previewBgImage, previewBgFit, W, H);
  } else {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0,0,W,H);
  }

  // Router Pemanggil Overlay
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
  if(opts.roadname)  drawRoadnameOverlay(ctx, pt, W, H);
  if(opts.odometer)  drawOdometerOverlay(ctx, pt, W, H);
  if(opts.heartrate) drawHeartrateOverlay(ctx, pt, W, H);
  if(opts.cadence)   drawCadenceOverlay(ctx, pt, W, H);
  if(opts.power)     drawPowerOverlay(ctx, pt, W, H);
  if(opts.prog)      drawProgOverlay(ctx, W, H, prog);
  if(opts.watermark) drawWatermarkOverlay(ctx, W, H);
}