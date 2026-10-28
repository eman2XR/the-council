const $=id=>document.getElementById(id);
const put=(id,text)=>{const el=$(id);if(el)el.textContent=text??'';};
const el=(tag,props={},...children)=>{const node=Object.assign(document.createElement(tag),props);node.append(...children);return node;};
const TOPICS={'gravity-clocks':'Gravity and time','light-bending':'Gravity and light','spacetime':'Space and time','twin-trip':'Space and time','interference':'Waves','standing-waves':'Waves','two-slit-particles':'Quanta','tunneling':'Quanta','wave-packet':'Quanta','quantum-well':'Quanta','falling-time':'Gravity and time','diffraction':'Waves','spacetime-paths':'Space and time','fall-fan':'Gravity and time','fall-cone':'Gravity and time','river':'Black holes','fall-views':'Gravity and time','tides':'Curved spacetime','lift':'Gravity and time','moon-tides':'Gravity and time'};
const STATUS={planning:'Choosing a question',running:'Investigating now',reviewed:'Passed review',needs_review:'Draft, not published',failed:'Attempt stopped',interrupted:'Run interrupted',idle:'Resting'};
const STEPS=['Question','Research','Design','Render','Review','Publish'];
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let current=null, entries=[], busy=false, example=null;
const requestedGuide=new URLSearchParams(location.search).get('guide');
const requestedDraft=new URLSearchParams(location.search).get('draft');
const VIEW=requestedGuide||requestedDraft?'article':'home';
let featuredId=null;
let drafts=[];
document.body.dataset.view=VIEW;
// With the header hidden on an investigation, the reading bar's mark leads home.
if(VIEW==='article')document.querySelector('#readbar a').href='./';
const records=new Map();

function safeURL(url){try{const u=new URL(url);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function topicOf(data){return TOPICS[data?.scene?.kind]||TOPICS[data?.topic]||TOPICS['light-bending'];}
function day(iso,opts={month:'short',day:'numeric'}){const d=new Date(iso);return isNaN(d)?'':d.toLocaleDateString(undefined,opts);}
function isToday(iso){const d=new Date(iso);return !isNaN(d)&&d.toDateString()===new Date().toDateString();}

const watched=(()=>{try{return new Set(JSON.parse(localStorage.getItem('council-watched')||'[]'));}catch{return new Set();}})();
function markWatched(id){if(!id||watched.has(id))return;watched.add(id);try{localStorage.setItem('council-watched',JSON.stringify([...watched]));}catch{}renderCards();}
CouncilScene.on(type=>{
 if(type==='ended')markWatched(current?.id);
});

// Heading, why it matters and the idea for one scene.
function heading(scene){
 put('title',scene.title);put('subtitle',scene.subtitle);put('takeaway',scene.takeaway);
 const part=(label,text)=>text?[el('p',{},el('strong',{textContent:label}),' '+text)]:[];
 $('why').replaceChildren(...part('Why it matters',scene.why));
}

function show(data,{autoplay=false}={}){
 current=data;const scene=data.scene, fixture=data.provider==='fixture', draft=data.provider==='draft';
 document.body.dataset.draft=draft?'yes':'';
 if(scene){heading(scene);CouncilScene.load(scene);}
 put('hero-kicker',fixture?'Example':isToday(data.created)?'Today':'Investigation');
 put('hero-topic',topicOf(data));put('readbar-title',(scene?.title||'').replace(/\n/g,' '));
 put('hero-date',data.created?day(data.created,{weekday:'long',month:'long',day:'numeric'}):'');
 put('run-banner',fixture?'Hand-written example · scripted reviews':data.error?'Stopped · partial work kept as a draft':STATUS[data.status]||String(data.status||'').replaceAll('_',' '));
 $('run-banner').dataset.status=fixture?'example':data.status||'';
 if(data.provenance?.sources_retrieved===false){put('run-banner','Reviewed · sources not retrieved');$('run-banner').dataset.status='unverified';}
 if(draft){put('run-banner','Not reviewed by the Council');$('run-banner').dataset.status='draft';}
 put('draft-note',draft&&scene?CouncilDraw.disclosure(scene):'');
 renderBehind(data);renderCards();updateTalk();renderPath();
 if(autoplay)CouncilScene.play();
}

function renderBehind(data){
 const r=data.research, fixture=data.provider==='fixture', revisions=data.revisions||[], final=revisions.at(-1);
 const chips=[];
 if(final?.physics_review&&final?.visual_review)chips.push(final.accepted?(final.text_review?'Passed physics, visual and text review':'Passed physics and visual review'):'Reviews requested changes');
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
  const notes=[rev.visual_review?.summary,rev.physics_review?.summary,rev.text_review?.summary].filter(Boolean).join(' ');
  const view=el('button',{type:'button',className:'pill',textContent:'View this draft'});
  view.onclick=()=>{CouncilScene.load(rev.scene);heading(rev.scene);
   put('run-banner',`Draft ${i+1} · ${verdict.toLowerCase()}`);scrollTo({top:0,behavior:reduceMotion?'auto':'smooth'});};
  card.append(el('div',{},el('h4',{textContent:`Draft ${i+1} · ${verdict}`}),el('p',{textContent:notes||'Waiting for review'}),view));
  return card;
 }));
 put('sources-note',data.provenance?.sources_retrieved===false?data.provenance.note:'');
 put('illustration-note',[data.scene?CouncilDraw.disclosure(data.scene):'',data.provenance?.intro_note||''].filter(Boolean).join(' '));
 $('sources').replaceChildren(...(r.sources||[]).map(s=>{const url=safeURL(s.url), item=el('div');
  item.append(url?el('a',{href:url,target:'_blank',rel:'noopener noreferrer',textContent:s.title}):el('span',{textContent:s.title}),el('small',{textContent:s.supports}));return item;}));
 put('record',JSON.stringify(data,null,2));
}

/* Cards with small live previews drawn by the same renderer as the main stage. */
const thumbs=new Set();
const visible=new IntersectionObserver(items=>items.forEach(i=>i.target.classList.toggle('in-view',i.isIntersecting)));
function card(entry,record){
 const isExample=entry.id==='example', id=entry.id;
 const link=el('a',{href:entry.draft?'?draft='+encodeURIComponent(id):isExample?'?guide=example':'?guide='+encodeURIComponent(id),className:'card'});
 if(!isExample)link.dataset.guide=id;else link.dataset.example='';
 const canvas=el('canvas',{className:'thumb',ariaHidden:'true'});
 const media=el('div',{className:'card-media'},canvas,el('span',{className:'mini-play',ariaHidden:'true'}));
 const badge=el('span',{className:'badge'});
 if(current&&(current.id===id||(isExample&&current.provider==='fixture'))){badge.textContent='Now showing';badge.dataset.kind='now';}
 else if(!isExample&&!watched.has(id)&&Date.now()-new Date(entry.created).getTime()<36*3600*1000){badge.textContent='New';badge.dataset.kind='new';}
 else if(watched.has(id)){badge.textContent='Watched';badge.dataset.kind='seen';}
 const meta=el('p',{className:'card-meta'},el('em',{textContent:'By'}),' The Council',el('span',{className:'sep'}),isExample?'Hand-written example':day(entry.created,{month:'long',day:'numeric'}),badge);
 const excerpt=el('p',{className:'card-excerpt',textContent:record?.scene?.subtitle||entry.question||''});
 link.append(media,el('div',{className:'card-body'},el('span',{className:'card-cat',textContent:isExample?'Example':topicOf(record||entry)}),el('h3',{textContent:(entry.title||entry.question||'').replace(/\n/g,' ')}),meta,excerpt));
 if(record?.scene){canvas.scene=record.scene;thumbs.add(canvas);visible.observe(canvas);}
 return link;
}
function thumbCard(entry,record){
 const link=el('a',{href:(entry.draft?'?draft=':'?guide=')+encodeURIComponent(entry.id),className:'thumb-card'});
 if(!entry.draft)link.dataset.guide=entry.id;
 const canvas=el('canvas',{className:'thumb',ariaHidden:'true'});
 link.append(el('div',{className:'card-media'},canvas,el('span',{className:'mini-play',ariaHidden:'true'})),
  el('span',{className:'card-cat',textContent:topicOf(record||entry)}),el('h3',{textContent:(entry.title||entry.question||'').replace(/\n/g,' ')}));
 if(record?.scene){canvas.scene=record.scene;thumbs.add(canvas);visible.observe(canvas);}
 return link;
}
function renderCards(){
 thumbs.forEach(c=>visible.unobserve(c));thumbs.clear();
 if(VIEW==='home'){
  // One featured investigation, then every other one grouped by chapter of the path.
  const lead=entries.find(e=>e.id===featuredId)||entries[0];
  $('featured').replaceChildren(...(lead?[card(lead,records.get(lead.id))]:example?[card({id:'example',title:example.scene.title.replace(/\n/g,' ')},example)]:[]));
  $('featured').firstChild?.classList.add('featured-card');
  put('past-title','Investigations');put('past-count',entries.length+drafts.length?`${entries.length+drafts.length} investigations`:'');
  $('chapters').replaceChildren(...chapterGroups(lead));
 }else{
  // Related first: investigations from the same chapter, then the rest.
  const chapterOf=e=>String(e?.curriculum||'').split('.')[0], here=chapterOf(current);
  const pool=[...entries,...drafts].sort((a,b)=>(chapterOf(b)===here&&!!here)-(chapterOf(a)===here&&!!here));
  const others=pool.filter(e=>e.id!==current?.id).slice(0,4);
  $('more-list').replaceChildren(...others.map(e=>thumbCard(e,records.get((e.draft?'draft:':'')+e.id))));
  $('more').hidden=!others.length;
 }
 paintThumbs(true);
}
let lastThumb=0;
function paintThumbs(force){
  for(const canvas of thumbs){
   if(!force&&!canvas.classList.contains('in-view'))continue;
   if(!force&&!canvas.closest('.card,.thumb-card').matches(':hover'))continue;
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

async function getDraft(id){
 const key='draft:'+id;if(records.has(key))return records.get(key);
 if(!/^[A-Za-z0-9-]+$/.test(id))throw Error('Invalid draft');
 const response=await fetch('drafts/'+id+'.json',{cache:'no-store'});if(!response.ok)throw Error('Missing draft');
 const record=await response.json();records.set(key,record);return record;
}
async function getRecord(id){
 if(id==='example')return example||(example=await (await fetch('example.json')).json());
 if(records.has(id))return records.get(id);
 if(!/^[A-Za-z0-9-]+$/.test(id))throw Error('Invalid guide');
 const response=await fetch('published/'+id+'/record.json',{cache:'no-cache'});if(!response.ok)throw Error('Missing guide');
 const record=await response.json();records.set(id,record);return record;
}
async function openGuide(id,{autoplay=false}={}){
 try{show(await getRecord(id),{autoplay});}
 catch{if(!current)show(await getRecord('example'));}
}

async function loadPublished(){
 try{const response=await fetch('published/index.json',{cache:'no-store'});entries=response.ok?await response.json():[];}catch{entries=[];}
 try{example=await (await fetch('example.json')).json();}catch{example=null;}
 try{featuredId=(await (await fetch('featured.json',{cache:'no-store'})).json()).id;}catch{featuredId=null;}
 try{const r=await fetch('drafts/index.json',{cache:'no-store'});drafts=r.ok?(await r.json()).map(d=>({...d,draft:true})):[];}catch{drafts=[];}
 if(requestedDraft){try{show(await getDraft(requestedDraft));}catch{await openGuide('example');}}
 else if(VIEW==='article')await openGuide(entries.find(e=>e.id===requestedGuide)?.id||(requestedGuide==='example'||!entries.length?'example':requestedGuide));
 // Fetch the remaining records for previews without blocking the main guide.
 await Promise.all([...entries.slice(0,24).map(e=>getRecord(e.id).catch(()=>null)),...drafts.map(d=>getDraft(d.id).catch(()=>null))]);
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
  if(!current&&!entries.length)await loadPublished();
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
function plain(message){return (message||'').replace('physics_review','physics review').replace('visual_review','visual review').replace('text_review','text review').replace(/^Revision (\d+)/,'Draft $1');}
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
  put('next-title',schedule?.state==='paused'?'Improving how investigations are made':schedule?.state==='blocked'?'Schedule paused':'No schedule confirmed');
  put('dashboard-schedule',schedule?.state==='paused'?'The Council is improving how investigations are made. Published ones stay available.':schedule?.state==='blocked'?'The background worker needs setup before daily runs resume.':'Investigations are started by hand for now.');
 }
}
async function refreshDashboard(){
 try{
  const response=await fetch('dashboard.json',{cache:'no-store'});if(!response.ok)throw Error('No status');
  const state=await response.json();schedule=state.schedule;
  const active=['running','planning'].includes(state.status), age=Date.now()-new Date(state.updated).getTime();
  put('dashboard-status',active?'Investigating now':schedule?.enabled?'Lab resting':schedule?.state==='paused'?'New investigations paused':'Lab paused');
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
  document.body.dataset.paused=schedule?.enabled?'no':'yes';
  renderNext();renderPath();renderCards();
 }catch{
  document.body.dataset.paused='yes';
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
// Requests only make sense while the daily run is on; while paused, unexplored items just say so.
function requestFor(item){
 if(document.body.dataset.paused!=='no')return el('span',{className:'state wait',textContent:'Not yet'});
 if(picks.has(item.id))return el('a',{className:'state picked',href:picks.get(item.id),target:'_blank',rel:'noopener noreferrer',textContent:'Picked'});
 if(item.model)return el('a',{className:'state pill pick',target:'_blank',rel:'noopener noreferrer',textContent:'Pick for tomorrow',
  href:issueURL('council:choose',`Pick next: ${item.id} ${item.question}`.slice(0,120),`curriculum: ${item.id}\n\n${item.question}\n\nPicked on the website. The next morning's run investigates this.`)});
 return el('span',{className:'state wait',textContent:'Later'});
}
// Drafts sit with the investigations: in the slot whose model they use, else in the chapter of their topic.
function draftFor(item,used){const d=drafts.find(d=>!used.has(d.id)&&d.kind===item.model);if(d)used.add(d.id);return d;}
const cardFor=e=>thumbCard(e,records.get((e.draft?'draft:':'')+e.id));
function chapterGroups(lead){
 if(!curriculum)return [el('div',{className:'thumbs'},...[...entries.filter(e=>e!==lead),...drafts].map(cardFor))];
 const placed=new Set(), used=new Set();
 const groups=curriculum.chapters.map(c=>{
  const done=c.items.map(i=>[i,doneItem(i)||draftFor(i,used)]);done.forEach(([,e])=>e&&!e.draft&&placed.add(e.id));
  const extra=drafts.filter(d=>!used.has(d.id)&&TOPICS[d.kind]===c.title);extra.forEach(d=>used.add(d.id));
  const cards=[...done.filter(([,e])=>e&&e!==lead).map(([,e])=>e),...extra].map(cardFor);
  const pending=done.filter(([,e])=>!e).map(([i])=>el('li',{},el('span',{className:'num',textContent:i.id}),el('span',{className:'q',textContent:i.question}),requestFor(i)));
  return el('section',{className:'chapter'},el('h3',{className:'chapter-title'},el('span',{textContent:`Chapter ${c.number}`}),c.title),
   ...(cards.length?[el('div',{className:'thumbs'},...cards)]:[]),...(pending.length?[el('ul',{className:'items pending'},...pending)]:[]));
 });
 const loose=[...entries.filter(e=>!placed.has(e.id)&&e!==lead),...drafts.filter(d=>!used.has(d.id))];
 if(loose.length)groups.push(el('section',{className:'chapter'},el('h3',{className:'chapter-title'},'Other investigations'),el('div',{className:'thumbs'},...loose.map(cardFor))));
 return groups;
}
function renderPath(){
 if(!curriculum)return;
 const all=curriculum.chapters.flatMap(c=>c.items), next=all.find(i=>i.model&&!doneItem(i)&&!picks.has(i.id));
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
 renderPath();renderCards();
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


/* Sticky reading bar: appears once the headline scrolls away, with reading progress. */
const readbar=$('readbar');
new IntersectionObserver(([e])=>readbar.classList.toggle('on',!e.isIntersecting&&e.boundingClientRect.top<0)).observe($('title'));
addEventListener('scroll',()=>{const max=document.documentElement.scrollHeight-innerHeight;readbar.style.setProperty('--read',max>0?Math.min(1,scrollY/max):0);},{passive:true});
