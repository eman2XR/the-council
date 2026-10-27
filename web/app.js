const $=id=>document.getElementById(id);
const put=(id,text)=>{const el=$(id);if(el)el.textContent=text??'';};
const el=(tag,props={},...children)=>{const node=Object.assign(document.createElement(tag),props);node.append(...children);return node;};
const TOPICS={'gravity-clocks':'Gravity and time','light-bending':'Gravity and light'};
const STATUS={planning:'Choosing a question',running:'Investigating now',reviewed:'Passed review',needs_review:'Draft, not published',failed:'Attempt stopped',interrupted:'Run interrupted',idle:'Resting'};
const STEPS=['Question','Research','Design','Render','Review','Publish'];
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let current=null, entries=[], busy=false, example=null;
const records=new Map();

function safeURL(url){try{const u=new URL(url);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function topicOf(data){return TOPICS[data?.topic]||(data?.scene?.kind==='gravity-clocks'?TOPICS['gravity-clocks']:TOPICS['light-bending']);}
function day(iso,opts={month:'short',day:'numeric'}){const d=new Date(iso);return isNaN(d)?'':d.toLocaleDateString(undefined,opts);}
function isToday(iso){const d=new Date(iso);return !isNaN(d)&&d.toDateString()===new Date().toDateString();}

const watched=(()=>{try{return new Set(JSON.parse(localStorage.getItem('council-watched')||'[]'));}catch{return new Set();}})();
function markWatched(id){if(!id||watched.has(id))return;watched.add(id);try{localStorage.setItem('council-watched',JSON.stringify([...watched]));}catch{}renderCards();}
CouncilScene.on(type=>{
 if(type==='ended')markWatched(current?.id);
 // Keep the stage and subtitles fully visible while an explanation plays.
 if(type==='play'){const box=document.querySelector('.workspace').getBoundingClientRect();
  if(box.top<0||box.bottom-box.height*.25>innerHeight)scrollBy({top:box.top-Math.max(12,(innerHeight-box.height)/2),behavior:reduceMotion?'auto':'smooth'});}
});

function show(data,{autoplay=false}={}){
 current=data;const scene=data.scene, fixture=data.provider==='fixture';
 if(scene){put('title',scene.title);put('subtitle',scene.subtitle);put('takeaway',scene.takeaway);CouncilScene.load(scene);}
 put('hero-kicker',fixture?'Example':isToday(data.created)?'Today’s investigation':'Investigation');
 put('hero-date',data.created?day(data.created,{weekday:'long',month:'long',day:'numeric'}):'');
 put('run-banner',fixture?'Hand-written example · scripted reviews':data.error?'Stopped · partial work kept as a draft':STATUS[data.status]||String(data.status||'').replaceAll('_',' '));
 $('run-banner').dataset.status=fixture?'example':data.status||'';
 renderBehind(data);renderCards();
 if(autoplay)CouncilScene.play();
}

function renderBehind(data){
 const r=data.research, fixture=data.provider==='fixture', revisions=data.revisions||[], final=revisions.at(-1);
 const chips=[];
 if(final?.physics_review?.score!=null)chips.push(`Physics ${final.physics_review.score}/10`);
 if(final?.visual_review?.score!=null)chips.push(`Visuals ${final.visual_review.score}/10`);
 if(revisions.length)chips.push(`${revisions.length} draft${revisions.length===1?'':'s'}`);
 const checks=data.checks||[];if(checks.length)chips.push(`${checks.filter(c=>c.pass).length}/${checks.length} checks`);
 if(fixture)chips.unshift('Scripted example');
 $('review-summary').replaceChildren(...chips.map(c=>el('span',{textContent:c})));
 if(!r)return;
 put('claim',r.claim);put('falsifier',r.falsifier);put('prediction',r.prediction);
 $('limits').replaceChildren(...[...(r.assumptions||[]),...(r.limitations||[])].map(x=>el('li',{textContent:x})));
 $('checks').replaceChildren(...checks.map(x=>el('li',{textContent:x.name,className:x.pass?'pass':'fail'})));
 put('history-label',fixture?'· scripted demonstration':`· ${revisions.length} saved`);
 $('history').replaceChildren(...revisions.map((rev,i)=>{
  const card=el('article',{className:'revision'});
  if(rev.frames?.length)card.append(el('img',{src:rev.frames[0],alt:`Rendered frame from draft ${i+1}`,loading:'lazy'}));
  const verdict=rev.accepted?(fixture?'Fixture passed':'Passed review'):'Changes requested';
  const notes=[rev.visual_review?.summary,rev.physics_review?.summary].filter(Boolean).join(' ');
  const view=el('button',{type:'button',className:'pill',textContent:'View this draft'});
  view.onclick=()=>{CouncilScene.load(rev.scene);put('title',rev.scene.title);put('subtitle',rev.scene.subtitle);put('takeaway',rev.scene.takeaway);
   put('run-banner',`Draft ${i+1} · ${verdict.toLowerCase()}`);scrollTo({top:0,behavior:reduceMotion?'auto':'smooth'});};
  card.append(el('div',{},el('h4',{textContent:`Draft ${i+1} · ${verdict}`}),el('p',{textContent:notes||'Waiting for review'}),view));
  return card;
 }));
 $('sources').replaceChildren(...(r.sources||[]).map(s=>{const url=safeURL(s.url), item=el('div');
  item.append(url?el('a',{href:url,target:'_blank',rel:'noopener noreferrer',textContent:s.title}):el('span',{textContent:s.title}),el('small',{textContent:s.supports}));return item;}));
 put('record',JSON.stringify(data,null,2));
}

/* Cards with small live previews drawn by the same renderer as the main stage. */
const thumbs=new Set();
const visible=new IntersectionObserver(items=>items.forEach(i=>i.target.classList.toggle('in-view',i.isIntersecting)));
function card(entry,record){
 const isExample=entry.id==='example', id=entry.id;
 const link=el('a',{href:isExample?'?guide=example':'?guide='+encodeURIComponent(id),className:'card'});
 if(!isExample)link.dataset.guide=id;else link.dataset.example='';
 const canvas=el('canvas',{className:'thumb',ariaHidden:'true'});
 const media=el('div',{className:'card-media'},canvas,el('span',{className:'mini-play',ariaHidden:'true'}));
 const meta=el('p',{className:'card-meta',textContent:isExample?'Example · hand-written':`${day(entry.created)} · ${topicOf(entry)}`});
 const badge=el('span',{className:'badge'});
 if(current&&(current.id===id||(isExample&&current.provider==='fixture'))){badge.textContent='Now showing';badge.dataset.kind='now';}
 else if(!isExample&&!watched.has(id)){badge.textContent='New';badge.dataset.kind='new';}
 else if(watched.has(id)){badge.textContent='Watched';badge.dataset.kind='seen';}
 link.append(media,el('div',{className:'card-body'},meta,el('h3',{textContent:entry.title||entry.question}),badge));
 link.onclick=event=>{event.preventDefault();openGuide(id,{autoplay:true,push:true});};
 if(record?.scene){canvas.scene=record.scene;thumbs.add(canvas);visible.observe(canvas);}
 return link;
}
function renderCards(){
 thumbs.forEach(c=>visible.unobserve(c));thumbs.clear();
 const items=entries.map(e=>card(e,records.get(e.id)));
 if(example)items.push(card({id:'example',title:example.scene.title.replace(/\n/g,' ')},example));
 $('archive').replaceChildren(...items);
 put('past-count',entries.length?`${entries.length} published`:'');
 paintThumbs(true);
}
let lastThumb=0;
function paintThumbs(force){
  for(const canvas of thumbs){
   if(!force&&!canvas.classList.contains('in-view'))continue;
   if(!force&&!canvas.closest('.card').matches(':hover'))continue;
   const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(2,devicePixelRatio||1);if(!w||!h)continue;
   if(canvas.width!==Math.round(w*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
   const ctx=canvas.getContext('2d'),s=canvas.scene;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
   // Previews hold a still frame and only animate while hovered.
   canvas.clock=force?s.duration*.3:(canvas.clock??s.duration*.3)+.033;
   CouncilDraw.draw(ctx,w,h,s,{t:canvas.clock,stage:2,mass:s.mass,distance:s.distance,labels:false});
  }
}
function thumbLoop(now){
 if(!reduceMotion&&now-lastThumb>33){lastThumb=now;paintThumbs(false);}
 requestAnimationFrame(thumbLoop);
}
requestAnimationFrame(thumbLoop);
addEventListener('resize',()=>paintThumbs(true));

async function getRecord(id){
 if(id==='example')return example||(example=await (await fetch('example.json')).json());
 if(records.has(id))return records.get(id);
 if(!/^[A-Za-z0-9-]+$/.test(id))throw Error('Invalid guide');
 const response=await fetch('published/'+id+'/record.json');if(!response.ok)throw Error('Missing guide');
 const record=await response.json();records.set(id,record);return record;
}
async function openGuide(id,{autoplay=false,push=false}={}){
 try{
  const record=await getRecord(id);
  if(push)history.pushState({id},'',id==='example'?'?guide=example':'?guide='+encodeURIComponent(id));
  show(record,{autoplay});
  if(push)scrollTo({top:0,behavior:reduceMotion?'auto':'smooth'});
 }catch{if(!current)show(await getRecord('example'));}
}
addEventListener('popstate',()=>openGuide(new URLSearchParams(location.search).get('guide')||entries[0]?.id||'example'));

async function loadPublished(){
 try{const response=await fetch('published/index.json',{cache:'no-store'});entries=response.ok?await response.json():[];}catch{entries=[];}
 try{example=await (await fetch('example.json')).json();}catch{example=null;}
 const requested=new URLSearchParams(location.search).get('guide');
 const first=entries.find(e=>e.id===requested)?.id||(requested==='example'?'example':entries[0]?.id||'example');
 await openGuide(first);
 // Fetch the remaining records for previews without blocking the main guide.
 await Promise.all(entries.slice(0,24).map(e=>getRecord(e.id).catch(()=>null)));
 renderCards();
}

async function refresh(){
 try{
  const response=await fetch('/api/state');if(!response.ok)throw Error('static');
  const data=await response.json();
  if(data.id!==current?.id||data.updated!==current?.updated)show(data);
  busy=data.is_running===true||data.status==='running';
  $('run').disabled=busy;
  $('run').textContent=busy?'The Council is working…':`Run a live investigation with ${data.runner==='claude'?'Claude Code':data.runner==='codex'?'Codex':data.runner==='fixture'?'the offline fixture':'the OpenAI API'}`;
 }catch{
  $('run').disabled=true;$('run').textContent='Read-only website';
  if(!current)await loadPublished();
 }
}
$('run').onclick=async()=>{
 try{const response=await fetch('/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:'general-relativity'})});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to start');busy=true;$('run').disabled=true;await refresh();}
 catch(error){put('run-banner',error.message.includes('JSON')?'Start the Python server to run agents':error.message);}
};
refresh();setInterval(()=>{if(busy)refresh();},1500);

/* Lab status from the published snapshot. It is not a live heartbeat. */
let schedule=null;
function stepOf(state){
 if(state.status==='planning')return 0;
 if(state.status==='reviewed')return 6;
 const message=(state.events?.at(-1)?.message||'').toLowerCase();
 if(message.includes('gates passed'))return 5;
 if(message.includes('changes requested')||message.includes('director'))return 2;
 if(message.includes('review')||message.includes('inspecting'))return 4;
 if(message.includes('rendering'))return 3;
 return 1;
}
function plain(message){return (message||'').replace('physics_review','physics review').replace('visual_review','visual review').replace(/^Revision (\d+)/,'Draft $1');}
function nextRun(s){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:s.timezone,hour:'numeric',minute:'numeric',second:'numeric',hourCycle:'h23'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
 const now=+parts.hour*3600+ +parts.minute*60+ +parts.second, at=s.hour*3600;
 const wait=at>now?at-now:at-now+86400;
 const zone=new Intl.DateTimeFormat('en-US',{timeZone:s.timezone,timeZoneName:'short'}).formatToParts(new Date()).find(p=>p.type==='timeZoneName')?.value||'';
 const hour=`${s.hour%12||12}:00 ${s.hour<12?'AM':'PM'}`;
 return {label:`${at>now?'Today':'Tomorrow'} · ${hour} ${zone}`,wait};
}
function renderNext(){
 if(schedule?.enabled){
  const {label,wait}=nextRun(schedule), hours=Math.floor(wait/3600), minutes=Math.floor(wait%3600/60);
  put('next-title',label);
  put('dashboard-schedule',`In ${hours?hours+' h ':''}${minutes} min. Published only if it passes review.`);
 }else{
  put('next-title',schedule?.state==='blocked'?'Schedule paused':'No schedule confirmed');
  put('dashboard-schedule',schedule?.state==='blocked'?'The background worker needs setup before daily runs resume.':'Investigations are started by hand for now.');
 }
}
async function refreshDashboard(){
 try{
  const response=await fetch('dashboard.json',{cache:'no-store'});if(!response.ok)throw Error('No status');
  const state=await response.json();schedule=state.schedule;
  const active=['running','planning'].includes(state.status), age=Date.now()-new Date(state.updated).getTime();
  put('dashboard-status',active?'Investigating now':schedule?.enabled?'Lab resting':'Lab paused');
  document.querySelector('.lab-chip').dataset.state=active?'active':schedule?.enabled?'idle':'paused';
  const outcome={reviewed:'Last investigation passed review',needs_review:'Last attempt stayed a draft',failed:'Last attempt stopped early',interrupted:'Last attempt was interrupted'};
  put('now-title',active?(state.status==='planning'?'Choosing today’s question':'Investigating now'):outcome[state.status]||'Resting');
  put('dashboard-question',state.question&&state.question!=='Choosing the next question'?state.question:'');
  const step=stepOf(state);
  $('steps').hidden=!active;
  $('steps').replaceChildren(...STEPS.map((name,i)=>el('li',{className:i<step?'done':i===step?'active':'',textContent:name})));
  put('dashboard-phase',active?plain(state.events?.at(-1)?.message):state.updated?`Updated ${new Date(state.updated).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}`:'');
  put('dashboard-freshness',active&&age>15*60*1000?'No update for a while. The Mac may be offline or unable to publish.':age>36*60*60*1000?'No update in more than a day. The Mac may be asleep or a run was missed.':'');
  $('live-banner').hidden=!active;
  put('live-text',active?`The Council is investigating: ${state.question&&state.question!=='Choosing the next question'?state.question:'choosing today’s question'}`:'');
  const drafts=[...new Map((state.attempts||[]).filter(a=>a.status==='needs_review'&&a.question).map(a=>[a.question,a])).values()].slice(-3).reverse();
  $('bench').hidden=!drafts.length;
  $('bench-list').replaceChildren(...drafts.map(a=>el('li',{textContent:a.question})));
  renderNext();
 }catch{
  put('dashboard-status','No status yet');put('now-title','No status published yet');put('next-title','—');
 }
}
refreshDashboard();setInterval(refreshDashboard,60000);setInterval(renderNext,30000);
