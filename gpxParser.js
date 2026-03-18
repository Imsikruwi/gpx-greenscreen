// ═══════════════════════════════════════════════════════════
// FILE HANDLING & GPX PARSING MODULE
// ═══════════════════════════════════════════════════════════

function loadGPX(file){
  const r=new FileReader();
  r.onload=e=>{try{parseGPX(e.target.result,file.name)}catch(err){notif('Parse error: '+err.message,'#ff5c5c')}};
  r.readAsText(file);
}

function parseGPX(xml,fname){
  const doc=new DOMParser().parseFromString(xml,'text/xml');
  const pts=doc.querySelectorAll('trkpt');
  if(!pts.length)throw new Error('No track points');
  const points=[];
  pts.forEach(p=>{
    // Standard GPX fields
    const obj={
      lat:parseFloat(p.getAttribute('lat')),
      lon:parseFloat(p.getAttribute('lon')),
      ele:parseFloat(p.querySelector('ele')?.textContent||0),
      time:p.querySelector('time')?new Date(p.querySelector('time').textContent):null,
      hr:null, cad:null, power:null
    };
    // Garmin/Strava extensions: <gpxtpx:hr>, <ns3:hr>, <hr>
    const getExt=(el,...tags)=>{
      const all=[...el.getElementsByTagName('*')];
      for(const tag of tags){
        const found=all.find(n=>n.localName===tag||n.tagName===tag||n.tagName===tag.replace(':','-'));
        if(found) return found;
      }
      return null;
    };
    const hrEl =getExt(p,'hr','heartrate','gpxtpx:hr','ns3:hr');
    if(hrEl)  obj.hr   =parseFloat(hrEl.textContent);
    const cadEl=getExt(p,'cad','cadence','gpxtpx:cad','ns3:cad');
    if(cadEl) obj.cad  =parseFloat(cadEl.textContent);
    const powEl=getExt(p,'power','watts','gpxtpx:PowerInWatts','ns3:power');
    if(powEl) obj.power=parseFloat(powEl.textContent);
    points.push(obj);
  });

  // Compute cumDist + speed_ms
  let cd=0;
  for(let i=0;i<points.length;i++){
    if(i===0){points[i].cumDist=0;points[i].speed_ms=0;continue}
    const d=haversine(points[i-1].lat,points[i-1].lon,points[i].lat,points[i].lon);
    cd+=d; points[i].cumDist=cd;
    if(points[i].time&&points[i-1].time){
      const dt=(points[i].time-points[i-1].time)/1000;
      points[i].speed_ms=dt>0?d/dt:0;
    } else {points[i].speed_ms=d}
  }
  // Smooth speed
  for(let i=1;i<points.length-1;i++)
    points[i].speed_ms=(points[i-1].speed_ms+points[i].speed_ms+points[i+1].speed_ms)/3;

  // Compute heading, grade, g-forces
  for(let i=0;i<points.length;i++){
    const prev=points[Math.max(0,i-1)], next=points[Math.min(points.length-1,i+1)];
    // Heading
    const dLon=(next.lon-prev.lon)*Math.PI/180;
    const la=prev.lat*Math.PI/180, lb=next.lat*Math.PI/180;
    const hy=Math.sin(dLon)*Math.cos(lb);
    const hx=Math.cos(la)*Math.sin(lb)-Math.sin(la)*Math.cos(lb)*Math.cos(dLon);
    points[i].heading=(Math.atan2(hy,hx)*180/Math.PI+360)%360;
    // Grade %
    const hDist=haversine(prev.lat,prev.lon,next.lat,next.lon)||0.001;
    points[i].grade=((next.ele-prev.ele)/hDist)*100;
    // G-forces
    const dt=prev.time&&next.time?(next.time-prev.time)/1000:1;
    const dv=next.speed_ms-prev.speed_ms;
    points[i].gLong = dt>0 ? (dv/dt)/9.81 : 0;
    let dHead=next.heading-prev.heading;
    if(dHead>180)dHead-=360; if(dHead<-180)dHead+=360;
    const headRad=dHead*Math.PI/180;
    points[i].gLat = dt>0 ? (points[i].speed_ms*points[i].speed_ms*headRad/dt)/9.81 : 0;
    points[i].gLong=Math.max(-3,Math.min(3,points[i].gLong));
    points[i].gLat =Math.max(-3,Math.min(3,points[i].gLat));
  }
  for(let i=1;i<points.length-1;i++){
    points[i].gLong=(points[i-1].gLong+points[i].gLong+points[i+1].gLong)/3;
    points[i].gLat =(points[i-1].gLat +points[i].gLat +points[i+1].gLat )/3;
  }

  const totalDist=cd;
  const maxSpeedMs=Math.max(...points.map(p=>p.speed_ms));
  const minLat=Math.min(...points.map(p=>p.lat)), maxLat=Math.max(...points.map(p=>p.lat));
  const minLon=Math.min(...points.map(p=>p.lon)), maxLon=Math.max(...points.map(p=>p.lon));
  const minEle=Math.min(...points.map(p=>p.ele)), maxEle=Math.max(...points.map(p=>p.ele));
  let totalSecs=0;
  if(points[0].time&&points[points.length-1].time)
    totalSecs=(points[points.length-1].time-points[0].time)/1000;

  window._simpleMapKey='';
  const hrVals   = points.map(p=>p.hr).filter(v=>v!=null&&!isNaN(v));
  const cadVals  = points.map(p=>p.cad).filter(v=>v!=null&&!isNaN(v));
  const powVals  = points.map(p=>p.power).filter(v=>v!=null&&!isNaN(v));
  const avg = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : null;
  const max = arr => arr.length ? Math.round(Math.max(...arr)) : null;
  const sensorStats = {
    hasHR:    hrVals.length>0,
    maxHR:    max(hrVals),  avgHR:  avg(hrVals),
    hasCad:   cadVals.length>0,
    maxCad:   max(cadVals), avgCad: avg(cadVals),
    hasPower: powVals.length>0,
    maxPow:   max(powVals), avgPow: avg(powVals),
  };
  gpxData={points,totalDist,maxSpeedMs,minLat,maxLat,minLon,maxLon,minEle,maxEle,totalSecs,fname,sensorStats};
  tfS0=0; tfE0=points.length-1;

  // Stats Display Updates
  document.getElementById('statsSection').style.display='block';
  document.getElementById('st-dist').textContent=(totalDist/1000).toFixed(2);
  document.getElementById('st-dur').textContent=fmtTime(totalSecs);
  document.getElementById('st-spd').textContent=cvtSpd(maxSpeedMs).toFixed(1);
  document.getElementById('st-ele').textContent=Math.round(maxEle)+'m';
  document.getElementById('st-pts').textContent=points.length.toLocaleString();
  
  const ss=gpxData.sensorStats;
  if(ss.hasHR){
    document.getElementById('sc-hr').style.display='';
    document.getElementById('sc-hr-max').style.display='';
    document.getElementById('st-hr-avg').textContent=ss.avgHR||'—';
    document.getElementById('st-hr-max').textContent=ss.maxHR||'—';
  }
  if(ss.hasCad){
    document.getElementById('sc-cad').style.display='';
    document.getElementById('st-cad-avg').textContent=(ss.avgCad||'—')+' rpm';
  }
  if(ss.hasPower){
    document.getElementById('sc-pow').style.display='';
    document.getElementById('sc-pow-max').style.display='';
    document.getElementById('st-pow-avg').textContent=ss.avgPow||'—';
    document.getElementById('st-pow-max').textContent=ss.maxPow||'—';
  }

  function fmtGPSStamp(d){
    if(!d) return '—';
    const pad=n=>String(n).padStart(2,'0');
    return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
      +' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
  }
  document.getElementById('st-gps-start').textContent=fmtGPSStamp(points[0].time);
  document.getElementById('st-gps-end').textContent=fmtGPSStamp(points[points.length-1].time);

  document.getElementById('emptyState').style.display='none';
  document.getElementById('btnRender').disabled=false;
  document.getElementById('playbar').classList.add('vis');
  document.getElementById('vsb').classList.add('vis');
  document.getElementById('orientBar').classList.add('vis');
  const fsBtn=document.getElementById('btnFullscreen'); if(fsBtn)fsBtn.style.display='block';
  showMainApp();
  document.getElementById('fmtSection').style.display='flex';
  document.getElementById('rightPanel').style.display='flex';
  document.getElementById('tfSection').style.display='block';
  document.getElementById('scrubber').max=points.length-1;

  const dz=document.getElementById('dropZone');
  dz.classList.add('loaded');
  dz.querySelector('.drop-title').textContent=fname||'File loaded';
  dz.querySelector('.drop-sub').textContent=points.length+' GPS points';

  const isFirstLoad = !window._gpxLoaded;
  window._gpxLoaded = true;

  if(isFirstLoad){
    canvasOrient='landscape';
    const cwF=document.getElementById('canvasWrapper');
    if(cwF){ cwF.style.aspectRatio='16/9'; cwF.style.width='100%'; cwF.style.height='auto'; cwF.style.maxWidth='800px'; }
    ['landscape','portrait','square'].forEach(o=>{
      const b=document.getElementById('orient-'+o);
      if(b) b.classList.toggle('on', o==='landscape');
    });
  } else {
    const{W:rW2,H:rH2}=resWH(); canvas.width=rW2; canvas.height=rH2;
  }

  curFrame=0; initTF(); drawFrame(0); updateEstimate();
  if(!window._dragInited){window._dragHandle=initDragPos();window._dragInited=true;} else if(window._dragHandle)window._dragHandle.updateHandles();
  notif(isFirstLoad?'Loaded — '+points.length+' points':'GPX updated — '+points.length+' points');
}

// ═══════════════════════════════════════════════════════════
// MATH & HELPERS
// ═══════════════════════════════════════════════════════════
function haversine(a,b,c,d){
  const R=6371000,r=Math.PI/180,da=(c-a)*r,db=(d-b)*r;
  const x=Math.sin(da/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(db/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

function calcHeading(pts,idx){
  if(idx<=0||idx>=pts.length-1)return 0;
  const a=pts[Math.max(0,idx-1)],b=pts[Math.min(pts.length-1,idx+1)];
  const dLon=(b.lon-a.lon)*Math.PI/180;
  const la=a.lat*Math.PI/180,lb=b.lat*Math.PI/180;
  const y=Math.sin(dLon)*Math.cos(lb);
  const x=Math.cos(la)*Math.sin(lb)-Math.sin(la)*Math.cos(lb)*Math.cos(dLon);
  return(Math.atan2(y,x)*180/Math.PI+360)%360;
}