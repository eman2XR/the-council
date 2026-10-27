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
 const accent=ACCENT[spec.accent]||ACCENT.mint, s=Math.min(w/15,h/9), cx=w*.5, cy=h*.56, map=(x,y)=>[cx+x*s,cy-y*s];
 const m=st.mass, small=w<520;
 // Flat coordinate dots: a reference frame, not a picture of curved spacetime.
 const step=Math.max(18,s*.55);ctx.fillStyle='rgba(20,23,28,.075)';
 for(let x=(w%step)/2;x<w;x+=step)for(let y=(h%step)/2;y<h;y+=step)ctx.fillRect(x-.75,y-.75,1.5,1.5);
 const R=(14+m*14)*clamp(s/40,.6,1.4);
 if(m>.001){
  const r=drawStar(ctx,cx,cy,R,clamp(m/.25));
  if(st.labels)text(ctx,'MASS',cx,cy+r+18,{align:'center',size:10,weight:600,spacing:'1.5px'});
 }else{
  ctx.setLineDash([3,5]);ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.strokeStyle='rgba(20,23,28,.22)';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
  if(st.labels)text(ctx,'no mass',cx,cy+R+18,{align:'center',size:10,weight:600,spacing:'1px'});
 }
 const count=spec.ray_count||1, N=240;
 for(let r=count-1;r>=0;r--){
  const b=st.distance+r*.4, main=r===0, points=[];
  for(let j=0;j<=N;j++){const x=-7.5+15*j/N;points.push(map(x,b+6*Physics.deviation(x,m,b)));}
  if(spec.show_reference){ctx.setLineDash([4,6]);trace(ctx,[map(-7.5,b),map(7.5,b)]);ctx.strokeStyle='rgba(20,23,28,.2)';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);}
  ctx.lineCap='round';ctx.lineJoin='round';
  trace(ctx,points);ctx.strokeStyle=rgba(accent,main?.14:.06);ctx.lineWidth=(main?spec.line_width:1.2)*5;ctx.stroke();
  trace(ctx,points);ctx.strokeStyle=rgba(accent,main?.95:.4);ctx.lineWidth=main?spec.line_width:1.2;ctx.stroke();
  // Pulses are moving markers along the path, not a measurement of coordinate speed.
  for(let k=0;k<3;k++){
   const phase=((st.t/6+k/3+r*.13)%1+1)%1, fade=smooth(phase/.06)*smooth((1-phase)/.06);
   for(let i=14;i>=1;i--){const p=phase-i*.0055;if(p<0)continue;const [x,y]=points[Math.floor(p*N)];
    ctx.beginPath();ctx.arc(x,y,(main?3.2:2)*(1-i/16),0,TAU);ctx.fillStyle=rgba(accent,.4*(1-i/15)*fade);ctx.fill();}
   const [x,y]=points[Math.floor(phase*N)];
   const glow=ctx.createRadialGradient(x,y,0,x,y,main?16:9);glow.addColorStop(0,rgba(accent,.38*fade));glow.addColorStop(1,rgba(accent,0));
   ctx.fillStyle=glow;ctx.fillRect(x-16,y-16,32,32);
   ctx.beginPath();ctx.arc(x,y,main?4:2.6,0,TAU);ctx.fillStyle=rgba(accent,fade);ctx.fill();
   ctx.beginPath();ctx.arc(x,y,main?1.6:1,0,TAU);ctx.fillStyle=`rgba(255,255,255,${fade})`;ctx.fill();
  }
  if(st.labels&&main){
   const end=points[N], ref=map(7.5,b)[1], size=small?10:11, x=Math.min(w-16,end[0]);
   text(ctx,'LIGHT',Math.max(16,map(-7.5,b)[0]),ref+16,{size:10,weight:600,spacing:'1.5px'});
   if(m>.001){text(ctx,'with gravity',x,end[1]+16,{align:'right',size,weight:600,color:accent});
    if(spec.show_reference)text(ctx,'dashed: without the mass',x,map(7.5,st.distance+(count-1)*.4)[1]-16,{align:'right',size});}
   else text(ctx,'straight: no mass to bend it',x,end[1]+16,{align:'right',size,weight:600,color:accent});
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
 for(const [x,I] of pts){ctx.fillStyle=`rgba(255,244,214,${Math.min(1,I*1.05)})`;ctx.fillRect(x-1.5,screen+6,(sx1-sx0)/200+1,band);}
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

function drawRope(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.gold, A=st.mass, n=Physics.harmonic(st.distance), small=w<520;
 const x0=w*.1, x1=w*.9, y=h*.48, amp=Math.min(h*.13,(x1-x0)/(n*3.2)+h*.04), phase=st.t*TAU*.5, N=320;
 const pts=f=>Array.from({length:N+1},(_,i)=>{const u=i/N;return [x0+u*(x1-x0),y-f(u)*amp];});
 trace(ctx,[[x0,y],[x1,y]]);ctx.strokeStyle='rgba(20,23,28,.1)';ctx.lineWidth=1;ctx.stroke();
 if(spec.show_reference){
  trace(ctx,pts(u=>Math.sin(phase-n*Math.PI*u)));ctx.setLineDash([4,5]);ctx.strokeStyle=rgba(accent,.45);ctx.lineWidth=1.2;ctx.stroke();
  if(A>.001){trace(ctx,pts(u=>-A*Math.sin(phase+n*Math.PI*u)));ctx.strokeStyle='rgba(37,99,235,.4)';ctx.stroke();}
  ctx.setLineDash([]);
 }
 const rope=pts(u=>Physics.rope(u,phase,A,n));
 ctx.lineCap='round';ctx.lineJoin='round';
 trace(ctx,rope);ctx.strokeStyle=rgba(accent,.16);ctx.lineWidth=(spec.line_width||2.5)*4;ctx.stroke();
 trace(ctx,rope);ctx.strokeStyle=accent;ctx.lineWidth=spec.line_width||2.5;ctx.stroke();
 // Hand at the left, wall at the right.
 ctx.fillStyle='rgba(20,23,28,.75)';ctx.fillRect(x1+2,y-h*.2,8,h*.4);
 ctx.beginPath();ctx.arc(x0,rope[0][1],6,0,TAU);ctx.fillStyle='#14171c';ctx.fill();
 if(A>.5){for(let m=1;m<n;m++){const x=x0+m/n*(x1-x0);ctx.beginPath();ctx.arc(x,y,4,0,TAU);ctx.fillStyle=`rgba(234,88,12,${(A-.5)*1.6})`;ctx.fill();}}
 if(st.labels){
  const size=small?10:11;
  const base=y+h*.22;
  text(ctx,'HAND',x0,base,{align:'center',size,weight:600,spacing:'1.5px'});
  text(ctx,'WALL',x1+6,base,{align:'center',size,weight:600,spacing:'1.5px'});
  if(A>.5)text(ctx,`${n} half-wave${n>1?'s':''} fit`,(x0+x1)/2,base,{align:'center',size:small?11:12,weight:600,color:accent});
  if(A>.5&&n>1)pill(ctx,'still points',x0+(x1-x0)/n,y+18,{align:'center',size:10,weight:600,color:'rgba(194,65,12,1)'});
  text(ctx,A>.001?(spec.show_reference?'dashed: the wave going right and its reflection coming back':''):'the wave travels right; nothing comes back',(x0+x1)/2,h*.93,{align:'center',size:10});
 }
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
  text(ctx,'WHICH MOMENTA ARE MIXED IN',K(kmin),by-bh-12,{size,weight:600,spacing:'1px'});
  text(ctx,P.comps.length===1?'one pure wave: exact momentum, spread everywhere':`${P.comps.length} waves blended: narrower in place, wider in momentum`,w/2,by+16,{align:'center',size:small?9:10});
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
 if(u>=1)pill(ctx,F.g>1e-4?'The path that keeps the most time is the arc a real ball follows':'No gravity: staying put keeps the most time, as for the twins',small?w/2:(px+pr)/2,small?h*.965:ny+lh*1.4,{align:'center',size:small?10:12,weight:600});
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
 for(let i=0;i<=200;i++){const x=w*.04+w*.92*i/200, dx=x-cx, s=dx/Math.hypot(dx,screen-yb), I=open?Physics.singleSlit(st.mass,st.distance,s):1;
  ctx.fillStyle=`rgba(255,244,214,${Math.min(1,I)})`;ctx.fillRect(x-1.5,screen+6,w*.92/200+1,band);}
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
  text(ctx,open&&G.sinMin>=1?'SCREEN · gap narrower than the wave: it spreads to every side':'SCREEN · dashed lines: first dark directions',w*.04,screen+band+22,{size:10,weight:600,spacing:'.5px'});
 }
}

function clockDial(ctx,cx,cy,r,angle,accent){
 ctx.save();ctx.shadowColor='rgba(20,30,50,.14)';ctx.shadowBlur=18;ctx.shadowOffsetY=6;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.fillStyle='#fff';ctx.fill();ctx.restore();
 ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.strokeStyle='rgba(20,23,28,.14)';ctx.lineWidth=1;ctx.stroke();
 for(let i=0;i<12;i++){const a=i*TAU/12;trace(ctx,[[cx+Math.sin(a)*r*.78,cy-Math.cos(a)*r*.78],[cx+Math.sin(a)*r*.9,cy-Math.cos(a)*r*.9]]);ctx.strokeStyle='rgba(20,23,28,.45)';ctx.lineWidth=1.3;ctx.stroke();}
 ctx.lineCap='round';trace(ctx,[[cx,cy],[cx+Math.sin(angle)*r*.72,cy-Math.cos(angle)*r*.72]]);ctx.strokeStyle=accent;ctx.lineWidth=Math.max(2,r*.07);ctx.stroke();
 ctx.beginPath();ctx.arc(cx,cy,Math.max(2.5,r*.08),0,TAU);ctx.fillStyle=accent;ctx.fill();
}
function drawEarth(ctx,x,y,r){
 const air=ctx.createRadialGradient(x,y,r*.9,x,y,r*1.5);air.addColorStop(0,'rgba(120,180,255,.35)');air.addColorStop(1,'rgba(120,180,255,0)');ctx.fillStyle=air;ctx.beginPath();ctx.arc(x,y,r*1.5,0,TAU);ctx.fill();
 const sea=ctx.createRadialGradient(x-r*.35,y-r*.35,r*.1,x,y,r);sea.addColorStop(0,'#7fc4ff');sea.addColorStop(.6,'#2f78d6');sea.addColorStop(1,'#163f86');
 ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=sea;ctx.fill();
 ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.clip();
 for(let i=0;i<7;i++){ctx.beginPath();ctx.ellipse(x+(hash(i*3.3)-.5)*r*1.6,y+(hash(i*5.1)-.5)*r*1.6,r*(.18+.22*hash(i)),r*(.1+.14*hash(i*2)),hash(i*9)*3,0,TAU);ctx.fillStyle='rgba(92,170,96,.85)';ctx.fill();}
 const night=ctx.createLinearGradient(x-r,0,x+r,0);night.addColorStop(.55,'rgba(10,20,40,0)');night.addColorStop(1,'rgba(10,20,40,.35)');ctx.fillStyle=night;ctx.fillRect(x-r,y-r,2*r,2*r);ctx.restore();
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
 const small=w<520, v=Physics.speed(st.mass), T=Physics.turnaround(st.distance), H=2*T, Hmax=2*Physics.turnaround(2.5);
 const top=small?104:64, bottom=h*(small?.58:.74), k=Math.min((bottom-top)/Hmax,(w*(small?.62:.32))/(.9*Hmax/2+.6));
 const x0=w*(small?.2:.14), map=(x,t)=>[x0+x*k,bottom-t*k];
 return {small,v,T,H,k,x0,top,bottom,map,kink:map(v*T,T)};
}
function drawPaths(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.blue, L=pathsLayout(w,h,st), {small,v,T,H,map,x0,bottom}=L, g=Physics.gamma(v);
 // The trip plays once per chapter, in step with Earth time, then waits at the reunion.
 const tc=Math.min(H,(st.since??st.t)*.5*Math.max(1,H/5)), xAt=t=>t<=T?v*t:v*(H-t), own=Math.min(tc,H)/g;
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
 text(ctx,'space →',x0+(small?70:120),bottom+14,{size:10});
 text(ctx,'goodbye',x0,bottom+14,{align:'center',size,weight:600,color:'rgba(20,23,28,.75)'});
 text(ctx,'reunion',x0,map(0,H)[1]-14,{align:'center',size,weight:600,color:'rgba(20,23,28,.75)'});
 const [lx,ly]=map(Math.min(reach,H)*.82,Math.min(reach,H)*.82);if(!small)text(ctx,'light: zero time',lx+8,ly+4,{size:10,color:'rgba(180,83,9,.9)'});
 if(v>.001)pill(ctx,'turnaround',L.kink[0]+16,L.kink[1],{size:10,weight:600,color:accent});
 text(ctx,'EARTH',x0,sy+r+12,{align:'center',size:9,weight:600,spacing:'1.5px'});
 const sx=map(v*T,0)[0], close=sx-x0<(small?90:150);
 if(v>.001)text(ctx,small?`STAR · ${T2(v*T)} ly`:`STAR · ${T2(v*T)} light-years`,close?sx+r+8:sx,close?sy:sy+r+12,{align:close?'left':'center',size:9,weight:600,spacing:'1px'});
 pill(ctx,`${T2(tc)} yr`,hx-14,hy,{align:'right',size,weight:600,color:'rgba(20,23,28,.85)'});
 if(v>.001&&tc>0)pill(ctx,`${T2(own)} yr`,tx+14,ty,{size,weight:600,color:accent});
 // The rule: a clock measures the length of its path, with a minus sign for distance.
 const row=(s,y,opts)=>text(ctx,s,px,y,{size:small?11:14,...opts});
 const px=small?w*.06:w*.52, py=small?h*.76:h*.2, lh=small?19:27, dark='rgba(20,23,28,.85)';
 text(ctx,'Each clock measures the length of its path',px,py,{size:small?12:17,weight:700,color:'#14171c'});
 row('clock time = √( time² − distance² )',py+lh*(small?1:1.25),{weight:600,color:'rgba(180,83,9,.95)'});
 if(small){
  row(`Home: √(${T2(H)}² − 0²) = ${T2(H)} yr`,py+lh*2.1,{weight:600,color:dark});
  row(v>.001?`Traveller: 2 × √(${T2(T)}² − ${T2(v*T)}²) = ${T2(2*leg)} yr`:'Traveller: stays home, same path',py+lh*3.1,{weight:600,color:accent});
 }else{
  const rows=[['Home, straight up',`√(${T2(H)}² − 0²)`,`${T2(H)} yr`,dark]];
  if(v>.001)rows.push(['Traveller, out',`√(${T2(T)}² − ${T2(v*T)}²)`,`${T2(leg)} yr`,accent],['Traveller, back',`√(${T2(T)}² − ${T2(v*T)}²)`,`${T2(leg)} yr`,accent]);
  else rows.push(['Traveller','stays home: same path',`${T2(H)} yr`,accent]);
  rows.forEach(([a,b,c,col],i)=>{const y=py+lh*(2.6+i);text(ctx,a,px,y,{size:13,color:'rgba(20,23,28,.6)'});text(ctx,b,px+w*.15,y,{size:14,weight:500,color:col});text(ctx,c,w*.93,y,{align:'right',size:14,weight:700,color:col});});
  const yt=py+lh*(2.6+rows.length)+6;trace(ctx,[[px,yt-lh*.5],[w*.93,yt-lh*.5]]);ctx.strokeStyle='rgba(20,23,28,.12)';ctx.lineWidth=1;ctx.stroke();
  text(ctx,'Traveller in total',px,yt+4,{size:13,weight:600,color:'rgba(20,23,28,.7)'});text(ctx,`${T2(v>.001?2*leg:H)} yr`,w*.93,yt+4,{align:'right',size:15,weight:700,color:accent});
  text(ctx,v>.001?'On paper the traveller’s path looks longer. The minus sign makes it shorter:':'With no trip, both twins share one straight path.',px,yt+lh*1.5,{size:12,color:'rgba(20,23,28,.6)'});
  if(v>.001)text(ctx,'in spacetime, the straight path between two moments holds the most time.',px,yt+lh*1.5+18,{size:12,color:'rgba(20,23,28,.6)'});
 }
 if(tc>=H-1e-6&&v>.001)pill(ctx,`Together again: the traveller is ${T2(H-H/g)} years younger`,small?w/2:w*.52+(w*.41)/2,small?h*.95:h*.84,{align:'center',size:small?11:13,weight:600});
}
function dragPaths(w,h,spec,st,x,y,grab){
 const L=pathsLayout(w,h,st);
 if(grab)return st.stage>0&&Math.hypot(x-L.kink[0],y-L.kink[1])<22;
 const t=Math.max(.1,(L.bottom-y)/L.k), xs=Math.max(0,(x-L.x0)/L.k);
 return {mass:Math.min(1,xs/t/.9),distance:Math.min(2.5,Math.max(1,t/1.6))};
}

// Bending the map of height and time so that the path of most time becomes a straight line.
function fanPoint(F,t,hh,s){
 const flat=[t-F.T/2,hh];if(!(F.g>1e-6)||s<=0)return flat;
 const th=F.g*(t-F.T/2), R=F.R0-hh, bent=[R*Math.sin(th),F.R0-R*Math.cos(th)];
 return [flat[0]+(bent[0]-flat[0])*s,flat[1]+(bent[1]-flat[1])*s];
}
function fanPaths(F){
 // Held at the ground, the ball's real path, and a too-low and too-high throw between the same two events.
 const shape=F.g>1e-6?F.ball:(t=>.3*4*t*(F.T-t)/(F.T*F.T)/(1/1)), top=Math.max(.3,shape(F.T/2));
 return {top,list:[['held',t=>0],['low',t=>.45*shape(t)],['ball',shape],['high',t=>1.7*shape(t)]]};
}
function fanStage(st){
 // Chapter 1: flat, no gravity. Chapter 2: the throw, then the map bends. Chapter 3: bent, explore.
 const since=st.since??st.t;
 if(st.stage===0)return {s:0,u:Math.min(1,since*.22)};
 if(st.stage===1)return {s:smooth((since-5.5)/4),u:Math.min(1,since*.22)};
 return {s:1,u:Math.min(1,((since*.2)%1.35))};
}
function drawFan(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.blue, F=Physics.fan(st.mass,st.distance), small=w<520, {s,u}=fanStage(st), P=fanPaths(F);
 const hTop=Math.max(P.top*1.9,.55), Fmax=Physics.fan(1,st.distance);
 // A fixed scale for this trip length, so bending never changes the size of the drawing.
 const box=(()=>{let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const ss of [0,1])for(const t of [0,F.T/2,F.T])for(const hh of [0,hTop]){const [x,y]=fanPoint(Fmax,t,hh,ss);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return {x0,x1,y0,y1};})();
 const area=small?{l:w*.08,r:w*.92,t:96,b:h*.56}:{l:w*.05,r:w*.56,t:60,b:h*.82};
 const k=Math.min((area.r-area.l)/(box.x1-box.x0),(area.b-area.t)/(box.y1-box.y0+.15)), cx=(area.l+area.r)/2-(box.x0+box.x1)/2*k, by=area.b-(-box.y0)*k;
 const S=([x,y])=>[cx+x*k,by-y*k], at=(t,hh)=>S(fanPoint(F,t,hh,s));
 // The map itself: lines of equal height and of equal time.
 for(let i=0;i<=6;i++){const hh=hTop*i/6;trace(ctx,Array.from({length:41},(_,j)=>at(F.T*j/40,hh)));ctx.strokeStyle=i===0?'rgba(122,84,52,.7)':'rgba(20,23,28,.09)';ctx.lineWidth=i===0?2:1;ctx.stroke();}
 for(let j=0;j<=8;j++){const t=F.T*j/8;trace(ctx,[at(t,0),at(t,hTop)]);ctx.strokeStyle='rgba(20,23,28,.07)';ctx.lineWidth=1;ctx.stroke();}
 if(F.g>1e-6){const shade=ctx.createLinearGradient(0,at(F.T/2,0)[1],0,at(F.T/2,hTop)[1]);shade.addColorStop(0,`rgba(245,158,66,${.2*Math.min(1,F.g/.3)})`);shade.addColorStop(1,'rgba(245,158,66,0)');
  ctx.beginPath();Array.from({length:41},(_,j)=>at(F.T*j/40,0)).forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));Array.from({length:41},(_,j)=>at(F.T*(40-j)/40,hTop)).forEach(([x,y])=>ctx.lineTo(x,y));ctx.closePath();ctx.fillStyle=shade;ctx.fill();}
 // Paths between the same two events.
 const curve=f=>Array.from({length:81},(_,j)=>{const t=F.T*j/80;return at(t,f(t));});
 for(const [name,f] of P.list){if(name==='held')continue;if(name!=='ball'||F.g<=1e-6){trace(ctx,curve(f));ctx.setLineDash([4,5]);ctx.strokeStyle='rgba(20,23,28,.32)';ctx.lineWidth=1.2;ctx.stroke();ctx.setLineDash([]);}}
 if(F.g>1e-6){const c=curve(F.ball);
  // A ruler laid along the ball's path once the map is bent: it is straight.
  if(s>.85){const [a,b]=[c[0],c.at(-1)],len=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/len,ny=(b[0]-a[0])/len,off=small?9:12;ctx.globalAlpha=(s-.85)/.15;
   ctx.beginPath();ctx.moveTo(a[0]+nx*2,a[1]+ny*2);ctx.lineTo(b[0]+nx*2,b[1]+ny*2);ctx.lineTo(b[0]+nx*off,b[1]+ny*off);ctx.lineTo(a[0]+nx*off,a[1]+ny*off);ctx.closePath();ctx.fillStyle='rgba(234,214,170,.55)';ctx.fill();
   for(let i=1;i<20;i++){const x=a[0]+(b[0]-a[0])*i/20,y=a[1]+(b[1]-a[1])*i/20,l=i%5?4:7;trace(ctx,[[x+nx*2,y+ny*2],[x+nx*(2+l),y+ny*(2+l)]]);ctx.strokeStyle='rgba(122,84,52,.5)';ctx.lineWidth=1;ctx.stroke();}ctx.globalAlpha=1;}
  trace(ctx,c);ctx.strokeStyle=accent;ctx.lineWidth=2.8;ctx.lineCap='round';ctx.stroke();}
 const t=u*F.T, marks=[[at(t,0),'#14171c'],...(F.g>1e-6?[[at(t,F.ball(t)),accent]]:[])];
 for(const [[x,y],c] of marks){ctx.beginPath();ctx.arc(x,y,6,0,TAU);ctx.fillStyle=c;ctx.fill();ctx.beginPath();ctx.arc(x,y,2.2,0,TAU);ctx.fillStyle='#fff';ctx.fill();}
 if(!st.labels)return;
 const size=small?10:11;
 text(ctx,'leave',...at(0,0).map((v,i)=>i?v+16:v),{align:'center',size,weight:600,color:'rgba(20,23,28,.75)'});
 text(ctx,'meet again',...at(F.T,0).map((v,i)=>i?v+16:v),{align:small?'right':'center',size,weight:600,color:'rgba(20,23,28,.75)'});
 if(s<.2){text(ctx,'height ↑',at(0,hTop)[0],at(0,hTop)[1]-12,{size:10});text(ctx,'time →',at(F.T,0)[0],at(F.T,0)[1]+30,{align:'right',size:10});}
 const px=small?w*.06:w*.6, py=small?h*.64:h*.2, lh=small?17:24, wrap=small?52:46;
 const lines=F.g<=1e-6?['A map of height and time.','Without gravity it is flat, and the straight path,','staying put, keeps the most time.']
  :s<.5?['A flat map of height and time.','The thrown ball’s path curves.','The held clock’s path is straight.']
  :['The same map, bent so that straight lines','are the paths that keep the most time.','The ball’s path is now straight: nothing pushes it.','The held clock’s path curves:','the ground pushes it the whole time.'];
 text(ctx,lines[0],px,py,{size:small?12:16,weight:700,color:'#14171c'});
 lines.slice(1).forEach((l,i)=>text(ctx,l,px,py+lh*(i+1.2),{size:small?11:14,color:l.includes('ball')?accent:'rgba(20,23,28,.75)',weight:l.includes('ball')?600:500}));
 if(F.g>1e-6&&!small)text(ctx,'Higher up, clocks run faster. That is what bends the map.',px,py+lh*(lines.length+1),{size:12,color:'rgba(180,83,15,.9)'});
}

// The bent map rolled into a cone of paper: the ball's path is still a straight line on the paper.
function drawCone(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.blue, F=Physics.fan(st.mass,st.distance), small=w<520, since=st.since??st.t;
 if(!(F.g>1e-6))return drawFan(ctx,w,h,spec,st);
 const roll=st.stage===1?smooth((since-7)/5):st.stage===0?0:1, P=fanPaths(F), hTop=Math.max(P.top*1.9,.55), Phi=F.g*F.T;
 const alpha=TAU+(Phi*1.3-TAU)*roll, sinB=Math.min(1,alpha/TAU), cosB=Math.sqrt(1-sinB*sinB), yaw=Math.sin(st.t*.35)*.5*roll, tilt=1.05*roll;
 // Roll the sector into a cone about its centre: flat when the cone's half-angle is 90 degrees.
 const P3=(t,hh)=>{const th=F.g*(t-F.T/2), R=F.R0-hh, psi=th*TAU/alpha;return [R*sinB*Math.sin(psi),F.R0-R*sinB*Math.cos(psi),R*cosB];};
 const mid=P3(F.T/2,hTop/2);
 const view=([X,Y,Z])=>{X-=mid[0];Y-=mid[1];Z-=mid[2];const c=Math.cos(yaw),s=Math.sin(yaw);[X,Z]=[X*c+Z*s,-X*s+Z*c];const ct=Math.cos(tilt),stt=Math.sin(tilt);[Y,Z]=[Y*ct-Z*stt,Y*stt+Z*ct];return [X,Y,Z];};
 const area=small?{l:w*.08,r:w*.92,t:96,b:h*.56}:{l:w*.05,r:w*.56,t:60,b:h*.82};
  const flatW=2*F.R0*Math.sin(Phi/2)+.2, flatH=hTop+F.R0*(1-Math.cos(Phi/2))+.2, k=Math.min((area.r-area.l)/flatW,(area.b-area.t)/flatH), D=F.R0*4;
 const S=p=>{const [X,Y,Z]=view(p), f=D/(D+Z);return [(area.l+area.r)/2+X*k*f,(area.t+area.b)/2-Y*k*f,Z];};
 // Paper: quads drawn back to front, shaded by how squarely they face the viewer.
 const nt=24,nh=6,quads=[];
 for(let i=0;i<nt;i++)for(let j=0;j<nh;j++){const t0=F.T*i/nt,t1=F.T*(i+1)/nt,h0=hTop*j/nh,h1=hTop*(j+1)/nh;
  const c=[S(P3(t0,h0)),S(P3(t1,h0)),S(P3(t1,h1)),S(P3(t0,h1))];
  const ax=c[1][0]-c[0][0],ay=c[1][1]-c[0][1],bx=c[3][0]-c[0][0],byy=c[3][1]-c[0][1],area2=Math.abs(ax*byy-ay*bx), flatArea=(F.T/nt)*(hTop/nh)*k*k;
  quads.push({c,z:(c[0][2]+c[2][2])/2,light:Math.min(1,area2/flatArea/1.1)});}
 quads.sort((a,b)=>b.z-a.z);
 for(const q of quads){ctx.beginPath();q.c.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();const l=.82+.18*q.light;ctx.fillStyle=`rgb(${Math.round(252*l)},${Math.round(246*l)},${Math.round(234*l)})`;ctx.fill();ctx.strokeStyle='rgba(20,23,28,.06)';ctx.lineWidth=1;ctx.stroke();}
 const curve=f=>Array.from({length:81},(_,j)=>{const t=F.T*j/80;return S(P3(t,f(t)));});
 const drawCurve=(c,style,width,dash)=>{for(let i=1;i<c.length;i++){trace(ctx,[c[i-1],c[i]]);ctx.globalAlpha=c[i][2]>.05?.35:1;ctx.strokeStyle=style;ctx.lineWidth=width;if(dash)ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);}ctx.globalAlpha=1;};
 drawCurve(curve(t=>0),'rgba(122,84,52,.75)',2);
 for(const [name,f] of P.list)if(name==='low'||name==='high')drawCurve(curve(f),'rgba(20,23,28,.32)',1.2,[4,5]);
 drawCurve(curve(F.ball),accent,2.8);
 const u=Math.min(1,(since*.2)%1.35), t=u*F.T;
 for(const [p,c] of [[S(P3(t,0)),'#14171c'],[S(P3(t,F.ball(t))),accent]]){ctx.beginPath();ctx.arc(p[0],p[1],6,0,TAU);ctx.fillStyle=c;ctx.fill();ctx.beginPath();ctx.arc(p[0],p[1],2.2,0,TAU);ctx.fillStyle='#fff';ctx.fill();}
 if(!st.labels)return;
 const px=small?w*.06:w*.6, py=small?h*.64:h*.2, lh=small?17:24;
 const lines=roll<.03?['The bent map, still flat on the table.','The ball’s path is a straight line on it.','Now roll the paper up.']:roll<.97?['Rolling the paper up…','Nothing stretches, so the ball’s line','stays the straightest line on the paper.']
  :['Rolled into a cone, the paper is curved,','but nothing on it has stretched.','The ball’s path is still the straightest line','you could draw on this paper.','Straightest paths keep the most time: that is falling.'];
 text(ctx,lines[0],px,py,{size:small?12:16,weight:700,color:'#14171c'});
 lines.slice(1).forEach((l,i)=>text(ctx,l,px,py+lh*(i+1.2),{size:small?11:14,color:'rgba(20,23,28,.75)'}));
 if(!small)text(ctx,'Uniform gravity needs no real curvature: the paper rolls without stretching.',px,py+lh*(lines.length+1),{size:12,color:'rgba(20,23,28,.55)'});
}

// River model of a black hole: space flows inward; light swims through it at light speed.
function drawRiver(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.gold, R=Physics.river(st.mass,st.distance), small=w<520;
 const cx=small?w/2:w*.33, cy=small?h*.36:h*.5, rmax=3, k=Math.min(small?w*.46:w*.3,small?h*.3:h*.44)/rmax, since=st.since??st.t;
 // The inner region and the horizon, where the inflow reaches light speed.
 const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,rmax*k);bg.addColorStop(0,'rgba(20,23,28,.12)');bg.addColorStop(1,'rgba(20,23,28,0)');ctx.fillStyle=bg;ctx.beginPath();ctx.arc(cx,cy,rmax*k,0,TAU);ctx.fill();
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
 pill(ctx,'flash sent outward',emitter[0]+10,emitter[1]-14,{size:10,weight:600,color:'rgba(20,23,28,.8)'});
 const px=small?w*.06:w*.64, py=small?h*.72:h*.22, lh=small?17:24;
 const lines=R.rs<=1e-4?['No black hole: space is still.','Light swims outward at light speed and escapes.']
  :['Space flows inward, faster closer in.','Light always swims at light speed through it.',
    out>.02?`Here the flow is ${Math.round(R.flow(R.re)*100)}% of light speed: the flash escapes slowly.`:out>-.02?'At the horizon the flow equals light speed: the flash stands still.':`Inside, the flow beats light (${Math.round(R.flow(R.re)*100)}%): the flash is swept in.`];
 text(ctx,lines[0],px,py,{size:small?12:16,weight:700,color:'#14171c'});
 lines.slice(1).forEach((l,i)=>text(ctx,l,px,py+lh*(i+1.2),{size:small?11:14,color:'rgba(20,23,28,.75)'}));
 // Flow speed against distance, with light speed marked.
 if(!small&&R.rs>1e-4){const gx=px,gy=py+lh*5.4,gw=w*.28,gh=h*.22;trace(ctx,[[gx,gy],[gx,gy+gh],[gx+gw,gy+gh]]);ctx.strokeStyle='rgba(20,23,28,.35)';ctx.lineWidth=1;ctx.stroke();
  const X=r=>gx+r/rmax*gw, Y=v=>gy+gh-Math.min(v,1.6)/1.6*gh;
  trace(ctx,Array.from({length:120},(_,i)=>{const r=.12+i/119*(rmax-.12);return [X(r),Y(R.flow(r))];}));ctx.strokeStyle='rgba(37,99,235,.8)';ctx.lineWidth=2;ctx.stroke();
  ctx.setLineDash([4,4]);trace(ctx,[[gx,Y(1)],[gx+gw,Y(1)]]);ctx.strokeStyle='rgba(217,119,6,.8)';ctx.lineWidth=1.2;ctx.stroke();ctx.setLineDash([]);
  text(ctx,'light speed',gx+gw,Y(1)-9,{align:'right',size:10,color:'rgba(180,83,9,.95)'});text(ctx,'inflow speed',gx+6,gy+4,{size:10,color:'rgba(37,99,235,.9)'});text(ctx,'distance from centre →',gx+gw,gy+gh+14,{align:'right',size:10});
  const ex=X(R.re);trace(ctx,[[ex,gy],[ex,gy+gh]]);ctx.strokeStyle=rgba(accent,.6);ctx.stroke();text(ctx,'flash',ex+4,gy+gh-10,{size:10,color:rgba(accent,.95)});
  const hx=X(R.rs);ctx.setLineDash([2,3]);trace(ctx,[[hx,Y(1)],[hx,gy+gh]]);ctx.strokeStyle='rgba(20,23,28,.4)';ctx.stroke();ctx.setLineDash([]);text(ctx,'horizon',hx,gy+gh+14,{align:'center',size:10});}
}

const ENGINES={
 'light-bending':{draw:drawLight,a:['Mass','how much mass sits nearby'],b:['Passing distance','how close the light passes','×'],
  fa:a=>a.toFixed(2),fb:b=>b.toFixed(2)+'×',
  measure:['Bend',(a,b)=>(Physics.deflection(a,b)*180/Math.PI).toFixed(2)+'°'],scale:'',disclosure:'The bending is drawn six times larger than the model value; the readout is the model value for the nearest ray, in the model’s own units. The star is an illustration.',demoEnd:s=>Math.min(2.5,s.distance+1),
  try:'Slide Mass to zero, then back up. Now move the beam farther away. When does it bend most?',aria:'Light passing a massive object, compared with a straight path without the mass.'},
 'gravity-clocks':{draw:drawClocks,a:['Mass','how much mass sits nearby'],b:['Lower radius','gap stays 2 units',' units'],
  fa:a=>a.toFixed(2),fb:b=>b.toFixed(2)+' units',
  measure:['Slowdown',(a,b)=>((1-Physics.clockRatio(a,b))*100).toFixed(2)+'%'],scale:'',disclosure:'The difference between the clock hands is drawn twelve times larger; the slowdown readout is the model value in arbitrary units, not an Earth figure. The planet and distances are illustrations.',demoEnd:()=>2.5,
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
 'standing-waves':{draw:drawRope,a:['Reflection','how much of the wave bounces back'],b:['Pattern','whole half-waves between hand and wall',''],
  fa:a=>Math.round(a*100)+'%',fb:b=>{const n=Physics.harmonic(b);return n+' half-wave'+(n>1?'s':'');},
  measure:['Still points',a=>(Physics.stillness(a)*100).toFixed(0)+'% still'],scale:'',disclosure:'Wave height is exaggerated for visibility.',demoEnd:()=>2.5,
  try:'Turn Reflection to zero: are there still points? Turn it up, then step the Pattern slider.',aria:'A rope shaken at one end and tied to a wall at the other, forming a standing wave.'},
 'tunneling':{draw:drawTunnel,a:['Barrier height','compared with the particle’s energy'],b:['Barrier width','how thick the barrier is',''],
  fa:a=>a<.005?'none':(2*a).toFixed(1)+'× energy',fb:b=>(.6*b/(2*Math.PI)).toFixed(2)+' wavelengths',
  measure:['Bounces back',(a,b)=>(Physics.reflected(a,b)*100).toFixed(0)+'%'],scale:'A steady stream, shown at one instant',disclosure:'Exact steady-state solution in units where ħ = 1 and 2m = 1.',demoEnd:()=>2.5,
  try:'Remove the barrier: does anything bounce back? Raise it above the energy, then make it thicker.',aria:'A quantum wave meets a barrier: part bounces back, part leaks through.'},
 'wave-packet':{draw:drawPacket,a:['Momentum mix','how many wavelengths are blended'],b:['Average momentum','sets the main wavelength',''],
  fa:a=>a<.005?'one wave':(1.1*a).toFixed(2),fb:b=>(2+2*(b-1)).toFixed(1),
  measure:['Momentum spread',a=>(1.1*a).toFixed(2)],scale:'',disclosure:'Time is slowed down; units where ħ = 1 and 2m = 1.',demoEnd:()=>2.5,
  try:'Set the mix to one wave: where is the particle? Blend more wavelengths and watch the packet narrow.',aria:'A wave packet made by blending wavelengths, with a bar chart of the momenta mixed in.'},
 'quantum-well':{draw:drawWell,a:['Well depth','how strongly the particle is held'],b:['Well width','how much room it has',''],
  fa:a=>a<.005?'no well':Math.round(a*100)+'%',fb:b=>(1+(b-1)).toFixed(2)+'×',
  measure:['Allowed energy levels',(a,b)=>String(Physics.levelCount(a,b))],scale:'',disclosure:'Energy levels are to scale. Each level’s wave is drawn vibrating like a plucked string; its probability pattern does not change over time, and wave heights are not to scale.',demoEnd:()=>2.5,
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
 'spacetime-paths':{draw:drawPaths,drag:dragPaths,a:['Speed','how fast the traveller flies'],b:['Trip','time out before turning back',''],
  fa:a=>Math.round(Physics.speed(a)*100)+'% of light',fb:b=>Physics.turnaround(b).toFixed(1)+' years out',
  measure:['Traveller comes home younger by',a=>(Physics.agingGap(a)*100).toFixed(1)+'%'],scale:'',demoEnd:()=>2.5,
  disclosure:'Exact special relativity in years and light-years; the turnaround is instant. Distances on the page are not spacetime lengths: tilted paths look longer than they are.',
  try:'Drag the turnaround sideways: the faster the trip, the shorter the traveller’s path. Drag it straight down to the home path: the twins agree again.',aria:'A spacetime diagram: the home twin’s straight path and the traveller’s bent path between the same goodbye and reunion, with one dot per year of each twin’s own time.'},
 'fall-fan':{draw:drawFan,a:['Gravity','how strong gravity is'],b:['Time in the air','between leaving and meeting again',''],
  fa:a=>a<.005?'none':Math.round(a*100)+'%',fb:b=>Physics.fan(1,b).T.toFixed(1)+' units',
  measure:['Map bent by',(a,b)=>(Physics.fan(a,b).g*Physics.fan(a,b).T*180/Math.PI).toFixed(0)+'°'],scale:'',demoEnd:()=>2.5,
  disclosure:'Gravity is hugely exaggerated. The bent map is drawn so that straight lines are the paths of most time; for weak gravity they match free fall exactly. Real spacetime’s geometry, with its minus sign, cannot be drawn exactly on paper.',
  try:'Turn gravity off: the map goes flat. Turn it up and watch the bend grow.',aria:'A map of height and time bends so that the thrown ball’s path becomes a straight line and the held clock’s path curves.'},
 'fall-cone':{draw:drawCone,a:['Gravity','how strong gravity is'],b:['Time in the air','between leaving and meeting again',''],
  fa:a=>a<.005?'none':Math.round(a*100)+'%',fb:b=>Physics.fan(1,b).T.toFixed(1)+' units',
  measure:['Map bent by',(a,b)=>(Physics.fan(a,b).g*Physics.fan(a,b).T*180/Math.PI).toFixed(0)+'°'],scale:'',demoEnd:()=>2.5,
  disclosure:'Gravity is hugely exaggerated. The paper is the bent map of height and time rolled into a cone; rolling does not stretch it, so straight lines stay straightest. Real spacetime’s minus-sign geometry cannot be built exactly from paper.',
  try:'Change the gravity and watch the cone tighten or open up.',aria:'The bent map of height and time rolled into a paper cone, with the ball’s path drawn as a straight line on the paper.'},
 'river':{draw:drawRiver,a:['Black hole mass','sets the size of the horizon'],b:['Flash position','where the light is sent from',''],
  fa:a=>a<.005?'none':Math.round(a*100)+'%',fb:b=>(Physics.river(1,b).re).toFixed(2)+' horizon sizes',
  measure:['Inflow where the flash starts',(a,b)=>Math.round(Physics.river(a,b).flow(Physics.river(a,b).re)*100)+'% of light'],scale:'Seen from above',demoEnd:()=>1,
  disclosure:'Exact for a non-rotating black hole in the river (Painlevé–Gullstrand) picture; distances in horizon sizes, motion slowed down. The flowing specks show the inflow speed, not real particles.',
  try:'Move the flash inside the horizon: can it get out? Shrink the black hole and try again.',aria:'Space flowing into a black hole like a river, with light flashes swimming outward against the current.'}
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

function paint(){
 if(!spec)return;
 const box=canvas.getBoundingClientRect(), w=box.width, h=box.height, dpr=window.devicePixelRatio||1;
 if(!w||!h)return;
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 // Reset drawing state as well as pixels so seeking never inherits a prior frame.
 if(ctx.reset)ctx.reset();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const since=started&&timeline?Math.max(0,time-timeline.chapters[stage].start):time;
 draw(ctx,w,h,spec,{t:time,since,stage,mass:shown,distance,labels:spec.show_labels});
 const value=target();
 $('bend-value').textContent=engineOf(spec).measure[1](value,distance);
 captions();transport();
}
function sentences(body){return body.match(/[^.!?]+[.!?]*["”’)]*\s*/g)?.map(s=>s.trim()).filter(Boolean)||[body];}
function captions(){
 let chapter, line, reveal=1, hint='';
 if(!started){chapter=`${spec.beats.length} chapters · ${fmt(timeline.total)}`;line=(spec.controls||'both')==='none'?'Press play to watch the explanation.':'Press play, or move the sliders to explore on your own.';}
 else if(ended&&mode!=='playing'){const c=spec.controls||'both', e=engineOf(spec);chapter='The idea';line=spec.takeaway||'';
  hint=c==='none'?'':c==='both'?'Now try it: '+e.try:`Now try it: move ${(c==='first'?e.a:e.b)[0]} and watch “${e.measure[0]}”.`;}
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
}
function syncControls(){
 const control=$('mass');control.disabled=stage===0;control.value=stage===0?0:mass;
 $('distance').value=distance;
 const shownA=stage===0?0:mass;
 $('mass-value').textContent=engineOf(spec).fa(shownA);$('mass-value').dataset.value=String(shownA);
 $('distance-value').textContent=engineOf(spec).fb(distance);
}
function setStage(n){stage=n;syncControls();}
function configure(){
 const e=engineOf(spec), controls=spec.controls||'both';
 const ws=document.querySelector('.workspace');
 ws?.setAttribute('data-controls',controls);
 $('mass').closest('.control').hidden=!['both','first'].includes(controls);
 $('distance').closest('.control').hidden=!['both','second'].includes(controls);
 document.documentElement.style.setProperty('--accent',CouncilDraw.accent(spec));
 document.querySelector('.workspace')?.setAttribute('data-kind',spec.kind||'light-bending');
 $('mass-label').textContent=e.a[0];$('mass-hint').textContent=e.a[1];
 $('distance-label').textContent=e.b[0];$('distance-hint').textContent=e.b[1];
 $('measure-label').textContent=e.measure[0];$('scale-label').textContent=e.scale;
 canvas.setAttribute('aria-label',e.aria);
}
function load(scene){
 // Before playback the stage shows the opening frame of chapter 1.
 spec=scene;buildTimeline();
 $('ticks').replaceChildren(...timeline.chapters.slice(1).map((c,i)=>{const tick=document.createElement('button');tick.type='button';tick.dataset.beat=String(i+1);tick.style.left=`calc(12px + (100% - 24px) * ${c.start/timeline.total})`;tick.title=`Chapter ${i+2}: ${spec.beats[i+1].title}`;tick.setAttribute('aria-label',tick.title);tick.onclick=e=>{e.stopPropagation();chapter(i+1);};return tick;}));mass=scene.mass;distance=scene.distance;time=0;mode='live';started=false;ended=false;captionKey='';
 configure();setStage(0);shown=target();paint();
}
function restore(){mass=spec.mass;distance=spec.distance;}
function play(){
 if(!spec)return;
 if(!started||ended||time>=timeline.total){time=0;restore();setStage(0);shown=0;}
 started=true;ended=false;mode='playing';last=0;emit('play');paint();
}
function pause(){if(mode==='playing'){mode='paused';paint();}}
function toggle(){mode==='playing'?pause():play();}
function seek(t,beat=2){mode='paused';started=true;ended=false;time=t;setStage(beat);shown=target();paint();}
function chapter(n){
 if(!spec)return;n=clamp(n,0,spec.beats.length-1);
 const wasPlaying=mode==='playing';
 restore();started=true;ended=false;time=timeline.chapters[n].start+.001;setStage(n);shown=target();
 mode=wasPlaying?'playing':'paused';last=0;paint();
}
function demo(p){
 // The last chapter moves the controls themselves so the viewer sees what each one does.
 const end=engineOf(spec).demoEnd(spec), c=spec.controls||'both', moveA=c!=='second', moveB=c!=='first';
 mass=moveA&&p<.5?spec.mass*(1-.55*Math.sin(Math.PI*p/.5)):spec.mass;
 distance=moveB?spec.distance+(end-spec.distance)*smooth((moveA?p-.5:p)/(moveA?.42:.9)):spec.distance;
 syncControls();
}
function tick(stamp){
 const dt=last?Math.min((stamp-last)/1000,.1):0;last=stamp;
 // Nothing moves until the viewer presses play or touches a control.
 if(spec&&started&&mode!=='paused'){
  time+=dt;
  if(mode==='playing'){
   const next=chapterAt(time), c=timeline.chapters[2];
   if(next!==stage)setStage(next);
   if(stage===2)demo(clamp((time-c.start)/(c.end-c.start)));
   if(time>=timeline.total){time=timeline.total;mode='live';ended=true;emit('ended');}
  }
  shown+=(target()-shown)*(1-Math.exp(-dt*(mode==='playing'?1.6:7)));
  paint();
 }
 requestAnimationFrame(tick);
}
// Taking control jumps to the last chapter; its scene clock starts there so trips and arrivals play out.
function explore(){if(!started){started=true;ended=true;}mode='live';if(time<timeline.chapters[2].start)time=timeline.chapters[2].start;setStage(2);}
function input(id,value){
 // Touching a control before playing means exploring; during playback it hands control to the viewer.
 if(id==='mass')mass=value;else distance=value;
 explore();paint();
}

window.CouncilScene={load,seek,play,pause,toggle,chapter,render:t=>{time=t;paint();},
 getState:()=>({time,mass,distance,stage,mode,ended}),
 timeline:()=>timeline&&JSON.parse(JSON.stringify(timeline)),on:fn=>listeners.add(fn),
 checks:()=>Physics.checksFor(spec?.kind)};
$('play').onclick=toggle;$('poster').onclick=play;
$('reset').onclick=()=>{started=false;play();};
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
