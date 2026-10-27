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

function drawLight(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.mint, s=Math.min(w/15,h/9), cx=w*.5, cy=h*.56, map=(x,y)=>[cx+x*s,cy-y*s];
 const m=st.mass, small=w<520;
 // Flat coordinate dots: a reference frame, not a picture of curved spacetime.
 const step=Math.max(18,s*.55);ctx.fillStyle='rgba(20,23,28,.075)';
 for(let x=(w%step)/2;x<w;x+=step)for(let y=(h%step)/2;y<h;y+=step)ctx.fillRect(x-.75,y-.75,1.5,1.5);
 const R=(14+m*14)*clamp(s/40,.6,1.4);
 if(m>.001){
  ctx.globalAlpha=clamp(m/.12);
  const halo=ctx.createRadialGradient(cx,cy,R*.6,cx,cy,R*4.2);halo.addColorStop(0,'rgba(245,158,66,.24)');halo.addColorStop(1,'rgba(245,158,66,0)');
  ctx.fillStyle=halo;ctx.fillRect(cx-R*4.2,cy-R*4.2,R*8.4,R*8.4);
  const body=ctx.createRadialGradient(cx-R*.35,cy-R*.4,R*.1,cx,cy,R);body.addColorStop(0,'#ffe4bf');body.addColorStop(.45,'#f59e42');body.addColorStop(1,'#b4530f');
  ctx.save();ctx.shadowColor='rgba(180,83,15,.35)';ctx.shadowBlur=R*.9;ctx.shadowOffsetY=R*.25;
  ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.fillStyle=body;ctx.fill();ctx.restore();
  ctx.globalAlpha=1;
  if(st.labels){text(ctx,'MASS',cx,cy+R+18,{align:'center',size:10,weight:600,spacing:'1.5px'});text(ctx,'size not to scale',cx,cy+R+32,{align:'center',size:10,color:'rgba(20,23,28,.55)'});}
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
   text(ctx,'LIGHT',Math.max(16,map(-7.5,b)[0]),ref-16,{size:10,weight:600,spacing:'1.5px'});
   if(m>.001){text(ctx,'with gravity',x,end[1]+16,{align:'right',size,weight:600,color:accent});
    if(spec.show_reference&&Math.abs(end[1]-ref)>28)text(ctx,'dashed: without the mass',x,ref-14,{align:'right',size});}
   else text(ctx,'straight: no mass to bend it',x,end[1]+16,{align:'right',size,weight:600,color:accent});
  }
 }
}

function drawClocks(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.blue, m=st.mass, presence=clamp(m/.12);
 const ratio=Physics.clockRatio(m,st.distance), rate=1-12*(1-ratio), small=w<520;
 const cx=w*.5, rad=Math.min(w*.13,h*.135), horizon=h*.9;
 let lowerY=h*(.68-.09*(st.distance-1)), upperY=lowerY-Math.max(h*.34,rad*2.5);
 // Keep the top clock and its label clear of the stage notes.
 const clear=(small?92:24)-(upperY-rad-(small?13:0));
 if(clear>0){upperY+=clear;lowerY+=clear;}
 // Warm haze marks "deeper in gravity": schematic, not to scale.
 if(presence>0){
  const haze=ctx.createLinearGradient(0,h,0,h*.4);haze.addColorStop(0,`rgba(245,158,66,${.2*presence})`);haze.addColorStop(1,'rgba(245,158,66,0)');
  ctx.fillStyle=haze;ctx.fillRect(0,h*.4,w,h*.6);
  const PR=Math.max(w*w/(8*(h-horizon)*.7),h), body=ctx.createLinearGradient(0,horizon,0,h);
  body.addColorStop(0,`rgba(245,158,66,${presence})`);body.addColorStop(1,`rgba(180,83,15,${presence})`);
  ctx.beginPath();ctx.arc(cx,horizon+PR,PR,0,TAU);ctx.fillStyle=body;ctx.fill();
  if(st.labels)text(ctx,'MASS · not to scale',cx,horizon+(h-horizon)*.55,{align:'center',size:10,weight:600,spacing:'1.5px',color:`rgba(255,255,255,${.9*presence})`});
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
 const reference=st.t*.65;
 function face(y,speed,name,lower){
  const angle=st.t*.65*speed;
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
 const k=Math.min((h-(small?128:92))/(H+.1),(w*.62)/Math.max(.9,v*T+1.1)), x0=w*.5-v*T*k*.5, y0=h-28, map=(x,t)=>[x0+x*k,y0-t*k];
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
 const cx=w/2, sy=w<520?h*.22:h*.1, screen=h*.8, s1=[cx-d/2,sy], s2=[cx+d/2,sy], phase=st.t*TAU*.55;
 const cell=w<520?3:4, cols=Math.ceil(w/cell), rows=Math.ceil(screen/cell);
 fieldBuffer=fieldBuffer||document.createElement('canvas');
 if(fieldBuffer.width!==cols||fieldBuffer.height!==rows){fieldBuffer.width=cols;fieldBuffer.height=rows;}
 const fctx=fieldBuffer.getContext('2d'), image=fctx.createImageData(cols,rows), data=image.data;
 const n=parseInt(accent.slice(1),16), ar=n>>16, ag=n>>8&255, ab=n&255;
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  const x=i*cell, y=j*cell, r1=Math.hypot(x-s1[0],y-s1[1]), r2=Math.hypot(x-s2[0],y-s2[1]);
  const f=(Math.cos(k*r1-phase)/Math.sqrt(1+r1/lam)+A*Math.cos(k*r2-phase)/Math.sqrt(1+r2/lam))/(1+A);
  const o=4*(j*cols+i), a=Math.min(1,Math.abs(f)*1.15);
  if(f>0){data[o]=ar;data[o+1]=ag;data[o+2]=ab;data[o+3]=a*150;}else{data[o]=20;data[o+1]=30;data[o+2]=50;data[o+3]=a*55;}
 }
 fctx.putImageData(image,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(fieldBuffer,0,0,cols*cell,rows*cell);
 // Time-averaged brightness on the screen: crests meeting crests stay bright.
 const band=h*.08, sx0=w*.04, sx1=w*.96;
 const pts=[];for(let i=0;i<=200;i++){const x=sx0+(sx1-sx0)*i/200, dr=Math.hypot(x-s1[0],screen-s1[1])-Math.hypot(x-s2[0],screen-s2[1]);pts.push([x,Physics.intensity(A,k*dr)]);}
 ctx.fillStyle='#fff';ctx.fillRect(0,screen,w,h-screen);
 for(const [x,I] of pts){ctx.fillStyle=rgba(accent,.08+.85*I);ctx.fillRect(x-1.5,screen+6,(sx1-sx0)/200+1,band);}
 for(const [p,on] of [[s1,1],[s2,A]]){ctx.globalAlpha=on>0.001?.4+.6*Math.min(1,on):.25;ctx.beginPath();ctx.arc(p[0],p[1],6,0,TAU);ctx.fillStyle=on>0.001?accent:'#fff';ctx.fill();ctx.strokeStyle='rgba(20,23,28,.4)';ctx.lineWidth=1;ctx.stroke();ctx.globalAlpha=1;}
 if(st.labels){
  const size=w<520?10:11;
  text(ctx,'SOURCE',s1[0]-12,s1[1],{align:'right',size,weight:600,spacing:'1.5px'});
  text(ctx,A>0.001?'SECOND SOURCE':'second source off',s2[0]+12,s2[1],{size,weight:600,spacing:A>0.001?'1.5px':'0px',color:A>0.001?'rgba(20,23,28,.64)':'rgba(20,23,28,.5)'});
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
 const srcX=w*.08, wallX=w*.42, scrX=w*.8, midY=small?h*.58:h*.5, span=small?h*.32:h*.38, gap=span*.075*sep, slit=Math.max(6,h*.025);
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
  text(ctx,'HAND',x0,y+h*.2,{align:'center',size,weight:600,spacing:'1.5px'});
  text(ctx,'WALL',x1+6,y+h*.25,{align:'center',size,weight:600,spacing:'1.5px'});
  text(ctx,`${n} half-wave${n>1?'s':''} fit`,(x0+x1)/2,y+h*.28,{align:'center',size:small?11:12,weight:600,color:accent});
  if(A>.5&&n>1)text(ctx,'still points',x0+(x1-x0)/n,y-16,{align:'center',size:10,color:'rgba(234,88,12,.9)'});
  if(spec.show_reference)text(ctx,A>.001?'dashed: wave going right, and its reflection going left':'dashed: the wave going right',(x0+x1)/2,small?h*.22:h*.12,{align:'center',size:10});
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
 const xmin=-2.4,xmax=2.4, X=x=>w*.08+(x-xmin)/(xmax-xmin)*w*.84, Emax=4,Emin=-25.5, top=h*(small?.2:.12), bottom=h*.74;
 const Y=E=>top+(Emax-E)/(Emax-Emin)*(bottom-top), half=W.L/2;
 // Potential: flat outside, a floor of depth V inside.
 ctx.fillStyle='rgba(20,23,28,.04)';ctx.fillRect(X(-half),Y(0),X(half)-X(-half),Y(-W.V)-Y(0));
 trace(ctx,[[X(xmin),Y(0)],[X(-half),Y(0)],[X(-half),Y(-W.V)],[X(half),Y(-W.V)],[X(half),Y(0)],[X(xmax),Y(0)]]);
 ctx.strokeStyle='rgba(20,23,28,.55)';ctx.lineWidth=1.6;ctx.stroke();
 const scale=Math.min(h*.045,(bottom-top)/(W.levels.length+2)*.42);
 W.levels.forEach((l,i)=>{
  const y=Y(l.E);ctx.setLineDash([3,4]);trace(ctx,[[X(xmin),y],[X(xmax),y]]);ctx.strokeStyle='rgba(20,23,28,.14)';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
  trace(ctx,[[X(-half),y],[X(half),y]]);ctx.strokeStyle='rgba(20,23,28,.35)';ctx.stroke();
  const pts=Array.from({length:241},(_,j)=>{const x=xmin+(xmax-xmin)*j/240;return [X(x),y-W.psi(l,x)*scale];});
  trace(ctx,pts);ctx.strokeStyle=i===0?accent:rgba(accent,.55);ctx.lineWidth=i===0?2.4:1.6;ctx.stroke();
  if(st.labels)text(ctx,`level ${i+1}`,X(xmax),y-8,{align:'right',size:10,weight:600,color:'rgba(20,23,28,.6)'});
 });
 // A mix of the two lowest levels is not stationary: its probability sloshes back and forth (time scaled).
 const by=h*.93, bh=h*.13;
 if(W.levels.length>=2){
  const [a,b]=W.levels, ph=(b.E-a.E)*st.t*.18;
  const pts=Array.from({length:241},(_,j)=>{const x=xmin+(xmax-xmin)*j/240, p=W.psi(a,x), q=W.psi(b,x);return [X(x),(p*p+q*q+2*p*q*Math.cos(ph))/2];});
  const m=Math.max(...pts.map(p=>p[1]))||1;
  ctx.beginPath();ctx.moveTo(pts[0][0],by);pts.forEach(([x,v])=>ctx.lineTo(x,by-v/m*bh));ctx.lineTo(pts.at(-1)[0],by);ctx.closePath();ctx.fillStyle=rgba(accent,.28);ctx.fill();
  if(st.labels)text(ctx,'a mix of levels 1 and 2 sloshes back and forth',X(xmin),by-bh-10,{size:10,color:'rgba(20,23,28,.6)'});
 }
 if(st.labels){
  const size=small?10:11;
  if(W.V>1e-4)text(ctx,'WELL',X(0),Y(-W.V)+16,{align:'center',size,weight:600,spacing:'1.5px'});
  else text(ctx,'no well: nothing holds the particle, so any energy is possible',w/2,Y(0)+24,{align:'center',size});
  text(ctx,'higher energy ↑',X(xmin),top-6,{size:10});
 }
}

const ENGINES={
 'light-bending':{draw:drawLight,a:['Mass','how much mass sits nearby'],b:['Passing distance','how close the light passes','×'],
  fa:a=>a.toFixed(2),fb:b=>b.toFixed(2)+'×',
  measure:['Unmagnified bend, nearest ray',(a,b)=>(Physics.deflection(a,b)*180/Math.PI).toFixed(2)+'°'],scale:'Bending magnified 6×',demoEnd:s=>Math.min(2.5,s.distance+1),
  try:'Slide Mass to zero, then back up. Now move the beam farther away. When does it bend most?',aria:'Light passing a massive object, compared with a straight path without the mass.'},
 'gravity-clocks':{draw:drawClocks,a:['Mass','how much mass sits nearby'],b:['Lower radius','gap stays 2 units',' units'],
  fa:a=>a.toFixed(2),fb:b=>b.toFixed(2)+' units',
  measure:['Unmagnified slowdown',(a,b)=>((1-Physics.clockRatio(a,b))*100).toFixed(2)+'%'],scale:'Clock motion magnified 12×',demoEnd:()=>2.5,
  try:'Slide Mass to zero. Do the clocks agree? Bring it back, then move the Lower radius outward.',aria:'Two stationary clocks at different heights above a mass. The lower clock counts less time.'},
 'spacetime':{draw:drawSpacetime,a:['Speed','how fast the traveller flies'],b:['Trip','time out before turning back',''],
  fa:a=>Math.round(Physics.speed(a)*100)+'% of light',fb:b=>Physics.turnaround(b).toFixed(1)+' years out',
  measure:['Traveller comes home younger by',a=>(Physics.agingGap(a)*100).toFixed(1)+'%'],scale:'Time runs up · light moves at 45°',demoEnd:()=>2.5,
  try:'Set Speed to zero: do the twins agree? Push it up. Then make the trip longer: does the percentage change?',aria:'A spacetime diagram: a home twin stays put while a traveller goes out and back. The traveller collects fewer ticks.'},
 'interference':{draw:drawInterference,a:['Second source','strength of the second wave'],b:['Source spacing','in wavelengths',''],
  fa:a=>a<.005?'off':Math.round(a*100)+'%',fb:b=>Physics.separation(b).toFixed(1)+' λ',
  measure:['Stripe contrast',a=>(Physics.visibility(a)*100).toFixed(0)+'%'],scale:'Seen from above · waves not to scale',demoEnd:()=>2.5,
  try:'Turn the second source off: what happens to the stripes? Bring it back, then spread the sources apart.',aria:'Two circular wave sources overlapping, making bright and dark stripes on a screen.'},
 'two-slit-particles':{draw:drawParticles,a:['Second slit','how open the second slit is'],b:['Slit spacing','relative distance between the slits',''],
  fa:a=>a<.005?'closed':Math.round(a*100)+'% open',fb:b=>b.toFixed(2)+'×',
  measure:['Stripe contrast',a=>(Physics.visibility(a)*100).toFixed(0)+'%'],scale:'Arrivals are sampled from the predicted pattern',demoEnd:()=>2.5,
  try:'Close the second slit: do the stripes survive? Open it again, then move the slits apart.',aria:'Particles arrive one at a time on a screen behind two slits and slowly build up stripes.'},
 'standing-waves':{draw:drawRope,a:['Reflection','how much of the wave bounces back'],b:['Pattern','whole half-waves between hand and wall',''],
  fa:a=>Math.round(a*100)+'%',fb:b=>{const n=Physics.harmonic(b);return n+' half-wave'+(n>1?'s':'');},
  measure:['Still points',a=>(Physics.stillness(a)*100).toFixed(0)+'% still'],scale:'Wave height exaggerated',demoEnd:()=>2.5,
  try:'Turn Reflection to zero: are there still points? Turn it up, then step the Pattern slider.',aria:'A rope shaken at one end and tied to a wall at the other, forming a standing wave.'},
 'tunneling':{draw:drawTunnel,a:['Barrier height','compared with the particle’s energy'],b:['Barrier width','how thick the barrier is',''],
  fa:a=>a<.005?'none':(2*a).toFixed(1)+'× energy',fb:b=>(.6*b/(2*Math.PI)).toFixed(2)+' wavelengths',
  measure:['Bounces back',(a,b)=>(Physics.reflected(a,b)*100).toFixed(0)+'%'],scale:'A steady stream, shown at one instant',demoEnd:()=>2.5,
  try:'Remove the barrier: does anything bounce back? Raise it above the energy, then make it thicker.',aria:'A quantum wave meets a barrier: part bounces back, part leaks through.'},
 'wave-packet':{draw:drawPacket,a:['Momentum mix','how many wavelengths are blended'],b:['Average momentum','sets the main wavelength',''],
  fa:a=>a<.005?'one wave':(1.1*a).toFixed(2),fb:b=>(2+2*(b-1)).toFixed(1),
  measure:['Momentum spread',a=>(1.1*a).toFixed(2)],scale:'Time slowed down · units where ħ = 1',demoEnd:()=>2.5,
  try:'Set the mix to one wave: where is the particle? Blend more wavelengths and watch the packet narrow.',aria:'A wave packet made by blending wavelengths, with a bar chart of the momenta mixed in.'},
 'quantum-well':{draw:drawWell,a:['Well depth','how strongly the particle is held'],b:['Well width','how much room it has',''],
  fa:a=>a<.005?'no well':Math.round(a*100)+'%',fb:b=>(1+(b-1)).toFixed(2)+'×',
  measure:['Allowed energy levels',(a,b)=>String(Physics.levelCount(a,b))],scale:'Energies to scale · wave heights not',demoEnd:()=>2.5,
  try:'Remove the well: are there any levels? Deepen it, then widen it. When does a new level appear?',aria:'A particle trapped in a well can only have certain energies, drawn as levels with their wave shapes.'},
};
const engineOf=spec=>ENGINES[spec?.kind]||ENGINES['light-bending'];

function draw(ctx,w,h,spec,state){engineOf(spec).draw(ctx,w,h,spec,state);}
window.CouncilDraw={draw,accent:spec=>ACCENT[spec.accent]||ACCENT.mint};

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
 draw(ctx,w,h,spec,{t:time,stage,mass:shown,distance,labels:spec.show_labels});
 const value=target();
 $('bend-value').textContent=engineOf(spec).measure[1](value,distance);
 captions();transport();
}
function sentences(body){return body.match(/[^.!?]+[.!?]*["”’)]*\s*/g)?.map(s=>s.trim()).filter(Boolean)||[body];}
function captions(){
 let chapter, line, reveal=1;
 if(!started){chapter=`${spec.beats.length} short chapters · about ${Math.round(timeline.total/5)*5||Math.round(timeline.total)} seconds`;line='Press play, or move the sliders to explore on your own.';}
 else if(ended&&mode!=='playing'){chapter='Your turn';line=engineOf(spec).try;}
 else{
  const beat=spec.beats[stage];chapter=`${stage+1} of ${spec.beats.length} · ${beat.title}`;line=beat.body;
  if(mode==='playing'){
   // Show the latest sentence that has started; it stays up through the pause that follows.
   const lines=timeline.chapters[stage].lines;line=(lines.filter(l=>l.start<=time).at(-1)||lines[0]).text;
  }
 }
 $('beat-title').textContent=chapter;
 const body=$('beat-body'), key=chapter+'|'+line;
 if(key!==captionKey){captionKey=key;body.textContent=line;body.classList.remove('enter');if(mode==='playing'){void body.offsetWidth;body.classList.add('enter');}}
}
function transport(){
 document.querySelectorAll('[data-beat]').forEach((button,i)=>{
  const c=timeline.chapters[i];
  button.style.setProperty('--fill',started&&c?clamp((time-c.start)/(c.end-c.start)):0);
  button.classList.toggle('active',started&&!ended&&i===stage);
 });
 $('clock-time').textContent=`${fmt(started?Math.min(time,timeline.total):0)} / ${fmt(timeline.total)}`;
 const play=$('play'), playing=mode==='playing';
 play.classList.toggle('is-playing',playing);play.setAttribute('aria-label',playing?'Pause':ended?'Replay':'Play');
 $('poster').hidden=started;
 document.querySelector('.workspace')?.classList.toggle('is-playing',playing);
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
 const e=engineOf(spec);
 document.documentElement.style.setProperty('--accent',CouncilDraw.accent(spec));
 document.querySelector('.workspace')?.setAttribute('data-kind',spec.kind||'light-bending');
 $('mass-label').textContent=e.a[0];$('mass-hint').textContent=e.a[1];
 $('distance-label').textContent=e.b[0];$('distance-hint').textContent=e.b[1];
 $('measure-label').textContent=e.measure[0];$('scale-label').textContent=e.scale;
 canvas.setAttribute('aria-label',e.aria);
}
function load(scene){
 // The poster is a still frame a few seconds in, where the comparison is already visible.
 spec=scene;buildTimeline();$('poster-label').textContent=`Play · ${Math.round(timeline.total)} s`;mass=scene.mass;distance=scene.distance;time=scene.duration*.3;mode='live';started=false;ended=false;captionKey='';
 configure();setStage(2);shown=target();paint();
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
   const next=chapterAt(time), c=timeline.chapters[2];
   if(next!==stage)setStage(next);
   if(stage===2)demo(clamp((time-c.start)/(c.end-c.start)));
   if(time>=timeline.total){time=timeline.total;mode='live';ended=true;emit('ended');}
  }
  shown+=(target()-shown)*(1-Math.exp(-dt*(mode==='playing'?5:9)));
  paint();
 }
 requestAnimationFrame(tick);
}
function input(id,value){
 // Touching a control before playing means exploring; during playback it hands control to the viewer.
 if(!started){started=true;ended=true;}
 mode='live';
 if(id==='mass')mass=value;else distance=value;
 setStage(2);paint();
}

window.CouncilScene={load,seek,play,pause,toggle,chapter,render:t=>{time=t;paint();},
 getState:()=>({time,mass,distance,stage,mode,ended}),
 timeline:()=>timeline&&JSON.parse(JSON.stringify(timeline)),on:fn=>listeners.add(fn),
 checks:()=>Physics.checksFor(spec?.kind)};
$('play').onclick=toggle;$('poster').onclick=play;
$('reset').onclick=()=>{started=false;play();};
document.querySelectorAll('[data-beat]').forEach(b=>b.onclick=()=>chapter(Number(b.dataset.beat)));
for(const id of ['mass','distance'])$(id).addEventListener('input',e=>input(id,Number(e.target.value)));
document.addEventListener('keydown',e=>{
 if(e.target.closest('input,textarea,select,button,a,summary')||e.metaKey||e.ctrlKey||e.altKey)return;
 if(e.key===' '){e.preventDefault();toggle();}
 else if(e.key==='ArrowRight'&&started){chapter(stage+1);}
 else if(e.key==='ArrowLeft'&&started){chapter(stage-1);}
});
new ResizeObserver(paint).observe(canvas);requestAnimationFrame(tick);
})();
