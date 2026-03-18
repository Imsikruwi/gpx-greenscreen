// ═══════════════════════════════════════════════════════════
// UTILITY & MATH HELPERS
// ═══════════════════════════════════════════════════════════

function cvtSpd(ms){ if(speedUnit==='kmh')return ms*3.6; if(speedUnit==='mph')return ms*2.237; if(speedUnit==='ms')return ms; if(speedUnit==='pace')return ms<.1?0:1000/(ms*60); return ms*3.6; }
function spdLabel(){return{kmh:'km/h',mph:'mph',ms:'m/s',pace:'min/km'}[speedUnit]||'km/h'}
function fmtSpd(ms){ const v=cvtSpd(ms); if(speedUnit==='pace'){ const m=Math.floor(v),s=Math.round((v-m)*60); return m+"'"+String(s).padStart(2,'0')+'"'; } return Math.round(v).toString().padStart(2,'0'); }
function fmtTime(sec){ if(!sec||sec<0)return'--:--'; const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=Math.floor(sec%60); if(h>0)return h+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'); return m+':'+String(s).padStart(2,'0'); }
function projMap(lat,lon){ const{minLat,maxLat,minLon,maxLon}=gpxData; const pd=14,W=320,H=320; const lR=maxLat-minLat||.001,nR=maxLon-minLon||.001; const sc=Math.min((W-pd*2)/nR,(H-pd*2)/lR); const ox=(W-nR*sc)/2,oy=(H-lR*sc)/2; return{x:ox+(lon-minLon)*sc,y:H-oy-(lat-minLat)*sc}; }
function ovFS(key){ return fontScale*(oScale[key]||1); }

function posXY(pos,W,H,w,h,pad=16){
  const pb=opts.prog?14:0; if(pos && typeof pos==='object') return {x:Math.max(0,Math.min(W-w,pos.x)), y:Math.max(0,Math.min(H-h,pos.y))};
  const mc=H/2-h/2; 
  switch(pos){ 
    case'tl':return{x:pad,y:pad}; 
    case'tc':return{x:(W-w)/2,y:pad}; 
    case'tr':return{x:W-w-pad,y:pad}; 
    case'ml':return{x:pad,y:mc}; 
    case'mc':return{x:(W-w)/2,y:mc}; 
    case'mr':return{x:W-w-pad,y:mc}; 
    case'bl':return{x:pad,y:H-h-pad-pb}; 
    case'bc':return{x:(W-w)/2,y:H-h-pad-pb}; 
    case'br':return{x:W-w-pad,y:H-h-pad-pb}; 
    default: return{x:pad,y:pad}; 
  }
}