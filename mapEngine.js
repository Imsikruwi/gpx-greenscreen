// ═══════════════════════════════════════════════════════════
// HYBRID MAP SYSTEM (TILE & VECTOR)
// ═══════════════════════════════════════════════════════════
const osmTileCache = new Map(); 
const osmOffscreenCvs = document.createElement('canvas');
const osmOffCtx = osmOffscreenCvs.getContext('2d');
const vecCache = new Map(); let vecFetching = false;

function mercX(lon){ return lon; }
function mercY(lat){ return Math.log(Math.tan(Math.PI/4 + lat*Math.PI/360)); }
function loadTile(z, x, y, style){ const url = tileUrl(z, x, y); if(osmTileCache.has(url)) return osmTileCache.get(url); const img = new Image(); img.onload = () => { osmTileCache.set(url, img); if(!isRendering && !playing) drawFrame(curFrame); }; img.onerror = () => osmTileCache.set(url, null); osmTileCache.set(url, img); img.src = url; return img; }
function tileXY(lat, lon, z){ const n = Math.pow(2, z); return { x: Math.floor((lon + 180) / 360 * n), y: Math.floor((1 - Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180)) / Math.PI) / 2 * n) }; }
function tileOrigin(tx, ty, z){ const n = Math.pow(2, z); const lon = tx / n * 360 - 180; const latR = Math.atan(Math.sinh(Math.PI * (1 - 2*ty/n))); return { lat: latR*180/Math.PI, lon }; }
function latLonToPx(lat, lon, z, oLat, oLon){ const n = Math.pow(2, z), sc = 256 * n; const ox = (oLon + 180)/360 * sc; const oy = (1 - Math.log(Math.tan(oLat*Math.PI/180) + 1/Math.cos(oLat*Math.PI/180)) / Math.PI) / 2 * sc; const px = (lon + 180)/360 * sc - ox; const lr = lat*Math.PI/180; const cosl = Math.cos(lr); if(Math.abs(cosl) < 1e-10) return {x:0, y:0}; const py = (1 - Math.log(Math.tan(lr) + 1/cosl) / Math.PI) / 2 * sc - oy; return { x:px, y:py }; }
function vecBBox(lat, lon, zoom, pxSize){ const degPerPx = 360 / (256 * Math.pow(2, zoom)); const half = degPerPx * pxSize / 2 * 1.4; const latDeg = half * (Math.cos(lat * Math.PI/180) || 0.01); return { s: lat - half, n: lat + half, w: lon - latDeg, e: lon + latDeg }; }
function vecCacheKey(lat, lon, zoom){ const grid = Math.pow(2, Math.max(0, zoom - 13)); const la = Math.round(lat * grid) / grid; const lo = Math.round(lon * grid) / grid; return `${zoom}:${la.toFixed(4)}:${lo.toFixed(4)}`; }
async function fetchVecData(bbox, cacheKey){
  const existing = vecCache.get(cacheKey); if(existing && existing.fetching) return;
  vecCache.set(cacheKey, {...(existing||{}), fetching:true, fetched:false}); vecFetching = true;
  const{s,n,w,e} = bbox;
  const query = `[out:json][timeout:10];(way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|service|path|footway|cycleway|track)$"](${s},${w},${n},${e});way["waterway"](${s},${w},${n},${e});way["natural"="water"](${s},${w},${n},${e});relation["natural"="water"](${s},${w},${n},${e});way["building"](${s},${w},${n},${e}););out geom qt;`;
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', { method:'POST', body:'data='+encodeURIComponent(query), headers:{'Content-Type':'application/x-www-form-urlencoded'} });
    if(!res.ok) throw new Error('HTTP '+res.status); const data = await res.json();
    const roads=[], water=[], buildings=[]; const hwRank = {motorway:10,trunk:9,primary:8,secondary:7,tertiary:6,residential:5,unclassified:4,service:3,path:2,footway:2,cycleway:2,track:1};
    data.elements.forEach(el=>{
      if(el.type!=='way'||!el.geometry) return; const coords = el.geometry.map(g=>({lat:g.lat,lon:g.lon})); const t = el.tags||{};
      if(t.highway) roads.push({coords, rank: hwRank[t.highway]||1, hw: t.highway, name: t.name||t['name:en']||t['name:id']||''}); else if(t.waterway||t.natural==='water') water.push({coords}); else if(t.building) buildings.push({coords});
    });
    vecCache.set(cacheKey, {roads, water, buildings, fetched:true, fetching:false}); vecFetching = false;
    if(!isRendering) drawFrame(curFrame);
  } catch(e) { vecCache.set(cacheKey, {roads:[], water:[], buildings:[], fetched:true, fetching:false, error:true}); vecFetching = false; }
}
function osmMapPxSize(){ return{sm:120,md:180,lg:240,xl:320}[osmMapSize]||180; }
const vecThemes = {
  standard: { bg:'#e8e0d8', water:'#aad3df', waterStroke:'#6aabcf', bldg:'#d4c9bc', bldgStroke:'#b8a99a', road:{10:'#e892a2',9:'#f9b29c',8:'#fcd6a4',7:'#fff',6:'#fff',5:'#fff',4:'#fff',def:'#e8e0d8'}, roadStroke:{10:'#dc6e88',9:'#e8895a',8:'#f0a43c',7:'#bbb',6:'#ccc',5:'#ccc',4:'#ccc',def:'#ddd'}, roadW:{10:5,9:4,8:3.5,7:2.5,6:2,5:1.5,4:1,def:0.8} },
  dark: { bg:'#1a1a2e', water:'#16213e', waterStroke:'#0f3460', bldg:'#2a2a3e', bldgStroke:'#3a3a5c', road:{10:'#ff6b6b',9:'#ff8e53',8:'#ffa500',7:'#888',6:'#666',5:'#555',4:'#444',def:'#333'}, roadStroke:{10:'#cc3333',9:'#cc5500',8:'#cc7700',7:'#555',6:'#444',5:'#333',4:'#222',def:'#222'}, roadW:{10:5,9:4,8:3.5,7:2.5,6:2,5:1.5,4:1,def:0.8} },
  night: { bg:'#0d1117', water:'#0a1628', waterStroke:'#1a3a6e', bldg:'#161b22', bldgStroke:'#21262d', road:{10:'#58a6ff',9:'#3fb950',8:'#d29922',7:'#4a5568',6:'#2d3748',5:'#2d3748',4:'#1a202c',def:'#1a202c'}, roadStroke:{10:'#1f6feb',9:'#2ea043',8:'#9e6a03',7:'#2d3748',6:'#1a202c',5:'#1a202c',4:'#111',def:'#111'}, roadW:{10:5,9:4,8:3.5,7:2.5,6:2,5:1.5,4:1,def:0.8} },
  satellite: { bg:'#2d3a2e', water:'#1a3a5c', waterStroke:'#1a5c8a', bldg:'#3a4a3a', bldgStroke:'#4a5a4a', road:{10:'#ffdd44',9:'#ffbb33',8:'#ff9922',7:'#aaa',6:'#888',5:'#666',4:'#555',def:'#444'}, roadStroke:{10:'#cc9900',9:'#cc7700',8:'#cc5500',7:'#666',6:'#555',5:'#444',4:'#333',def:'#333'}, roadW:{10:5,9:4,8:3.5,7:2.5,6:2,5:1.5,4:1,def:0.8} },
  minimal: { bg:'#fafafa', water:'#d6eaf8', waterStroke:'#aed6f1', bldg:'#f0f0f0', bldgStroke:'#e0e0e0', road:{10:'#333',9:'#555',8:'#777',7:'#aaa',6:'#ccc',5:'#ddd',4:'#eee',def:'#eee'}, roadStroke:{10:'#111',9:'#333',8:'#555',7:'#888',6:'#aaa',5:'#bbb',4:'#ccc',def:'#ddd'}, roadW:{10:4,9:3.5,8:3,7:2.5,6:2,5:1.5,4:1,def:0.7} },
};
function vecProject(lat, lon, cLat, cLon, scale, sz){ const R2D = 180 / Math.PI; const x = (lon - cLon) * scale + sz/2; const y = -(mercY(lat) - mercY(cLat)) * scale * R2D + sz/2; return {x, y}; }
let _lastOsmKey='', _lastOsmFrame=-1;
function renderOsmMap(pt, pts, n, pxSize){
  const sz = pxSize; if(osmOffscreenCvs.width !== sz) osmOffscreenCvs.width = sz; if(osmOffscreenCvs.height !== sz) osmOffscreenCvs.height = sz; const c = osmOffCtx;
  if(isRendering){ c.clearRect(0,0,sz,sz); renderVectorMap(c, pt, pts, n, sz); } 
  else {
    const osmKey=`${n}_${sz}_${osmZoom}_${osmStyle}_${osmShowHeading?Math.round((pt.heading||0)/5):0}`;
    if(playing && osmKey===_lastOsmKey && n===_lastOsmFrame){ return osmOffscreenCvs; }
    _lastOsmKey=osmKey; _lastOsmFrame=n; c.clearRect(0,0,sz,sz); renderTileMap(c, pt, pts, n, sz);
  }
  return osmOffscreenCvs;
}
function tileUrl(z, x, y){ switch(osmStyle){ case 'dark': return `https://a.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`; case 'night': return `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`; case 'satellite': return `https://a.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`; case 'minimal': return `https://a.basemaps.cartocdn.com/light_nolabels/${z}/${x}/${y}.png`; default: return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`; } }
function renderTileMap(c, pt, pts, n, sz){
  const z = osmZoom; const heading = osmShowHeading ? (pt.heading||0) : 0; const headingRad = heading * Math.PI / 180;
  const {x:tx0, y:ty0} = tileXY(pt.lat, pt.lon, z); const orig = tileOrigin(tx0, ty0, z); const {x:cpx, y:cpy} = latLonToPx(pt.lat, pt.lon, z, orig.lat, orig.lon);
  const projTile = (lat, lon) => ({ x: sz/2 - cpx + latLonToPx(lat, lon, z, orig.lat, orig.lon).x, y: sz/2 - cpy + latLonToPx(lat, lon, z, orig.lat, orig.lon).y });
  c.fillStyle = '#2a2a2a'; c.fillRect(0,0,sz,sz); c.save();
  if(osmShowHeading && heading !== 0){ c.translate(sz/2, sz/2); c.rotate(-headingRad); c.translate(-sz/2, -sz/2); }
  const extra = osmShowHeading ? 2 : 1; const offX = sz/2 - cpx, offY = sz/2 - cpy;
  for(let dy=-extra; dy<=extra; dy++){ for(let dx=-extra; dx<=extra; dx++){ const tx=tx0+dx, ty=ty0+dy; if(tx<0||ty<0||tx>=(1<<z)||ty>=(1<<z)) continue; const img = loadTile(z, tx, ty, osmStyle); if(img && img.complete && img.naturalWidth>0){ c.drawImage(img, offX+dx*256, offY+dy*256, 256, 256); } } }
  c.restore(); applyMapFilter(c, sz); drawRouteAndDot(c, pt, pts, n, sz, projTile, headingRad);
  const bbox = vecBBox(pt.lat, pt.lon, z, sz); const cKey = vecCacheKey(pt.lat, pt.lon, z);
  if(!vecCache.has(cKey)){ vecCache.set(cKey, {roads:[],water:[],buildings:[],fetched:false}); fetchVecData(bbox, cKey); }
}
function renderVectorMap(c, pt, pts, n, sz){
  const theme = vecThemes[osmStyle] || vecThemes.standard; const degPerPx = 360 / (256 * Math.pow(2, osmZoom)); const scale = 1 / degPerPx;
  const proj = (lat,lon) => vecProject(lat, lon, pt.lat, pt.lon, scale, sz);
  c.fillStyle = theme.bg; c.fillRect(0,0,sz,sz);
  const cKey = vecCacheKey(pt.lat, pt.lon, osmZoom); const vd = vecCache.get(cKey) || {roads:[],water:[],buildings:[],fetched:false};
  function drawWay(coords){ if(!coords||coords.length<2) return; c.beginPath(); coords.forEach((p,i)=>{ const{x,y}=proj(p.lat,p.lon); i===0?c.moveTo(x,y):c.lineTo(x,y); }); }
  vd.water.forEach(w=>{ drawWay(w.coords); c.fillStyle=theme.water; c.fill(); c.strokeStyle=theme.waterStroke; c.lineWidth=1; c.stroke(); });
  if(osmZoom>=14) vd.buildings.forEach(b=>{ drawWay(b.coords); c.fillStyle=theme.bldg; c.fill(); c.strokeStyle=theme.bldgStroke; c.lineWidth=0.5; c.stroke(); });
  const sorted=[...vd.roads].sort((a,b)=>(a.rank||1)-(b.rank||1)); const rk_key=rk=>(rk>=10?10:rk>=9?9:rk>=8?8:rk>=7?7:rk>=6?6:rk>=5?5:rk>=4?4:'def');
  sorted.forEach(r=>{ drawWay(r.coords); const k=rk_key(r.rank||1); c.strokeStyle=theme.roadStroke[k]||theme.roadStroke.def; c.lineWidth=(theme.roadW[k]||theme.roadW.def)+1.5; c.lineJoin='round'; c.lineCap='round'; c.stroke(); });
  sorted.forEach(r=>{ drawWay(r.coords); const k=rk_key(r.rank||1); c.strokeStyle=theme.road[k]||theme.road.def; c.lineWidth=theme.roadW[k]||theme.roadW.def; c.lineJoin='round'; c.lineCap='round'; c.stroke(); });
  if(!vd.fetched||!vd.roads.length){ c.fillStyle='rgba(255,255,255,0.3)'; c.font='bold 11px sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillText(vd.error?'No map data':'Loading map…', sz/2, sz/2-12); }
  applyMapFilter(c, sz); drawRouteAndDot(c, pt, pts, n, sz, proj);
}
function applyMapFilter(c, sz){
  const snap = document.createElement('canvas'); snap.width = sz; snap.height = sz; snap.getContext('2d').drawImage(osmOffscreenCvs, 0, 0);
  let filterStr = '';
  if(osmTint !== 'none'){ switch(osmTint){ case'night': filterStr='hue-rotate(200deg) saturate(60%) brightness(65%)'; break; case'green': filterStr='hue-rotate(80deg) saturate(130%)'; break; case'sepia': filterStr='sepia(75%) saturate(120%)'; break; case'mono': filterStr='grayscale(100%)'; break; } }
  if(osmBrightness !== 100){ filterStr = (filterStr ? filterStr+' ' : '') + `brightness(${osmBrightness}%)`; }
  if(filterStr){ const tmp = document.createElement('canvas'); tmp.width = sz; tmp.height = sz; const tc = tmp.getContext('2d'); tc.filter = filterStr; tc.drawImage(snap, 0, 0); c.clearRect(0, 0, sz, sz); c.drawImage(tmp, 0, 0); }
}
function drawRouteAndDot(c, pt, pts, n, sz, proj, headingRad=0){
  c.save(); if(headingRad !== 0){ c.translate(sz/2, sz/2); c.rotate(-headingRad); c.translate(-sz/2, -sz/2); }
  if(osmShowRoute && pts && pts.length>1){
    c.beginPath(); c.strokeStyle='rgba(255,255,255,0.25)'; c.lineWidth=2.5; c.lineJoin='round'; c.lineCap='round'; pts.forEach((p,i)=>{const{x,y}=proj(p.lat,p.lon);i===0?c.moveTo(x,y):c.lineTo(x,y)}); c.stroke();
    c.beginPath(); c.strokeStyle='rgba(74,240,160,0.9)'; c.lineWidth=3; pts.slice(0,n+1).forEach((p,i)=>{const{x,y}=proj(p.lat,p.lon);i===0?c.moveTo(x,y):c.lineTo(x,y)}); c.stroke();
  }
  c.restore(); const cx=sz/2, cy=sz/2;
  if(osmShowHeading && headingRad !== 0){
    c.save(); c.translate(cx, cy); c.beginPath(); c.moveTo(0, -10); c.lineTo(6, 6); c.lineTo(0, 2); c.lineTo(-6, 6); c.closePath(); c.fillStyle='#4af0a0'; c.fill(); c.strokeStyle='#fff'; c.lineWidth=1.5; c.stroke(); c.restore();
  } else { c.beginPath(); c.arc(cx,cy,11,0,Math.PI*2); c.fillStyle='rgba(74,240,160,0.2)'; c.fill(); c.beginPath(); c.arc(cx,cy,7,0,Math.PI*2); c.strokeStyle='#fff'; c.lineWidth=2; c.stroke(); c.beginPath(); c.arc(cx,cy,5,0,Math.PI*2); c.fillStyle='#4af0a0'; c.fill(); }
}