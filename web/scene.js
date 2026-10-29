/* Drawing is a pure function of (scene, time, stage, mass, distance); playback only advances time. */
(function(){
const ACCENT={mint:'#0e9f7a',blue:'#2563eb',gold:'#d97706'};
const TAU=Math.PI*2, FONT='-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif';
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
function rgba(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`;}
function trace(ctx,points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));}
function text(ctx,value,x,y,{align='left',color='rgba(20,23,28,.64)',size=11,weight=500,spacing='0px'}={}){
 ctx.font=`${weight} ${size}px ${FONT}`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;
 if('letterSpacing' in ctx)ctx.letterSpacing=spacing;ctx.fillText(value,x,y);if('letterSpacing' in ctx)ctx.letterSpacing='0px';
}

function drawStar(ctx,cx,cy,R,presence){
 // A star with a soft corona and a darker limb; it grows in with the mass.
 const r=R*(.35+.65*presence);ctx.globalAlpha=presence;
 const corona=ctx.createRadialGradient(cx,cy,r*.8,cx,cy,r*4.5);corona.addColorStop(0,'rgba(255,214,140,.35)');corona.addColorStop(.35,'rgba(255,190,110,.12)');corona.addColorStop(1,'rgba(255,190,110,0)');
 ctx.fillStyle=corona;ctx.fillRect(cx-r*4.5,cy-r*4.5,r*9,r*9);
 const body=ctx.createRadialGradient(cx-r*.15,cy-r*.15,r*.05,cx,cy,r);
 body.addColorStop(0,'#fffaf0');body.addColorStop(.45,'#ffe2a3');body.addColorStop(.82,'#f7a644');body.addColorStop(1,'#d9701c');
 ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.fillStyle=body;ctx.fill();
 ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.clip();
 for(let i=0;i<26;i++){const a=hash(i*3.1)*TAU, d=Math.sqrt(hash(i*7.7))*r*.85, sr=r*(.06+.08*hash(i*1.3));
  ctx.beginPath();ctx.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,sr,0,TAU);ctx.fillStyle=`rgba(${hash(i)>.5?'255,255,255':'200,110,30'},${.06+.05*hash(i*2.2)})`;ctx.fill();}
 ctx.restore();ctx.globalAlpha=1;return r;
}
function drawPlanet(ctx,w,h,horizon,presence){
 // A rocky planet rises into view with its thin atmosphere; texture is deterministic.
 const cx=w/2, rise=horizon+(1-presence)*(h-horizon+h*.06), PR=Math.max(w*w/(8*(h-horizon)*.7),h), cy=rise+PR;
 ctx.globalAlpha=Math.min(1,presence*1.4);
 const air=ctx.createRadialGradient(cx,cy,PR,cx,cy,PR+h*.05);air.addColorStop(0,'rgba(160,200,255,.45)');air.addColorStop(1,'rgba(160,200,255,0)');
 ctx.beginPath();ctx.arc(cx,cy,PR+h*.05,0,TAU);ctx.fillStyle=air;ctx.fill();
 const body=ctx.createLinearGradient(0,rise,0,h);body.addColorStop(0,'#d9925a');body.addColorStop(.35,'#b8693a');body.addColorStop(1,'#7a3e1f');
 ctx.beginPath();ctx.arc(cx,cy,PR,0,TAU);ctx.fillStyle=body;ctx.fill();
 ctx.save();ctx.beginPath();ctx.arc(cx,cy,PR,0,TAU);ctx.clip();
 for(let i=0;i<40;i++){const x=hash(i*5.3)*w, y=rise+hash(i*2.9)*(h-rise)*1.2, rx=w*(.06+.1*hash(i*1.7)), ry=rx*.12;
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fillStyle=`rgba(${hash(i*4.1)>.5?'255,230,200':'90,40,20'},${.03+.04*hash(i*6.3)})`;ctx.fill();}
 const shade=ctx.createLinearGradient(0,0,w,0);shade.addColorStop(0,'rgba(60,25,10,.28)');shade.addColorStop(.5,'rgba(60,25,10,0)');shade.addColorStop(1,'rgba(60,25,10,.28)');
 ctx.fillStyle=shade;ctx.fillRect(0,rise-2,w,h-rise+2);ctx.restore();
 ctx.beginPath();ctx.arc(cx,cy,PR,Math.PI*1.08,Math.PI*1.92);ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=1.2;ctx.stroke();
 ctx.globalAlpha=1;
}

function drawLight(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.mint, s=Math.min(w/15,h/9), cx=w*.5, cy=h*.47, m=st.mass, small=w<520;
 // Tilted view of the optical mesh: distance on it is light travel time, its dip drawn for six times the model mass.
 const tilt=1.2, mu=6*Physics.m(m), lift=Math.sin(tilt), drop=Math.cos(tilt), rim=Physics.meshHeight(mu,9.5);
 // The mesh opens to a circle of radius core + 2mu around the mass; the star is sized and placed to fill it.
 const R=(9+m*9)*clamp(s/40,.6,1.4), core=Math.max(.2,R/s-2*mu);
 const at=(x,y)=>{const r=Math.max(Math.hypot(x,y),1e-6), f=(r+2*mu)/r, dip=Math.max(0,rim-Physics.meshHeight(mu,Math.max(r,core)));
  return [cx+x*f*s,cy-y*f*s*lift+dip*s*drop];};
 const centre=[cx,cy+Math.max(0,rim-Physics.meshHeight(mu,core))*s*drop];
 // Mesh lines darken where the surface is steep, lit from the far side, so the dip's depth reads.
 const line=(pts)=>{let prev=null;for(const [x,y] of pts){const r=Math.hypot(x,y);if(m>.001&&r<core){prev=null;continue;}const q=at(x,y);
  if(prev){const steep=mu>1e-6?clamp(Math.sqrt(4*mu/r+4*mu*mu/(r*r))*.7):0, light=.5+.5*y/Math.max(r,1e-6);
   ctx.beginPath();ctx.moveTo(prev[0],prev[1]);ctx.lineTo(q[0],q[1]);ctx.strokeStyle=`rgba(20,23,28,${.12+steep*(.12+.22*(1-light))})`;ctx.stroke();}
  prev=q;}};
 if(mu>1e-6){const [sx,sy]=centre, g=ctx.createRadialGradient(sx,sy,0,sx,sy,3*s);
  g.addColorStop(0,`rgba(60,45,25,${.16*clamp(mu/.05)})`);g.addColorStop(1,'rgba(60,45,25,0)');ctx.fillStyle=g;
  ctx.beginPath();ctx.ellipse(sx,sy,3*s,3*s*lift,0,0,TAU);ctx.fill();}
 ctx.lineWidth=1;
 for(let i=-10;i<=10;i++){const x=i*.75;line(Array.from({length:81},(_,j)=>[x,-4+8.5*j/80]));}
 for(let j=0;j<=11;j++){const y=-4+j*.75;line(Array.from({length:121},(_,i)=>[-7.5+15*i/120,y]));}
 if(m>.001){
  const r=drawStar(ctx,centre[0],centre[1],Math.max(R,(core+2*mu)*s),clamp(m/.25));
  if(st.labels)text(ctx,'MASS',cx,centre[1]+r+16,{align:'center',size:10,weight:600,spacing:'1.5px'});
 }else{
  ctx.setLineDash([3,5]);ctx.beginPath();ctx.ellipse(cx,cy,R,R*lift,0,0,TAU);ctx.strokeStyle='rgba(20,23,28,.22)';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
  if(st.labels)text(ctx,'no mass',cx,cy+R+18,{align:'center',size:10,weight:600,spacing:'1px'});
 }
 const count=spec.ray_count||1, N=240;
 for(let r=count-1;r>=0;r--){
  const b=st.distance+r*.4, main=r===0, path=Physics.lightPath(mu,b), points=path.filter((_,i)=>i%Math.max(1,Math.floor(path.length/N))===0).concat([path.at(-1)]).map(([x,y])=>at(x,y));
  const n=points.length-1;
  if(spec.show_reference){ctx.setLineDash([4,6]);trace(ctx,[[cx-7.5*s,cy-b*s*lift],[cx+7.5*s,cy-b*s*lift]]);ctx.strokeStyle='rgba(20,23,28,.25)';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);}
  ctx.lineCap='round';ctx.lineJoin='round';
  trace(ctx,points);ctx.strokeStyle=rgba(accent,main?.14:.06);ctx.lineWidth=(main?spec.line_width:1.2)*5;ctx.stroke();
  trace(ctx,points);ctx.strokeStyle=rgba(accent,main?.95:.4);ctx.lineWidth=main?spec.line_width:1.2;ctx.stroke();
  // Pulses are moving markers along the path, not a measurement of coordinate speed.
  for(let k=0;k<3;k++){
   const phase=((st.t/6+k/3+r*.13)%1+1)%1, fade=smooth(phase/.06)*smooth((1-phase)/.06);
   for(let i=14;i>=1;i--){const p=phase-i*.0055;if(p<0)continue;const [x,y]=points[Math.floor(p*n)];
    ctx.beginPath();ctx.arc(x,y,(main?3.2:2)*(1-i/16),0,TAU);ctx.fillStyle=rgba(accent,.4*(1-i/15)*fade);ctx.fill();}
   const [x,y]=points[Math.floor(phase*n)];
   const glow=ctx.createRadialGradient(x,y,0,x,y,main?16:9);glow.addColorStop(0,rgba(accent,.38*fade));glow.addColorStop(1,rgba(accent,0));
   ctx.fillStyle=glow;ctx.fillRect(x-16,y-16,32,32);
   ctx.beginPath();ctx.arc(x,y,main?4:2.6,0,TAU);ctx.fillStyle=rgba(accent,fade);ctx.fill();
   ctx.beginPath();ctx.arc(x,y,main?1.6:1,0,TAU);ctx.fillStyle=`rgba(255,255,255,${fade})`;ctx.fill();
  }
  if(st.labels&&main){
   const end=points[n], size=small?10:11, x=Math.min(w-16,end[0]);
   // Name the light where it enters: beside its start when there is room, else just above it.
   const [lx0,ly0]=points[0];if(lx0>70)text(ctx,'LIGHT',lx0-10,ly0,{align:'right',size:10,weight:600,spacing:'1.5px'});else text(ctx,'LIGHT',lx0+6,ly0+16,{size:10,weight:600,spacing:'1.5px'});
   if(m>.001){text(ctx,'straightest line across the mesh',x,Math.min(h-14,end[1]+16),{align:'right',size,weight:600,color:accent});
    if(spec.show_reference)text(ctx,'dashed: without the mass',Math.min(w-16,cx+7.5*s),cy-(st.distance+(count-1)*.4)*s*lift-14,{align:'right',size});}
   else text(ctx,'flat mesh: light goes straight',x,end[1]+16,{align:'right',size,weight:600,color:accent});
  }
 }
}

function drawClocks(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.blue, m=st.mass, presence=clamp(m/.3);
 const ratio=Physics.clockRatio(m,st.distance), rate=1-12*(1-ratio), small=w<520;
 const cx=w*.5, rad=Math.min(w*.13,h*.135), horizon=h*.9;
 let lowerY=h*(.68-.09*(st.distance-1)), upperY=lowerY-Math.max(h*.34,rad*2.5);
 // Keep the top clock and its label clear of the stage notes.
 const clear=(st.labels?(small?92:24):6)-(upperY-rad-(st.labels&&small?13:0));
 if(clear>0){upperY+=clear;lowerY+=clear;}
 // Warm haze marks "deeper in gravity".
 if(presence>0){
  const haze=ctx.createLinearGradient(0,h,0,h*.4);haze.addColorStop(0,`rgba(245,158,66,${.2*presence})`);haze.addColorStop(1,'rgba(245,158,66,0)');
  ctx.fillStyle=haze;ctx.fillRect(0,h*.4,w,h*.6);
  drawPlanet(ctx,w,h,horizon,presence);
 }else{
  ctx.setLineDash([3,5]);trace(ctx,[[w*.08,horizon],[w*.92,horizon]]);ctx.strokeStyle='rgba(20,23,28,.2)';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
  if(st.labels)text(ctx,'no mass',cx,horizon+(h-horizon)*.5,{align:'center',size:10,weight:600,spacing:'1px'});
 }
 // Fixed gap bracket.
 const gx=small?cx-rad-Math.min(40,w*.09):cx-rad-150;
 ctx.strokeStyle='rgba(20,23,28,.28)';ctx.lineWidth=1;
 trace(ctx,[[gx-4,upperY],[gx+4,upperY]]);ctx.stroke();trace(ctx,[[gx-4,lowerY],[gx+4,lowerY]]);ctx.stroke();
 ctx.setLineDash([2,4]);trace(ctx,[[gx,upperY],[gx,lowerY]]);ctx.stroke();ctx.setLineDash([]);
 if(st.labels){ctx.save();ctx.translate(gx-12,(upperY+lowerY)/2);ctx.rotate(-Math.PI/2);text(ctx,'SAME GAP',0,0,{align:'center',size:9,weight:600,spacing:'1.5px'});ctx.restore();}
 // Both clocks start together at each chapter, so the lag shown is the lag since that start.
 const clockT=st.since??st.t, reference=clockT*.5;
 function face(y,speed,name,lower){
  const angle=clockT*.5*speed;
  ctx.save();ctx.shadowColor='rgba(20,30,50,.14)';ctx.shadowBlur=26;ctx.shadowOffsetY=10;
  ctx.beginPath();ctx.arc(cx,y,rad,0,TAU);ctx.fillStyle='#fff';ctx.fill();ctx.restore();
  ctx.beginPath();ctx.arc(cx,y,rad,0,TAU);ctx.strokeStyle='rgba(20,23,28,.12)';ctx.lineWidth=1;ctx.stroke();
  for(let i=0;i<60;i++){const a=i*TAU/60, major=i%5===0, r0=rad*(major?.8:.86);
   trace(ctx,[[cx+Math.sin(a)*r0,y-Math.cos(a)*r0],[cx+Math.sin(a)*rad*.92,y-Math.cos(a)*rad*.92]]);
   ctx.strokeStyle=major?'rgba(20,23,28,.5)':'rgba(20,23,28,.14)';ctx.lineWidth=major?1.5:1;ctx.stroke();}
  if(lower&&spec.show_reference&&presence>0){
   const lag=((reference-angle)%TAU+TAU)%TAU;
   if(lag>.004){ctx.beginPath();ctx.moveTo(cx,y);ctx.arc(cx,y,rad*.88,-Math.PI/2+angle,-Math.PI/2+angle+lag);ctx.closePath();ctx.fillStyle=`rgba(234,88,12,${.22*presence})`;ctx.fill();}
   ctx.setLineDash([3,4]);trace(ctx,[[cx,y],[cx+Math.sin(reference)*rad*.74,y-Math.cos(reference)*rad*.74]]);
   ctx.strokeStyle='rgba(20,23,28,.38)';ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([]);
  }
  ctx.lineCap='round';
  trace(ctx,[[cx-Math.sin(angle)*rad*.12,y+Math.cos(angle)*rad*.12],[cx+Math.sin(angle)*rad*.76,y-Math.cos(angle)*rad*.76]]);
  ctx.strokeStyle=accent;ctx.lineWidth=Math.max(2.5,rad*.045);ctx.stroke();
  ctx.beginPath();ctx.arc(cx,y,Math.max(3.5,rad*.06),0,TAU);ctx.fillStyle=accent;ctx.fill();
  ctx.beginPath();ctx.arc(cx,y,Math.max(1.5,rad*.025),0,TAU);ctx.fillStyle='#fff';ctx.fill();
  if(st.labels){const o={size:small?10:11,weight:600,spacing:'1.5px',color:'rgba(20,23,28,.62)'};
   if(small)text(ctx,name,cx,y-rad-13,{...o,align:'center'});else text(ctx,name,cx-rad-22,y,{...o,align:'right'});}
 }
 face(upperY,1,'HIGHER CLOCK',false);
 face(lowerY,rate,'LOWER CLOCK',true);
 if(st.labels&&spec.show_reference&&presence>0){
  const lx=cx+rad+16, size=small?10:11;
  ctx.fillStyle=`rgba(234,88,12,${.5*presence})`;ctx.fillRect(lx,lowerY-13,9,9);
  text(ctx,'fallen behind',lx+15,lowerY-8,{size});
  ctx.setLineDash([3,3]);trace(ctx,[[lx,lowerY+12],[lx+9,lowerY+12]]);ctx.strokeStyle='rgba(20,23,28,.45)';ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([]);
  text(ctx,small?'higher pace':'higher clock’s pace',lx+15,lowerY+12,{size});
 }
}

function pill(ctx,value,x,y,opts={}){
 // A label on a soft white backing so moving labels stay legible over lines and other text.
 const size=opts.size||11;ctx.font=`${opts.weight||500} ${size}px ${FONT}`;if('letterSpacing' in ctx)ctx.letterSpacing=opts.spacing||'0px';
 const width=ctx.measureText(value).width, left=opts.align==='right'?x-width:opts.align==='center'?x-width/2:x;
 ctx.fillStyle='rgba(255,255,255,.88)';ctx.beginPath();ctx.roundRect?ctx.roundRect(left-5,y-size*.75,width+10,size*1.5,size*.75):ctx.rect(left-5,y-size*.75,width+10,size*1.5);ctx.fill();
 if('letterSpacing' in ctx)ctx.letterSpacing='0px';text(ctx,value,x,y,opts);
}
function drawSpacetime(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.blue, v=Physics.speed(st.mass), g=Physics.gamma(v), T=Physics.turnaround(st.distance), H=2*T, small=w<520;
 // Scale to the whole trip, so the drawing fills the stage; the shape (and the percentage) does not depend on trip length.
 const k=Math.min((h-(st.labels?(small?128:92):52))/(H+.1),(w*.62)/Math.max(.9,v*T+1.1)), x0=w*.5-v*T*k*.5, y0=h-28, map=(x,t)=>[x0+x*k,y0-t*k];
 const top=y0/k;
 ctx.beginPath();ctx.moveTo(...map(0,0));ctx.lineTo(...map(top,top));ctx.lineTo(...map(-top,top));ctx.closePath();ctx.fillStyle=rgba(accent,.045);ctx.fill();
 ctx.setLineDash([2,5]);ctx.strokeStyle=rgba('#d97706',.6);ctx.lineWidth=1.2;
 trace(ctx,[map(-top,top),map(0,0),map(top,top)]);ctx.stroke();ctx.setLineDash([]);
 const tc=Math.min(H,((st.t*.42*Math.max(1,H/4.8))%(H+1.4)+H+1.4)%(H+1.4));
 const xAt=t=>t<=T?v*t:v*(H-t);
 ctx.lineCap='round';
 // Home: a tick every half year, a numbered mark every year.
 trace(ctx,[map(0,0),map(0,H)]);ctx.strokeStyle='rgba(20,23,28,.5)';ctx.lineWidth=2;ctx.stroke();
 for(let s=.5;s<=H+1e-9;s+=.5){const whole=Math.abs(s-Math.round(s))<1e-9,[x,y]=map(0,s);trace(ctx,[[x-(whole?7:4),y],[x+(whole?7:4),y]]);ctx.strokeStyle=whole?'rgba(20,23,28,.6)':'rgba(20,23,28,.3)';ctx.lineWidth=whole?1.6:1;ctx.stroke();
  if(whole&&st.labels)text(ctx,String(s),x-12,y,{align:'right',size:9,weight:600,color:'rgba(20,23,28,.5)'});}
 if(v>.001){
  trace(ctx,[map(0,0),map(v*T,T),map(0,H)]);ctx.strokeStyle=accent;ctx.lineWidth=Math.max(2.2,spec.line_width||2.5);ctx.stroke();
  // Traveller: one mark per half year of the traveller's own time, numbered each year; dilation spaces them out.
  for(let s=.5;s*g<=H+1e-9;s+=.5){const whole=Math.abs(s-Math.round(s))<1e-9,t=s*g,[x,y]=map(xAt(t),t);
   ctx.beginPath();ctx.arc(x,y,whole?4.2:2.4,0,TAU);ctx.fillStyle=accent;ctx.fill();
   if(whole){ctx.beginPath();ctx.arc(x,y,1.6,0,TAU);ctx.fillStyle='#fff';ctx.fill();if(st.labels)text(ctx,String(s),x+10,y,{size:9,weight:600,color:rgba(accent,.85)});}}
  if(st.labels||spec.show_reference){
   const slope=tc<=T?v:-v, xc=xAt(tc), left=-1.1, right=v*T+1.4, a=map(left,tc+slope*(left-xc)), b=map(right,tc+slope*(right-xc));
   ctx.setLineDash([5,5]);trace(ctx,[a,b]);ctx.strokeStyle=rgba(accent,.45);ctx.lineWidth=1.2;ctx.stroke();ctx.setLineDash([]);
   if(st.labels)pill(ctx,'traveller’s “now”',b[0],b[1],{align:'right',size:10,weight:500,color:rgba(accent,.9)});
  }
 }
 const [hx,hy]=map(0,tc),[tx,ty]=map(xAt(tc),tc);
 for(const [x,y,c] of [[hx,hy,'#14171c'],[tx,ty,accent]]){const glow=ctx.createRadialGradient(x,y,0,x,y,15);glow.addColorStop(0,rgba(c,.3));glow.addColorStop(1,rgba(c,0));ctx.fillStyle=glow;ctx.fillRect(x-15,y-15,30,30);
  ctx.beginPath();ctx.arc(x,y,5.5,0,TAU);ctx.fillStyle=c;ctx.fill();ctx.beginPath();ctx.arc(x,y,2,0,TAU);ctx.fillStyle='#fff';ctx.fill();}
 if(st.labels){
  const size=small?10:11, close=Math.abs(tx-hx)<150;
  if(Math.abs(hy-map(0,H*.5)[1])>34&&!small)text(ctx,'time ↑',x0-34,map(0,H*.5)[1],{align:'right',size:10});
  text(ctx,'space →',x0+12,y0+16,{size:10});
  text(ctx,'LIGHT',map(top*.8,top*.8)[0]+8,map(0,top*.8)[1],{size:9,weight:600,spacing:'1.5px',color:'rgba(217,119,6,.8)'});
  pill(ctx,`HOME  ${tc.toFixed(1)} yr`,hx-30,hy,{align:'right',size,weight:600,color:'rgba(20,23,28,.8)',spacing:'.5px'});
  if(v>.001)pill(ctx,`TRAVELLER  ${(tc/g).toFixed(1)} yr`,Math.max(tx,hx)+16,close?Math.min(ty,hy)-16:ty,{size,weight:600,color:accent,spacing:'.5px'});
  else pill(ctx,'traveller stays home',hx+16,hy,{size,weight:500,color:accent});
 }
}

// A screen lit by brightness samples [[x, 0..1], ...], drawn as one smooth gradient so no seams show.
function screenStrip(ctx,pts,y,band){
 const x0=pts[0][0], x1=pts.at(-1)[0], g=ctx.createLinearGradient(x0,0,x1,0);
 for(const [x,I] of pts)g.addColorStop((x-x0)/(x1-x0),`rgba(255,244,214,${Math.min(1,Math.max(0,I))})`);
 ctx.fillStyle=g;ctx.fillRect(x0,y,x1-x0,band);
}
let fieldBuffer=null;
function drawInterference(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.blue, A=st.mass, lam=Math.max(22,Math.min(w,h)/9), k=TAU/lam, d=Physics.separation(st.distance)*lam;
 const cx=w/2, sy=st.labels&&w<520?h*.22:h*.1, screen=st.labels?h*.8:h, s1=[cx-d/2,sy], s2=[cx+d/2,sy], phase=st.t*TAU*.55;
 const cell=w<520?3:4, cols=Math.ceil(w/cell), rows=Math.ceil(screen/cell);
 fieldBuffer=fieldBuffer||document.createElement('canvas');
 if(fieldBuffer.width!==cols||fieldBuffer.height!==rows){fieldBuffer.width=cols;fieldBuffer.height=rows;}
 const fctx=fieldBuffer.getContext('2d'), image=fctx.createImageData(cols,rows), data=image.data;
 const n=parseInt(accent.slice(1),16), ar=n>>16, ag=n>>8&255, ab=n&255;
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  const x=i*cell, y=j*cell, r1=Math.hypot(x-s1[0],y-s1[1]), r2=Math.hypot(x-s2[0],y-s2[1]);
  const f=(Math.cos(k*r1-phase)/Math.sqrt(1+r1/lam)+A*Math.cos(k*r2-phase)/Math.sqrt(1+r2/lam))/2;
  const o=4*(j*cols+i), a=Math.min(1,Math.abs(f)*1.15);
  if(f>0){data[o]=ar;data[o+1]=ag;data[o+2]=ab;data[o+3]=a*150;}else{data[o]=20;data[o+1]=30;data[o+2]=50;data[o+3]=a*55;}
 }
 fctx.putImageData(image,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(fieldBuffer,0,0,cols*cell,rows*cell);
 // Time-averaged brightness on the screen: crests meeting crests stay bright.
 const band=h*.08, sx0=w*.04, sx1=w*.96;
 if(st.labels){
 const pts=[];for(let i=0;i<=200;i++){const x=sx0+(sx1-sx0)*i/200, dr=Math.hypot(x-s1[0],screen-s1[1])-Math.hypot(x-s2[0],screen-s2[1]);pts.push([x,Physics.brightness(A,k*dr)]);}
 ctx.fillStyle='rgba(255,255,255,.7)';ctx.fillRect(0,screen,w,h-screen);
 ctx.fillStyle='#1e1d1b';ctx.fillRect(sx0,screen+6,sx1-sx0,band);
 screenStrip(ctx,pts.map(([x,I])=>[x,I*1.05]),screen+6,band);
 }
 for(const [p,on] of [[s1,1],[s2,A]]){ctx.globalAlpha=on>0.001?.4+.6*Math.min(1,on):.25;ctx.beginPath();ctx.arc(p[0],p[1],6,0,TAU);ctx.fillStyle=on>0.001?accent:'#fff';ctx.fill();ctx.strokeStyle='rgba(20,23,28,.4)';ctx.lineWidth=1;ctx.stroke();ctx.globalAlpha=1;}
 if(st.labels){
  const size=w<520?10:11;
  text(ctx,'SOURCE',s1[0]-12,s1[1],{align:'right',size,weight:600,spacing:'1.5px'});
  const far=s2[0]+130>w;text(ctx,A>0.001?'SECOND SOURCE':'second source off',far?s2[0]-12:s2[0]+12,far?s2[1]+18:s2[1],{size,weight:600,spacing:A>0.001?'1.5px':'0px',color:A>0.001?'rgba(20,23,28,.64)':'rgba(20,23,28,.5)'});
  text(ctx,'SCREEN · brightness averaged over time',sx0,screen+band+22,{size:10,weight:600,spacing:'1px'});
 }
}

const hash=i=>{let x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);};
let patternCache={key:'',cdf:null};
function slitPattern(A,sep,bins){
 const key=A.toFixed(3)+'|'+sep.toFixed(3)+'|'+bins;
 if(patternCache.key===key)return patternCache;
 const p=[];let total=0;
 for(let i=0;i<bins;i++){const y=(i+.5)/bins*2-1, env=Math.pow(Math.cos(y*Math.PI/2.15),2), I=env*Physics.intensity(A,TAU*sep*y*.9);p.push(I);total+=I;}
 const cdf=[];let run=0;for(const v of p){run+=v/total;cdf.push(run);}
 patternCache={key,p:p.map(v=>v/Math.max(...p)),cdf};return patternCache;
}
function drawParticles(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.mint, A=st.mass, sep=Physics.separation(st.distance), small=w<520;
 const srcX=w*.08, wallX=w*.42, scrX=w*.8, midY=st.labels&&small?h*.58:h*.5, span=st.labels&&small?h*.32:h*.38, gap=span*.075*sep, slit=Math.max(6,h*.025);
 const bins=120, pat=slitPattern(A,sep,bins);
 // Probability ripples: possibilities spread through every open slit; no path is drawn.
 const phase=(st.t*.8)%1;
 for(let r=0;r<5;r++){const rad=((r+phase)/5)*(wallX-srcX);ctx.beginPath();ctx.arc(srcX,midY,rad,-.6,.6);ctx.strokeStyle=rgba(accent,.18*(1-r/5));ctx.lineWidth=1.2;ctx.stroke();}
 for(const [y,on] of [[midY-gap/2,1],[midY+gap/2,A]]){if(on<.001)continue;for(let r=0;r<6;r++){const rad=((r+phase)/6)*(scrX-wallX);ctx.beginPath();ctx.arc(wallX,y,rad,-.9,.9);ctx.strokeStyle=rgba(accent,.14*on*(1-r/6));ctx.lineWidth=1.1;ctx.stroke();}}
 ctx.beginPath();ctx.arc(srcX,midY,6,0,TAU);ctx.fillStyle=accent;ctx.fill();
 // Barrier with two slits; the second opens with the first slider.
 ctx.fillStyle='rgba(20,23,28,.78)';
 const y1=midY-gap/2, y2=midY+gap/2;
 ctx.fillRect(wallX-3,midY-span,6,y1-slit-(midY-span));ctx.fillRect(wallX-3,y1+slit,6,y2-slit-(y1+slit));ctx.fillRect(wallX-3,y2+slit,6,midY+span-(y2+slit));
 if(A<1){ctx.fillStyle=`rgba(20,23,28,${.78*(1-A)})`;ctx.fillRect(wallX-3,y2-slit,6,2*slit);}
 // Screen and arrivals, accumulated one at a time.
 const sw=small?14:18;ctx.fillStyle='#fff';ctx.fillRect(scrX,midY-span,sw,2*span);ctx.strokeStyle='rgba(20,23,28,.15)';ctx.strokeRect(scrX,midY-span,sw,2*span);
 const count=Math.min(2400,Math.floor(st.t*55)), counts=new Array(bins).fill(0);
 for(let i=0;i<count;i++){
  const u=hash(i+1);let lo=0,hi=bins-1;while(lo<hi){const m=(lo+hi)>>1;if(pat.cdf[m]<u)lo=m+1;else hi=m;}
  counts[lo]++;const y=midY-span+(lo+hash(i+7.3))/bins*2*span, x=scrX+2+hash(i+3.1)*(sw-4), fresh=i>=count-3;
  ctx.beginPath();ctx.arc(x,y,fresh?2.6:1.1,0,TAU);ctx.fillStyle=fresh?accent:rgba(accent,.55);ctx.fill();
 }
 const hx=scrX+sw+8, hw=w-hx-16, peak=Math.max(1,...counts);
 for(let i=0;i<bins;i++){if(!counts[i])continue;const y=midY-span+i/bins*2*span;ctx.fillStyle=rgba(accent,.35);ctx.fillRect(hx,y,counts[i]/peak*hw*.9,2*span/bins+.5);}
 if(spec.show_reference){trace(ctx,pat.p.map((v,i)=>[hx+v*hw*.9,midY-span+(i+.5)/bins*2*span]));ctx.setLineDash([3,4]);ctx.strokeStyle='rgba(20,23,28,.4)';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);}
 if(st.labels){
  const size=small?9:11;
  text(ctx,'ONE AT A TIME',srcX,midY-24,{size,weight:600,spacing:'1px'});
  text(ctx,A>0.001?'TWO SLITS':'ONE SLIT OPEN',wallX,midY-span-12,{align:'center',size,weight:600,spacing:'1px'});
  text(ctx,`${count} arrivals`,scrX,midY+span+16,{size,weight:600,color:accent});
  if(!small)text(ctx,'each lands at one random spot; the pattern is not random',scrX+sw,midY-span-12,{align:'right',size:10});
 }
}

// The rope: simulated, not drawn from a formula. Each chapter has its own shaking plan; the simulation runs from the
// chapter's start, is advanced frame by frame during playback and rebuilt when seeking, so frames match playback.
const ROPE={key:'',s:null,rate:0,size:0,on:0,held:0};
function ropePlan(spec,st){
 const lines=timeline?.chapters?.[st.stage]?.lines||[], c0=timeline?.chapters?.[st.stage]?.start||0;
 const third=lines[1]?lines[1].start-c0:8;
 if(st.stage===0)return {key:'pulse',plan:{pulse:true},t:Math.max(0,st.since-1.2)*.125,rate:0};
 const rates=st.stage===1?[[.8,1]]:st.stage===2?[[.8,1.5]]:[[.8,2],[third,3]];
 const t=Math.max(0,st.since), seg=rates.filter(([t0])=>t>=t0).at(-1)||rates[0];
 return {key:`${st.stage}|${third.toFixed(2)}`,plan:{rates},t,rate:seg[1],held:t-seg[0]};
}
function ropeAdvance(spec,st){
 const P=Physics, {key,plan,t,rate,held}=ropePlan(spec,st);
 if(ROPE.key!==key||!ROPE.s||t<ROPE.s.t-1e-6){ROPE.key=key;ROPE.s=P.ropeStart();}
 P.ropeStep(ROPE.s,t,P.ropeHand(plan));
 ROPE.rate=rate;ROPE.held=held??0;ROPE.on=st.stage===0?0:1;
 ROPE.size=ROPE.rate>0?P.ropeSize(ROPE.s,ROPE.rate):0;
 return ROPE.s;
}
// A fist gripping the rope's end, seen from the side: the forearm in a sleeve, the back of the hand, four curled
// fingers wrapped around the rope and the thumb laid across them. (x, y) is where the rope leaves the fist.
function drawHand(ctx,x,y,size){
 const skin='#e0ad86', edge='rgba(110,62,35,.55)', u=size;
 const blob=(x0,y0,w,h,r)=>{ctx.beginPath();ctx.roundRect(x0,y0,w,h,r);ctx.fill();ctx.stroke();};
 // The rope runs into the grip, hidden by the fingers.
 trace(ctx,[[x-u*1.2,y],[x,y]]);ctx.strokeStyle='rgba(37,99,235,.9)';ctx.lineWidth=2.5;ctx.stroke();
 // Sleeve and cuff.
 ctx.fillStyle='#4a5566';ctx.beginPath();ctx.roundRect(x-u*4.8,y-u*.52,u*3.2,u*1.04,u*.24);ctx.fill();
 ctx.fillStyle='#3a4352';ctx.beginPath();ctx.roundRect(x-u*1.78,y-u*.6,u*.3,u*1.2,u*.1);ctx.fill();
 ctx.lineWidth=1.2;ctx.strokeStyle=edge;
 // Back of the hand.
 ctx.fillStyle=skin;blob(x-u*1.55,y-u*.66,u*1.05,u*1.32,u*.42);
 // Four curled fingers, top to bottom, each wrapping over the rope.
 ctx.fillStyle=skin;for(let k=3;k>=0;k--)blob(x-u*.82,y-u*.66+k*u*.33,u*.86,u*.36,u*.18);
 // The thumb, resting along the top of the fingers and pointing forward.
 ctx.save();ctx.translate(x-u*1.2,y-u*.62);ctx.rotate(.18);ctx.fillStyle=skin;blob(0,-u*.22,u*1.05,u*.36,u*.18);ctx.restore();
}
// The guitar string: pulled into a bend and let go; it rings in its in-step patterns, mostly the slowest. Pressing it
// at the middle leaves half the string ringing, twice as fast. Drawn slowed down 220 times; heard at the real pitch.
const GUITAR={active:false,len:1,plucked:[],tAbs:null,lastSince:-1,lastLen:null,key:''};
const guitarLen=b=>1-(b-1)/1.5*.5;
function guitarPlan(st){
 const c=timeline?.chapters?.[st.stage], lines=c?.lines||[], c0=c?.start||0;
 const press=lines[2]?lines[2].start-c0:9;
 return {plucks:[[.9,1],[press+.9,.5]],press};
}
function drawGuitar(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.gold, warm='#c2410c', small=w<520, P=Physics, p=P.stringPluckAt;
 const x0=w*(small?.08:.12), x1=w*(small?.92:.88), yc=h*.46, W=x1-x0, amp=(small?.16:.1)*W*st.mass;
 let len, age, pull=0;
 if(st.live){
  // Exploring: each move of "Where you press" plucks the string again.
  len=guitarLen(st.distance);
  if(GUITAR.lastLen===null)GUITAR.lastLen=len;
  if(Math.abs(len-GUITAR.lastLen)>.004){GUITAR.lastLen=len;GUITAR.tAbs=st.t;soundPluck(220/len);GUITAR.plucked.push(Math.round(220/len));}
  age=GUITAR.tAbs===null?99:st.t-GUITAR.tAbs;
 }else{
  const {plucks,press}=guitarPlan(st), since=st.since;
  if(GUITAR.key!==String(st.stage)||since<GUITAR.lastSince){GUITAR.key=String(st.stage);GUITAR.lastSince=-1;}
  for(const [tp,L] of plucks)if(st.playing&&GUITAR.lastSince<tp&&since>=tp){soundPluck(220/L);GUITAR.plucked.push(Math.round(220/L));}
  GUITAR.lastSince=since;
  const last=plucks.filter(([tp])=>since>=tp).at(-1), next=plucks.find(([tp])=>since<tp);
  len=since>=press?.5:1;
  if(next&&next[0]-since<.6){pull=1-(next[0]-since)/.6;age=null;}
  else age=last?since-last[0]:null;
  GUITAR.tAbs=age===null?null:st.t-age;GUITAR.lastLen=len;
 }
 GUITAR.active=true;GUITAR.len=len;
 // The fretboard, its frets at real guitar spacing, the nut on the left and the bridge on the right.
 const board=small?h*.1:h*.13;
 ctx.fillStyle='#8a5a3b';ctx.beginPath();ctx.roundRect(x0-8,yc-board/2,W+16,board,6);ctx.fill();
 for(let k=1;k<=12;k++){const fx=x0+W*(1-Math.pow(2,-k/12));trace(ctx,[[fx,yc-board/2],[fx,yc+board/2]]);ctx.strokeStyle='rgba(235,225,210,.55)';ctx.lineWidth=1.4;ctx.stroke();}
 ctx.fillStyle='#efe6d4';ctx.fillRect(x0-6,yc-board/2-2,6,board+4);ctx.fillStyle='#2a2a2e';ctx.fillRect(x1,yc-board/2-2,7,board+4);
 // The string: still between the nut and a pressing finger; the ringing part from there to the bridge.
 const xs=x0+W*(1-len), N=200, ring=Array.from({length:N+1},(_,i)=>{const u=i/N;let v=0;
  if(pull>0)v=pull*(u<p?u/p:(1-u)/(1-p));else if(age!==null)v=P.stringY(u,age,len);return [xs+u*(x1-xs),yc-v*amp];});
 if(xs>x0+1){trace(ctx,[[x0,yc],[xs,yc]]);ctx.strokeStyle='rgba(225,225,230,.9)';ctx.lineWidth=2;ctx.stroke();}
 trace(ctx,ring);ctx.strokeStyle='rgba(245,240,230,.95)';ctx.lineWidth=2.4;ctx.stroke();
 trace(ctx,ring);ctx.strokeStyle=rgba(accent,.35);ctx.lineWidth=6;ctx.stroke();
 const skin='#e0ad86', edge='rgba(110,62,35,.55)';
 // A fingertip pulls the string before each pluck.
 if(pull>0){const fx=xs+p*(x1-xs), fy=yc-pull*amp;ctx.fillStyle=skin;ctx.strokeStyle=edge;ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(fx,fy-9,8,11,0,0,TAU);ctx.fill();ctx.stroke();}
 // A finger pressing the string at the middle.
 if(len<.999){const f=small?9:12;ctx.fillStyle=skin;ctx.strokeStyle=edge;ctx.lineWidth=1.2;
  ctx.beginPath();ctx.roundRect(xs-f*.9,yc-f*5.2,f*1.8,f*4.6,f*.9);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.ellipse(xs,yc-f*.35,f,f*1.25,0,0,TAU);ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(255,240,230,.9)';ctx.strokeStyle=edge;ctx.beginPath();ctx.roundRect(xs-f*.5,yc-f*1.05,f,f*.75,f*.3);ctx.fill();ctx.stroke();}
 if(!st.labels)return;
 const lsize=small?10:11, base=yc+board/2+(small?24:30);
 text(ctx,'a guitar string, drawn 220× slower',(x0+x1)/2,yc-board/2-(small?40:52),{align:'center',size:lsize,weight:600,color:'rgba(20,23,28,.7)'});
 text(ctx,len<.999?(len>.51?`pressed: ${Math.round(len*100)}% of the string rings`:'pressed at the middle: half the string rings'):'open string: the whole string rings',(x0+x1)/2,base,{align:'center',size:small?11:12,weight:600,color:len<.999?warm:accent});
 if(pull>0)pill(ctx,'pluck',xs+p*(x1-xs),yc-amp-34,{align:'center',size:lsize,weight:600,color:accent});
}
function drawRope(ctx,w,h,spec,st){
 if(st.stage>=4||st.live)return drawGuitar(ctx,w,h,spec,st);
 GUITAR.active=false;
 const accent=ACCENT[spec.accent]||ACCENT.gold, warm='#c2410c', small=w<520, P=Physics, A=P.ropeModel.A, N=P.ropeModel.N;
 const s=ropeAdvance(spec,st), y=s.y, x0=w*(small?.22:.17), x1=w*(small?.9:.86), yc=h*.46, W=x1-x0, size=small?15:24;
 // Heights use the rope's own scale; on a phone they are drawn 2.2 times taller so the swing stays easy to see.
 const V=small?W*2.2:W, X=i=>x0+i/N*W, Y=v=>yc-v*V;
 trace(ctx,[[x0,yc],[x1,yc]]);ctx.strokeStyle='rgba(20,23,28,.1)';ctx.lineWidth=1;ctx.setLineDash([3,5]);ctx.stroke();ctx.setLineDash([]);
 // The wall, with the ring the rope is tied to.
 ctx.fillStyle='rgba(20,23,28,.78)';ctx.fillRect(x1+5,yc-h*.24,10,h*.48);
 ctx.beginPath();ctx.arc(x1+3,yc,4.5,0,TAU);ctx.strokeStyle='rgba(20,23,28,.8)';ctx.lineWidth=2;ctx.stroke();
 const pts=Array.from({length:N+1},(_,i)=>[X(i),Y(y[i])]);
 ctx.lineCap='round';ctx.lineJoin='round';
 trace(ctx,pts);ctx.strokeStyle=rgba(accent,.16);ctx.lineWidth=(spec.line_width||2.5)*4;ctx.stroke();
 trace(ctx,pts);ctx.strokeStyle=accent;ctx.lineWidth=spec.line_width||2.5;ctx.stroke();
 drawHand(ctx,x0,Y(y[0]),size);
 // In step at a whole-number rate: mark the still points between the loops.
 const n=Math.round(ROPE.rate), inStep=ROPE.size>3.2&&ROPE.held>2.5&&n>=1&&Math.abs(ROPE.rate-n)<.04;
 if(inStep)for(let m=1;m<n;m++){ctx.beginPath();ctx.arc(x0+m/n*W,yc,4.5,0,TAU);ctx.fillStyle=warm;ctx.fill();}
 if(!st.labels)return;
 const lsize=small?10:11, base=yc+h*.3;
 text(ctx,'your hand',x0-size*1.2,base,{align:'center',size:lsize,weight:600,color:'rgba(20,23,28,.7)'});
 text(ctx,'tied to a wall',small?w-6:x1+10,base,{align:small?'right':'center',size:lsize,weight:600,color:'rgba(20,23,28,.7)'});
 const shakes=ROPE.rate, rateText=st.stage===0?'one shake, 8× slower':`${shakes%1?shakes.toFixed(1):shakes} shake${shakes===1?'':'s'} a second`;
 text(ctx,rateText,x0-size*1.2,base+18,{align:'center',size:small?11:13,weight:600,color:'rgba(20,23,28,.78)'});
 if(st.stage===0){
  // Follow the hump: out to the wall, then back upside down.
  let k=4;for(let i=4;i<N;i++)if(Math.abs(y[i])>Math.abs(y[k]))k=i;
  const leg=Math.floor(Math.max(0,2*(s.t-.15)));
  if(leg<2&&Math.abs(y[k])>.25*A){const up=y[k]>0;pill(ctx,leg?'← back, upside down':'hump →',X(k),Y(y[k])+(up?-22:22),{align:'center',size:lsize,weight:600,color:leg?warm:accent});}
 }else if(inStep){
  text(ctx,`in step: ${n} loop${n>1?'s':''}`,(x0+x1)/2,base,{align:'center',size:small?11:12,weight:600,color:accent});
  // The still point's tag sits below the swing, joined to its dot by a thin line.
  if(n>1){const px=x0+W/n, ty=yc+.17*V+14;trace(ctx,[[px,yc+6],[px,ty-8]]);ctx.strokeStyle=rgba(warm,.5);ctx.lineWidth=1;ctx.stroke();pill(ctx,'still point',px,ty,{align:'center',size:10,weight:600,color:warm});}
 }else if(shakes>0&&Math.abs(shakes-n)>.04&&st.since>3)text(ctx,small?'out of step':'out of step: the rope only jiggles',(x0+x1)/2,base,{align:'center',size:small?11:12,weight:600,color:warm});
}

function drawTunnel(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.blue, bar=Physics.barrier(st.mass,st.distance), small=w<520, C=Physics.cx;
 const xmin=-14,xmax=14, X=x=>w*.05+(x-xmin)/(xmax-xmin)*w*.9, y0=h*(small?.6:.56), amp=h*.15, phase=st.t*2.2;
 const rot=[Math.cos(-phase),Math.sin(-phase)];
 // Barrier band; its height relative to the particle's energy is printed on it.
 if(bar.V>1e-4){
  const x0=X(0),x1=X(bar.w);ctx.fillStyle=`rgba(20,23,28,${.06+.12*Math.min(1,bar.V/2)})`;ctx.fillRect(x0,h*.14,x1-x0,h*.72);
  ctx.strokeStyle='rgba(20,23,28,.3)';ctx.lineWidth=1;ctx.strokeRect(x0,h*.14,x1-x0,h*.72);
 }
 trace(ctx,[[X(xmin),y0],[X(xmax),y0]]);ctx.strokeStyle='rgba(20,23,28,.12)';ctx.stroke();
 const N=520, env=[], re=[];
 for(let i=0;i<=N;i++){const x=xmin+(xmax-xmin)*i/N, v=bar.psi(x), m=Math.sqrt(C.abs2(v)), r=C.mul(v,rot)[0];env.push([X(x),m]);re.push([X(x),y0-r*amp]);}
 ctx.beginPath();env.forEach(([x,m],i)=>i?ctx.lineTo(x,y0-m*amp):ctx.moveTo(x,y0-m*amp));for(let i=env.length-1;i>=0;i--)ctx.lineTo(env[i][0],y0+env[i][1]*amp);ctx.closePath();
 ctx.fillStyle=rgba(accent,.1);ctx.fill();
 ctx.lineJoin='round';trace(ctx,re);ctx.strokeStyle=accent;ctx.lineWidth=spec.line_width||2.4;ctx.stroke();
 if(st.labels){
  const size=small?10:11, top=h*.14-12;
  text(ctx,'COMING IN + BOUNCING BACK',X(-7),top,{align:'center',size,weight:600,spacing:'1px'});
  text(ctx,'GETS THROUGH',X(7.4),top,{align:'center',size,weight:600,spacing:'1px'});
  if(bar.V>1e-4)pill(ctx,`barrier ${(bar.V/bar.E).toFixed(1)}× the energy`,(X(0)+X(bar.w))/2,h*.86+14,{align:'center',size:10,weight:500});
  else text(ctx,'no barrier',X(.5),h*.86+14,{align:'center',size:10});
  pill(ctx,`${Math.round(bar.T*100)}% through`,X(10.5),y0-Math.sqrt(bar.T)*amp-18,{align:'center',size,weight:600,color:accent});
  text(ctx,'shaded band: how spread out the wave is · line: the wave at this instant',w/2,h-14,{align:'center',size:small?9:10});
 }
}

function drawPacket(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.mint, P=Physics.packet(st.mass,st.distance), small=w<520;
 const cycle=((st.t*.035)%1+1)%1, tt=cycle*.9, fade=smooth(cycle/.06)*smooth((1-cycle)/.06);
 const xmin=-16,xmax=16,start=-9, X=x=>w*.05+(x-xmin)/(xmax-xmin)*w*.9, y0=h*(small?.42:.38), amp=h*.17;
 const peak=P.comps.reduce((s,[,v])=>s+v,0)/Math.sqrt(P.comps.reduce((s,[,v])=>s+v*v,0));
 trace(ctx,[[X(xmin),y0],[X(xmax),y0]]);ctx.strokeStyle='rgba(20,23,28,.12)';ctx.lineWidth=1;ctx.stroke();
 const N=600, env=[], re=[];
 for(let i=0;i<=N;i++){const x=xmin+(xmax-xmin)*i/N, v=P.psi(x-start,tt), m=Math.sqrt(Physics.cx.abs2(v))/peak;env.push([X(x),m]);re.push([X(x),y0-v[0]/peak*amp]);}
 ctx.globalAlpha=fade;
 ctx.beginPath();env.forEach(([x,m],i)=>i?ctx.lineTo(x,y0-m*amp):ctx.moveTo(x,y0-m*amp));for(let i=env.length-1;i>=0;i--)ctx.lineTo(env[i][0],y0+env[i][1]*amp);ctx.closePath();
 ctx.fillStyle=rgba(accent,.12);ctx.fill();
 trace(ctx,re);ctx.strokeStyle=accent;ctx.lineWidth=spec.line_width||2.2;ctx.lineJoin='round';ctx.stroke();ctx.globalAlpha=1;
 // Momentum mix: one bar per wavelength blended into the packet.
 const by=h*.88, bh=h*.17, kmin=P.k0-4, kmax=P.k0+4, K=k=>w*.2+(k-kmin)/(kmax-kmin)*w*.6, top=Math.max(...P.comps.map(([,v])=>v));
 trace(ctx,[[K(kmin),by],[K(kmax),by]]);ctx.strokeStyle='rgba(20,23,28,.2)';ctx.stroke();
 const bw=Math.max(1.5,(K(kmin+2*Math.PI/P.L)-K(kmin))*.7);
 for(const [k,v] of P.comps){const hh=(v/top)**2*bh;ctx.fillStyle=rgba(accent,.75);ctx.fillRect(K(k)-bw/2,by-hh,bw,hh);}
 if(st.labels){
  const size=small?10:11;
  text(ctx,'WHERE IT MIGHT BE',X(xmin),y0-amp-22,{size,weight:600,spacing:'1px'});
  text(ctx,'WHICH SPEEDS ARE MIXED IN',K(kmin),by-bh-12,{size,weight:600,spacing:'1px'});
  text(ctx,P.comps.length===1?'one pure wave: exact speed, spread everywhere':`${P.comps.length} waves blended: the more speeds mixed in, the narrower in place`,w/2,by+16,{align:'center',size:small?9:10});
 }
}

function drawWell(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.gold, W=Physics.well(st.mass,st.distance), small=w<520;
 const xmin=-2.4,xmax=2.4, X=x=>w*.06+(x-xmin)/(xmax-xmin)*w*(small?.7:.74), Emax=3,Emin=-26, top=h*(st.labels&&small?.24:.14), bottom=h*.9;
 const Y=E=>top+(Emax-E)/(Emax-Emin)*(bottom-top), half=W.L/2, rim=Y(0), floor=Y(-W.V);
 // Ground on both sides and a pit whose depth is the well depth.
 if(W.V>1e-4){
  const pit=ctx.createLinearGradient(0,rim,0,floor);pit.addColorStop(0,'rgba(255,255,255,0)');pit.addColorStop(1,rgba(accent,.08));ctx.fillStyle=pit;ctx.fillRect(X(-half),rim,X(half)-X(-half),floor-rim);}
 trace(ctx,[[X(xmin),rim],[X(-half),rim],[X(-half),floor],[X(half),floor],[X(half),rim],[X(xmax),rim]]);
 ctx.strokeStyle='rgba(60,40,25,.7)';ctx.lineWidth=2.2;ctx.lineJoin='round';ctx.stroke();
 // Each allowed level: its wave fits the trap and leaks only a little into the walls.
 const ys=W.levels.map(l=>Y(l.E));
 W.levels.forEach((l,i)=>{
  const y=ys[i], room=Math.min(i?ys[i-1]-y:floor-y, i<ys.length-1?y-ys[i+1]:y-rim)*.42, amp=Math.max(4,Math.min(room,h*.06));
  const reach=half+Math.min(.55,1.4/Math.max(l.kappa,.6)), vib=Math.cos(st.t*(1.2+.55*i));
  trace(ctx,[[X(-half),y],[X(half),y]]);ctx.strokeStyle='rgba(20,23,28,.18)';ctx.lineWidth=1;ctx.setLineDash([3,4]);ctx.stroke();ctx.setLineDash([]);
  const pts=[];for(let j=0;j<=180;j++){const x=-reach+2*reach*j/180;pts.push([X(x),y-W.psi(l,x)*amp*vib]);}
  // Inside the trap the wave is solid; the short leak into the walls is drawn faded.
  const inside=pts.filter((_,j)=>Math.abs(-reach+2*reach*j/180)<=half), leftLeak=pts.filter((_,j)=>-reach+2*reach*j/180<=-half+1e-9), rightLeak=pts.filter((_,j)=>-reach+2*reach*j/180>=half-1e-9);
  ctx.lineCap='round';
  for(const seg of [leftLeak,rightLeak]){trace(ctx,seg);ctx.strokeStyle=rgba(accent,.35);ctx.lineWidth=1.6;ctx.setLineDash([2,3]);ctx.stroke();ctx.setLineDash([]);}
  trace(ctx,inside);ctx.strokeStyle=rgba(accent,.18);ctx.lineWidth=7;ctx.stroke();
  trace(ctx,inside);ctx.strokeStyle=i===0?accent:rgba(accent,.8);ctx.lineWidth=i===0?2.6:2;ctx.stroke();
 });
 // Energy ladder: only these rungs exist; the gaps between them are not allowed.
 const lx=w*(small?.83:.86), lw=w*(small?.1:.07);
 ctx.fillStyle='rgba(20,23,28,.05)';ctx.fillRect(lx,W.V>1e-4?floor:rim,lw,(W.V>1e-4?rim-floor:0));
 for(const y of ys){ctx.fillStyle=accent;ctx.fillRect(lx-2,y-1.5,lw+4,3);}
 if(st.labels){
  const size=small?10:11;
  text(ctx,'energy ↑',lx+lw/2,top-14,{align:'center',size:10});
  text(ctx,'ALLOWED',lx+lw/2,bottom+12>h-4?bottom-8:bottom+12,{align:'center',size:9,weight:600,spacing:'1.5px'});
  ys.forEach((y,i)=>pill(ctx,i===0?'lowest level':`level ${i+1}`,X(half+.62)+10,y,{size:10,weight:600,color:'rgba(20,23,28,.7)'}));
  if(W.levels.length)text(ctx,'dotted: the wave leaks a little into the walls',X(0),Math.min(h-10,bottom+4),{align:'center',size:10});
  if(W.V>1e-4)text(ctx,'TRAP',X(-half)-10,floor-10,{align:'right',size,weight:600,spacing:'1.5px',color:'rgba(60,40,25,.75)'});
  else text(ctx,small?'no trap: any energy is possible':'no trap: nothing holds the particle, so any energy is possible',X(0),rim-24,{align:'center',size});
 }
}
function drawFall(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.blue, F=Physics.fall(st.mass,st.distance), small=w<520, warm='#c2410c';
 // Height against time, with a side view of the same throw at the left edge of the diagram.
 const col=small?w*.1:w*.07, x0=small?w*.2:w*.13, x1=small?w*.94:w*.5, ground=h*(small?.5:.76), topY=small?96:70, scaleA=Math.max(F.best,F.ref)*2;
 const X=t=>x0+t/F.T*(x1-x0), Y=hh=>ground-hh/scaleA*(ground-topY);
 const shade=ctx.createLinearGradient(0,ground,0,topY);shade.addColorStop(0,`rgba(245,158,66,${.24*Math.min(1,F.g/.8)})`);shade.addColorStop(1,'rgba(245,158,66,0)');
 ctx.fillStyle=shade;ctx.fillRect(col-18,topY,x1-col+18,ground-topY);
 trace(ctx,[[col-18,ground],[x1,ground]]);ctx.strokeStyle='rgba(20,23,28,.5)';ctx.lineWidth=1.6;ctx.stroke();
 // Candidate paths between the same two moments: stay put, a low throw, the real throw, a high throw.
 const unit=F.best>1e-9?F.best:F.ref, paths=[['Held at the ground',0,'#14171c'],['A low throw',.45*unit,'rgba(20,23,28,.4)'],[F.best>1e-9?'The real throw':'A throw',unit,accent],['A high throw',1.75*unit,'rgba(20,23,28,.4)']];
 const best=F.best>1e-9?2:0, u=Math.min(1,(st.since??st.t)*.18), t=u*F.T;
 const curve=apex=>Array.from({length:121},(_,i)=>{const s=F.T*i/120;return [X(s),Y(F.height(apex,s))];});
 paths.forEach(([,apex,c],i)=>{if(!apex)return;trace(ctx,curve(apex));if(i!==2)ctx.setLineDash([4,5]);ctx.strokeStyle=c;ctx.lineWidth=i===2?2.6:1.3;ctx.lineCap='round';ctx.stroke();ctx.setLineDash([]);});
 for(const [i,c] of [[0,'#14171c'],[2,accent]]){const p=[X(t),Y(F.height(paths[i][1],t))];ctx.beginPath();ctx.arc(p[0],p[1],5.5,0,TAU);ctx.fillStyle=c;ctx.fill();ctx.beginPath();ctx.arc(p[0],p[1],2,0,TAU);ctx.fillStyle='#fff';ctx.fill();}
 // The side view: the ball goes straight up and comes back to the hand.
 trace(ctx,[[col,ground],[col,topY]]);ctx.setLineDash([2,4]);ctx.strokeStyle='rgba(20,23,28,.15)';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
 const by=Y(F.height(paths[2][1],t));ctx.beginPath();ctx.arc(col,by,7,0,TAU);ctx.fillStyle=accent;ctx.fill();
 ctx.beginPath();ctx.ellipse(col,ground+5,11,5,0,0,TAU);ctx.fillStyle='rgba(122,84,52,.55)';ctx.fill();
 if(!st.labels)return;
 const size=small?10:11;
 text(ctx,'height ↑',x0,topY-16,{size:10});text(ctx,'time →',x1,ground+32,{align:'right',size:10});
 text(ctx,'leave',X(0),ground+16,{align:'center',size,weight:600,color:'rgba(20,23,28,.75)'});text(ctx,'meet again',X(F.T),ground+16,{align:'right',size,weight:600,color:'rgba(20,23,28,.75)'});
 text(ctx,'side view',col,ground+28,{align:'center',size:9,color:'rgba(20,23,28,.55)'});
 if(F.g>1e-4)text(ctx,'clocks run slower down here',X(F.T*.5),ground-12,{align:'center',size:10,color:'rgba(180,83,15,.9)'});
 // Scoreboard: each path's clock compared with the held one, built up as the clocks travel.
 const px=small?w*.06:w*.56, pr=small?w*.94:w*.94, py=small?h*.6:h*.18, lh=small?17:24, mid=small?w*.58:w*.8, half=Math.min((pr-mid)*.9,mid-px-(small?88:120));
 text(ctx,small?'Each clock measures its path':'Each clock measures its path. With gravity, two effects:',px,py,{size:small?12:16,weight:700,color:'#14171c'});
 text(ctx,'higher up: clocks run faster (gain)',px,py+lh,{size:small?10:13,weight:600,color:warm});
 text(ctx,'moving: clocks run slower (loss)',px,py+lh*(small?1.9:1.8),{size:small?10:13,weight:600,color:accent});
 const parts=paths.map(([,apex])=>[F.bonusUntil(apex,t),F.costUntil(apex,t)]), full=Math.max(1e-9,...paths.map(([,a])=>Math.max(F.bonusUntil(a,F.T),F.costUntil(a,F.T))));
 const y0=py+lh*(small?3.1:3.2), rh=small?22:34;
 trace(ctx,[[mid,y0-rh*.5],[mid,y0+rh*(paths.length-.5)]]);ctx.strokeStyle='rgba(20,23,28,.25)';ctx.lineWidth=1;ctx.stroke();
 paths.forEach(([name],i)=>{const y=y0+i*rh,[gain,loss]=parts[i],net=gain-loss,isBest=i===best&&u>=1;
  if(isBest){ctx.fillStyle=rgba(accent,.08);ctx.beginPath();ctx.roundRect(px-8,y-rh*.45,pr-px+16,rh*.9,8);ctx.fill();}
  text(ctx,name,px,y,{size:small?10:12,weight:isBest?700:500,color:i===2?accent:'rgba(20,23,28,.75)'});
  const bh=small?6:8;ctx.fillStyle=rgba(warm,.75);ctx.fillRect(mid,y-bh-1,gain/full*half,bh);ctx.fillStyle=rgba(accent,.6);ctx.fillRect(mid-loss/full*half,y+1,loss/full*half,bh);
  const nx=mid+net/full*half;trace(ctx,[[nx,y-bh-4],[nx,y+bh+4]]);ctx.strokeStyle='#14171c';ctx.lineWidth=2.2;ctx.stroke();});
 const ny=y0+rh*(paths.length-.2)+6;
 text(ctx,'loss ←',mid-6,ny,{align:'right',size:9,color:'rgba(20,23,28,.5)'});text(ctx,'→ gain   | = total',mid+6,ny,{size:9,color:'rgba(20,23,28,.5)'});
 if(u>=1)pill(ctx,F.g>1e-4?'The path that keeps the most time is the arc a real ball follows':'No gravity: staying put keeps the most time',small?w/2:(px+pr)/2,small?h*.965:ny+lh*1.4,{align:'center',size:small?10:12,weight:600});
}

let gapBuffer=null;
function drawGap(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.blue, G=Physics.gap(st.mass,st.distance), small=w<520;
 const u=Math.min(w,h)/12, k=TAU/(G.lambda*u), yb=h*(st.labels&&small?.3:.24), screen=st.labels?h*.8:h, cx=w/2, phase=st.t*TAU*.55, open=G.width!==Infinity;
 const half=open?Math.min(w*.45,G.width*u/2):w;
 // Huygens: the open gap acts as a row of in-phase sources; with no barrier the plane wave continues.
 const n=open?Math.max(6,Math.min(16,Math.ceil(G.width*u/(G.lambda*u)*4))):0, src=Array.from({length:n},(_,i)=>cx-half+(i+.5)/n*2*half);
 const ref=open?src.reduce((s,x)=>s+1/Math.sqrt(1+Math.hypot(x-cx,3*G.lambda*u)/(G.lambda*u)),0)/1.15:1;
 const cell=small?4:6, cols=Math.ceil(w/cell), rows=Math.ceil(screen/cell);
 gapBuffer=gapBuffer||document.createElement('canvas');
 if(gapBuffer.width!==cols||gapBuffer.height!==rows){gapBuffer.width=cols;gapBuffer.height=rows;}
 const g=gapBuffer.getContext('2d'), image=g.createImageData(cols,rows), data=image.data;
 const c=parseInt(accent.slice(1),16), ar=c>>16, ag=c>>8&255, ab=c&255;
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  const x=i*cell, y=j*cell;let f;
  if(!open||y<yb)f=Math.cos(k*y-phase);
  else{f=0;for(const sx of src){const r=Math.hypot(x-sx,y-yb);f+=Math.cos(k*(yb+r)-phase)/Math.sqrt(1+r/(G.lambda*u));}f/=ref;}
  const o=4*(j*cols+i), a=Math.min(1,Math.abs(f)*1.1);
  if(f>0){data[o]=ar;data[o+1]=ag;data[o+2]=ab;data[o+3]=a*150;}else{data[o]=20;data[o+1]=30;data[o+2]=50;data[o+3]=a*55;}
 }
 g.putImageData(image,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(gapBuffer,0,0,cols*cell,rows*cell);
 if(open){ctx.fillStyle='rgba(20,23,28,.82)';ctx.fillRect(0,yb-4,cx-half,8);ctx.fillRect(cx+half,yb-4,w-cx-half,8);}
 // Screen: time-averaged brightness from the single-gap pattern.
 if(!st.labels)return;
 const band=h*.08;ctx.fillStyle='rgba(255,255,255,.7)';ctx.fillRect(0,screen,w,h-screen);
 ctx.fillStyle='#1e1d1b';ctx.fillRect(w*.04,screen+6,w*.92,band);
 screenStrip(ctx,Array.from({length:201},(_,i)=>{const x=w*.04+w*.92*i/200, dx=x-cx, s=dx/Math.hypot(dx,screen-yb);return [x,open?Physics.singleSlit(st.mass,st.distance,s):1];}),screen+6,band);
 if(open&&G.sinMin<1&&(spec.show_reference||st.labels)){
  const L=screen-yb, tan=G.sinMin/Math.sqrt(1-G.sinMin*G.sinMin);
  ctx.setLineDash([4,5]);ctx.strokeStyle='rgba(20,23,28,.4)';ctx.lineWidth=1.2;
  for(const sgn of [-1,1]){trace(ctx,[[cx,yb],[cx+sgn*L*tan,screen]]);ctx.stroke();}ctx.setLineDash([]);
 }
 if(st.labels){
  const size=small?10:11;
  pill(ctx,'WAVE COMING IN',cx,Math.max(16,yb-24),{align:'center',size,weight:600,spacing:'1px'});
  if(open)pill(ctx,`gap ${(G.width/G.lambda).toFixed(1)} wavelengths wide`,cx,yb+18,{align:'center',size:10,weight:500});
  else pill(ctx,'no barrier',cx,yb+18,{align:'center',size:10,weight:500});
  text(ctx,!open?'SCREEN · no barrier: lit straight ahead':G.sinMin>=1?'SCREEN · gap narrower than the wave: it spreads to every side':'SCREEN · dashed lines: first dark directions',w*.04,screen+band+22,{size:10,weight:600,spacing:'.5px'});
 }
}

function clockDial(ctx,cx,cy,r,angle,accent){
 ctx.save();ctx.shadowColor='rgba(20,30,50,.14)';ctx.shadowBlur=18;ctx.shadowOffsetY=6;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.fillStyle='#fff';ctx.fill();ctx.restore();
 ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.strokeStyle='rgba(20,23,28,.14)';ctx.lineWidth=1;ctx.stroke();
 for(let i=0;i<12;i++){const a=i*TAU/12;trace(ctx,[[cx+Math.sin(a)*r*.78,cy-Math.cos(a)*r*.78],[cx+Math.sin(a)*r*.9,cy-Math.cos(a)*r*.9]]);ctx.strokeStyle='rgba(20,23,28,.45)';ctx.lineWidth=1.3;ctx.stroke();}
 ctx.lineCap='round';trace(ctx,[[cx,cy],[cx+Math.sin(angle)*r*.72,cy-Math.cos(angle)*r*.72]]);ctx.strokeStyle=accent;ctx.lineWidth=Math.max(2,r*.07);ctx.stroke();
 ctx.beginPath();ctx.arc(cx,cy,Math.max(2.5,r*.08),0,TAU);ctx.fillStyle=accent;ctx.fill();
}
// Coastlines as [longitude, latitude] pairs, simplified to about a degree; inland seas are drawn back as water.
const LAND=[
 [[-166,68],[-156,71],[-141,70],[-128,70],[-117,68.5],[-108,68],[-95,72],[-85,70],[-82,66],[-90,63.5],[-94,59],[-92,57],[-85,55],[-80,52],[-79,55],[-77,60],[-78,62.5],[-72,61],[-65,60],[-61,56],[-56,52],[-60,47],[-66,45],[-70,42],[-74,40.5],[-76,37],[-75.5,35],[-81,31.5],[-80,27],[-80.5,25.2],[-82,26.5],[-83,29.8],[-89,30.2],[-94,29.6],[-97.4,27.5],[-97.5,22],[-95.5,18.8],[-91,19],[-90.5,21],[-87,21.5],[-88,17],[-83.5,15],[-83.5,11],[-79.5,9],[-77.5,8.5],[-80,7.3],[-85.5,10],[-87.5,13],[-91.5,14],[-95,16],[-105.5,20],[-105.5,22.5],[-109,26.5],[-112.5,29.5],[-114.7,31.7],[-114,30],[-112,27.8],[-110,24],[-111,24.3],[-114,28],[-115.7,30.5],[-117.1,32.5],[-120.5,34.5],[-122.5,37.8],[-124.2,40.4],[-124,46],[-124.7,48.4],[-123,49],[-127,50.5],[-131,54],[-133,57],[-137.5,58.5],[-141,60],[-146,61],[-150,59.5],[-154,57.5],[-158,56.5],[-163,54.8],[-158,58.5],[-162,60],[-165,62],[-164.5,64.5],[-168,65.6]],
 [[-80,73.5],[-72,71],[-62,66.5],[-65,63],[-71,62.5],[-78,64.5],[-81,68],[-88,70]],
 [[-118,73],[-102,73],[-101,69],[-117,69]],
 [[-90,77],[-80,76.5],[-63,82],[-80,83],[-92,81]],
 [[-73,78],[-60,82],[-35,83.5],[-20,82],[-18,77],[-22,70.5],[-32,68],[-40,65],[-43,60],[-48,61],[-52,65],[-54,69.5],[-58,75.5],[-66,76.5]],
 [[-22.7,64],[-21.9,65.4],[-22.4,66.4],[-16,66.5],[-14.5,65.8],[-13.6,65],[-14.9,64.3],[-18.7,63.4],[-21,63.8]],
 [[-77.5,8.5],[-75.5,10.8],[-71.5,12.4],[-68,10.6],[-62,10.7],[-60,8.5],[-57,6],[-52,5],[-50,1.8],[-48.5,-1],[-44,-2.5],[-39,-3.5],[-35,-5.5],[-35,-9],[-38.5,-13],[-39,-17.8],[-40.5,-22],[-44.5,-23.2],[-48.5,-26],[-49,-28.6],[-53,-33.5],[-58.5,-34.5],[-57,-36.5],[-58,-38.5],[-62,-39],[-65,-41],[-64,-42.5],[-67.5,-46],[-66,-47.8],[-69,-50.5],[-68.5,-52.5],[-71,-54],[-74.5,-52],[-75.5,-47],[-73.5,-42],[-73.5,-37],[-71.5,-32],[-71.3,-28],[-70.3,-18.5],[-75,-15.3],[-79,-8],[-81.2,-5.5],[-80,-2],[-80,1],[-78.8,1.8],[-77.5,4],[-77.3,7]],
 [[-9.5,43],[-8.8,37],[-6,36.2],[-2,36.7],[.2,38.8],[3.2,41.9],[4,43.5],[7.5,43.8],[10,44],[12.3,41.7],[15.7,38],[16.6,39],[18.5,40.1],[16,41.9],[12.4,44.5],[12.3,45.4],[13.7,45.6],[15.5,43.5],[19.5,42],[19.4,40.2],[21,38],[22.8,36.5],[24,38.2],[23,40.5],[26.2,40.8],[26.2,40],[27,38.5],[28,36.7],[32,36.1],[36,36.6],[35.9,34.5],[34.5,31.5],[34.9,29.5],[36.9,25.5],[39,21.5],[42.8,16],[43.4,12.7],[45,12.8],[49,14.1],[52.2,15.6],[55.5,17.8],[57.8,19],[59.8,22.5],[58.5,23.6],[56.4,24.9],[56.3,26.3],[55.5,25.5],[54,24.2],[51.6,24.3],[51.2,26.1],[50.1,26.2],[48.5,28.5],[48,30],[50.2,30.2],[51.5,27.9],[54.5,26.6],[56.5,27.1],[57.3,25.7],[61.5,25.2],[66.5,25.4],[67.5,24],[70,21],[72.8,21.5],[73,19],[74.9,13.5],[76.5,8.6],[77.6,8.1],[78.3,9],[80.3,13.3],[80.2,15.8],[83.3,17.6],[86.9,20.8],[88.5,21.7],[91.8,22.4],[92.6,21],[94.3,16],[97.5,16.8],[98.5,13],[98.3,8.5],[100.2,5.6],[101.4,2.8],[103.5,1.3],[104.2,1.6],[103.4,4.2],[102.4,6.2],[100.3,8.4],[99.2,10.8],[100.5,13.5],[102.5,12],[105,8.6],[106.8,10.4],[109.2,11.6],[108.8,15.5],[106.6,17.5],[105.7,19],[107.5,21.5],[109.7,21.5],[110.3,20.3],[113.5,22.2],[117,23.5],[119.6,26],[121.9,30.8],[120.5,33.5],[119.2,35],[122.5,37],[118,38],[117.8,39.2],[121.5,40.9],[121.3,39],[124.3,39.9],[126.5,37.5],[126.5,34.5],[129.3,35.2],[129.5,37],[128,39.5],[129.7,41],[131,42.6],[135.5,43.8],[140.5,48.5],[141.4,52.2],[137,54],[135.3,54.8],[141,59],[149,59.4],[155,59.4],[157,57.8],[156.5,51],[158.5,52.8],[162,56.2],[163.5,59.9],[170,60],[179,62.3],[180,65],[190,66],[185,67.5],[180,69],[170,70],[161,69.5],[150,71.5],[140,72.5],[130,71],[127,73.5],[113,73.7],[106,77],[100,79.5],[95,76],[88,75.5],[80,73.5],[73,73],[69,73],[69,68.5],[60,69.8],[54,68.3],[44,68.4],[43.5,66.3],[40,66.4],[36.5,64.5],[34.7,66],[32.5,67],[41,67.8],[38,69],[33,69.4],[28,71],[23,70.6],[18.5,69.8],[14.5,67.9],[12.5,65.5],[10,64],[5.1,62],[5,59.5],[6.5,58],[8,58],[10.6,59.4],[11.5,58.3],[12.7,56],[14.3,55.6],[16.4,56.6],[18,59.2],[17.5,61],[21.3,64.5],[25.3,65.6],[22.5,63],[21.3,61],[21.5,60.6],[25,60.2],[28.5,60.5],[24,59.3],[23.5,58.4],[21.1,57],[21.3,55.2],[19.8,54.4],[18.4,54.8],[14.5,53.9],[12.5,54.4],[10.9,54],[9.9,54.8],[10.5,57.5],[8.6,57.1],[8.1,55.5],[8.6,53.9],[5,53.4],[4.2,52],[3.3,51.3],[1.6,50.9],[-1.4,49.6],[-1.9,48.7],[-4.7,48.4],[-2.2,47.2],[-1.2,46],[-1.5,43.5],[-4,43.5],[-8,43.7],[-9.3,43.1]],
 [[-5.7,50],[1.4,51.2],[1.7,52.7],[0,53.5],[-1.6,55.5],[-2,57.6],[-3,58.6],[-5,58.6],[-6.2,57.5],[-5.6,55.3],[-3,54.9],[-3.2,53.4],[-4.6,53.3],[-4.2,52.3],[-5.3,51.7],[-3.2,51.4]],
 [[-6,52.2],[-6.2,54],[-5.5,54.9],[-7.3,55.3],[-10,54.2],[-9.8,52.1],[-8.4,51.6]],
 [[-17,21],[-16.5,24],[-13,27.7],[-9.8,29.8],[-9.6,32.5],[-6.8,34],[-5.9,35.8],[-2,35.1],[3,36.8],[9.8,37.3],[11,36.9],[10.2,34.3],[11.5,33.1],[15.2,32.3],[19.5,30.3],[20.1,32.3],[23.5,32.4],[25.2,31.6],[29.5,31],[32.3,31.3],[34.2,31.2],[34.9,29.5],[34.2,27.8],[32.6,29.9],[33.6,27.3],[35.5,23.9],[37.2,21],[38.5,18],[39.7,15.1],[42.4,12.5],[43.4,11.6],[44.5,10.4],[47.5,11.2],[51.2,11.8],[51,10.4],[49.8,7],[47.9,4.5],[43.6,.6],[40.9,-2.1],[39.2,-4.7],[39.7,-7.9],[40.5,-10.5],[40.6,-15.5],[37,-17.9],[35.4,-22.1],[35.5,-24],[32.8,-25.8],[32.4,-28.6],[30,-31.3],[27.5,-33.5],[25.6,-34],[22,-34.2],[20,-34.8],[18.4,-34.2],[17.9,-31.5],[15.2,-27],[14.5,-22.9],[11.8,-17.3],[12.3,-13.5],[13.6,-11.5],[13.2,-8.8],[12.2,-6],[9.4,-1.5],[9.8,2.8],[9.7,3.8],[8.5,4.5],[6,4.3],[4.5,6.3],[2,6.3],[-2,4.8],[-4,5.2],[-7.5,4.4],[-9.7,5.6],[-11.4,6.9],[-13.2,8.9],[-15,10.9],[-16.8,13],[-17.5,14.7],[-16.3,19]],
 [[49.3,-12],[50.5,-15.5],[49.8,-17],[47.1,-24.9],[45.2,-25.5],[43.7,-22.6],[43.3,-21],[44.3,-16.8],[46.3,-15.7],[48,-13.7]],
 [[79.8,6.1],[80.3,9.8],[81.9,7.4],[81.2,6.2]],
 [[95.3,5.6],[97.5,5.2],[100.4,2.3],[103.7,-1],[106,-3.2],[105.8,-5.8],[104.5,-5.9],[102.3,-4],[100.5,-1.2],[98.7,1.7],[96,4.2]],
 [[105.2,-6.8],[108.5,-6.4],[111,-6.4],[114.5,-7.8],[114.4,-8.7],[111,-8.2],[108.3,-7.8],[106,-7.4]],
 [[109,1.9],[110.4,1.7],[113,3.2],[115.4,5],[117,7],[119.2,5.2],[118.2,4.3],[117.8,1.8],[116.5,-1.6],[116,-3.9],[114.5,-3.9],[111.4,-3.2],[110.2,-1.7],[109,.4]],
 [[119.5,-5.5],[120.5,-2.5],[121,1.2],[124.8,1.5],[121.5,-.8],[123.3,-4.8],[121,-3],[120.5,-5.6]],
 [[131,-1.2],[134,-.9],[137.8,-1.5],[141,-2.6],[145.7,-4.8],[147.6,-6.1],[148,-8.1],[150.8,-10.3],[147,-10.1],[144,-7.8],[141,-9.1],[138.5,-8.3],[137.8,-5.5],[134.5,-4],[132,-2.9]],
 [[120.6,18.5],[122.3,18.3],[122,16.2],[124,13],[121.5,13.7],[120,14.8],[119.9,16.4]],
 [[122,7],[126.6,7.3],[125.4,9.8],[123.8,8.5]],
 [[120.2,22.7],[121,25.3],[121.9,24.6],[120.8,21.9]],
 [[130,31.3],[131.5,31.5],[132,33.8],[135,33.5],[137,34.6],[139.8,35],[141,37],[142,39.5],[141.5,41.4],[140,40.5],[139.5,38],[136.8,37.2],[133,35.5],[130.9,34.2],[129.6,33.2]],
 [[140,41.5],[141.7,42.6],[145.5,43.3],[143,44.5],[141.7,45.4],[141.3,43.3],[140.3,42.6]],
 [[113.5,-22.5],[114.1,-26],[115,-34.2],[117.9,-35.1],[123.5,-33.9],[126,-32.3],[131,-31.5],[134.5,-32.7],[137.8,-35.6],[138.5,-34.8],[140,-37.5],[143.5,-38.8],[146.3,-39.1],[150,-37.5],[151.3,-33.8],[153.6,-28.2],[153,-25.3],[150.8,-22.5],[146.3,-19],[145.4,-15],[143.5,-14],[142.5,-10.7],[141.6,-12.9],[141.5,-16.5],[139.3,-17.4],[135.9,-15],[136.7,-12.2],[132.6,-11.5],[130.1,-13.2],[129.3,-15],[127,-14],[125,-14.5],[122.2,-17.2],[121,-19.6],[117,-20.6],[114.2,-21.9]],
 [[144.6,-40.7],[148.3,-40.9],[148,-43.2],[146,-43.6],[145.2,-42.2]],
 [[172.7,-34.4],[174.6,-36.2],[178.5,-37.7],[177,-39.6],[175.2,-41.5],[174.6,-39.9],[173.8,-39.1],[174.4,-37]],
 [[172.7,-40.5],[174.3,-41.7],[173.2,-43.4],[171.2,-44.4],[169,-46.6],[166.5,-46],[166.6,-45.2],[168.5,-44],[171.1,-42.3]],
 [...Array.from({length:37},(_,i)=>{const lon=-180+i*10;return [lon,-70+3*Math.sin(lon*.05)+(lon>-75&&lon<-55?6:0)];}),[180,-90],[-180,-90]],
];
const SEAS=[
 [[28,41.6],[28.6,43.5],[30.7,46.5],[33,45.8],[32.5,45.3],[33.5,44.5],[36.5,45.2],[38.2,46.6],[39.5,47.2],[37.7,44.6],[41.6,41.6],[36.7,41.3],[35,42],[31.5,41.2],[29,41.2]],
 [[47,44.5],[49,46.5],[51.5,47],[53,45],[51.3,44.5],[52.8,41.5],[54,39],[53.9,37.3],[50.3,37.4],[49,38.5],[49.5,40.3],[47.5,42.9]],
];
const ICE=new Set([4,LAND.length-1]);
const earthCache=new Map();
// A globe in orthographic projection, centred on the given latitude and longitude; cached per size and view.
function earthImage(r,lat,lon){
 const key=`${Math.round(r)}|${lat}|${lon}`;if(earthCache.has(key))return earthCache.get(key);
 const size=Math.ceil(2*r+4), c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'), o=size/2;
 const p0=lat*Math.PI/180, l0=lon*Math.PI/180;
 const proj=([lo,la])=>{const p=la*Math.PI/180, l=lo*Math.PI/180-l0, x=Math.cos(p)*Math.sin(l), y=Math.cos(p0)*Math.sin(p)-Math.sin(p0)*Math.cos(p)*Math.cos(l), z=Math.sin(p0)*Math.sin(p)+Math.cos(p0)*Math.cos(p)*Math.cos(l);
  // Points on the far side are pushed to the rim so shapes crossing the edge stay closed.
  if(z<0){const k=Math.hypot(x,y)||1;return [o+x/k*r,o-y/k*r];}return [o+x*r,o-y*r];};
 const sea=g.createRadialGradient(o-r*.35,o-r*.35,r*.1,o,o,r);sea.addColorStop(0,'#6fb2ee');sea.addColorStop(.6,'#2b6cc4');sea.addColorStop(1,'#163a7a');
 g.beginPath();g.arc(o,o,r,0,TAU);g.fillStyle=sea;g.fill();g.save();g.clip();
 const visible=([lo,la])=>{const p=la*Math.PI/180, l=lo*Math.PI/180-l0;return Math.sin(p0)*Math.sin(p)+Math.cos(p0)*Math.cos(p)*Math.cos(l)>0;};
 const fill=(poly,color)=>{if(!poly.some(visible))return;const pts=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];
   const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/3));for(let k=0;k<n;k++)pts.push(proj([a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]));}
  g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=color;g.fill();};
 // Antarctica wraps the pole, so it is drawn only when the view looks from the south.
 LAND.forEach((poly,i)=>{if(i===LAND.length-1&&lat>=0)return;fill(poly,ICE.has(i)?'#eef2f4':'#6f9a58');});
 SEAS.forEach(poly=>fill(poly,'#3577cf'));
 const shade=g.createRadialGradient(o-r*.4,o-r*.4,r*.2,o,o,r*1.02);shade.addColorStop(0,'rgba(255,255,255,.12)');shade.addColorStop(.7,'rgba(10,20,40,0)');shade.addColorStop(1,'rgba(10,20,40,.35)');
 g.fillStyle=shade;g.fillRect(0,0,size,size);g.restore();
 earthCache.set(key,c);return c;
}
function drawEarth(ctx,x,y,r,{lat=20,lon=10}={}){
 const air=ctx.createRadialGradient(x,y,r*.9,x,y,r*1.5);air.addColorStop(0,'rgba(120,180,255,.35)');air.addColorStop(1,'rgba(120,180,255,0)');ctx.fillStyle=air;ctx.beginPath();ctx.arc(x,y,r*1.5,0,TAU);ctx.fill();
 const img=earthImage(r,lat,lon);ctx.drawImage(img,x-img.width/2,y-img.height/2);
 const night=ctx.createLinearGradient(x-r,0,x+r,0);night.addColorStop(.55,'rgba(10,20,40,0)');night.addColorStop(1,'rgba(10,20,40,.3)');
 ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.clip();ctx.fillStyle=night;ctx.fillRect(x-r,y-r,2*r,2*r);ctx.restore();
}
function drawRocket(ctx,x,y,size,dir,thrust,t){
 ctx.save();ctx.translate(x,y);ctx.scale(dir,1);
 if(thrust){const f=.7+.3*Math.sin(t*40)*Math.sin(t*23);const flame=ctx.createLinearGradient(-size*1.9,0,-size*.9,0);flame.addColorStop(0,'rgba(255,170,60,0)');flame.addColorStop(1,'rgba(255,140,40,.9)');
  ctx.beginPath();ctx.moveTo(-size*.9,-size*.22);ctx.quadraticCurveTo(-size*(1.3+.6*f),0,-size*.9,size*.22);ctx.closePath();ctx.fillStyle=flame;ctx.fill();}
 ctx.beginPath();ctx.moveTo(size,0);ctx.quadraticCurveTo(size*.55,-size*.36,-size*.9,-size*.3);ctx.lineTo(-size*.9,size*.3);ctx.quadraticCurveTo(size*.55,size*.36,size,0);ctx.closePath();
 const hull=ctx.createLinearGradient(0,-size*.35,0,size*.35);hull.addColorStop(0,'#ffffff');hull.addColorStop(1,'#cfd6e0');ctx.fillStyle=hull;ctx.fill();ctx.strokeStyle='rgba(20,23,28,.35)';ctx.lineWidth=1;ctx.stroke();
 ctx.beginPath();ctx.moveTo(-size*.55,-size*.3);ctx.lineTo(-size*.95,-size*.62);ctx.lineTo(-size*.9,-size*.3);ctx.closePath();ctx.fillStyle='#e04f2c';ctx.fill();
 ctx.beginPath();ctx.moveTo(-size*.55,size*.3);ctx.lineTo(-size*.95,size*.62);ctx.lineTo(-size*.9,size*.3);ctx.closePath();ctx.fill();
 ctx.beginPath();ctx.arc(size*.35,0,size*.13,0,TAU);ctx.fillStyle='#5aa9ff';ctx.fill();ctx.strokeStyle='rgba(20,23,28,.4)';ctx.stroke();
 ctx.restore();
}
function drawTwinTrip(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.blue, v=Physics.speed(st.mass), g=Physics.gamma(v), T=Physics.turnaround(st.distance), H=2*T, small=w<520;
 // The trip runs once per chapter and then waits at the reunion.
 const tc=Math.min(H,(st.since??st.t)*.42*Math.max(1,H/4.8)), leg=tc<=T?tc/T:(H-tc)/T, moving=v>.001&&tc>0&&tc<H;
 const xE=w*(small?.16:.14), xS=w*(small?.86:.84), yTrip=h*(st.labels&&small?.33:.24), r=Math.min(w,h)*.055;
 // The route, Earth and the destination star.
 ctx.setLineDash([3,6]);trace(ctx,[[xE+r*1.3,yTrip],[xS-r*1.1,yTrip]]);ctx.strokeStyle='rgba(20,23,28,.2)';ctx.lineWidth=1.2;ctx.stroke();ctx.setLineDash([]);
 drawEarth(ctx,xE,yTrip,r);drawStar(ctx,xS,yTrip,r*.75,v>.001?1:.35);
 const rx=v>.001?xE+r*1.9+(xS-xE-r*3.7)*leg:xE+r*1.9, ry=yTrip-(v>.001?0:r*1.2);
 drawRocket(ctx,rx,ry,r*.75,tc<=T?1:-1,moving,st.t);
 // Ages: two bars that grow with each twin's own time; the gap between them is the whole story.
 const x0=w*(small?.4:.3), x1=w*(small?.82:.74), full=x1-x0, bh=small?14:18, rows=[[tc,'#14171c','Home twin',h*(small?.66:.62)],[tc/g,accent,'Traveller',h*(small?.8:.76)]];
 // A small clock (one turn per year of that twin's own time) and one notch per birthday.
 const cr=bh*.95;
 for(const [years,color,name,y] of rows){
  ctx.fillStyle='rgba(20,23,28,.07)';ctx.beginPath();ctx.roundRect(x0,y-bh/2,full,bh,bh/2);ctx.fill();
  if(years>0){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x0,y-bh/2,Math.max(bh,full*years/H),bh,bh/2);ctx.fill();}
  for(let i=1;i<H-1e-9;i++){const x=x0+full*i/H;trace(ctx,[[x,y-bh/2],[x,y+bh/2]]);ctx.strokeStyle=i<=years?'rgba(255,255,255,.85)':'rgba(20,23,28,.12)';ctx.lineWidth=1.5;ctx.stroke();}
  clockDial(ctx,x0-cr-12,y,cr,years*TAU,color);
  if(st.labels){text(ctx,name,x0-2*cr-24,y,{align:'right',size:small?11:13,weight:600,color:color==='#14171c'?'rgba(20,23,28,.8)':accent});
   text(ctx,`${years.toFixed(1)} yr`,x0+Math.max(bh,full*years/H)+10,y,{size:small?11:12,weight:600,color:'rgba(20,23,28,.7)'});}
 }
 if(st.labels){
  text(ctx,'EARTH',xE,yTrip+r*1.9,{align:'center',size:10,weight:600,spacing:'1.5px'});
  text(ctx,'STAR',xS,yTrip+r*1.9,{align:'center',size:10,weight:600,spacing:'1.5px'});
  if(tc>=H-1e-6&&v>.001)pill(ctx,`Together again: the traveller is ${(H-H/g).toFixed(1)} years younger`,w/2,h*(small?.93:.9),{align:'center',size:small?11:13,weight:600});
 }
}

// Twin paths: one layout shared by drawing and dragging, so the handle sits exactly on the turnaround.
function pathsLayout(w,h,st){
 // Previews (no labels) use the wide layout with small margins, whatever their size.
 const small=w<520&&st.labels!==false, v=Physics.speed(st.mass), T=Physics.turnaround(st.distance), H=2*T, Hmax=2*Physics.turnaround(2.5);
 const top=st.labels===false?12:small?104:64, bottom=h*(small?.58:.74), k=Math.min((bottom-top)/Hmax,(w*(small?.62:.32))/(.9*Hmax/2+.6));
 const x0=w*(small?.2:.14), map=(x,t)=>[x0+x*k,bottom-t*k];
 return {small,v,T,H,k,x0,top,bottom,map,kink:map(v*T,T)};
}
// Why a moving clock ticks slowly: light crosses a light clock at the same speed for everyone, so on the moving
// rocket (seen from Earth) it must zigzag farther between the mirrors and each tick takes longer.
function drawLightClocks(ctx,w,h,spec,st,{vplan}={}){
 const accent=ACCENT[spec.accent]||ACCENT.blue, dark='#14171c', light='#d97706', small=w<520, v=Physics.speed(st.mass), since=Math.max(0,(st.since??st.t)-1);
 const L=small?h*.13:Math.min(h*.24,130), lanes=small?[h*.33,h*.7]:[h*.3,h*.7], xa=w*(small?.16:.12), xb=w*(small?.9:.88);
 // Light's speed on screen is chosen so the rocket crosses the stage about once per chapter: its slanted trail stays visible.
 const ch=timeline?.chapters?.[st.stage], span=ch?Math.max(6,ch.end-ch.start+1):18;
 const c=Math.min(L/1.1,(xb-xa)/(Math.max(vplan??Physics.speed(spec.mass),.2)*span)), slow=1/Physics.lightTick(v), moving=v>.01;
 const bounce=y=>{const f=((y%2)+2)%2;return f<1?f:2-f;}, step=L/c/5;
 const mirrors=(x,y0)=>{ctx.lineCap='round';for(const y of [y0-L/2,y0+L/2]){trace(ctx,[[x-18,y],[x+18,y]]);ctx.strokeStyle='rgba(20,23,28,.7)';ctx.lineWidth=3;ctx.stroke();}};
 const photon=(x,y)=>{const glow=ctx.createRadialGradient(x,y,0,x,y,12);glow.addColorStop(0,rgba(light,.5));glow.addColorStop(1,rgba(light,0));ctx.fillStyle=glow;ctx.fillRect(x-12,y-12,24,24);
  ctx.beginPath();ctx.arc(x,y,4,0,TAU);ctx.fillStyle=light;ctx.fill();};
 const dots=pts=>{ctx.fillStyle=rgba(light,.65);for(const [x,y] of pts){ctx.beginPath();ctx.arc(x,y,1.9,0,TAU);ctx.fill();}};
 const path=pts=>{trace(ctx,pts);ctx.setLineDash([3,4]);ctx.strokeStyle=rgba(light,.5);ctx.lineWidth=1.4;ctx.stroke();ctx.setLineDash([]);};
 // Earth clock: light goes straight up and down. Dots mark equal steps of time along its path.
 const homeTicks=since*c/L, ey=lanes[0];
 path([[xa,ey+L/2],[xa,ey-L/2]]);dots(Array.from({length:6},(_,k)=>[xa,ey-L/2+k*L/5]));
 drawEarth(ctx,xa,ey+L/2+(small?16:22),small?9:12);mirrors(xa,ey);photon(xa,ey+L/2-bounce(homeTicks)*L);
 // Rocket clock: it moves right at v; its light keeps light speed, so it climbs only at sqrt(1 - v^2) of it and
 // needs more equal time steps per crossing. A viewer pushing the speed past the plan sees the rocket start again at the left.
 const ry=lanes[1], lap=(xb-xa)/(Math.max(v,.01)*c), s0=moving?Math.floor(since/lap)*lap:0, x=xa+v*c*(since-s0), rocketTicks=since*c*slow/L;
 const at=t=>[xa+v*c*(t-s0),ry+L/2-bounce(t*c*slow/L)*L];
 if(moving){path(Array.from({length:161},(_,i)=>at(s0+(since-s0)*i/160)));dots(Array.from({length:Math.floor((since-s0)/step)+1},(_,k)=>at(s0+k*step)));}
 else{path([[xa,ry+L/2],[xa,ry-L/2]]);dots(Array.from({length:6},(_,k)=>[xa,ry-L/2+k*L/5]));}
 drawRocket(ctx,x,ry+L/2+(small?16:22),small?12:16,1,moving,st.t);mirrors(x,ry);photon(...at(since));
 if(!st.labels)return;
 const size=small?11:13, note=small?10:12, ticks=n=>`${n} tick${n===1?'':'s'}`;
 text(ctx,`Clock on Earth: ${ticks(Math.floor(homeTicks))}`,xa+40,ey-L/2+4,{size,weight:600,color:dark});
 text(ctx,'light goes straight up and down',xa+40,ey-L/2+(small?20:24),{size:note});
 const head=moving?(small?`Rocket, ${Math.round(v*100)}% of light speed: ${ticks(Math.floor(rocketTicks))}`:`Clock on the rocket, ${Math.round(v*100)}% of light speed, seen from Earth: ${ticks(Math.floor(rocketTicks))}`)
  :`Clock on the rocket, parked: ${ticks(Math.floor(rocketTicks))}`;
 text(ctx,head,xa,ry-L/2-(small?34:42),{size,weight:600,color:accent});
 text(ctx,moving?(small?'same light speed, longer slanted path':'same light speed, longer slanted path: each tick takes longer'):'light goes straight up and down',xa,ry-L/2-(small?18:22),{size:note});
 if(moving&&!small)text(ctx,'dots: equal steps of time, so light covers the same distance between dots on both clocks',w/2,h*.97,{align:'center',size:10,color:'rgba(20,23,28,.5)'});
 if(moving&&since>6)pill(ctx,`The rocket clock ticks ${Math.round(slow*10)} times for every 10 on Earth`,w/2,small?h*.94:h*.9,{align:'center',size:small?11:13,weight:600});
}

function drawPaths(ctx,w,h,spec,st){
 if(st.stage===1&&st.labels!==false)return drawLightClocks(ctx,w,h,spec,st,{vplan:Physics.speed(spec.mass)});
 const accent=ACCENT[spec.accent]||ACCENT.blue, L=pathsLayout(w,h,st), {small,v,T,H,map,x0,bottom}=L, g=Physics.gamma(v);
 // The trip plays once per chapter, in step with Earth time, then waits at the reunion.
 const tc=st.stage===3?H:Math.min(H,(st.since??st.t)*.5*Math.max(1,H/5)), xAt=t=>t<=T?v*t:v*(H-t), own=Math.min(tc,H)/g;
 // Light from the goodbye: its path has zero length, the edge no clock can cross.
 const reach=Math.min(H,(w*(small?.75:.46)-x0)/L.k);
 ctx.setLineDash([2,5]);trace(ctx,[map(0,0),map(reach,reach)]);ctx.strokeStyle=rgba('#d97706',.6);ctx.lineWidth=1.2;ctx.stroke();ctx.setLineDash([]);
 // Home path: straight up. Traveller path: out to the turnaround and back.
 ctx.lineCap='round';ctx.lineJoin='round';
 trace(ctx,[map(0,0),map(0,H)]);ctx.strokeStyle='rgba(20,23,28,.55)';ctx.lineWidth=2.4;ctx.stroke();
 if(v>.001){trace(ctx,[map(0,0),L.kink,map(0,H)]);ctx.strokeStyle=accent;ctx.lineWidth=2.6;ctx.stroke();}
 // One dot per year of each twin's own time; the traveller's sit farther apart on paper because fewer fit.
 for(let s=1;s<=H+1e-9;s++){const [x,y]=map(0,s);ctx.beginPath();ctx.arc(x,y,s<=tc+1e-9?4.5:3,0,TAU);ctx.fillStyle=s<=tc+1e-9?'#14171c':'rgba(20,23,28,.25)';ctx.fill();}
 if(v>.001)for(let s=1;s*g<=H+1e-9;s++){const t=s*g,[x,y]=map(xAt(t),t);ctx.beginPath();ctx.arc(x,y,s<=own+1e-9?4.5:3,0,TAU);ctx.fillStyle=s<=own+1e-9?accent:rgba(accent,.3);ctx.fill();}
 const [hx,hy]=map(0,tc),[tx,ty]=map(xAt(tc),tc);
 for(const [x,y,c] of [[hx,hy,'#14171c'],[tx,ty,accent]]){const glow=ctx.createRadialGradient(x,y,0,x,y,16);glow.addColorStop(0,rgba(c,.32));glow.addColorStop(1,rgba(c,0));ctx.fillStyle=glow;ctx.fillRect(x-16,y-16,32,32);
  ctx.beginPath();ctx.arc(x,y,6,0,TAU);ctx.fillStyle=c;ctx.fill();ctx.beginPath();ctx.arc(x,y,2.2,0,TAU);ctx.fillStyle='#fff';ctx.fill();}
 // The turnaround is a handle: drag it to change the speed (sideways) and the trip (up).
 if(spec.controls!=='none'&&st.stage>0){const [kx,ky]=L.kink;ctx.beginPath();ctx.arc(kx,ky,11,0,TAU);ctx.fillStyle='rgba(255,255,255,.9)';ctx.fill();ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.stroke();
  ctx.beginPath();ctx.arc(kx,ky,3.5,0,TAU);ctx.fillStyle=accent;ctx.fill();}
 // The same trip seen as ordinary space: Earth under the home path, the star under the turnaround.
 const sy=h*(small?.665:.85), r=small?10:14;
 trace(ctx,[[x0,sy],[map(v*T,0)[0],sy]]);ctx.setLineDash([3,6]);ctx.strokeStyle='rgba(20,23,28,.2)';ctx.lineWidth=1.2;ctx.stroke();ctx.setLineDash([]);
 ctx.setLineDash([2,4]);trace(ctx,[[x0,bottom+6],[x0,sy-r-4]]);if(v>.001)trace(ctx,[[map(v*T,0)[0],bottom+6],[map(v*T,0)[0],sy-r-4]]);ctx.strokeStyle='rgba(20,23,28,.12)';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
 drawEarth(ctx,x0,sy,r);if(v>.001)drawStar(ctx,map(v*T,0)[0],sy,r*.8,1);
 if(v>.001&&tc>0&&tc<H)drawRocket(ctx,map(xAt(tc),0)[0],sy-r*1.3,r*.7,tc<=T?1:-1,true,st.t);
 if(!st.labels)return;
 const size=small?10:11, T2=n=>n.toFixed(1), leg=T/g;
 const ty0=(bottom+map(0,H)[1])/2;if(Math.abs(hy-ty0)>22)text(ctx,'time ↑',x0-14,ty0,{align:'right',size:10});
 text(ctx,'space →',x0+L.k*4.4,bottom+14,{size:10});
 text(ctx,'goodbye',x0,bottom+14,{align:'center',size,weight:600,color:'rgba(20,23,28,.75)'});
 text(ctx,'reunion',x0,map(0,H)[1]-14,{align:'center',size,weight:600,color:'rgba(20,23,28,.75)'});
 const [lx,ly]=map(Math.min(reach,H)*.82,Math.min(reach,H)*.82);text(ctx,'light',lx+8,ly+4,{size:10,color:'rgba(180,83,9,.9)'});
 if(v>.001)pill(ctx,'turnaround',L.kink[0]+14,L.kink[1]+22,{size:10,weight:600,color:accent});
 text(ctx,'EARTH',x0,sy+r+12,{align:'center',size:9,weight:600,spacing:'1.5px'});
 const sx=map(v*T,0)[0], close=sx-x0<(small?90:150);
 if(v>.001)text(ctx,small?`STAR · ${T2(v*T)} ly`:`STAR · ${T2(v*T)} light-years`,close?sx+r+8:sx,close?sy:sy+r+12,{align:close?'left':'center',size:9,weight:600,spacing:'1px'});
 pill(ctx,`${T2(tc)} yr`,hx-14,hy,{align:'right',size,weight:600,color:'rgba(20,23,28,.85)'});
 if(v>.001&&tc>0)pill(ctx,`${T2(own)} yr`,tx+14,ty,{size,weight:600,color:accent});
 // Each twin's own clock so far: one dot per year on that twin's path.
 const px=small?w*.08:w*.56, right=small?w*.92:w*.93, py=small?h*.775:h*.3, lh=small?23:40, dark='rgba(20,23,28,.85)';
 text(ctx,'Home twin’s clock',px,py,{size:small?12:14,color:'rgba(20,23,28,.65)'});text(ctx,`${T2(Math.min(tc,H))} years`,right,py,{align:'right',size:small?16:22,weight:700,color:dark});
 text(ctx,'Traveller’s clock',px,py+lh,{size:small?12:14,color:'rgba(20,23,28,.65)'});text(ctx,`${T2(v>.001?own:Math.min(tc,H))} years`,right,py+lh,{align:'right',size:small?16:22,weight:700,color:accent});
 trace(ctx,[[px,py+lh*.5],[right,py+lh*.5]]);ctx.strokeStyle='rgba(20,23,28,.1)';ctx.lineWidth=1;ctx.stroke();
 const note=v>.001?[`Each leg: ${T2(T)} years pass on Earth,`,`${T2(leg)} on the traveller’s slow clock.`]:['No trip: both twins share one path.'];
 note.forEach((line,i)=>text(ctx,line,px,py+lh*1.8+i*(small?15:18),{size:small?11:12,color:'rgba(20,23,28,.6)'}));
 if(tc>=H-1e-6&&v>.001)pill(ctx,`Together again: the traveller is ${T2(H-H/g)} years younger`,small?w/2:(px+right)/2,small?h*.95:py+lh*3.3,{align:'center',size:small?11:13,weight:600});
}
function dragPaths(w,h,spec,st,x,y,grab){
 const L=pathsLayout(w,h,st);
 if(grab)return st.stage>0&&Math.hypot(x-L.kink[0],y-L.kink[1])<22;
 const t=Math.max(.1,(L.bottom-y)/L.k), xs=Math.max(0,(x-L.x0)/L.k);
 return {mass:Math.min(1,xs/t/.9),distance:Math.min(2.5,Math.max(1,t/1.6))};
}

// River model of a black hole: space flows inward; light swims through it at light speed.
function drawRiver(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.gold, R=Physics.river(st.mass,st.distance), small=w<520;
 const cx=small?w/2:w*.33, cy=small?h*.36:h*.5, rmax=3, k=Math.min(small?w*.46:w*.3,small?h*.3:h*.44)/rmax, since=st.since??st.t;
 // The inner region and the horizon, where the inflow reaches light speed.
 if(R.rs>1e-4){const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,rmax*k);bg.addColorStop(0,'rgba(20,23,28,.12)');bg.addColorStop(1,'rgba(20,23,28,0)');ctx.fillStyle=bg;ctx.beginPath();ctx.arc(cx,cy,rmax*k,0,TAU);ctx.fill();}
 if(R.rs>1e-4){ctx.beginPath();ctx.arc(cx,cy,R.rs*k,0,TAU);ctx.fillStyle='rgba(20,23,28,.85)';ctx.fill();ctx.setLineDash([5,4]);ctx.strokeStyle='rgba(217,119,6,.9)';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);}
 // Flowing space: specks carried inward at the local flow speed, faster closer in.
 for(let i=0;i<90;i++){const a=hash(i*7.13)*TAU, r0=rmax*(.35+.65*hash(i*3.71)), phase=hash(i*1.9)*20;
  let r=r0;if(R.rs>1e-4){// Time to fall from rmax to r with dr/dt = -sqrt(rs/r): t = (2/3)(rmax^1.5 - r^1.5)/sqrt(rs).
   const span=(2/3)*(Math.pow(rmax,1.5)-Math.pow(.05,1.5))/Math.sqrt(R.rs), tt=((since*.5+phase)%span);r=Math.pow(Math.max(0,Math.pow(rmax,1.5)-1.5*Math.sqrt(R.rs)*tt),2/3);}
  if(r<.05)continue;const x=cx+Math.cos(a)*r*k,y=cy+Math.sin(a)*r*k, len=Math.min(14,4+8*R.flow(r));
  trace(ctx,[[x,y],[x-Math.cos(a)*len,y-Math.sin(a)*len]]);ctx.strokeStyle=r<R.rs?'rgba(255,255,255,.35)':'rgba(37,99,235,.35)';ctx.lineWidth=1.4;ctx.lineCap='round';ctx.stroke();}
 // Flashes of light sent outward from one ring, one every two seconds.
 ctx.beginPath();ctx.arc(cx,cy,R.re*k,0,TAU);ctx.setLineDash([2,4]);ctx.strokeStyle='rgba(20,23,28,.3)';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
 const emitter=[cx+R.re*k*Math.cos(-.6),cy+R.re*k*Math.sin(-.6)];
 for(let n=0;n<6;n++){const age=((since*.5)%2)+2*n;if(age>11)continue;const r=R.light(R.re,1,age*.4);if(r>rmax||r<.03)continue;
  const p=[cx+r*k*Math.cos(-.6),cy+r*k*Math.sin(-.6)], glow=ctx.createRadialGradient(...p,0,...p,12);glow.addColorStop(0,'rgba(255,196,80,.95)');glow.addColorStop(1,'rgba(255,196,80,0)');ctx.fillStyle=glow;ctx.fillRect(p[0]-12,p[1]-12,24,24);}
 ctx.beginPath();ctx.arc(...emitter,5,0,TAU);ctx.fillStyle=accent;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
 if(!st.labels)return;
 const size=small?10:11, out=1-R.flow(R.re);
 if(R.rs>1e-4)pill(ctx,'horizon: inflow = light speed',cx,cy+R.rs*k+16,{align:'center',size:10,weight:600,color:'rgba(180,83,9,.95)'});
 pill(ctx,'flash starts here',emitter[0]+10,emitter[1]-14,{size:10,weight:600,color:'rgba(20,23,28,.8)'});
 const px=small?w*.06:w*.64, py=small?h*.72:h*.22, lh=small?17:24;
 const lines=R.rs<=1e-4?['No black hole: space is still.','Light swims outward at light speed and escapes.']
  :['Space flows inward, faster closer in.','Light always swims at light speed through it.',
    out>.02?`Here the flow is ${Math.round(R.flow(R.re)*100)}% of light speed: the flash escapes slowly.`:out>-.02?'At the horizon the flow equals light speed: the flash stands still.':`Inside, the flow beats light (${Math.round(R.flow(R.re)*100)}%): the flash is swept in.`];
 text(ctx,lines[0],px,py,{size:small?12:16,weight:700,color:'#14171c'});
 lines.slice(1).forEach((l,i)=>text(ctx,l,px,py+lh*(i+1.2),{size:small?11:14,color:'rgba(20,23,28,.75)'}));
 // Flow speed against distance, with light speed marked.
 if(!small&&R.rs>1e-4){const gx=px,gy=py+lh*5.4,gw=w*.28,gh=h*.22;trace(ctx,[[gx,gy],[gx,gy+gh],[gx+gw,gy+gh]]);ctx.strokeStyle='rgba(20,23,28,.35)';ctx.lineWidth=1;ctx.stroke();
  const X=r=>gx+r/rmax*gw, Y=v=>gy+gh-Math.min(v,1.6)/1.6*gh;
  trace(ctx,Array.from({length:120},(_,i)=>{const r=.12+i/119*(rmax-.12);return [X(r),Y(R.flow(r))];}).filter((_,i)=>R.flow(.12+i/119*(rmax-.12))<=1.6));ctx.strokeStyle='rgba(37,99,235,.8)';ctx.lineWidth=2;ctx.stroke();
  ctx.setLineDash([4,4]);trace(ctx,[[gx,Y(1)],[gx+gw,Y(1)]]);ctx.strokeStyle='rgba(217,119,6,.8)';ctx.lineWidth=1.2;ctx.stroke();ctx.setLineDash([]);
  text(ctx,'light speed',gx+gw,Y(1)-9,{align:'right',size:10,color:'rgba(180,83,9,.95)'});text(ctx,'inflow speed',gx+gw*.55,gy+gh*.62,{size:10,color:'rgba(37,99,235,.9)'});text(ctx,'distance from centre →',gx+gw,gy+gh+14,{align:'right',size:10});
  const ex=X(R.re);trace(ctx,[[ex,gy],[ex,gy+gh]]);ctx.strokeStyle=rgba(accent,.6);ctx.stroke();text(ctx,'flash',ex+4,gy+gh-10,{size:10,color:rgba(accent,.95)});
  const hx=X(R.rs);ctx.setLineDash([2,3]);trace(ctx,[[hx,Y(1)],[hx,gy+gh]]);ctx.strokeStyle='rgba(20,23,28,.4)';ctx.stroke();ctx.setLineDash([]);text(ctx,'horizon',hx,gy+gh+14,{align:'center',size:10});}
}

// One toss, two views: from the ground (the ball arcs) and floating with the ball (the ground moves).
function viewsStage(st){
 const since=st.since??st.t, flight=x=>Math.min(1,(x*.16)%1.25);
 if(st.stage<=1)return {s:0,u:flight(since)};
 if(st.stage===2){const s=smooth((since-1.5)/3.5);return {s,u:since<5.5?0:flight(since-5.5)};}
 return {s:1,u:flight(since)};
}
function drawPerson(ctx,x,feet,size,color){
 ctx.strokeStyle=color;ctx.lineWidth=Math.max(2,size*.3);ctx.lineCap='round';ctx.lineJoin='round';
 trace(ctx,[[x-size*.4,feet],[x,feet-size*1.1],[x+size*.4,feet]]);ctx.stroke();
 trace(ctx,[[x,feet-size*1.1],[x,feet-size*2.2]]);ctx.stroke();
 trace(ctx,[[x-size*.7,feet-size*1.5],[x,feet-size*2],[x+size*.5,feet-size*2.6]]);ctx.stroke();
 ctx.beginPath();ctx.arc(x,feet-size*2.75,size*.45,0,TAU);ctx.fillStyle=color;ctx.fill();
}
function drawViews(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.blue, dark='#14171c', warm='#c2410c', small=w<520, V=Physics.views(st.mass,st.distance), full=Physics.views(1,st.distance), {s,u}=viewsStage(st), stage=st.stage;
 const apex=full.h(full.T/2), grav=Math.min(1,st.mass), tn=u*V.T, free=stage===0;
 // With no gravity the ball rises steadily; that chapter gets its own height scale so the whole straight path fits.
 const hi=free?Math.max(1.35*apex,1.08*V.h(V.T)):1.35*apex, lo=free?-.12*hi:-1.3*apex, top=free?hi*.92:apex*4/3;
 const M=small?{l:w*.3,r:w*.95,t:96,b:h*.8}:{l:w*.25,r:w*.88,t:70,b:h*.88};
 const X=t=>M.l+t/V.T*(M.r-M.l), Y=hh=>M.b-(hh-lo)/(hi-lo)*(M.b-M.t), shift=t=>s*V.h(t);
 ctx.save();ctx.beginPath();ctx.rect(M.l-10,M.t-6,M.r-M.l+20,M.b-M.t+12);ctx.clip();
 // The map: faint lines of equal height and of equal time. Changing the view bends them.
 for(let i=0;i<=4;i++){const hh=top*i/4;trace(ctx,Array.from({length:61},(_,j)=>{const t=V.T*j/60;return [X(t),Y(hh-shift(t))];}));ctx.strokeStyle='rgba(20,23,28,.08)';ctx.lineWidth=1;ctx.stroke();}
 for(let j=0;j<=8;j++){const t=V.T*j/8;trace(ctx,[[X(t),Y(-shift(t))],[X(t),Y(top-shift(t))]]);ctx.strokeStyle='rgba(20,23,28,.05)';ctx.lineWidth=1;ctx.stroke();}
 const path=f=>Array.from({length:81},(_,j)=>{const t=V.T*j/80;return [X(t),Y(f(t)-shift(t))];});
 ctx.lineCap='round';ctx.lineJoin='round';
 trace(ctx,path(()=>0));ctx.strokeStyle=dark;ctx.lineWidth=2.6;ctx.stroke();
 trace(ctx,path(V.h));ctx.strokeStyle=accent;ctx.lineWidth=2.8;ctx.stroke();
 for(const [hh,c] of [[-shift(tn),dark],[V.h(tn)-shift(tn),accent]]){const x=X(tn),y=Y(hh);ctx.beginPath();ctx.arc(x,y,6,0,TAU);ctx.fillStyle=c;ctx.fill();ctx.beginPath();ctx.arc(x,y,2.2,0,TAU);ctx.fillStyle='#fff';ctx.fill();}
 ctx.restore();
 // A ball that has left the chart is marked with an arrow at the top edge.
 if(Y(V.h(tn)-shift(tn))<M.t){let te=0;for(let j=1;j<=200;j++){const t=V.T*j/200;if(Y(V.h(t)-shift(t))<M.t){te=t;break;}}
  const ax=X(te);trace(ctx,[[ax,M.t+10],[ax,M.t-6]]);ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.stroke();trace(ctx,[[ax-4,M.t],[ax,M.t-6],[ax+4,M.t]]);ctx.stroke();}
 // Side view: the same moment as it looks. You stand on a scale; the ground pushes up through it.
 const sx=small?w*.14:w*.12, size=small?8:11, hand=Y(-shift(tn)), feet=hand+size*2.6, by=Y(V.h(tn)-shift(tn)), scaleH=grav>0?size*.55:0;
 ctx.save();ctx.beginPath();ctx.rect(sx-size*4.5,M.t-6,size*9,h-M.t);ctx.clip();
 if(grav>0){ctx.fillStyle='#e9e4da';ctx.strokeStyle='rgba(20,23,28,.45)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(sx-size*1.3,feet,size*2.6,scaleH,3);ctx.fill();ctx.stroke();
  const g0=feet+scaleH, soil=ctx.createLinearGradient(0,g0,0,g0+size*5);soil.addColorStop(0,`rgba(122,84,52,${.32*grav})`);soil.addColorStop(1,'rgba(122,84,52,0)');ctx.fillStyle=soil;ctx.fillRect(sx-size*4,g0,size*8,size*5);
  trace(ctx,[[sx-size*4,g0],[sx+size*4,g0]]);ctx.strokeStyle=`rgba(122,84,52,${.8*grav})`;ctx.lineWidth=2;ctx.stroke();}
 drawPerson(ctx,sx,feet,size,dark);
 ctx.beginPath();ctx.arc(sx+size*.6,by-size*.6,size*.55,0,TAU);ctx.fillStyle=accent;ctx.fill();
 if(grav>0&&stage>=1){const g0=feet+scaleH,ay=g0+size*2.4;ctx.globalAlpha=grav;trace(ctx,[[sx,ay],[sx,g0+3]]);ctx.strokeStyle=warm;ctx.lineWidth=2.4;ctx.stroke();trace(ctx,[[sx-5,g0+9],[sx,g0+3],[sx+5,g0+9]]);ctx.stroke();ctx.globalAlpha=1;}
 ctx.restore();
 if(!st.labels)return;
 const size2=small?10:11, held=grav>.5&&u>=.999&&stage!==2;
 pill(ctx,stage===0?'Far from any planet or star':s<.5?'From the ground':'From the ball’s perspective',M.l,M.t-30,{size:small?11:13,weight:700,color:dark});
 text(ctx,'height ↑',M.l-10,M.t+6,{align:'right',size:10});text(ctx,'time →',M.r,M.b+14,{align:'right',size:10});
 if(grav>0&&stage>=1&&feet+scaleH+size*2<h-6)text(ctx,'push',sx+8,feet+scaleH+size*2,{size:10,weight:600,color:warm});
 if(!held&&by>M.t&&by<h-8)pill(ctx,'scale: 0',sx+size*1.6,by-size*.6,{size:10,weight:600,color:accent});
 if(stage>=3){const mid=V.T/2;
  pill(ctx,'straight',X(mid),Y(V.h(mid)-shift(mid))-16,{align:'center',size:size2,weight:600,color:accent});
  pill(ctx,'pushed',X(mid),Y(-shift(mid))+18,{align:'center',size:size2,weight:600,color:dark});
  // The measurement that decides: what a scale reads on the ball and under you.
  const bx=M.r, y0=M.t+(small?8:14);
  [[accent,'Ball’s scale: zero'],[dark,'Your scale: your weight']].forEach(([c,a],i)=>text(ctx,a,bx,y0+i*(small?16:20),{align:'right',size:size2,weight:600,color:c}));
 }
}

// What curvature means: straight paths that start side by side come together or spread apart.
// Progress 0..1 of a motion that plays once per chapter, finishing at three quarters of it, then holds.
function onceInChapter(st,lead=.8){
 const c=timeline?.chapters?.[st.stage], span=c?Math.max(3,(c.end-c.start)*.75-lead):10;
 return clamp(((st.since??st.t)-lead)/span);
}
function drawTides(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.blue, dark='#14171c', warm='#c2410c', small=w<520, since=st.since??st.t, stage=st.stage, P=Physics.tides(Math.max(st.mass,1e-6));
 const dot=(x,y,r,c)=>{ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=c;ctx.fill();};
 if(stage===0){
  // A plain ball seen from a little above its middle; two walkers start side by side and walk straight ahead.
  const cx=w/2, cy=small?h*.46:h*.5, R=Math.min(small?w*.38:w*.24,small?h*.32:h*.4), tilt=.42;
  const G=(lat,lon)=>{const c=Math.cos(lat),x=c*Math.sin(lon),y=Math.sin(lat),z=c*Math.cos(lon);return [cx+R*x,cy-R*(y*Math.cos(tilt)-z*Math.sin(tilt)),y*Math.sin(tilt)+z*Math.cos(tilt)];};
  const sea=ctx.createRadialGradient(cx-R*.35,cy-R*.4,R*.1,cx,cy,R);sea.addColorStop(0,'#fdf9f1');sea.addColorStop(1,'#e8dcc6');ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.fillStyle=sea;ctx.fill();ctx.strokeStyle='rgba(20,23,28,.18)';ctx.lineWidth=1;ctx.stroke();
  const arc=(f,n,style,width,dash)=>{let prev=null;for(let i=0;i<=n;i++){const p=f(i/n);if(prev&&p[2]>0&&prev[2]>0){trace(ctx,[prev,p]);ctx.strokeStyle=style;ctx.lineWidth=width;if(dash)ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);}prev=p;}};
  for(let k=-5;k<=6;k++)arc(q=>G(-Math.PI/2+Math.PI*q,k*Math.PI/6),60,'rgba(20,23,28,.06)',1);
  for(let k=-2;k<=2;k++)arc(q=>G(k*Math.PI/6,TAU*q),120,k===0?'rgba(20,23,28,.25)':'rgba(20,23,28,.06)',k===0?1.3:1);
  const u=onceInChapter(st), lat=u*Math.PI/2*.999, lons=[-.35,.35];
  for(const lon of lons){arc(q=>G(Math.PI/2*q,lon),60,rgba(accent,.28),1.6,[3,4]);arc(q=>G(lat*q,lon),60,accent,2.8);}
  const a=G(lat,lons[0]),b=G(lat,lons[1]);trace(ctx,[a,b]);ctx.setLineDash([2,3]);ctx.strokeStyle=warm;ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([]);
  dot(...a.slice(0,2),6,accent);dot(...b.slice(0,2),6,accent);
  if(!st.labels)return;
  const gap=Math.sin(Math.acos(Math.sin(lat)**2+Math.cos(lat)**2*Math.cos(.7))/2)/Math.sin(.35);
  if(gap>.06)pill(ctx,'gap',(a[0]+b[0])/2,(a[1]+b[1])/2+16,{align:'center',size:small?10:11,weight:600,color:warm});
  else{const pole=G(Math.PI/2,0);pill(ctx,'they meet',pole[0],pole[1]-16,{align:'center',size:small?10:11,weight:600,color:warm});}
  return;
 }
 if(stage===1){
  // Two balls let go side by side, at rest, high above the Earth; beside them, their paths through time.
  const Re=small?h*.1:h*.14, ex=small?w*.24:w*.28, ey=small?h*.7:h*.8, r0=3, d=.3, tEnd=P.fallTime(r0,1.6), tt=tEnd*onceInChapter(st);
  drawEarth(ctx,ex,ey,Re);
  const gap=t=>{const [a,b]=[P.fall(-d,r0,t),P.fall(d,r0,t)];return Math.hypot(a[0]-b[0],a[1]-b[1]);};
  [-d,d].map(x=>P.fall(x,r0,tt)).forEach(([x,y])=>dot(ex+x*Re,ey-y*Re,5.5,accent));
  const D=small?{l:w*.5,r:w*.94,t:h*.24,b:h*.56}:{l:w*.5,r:w*.8,t:h*.3,b:h*.68}, mid=(D.t+D.b)/2, half=(D.b-D.t)*.32, Xt=t=>D.l+t/tEnd*(D.r-D.l);
  trace(ctx,[[D.l,D.t-6],[D.l,D.b+6]]);ctx.strokeStyle='rgba(20,23,28,.25)';ctx.lineWidth=1;ctx.stroke();
  for(const sgn of [-1,1]){trace(ctx,[[D.l,mid+sgn*half],[D.r,mid+sgn*half]]);ctx.setLineDash([3,4]);ctx.strokeStyle='rgba(20,23,28,.25)';ctx.lineWidth=1.2;ctx.stroke();ctx.setLineDash([]);
   const pts=Array.from({length:41},(_,i)=>{const t=tt*i/40;return [Xt(t),mid+sgn*half*gap(t)/(2*d)];});trace(ctx,pts);ctx.strokeStyle=accent;ctx.lineWidth=2.6;ctx.stroke();dot(...pts.at(-1),4.5,accent);}
  if(!st.labels)return;
  text(ctx,'their paths through time',(D.l+D.r)/2,D.t-26,{align:'center',size:small?10:12,weight:600,color:'rgba(20,23,28,.75)'});
  text(ctx,'time →',D.r,D.b+18,{align:'right',size:10});
  text(ctx,'dashed: far from any planet',D.r,mid-half-12,{align:'right',size:10,color:'rgba(20,23,28,.5)'});
  return;
 }
 if(stage===2){
  // A ring of balls let go all around the Earth shrinks; people on the ground are held off those paths.
  const cx=w/2, cy=small?h*.44:h*.5, r0=2.3, R=Math.min(small?w*.44:w*.26,small?h*.34:h*.42)/r0, n=12;
  const tEnd=P.fallTime(r0,1), tt=tEnd*onceInChapter(st);
  ctx.beginPath();ctx.arc(cx,cy,r0*R,0,TAU);ctx.setLineDash([3,5]);ctx.strokeStyle='rgba(20,23,28,.2)';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
  drawEarth(ctx,cx,cy,R);
  for(const ang of [-Math.PI/2,-Math.PI/2+TAU/3,-Math.PI/2-TAU/3]){ctx.save();ctx.translate(cx+Math.cos(ang)*R,cy+Math.sin(ang)*R);ctx.rotate(ang+Math.PI/2);drawPerson(ctx,0,0,small?4.5:6,dark);
   trace(ctx,[[0,small?16:20],[0,3]]);ctx.strokeStyle=warm;ctx.lineWidth=2.2;ctx.stroke();trace(ctx,[[-4,9],[0,3],[4,9]]);ctx.stroke();ctx.restore();}
  const pos=Array.from({length:n},(_,i)=>{const ang=-Math.PI/2+TAU*(i+.5)/n,[x,y]=P.fall(Math.cos(ang)*r0,Math.sin(ang)*r0,tt);return [cx+x*R,cy+y*R];});
  trace(ctx,[...pos,pos[0]]);ctx.strokeStyle=rgba(accent,.4);ctx.lineWidth=1.4;ctx.stroke();pos.forEach(([x,y])=>dot(x,y,5.5,accent));
  return;
 }
 // Tides: a small ring falling from high above, and the same ring seen floating with its middle ball.
 const r0=3, rho=.3, n=12, tEnd=P.fallTime(r0,2.3), tt=tEnd*onceInChapter(st);
 const Re=small?h*.085:h*.14, ex=small?w*.26:w*.3, ey=small?h*.62:h*.82;
 drawEarth(ctx,ex,ey,Re);
 const start=[[0,r0],...Array.from({length:n},(_,i)=>{const a=TAU*i/n;return [rho*Math.cos(a),r0+rho*Math.sin(a)];})], now=start.map(([x,y])=>P.fall(x,y,tt));
 now.forEach(([x,y],i)=>dot(ex+x*Re,ey-y*Re,i?2.6:3.4,i?accent:dark));
 const [cx0,cy0]=[ex+now[0][0]*Re,ey-now[0][1]*Re], box=rho*Re*2.2;
 ctx.strokeStyle='rgba(20,23,28,.3)';ctx.lineWidth=1;ctx.strokeRect(cx0-box,cy0-box,box*2,box*2);
 const ix=small?w*.72:w*.66, iy=small?h*.36:h*.48, Ri=Math.min(small?w*.12:w*.07,small?h*.1:h*.13);
 trace(ctx,[[cx0+box,cy0],[ix-Ri*1.6,iy]]);ctx.setLineDash([2,4]);ctx.strokeStyle='rgba(20,23,28,.2)';ctx.stroke();ctx.setLineDash([]);
 ctx.beginPath();ctx.arc(ix,iy,Ri,0,TAU);ctx.setLineDash([3,4]);ctx.strokeStyle='rgba(20,23,28,.3)';ctx.stroke();ctx.setLineDash([]);
 const rel=now.slice(1).map(([x,y])=>[ix+(x-now[0][0])/rho*Ri,iy-(y-now[0][1])/rho*Ri]);
 trace(ctx,[...rel,rel[0]]);ctx.strokeStyle=rgba(accent,.5);ctx.lineWidth=1.4;ctx.stroke();rel.forEach(([x,y])=>dot(x,y,5,accent));dot(ix,iy,5.5,dark);
 if(!st.labels||tt<tEnd*.4)return;
 text(ctx,'stretched ↕',ix+Ri*.9,iy-Ri*1.25,{size:small?10:11,weight:600,color:warm});text(ctx,'squeezed ↔',ix+Ri*1.05,iy+Ri*.3,{size:small?10:11,weight:600,color:warm});
}

// A person on a bathroom scale in a lift: parked at the bottom, one ride to the top, then the cable snaps and the lift
// falls freely for the rest of the guide. Each chapter continues where the last one ended; nothing loops.
const LIFT_SLOW=.28, LIFT_SNAP=1;
function liftFallTime(stage,since){
 // Seconds of free fall, slowed down for viewing; the last chapter carries on from the end of the previous one.
 const ch=timeline?.chapters?.[2], before=ch?Math.max(0,ch.end-ch.start-LIFT_SNAP):0;
 return stage===2?Math.max(0,since-LIFT_SNAP)*LIFT_SLOW:(before+since)*LIFT_SLOW;
}
function drawLift(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.blue, dark='#14171c', warm='#c2410c', small=w<520, since=st.since??st.t, stage=st.stage, L=Physics.lift();
 const sx0=small?w*.08:w*.28, sx1=small?w*.56:w*.5, top=small?40:30, bot=h*(small?.66:.94), carH=Math.min((bot-top)*.45,small?150:210), carW=(sx1-sx0)*.74, k=(bot-top-carH)/24;
 // Where the car is (metres above the lowest stop), its upward acceleration, and whether the cable still holds.
 const climb=t=>{let v=0,y=0;for(let q=0;q<t;q+=.02){v+=L.accelAt(q)*.02;y+=v*.02;}return y;}, topY=1+climb(30);
 let yc=1,a=0,snapped=false,fall=0,tf=0;
 if(stage===1){yc=1+climb(since);a=L.accelAt(since);}
 else if(stage>=2){tf=liftFallTime(stage,since);yc=topY;if(tf>0){snapped=true;fall=.5*L.g*tf*tf;a=-L.g;yc=topY-fall;}}
 // The dial's needle eases to each new reading instead of jumping: averaged over the last 0.7 s of the ride,
 // and swinging down over 0.7 s once the cable snaps. Computed from time alone, so seeking stays exact.
 const settle=.7, sinceSnap=stage===2?since-LIFT_SNAP:stage>2?99:-1;
 const reading=stage===1?Array.from({length:15},(_,i)=>L.reading(L.accelAt(Math.max(0,since-settle*i/14)))).reduce((x,y)=>x+y)/15
  :sinceSnap>0?1-smooth(sinceSnap/settle):1;
 const offset=snapped?fall:0, floorY=yw=>bot-(yw+offset)*k, cx=(sx0+sx1)/2;
 // The shaft: walls with a mark at every floor. While falling, the view follows the car and the walls stream past.
 ctx.fillStyle='rgba(20,23,28,.03)';ctx.fillRect(sx0,0,sx1-sx0,h);
 for(const x of [sx0,sx1]){trace(ctx,[[x,0],[x,h]]);ctx.strokeStyle='rgba(20,23,28,.25)';ctx.lineWidth=1.5;ctx.stroke();}
 for(let m=Math.floor((-offset-4)/3)*3;m<=-offset+30;m+=3){const y=floorY(m);if(y<-10||y>h+10)continue;
  for(const x of [sx0,sx1]){trace(ctx,[[x,y],[x+(x===sx0?10:-10),y]]);ctx.strokeStyle='rgba(20,23,28,.3)';ctx.lineWidth=1.2;ctx.stroke();}}
 const floor=floorY(yc), roof=floor-carH;
 // The cable: attached to the roof, or snapped and left behind in the shaft.
 if(!snapped){trace(ctx,[[cx,0],[cx,roof]]);ctx.strokeStyle='rgba(20,23,28,.55)';ctx.lineWidth=2;ctx.stroke();}
 else{const end=floorY(topY)-carH-8;trace(ctx,Array.from({length:12},(_,i)=>[cx+Math.sin(i*1.3)*3*(i/11),end-i*6]));ctx.strokeStyle='rgba(20,23,28,.5)';ctx.lineWidth=2;ctx.stroke();}
 ctx.fillStyle='#fffdf8';ctx.strokeStyle='rgba(20,23,28,.55)';ctx.lineWidth=1.6;ctx.beginPath();ctx.roundRect(cx-carW/2,roof,carW,carH,6);ctx.fill();ctx.stroke();
 // You, standing on a bathroom scale, holding an apple; after the snap the apple is let go and stays where it was.
 const size=carH/7.2, scaleH=size*.5, feet=floor-scaleH-3, px=cx-size*.6;
 ctx.fillStyle='#e9e4da';ctx.strokeStyle='rgba(20,23,28,.45)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(px-size*1.2,feet,size*2.4,scaleH,3);ctx.fill();ctx.stroke();
 ctx.fillStyle=reading>.01?warm:'rgba(20,23,28,.25)';ctx.fillRect(px-size*.3,feet+scaleH*.25,size*.6,scaleH*.5);
 // Floating: once nothing pushes, you drift gently off the scale, bobbing and turning a little; so does the apple.
 const drift=sinceSnap>0?smooth(sinceSnap/1.6):0, lift=size*drift*(.45+.12*Math.sin(since*1.3)), sway=.09*drift*Math.sin(since*.7);
 ctx.save();ctx.translate(px,feet-lift-size*1.3);ctx.rotate(sway);drawPerson(ctx,0,size*1.3,size,dark);ctx.restore();
 // The push: the scale pushing up on your feet, as long as the reading; gone once nothing pushes.
 if(reading>.03){const ux=px-size*1.7, len=size*1.5*reading;trace(ctx,[[ux,feet],[ux,feet-len]]);ctx.strokeStyle=warm;ctx.lineWidth=2.2;ctx.lineCap='round';ctx.stroke();
  trace(ctx,[[ux-4,feet-len+6],[ux,feet-len],[ux+4,feet-len+6]]);ctx.stroke();if(st.labels)text(ctx,'push',ux-6,feet-len/2,{align:'right',size:10,weight:600,color:warm});}
 const ax=px+size*(snapped?1.3+.45*drift+.15*drift*Math.sin(since*.9):.75), ay=feet-size*(snapped?2.35+.8*drift+.1*drift*Math.cos(since*1.1):2.75);
 ctx.beginPath();ctx.arc(ax,ay,size*.38,0,TAU);ctx.fillStyle='#d6453d';ctx.fill();
 // Which way the lift is speeding up.
 if(Math.abs(a)>.01){const ux=cx+carW/2+16,dir=a>0?-1:1,y0=(roof+floor)/2,len=Math.min(60,10+Math.abs(a)*5);trace(ctx,[[ux,y0-dir*len/2],[ux,y0+dir*len/2]]);ctx.strokeStyle=accent;ctx.lineWidth=2.4;ctx.stroke();
  trace(ctx,[[ux-5,y0+dir*(len/2-7)],[ux,y0+dir*len/2],[ux+5,y0+dir*(len/2-7)]]);ctx.stroke();}
 // The dial: what the scale reads, from zero to twice your weight.
 const dx=small?w*.79:w*.73, dy=small?h*.36:h*.5, R=Math.min(small?w*.17:w*.12,small?h*.16:h*.26);
 ctx.beginPath();ctx.arc(dx,dy,R,Math.PI*.9,Math.PI*2.1);ctx.strokeStyle='rgba(20,23,28,.15)';ctx.lineWidth=R*.14;ctx.lineCap='round';ctx.stroke();
 const ang=f=>Math.PI*.9+Math.PI*1.2*Math.min(1,f/2);
 ctx.beginPath();ctx.arc(dx,dy,R,Math.PI*.9,ang(reading));ctx.strokeStyle=reading>.01?warm:'rgba(20,23,28,.15)';ctx.stroke();ctx.lineCap='butt';
 for(const f of [0,1,2]){const t=ang(f);trace(ctx,[[dx+Math.cos(t)*R*.78,dy+Math.sin(t)*R*.78],[dx+Math.cos(t)*R*.9,dy+Math.sin(t)*R*.9]]);ctx.strokeStyle='rgba(20,23,28,.4)';ctx.lineWidth=1.5;ctx.stroke();}
 const na=ang(reading);trace(ctx,[[dx,dy],[dx+Math.cos(na)*R*.72,dy+Math.sin(na)*R*.72]]);ctx.strokeStyle=dark;ctx.lineWidth=3;ctx.lineCap='round';ctx.stroke();ctx.beginPath();ctx.arc(dx,dy,5,0,TAU);ctx.fillStyle=dark;ctx.fill();
 if(stage>=3&&!small){const ex=w*.88,ey=h*.16,er=16,ang2=st.t*.6;drawEarth(ctx,ex,ey,er);ctx.beginPath();ctx.arc(ex,ey,er*2.1,0,TAU);ctx.setLineDash([2,4]);ctx.strokeStyle='rgba(20,23,28,.3)';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();ctx.arc(ex+Math.cos(ang2)*er*2.1,ey+Math.sin(ang2)*er*2.1,3.5,0,TAU);ctx.fillStyle=dark;ctx.fill();}
 if(!st.labels)return;
 text(ctx,'you weigh',dx,dy-R-(small?34:40),{align:'center',size:small?11:12,weight:600,color:'rgba(20,23,28,.6)'});
 text(ctx,`${Math.round(reading*70)} kg`,dx,dy+R*.35,{align:'center',size:small?22:30,weight:700,color:reading>.01?dark:accent});
 text(ctx,'0',dx+Math.cos(ang(0))*R*1.2,dy+Math.sin(ang(0))*R*1.2,{align:'center',size:10});
 text(ctx,'standing still: 70 kg',dx,dy-R-(small?16:18),{align:'center',size:10,color:'rgba(20,23,28,.5)'});
 if(snapped&&stage===2)pill(ctx,'apple let go',ax+size*.6,ay-size*.5,{size:10,weight:600,color:'#b3362f'});
 // While falling: how fast, so "faster and faster" can be seen; the fall is shown in slow motion.
 if(snapped){text(ctx,`falling at ${Math.round(L.g*tf*3.6)} km/h`,cx,small?bot+18:h*.06,{align:'center',size:small?11:12,weight:600,color:accent});
  text(ctx,'slow motion · no air',cx,small?bot+34:h*.06+16,{align:'center',size:10,color:'rgba(20,23,28,.5)'});}
 if(stage>=3&&!small)text(ctx,'falling around the Earth',w*.88,h*.16+40,{align:'center',size:10,color:'rgba(20,23,28,.6)'});
}

// The Moon stretches the Earth: it pulls the near side more and the far side less than the centre, so the oceans bulge both ways.
function drawMoonTides(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.blue, dark='#14171c', warm='#c2410c', small=w<520, since=st.since??st.t, stage=st.stage, M=Physics.moonTides();
 // On a phone the Earth sits nearer the middle and a little smaller, so every label stays on screen.
 const ex=small?w*.42:w*.36, ey=small?h*.36:h*.5, Re=Math.min(small?w*.16:w*.15,small?h*.17:h*.27), mx=small?w*.88:w*.8, mr=Re*.27;
 // How much of the stretch to show: none while the pulls are compared, growing as the Earth's own fall is taken away.
 const morph=stage===0?1:stage===1?0:stage===2?smooth((since-2.5)/4):1, b=.11*morph;
 const spin=stage>=3?since*.35:0;
 const ocean=ctx.createRadialGradient(ex,ey,Re*.9,ex,ey,Re*1.3);ocean.addColorStop(0,'rgba(59,130,246,.35)');ocean.addColorStop(1,'rgba(59,130,246,.2)');
 ctx.beginPath();for(let i=0;i<=120;i++){const th=TAU*i/120,r=Re*(1.08+b*M.shape(th));const x=ex+Math.cos(th)*r,y=ey+Math.sin(th)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fillStyle=ocean;ctx.fill();ctx.strokeStyle='rgba(37,99,235,.45)';ctx.lineWidth=1;ctx.stroke();
 ctx.save();ctx.translate(ex,ey);ctx.rotate(spin);drawEarth(ctx,0,0,Re,{lat:90,lon:-10});ctx.restore();
 ctx.beginPath();ctx.arc(mx,ey,mr,0,TAU);const moon=ctx.createRadialGradient(mx-mr*.3,ey-mr*.3,mr*.1,mx,ey,mr);moon.addColorStop(0,'#f4f1ea');moon.addColorStop(1,'#a9a39a');ctx.fillStyle=moon;ctx.fill();
 // Arrows: the Moon's pull at the near side, centre and far side (differences enlarged), or the stretch left after the Earth's own fall.
 if(stage===1||stage===2){const c=M.centre[0], E=.45/(M.tide(1,0)[0]/c), Lc=Re*.55;
  const pts=[[1,0],[0,0],[-1,0],[0,1],[0,-1]];
  for(const [x,y] of pts){const t=M.tide(x,y), pull=[c+E*t[0],E*t[1]], keep=[E*t[0],E*t[1]], v=stage===1?pull:[pull[0]+(keep[0]-pull[0])*morph,pull[1]+(keep[1]-pull[1])*morph];
   if(stage===1&&(y!==0))continue;
   const sx=ex+x*Re*(x?1.08:0), sy=ey+y*Re*1.08, L=Lc/c, vx=v[0]*L, vy=v[1]*L, len=Math.hypot(vx,vy);if(len<3)continue;
   trace(ctx,[[sx,sy],[sx+vx,sy+vy]]);ctx.strokeStyle=x===0&&y===0?dark:warm;ctx.lineWidth=2.6;ctx.lineCap='round';ctx.stroke();
   const ux=vx/len,uy=vy/len;trace(ctx,[[sx+vx-ux*8-uy*5,sy+vy-uy*8+ux*5],[sx+vx,sy+vy],[sx+vx-ux*8+uy*5,sy+vy-uy*8-ux*5]]);ctx.stroke();}}
 // Two tides a day: a place on the coast turns through both bulges; its water level is traced below.
 let mark=null;
 if(stage>=3){const ang=Math.PI*.75+spin;mark=[ex+Math.cos(ang)*Re,ey+Math.sin(ang)*Re];ctx.beginPath();ctx.arc(...mark,5,0,TAU);ctx.fillStyle=dark;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
  const gx=small?w*.1:w*.6, gw=small?w*.8:w*.32, gy=small?h*.7:h*.72, gh=small?h*.12:h*.14;
  trace(ctx,[[gx,gy+gh/2],[gx+gw,gy+gh/2]]);ctx.strokeStyle='rgba(20,23,28,.15)';ctx.lineWidth=1;ctx.stroke();
  trace(ctx,Array.from({length:121},(_,i)=>{const f=i/120;return [gx+f*gw,gy+gh/2-M.shape(Math.PI*.75+f*TAU)*gh*.45];}));ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.stroke();
  const f=((spin%TAU)+TAU)%TAU/TAU;ctx.beginPath();ctx.arc(gx+f*gw,gy+gh/2-M.shape(Math.PI*.75+spin)*gh*.45,4.5,0,TAU);ctx.fillStyle=dark;ctx.fill();
  if(st.labels){text(ctx,'water level where you are, over one day',gx,gy-12,{size:small?10:11,weight:600,color:'rgba(20,23,28,.65)'});}}
 if(!st.labels)return;
 const size=small?10:11;
 text(ctx,'Moon (not to scale)',small?w-8:mx,ey+mr+16,{align:small?'right':'center',size:10,color:'rgba(20,23,28,.55)'});
 if(stage===0||stage>=3){pill(ctx,'high tide',ex+Re*1.25,ey-Re*.28,{size,weight:600,color:accent});pill(ctx,'high tide',ex-Re*1.25,ey-Re*.28,{align:'right',size,weight:600,color:accent});
  if(stage===0){pill(ctx,'low tide',ex,ey-Re*1.12-14,{align:'center',size,color:'rgba(20,23,28,.6)'});}}
 if(stage===1){pill(ctx,'pulled most',ex+Re*1.08,ey+24,{align:'center',size,weight:600,color:warm});pill(ctx,'centre',ex,ey+24,{align:'center',size,weight:600,color:dark});pill(ctx,'pulled least',ex-Re*1.08,ey+24,{align:'center',size,weight:600,color:warm});
  text(ctx,'differences enlarged',ex,ey+Re*1.08+24,{align:'center',size:10,color:'rgba(20,23,28,.5)'});}
 if(stage===2&&morph>.6){pill(ctx,'pulled ahead',ex+Re*1.3,ey+22,{size,weight:600,color:warm});pill(ctx,'left behind',ex-Re*1.3,ey+22,{align:'right',size,weight:600,color:warm});pill(ctx,'squeezed',ex+12,ey-Re*1.2,{size,weight:600,color:warm});}
}

// Attention: the word "it" compares what it looks for with what every word offers, gives each word a share of its
// attention (lines, thicker for bigger shares) and takes in a blend of their meanings, drawn as colours, in those
// shares. The shares are exact for the hand-made example in Physics.attention.
// The shares as drawn, for the readout; and shares as whole percentages that add up to exactly 100.
const ATTN={A:null};
function percents(weights){
 const raw=weights.map(x=>x*100), out=raw.map(Math.floor);let left=100-out.reduce((s,v)=>s+v,0);
 raw.map((v,j)=>[v-Math.floor(v),j]).sort((a,b)=>b[0]-a[0]).forEach(([,j])=>{if(left>0){out[j]++;left--;}});return out;
}
function drawAttention(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.blue, A=Physics.attention(st.mass,st.distance), small=w<520, n=A.words.length, ask=A.ask;
 ATTN.A=A;const P100=percents(A.weights), focused=A.focus>.02, swapping=st.distance>1.45&&st.distance<2.2;
 const colour=(v,a=1)=>`rgba(${v.map(c=>Math.round(c*255)).join(',')},${a})`, pct=j=>P100[j]+'%', ink='rgba(20,23,28,.85)';
 // The last word swaps smoothly between "tired" and "wide"; the question "it" asks swaps with it.
 const last=[['tired',1-A.mix],['wide',A.mix]], question=`“it” asks: which thing here could be ${A.mix<.5?'tired':'wide'}?`;
 const label=(j,x,y,opts)=>{if(j!==n-1)return text(ctx,A.words[j],x,y,opts);for(const [word,alpha] of last)if(alpha>.01){ctx.globalAlpha=alpha;text(ctx,word,x,y,opts);ctx.globalAlpha=1;}};
 const summary=A.even?`an equal bit of every word`:A.top.w>=.45?`mostly “${A.top.word}”`:`a bit of everything, most from “${A.top.word}”`;
 const focusLabel=A.focus<.005?'focus off: every word gets the same share':A.focus>.995?'full focus: the shares exactly as the formula gives them':`focus ${Math.round(A.focus*100)}%: shares more even than the formula’s`;
 // The answer: the word whose meaning "it" takes in most.
 const answer=!focused||A.even?'“it” → a bit of every word':A.top.w>=.4?`“it” → ${A.top.word}`:`“it” → mostly ${A.top.word}, a little of the rest`;
 if(small){
  // Phone: one row per word, with a bar for the share of attention "it" gives it; the readout pill sits above.
  const top=Math.max(136,h*.28), rowH=Math.min(24,(h-top-80)/n), xw=w*.31, bx=w*.35, bw=w*.5;
  if(st.labels){if(focused)pill(ctx,question,w/2,top-50,{align:'center',size:12,weight:600,color:accent});text(ctx,focusLabel,w/2,top-30,{align:'center',size:11,color:'rgba(20,23,28,.6)'});
   text(ctx,'how much “it” looks at each word',bx,top-12,{size:11,weight:600,color:'rgba(20,23,28,.65)'});}
  A.words.forEach((_,j)=>{
   const y=top+j*rowH, share=A.weights[j], len=Math.max(2,share*bw);
   if(j===ask){ctx.fillStyle=accent;ctx.beginPath();ctx.roundRect(xw-40,y-rowH*.42,46,rowH*.84,rowH*.42);ctx.fill();}
   label(j,xw,y,{align:'right',size:14,weight:j===ask?700:500,color:j===ask?'#fff':ink});
   ctx.fillStyle=colour(A.values[j],.95);ctx.beginPath();ctx.roundRect(bx,y-6,len,12,4);ctx.fill();
   text(ctx,pct(j),bx+len+6,y,{size:11,weight:j===A.top.j&&!A.even?700:500,color:j===A.top.j&&!A.even?ink:'rgba(20,23,28,.6)'});
   if(j===n-1&&swapping){ctx.strokeStyle='#c2410c';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(xw-52,y-rowH*.46,58,rowH*.92,6);ctx.stroke();}
  });
  if(st.labels)pill(ctx,answer,w/2,top+n*rowH+14,{align:'center',size:14,weight:700,color:A.even||!focused?ink:colour(A.values[A.top.j])});
  drawBlend(top+n*rowH+52,24,w-48,12);
  return;
 }
 // Desktop: the sentence as a row of tiles, with a line from "it" to every word.
 const size=18, padX=13, gap=12, tileH=42, rowY=h*.58;
 ctx.font=`600 ${size}px ${FONT}`;
 const widths=A.words.map((word,j)=>(j===n-1?Math.max(ctx.measureText('tired').width,ctx.measureText('wide').width):ctx.measureText(word).width)+2*padX);
 let x=(w-widths.reduce((s,v)=>s+v,0)-gap*(n-1))/2;
 const tiles=widths.map(tw=>{const t={x,w:tw,cx:x+tw/2};x+=tw+gap;return t;}), top=rowY-tileH/2, from=tiles[ask];
 const curve=j=>{const to=tiles[j], dx=Math.abs(to.cx-from.cx);return [[to.cx,top-2],[(to.cx+from.cx)/2,top-36-dx*.5],[from.cx,top-2]];};
 const at=([p0,c,p1],u)=>[(1-u)*(1-u)*p0[0]+2*(1-u)*u*c[0]+u*u*p1[0],(1-u)*(1-u)*p0[1]+2*(1-u)*u*c[1]+u*u*p1[1]];
 ctx.lineCap='round';
 A.words.forEach((_,j)=>{
  // The share "it" gives itself is printed under its tile and shown in the blend; it has no line.
  if(j===ask)return;
  // Every line has the same colour; only its thickness shows the share.
  const share=A.weights[j], lw=1.5+24*share, alpha=.22+.5*Math.min(1,share/.3);
  const c=curve(j);ctx.beginPath();ctx.moveTo(...c[0]);ctx.quadraticCurveTo(...c[1],...c[2]);ctx.strokeStyle=`rgba(37,99,235,${alpha})`;ctx.lineWidth=lw;ctx.stroke();
  // Meaning flows along each line into "it": dots in the word's colour, bigger for bigger shares.
  if(share>.03)for(let k=0;k<2;k++){const u=((st.t*.4+k/2+j*.137)%1+1)%1, p=at(c,u);ctx.beginPath();ctx.arc(...p,1.8+5*Math.sqrt(share),0,TAU);ctx.fillStyle=colour(A.values[j],.95);ctx.fill();}
 });
 tiles.forEach((t,j)=>{
  const asking=j===ask;
  ctx.fillStyle=asking?accent:'#fff';ctx.strokeStyle=asking?accent:'rgba(20,23,28,.16)';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.roundRect(t.x,top,t.w,tileH,9);ctx.fill();ctx.stroke();
  // The tile's colour strip is the word's meaning.
  if(!asking){ctx.fillStyle=colour(A.values[j]);ctx.beginPath();ctx.roundRect(t.x+6,top+tileH-7,t.w-12,4,2);ctx.fill();}
  // The last word glows while it is being swapped.
  if(j===n-1&&swapping){ctx.strokeStyle='#c2410c';ctx.lineWidth=2.5;ctx.beginPath();ctx.roundRect(t.x-3,top-3,t.w+6,tileH+6,11);ctx.stroke();}
  label(j,t.cx,rowY-2,{align:'center',size,weight:asking?700:600,color:asking?'#fff':ink});
  text(ctx,pct(j),t.cx,top+tileH+16,{align:'center',size:13,weight:j===A.top.j&&!A.even?700:500,color:j===A.top.j&&!A.even?ink:'rgba(20,23,28,.55)'});
 });
 if(st.labels){
  text(ctx,'each line: how much “it” looks at that word (thicker = more)',tiles[0].x,34,{size:12,weight:600,color:'rgba(20,23,28,.65)'});
  text(ctx,'dots: each word’s meaning flowing into “it”',tiles[0].x,54,{size:12,weight:500,color:'rgba(20,23,28,.6)'});
  text(ctx,focusLabel,tiles[0].x,74,{size:12,weight:500,color:'rgba(20,23,28,.6)'});
  if(focused)pill(ctx,question,from.cx,top+tileH+46,{align:'center',size:13,weight:600,color:accent});
  pill(ctx,answer,from.cx,top+tileH+(focused?78:46),{align:'center',size:16,weight:700,color:A.even||!focused?ink:colour(A.values[A.top.j])});
 }
 drawBlend(h*.86,w/2-270,540,14);
 // What "it" takes in: the words' colours side by side in proportion to their shares.
 function drawBlend(y,x0,width,size){
  let x=x0;const bh=small?16:20;
  A.weights.forEach((share,j)=>{const seg=share*width;ctx.fillStyle=colour(A.values[j]);ctx.fillRect(x,y,seg,bh);x+=seg;
   if(j<n-1){ctx.fillStyle='rgba(255,255,255,.9)';ctx.fillRect(x-.5,y,1,bh);}});
  ctx.strokeStyle='rgba(20,23,28,.18)';ctx.lineWidth=1;ctx.strokeRect(x0,y,width,bh);
  if(!st.labels)return;
  text(ctx,'what “it” takes in:',x0,y-13,{size,weight:600,color:'rgba(20,23,28,.65)'});
  ctx.font=`600 ${size}px ${FONT}`;text(ctx,summary,x0+ctx.measureText('what “it” takes in:').width+6,y-13,{size,weight:700,color:ink});
  text(ctx,'each colour is one word’s meaning, as wide as its share',x0,y+bh+14,{size:small?10:11,color:'rgba(20,23,28,.55)'});
 }
}

const ENGINES={
 'light-bending':{draw:drawLight,a:['Mass','how much mass sits nearby'],b:['Passing distance','how close the light passes','×'],
  fa:a=>a.toFixed(2),fb:b=>b.toFixed(2)+'×',
  measure:['Real bend of the nearest ray',(a,b)=>(Physics.deflection(a,b)*180/Math.PI).toFixed(2)+'°'],scale:'',disclosure:'The mesh measures distance as the time light needs to cross it, timed far away; light’s straightest line across it is the drawn path. Its dip and the bending are drawn for six times the model mass; the readout is the model value for the nearest ray, in the model’s own units. The dip is not a slope, and the star is an illustration.',demoEnd:s=>Math.min(2.5,s.distance+1),
  try:'Slide Mass to zero, then back up. Now move the beam farther away. When does it bend most?',aria:'Light passing a massive object, compared with a straight path without the mass.'},
 'gravity-clocks':{draw:drawClocks,a:['Mass','how much mass sits nearby'],b:['Lower radius','gap stays 2 units',' units'],
  fa:a=>a.toFixed(2),fb:b=>b.toFixed(2)+' units',
  measure:['Lower clock runs slower by',(a,b)=>((1-Physics.clockRatio(a,b))*100).toFixed(2)+'%'],scale:'',disclosure:'The difference between the clock hands is drawn twelve times larger; the slowdown readout is the model value in arbitrary units, not an Earth figure. The planet and distances are illustrations.',demoEnd:()=>2.5,
  try:'Slide Mass to zero. Do the clocks agree? Bring it back, then move the Lower radius outward.',aria:'Two stationary clocks at different heights above a mass. The lower clock counts less time.'},
 'spacetime':{draw:drawSpacetime,a:['Speed','how fast the traveller flies'],b:['Trip','time out before turning back',''],
  fa:a=>Math.round(Physics.speed(a)*100)+'% of light',fb:b=>Physics.turnaround(b).toFixed(1)+' years out',
  measure:['Traveller comes home younger by',a=>(Physics.agingGap(a)*100).toFixed(1)+'%'],scale:'Time runs up · light moves at 45°',disclosure:'Speeds and times are exact for the model; the turnaround is treated as instant.',demoEnd:()=>2.5,
  try:'Set Speed to zero: do the twins agree? Push it up. Then make the trip longer: does the percentage change?',aria:'A spacetime diagram: a home twin stays put while a traveller goes out and back. The traveller collects fewer ticks.'},
 'interference':{draw:drawInterference,a:['Second source','strength of the second wave'],b:['Source spacing','in wavelengths',''],
  fa:a=>a<.005?'off':Math.round(a*100)+'%',fb:b=>Physics.separation(b).toFixed(1)+' λ',
  measure:['Stripe contrast',a=>(Physics.visibility(a)*100).toFixed(0)+'%'],scale:'Seen from above',disclosure:'Wave sizes are illustrative; the stripe contrast is computed exactly for two point sources.',demoEnd:()=>2.5,
  try:'Turn the second source off: what happens to the stripes? Bring it back, then spread the sources apart.',aria:'Two circular wave sources overlapping, making bright and dark stripes on a screen.'},
 'two-slit-particles':{draw:drawParticles,a:['Second slit','how open the second slit is'],b:['Slit spacing','relative distance between the slits',''],
  fa:a=>a<.005?'closed':Math.round(a*100)+'% open',fb:b=>b.toFixed(2)+'×',
  measure:['Stripe contrast',a=>(Physics.visibility(a)*100).toFixed(0)+'%'],scale:'',disclosure:'Arrivals are pseudo-random samples from the predicted pattern; the ripples show possibilities, not paths.',demoEnd:()=>2.5,
  try:'Close the second slit: do the stripes survive? Open it again, then move the slits apart.',aria:'Particles arrive one at a time on a screen behind two slits and slowly build up stripes.'},
 'standing-waves':{draw:drawRope,demo:false,plucks:true,
  a:['How hard you pluck','how far you pull the string'],b:['Where you press','toward the middle, a shorter string rings',''],
  fa:a=>Math.round(a*100)+'%',fb:b=>{const L=guitarLen(b);return L>.996?'open string':Math.round(L*100)+'% rings';},
  measure:[()=>GUITAR.active?'Note':'Rope swings',a=>GUITAR.active?(a>.001?Math.round(220/GUITAR.len):0)+' swings a second':ROPE.key==='pulse'||ROPE.size<.05?'':ROPE.size.toFixed(1)+'× as far as your hand'],tryAny:true,scale:'',demoEnd:()=>2.5,
  disclosure:'The rope is simulated: the wave equation with a little friction, which is why an in-step swing stops growing at about 6 times the hand. Everything is slowed down, the single shake 8 times more; on phones the swing is drawn taller. The rope makes no sound: at a few swings a second it is far too slow to hear. The guitar string is drawn 220 times slower and bigger than it really moves; its sound is a synthesized plucked string at the real pitch, 220 Hz open and 440 Hz pressed at the middle.',
  try:'Move “Where you press” toward the middle: each move plucks the string, and the shorter it rings, the higher the note.',aria:'A hand shakes one end of a rope tied to a wall. At one, two or three shakes a second the rope swings big in one, two or three loops; at other speeds it only jiggles. Then a guitar string is plucked, open and pressed at the middle.'},
 'tunneling':{draw:drawTunnel,a:['Barrier height','compared with the particle’s energy'],b:['Barrier width','how thick the barrier is',''],
  fa:a=>a<.005?'none':(2*a).toFixed(1)+'× energy',fb:b=>(.6*b/(2*Math.PI)).toFixed(2)+' wavelengths',
  measure:['Bounces back',(a,b)=>(Physics.reflected(a,b)*100).toFixed(0)+'%'],scale:'A steady stream, shown at one instant',disclosure:'Exact steady-state solution in units where ħ = 1 and 2m = 1.',demoEnd:()=>2.5,
  try:'Remove the barrier: does anything bounce back? Raise it above the energy, then make it thicker.',aria:'A quantum wave meets a barrier: part bounces back, part leaks through.'},
 'wave-packet':{draw:drawPacket,a:['Speed mix','how many wavelengths are blended'],b:['Average speed','sets the main wavelength',''],
  fa:a=>a<.005?'one wave':(1.1*a).toFixed(2),fb:b=>(2+2*(b-1)).toFixed(1),
  measure:['Spread of speeds',a=>(1.1*a).toFixed(2)],scale:'',disclosure:'Time is slowed down; units where ħ = 1 and 2m = 1.',demoEnd:()=>2.5,
  try:'Set the mix to one wave: where is the particle? Blend more wavelengths and watch the packet narrow.',aria:'A wave packet made by blending wavelengths, with a bar chart of the momenta mixed in.'},
 'quantum-well':{draw:drawWell,a:['Well depth','how strongly the particle is held'],b:['Well width','how much room it has',''],
  fa:a=>a<.005?'no well':Math.round(a*100)+'%',fb:b=>(1+(b-1)).toFixed(2)+'×',
  measure:['Trapped energy levels',(a,b)=>String(Physics.levelCount(a,b))],scale:'',disclosure:'Energy levels are to scale. Each level’s wave is drawn vibrating like a plucked string; its probability pattern does not change over time, and wave heights are not to scale.',demoEnd:()=>2.5,
  try:'Remove the well: are there any levels? Deepen it, then widen it. When does a new level appear?',aria:'A particle trapped in a well can only have certain energies, drawn as levels with their wave shapes.'},
 'falling-time':{draw:drawFall,a:['Gravity','how strong gravity is'],b:['Time in the air','between leaving and meeting again',''],
  fa:a=>a<.005?'none':Math.round(a*100)+'%',fb:b=>(2+2*(b-1)).toFixed(1)+' units',
  measure:['Thrown clock gains',(a,b)=>(Physics.fallGain(a,b)*100).toFixed(1)+'%'],scale:'',disclosure:'Time effects are enormously exaggerated so they can be seen; the shape of the result is exact for weak gravity.',demoEnd:()=>2.5,
  try:'Turn gravity off: which path keeps the most time? Turn it on and give the ball longer in the air.',aria:'Clocks held at the ground and thrown upward; the path a thrown ball takes is the one that keeps the most time.'},
 'diffraction':{draw:drawGap,a:['Gap','narrower to the right; 0 removes the barrier'],b:['Wavelength','length of one wave',''],
  fa:a=>a<.005?'no barrier':Physics.gap(a,1).width.toFixed(1)+' units',fb:b=>Physics.gap(1,b).lambda.toFixed(2)+' units',
  measure:['Spreads by',(a,b)=>Physics.spreadAngle(a,b).toFixed(0)+'°'],scale:'Seen from above',disclosure:'Sizes are illustrative; the spreading angle is the exact single-gap value.',demoEnd:()=>2.5,
  try:'Remove the barrier: does the wave spread? Narrow the gap, then lengthen the waves.',aria:'A wave passes through a gap and spreads out, with bright and dark bands on a screen.'},
 'twin-trip':{draw:drawTwinTrip,a:['Speed','how fast the rocket flies'],b:['Trip','time out before turning back',''],
  fa:a=>Math.round(Physics.speed(a)*100)+'% of light',fb:b=>Physics.turnaround(b).toFixed(1)+' years out',
  measure:['Traveller comes home younger by',a=>(Physics.agingGap(a)*100).toFixed(1)+'%'],scale:'',demoEnd:()=>2.5,
  disclosure:'Ages and speeds are exact special relativity; the rocket turns around instantly, and the drawing is not to scale.',
  try:'Set Speed to zero: do the twins still agree? Speed up, then make the trip longer and compare the two bars.',aria:'Twins: one stays on Earth while the other flies to a star and back. Two bars show how much each twin has aged.'},
 'light-clock':{draw:(ctx,w,h,spec,st)=>drawLightClocks(ctx,w,h,spec,st,{vplan:Physics.speed(st.stage===timeline?.chapters?.length-1?1:spec.mass)}),
  demo:(p,spec)=>({mass:spec.mass+(1-spec.mass)*smooth(p/.12),distance:spec.distance}),a:['Speed','how fast the rocket flies'],b:['Unused','',''],
  fa:a=>Math.round(Physics.speed(a)*100)+'% of light',fb:b=>'',
  measure:['Rocket clock ticks slower by',a=>(Physics.agingGap(a)*100).toFixed(0)+'%'],scale:'Seen from Earth',demoEnd:s=>s.distance,
  disclosure:'Exact special relativity: light moves at the same speed for every observer. The clocks are slowed down for viewing and not to scale; the rocket clock ticks normally for its crew.',
  try:'Slide the speed down to zero: the clocks agree. Push it toward light speed: the slanted path grows and the rocket clock nearly stops.',aria:'Two light clocks: one on Earth with light going straight up and down, one on a moving rocket whose light must slant to hit the moving mirrors, so it ticks less often.'},
 'spacetime-paths':{draw:drawPaths,drag:dragPaths,demo:false,a:['Speed','how fast the traveller flies'],b:['Trip','time out before turning back',''],
  fa:a=>Math.round(Physics.speed(a)*100)+'% of light',fb:b=>Physics.turnaround(b).toFixed(1)+' years out',
  measure:['Traveller’s clock counts less by',a=>(Physics.agingGap(a)*100).toFixed(1)+'%'],scale:'',demoEnd:()=>2.5,
  disclosure:'Exact special relativity in years and light-years; the turnaround is instant. The light clocks are slowed down for viewing and not to scale. Distances on the page are not spacetime lengths: tilted paths look longer than they hold.',
  try:'Drag the turnaround sideways: a faster trip leaves less time on the traveller’s clock. Drag it back to the home path: the twins agree again.',aria:'A spacetime diagram: the home twin’s straight path and the traveller’s bent path between the same goodbye and reunion, with one dot per year of each twin’s own time.'},
 'river':{draw:drawRiver,demo:(p,spec)=>{const at=spec.mass+.4, inside=Math.max(1,.6*spec.mass+.4);
   return {mass:spec.mass,distance:p<.31?spec.distance+(at-spec.distance)*smooth(p/.06):at+(inside-at)*smooth((p-.31)/.06)};},a:['Black hole mass','sets the size of the horizon'],b:['Flash position','where the light is sent from',''],
  fa:a=>a<.005?'none':Math.round(a*100)+'%',fb:b=>(Physics.river(1,b).re).toFixed(2)+' horizon sizes',
  measure:['Inflow where the flash starts',(a,b)=>Math.round(Physics.river(a,b).flow(Physics.river(a,b).re)*100)+'% of light'],scale:'Seen from above',demoEnd:()=>1,
  disclosure:'Exact for a non-rotating black hole in the river (Painlevé–Gullstrand) picture; distances in horizon sizes, motion slowed down. The flowing specks show the inflow speed, not real particles.',
  try:'Move the flash inside the horizon: can it get out? Shrink the black hole and try again.',aria:'Space flowing into a black hole like a river, with light flashes swimming outward against the current.'},
 'fall-views':{draw:drawViews,demo:false,measure:null,a:['Gravity','how strong gravity is'],b:['Time in the air','between the toss and the catch',''],
  fa:a=>a<.005?'none':Math.round(a*100)+'%',fb:b=>Physics.views(1,b).T.toFixed(1)+' units',scale:'',demoEnd:()=>1.6,
  disclosure:'Schematic units; air resistance is ignored. The view from the ball’s perspective is exact for a short toss. The first chapter, with no gravity, uses its own height scale so the whole path fits.',
  try:'',aria:'A ball tossed up and caught, drawn on a map of height and time, first as seen from the ground and then as seen from the ball, where the ball stays still and the ground moves.'},
 'tides':{draw:drawTides,demo:false,measure:null,a:['Planet mass','how strongly it pulls'],b:['Unused','',''],
  fa:a=>Math.round(a*100)+'%',fb:b=>b.toFixed(2),scale:'',demoEnd:()=>1,
  disclosure:'The ball is an analogy: a curved surface in space. Spacetime curvature also makes straight paths come together or spread apart, but it involves time and cannot be drawn exactly. The balls follow exact Newtonian free fall, accurate for weak gravity; sizes are not to scale. In three dimensions, a small floating ring away from the Earth stretches one way and squeezes in the other two, so its volume stays the same.',
  try:'',aria:'Two walkers heading north on a globe come together; a ring of falling balls around the Earth shrinks; a small falling ring stretches into an egg shape.'},
 'lift':{draw:drawLift,demo:false,measure:null,a:['Unused','',''],b:['Unused','',''],
  fa:a=>a.toFixed(2),fb:b=>b.toFixed(2),scale:'',demoEnd:()=>1.25,
  disclosure:'Newtonian physics, exact for a lift on Earth: a scale reads the floor’s push, your weight times (g + a)/g. The ride’s speeds, the 70 kg reading and the shaft are illustrative; air resistance is ignored, and real lifts have safety brakes. The dial’s needle eases to each reading like a real scale’s; the push itself changes at once, and the fall is shown in slow motion.',
  try:'',aria:'A person stands on a bathroom scale in a lift. The dial reads their weight when parked, more or less while the lift speeds up or slows down, and zero when the cable snaps.'},
 'moon-tides':{draw:drawMoonTides,demo:false,measure:null,a:['Unused','',''],b:['Unused','',''],
  fa:a=>a.toFixed(2),fb:b=>b.toFixed(2),scale:'',demoEnd:()=>1.25,
  disclosure:'The arrows come from the exact Newtonian pull at the real Earth–Moon distance, with differences enlarged; the bulges are hugely exaggerated, and the Moon is drawn far too close and too big. Real tides are also shaped by coastlines and ocean depth.',
  try:'',aria:'The Earth with its oceans and the Moon. The Moon pulls the near side most and the far side least, so the oceans bulge toward and away from the Moon, and a place on the coast passes two high tides a day.'},
 'attention':{draw:drawAttention,a:['Focus','how strongly the matches count'],b:['Last word','tired or wide',''],
  fa:a=>a<.005?'none':Math.round(a*100)+'%',fb:b=>Physics.attention(1,b).ending,
  measure:['“it” looks most at',(a,b)=>{const A=ATTN.A||Physics.attention(a,b);return A.even?`no word: all get ${Math.round(100/A.words.length)}%`:`“${A.top.word}”, ${percents(A.weights)[A.top.j]}%`;}],
  // The modelled effect for the render checks: how far the top share rises above an equal share.
  effect:(a,b)=>{const A=Physics.attention(a,b);return A.top.w-1/A.words.length;},scale:'',demoEnd:()=>2.5,
  disclosure:'The shares are computed exactly with the attention formula from “Attention Is All You Need” (2017): each word’s share is the softmax of the asking word’s query times that word’s key, divided by the square root of their length. The numbers are hand-made, four per word, not taken from a trained model. Real models learn them, use hundreds of numbers per word, many attention heads and many layers, and add position information, because attention alone ignores word order. As in the paper’s encoder, every word can look at the words after it too; models that write text one word at a time let a word look only at the words before it. Focus scales the scores to show how the shares form; at 100% it is the formula itself. Here “it” is handed its question, which already depends on the last word; a real model builds it from the words around “it” in earlier layers. Colours stand for what each word means; shares are rounded so they add up to 100%.',
  try:'Set Focus to zero and every word gets the same share. Then switch the last word between “tired” and “wide”, and watch which word “it” takes in.',
  aria:'The sentence “The animal didn’t cross the street because it was too tired” as word tiles. Lines from the word “it” to every word show how much attention it gives each one; most goes to “animal”, and a bar shows the blend of meanings “it” takes in. With the last word swapped to “wide”, most goes to “street”.'}
};
const engineOf=spec=>ENGINES[spec?.kind]||ENGINES['light-bending'];

function draw(ctx,w,h,spec,state){engineOf(spec).draw(ctx,w,h,spec,state);}
window.CouncilDraw={draw,accent:spec=>ACCENT[spec.accent]||ACCENT.mint,disclosure:spec=>engineOf(spec).disclosure||''};

const $=id=>document.getElementById(id);
const canvas=$('universe');
if(!canvas)return;
const ctx=canvas.getContext('2d');
let spec=null, time=0, mass=.7, distance=1.25, stage=2, mode='live', last=0, shown=0, started=false, ended=false, captionKey='';
const listeners=new Set(), emit=type=>listeners.forEach(fn=>fn(type));
// Subtitle pacing: comfortable reading speed, a minimum time on screen, and a pause between sentences.
const READING={cps:14,minimum:2.8,pause:.9,lead:.8,tail:.8};
let timeline=null;
function buildTimeline(){
 let t=0;
 const chapters=spec.beats.map(beat=>{
  const start=t;t+=READING.lead;
  const lines=sentences(beat.body).map(text=>{const shown=Math.max(READING.minimum,text.length/READING.cps),line={text,start:t,end:t+shown};t+=shown+READING.pause;return line;});
  t+=READING.tail;return {start,end:t,lines};
 });
 // A scene may ask for a longer duration than reading needs; stretch evenly, never compress.
 const stretch=Math.max(1,spec.duration/t);
 for(const c of chapters){c.start*=stretch;c.end*=stretch;for(const l of c.lines){l.start*=stretch;l.end*=stretch;}}
 timeline={chapters,total:t*stretch};
}
const chapterAt=t=>{const i=timeline.chapters.findIndex(c=>t<c.end);return i<0?timeline.chapters.length-1:i;};
const target=()=>stage===0?0:mass;
const fmt=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

// Sound: only plucked strings make a sound, at the moments an engine plucks one (playback crossing a pluck, or the
// viewer moving a control). Nothing sounds before the viewer presses play.
const SOUND={ctx:null,out:null,buffers:new Map(),queue:[],on:(()=>{try{return localStorage.getItem('council-sound')!=='off';}catch{return true;}})()};
function audioStart(){
 if(SOUND.ctx||!engineOf(spec).plucks)return SOUND.ctx?.resume?.();
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 const a=SOUND.ctx=new AC(), out=SOUND.out=a.createGain(), warm=a.createBiquadFilter();
 a.resume?.();out.gain.value=.5;warm.type='lowpass';warm.frequency.value=3200;out.connect(warm);warm.connect(a.destination);
}
// A plucked string (Karplus-Strong): a short burst of softened noise circulating in a delay line one period long,
// averaged on each pass so it mellows and fades like a real string.
function stringBuffer(freq){
 const key=Math.round(freq);if(SOUND.buffers.has(key))return SOUND.buffers.get(key);
 const a=SOUND.ctx, rate=a.sampleRate, n=Math.floor(rate*2.6), y=new Float32Array(n), N=Math.max(2,Math.floor(rate/freq)), decay=.996;
 let prev=0;for(let i=0;i<N;i++){prev=.5*prev+.5*(hash(i*1.37+freq)*2-1);y[i]=prev;}
 for(let i=N;i<n;i++)y[i]=decay*.5*(y[i-N]+y[Math.max(0,i-N-1)]);
 let peak=0;for(const v of y)peak=Math.max(peak,Math.abs(v));const fade=Math.floor(rate*.08);
 for(let i=0;i<n;i++)y[i]=y[i]/(peak||1)*(i>n-fade?(n-i)/fade:1);
 const buffer=a.createBuffer(1,n,rate);buffer.copyToChannel(y,0);SOUND.buffers.set(key,buffer);return buffer;
}
function soundPluck(freq){SOUND.queue.push(freq);}
function voice(){
 if(!SOUND.ctx||!SOUND.on){SOUND.queue.length=0;return;}
 while(SOUND.queue.length){const src=SOUND.ctx.createBufferSource();src.buffer=stringBuffer(SOUND.queue.shift());src.connect(SOUND.out);src.start();}
}
// A hidden tab freezes the picture, so its sound pauses too.
document.addEventListener('visibilitychange',()=>{if(!SOUND.ctx)return;if(document.hidden)SOUND.ctx.suspend?.();else SOUND.ctx.resume?.();});
function paint(){
 if(!spec)return;
 const box=canvas.getBoundingClientRect(), w=box.width, h=box.height, dpr=window.devicePixelRatio||1;
 if(!w||!h)return;
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 // Reset drawing state as well as pixels so seeking never inherits a prior frame.
 if(ctx.reset)ctx.reset();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const since=started&&timeline?Math.max(0,time-timeline.chapters[stage].start):time;
 const live=started&&mode==='live';
 draw(ctx,w,h,spec,{t:time,since,stage,mass:shown,distance,labels:spec.show_labels,live,playing:mode==='playing'});
 voice();
 const value=target();
 // An engine may leave its readout empty for a moment, hiding the pill (the rope during its single shake).
 const m=engineOf(spec).measure;
 if(m){const v=m[1](value,distance);$('bend-value').textContent=v;$('bend-value').closest('.stage-note').hidden=v==='';if(typeof m[0]==='function')$('measure-label').textContent=m[0]();}
 captions();transport();
}
// A sentence ends at . ! or ? followed by a space or the end, so decimals such as 4.8 stay whole.
function sentences(body){return body.match(/(?:[^.!?]|[.!?](?=[^\s.!?"”’)]))+[.!?]*["”’)]*(?:\s+|$)/g)?.map(s=>s.trim()).filter(Boolean)||[body];}
function captions(){
 let chapter, line, reveal=1, hint='';
 if(!started&&spec.opening){chapter=`Before you watch · ${fmt(timeline.total)}`;line=spec.opening;hint='Press play to find out.';}
 else if(!started){chapter=`${spec.beats.length} chapters · ${fmt(timeline.total)}`;line='Press play to watch the explanation.';}
 else if(ended&&mode!=='playing'){const c=spec.controls||'both', e=engineOf(spec);chapter='The idea';line=spec.takeaway||'';
  hint=spec.next||(c==='none'?'':c==='both'||e.tryAny?'Now try it: '+e.try:`Now try it: move ${(c==='first'?e.a:e.b)[0]} and watch “${e.measure[0]}”.`);}
 else{
  const beat=spec.beats[stage];chapter='';line=beat.body;
  {
   // Show the latest sentence that has started; it stays up through the pause that follows.
   const lines=timeline.chapters[stage].lines;line=(lines.filter(l=>l.start<=time).at(-1)||lines[0]).text;
  }
 }
 $('beat-title').textContent=chapter;
 $('try-hint').textContent=hint;
 const body=$('beat-body'), key=stage+'|'+chapter+'|'+line;
 if(key!==captionKey){captionKey=key;body.textContent=line;body.classList.remove('enter');if(mode==='playing'){void body.offsetWidth;body.classList.add('enter');}}
}
function transport(){
 const progress=started?clamp(time/timeline.total):0, scrub=$('scrub');
 scrub.style.setProperty('--p',progress);scrub.setAttribute('aria-valuenow',String(Math.round(progress*100)));
 document.querySelectorAll('#ticks [data-beat]').forEach((tick,i)=>tick.classList.toggle('passed',started&&time>=timeline.chapters[i].start));
 $('clock-time').textContent=`${fmt(started?Math.min(time,timeline.total):0)} / ${fmt(timeline.total)}`;
 const play=$('play'), playing=mode==='playing';
 play.classList.toggle('is-playing',playing);play.setAttribute('aria-label',playing?'Pause':ended?'Replay':'Play');
 $('poster').hidden=started;
 document.querySelector('.workspace')?.classList.toggle('is-playing',playing);
 document.querySelector('.workspace')?.classList.toggle('started',started);
 document.querySelector('.workspace')?.classList.toggle('ended',ended&&!playing);
 document.body.classList.toggle('idea-shown',ended&&!playing);
 // The sliders show once playback has ended, or when the viewer opens them; never while it plays.
 const exploring=!playing&&(exploreOpen??ended);
 document.querySelector('.workspace')?.classList.toggle('exploring',exploring);
 $('explore').setAttribute('aria-pressed',String(exploring));
}
// null: sliders follow playback (shown at the end); true or false: the viewer opened or closed them.
let exploreOpen=null;
function syncControls(){
 const control=$('mass');control.disabled=stage===0;control.value=stage===0?0:mass;
 $('distance').value=distance;
 const shownA=stage===0?0:mass;
 $('mass-value').textContent=engineOf(spec).fa(shownA);$('mass-value').dataset.value=String(shownA);
 $('distance-value').textContent=engineOf(spec).fb(distance);
}
function setStage(n){stage=n;syncControls();}
function configure(){
 soundButton();
 const e=engineOf(spec), controls=spec.controls||'both';
 const ws=document.querySelector('.workspace');
 ws?.setAttribute('data-controls',controls);
 $('mass').closest('.control').hidden=!['both','first'].includes(controls);
 $('distance').closest('.control').hidden=!['both','second'].includes(controls);
 document.documentElement.style.setProperty('--accent',CouncilDraw.accent(spec));
 document.querySelector('.workspace')?.setAttribute('data-kind',spec.kind||'light-bending');
 $('mass-label').textContent=e.a[0];$('mass-hint').textContent=e.a[1];
 $('distance-label').textContent=e.b[0];$('distance-hint').textContent=e.b[1];
 // Engines without a readout hide the readout pill.
 $('measure-label').closest('.stage-note').hidden=!e.measure;$('measure-label').textContent=typeof e.measure?.[0]==='function'?e.measure[0]():e.measure?.[0]||'';$('scale-label').textContent=e.scale;
 canvas.setAttribute('aria-label',e.aria);
}
function load(scene){
 exploreOpen=null;SOUND.queue.length=0;
 // Before playback the stage shows the opening frame of chapter 1.
 spec=scene;buildTimeline();
 $('ticks').replaceChildren(...timeline.chapters.slice(1).map((c,i)=>{const tick=document.createElement('button');tick.type='button';tick.dataset.beat=String(i+1);tick.style.left=`calc(12px + (100% - 24px) * ${c.start/timeline.total})`;tick.title=`Chapter ${i+2}: ${spec.beats[i+1].title}`;tick.setAttribute('aria-label',tick.title);tick.onclick=e=>{e.stopPropagation();chapter(i+1);};return tick;}));mass=scene.mass;distance=scene.distance;time=0;mode='live';started=false;ended=false;captionKey='';
 configure();setStage(0);shown=target();paint();
}
function restore(){mass=spec.mass;distance=spec.distance;demoed=false;}
function play(){
 if(!spec)return;
 if(!started||ended||time>=timeline.total){time=0;restore();setStage(0);shown=0;}
 audioStart();started=true;ended=false;mode='playing';exploreOpen=null;last=0;emit('play');paint();
}
function pause(){if(mode==='playing'){mode='paused';paint();}}
function toggle(){mode==='playing'?pause():play();}
// Seeking shows exactly what playback shows at that moment, including the last chapter's control demo.
let demoed=false;
function seek(t,beat=2){
 mode='paused';started=true;ended=false;time=t;
 const last=timeline.chapters.length-1, c=timeline.chapters[last];
 if(beat===last&&engineOf(spec).demo!==false)demo(clamp((t-c.start)/(c.end-c.start)));else if(demoed)restore();
 setStage(beat);shown=target();paint();
}
function chapter(n){
 if(!spec)return;n=clamp(n,0,spec.beats.length-1);
 const wasPlaying=mode==='playing';
 restore();started=true;ended=false;time=timeline.chapters[n].start+.001;setStage(n);shown=target();
 mode=wasPlaying?'playing':'paused';last=0;paint();
}
function demo(p){
 // The last chapter moves the controls themselves so the viewer sees what each one does.
 demoed=true;
 // An engine may script its own demo, returning both control values for progress p.
 const own=engineOf(spec).demo;if(typeof own==='function'){({mass,distance}=own(p,spec));syncControls();return;}
 // Otherwise: in the first half the first control dips and returns; in the second half the second control
 // moves to its end value. Both move whichever sliders the viewer is given, because narrations describe both.
 const end=engineOf(spec).demoEnd(spec);
 mass=p<.5?spec.mass*(1-.55*Math.sin(Math.PI*p/.5)):spec.mass;
 distance=spec.distance+(end-spec.distance)*smooth((p-.5)/.42);
 syncControls();
}
function tick(stamp){
 const dt=last?Math.min((stamp-last)/1000,.1):0;last=stamp;
 // Nothing moves until the viewer presses play or touches a control.
 if(spec&&started&&mode!=='paused'){
  time+=dt;
  if(mode==='playing'){
   const next=chapterAt(time), last=timeline.chapters.length-1, c=timeline.chapters[last];
   if(next!==stage)setStage(next);
   if(stage===last&&engineOf(spec).demo!==false)demo(clamp((time-c.start)/(c.end-c.start)));
   if(time>=timeline.total){time=timeline.total;mode='live';ended=true;emit('ended');}
  }
  shown+=(target()-shown)*(1-Math.exp(-dt*(mode==='playing'?1.6:7)));
  paint();
 }
 requestAnimationFrame(tick);
}
// Taking control jumps to the last chapter; its scene clock starts there so trips and arrivals play out.
function explore(){if(!started){started=true;ended=true;}mode='live';const last=timeline.chapters.length-1;if(time<timeline.chapters[last].start)time=timeline.chapters[last].start;setStage(last);}
function input(id,value){
 // Touching a control before playing means exploring; during playback it hands control to the viewer.
 if(id==='mass')mass=value;else distance=value;
 audioStart();
 explore();paint();
}

window.CouncilScene={load,seek,play,pause,toggle,chapter,render:t=>{time=t;paint();},
 getState:()=>({time,mass,distance,stage,mode,ended}),
 sound:()=>({on:SOUND.on,state:SOUND.ctx?.state||null,plucked:GUITAR.plucked.slice(),rope:{rate:ROPE.rate,size:+ROPE.size.toFixed(2)}}),
 timeline:()=>timeline&&JSON.parse(JSON.stringify(timeline)),on:fn=>listeners.add(fn),
 checks:()=>Physics.checksFor(spec?.kind)};
// The size of the modelled effect at the current controls, for render checks: the readout's number unless the engine
// measures it itself (attention's readout is a share, which is not zero when focus is off).
window.CouncilScene.effect=()=>{const e=engineOf(spec);return e.effect?e.effect(target(),distance):parseFloat($('bend-value').textContent);};
$('play').onclick=toggle;$('poster').onclick=play;
$('reset').onclick=()=>{started=false;play();};
$('sound').onclick=()=>{SOUND.on=!SOUND.on;try{localStorage.setItem('council-sound',SOUND.on?'on':'off');}catch{}audioStart();soundButton();paint();};
function soundButton(){const b=$('sound');b.hidden=!engineOf(spec)?.plucks;b.setAttribute('aria-pressed',String(SOUND.on));b.setAttribute('aria-label',SOUND.on?'Mute the sound':'Turn the sound on');}
$('explore').onclick=()=>{exploreOpen=!document.querySelector('.workspace').classList.contains('exploring');pause();paint();};
// Scrubbing: click or drag anywhere on the bar; playback continues if it was playing.
function scrubTo(clientX){
 const box=$('scrub').getBoundingClientRect(), t=clamp((clientX-box.left-12)/(box.width-24))*timeline.total, n=chapterAt(t);
 started=true;ended=false;restore();time=t;setStage(n);shown=target();if(mode!=='playing')mode='paused';last=0;paint();
}
$('scrub').addEventListener('pointerdown',e=>{if(!spec||e.target.closest('[data-beat]'))return;$('scrub').setPointerCapture(e.pointerId);scrubTo(e.clientX);});
$('scrub').addEventListener('pointermove',e=>{if(e.buttons&&$('scrub').hasPointerCapture(e.pointerId))scrubTo(e.clientX);});
$('scrub').addEventListener('keydown',e=>{if(!spec)return;const step=e.key==='ArrowRight'?5:e.key==='ArrowLeft'?-5:0;if(!step)return;e.preventDefault();const box=$('scrub').getBoundingClientRect();scrubTo(box.left+clamp((time+step)/timeline.total)*box.width);});
for(const id of ['mass','distance'])$(id).addEventListener('input',e=>input(id,Number(e.target.value)));
document.addEventListener('keydown',e=>{
 if(e.target.closest('input,textarea,select,button,a,summary')||e.metaKey||e.ctrlKey||e.altKey)return;
 if(e.key===' '){e.preventDefault();toggle();}
 else if(e.key==='ArrowRight'&&started){chapter(stage+1);}
 else if(e.key==='ArrowLeft'&&started){chapter(stage-1);}
});
// Engines with a handle let the viewer drag the scene itself; it moves the same values as the sliders.
let dragging=false;
const at=e=>{const b=canvas.getBoundingClientRect();return [e.clientX-b.left,e.clientY-b.top,b.width,b.height];};
const dragState=()=>({stage,mass:shown,distance,since:0,t:time});
canvas.addEventListener('pointerdown',e=>{const d=engineOf(spec)?.drag;if(!d||!started)return;const [x,y,w,h]=at(e);if(d(w,h,spec,dragState(),x,y,true)){dragging=true;canvas.setPointerCapture(e.pointerId);e.preventDefault();}});
canvas.addEventListener('pointermove',e=>{const d=engineOf(spec)?.drag;if(!d)return;const [x,y,w,h]=at(e);
 if(dragging){const v=d(w,h,spec,dragState(),x,y,false),c=spec.controls||'both';ended=true;if(c!=='second')mass=shown=Math.round(v.mass*100)/100;if(c!=='first')distance=Math.round(v.distance*100)/100;explore();paint();}
 else canvas.style.cursor=started&&d(w,h,spec,dragState(),x,y,true)?'grab':'';});
canvas.addEventListener('pointerup',()=>{dragging=false;});
new ResizeObserver(paint).observe(canvas);requestAnimationFrame(tick);
})();
