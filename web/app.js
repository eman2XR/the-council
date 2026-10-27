const $=id=>document.getElementById(id);
let current=null, busy=false;
const put=(id,text)=>$(id).textContent=text;
function safeURL(url){try{const u=new URL(url);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function show(data){
 current=data; const scene=data.scene;
 if(scene){put('title',scene.title);put('subtitle',scene.subtitle);put('takeaway',scene.takeaway);CouncilScene.load(scene);}
 const fixture=data.provider==='fixture';
 put('run-banner',fixture?'OFFLINE EXAMPLE · Reviews are scripted fixtures. No live agents or web research have run.':`LIVE INVESTIGATION · ${data.status.replaceAll('_',' ')} · ${data.events?.at(-1)?.message||''}`);
 if(data.error)put('run-banner',`Investigation stopped: ${data.error} Previous work is preserved as a draft.`);
 if(!data.research)return;
 const r=data.research;put('claim',r.claim);put('falsifier',r.falsifier);put('prediction',r.prediction);
 $('limits').replaceChildren(...[...r.assumptions,...r.limitations].map(x=>{let li=document.createElement('li');li.textContent=x;return li;}));
 $('checks').replaceChildren(...(data.checks||[]).map(x=>{let li=document.createElement('li');li.textContent=x.name;li.className=x.pass?'pass':'fail';return li;}));
 put('history-label',fixture?'Scripted demonstration of two revision rounds':`${data.revisions?.length||0} saved revisions · ${data.status}`);
 $('history').replaceChildren(...(data.revisions||[]).map((r,i)=>{const card=document.createElement('article');card.className='revision';if(r.frames?.length){const img=document.createElement('img');img.src=r.frames[0];img.alt=`Rendered frame from revision ${i+1}`;card.append(img);}const body=document.createElement('div');const title=document.createElement('h3');title.textContent=`Revision ${i+1} · ${r.accepted?(fixture?'Fixture passed':'Review passed'):'Changes requested'}`;const p=document.createElement('p');p.textContent=r.visual_review?.summary||'Waiting for review';const science=document.createElement('p');science.textContent=r.physics_review?.summary||'';const changes=document.createElement('p');changes.textContent=[...(r.visual_review?.changes||[]),...(r.physics_review?.changes||[])].join(' ');const button=document.createElement('button');button.textContent='Explore this version ↗';button.onclick=()=>{CouncilScene.load(r.scene);put('title',r.scene.title);put('subtitle',r.scene.subtitle);put('takeaway',r.scene.takeaway);put('run-banner',`Viewing revision ${i+1}${fixture?' · offline fixture':''} · ${r.accepted?'review passed':'changes requested'}`);document.querySelector('.workspace').scrollIntoView({behavior:'smooth'});};body.append(title,p,science,changes,button);card.append(body);return card;}));
 $('sources').replaceChildren(...r.sources.map(s=>{const div=document.createElement('div'),url=safeURL(s.url);if(url){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=s.title+' ↗';div.append(a);}const small=document.createElement('small');small.textContent=s.supports;div.append(small);return div;}));
 put('record',JSON.stringify(data,null,2));
}
async function refresh(){try{const response=await fetch('/api/state');if(!response.ok)throw Error('static');const data=await response.json();if(data.id!==current?.id||data.updated!==current?.updated)show(data);busy=data.is_running===true||data.status==='running';$('run').disabled=busy;if(busy)$('run').textContent='Council is working…';else $('run').textContent=`Run with ${data.runner==='claude'?'Claude Code':data.runner==='codex'?'Codex':data.runner==='fixture'?'offline fixture':'OpenAI API'} ↗`;}catch{$('run').disabled=true;$('run').textContent='Read-only web edition';if(!current){const response=await fetch('example.json');show(await response.json());}}}
$('run').onclick=async()=>{try{const response=await fetch('/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:'general-relativity'})});const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to start');busy=true;$('run').disabled=true;await refresh();}catch(error){put('run-banner',error.message.includes('JSON')?'Start the Python server to run agents. Static preview is read-only.':error.message);}};
refresh();setInterval(()=>{if(busy)refresh();},1500);
