import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const root=new URL('../',import.meta.url);
async function welcome({adult=true,country='',seen=false,replay=false,blocked=false,reduced=false,brokenRenderer=false}={}){
  let focused='',rendered=0;const timers=new Map(),values=new Map(seen?[['gim:ruby-welcome:v1','done']]:[]);
  const node=id=>({id,hidden:false,disabled:false,inert:false,listeners:{},classes:new Set(),
    addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},
    dispatch(type,more={}){for(const fn of this.listeners[type]||[])fn({key:'',preventDefault(){},...more});},
    focus(){focused=id;document.activeElement=this;},
    cloneNode(){return this;},replaceWith(){},
    classList:{add(c){nodes.get(id).classes.add(c);},remove(c){nodes.get(id).classes.delete(c);}}
  });
  const nodes=new Map(['rubyWelcome','rubyReveal','rubySkip','rubyStatus','rubyGlobe','ageGate','countryEntrance','storeShell','main','countryHeading','body'].map(id=>[id,node(id)]));
  nodes.get('rubyWelcome').hidden=true;nodes.get('ageGate').hidden=adult;
  const document={getElementById:id=>nodes.get(id),body:nodes.get('body')};
  const location={href:'https://store.example/'+(replay?'?welcome=replay&keep=yes#one-heart':'')};
  const history={replaceState(a,b,href){location.href=href;}};
  const storage={getItem(key){if(blocked)throw Error('blocked');return values.get(key);},setItem(key,value){if(blocked)throw Error('blocked');values.set(key,value);}};
  const renderer={create(){if(brokenRenderer)throw Error('unsupported');return{draw(){rendered++;}};}};
  const window={GIMDestination:{country:()=>country},GIMGlobe3D:renderer,GIMGlobeSoftware:renderer,matchMedia:()=>({matches:reduced})};
  const sandbox={window,document,location,history,localStorage:storage,URL,setTimeout(fn,ms){const id=timers.size+1;timers.set(id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);}};
  runInNewContext(await readFile(new URL('site/ruby-welcome.js',root),'utf8'),sandbox);
  return {nodes,window,values,timers,location,get focused(){return focused;},get rendered(){return rendered;},start:()=>window.GIMWelcome.start(),click:id=>nodes.get(id).dispatch('click'),finish(){const task=[...timers.values()][0];assert.ok(task);task.fn();}};
}
test('Age confirmation precedes the logo, including explicit replay',async()=>{
 const w=await welcome({adult:false,replay:true});assert.equal(w.start(),false);assert.equal(w.nodes.get('rubyWelcome').hidden,true);
 w.nodes.get('ageGate').hidden=true;assert.equal(w.start(),true);assert.equal(w.focused,'rubyReveal');
});
test('First adult visit displays the original-logo stage and locks background controls',async()=>{
 const w=await welcome();assert.equal(w.start(),true);assert.equal(w.rendered,1);assert.equal(w.nodes.get('countryEntrance').inert,true);assert.equal(w.nodes.get('storeShell').inert,true);assert.equal(w.nodes.get('rubyWelcome').hidden,false);
 assert.equal(w.start(),true);assert.equal(w.rendered,1);
});
test('Saved country and old completion markers never bypass the entrance',async()=>{
 for(const options of [{country:'CA'},{seen:true},{country:'CA',seen:true}]){const w=await welcome(options);assert.equal(w.start(),true);assert.equal(w.rendered,1);assert.equal(w.nodes.get('rubyWelcome').hidden,false);}
});
test('A new page load shows the heart again after an earlier completed visit',async()=>{
 const first=await welcome({country:'CA'});first.start();first.click('rubyReveal');first.finish();assert.equal(first.start(),false);
 const next=await welcome({country:'CA',seen:true});assert.equal(next.start(),true);next.click('rubySkip');assert.equal(next.focused,'main');assert.equal(next.window.GIMDestination.country(),'CA');
});
test('Reveal completes once per page in 1400ms and restores country focus',async()=>{
 const w=await welcome();w.start();w.click('rubyReveal');w.click('rubyReveal');assert.equal(w.timers.size,1);assert.equal([...w.timers.values()][0].ms,1400);w.finish();
 assert.equal(w.nodes.get('rubyWelcome').hidden,true);assert.equal(w.values.has('gim:ruby-welcome:v1'),false);assert.equal(w.focused,'countryHeading');assert.equal(w.nodes.get('countryEntrance').inert,false);assert.equal(w.nodes.get('body').classes.has('ruby-open'),false);assert.equal(w.start(),false);
});
test('Explicit replay preserves selected country and other URL parameters',async()=>{
 const w=await welcome({country:'CA',seen:true,replay:true});assert.equal(w.start(),true);w.click('rubySkip');assert.equal(w.focused,'main');assert.equal(w.window.GIMDestination.country(),'CA');assert.equal(w.location.href,'https://store.example/?keep=yes#one-heart');
});
test('Skip and Escape cancel the running timer and restore navigation',async()=>{
 for(const action of ['skip','escape']){const w=await welcome();w.start();w.click('rubyReveal');if(action==='skip')w.click('rubySkip');else w.nodes.get('rubyWelcome').dispatch('keydown',{key:'Escape'});assert.equal(w.timers.size,0);assert.equal(w.nodes.get('rubyWelcome').hidden,true);}
});
test('Reduced motion avoids the facet burst and uses a 200ms fade',async()=>{
 const w=await welcome({reduced:true});w.start();w.click('rubyReveal');assert.equal([...w.timers.values()][0].ms,200);w.finish();assert.equal(w.focused,'countryHeading');
 const css=await readFile(new URL('site/ruby-welcome.css',root),'utf8');assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/#rubyFacets\{visibility:hidden\}/);
});
test('Blocked storage and failed graphics never prevent country selection',async()=>{
 const w=await welcome({blocked:true,brokenRenderer:true});assert.equal(w.start(),true);w.click('rubySkip');assert.equal(w.focused,'countryHeading');assert.equal(w.start(),false);
});
test('Keyboard focus stays within the intro until skipped or completed',async()=>{
 const w=await welcome();w.start();w.nodes.get('rubyWelcome').dispatch('keydown',{key:'Tab'});assert.equal(w.focused,'rubySkip');w.nodes.get('rubyWelcome').dispatch('keydown',{key:'Tab'});assert.equal(w.focused,'rubyReveal');w.nodes.get('rubyWelcome').dispatch('keydown',{key:'Escape'});assert.equal(w.focused,'countryHeading');
});
test('Entrance uses unchanged source pixels with no extra visible wordmark or inline policy exceptions',async()=>{
 const html=await readFile(new URL('site/index.html',root),'utf8');const intro=html.split('<section id="rubyWelcome"')[1].split('</section>')[0];
 assert.match(intro,/assets\/welcome\/1000156129.png/);assert.equal((intro.match(/class="ruby-facet /g)||[]).length,72);assert.ok(!/Global Intimacy Marketplace|Tap to discover|Welcome to/.test(intro));assert.ok(!/\sstyle=|\sonclick=/.test(intro));
 const source=await readFile(new URL('site/assets/welcome/1000156129.png',root));const {createHash}=await import('node:crypto');assert.equal(createHash('sha256').update(source).digest('hex'),'81bbbe4bb561c4dfd7d385aa22d0b80239be518c0cd3fdcfe9b349db43fbb3fe');
 assert.match(html,/href="\?welcome=replay"/);assert.ok(html.indexOf('src="ruby-welcome.js"')<html.indexOf('src="app.js"'));
});
