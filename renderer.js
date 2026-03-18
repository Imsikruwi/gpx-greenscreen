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

  // Clear Canvas Background
  ctx.clearRect(0,0,W,H); 
  ctx.fillStyle = bgColor; 
  ctx.fillRect(0,0,W,H);

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