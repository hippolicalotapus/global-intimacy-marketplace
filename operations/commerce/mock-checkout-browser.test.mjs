import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

// Launch a real headless browser; no npm installation, external network or live services.
async function startFixture() {
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (!/^\/(mock-checkout-demo\.html|[a-z0-9-]+\.mjs)$/.test(path)) {
      res.writeHead(404); res.end(); return;
    }
    try {
      const data = await readFile(new URL('.' + path, import.meta.url));
      res.writeHead(200, { 'Content-Type': path.endsWith('.html') ? 'text/html' : 'text/javascript', 'Cache-Control': 'no-store' });
      res.end(data);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  return { server, url: 'http://127.0.0.1:' + server.address().port + '/mock-checkout-demo.html' };
}
async function chromeSession(url) {
  const dir = await mkdtemp(join(tmpdir(), 'gim-chrome-'));
  const chrome = spawn(process.env.CHROME_BIN || 'google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-background-networking', '--disable-extensions', '--no-zygote',
    '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + dir, 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let diagnostics = '';
  chrome.stderr?.on('data', chunk => { diagnostics = (diagnostics + chunk.toString()).slice(-3000); });
  try {
    let port;
    for (let i = 0; i < 160; i++) {
      if (chrome.exitCode !== null) throw Error('Chrome exited before startup: ' + diagnostics);
      try { port = Number((await readFile(join(dir, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); } catch {}
      if (port) break;
      await delay(100);
    }
    if (!port) throw Error('Chrome DevTools endpoint unavailable: ' + diagnostics);
    const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    const target = targets.find(x => x.type === 'page');
    if (!target) throw Error('Chrome tab unavailable');
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await Promise.race([
      new Promise((ok, reject) => {
        socket.addEventListener('open', ok, { once: true });
        socket.addEventListener('error', reject, { once: true });
      }),
      delay(5000).then(() => { throw Error('Chrome WebSocket connection timed out'); })
    ]);
    let seq = 0;
    const pending = new Map();
    socket.addEventListener('message', message => {
      const data = JSON.parse(message.data);
      const promise = pending.get(data.id);
      if (!promise) return;
      pending.delete(data.id);
      data.error ? promise.reject(Error(data.error.message)) : promise.resolve(data.result);
    });
    function send(method, params = {}) {
      return Promise.race([
        new Promise((resolve, reject) => {
          const id = ++seq;
          pending.set(id, { resolve, reject });
          socket.send(JSON.stringify({ id, method, params }));
        }),
        delay(5000).then(() => { throw Error('Chrome DevTools command timed out: ' + method); })
      ]);
    }
    async function evaluate(expression) {
      const out = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (out.exceptionDetails) throw Error(out.exceptionDetails.text);
      return out.result.value;
    }
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.navigate', { url });
    for (let i = 0; i < 80; i++) {
      if (await evaluate("document.readyState==='complete' && document.querySelector('#items')?.children.length>0")) break;
      if (i === 79) throw Error('Fixture did not render in Chrome');
      await delay(100);
    }
    return { evaluate, send, close: async () => {
      socket.close(); chrome.kill('SIGKILL'); chrome.stderr?.destroy();
      await rm(dir, { recursive: true, force: true, maxRetries: 12, retryDelay: 150 });
    } };
  } catch (error) {
    chrome.kill('SIGKILL'); chrome.stderr?.destroy();
    await rm(dir, { recursive: true, force: true });
    throw error;
  }
}
test('offline checkout renders and responds in a real Chrome browser', { timeout: 30000 }, async t => {
  const { server, url } = await startFixture();
  let browser;
  try {
    browser = await chromeSession(url);
    const { evaluate, send } = browser;
    let navigationSequence=0;
    async function navigateFixture(targetUrl=url){
      const destination=new URL(targetUrl);
      destination.searchParams.set('qaNavigation',String(++navigationSequence));
      await send('Page.navigate',{url:destination.href});
      for(let i=0;i<80;i++){
        try{
          // A ready old document is not evidence that the requested reload completed.
          if(await evaluate(`location.href===${JSON.stringify(destination.href)} && document.readyState==='complete' && document.querySelector('#items')?.children.length>0`))return;
        }catch(error){
          if(!/execution context|cannot find context|target navigated/i.test(error.message))throw error;
        }
        await delay(50);
      }
      throw Error('Fresh checkout fixture did not finish loading');
    }
    await t.test('safe returning shopper estimate, disabled payment and recovery', async () => {
      assert.equal(await evaluate("document.querySelector('#items').textContent.includes('fictional_tee')"), true);
      assert.equal(await evaluate("document.querySelector('#estimate').textContent.includes('$29.50')"), true);
      assert.equal(await evaluate("document.querySelector('button[aria-disabled=true]').disabled"), true);
      assert.equal(await evaluate("document.querySelector('#recover').disabled"), true);
    });
    await t.test('snapshot restore and shopper switch', async () => {
      await evaluate("document.querySelector('#save').click()");
      assert.equal(await evaluate("document.querySelector('#recover').disabled"), false);
      await evaluate("document.querySelector('#add-hoodie').click()");
      assert.equal(await evaluate("document.querySelector('#items').children.length"), 2);
      await evaluate("document.querySelector('#recover').click()");
      assert.equal(await evaluate("document.querySelector('#items').children.length"), 1);
      await evaluate("document.querySelector('#shopper').value='guest';document.querySelector('#shopper').dispatchEvent(new Event('change',{bubbles:true}))");
      assert.equal(await evaluate("document.querySelector('#items').textContent.includes('Cart is empty')"), true);
      assert.equal(await evaluate("document.querySelector('#recover').disabled"), true);
    });
    await t.test('unsupported shipping refuses checkout', async () => {
      await evaluate("document.querySelector('#add-tee').click()");
      await evaluate("document.querySelector('#country').value='GB';document.querySelector('#country').dispatchEvent(new Event('change',{bubbles:true}))");
      assert.equal(await evaluate("document.querySelector('#estimate').textContent.includes('Checkout unavailable')"), true);
      assert.equal(await evaluate("document.querySelector('#estimate').textContent.includes('no delivery promise')"), true);
    });
    await t.test('keyboard Tab navigates controls and cart updates retain focus', async () => {
      await evaluate("document.querySelector('#shopper').value='returning';document.querySelector('#shopper').dispatchEvent(new Event('change',{bubbles:true}))");
      await evaluate("document.querySelector('#items button[aria-label^=Add]').focus()");
      const before=await evaluate("document.activeElement.getAttribute('aria-label')");
      assert.match(before,/^Add one/);
      await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      assert.notEqual(await evaluate("document.activeElement.getAttribute('aria-label')"),before);
      assert.equal(await evaluate("document.activeElement.tagName"),'BUTTON');
      await evaluate("document.querySelector('#items button[aria-label^=Add]').focus()");
      await evaluate("document.activeElement.click()");
      const cartText=await evaluate("document.querySelector('#items').textContent");
      assert.match(cartText,/× 2/);
      assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"),before);
      assert.equal(await evaluate("document.querySelector('#estimate').getAttribute('aria-live')"),'polite');
    });
    await t.test('quantity buttons keep 48px hit targets, spacing, and accessible grouping', async () => {
      await evaluate("document.querySelector('#shopper').value='returning';document.querySelector('#shopper').dispatchEvent(new Event('change',{bubbles:true}))");
      const geometry=await evaluate("(()=>{const buttons=[...document.querySelectorAll('.quantity-controls button')];const a=buttons[0].getBoundingClientRect(),b=buttons[1].getBoundingClientRect();return {count:buttons.length,aW:a.width,aH:a.height,bW:b.width,bH:b.height,gap:b.left-a.right,group:buttons[0].parentElement.getAttribute('role'),label:buttons[0].parentElement.getAttribute('aria-label')}})()");
      assert.equal(geometry.count,2);
      assert.equal(geometry.group,'group');
      assert.match(geometry.label,/fictional_tee/);
      assert.ok(geometry.aW>=48 && geometry.aH>=48 && geometry.bW>=48 && geometry.bH>=48,JSON.stringify(geometry));
      assert.ok(geometry.gap>=8,JSON.stringify(geometry));
    });
    await t.test('error feedback is announced and never activates payment', async () => {
      const result=await evaluate("(()=>{const status=document.querySelector('#status');const controls=document.querySelector('.quantity-controls');const prior=status.textContent;const title=document.querySelector('button[aria-disabled=true]');const cart=controls.parentElement.textContent;return {live:status.getAttribute('aria-live'),atomic:status.getAttribute('aria-atomic'),paymentDisabled:title.disabled,cart,prior}})()");
      assert.equal(result.live,'polite');
      assert.equal(result.atomic,'true');
      assert.equal(result.paymentDisabled,true);
    });
    await t.test('cart limit errors are announced without changing the saved quantity', async () => {
      await evaluate("document.querySelector('#shopper').value='returning';document.querySelector('#shopper').dispatchEvent(new Event('change',{bubbles:true}))");
      await evaluate("for(let i=0;i<9;i++)document.querySelector('#add-tee').click()");
      assert.match(await evaluate("document.querySelector('#items').textContent"),/× 10/);
      await evaluate("document.querySelector('#add-tee').click()");
      assert.match(await evaluate("document.querySelector('#items').textContent"),/× 10/);
      const feedback=await evaluate("({message:document.querySelector('#status').textContent,kind:document.querySelector('#status').dataset.kind,live:document.querySelector('#status').getAttribute('aria-live'),disabled:document.querySelector('button[aria-disabled=true]').disabled})");
      assert.equal(feedback.kind,'error');
      assert.equal(feedback.live,'polite');
      assert.match(feedback.message,/Fictional cart limit reached/);
      assert.equal(feedback.disabled,true);
      await evaluate("document.querySelector('#items button[aria-label^=Remove]').click()");
      assert.match(await evaluate("document.querySelector('#items').textContent"),/× 9/);
      assert.equal(await evaluate("document.querySelector('#status').dataset.kind"),'info');
      assert.equal(await evaluate("document.querySelector('#items button[aria-label^=Add]').disabled"),false);
    });
    await t.test('Chromium accessibility tree exposes controls and status, without claiming real screen-reader verification', async () => {
      await send('Accessibility.enable');
      const response=await send('Accessibility.getFullAXTree');
      const nodes=response.nodes.filter(n=>!n.ignored);
      const roles=nodes.map(n=>n.role?.value);
      const names=nodes.map(n=>n.name?.value);
      assert.ok(roles.includes('button'));
      assert.ok(names.some(n=>typeof n==='string'&&n.includes('Add sample tee')));
      assert.ok(names.some(n=>typeof n==='string'&&n.includes('Payment disabled')));
      assert.ok(names.some(n=>typeof n==='string'&&n.includes('Quantity controls for fictional_tee')));
      assert.equal(await evaluate("document.querySelector('#status').getAttribute('aria-live')"),'polite');
    });
    await t.test('cart max disables increment and maintains keyboard focus on a usable decrement', async () => {
      await evaluate("document.querySelector('#shopper').value='returning';document.querySelector('#shopper').dispatchEvent(new Event('change',{bubbles:true}))");
      await evaluate("for(let i=0;i<8;i++)document.querySelector('#add-tee').click()");
      await evaluate("document.querySelector('#items button[aria-label^=Add]').focus()");
      await evaluate("document.activeElement.click()");
      assert.match(await evaluate("document.querySelector('#items').textContent"),/× 10/);
      assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"),'Remove one fictional_tee');
      assert.equal(await evaluate("document.querySelector('#items button[aria-label^=Add]').disabled"),true);
      await evaluate("document.activeElement.click()");
      assert.match(await evaluate("document.querySelector('#items').textContent"),/× 9/);
    });
    await t.test('removing final fictional item restores focus to Add sample control', async () => {
      await evaluate("document.querySelector('#shopper').value='returning';document.querySelector('#shopper').dispatchEvent(new Event('change',{bubbles:true}))");
      await evaluate("document.querySelector('#items button[aria-label^=Remove]').focus()");
      await evaluate("document.activeElement.click()");
      assert.equal(await evaluate("document.querySelector('#items').textContent"),'Cart is empty');
      assert.equal(await evaluate("document.activeElement.id"),'add-tee');
      assert.match(await evaluate("document.querySelector('#status').textContent"),/Fictional cart is empty/);
      assert.match(await evaluate("document.querySelector('#estimate').textContent"),/Checkout unavailable/);
      assert.equal(await evaluate("document.querySelector('button[aria-disabled=true]').disabled"),true);
      await evaluate("document.activeElement.click()");
      assert.match(await evaluate("document.querySelector('#items').textContent"),/× 1/);
    });
    await t.test('unsupported fictional shipping destination can be corrected safely', async () => {
      await evaluate("document.querySelector('#country').value='GB';document.querySelector('#country').dispatchEvent(new Event('change',{bubbles:true}))");
      assert.match(await evaluate("document.querySelector('#estimate').textContent"),/Checkout unavailable/);
      await evaluate("document.querySelector('#country').value='CA';document.querySelector('#country').dispatchEvent(new Event('change',{bubbles:true}))");
      assert.match(await evaluate("document.querySelector('#estimate').textContent"),/before tax/);
      assert.equal(await evaluate("document.querySelector('button[aria-disabled=true]').disabled"),true);
    });
    await t.test('shopper switch clears snapshot and keeps the new fictional cart isolated', async () => {
      await evaluate("document.querySelector('#shopper').value='returning';document.querySelector('#shopper').dispatchEvent(new Event('change',{bubbles:true}))");
      await evaluate("document.querySelector('#save').click()");
      assert.equal(await evaluate("document.querySelector('#recover').disabled"),false);
      await evaluate("document.querySelector('#shopper').focus()");
      await evaluate("document.querySelector('#shopper').value='guest';document.querySelector('#shopper').dispatchEvent(new Event('change',{bubbles:true}))");
      assert.equal(await evaluate("document.querySelector('#recover').disabled"),true);
      assert.equal(await evaluate("document.querySelector('#items').textContent"),'Cart is empty');
      assert.equal(await evaluate("document.activeElement.id"),'shopper');
      assert.match(await evaluate("document.querySelector('#status').textContent"),/Previous shopper cart and saved snapshot cleared/);
      await evaluate("document.querySelector('#shopper').value='returning';document.querySelector('#shopper').dispatchEvent(new Event('change',{bubbles:true}))");
      assert.equal(await evaluate("document.querySelector('#recover').disabled"),true);
      assert.match(await evaluate("document.querySelector('#items').textContent"),/fictional_tee/);
      assert.equal(await evaluate("document.querySelector('button[aria-disabled=true]').disabled"),true);
    });
    await t.test('invalid shopper selection fails closed without wiping current fictional state', async () => {
      await evaluate("document.querySelector('#shopper').value='returning';document.querySelector('#shopper').dispatchEvent(new Event('change',{bubbles:true}))");
      await evaluate("document.querySelector('#save').click()");
      await evaluate("document.querySelector('#shopper').value='not-a-real-fixture';document.querySelector('#shopper').dispatchEvent(new Event('change',{bubbles:true}))");
      assert.equal(await evaluate("document.querySelector('#shopper').value"),'returning');
      assert.equal(await evaluate("document.querySelector('#recover').disabled"),false);
      assert.match(await evaluate("document.querySelector('#status').textContent"),/rejected shopper switch/);
      assert.equal(await evaluate("document.querySelector('#status').dataset.kind"),'error');
    });
    await t.test('multi-item snapshot restores cart without overwriting fictional shipping selection', async () => {
      await evaluate("document.querySelector('#shopper').value='returning';document.querySelector('#shopper').dispatchEvent(new Event('change',{bubbles:true}))");
      await evaluate("document.querySelector('#add-hoodie').click();document.querySelector('#add-hoodie').click();document.querySelector('#save').click()");
      assert.equal(await evaluate("document.querySelector('#recover').disabled"),false);
      await evaluate("document.querySelector('#items button[aria-label^=Remove]').click()");
      await evaluate("document.querySelector('#country').value='US';document.querySelector('#country').dispatchEvent(new Event('change',{bubbles:true}))");
      await evaluate("document.querySelector('#recover').focus();document.activeElement.click()");
      const restored=await evaluate("({count:document.querySelector('#items').children.length,content:document.querySelector('#items').textContent,country:document.querySelector('#country').value,focus:document.activeElement.id,message:document.querySelector('#status').textContent,paymentDisabled:document.querySelector('button[aria-disabled=true]').disabled})");
      assert.equal(restored.count,2);
      assert.match(restored.content,/fictional_tee/);
      assert.match(restored.content,/fictional_hoodie/);
      assert.match(restored.content,/× 2/);
      assert.equal(restored.country,'US');
      assert.equal(restored.focus,'recover');
      assert.match(restored.message,/restored for this shopper only/);
      assert.equal(restored.paymentDisabled,true);
    });
    await t.test('switching fictional shopper clears multi-item snapshot and announces isolation', async () => {
      await evaluate("document.querySelector('#shopper').value='guest';document.querySelector('#shopper').dispatchEvent(new Event('change',{bubbles:true}))");
      assert.equal(await evaluate("document.querySelector('#recover').disabled"),true);
      assert.equal(await evaluate("document.querySelector('#items').textContent"),'Cart is empty');
      assert.match(await evaluate("document.querySelector('#status').textContent"),/Previous shopper cart and saved snapshot cleared/);
      await evaluate("document.querySelector('#shopper').value='returning';document.querySelector('#shopper').dispatchEvent(new Event('change',{bubbles:true}))");
      assert.equal(await evaluate("document.querySelector('#recover').disabled"),true);
      assert.equal(await evaluate("document.querySelector('#items').children.length"),1);
      assert.equal(await evaluate("document.querySelector('button[aria-disabled=true]').disabled"),true);
    });
    await t.test('invalid fictional snapshot rejects recovery, retains cart and announces error', async () => {
      await navigateFixture(url+'?fixtureErrors=1');
      for(let i=0;i<40;i++){
        if(await evaluate("document.querySelector('#items')?.children.length>0 && !!window.__gimLocalFixtureErrors"))break;
        await delay(50);
      }
      await evaluate("document.querySelector('#add-hoodie').click()");
      const before=await evaluate("document.querySelector('#items').textContent");
      await evaluate("window.__gimLocalFixtureErrors.invalid();document.querySelector('#recover').focus();document.activeElement.click()");
      assert.equal(await evaluate("document.querySelector('#items').textContent"),before);
      assert.equal(await evaluate("document.activeElement.id"),'recover');
      assert.equal(await evaluate("document.querySelector('#status').dataset.kind"),'error');
      assert.match(await evaluate("document.querySelector('#status').textContent"),/Cannot restore fictional cart/);
      assert.equal(await evaluate("document.querySelector('#status').getAttribute('aria-live')"),'polite');
      assert.equal(await evaluate("document.querySelector('button[aria-disabled=true]').disabled"),true);
    });
    await t.test('expired fictional snapshot fails closed and can be replaced with fresh local snapshot', async () => {
      const before=await evaluate("document.querySelector('#items').textContent");
      await evaluate("window.__gimLocalFixtureErrors.expired();document.querySelector('#recover').focus();document.activeElement.click()");
      assert.equal(await evaluate("document.querySelector('#items').textContent"),before);
      assert.equal(await evaluate("document.querySelector('#status').dataset.kind"),'error');
      assert.match(await evaluate("document.querySelector('#status').textContent"),/invalid, expired or belongs to another shopper/);
      await evaluate("document.querySelector('#save').click()");
      assert.equal(await evaluate("document.querySelector('#recover').disabled"),false);
      await evaluate("document.querySelector('#recover').focus();document.activeElement.click()");
      assert.match(await evaluate("document.querySelector('#status').textContent"),/restored for this shopper only/);
      assert.equal(await evaluate("document.querySelector('#status').dataset.kind"),'info');
      assert.equal(await evaluate("document.querySelector('button[aria-disabled=true]').disabled"),true);
    });
    await t.test('keyboard Tab reaches the snapshot controls and preserves checkout safety', async () => {
      await evaluate("document.querySelector('#save').focus()");
      await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      assert.equal(await evaluate("document.activeElement.id"),'recover');
      assert.equal(await evaluate("document.querySelector('button[aria-disabled=true]').disabled"),true);
    });
    await t.test('keyboard Tab and Shift+Tab traverse fictional shopper and cart controls', async () => {
      await navigateFixture();
      for(let i=0;i<40;i++){
        if(await evaluate("document.querySelector('#items')?.children.length>0 && !window.__gimLocalFixtureErrors"))break;
        await delay(50);
      }
      await evaluate("document.querySelector('#shopper').focus()");
      await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      assert.match(await evaluate("document.activeElement.getAttribute('aria-label')"),/Remove one fictional_tee/);
      await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
      assert.equal(await evaluate("document.activeElement.id"),'shopper');
      assert.equal(await evaluate("document.querySelector('button[aria-disabled=true]').disabled"),true);
    });
    await t.test('shopper switch resets recovery and preserves disabled payment after keyboard focus', async () => {
      await evaluate("document.querySelector('#save').focus();document.activeElement.click()");
      assert.equal(await evaluate("document.querySelector('#recover').disabled"),false);
      await evaluate("document.querySelector('#shopper').focus();document.querySelector('#shopper').value='guest';document.querySelector('#shopper').dispatchEvent(new Event('change',{bubbles:true}))");
      assert.equal(await evaluate("document.activeElement.id"),'shopper');
      assert.equal(await evaluate("document.querySelector('#recover').disabled"),true);
      assert.equal(await evaluate("document.querySelector('#items').textContent"),'Cart is empty');
      assert.match(await evaluate("document.querySelector('#status').textContent"),/saved snapshot cleared/);
      assert.equal(await evaluate("document.querySelector('#status').getAttribute('aria-live')"),'polite');
      assert.equal(await evaluate("document.querySelector('button[aria-disabled=true]').disabled"),true);
    });
    await t.test('fictional checkout review reflects cart, country and disabled production gates',async()=>{
      await navigateFixture();
      for(let i=0;i<40;i++){if(await evaluate("document.querySelector('#review-gates')?.children.length===6"))break;await delay(50)}
      assert.match(await evaluate("document.querySelector('#review-summary').textContent"),/estimated before tax/);
      assert.equal(await evaluate("document.querySelector('#review-gates').children.length"),6);
      assert.equal(await evaluate("document.querySelector('#review-gates').textContent.includes('Not enabled: Real payment authorization')"),true);
      await evaluate("document.querySelector('#add-hoodie').click()");
      assert.match(await evaluate("document.querySelector('#review-summary').textContent"),/2 fictional item/);
      await evaluate("document.querySelector('#country').value='GB';document.querySelector('#country').dispatchEvent(new Event('change',{bubbles:true}))");
      assert.match(await evaluate("document.querySelector('#review-summary').textContent"),/review unavailable/);
      assert.equal(await evaluate("document.querySelector('button[aria-disabled=true]').disabled"),true);
      await evaluate("document.querySelector('#country').value='CA';document.querySelector('#country').dispatchEvent(new Event('change',{bubbles:true}))");
      assert.match(await evaluate("document.querySelector('#review-summary').textContent"),/estimated before tax/);
      assert.equal(await evaluate("document.querySelector('button[aria-disabled=true]').disabled"),true);
    });
    await t.test('customer-facing fictional order lifecycle honors draft, pending, confirmation and cancellation',async()=>{
      await navigateFixture();
      for(let i=0;i<40;i++){if(await evaluate("document.querySelector('#journey-start') && !document.querySelector('#journey-start').disabled"))break;await delay(50)}
      assert.equal(await evaluate("document.querySelector('#journey-confirm').disabled"),true);
      await evaluate("document.querySelector('#journey-start').click()");
      assert.match(await evaluate("document.querySelector('#journey-state').textContent"),/Fictional review draft/);
      await evaluate("document.querySelector('#journey-pending').click()");
      assert.match(await evaluate("document.querySelector('#journey-state').textContent"),/payment pending/);
      assert.equal(await evaluate("document.querySelector('#journey-start').disabled"),false);
      await evaluate("document.querySelector('#journey-confirm').click()");
      assert.match(await evaluate("document.querySelector('#journey-state').textContent"),/confirmation \(no charge\)/);
      assert.equal(await evaluate("document.querySelector('#journey-cancel').disabled"),true);
      assert.equal(await evaluate("document.querySelector('button[aria-disabled=true]').disabled"),true);
      await evaluate("document.querySelector('#journey-start').click()");
      await evaluate("document.querySelector('#journey-cancel').click()");
      assert.match(await evaluate("document.querySelector('#journey-state').textContent"),/cancelled/);
      assert.equal(await evaluate("document.querySelector('#journey-pending').disabled"),true);
    });
    await t.test('fictional decline stays payment-disabled and rejects incompatible shipping',async()=>{
      await navigateFixture();
      assert.equal(await evaluate("document.querySelector('#journey-decline').disabled"),true);
      await evaluate("document.querySelector('#journey-start').click()");
      assert.equal(await evaluate("document.querySelector('#journey-decline').disabled"),true);
      await evaluate("document.querySelector('#journey-pending').click()");
      assert.equal(await evaluate("document.querySelector('#journey-decline').disabled"),false);
      await evaluate("document.querySelector('#journey-decline').click()");
      assert.match(await evaluate("document.querySelector('#journey-state').textContent"),/payment declined \(no charge\)/);
      assert.equal(await evaluate("document.querySelector('#journey-confirm').disabled"),true);
      assert.equal(await evaluate("document.querySelector('#journey-decline').disabled"),true);
      assert.equal(await evaluate("document.querySelector('button[aria-disabled=true]').disabled"),true);
      await evaluate("document.querySelector('#journey-start').click();document.querySelector('#journey-cancel').click()");
      assert.match(await evaluate("document.querySelector('#journey-state').textContent"),/checkout cancelled/);
      await evaluate("document.querySelector('#journey-start').click();document.querySelector('#country').value='GB';document.querySelector('#country').dispatchEvent(new Event('change',{bubbles:true}))");
      assert.match(await evaluate("document.querySelector('#journey-state').textContent"),/No fictional checkout review started/);
      assert.equal(await evaluate("document.querySelector('#journey-decline').disabled"),true);
    });
    await t.test('cart changes and shopper switches invalidate fictional lifecycle',async()=>{
      await evaluate("document.querySelector('#journey-start').click()");
      await evaluate("document.querySelector('#add-hoodie').click()");
      assert.match(await evaluate("document.querySelector('#journey-state').textContent"),/No fictional checkout review started/);
      assert.equal(await evaluate("document.querySelector('#journey-pending').disabled"),true);
      await evaluate("document.querySelector('#journey-start').click()");
      await evaluate("document.querySelector('#shopper').value='guest';document.querySelector('#shopper').dispatchEvent(new Event('change',{bubbles:true}))");
      assert.match(await evaluate("document.querySelector('#journey-state').textContent"),/No fictional checkout review started/);
      assert.equal(await evaluate("document.querySelector('#journey-start').disabled"),true);
      assert.equal(await evaluate("document.querySelector('button[aria-disabled=true]').disabled"),true);
    });
    await t.test('declined fictional payment allows fresh retry but never enables transactions',async()=>{
      await navigateFixture();
      await evaluate("document.querySelector('#journey-start').click();document.querySelector('#journey-pending').click();document.querySelector('#journey-decline').click()");
      assert.equal(await evaluate("document.querySelector('#journey-retry').disabled"),false);
      await evaluate("document.querySelector('#journey-retry').focus();document.activeElement.click()");
      assert.match(await evaluate("document.querySelector('#journey-state').textContent"),/Attempt 2 of 3/);
      assert.match(await evaluate("document.querySelector('#journey-state').textContent"),/Fictional review draft/);
      assert.equal(await evaluate("document.activeElement.id"),'journey-retry');
      await evaluate("document.querySelector('#journey-pending').click();document.querySelector('#journey-decline').click();document.querySelector('#journey-retry').click()");
      assert.match(await evaluate("document.querySelector('#journey-state').textContent"),/Attempt 3 of 3/);
      await evaluate("document.querySelector('#journey-pending').click();document.querySelector('#journey-decline').click()");
      assert.equal(await evaluate("document.querySelector('#journey-retry').disabled"),true);
      assert.equal(await evaluate("document.querySelector('button[aria-disabled=true]').disabled"),true);
    });
    await t.test('mobile responsive widths have no horizontal overflow and produce full-page screenshots', async () => {
      for (const width of [280, 320, 375, 414, 768]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: 740, deviceScaleFactor: 2, mobile: true });
        await delay(75);
        const metrics = await evaluate("({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})");
        assert.ok(metrics.scroll <= metrics.client + 1, JSON.stringify({ width, metrics }));
        const png=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
        const bytes=Buffer.from(png.data,'base64');
        assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
        assert.ok(bytes.length>1000);
        if(process.env.GIM_SCREENSHOT_DIR){
          await writeFile(join(process.env.GIM_SCREENSHOT_DIR,'checkout-'+width+'px.png'),bytes);
        }
      }
    });
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(ok => server.close(ok));
  }
});

