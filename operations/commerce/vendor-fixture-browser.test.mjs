// Runs the vendor demo in a real headless Chromium browser with fictional fixtures only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

async function localFixture(){
  const allowed=new Set([
    'vendor-fixture-dashboard.html','vendor-fixture-dashboard-demo.mjs',
    'vendor-fixture-dashboard.mjs','vendor-fixture-console.mjs',
    'vendor-storefront.mjs','vendor-domain.mjs'
  ]);
  const requests=[];
  const server=createServer(async(req,res)=>{
    const filename=new URL(req.url,'http://localhost').pathname.slice(1);
    requests.push(filename);
    if(!allowed.has(filename)){res.writeHead(404);res.end();return;}
    try{
      const data=await readFile(new URL('./'+filename,import.meta.url));
      res.writeHead(200,{'Content-Type':filename.endsWith('.html')?'text/html':'text/javascript',
        'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      res.end(data);
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {server,requests,url:'http://127.0.0.1:'+server.address().port+'/vendor-fixture-dashboard.html'};
}
async function chrome(url){
  const dir=await mkdtemp(join(tmpdir(),'vendor-fixture-chrome-'));
  const child=spawn(process.env.CHROME_BIN||'google-chrome',[
    '--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--disable-background-networking','--disable-extensions','--no-first-run',
    '--remote-debugging-port=0','--user-data-dir='+dir,'about:blank'
  ],{stdio:['ignore','ignore','pipe']});
  let errors='';
  child.stderr?.on('data',chunk=>{errors=(errors+String(chunk)).slice(-2000)});
  let ws;
  try{
    let port;
    for(let i=0;i<120;i++){
      if(child.exitCode!==null)throw Error('Chromium exited: '+errors);
      try{port=Number((await readFile(join(dir,'DevToolsActivePort'),'utf8')).split('\n')[0])}catch{}
      if(port)break;
      await delay(100);
    }
    if(!port)throw Error('Chromium did not start: '+errors);
    const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
    const page=targets.find(x=>x.type==='page');
    assert.ok(page,'Browser tab required');
    ws=new WebSocket(page.webSocketDebuggerUrl);
    await Promise.race([
      new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})}),
      delay(5000).then(()=>{throw Error('DevTools WebSocket timeout')})
    ]);
    let seq=0;const pending=new Map();
    ws.addEventListener('message',evt=>{
      const data=JSON.parse(evt.data),task=pending.get(data.id);
      if(!task)return;
      pending.delete(data.id);
      data.error?task.reject(Error(data.error.message)):task.resolve(data.result);
    });
    const send=(method,params={})=>Promise.race([
      new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))}),
      delay(7000).then(()=>{throw Error('Chrome command timeout: '+method)})
    ]);
    const evaluate=async expression=>{
      const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
      if(result.exceptionDetails)throw Error(result.exceptionDetails.text);
      return result.result.value;
    };
    await send('Page.enable');
    await send('Runtime.enable');
    return {send,evaluate,open:async width=>{
      await send('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<600});
      await send('Page.navigate',{url});
      for(let i=0;i<100;i++){
        try{
          if(await evaluate("document.readyState==='complete' && document.querySelectorAll('nav button[data-tab]').length===4"))return;
        }catch(e){if(!/context|navigat/i.test(e.message))throw e}
        await delay(80);
      }
      throw Error('Fictional dashboard did not load in browser');
    },close:async()=>{ws?.close();child.kill('SIGKILL');child.stderr?.destroy();
      await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100})}};
  }catch(err){ws?.close();child.kill('SIGKILL');child.stderr?.destroy();
    await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100});throw err}
}
test('offline vendor dashboard supports mobile and desktop real-browser navigation', {timeout:45000},async t=>{
  const local=await localFixture();let browser;
  try{
    browser=await chrome(local.url);
    for(const width of [390,1280]){
      await t.test(width===390?'mobile 390px':'desktop 1280px',async()=>{
        await browser.open(width);
        const state=await browser.evaluate("({heading:document.querySelector('h1')?.textContent,buttons:document.querySelectorAll('nav button').length,overflow:document.documentElement.scrollWidth>innerWidth,fictional:document.body.textContent.includes('FICTIONAL DATA'),checkout:!!document.querySelector('form,input[type=password],button[type=submit]')})");
        assert.equal(state.heading,'Vendor workspace');
        assert.equal(state.buttons,4);
        assert.equal(state.overflow,false,'Unexpected horizontal page overflow');
        assert.equal(state.fictional,true);
        assert.equal(state.checkout,false);
        await browser.evaluate("document.querySelector('button[data-tab=moderation]').click()");
        assert.equal(await browser.evaluate("document.querySelector('#vendor-panel h2').textContent"),'Listing review queue');
        assert.equal(await browser.evaluate("document.activeElement.getAttribute('data-tab')"),'moderation');
        await browser.evaluate("document.querySelector('button[data-filter=pending]').click()");
        assert.equal(await browser.evaluate("document.activeElement.getAttribute('data-filter')"),'pending');
        assert.equal(await browser.evaluate("document.querySelector('#vendor-panel').textContent.includes('Sample hoodie awaiting review')"),true);
        assert.equal(await browser.evaluate("document.querySelector('#vendor-panel').textContent.includes('Sample printed shirt')"),false);
        await browser.evaluate("document.querySelector('button[data-tab=storefront]').click()");
        assert.equal(await browser.evaluate("document.querySelector('#vendor-panel').textContent.includes('Sample printed shirt')"),true);
        assert.equal(await browser.evaluate("document.querySelector('#vendor-panel').textContent.includes('Sample hoodie awaiting review')"),false);
        await browser.evaluate("document.querySelector('button[data-tab=audit]').click()");
        assert.equal(await browser.evaluate("document.querySelectorAll('#vendor-panel ol li').length"),5);
        assert.equal(await browser.evaluate("document.body.textContent.includes('fictional_reviewer')"),false);
      });
    }
    assert.ok(local.requests.every(path=>[
      'vendor-fixture-dashboard.html','vendor-fixture-dashboard-demo.mjs',
      'vendor-fixture-dashboard.mjs','vendor-fixture-console.mjs',
      'vendor-storefront.mjs','vendor-domain.mjs','favicon.ico'
    ].includes(path)),'Unexpected resource request');
  }finally{await browser?.close();await new Promise(resolve=>local.server.close(resolve))}
});
