/* Deterministic scene: render(time, parameters). Playback is only a UI clock. */
(function(){
const canvas=document.getElementById('universe'), ctx=canvas.getContext('2d');
let spec=null, time=0, mass=.7, distance=1.25, playing=false, last=0, stage=2;
const colors={mint:'#b7f4d5',gold:'#f0d6a1',blue:'#a5d8ff'};
function line(points,color,width=1,dashed=false){ctx.beginPath(); points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dashed?[5,7]:[]);ctx.stroke();ctx.setLineDash([]);}
function render(t){
 if(!spec)return; time=t;
 const box=canvas.getBoundingClientRect(), w=box.width,h=box.height,dpr=window.devicePixelRatio||1;
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 // Reset drawing state as well as pixels so seeking never inherits a prior frame.
 ctx.reset();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const s=Math.min(w/15,h/9),cx=w*.5,cy=h*.57, effective=stage===0?0:mass, accent=colors[spec.accent];
 if(spec.kind==='gravity-clocks'){renderClocks(t,w,h,effective,accent);return;}
 const map=(x,y)=>[cx+x*s,cy-y*s];
 // The grid is flat and deliberately not a rubber-sheet metaphor.
 ctx.globalAlpha=.26;
 for(let x=-8;x<=8;x+=.5)line([map(x,-5),map(x,5)],'#34505c',.5);
 for(let y=-5;y<=5;y+=.5)line([map(-8,y),map(8,y)],'#34505c',.5);
 ctx.globalAlpha=1;
 for(let i=0;i<75;i++){const px=((i*197+73)%997)/997*w,py=((i*113+47)%673)/673*h;ctx.fillStyle=i%4?'#7d929c':'#c2d3d8';ctx.globalAlpha=.15+(i%5)*.08;ctx.fillRect(px,py,1,1);}ctx.globalAlpha=1;
 if(effective>0){
  const radius=(12+effective*12)*Math.min(1,s/38);
  const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,radius*3.4);glow.addColorStop(0,'#d1ad7433');glow.addColorStop(1,'#d1ad7400');ctx.fillStyle=glow;ctx.fillRect(cx-radius*4,cy-radius*4,radius*8,radius*8);
  const body=ctx.createRadialGradient(cx-radius*.3,cy-radius*.4,1,cx,cy,radius);body.addColorStop(0,'#d9c2a0');body.addColorStop(.5,'#88725b');body.addColorStop(1,'#252c31');ctx.fillStyle=body;ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#bda58666';ctx.stroke();
  if(spec.show_labels){ctx.fillStyle='#c5b69e';ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillText('MASSIVE OBJECT',cx,cy+radius+26);ctx.fillStyle='#6f828d';ctx.fillText('size is schematic',cx,cy+radius+42);}
 }
 const count=spec.ray_count;
 for(let r=0;r<count;r++){
  const b=distance+r*.4;
  if(spec.show_reference)line([map(-7,b),map(7,b)],'#91a4b577',1,true);
  let points=[];for(let j=0;j<=220;j++){const x=-7+14*j/220;points.push(map(x,b+6*Physics.deviation(x,effective,b)));}
  ctx.globalAlpha=r===0?1:.27;ctx.shadowBlur=r===0?10:0;ctx.shadowColor=accent;line(points,accent,r===0?spec.line_width:1);ctx.shadowBlur=0;
  const phase=((t/7+r*.16)%1+1)%1, ix=Math.min(220,Math.floor(phase*220)),p=points[ix];
  ctx.beginPath();ctx.arc(p[0],p[1],r===0?4:2.5,0,Math.PI*2);ctx.fillStyle='#f6fff9';ctx.shadowBlur=18;ctx.shadowColor=accent;ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1;
 }
 if(spec.show_labels){ctx.font='11px system-ui';ctx.textAlign='left';ctx.fillStyle='#92a4ae';ctx.fillText('INCOMING LIGHT',24,28);ctx.textAlign='right';ctx.fillText('DISTANT VIEW',w-24,28);ctx.fillStyle=accent;ctx.fillText('path with gravity',w-24,h-45);if(spec.show_reference){ctx.fillStyle='#91a4b5';ctx.fillText('– –  path without this mass',w-24,h-26);}}
 const meter=document.getElementById('bend-value');if(meter)meter.textContent=(Physics.deflection(effective,distance)*180/Math.PI).toFixed(2)+'°';
}
function renderClocks(t,w,h,effective,accent){
 const ratio=Physics.clockRatio(effective,distance), rate=1-12*(1-ratio);
 const center=w*.5, lowerY=h*(.70-.10*(distance-1)), upperY=lowerY-h*.34, radius=Math.min(w*.15,h*.11);
 const gap=ctx.createLinearGradient(0,0,0,h);gap.addColorStop(0,'#14232d');gap.addColorStop(1,'#63513b');ctx.fillStyle=gap;ctx.globalAlpha=.5;ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;
 line([[w*.16,upperY],[w*.16,lowerY]],'#9baebc',1,true);
 ctx.fillStyle='#aebec6';ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText('Fixed gap',w*.16,(upperY+lowerY)/2-5);ctx.fillText('2 units',w*.16,(upperY+lowerY)/2+10);
 function clock(y,speed,label){
  const phase=t*.65*speed;
  ctx.beginPath();ctx.arc(center,y,radius,0,Math.PI*2);ctx.fillStyle='#101c25';ctx.fill();ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.stroke();
  for(let i=0;i<12;i++){const a=i*Math.PI/6;line([[center+Math.sin(a)*radius*.83,y-Math.cos(a)*radius*.83],[center+Math.sin(a)*radius*.93,y-Math.cos(a)*radius*.93]],'#8a9eaa',1);}
  if(spec.show_reference && speed!==1)line([[center,y],[center+Math.sin(t*.65)*radius*.76,y-Math.cos(t*.65)*radius*.76]],'#aab8c080',2,true);
  line([[center,y],[center+Math.sin(phase)*radius*.76,y-Math.cos(phase)*radius*.76]],accent,3);
  ctx.beginPath();ctx.arc(center,y,4,0,Math.PI*2);ctx.fillStyle=accent;ctx.fill();
  if(spec.show_labels){ctx.textAlign='center';ctx.font='12px system-ui';ctx.fillStyle='#d1e0e8';ctx.fillText(label,center,y-radius-16);}
 }
 clock(upperY,1,'UPPER CLOCK');clock(lowerY,rate,'LOWER CLOCK');
 if(effective>0){ctx.fillStyle='#635743';ctx.beginPath();ctx.ellipse(center,h*1.13,w*.65,h*.25,0,0,Math.PI*2);ctx.fill();}
 ctx.textAlign='center';ctx.fillStyle='#aebec6';ctx.font='11px system-ui';
 ctx.fillText(effective===0?'No mass · matching rates':'Closer to the mass · less elapsed time',center,h-24);
 if(spec.show_reference && effective>0){ctx.font='10px system-ui';ctx.fillText('Dashed hand: upper-clock rate for comparison',center,lowerY+radius+24);}
 document.getElementById('bend-value').textContent=((1-ratio)*100).toFixed(2)+'%';
}
function configureLabels(){
 const clocks=spec.kind==='gravity-clocks';
 document.getElementById('scene-label').textContent=clocks?'01 — COMPARE THE CLOCKS':'01 — FOLLOW THE LIGHT';
 document.getElementById('scale-label').textContent=clocks?'Rate difference magnified 12×':'Bending magnified 6× for visibility';
 document.getElementById('model-label').textContent=clocks?'Stationary clocks · schematic distances':'Weak-field approximation';
 document.getElementById('distance-label').textContent=clocks?'Lower radius (gap: 2 units)':'Passing distance';
 document.getElementById('measure-label').textContent=clocks?'Lower clock runs slower by':'Asymptotic deflection';
 document.getElementById('measure-note').textContent=clocks?'unmagnified relative rate':'unmagnified far-field angle';
 document.getElementById('try-text').textContent=clocks?'Remove the mass. Do the clocks agree? Add it back, then move the pair farther out.':'Turn the mass all the way down. Then bring it back. What changes about the light’s path?';
 canvas.setAttribute('aria-label',clocks?'Two stationary clocks at different distances from a mass. The lower clock accumulates less time.':'Light passing a massive object, compared with a straight reference.');
}
function setStage(n){stage=n;document.getElementById('scene-label').textContent=String(n+1).padStart(2,'0')+(spec.kind==='gravity-clocks'?' — COMPARE THE CLOCKS':' — FOLLOW THE LIGHT');document.querySelectorAll('[data-beat]').forEach((b,i)=>b.classList.toggle('active',i===n));document.getElementById('beat-title').textContent=spec.beats[n].title;document.getElementById('beat-body').textContent=spec.beats[n].body;const control=document.getElementById('mass');control.disabled=n===0;control.value=n===0?0:mass;updateLabels();render(time);}
function load(scene){spec=scene;configureLabels();mass=scene.mass;distance=scene.distance;time=0;stage=2;document.getElementById('mass').value=mass;document.getElementById('distance').value=distance;updateLabels();setStage(2);render(0);}
function updateLabels(){document.getElementById('mass-value').textContent=(stage===0?0:mass).toFixed(2);document.getElementById('distance-value').textContent=distance.toFixed(2)+(spec.kind==='gravity-clocks'?' units':'×');}
function seek(t,beat=2){playing=false;document.getElementById('play').textContent='Play the explanation';setStage(beat);render(t);}
function tick(stamp){if(playing){const dt=last?Math.min((stamp-last)/1000,.1):0;time+=dt;stage=Math.min(2,Math.floor(time/(spec.duration/3)));if(stage===2 && spec.kind==='gravity-clocks'){const p=Math.min(1,Math.max(0,(time-spec.duration*2/3)/(spec.duration/3)));distance=spec.distance+(2.5-spec.distance)*p;document.getElementById('distance').value=distance;}setStage(stage);if(time>=spec.duration){playing=false;document.getElementById('play').textContent='Replay explanation';}render(time);}last=stamp;requestAnimationFrame(tick);}
window.CouncilScene={load,seek,render,getState:()=>({time,mass,distance,stage}),checks:()=>spec?.kind==='gravity-clocks'?Physics.clockChecks():Physics.checks()};
document.getElementById('play').onclick=()=>{playing=!playing;if(playing){time=0;last=0;}document.getElementById('play').textContent=playing?'Pause explanation':'Play the explanation';};
document.querySelectorAll('[data-beat]').forEach(b=>b.onclick=()=>{playing=false;document.getElementById('play').textContent='Play the explanation';setStage(Number(b.dataset.beat));});
for(const id of ['mass','distance'])document.getElementById(id).oninput=e=>{playing=false;document.getElementById('play').textContent='Play the explanation';if(id==='mass')mass=Number(e.target.value);else distance=Number(e.target.value);updateLabels();setStage(2);render(time);};
document.getElementById('reset').onclick=()=>{playing=false;document.getElementById('play').textContent='Play the explanation';load(spec);};
new ResizeObserver(()=>render(time)).observe(canvas);requestAnimationFrame(tick);
})();
