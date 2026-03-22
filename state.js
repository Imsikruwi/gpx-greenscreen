// ═══════════════════════════════════════════════════════════
// GLOBAL STATE & CONFIGURATION
// ═══════════════════════════════════════════════════════════

let gpxData=null, tfS0=0, tfE0=0;
let opts={speed:true,map:true,info:false,arc:false,prog:false,elev:false,gpstime:true,distov:false,coords:true,gforce:false,compass:false,grade:false,odometer:true,heartrate:false,cadence:false,power:false,watermark:true};
let oPos={speed:'bl',map:'tr',info:'br',arc:'tl',elev:'bc',gpstime:'tl',coords:'br',gforce:'bl',compass:'tr',grade:'tc',odometer:'bc',heartrate:'tc',cadence:'tc',power:'tc',watermark:'tc'};
let textColor='#ffffff', bgColor='#00b140', speedUnit='kmh';
let fontScale=2.2, panelOp=0.3;
let curFrame=0, playing=false, rafId=null, lastPlayT=0;
let fpsVal=1, bitrateVal=1000, renderFmt='mp4', renderRes='1080p', spdMaxMode='auto', spdMaxCustom=0, spdStyle='bar';
let exportTransparent=false;
let gpsFmt='hms', gpsShowDate=false;
let distDecimals=1, distShowElev=false, distOdoMode=false, odoScale=1.0;
let odoScale2=1.0, odoShowBorder=true;
let showOverlayBg=true, overlayBg={};
window._spdDistGap=4;
let hrMaxBpm=190, ftpWatts=200;

// ── OVERLAY FONT ──
let overlayFont='mono';
const OVERLAY_FONTS={
  mono:    {label:'Mono',    family:"'IBM Plex Mono',monospace"},
  sans:    {label:'Sans',    family:"'Inter',sans-serif"},
  display: {label:'Display', family:"'Orbitron',sans-serif"},
  slab:    {label:'Slab',    family:"'Roboto Slab',serif"},
  rounded: {label:'Rounded', family:"'Nunito',sans-serif"},
};
function ovFont(){ return OVERLAY_FONTS[overlayFont]?.family||OVERLAY_FONTS.mono.family; }

// ── DIAL APPEARANCE ──
let dialMode=false;
let dialInputMode='pct';   // 'pct' = percent of max | 'speed' = fixed speed value
let dialYellowPct=60;      // % threshold (0-100)
let dialRedPct=85;
let dialYellowMs=25;       // fixed speed in m/s (~90 km/h)
let dialRedMs=30;          // fixed speed in m/s (~108 km/h)

// ── PREVIEW BACKGROUND IMAGE ──
let previewBgImage=null;
let previewBgEnabled=false;
let previewBgFit='fit';
let previewBgIncludeExport=false;

// ── CUSTOM WATERMARK ──
let customWatermarkImage=null;
let customWatermarkOpacity=1.0;

let osmZoom=15, osmMapShape='none', osmMapSize='md', osmShowRoute=true, osmShowHeading=false, osmUseOSM=false;
let mapBgStyle='trans', mapRouteColor='#ffffff', mapDotColor='#ff3333', mapGhostColor='rgba(255,255,255,0.18)', mapShowNorth=false;
let osmStyle='standard', osmTint='none', osmBrightness=100, osmContrast=100;
let coordFmt='dms', coordShowIcon=true;
const dragState={active:false,key:null,startX:0,startY:0,origPos:null};
let canvasOrient='landscape';
let renderedBlob=null, isRendering=false, renderCancelled=false;
let playSpeed=10;
let _lastPlayDraw=0, _lastDrawnFrame=-1, _playStartFrame=0, _playStartMs=null;

const canvas=document.getElementById('mainCanvas');
const ctx=canvas.getContext('2d');
const mapCvs=document.createElement('canvas'); mapCvs.width=320; mapCvs.height=320;
const mCtx=mapCvs.getContext('2d');
