const $=id=>document.getElementById(id);
const put=(id,text)=>{const el=$(id);if(el)el.textContent=text??'';};
const el=(tag,props={},...children)=>{const node=Object.assign(document.createElement(tag),props);node.append(...children);return node;};
const TOPICS={'gravity-clocks':'Gravity and time','light-bending':'Gravity and light','spacetime':'Space and time','interference':'Waves','standing-waves':'Waves','two-slit-particles':'Quanta','tunneling':'Quanta','wave-packet':'Quanta','quantum-well':'Quanta'};
const STATUS={planning:'Choosing a question',running:'Investigating now',reviewed:'Passed review',needs_review:'Draft, not published',failed:'Attempt stopped',interrupted:'Run interrupted',idle:'Resting'};
const STEPS=['Question','Research','Design','Render','Review','Publish'];
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let current=null, entries=[], busy=false, example=null;
const records=new Map();

function safeURL(url){try{const u=new URL(url);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function topicOf(data){return TOPICS[data?.scene?.kind]||TOPICS[data?.topic]||TOPICS['light-bending'];}
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
 if(data.provenance?.sources_retrieved===false){put('run-banner','Reviewed · sources not retrieved');$('run-banner').dataset.status='unverified';}
 renderBehind(data);renderCards();updateTalk();renderPath();
 if(autoplay)CouncilScene.play();
}

function renderBehind(data){
 const r=data.research, fixture=data.provider==='fixture', revisions=data.revisions||[], final=revisions.at(-1);
 const chips=[];
 if(final?.physics_review&&final?.visual_review)chips.push(final.accepted?'Passed physics and visual review':'Reviews requested changes');
 if(revisions.length>1)chips.push(`${revisions.length} drafts`);
 const checks=data.checks||[];if(checks.length)chips.push(`${checks.filter(c=>c.pass).length} of ${checks.length} checks`);
 if(fixture)chips.unshift('Scripted example');
 if(data.provenance?.sources_retrieved===false)chips.unshift('Sources not retrieved');
 put('review-summary',chips.join(' · '));
 if(!r)return;
 put('claim',r.claim);put('falsifier',r.falsifier);put('prediction',r.prediction);
 $('limits').replaceChildren(...[...(r.assumptions||[]),...(r.limitations||[])].map(x=>el('li',{textContent:x})));
 $('checks').replaceChildren(...checks.map(x=>el('li',{textContent:x.name,className:x.pass?'pass':'fail'})));
 put('history-label',fixture?'· scripted demonstration':`· ${revisions.length} saved`);
 $('history').replaceChildren(...revisions.map((rev,i)=>{
  const card=el('article',{className:'revision'});
  if(rev.frames?.length)card.append(el('img',{src:rev.frames[0],alt:`Rendered frame from draft ${i+1}`}));
  const verdict=rev.accepted?(fixture?'Fixture passed':'Passed review'):'Changes requested';
  const notes=[rev.visual_review?.summary,rev.physics_review?.summary].filter(Boolean).join(' ');
  const view=el('button',{type:'button',className:'pill',textContent:'View this draft'});
  view.onclick=()=>{CouncilScene.load(rev.scene);put('title',rev.scene.title);put('subtitle',rev.scene.subtitle);put('takeaway',rev.scene.takeaway);
   put('run-banner',`Draft ${i+1} · ${verdict.toLowerCase()}`);scrollTo({top:0,behavior:reduceMotion?'auto':'smooth'});};
  card.append(el('div',{},el('h4',{textContent:`Draft ${i+1} · ${verdict}`}),el('p',{textContent:notes||'Waiting for review'}),view));
  return card;
 }));
 put('sources-note',data.provenance?.sources_retrieved===false?data.provenance.note:'');
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
 if(example&&!entries.length)items.push(card({id:'example',title:example.scene.title.replace(/\n/g,' ')},example));
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
let schedule=null, labActive=false, labQuestion='';
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
  put('next-title',labActive?'':`${label} · in ${hours?hours+' h ':''}${minutes} min`);
  put('dashboard-schedule','One new investigation each morning. Only investigations that pass physics and visual review are published.');
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
  $('lab').dataset.state=active?'active':schedule?.enabled?'idle':'paused';
  labActive=active;labQuestion=state.question&&state.question!=='Choosing the next question'?state.question:'';
  const outcome={reviewed:'Last investigation passed review',needs_review:'Last attempt stayed a draft',failed:'Last attempt stopped early',interrupted:'Last attempt was interrupted'};
  put('now-title',active?(state.status==='planning'?'Choosing today’s question':'Investigating now'):entries[0]?`Latest published: ${entries[0].title}`:outcome[state.status]||'Resting');
  put('dashboard-question',active&&state.question&&state.question!=='Choosing the next question'?state.question:'');
  const step=stepOf(state);
  $('steps').hidden=!active;
  $('steps').replaceChildren(...STEPS.map((name,i)=>el('li',{className:i<step?'done':i===step?'active':'',textContent:name})));
  put('dashboard-phase',active?plain(state.events?.at(-1)?.message):state.updated?`Updated ${new Date(state.updated).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}`:'');
  put('dashboard-freshness',active&&age>15*60*1000?'No update for a while. The Mac may be offline or unable to publish.':age>36*60*60*1000?'No update in more than a day. The Mac may be asleep or a run was missed.':'');
  const drafts=[...new Map((state.attempts||[]).filter(a=>a.status==='needs_review'&&a.question).map(a=>[a.question,a])).values()].slice(-3).reverse();
  $('bench').hidden=!drafts.length;
  $('bench-list').replaceChildren(...drafts.map(a=>el('li',{textContent:a.question})));
  renderNext();renderPath();
 }catch{
  put('dashboard-status','No status yet');put('now-title','No status published yet');put('next-title','—');
 }
}
refreshDashboard();setInterval(refreshDashboard,60000);setInterval(()=>{renderNext();renderPath();},30000);

/* The path: the curriculum, with requests sent as GitHub issues the morning worker reads. */
const REPO='https://github.com/eman2XR/the-council';
const OWNER='eman2XR';
let curriculum=null, picks=new Map();
const norm=s=>(s||'').toLowerCase().replace(/\W+/g,'');
function issueURL(label,title,body){return `${REPO}/issues/new?${new URLSearchParams({title,body,labels:label})}`;}
function updateTalk(){
 const guide=current?.id&&current.provider!=='fixture'?current.id:'example', title=current?.scene?.title?.replace(/\n/g,' ')||'';
 $('ask').href=issueURL('council:question','Question: ',`guide: ${guide}\n\nWhat I'm wondering (one question works best):\n\n`);
 $('feedback').href=issueURL('council:feedback',`Feedback: ${title}`.slice(0,120),`guide: ${guide}\n\nWhat worked:\n\nWhat was confusing:\n\n`);
}
function doneItem(item){return entries.find(e=>e.curriculum===item.id||norm(e.question)===norm(item.question));}
let selectedChapter=null;
function renderPath(){
 if(!curriculum)return;
 const chapters=curriculum.chapters, all=chapters.flatMap(c=>c.items);
 const next=all.find(i=>i.model&&!doneItem(i)&&!picks.has(i.id));
 put('path-progress',`${all.filter(doneItem).length} of ${all.length} explored`);
 put('path-horizon',curriculum.horizon);
 const current=chapters.find(c=>c.items.includes(next))||chapters.find(c=>c.items.some(i=>!doneItem(i)))||chapters[0];
 const chapter=chapters.find(c=>c.number===selectedChapter)||current;
 $('chapter-row').replaceChildren(...chapters.map(c=>{
  const done=c.items.filter(doneItem).length;
  const tile=el('button',{type:'button',className:'chapter-tile',role:'tab'},
   el('span',{className:'tile-top',textContent:`Chapter ${c.number}`}),el('strong',{textContent:c.title}),
   el('span',{className:'tile-status',textContent:done===c.items.length?'Complete':`${c.items.some(i=>i.model)?'Ready':'Later'} · ${done}/${c.items.length}`}),el('i'));
  tile.dataset.status=c.items.some(i=>i.model)?'ready':'later';tile.style.setProperty('--done',done/c.items.length);
  tile.setAttribute('aria-selected',String(c===chapter));
  tile.onclick=()=>{selectedChapter=c.number;renderPath();};
  return tile;
 }));
 const rows=chapter.items.map(item=>{
  const published=doneItem(item);let state;
  if(published){state=el('a',{className:'state pill',href:'?guide='+encodeURIComponent(published.id),textContent:'Watch'});
   state.onclick=e=>{e.preventDefault();openGuide(published.id,{autoplay:true,push:true});};}
  else if(picks.has(item.id))state=el('a',{className:'state picked',href:picks.get(item.id),target:'_blank',rel:'noopener noreferrer',textContent:'Picked'});
  else if(item.model)state=el('a',{className:'state pill pick',target:'_blank',rel:'noopener noreferrer',textContent:'Pick for tomorrow',
   href:issueURL('council:choose',`Pick next: ${item.id} ${item.question}`.slice(0,120),`curriculum: ${item.id}\n\n${item.question}\n\nPicked on the website. The next morning's run investigates this.`)});
  else state=el('span',{className:'state wait',textContent:'Later'});
  const li=el('li',{className:item===next?'next':''},el('span',{className:'num',textContent:item.id}),el('span',{className:'q',textContent:item.question}),state);
  li.dataset.state=published?'done':'';return li;
 });
 if(chapter.items.some(i=>!i.model)){
  const vote=el('a',{target:'_blank',rel:'noopener noreferrer',textContent:'Vote for it',
   href:issueURL('council:choose',`Vote: ${chapter.engine} visual`,`chapter: ${chapter.number}\n\nI'd like the ${chapter.engine} visual built so the rest of this chapter can run.`)});
  rows.push(el('li',{className:'note'},`Items marked Later need a ${chapter.engine} visual. `,vote));
 }
 $('chapter-items').replaceChildren(...rows);
 if(schedule?.enabled){
  const pick=[...picks.keys()].map(id=>all.find(i=>i.id===id)).find(i=>i&&i.model&&!doneItem(i));
  const upcoming=pick||next;
  put('next-pick',labActive?labQuestion:upcoming?`${pick?'Your pick':'Next'}: ${upcoming.question}`:'');
 }else put('next-pick',labActive?labQuestion:'');
}
async function loadPath(){
 try{curriculum=await (await fetch('curriculum.json')).json();}catch{return;}
 try{
  const response=await fetch(`https://api.github.com/repos/${OWNER}/the-council/issues?state=open&creator=${OWNER}&labels=council:choose&per_page=50`);
  if(response.ok)for(const issue of await response.json()){const id=/curriculum:\s*([0-9]+\.[0-9]+)/.exec(issue.body||'')?.[1];if(id&&!picks.has(id))picks.set(id,issue.html_url);}
 }catch{}
 renderPath();
}
loadPath();

/* Proposals: the daily project review's suggestions, approved or declined through GitHub issues. */
let proposals=null, verdicts=new Map();
function proposalCard(p){
 const status=verdicts.get(p.id)||(p.status!=='open'?p.status:null);
 const actions=el('div',{className:'actions'});
 if(status){const badge=el('span',{className:'status',textContent:status==='approved'?'Approved':status==='declined'?'Declined':'Decision sent'});badge.dataset.status=status;actions.append(badge);}
 else actions.append(
  el('a',{className:'pill approve',target:'_blank',rel:'noopener noreferrer',textContent:'Approve',href:issueURL('council:approve',`Approve: ${p.title}`.slice(0,120),`proposal: ${p.id}\n\n${p.proposal}\n\nNotes for the implementation (optional):\n`)}),
  el('a',{className:'pill',target:'_blank',rel:'noopener noreferrer',textContent:'Decline',href:issueURL('council:decline',`Decline: ${p.title}`.slice(0,120),`proposal: ${p.id}\n\nWhy not (optional, helps future reviews):\n`)}));
 const evidence=(p.evidence||[]).map(safeURL).filter(Boolean).map(url=>el('a',{href:url,target:'_blank',rel:'noopener noreferrer',textContent:new URL(url).hostname.replace(/^www\./,'')}));
 return el('article',{className:'proposal'},
  el('header',{},el('h3',{textContent:p.title}),el('span',{className:'meta',textContent:`${p.area} · ${p.effort} effort · ${day(p.created)}`})),
  el('p',{className:'why'},el('b',{textContent:'Problem. '}),p.problem),
  el('p',{},el('b',{textContent:'Proposal. '}),p.proposal),
  el('p',{className:'why'},el('b',{textContent:'Why it helps. '}),p.benefit,' ',el('b',{textContent:'Risk. '}),p.risk),
  evidence.length?el('div',{className:'evidence'},'Sources: ',...evidence):'',actions);
}
function renderProposals(){
 const list=proposals?.proposals||[], open=list.filter(p=>p.status==='open'&&!verdicts.has(p.id));
 put('proposals-count',open.length?String(open.length):'');
 $('proposals-open').hidden=!list.length;
 $('proposals-list').replaceChildren(...(list.length?list.map(proposalCard):[el('p',{className:'empty',textContent:'The first project review runs with the next morning investigation. Its suggestions will appear here.'})]));
}
async function loadProposals(){
 try{const r=await fetch('proposals.json',{cache:'no-store'});proposals=r.ok?await r.json():null;}catch{proposals=null;}
 try{
  for(const [label,status] of [['council:approve','approved'],['council:decline','declined']]){
   const r=await fetch(`https://api.github.com/repos/${OWNER}/the-council/issues?state=all&creator=${OWNER}&labels=${label}&per_page=50`);
   if(r.ok)for(const issue of await r.json()){const id=/proposal:\s*(P-\d{8}-\d+)/.exec(issue.body||'')?.[1];if(id)verdicts.set(id,status);}
  }
 }catch{}
 renderProposals();
}
$('proposals-open').onclick=()=>{$('proposals').showModal();};
$('proposals-close').onclick=()=>$('proposals').close();
$('proposals').addEventListener('click',e=>{if(e.target===$('proposals'))$('proposals').close();});
loadProposals();

/* End card: what comes next, and an easy way to ask about this one. */
CouncilScene.on(type=>{
 if(type==='play')$('after').hidden=true;
 if(type==='ended'){
  const all=curriculum?.chapters.flatMap(c=>c.items)||[], next=all.find(i=>i.model&&!doneItem(i));
  put('after-next',next?next.question:'a new question');$('after-ask').href=$('ask').href;$('after').hidden=false;
 }
});
