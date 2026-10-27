/* Drawing is a pure function of (scene, time, stage, mass, distance); playback only advances time. */
(function(){
const ACCENT={mint:'#0e9f7a',blue:'#2563eb',gold:'#d97706'};
const TAU=Math.PI*2, FONT='-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif';
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
function rgba(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`;}
function trace(ctx,points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));}
function text(ctx,value,x,y,{align='left',color='rgba(20,23,28,.5)',size=11,weight=500,spacing='0px'}={}){
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
  if(st.labels){text(ctx,'MASS',cx,cy+R+18,{align:'center',size:10,weight:600,spacing:'1.5px'});text(ctx,'size not to scale',cx,cy+R+32,{align:'center',size:10,color:'rgba(20,23,28,.32)'});}
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
   text(ctx,'with gravity',x,end[1]+16,{align:'right',size,weight:600,color:accent});
   if(spec.show_reference&&Math.abs(end[1]-ref)>28)text(ctx,'without the mass',x,ref-14,{align:'right',size});
  }
 }
}

function drawClocks(ctx,w,h,spec,st){
 const accent=ACCENT[spec.accent]||ACCENT.blue, m=st.mass, presence=clamp(m/.12);
 const ratio=Physics.clockRatio(m,st.distance), rate=1-12*(1-ratio), small=w<520;
 const cx=w*.5, rad=Math.min(w*.13,h*.135), horizon=h*.9;
 let lowerY=h*(.68-.09*(st.distance-1)), upperY=lowerY-Math.max(h*.34,rad*2.5);
 // Keep the top clock and its label clear of the stage notes.
 const clear=(small?58:24)-(upperY-rad-(small?13:0));
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

function draw(ctx,w,h,spec,state){(spec.kind==='gravity-clocks'?drawClocks:drawLight)(ctx,w,h,spec,state);}
window.CouncilDraw={draw,accent:spec=>ACCENT[spec.accent]||(spec.kind==='gravity-clocks'?ACCENT.blue:ACCENT.mint)};

const $=id=>document.getElementById(id);
const canvas=$('universe');
if(!canvas)return;
const ctx=canvas.getContext('2d');
let spec=null, time=0, mass=.7, distance=1.25, stage=2, mode='live', last=0, shown=0, started=false, ended=false, captionKey='';
const listeners=new Set(), emit=type=>listeners.forEach(fn=>fn(type));
const clocks=()=>spec?.kind==='gravity-clocks';
const beatLength=()=>spec.duration/3;
const target=()=>stage===0?0:mass;
const fmt=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const TRY={clocks:'Slide Mass to zero. Do the clocks agree? Bring it back, then move the Lower radius outward.',
 light:'Slide Mass to zero, then back up. Now move the beam farther away. When does it bend most?'};

function paint(){
 if(!spec)return;
 const box=canvas.getBoundingClientRect(), w=box.width, h=box.height, dpr=window.devicePixelRatio||1;
 if(!w||!h)return;
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 // Reset drawing state as well as pixels so seeking never inherits a prior frame.
 if(ctx.reset)ctx.reset();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 draw(ctx,w,h,spec,{t:time,stage,mass:shown,distance,labels:spec.show_labels});
 const value=target();
 $('bend-value').textContent=clocks()?((1-Physics.clockRatio(value,distance))*100).toFixed(2)+'%':(Physics.deflection(value,distance)*180/Math.PI).toFixed(2)+'°';
 captions();transport();
}
function sentences(body){return body.match(/[^.!?]+[.!?]*["”’)]*\s*/g)?.map(s=>s.trim()).filter(Boolean)||[body];}
function captions(){
 let chapter, line, reveal=1;
 if(!started){chapter=`${spec.beats.length} short chapters · ${Math.round(spec.duration)} seconds`;line='Press play, or move the sliders to explore on your own.';}
 else if(ended&&mode!=='playing'){chapter='Your turn';line=TRY[clocks()?'clocks':'light'];}
 else{
  const beat=spec.beats[stage];chapter=`${stage+1} of ${spec.beats.length} · ${beat.title}`;line=beat.body;
  if(mode==='playing'){
   const parts=sentences(beat.body), total=parts.reduce((a,p)=>a+p.length,0), L=beatLength(), local=clamp(time-stage*L,0,L);
   let start=0;for(const part of parts){const slot=L*part.length/total;if(local<start+slot||part===parts.at(-1)){line=part;reveal=clamp((local-start)/Math.max(.6,slot*.55));break;}start+=slot;}
  }
 }
 $('beat-title').textContent=chapter;
 const body=$('beat-body'), key=chapter+'|'+line;
 if(key!==captionKey){captionKey=key;body.replaceChildren(...line.split(/\s+/).map(word=>{const span=document.createElement('span');span.textContent=word+' ';span.className=mode==='playing'?'':'on';return span;}));}
 const words=body.children, on=Math.ceil(reveal*words.length);
 for(let i=0;i<words.length;i++)words[i].classList.toggle('on',i<on);
}
function transport(){
 const L=beatLength();
 document.querySelectorAll('[data-beat]').forEach((button,i)=>{
  button.style.setProperty('--fill',started?clamp((time-i*L)/L):0);
  button.classList.toggle('active',started&&!ended&&i===stage);
 });
 $('clock-time').textContent=`${fmt(started?Math.min(time,spec.duration):0)} / ${fmt(spec.duration)}`;
 const play=$('play'), playing=mode==='playing';
 play.classList.toggle('is-playing',playing);play.setAttribute('aria-label',playing?'Pause':ended?'Replay':'Play');
 $('poster').hidden=started;
 document.querySelector('.workspace')?.classList.toggle('is-playing',playing);
}
function syncControls(){
 const control=$('mass');control.disabled=stage===0;control.value=stage===0?0:mass;
 $('distance').value=distance;
 $('mass-value').textContent=(stage===0?0:mass).toFixed(2);
 $('distance-value').textContent=distance.toFixed(2)+(clocks()?' units':'×');
}
function setStage(n){stage=n;syncControls();}
function configure(){
 const c=clocks(), accent=CouncilDraw.accent(spec);
 document.documentElement.style.setProperty('--accent',accent);
 document.querySelector('.workspace')?.setAttribute('data-kind',c?'gravity-clocks':'light-bending');
 $('distance-label').textContent=c?'Lower radius':'Passing distance';
 $('distance-hint').textContent=c?'gap stays 2 units':'how close the light passes';
 $('measure-label').textContent=c?'Real slowdown':'Real bend';
 $('scale-label').textContent=c?'Clock motion magnified 12×':'Bending magnified 6×';
 canvas.setAttribute('aria-label',c?'Two stationary clocks at different heights above a mass. The lower clock counts less time.':'Light passing a massive object, compared with a straight path without the mass.');
}
function load(scene){
 // The poster is a still frame a few seconds in, where the comparison is already visible.
 spec=scene;mass=scene.mass;distance=scene.distance;time=scene.duration*.3;mode='live';started=false;ended=false;captionKey='';
 configure();setStage(2);shown=target();paint();
}
function restore(){mass=spec.mass;distance=spec.distance;}
function play(){
 if(!spec)return;
 if(!started||ended||time>=spec.duration){time=0;restore();setStage(0);shown=0;}
 started=true;ended=false;mode='playing';last=0;emit('play');paint();
}
function pause(){if(mode==='playing'){mode='paused';paint();}}
function toggle(){mode==='playing'?pause():play();}
function seek(t,beat=2){mode='paused';started=true;ended=false;time=t;setStage(beat);shown=target();paint();}
function chapter(n){
 if(!spec)return;n=clamp(n,0,spec.beats.length-1);
 const wasPlaying=mode==='playing';
 restore();started=true;ended=false;time=n*beatLength()+.001;setStage(n);shown=target();
 mode=wasPlaying?'playing':'paused';last=0;paint();
}
function demo(p){
 // The last chapter moves the controls themselves so the viewer sees what each one does.
 const end=clocks()?2.5:Math.min(2.5,spec.distance+1);
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
   const L=beatLength(), next=Math.min(2,Math.floor(time/L));
   if(next!==stage)setStage(next);
   if(stage===2)demo(clamp((time-2*L)/L));
   if(time>=spec.duration){time=spec.duration;mode='live';ended=true;emit('ended');}
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
 getState:()=>({time,mass,distance,stage,mode,ended}),on:fn=>listeners.add(fn),
 checks:()=>clocks()?Physics.clockChecks():Physics.checks()};
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
