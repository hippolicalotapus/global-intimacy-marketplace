import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
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
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + dir, 'about:blank'
  ], { stdio: 'ignore' });
  try {
    let port;
    for (let i = 0; i < 70; i++) {
      if (chrome.exitCode !== null) throw Error('Chrome exited before startup');
      try { port = Number((await readFile(join(dir, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); } catch {}
      if (port) break;
      await delay(100);
    }
    if (!port) throw Error('Chrome DevTools endpoint unavailable');
    const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    const target = targets.find(x => x.type === 'page');
    if (!target) throw Error('Chrome tab unavailable');
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((ok, reject) => {
      socket.addEventListener('open', ok, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
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
      return new Promise((resolve, reject) => {
        const id = ++seq;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
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
      socket.close(); chrome.kill(); await rm(dir, { recursive: true, force: true });
    } };
  } catch (error) {
    chrome.kill(); await rm(dir, { recursive: true, force: true });
    throw error;
  }
}
test('offline checkout renders and responds in a real Chrome browser', { timeout: 30000 }, async t => {
  const { server, url } = await startFixture();
  let browser;
  try {
    browser = await chromeSession(url);
    const { evaluate, send } = browser;
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
    await t.test('mobile 320px and 375px widths have no horizontal overflow', async () => {
      for (const width of [320, 375]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: 740, deviceScaleFactor: 2, mobile: true });
        await delay(75);
        const metrics = await evaluate("({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})");
        assert.ok(metrics.scroll <= metrics.client + 1, JSON.stringify({ width, metrics }));
      }
    });
  } finally {
    if (browser) await browser.close();
    await new Promise(ok => server.close(ok));
  }
});
