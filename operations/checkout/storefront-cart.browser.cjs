'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../../site');

test('real storefront navigation reaches a styled, inert cart at desktop and mobile widths',async()=>{
  const policy=(await readFile(path.join(root,'../netlify.toml'),'utf8')).match(/Content-Security-Policy = "([^"]+)"/)[1];
  const server=createServer(async(req,res)=>{
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      const filename=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
      if(!filename.startsWith(root+path.sep)){res.writeHead(403).end();return;}
      const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
      const content=await readFile(filename);
      res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Content-Security-Policy':policy});
      res.end(content);
    }catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
    const origin='http://127.0.0.1:'+server.address().port;
    for(const width of [1440,1024,768,375,320]){
      const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'});
      try{
        const page=await context.newPage(),errors=[],violations=[],mutations=[];
        page.on('pageerror',e=>errors.push(e.message));
        page.on('console',m=>{if(/content security policy/i.test(m.text()))violations.push(m.text());});
        page.on('request',r=>{if(r.method()!=='GET')mutations.push(r.method()+' '+r.url());});
        await page.goto(origin+'/index.html');
        await page.locator('#ageYes').click();
        await page.locator('#rubySkip').click();
        await page.locator('#countrySelect').selectOption('CA');
        await page.locator('#enterCountry').click();
        await page.locator('#previewMode').check();
        await page.locator('#searchInput').fill('Three Sisters');
        await page.locator('#storeSearchForm').evaluate(form=>form.requestSubmit());
        await page.locator('#productGrid [data-detail="201"]').click();
        const dialog=page.locator('#productDialog');
        assert.equal(await dialog.isVisible(),true);
        const body=page.locator('#modalBody');
        await body.evaluate(node=>{node.scrollTop=node.scrollHeight;});
        assert.ok(await body.evaluate(node=>node.scrollTop>0),'long hoodie details scroll within the content at '+width);
        const close=page.getByRole('button',{name:'Close product details'});
        const closeBox=await close.boundingBox(),dialogBox=await dialog.boundingBox();
        assert.ok(closeBox&&closeBox.width>=44&&closeBox.height>=44,'close target stays available at '+width);
        assert.ok(closeBox.y>=dialogBox.y&&closeBox.y+closeBox.height<=dialogBox.y+dialogBox.height,'close remains inside visible dialog after scrolling at '+width);
        assert.equal(await body.evaluate(node=>node.scrollWidth<=node.clientWidth),true,'detail actions fit without sideways scrolling at '+width);
        for(const action of await page.locator('.modal-controls .button').all()){
          const rect=await action.boundingBox();
          assert.ok(rect.x>=dialogBox.x&&rect.x+rect.width<=dialogBox.x+dialogBox.width,'detail action fits dialog at '+width);
        }
        await close.click();
        assert.equal(await dialog.isVisible(),false);
        const cart=page.getByRole('link',{name:'View cart (purchases not yet available)',exact:true});
        assert.equal(await cart.isVisible(),true,'cart link visible at '+width);
        const box=await cart.boundingBox();
        assert.ok(box.x>=0&&box.x+box.width<=width&&box.height>=42,'cart target fits viewport at '+width);
        await cart.click();
        await page.waitForURL(origin+'/cart.html');
        assert.equal(await page.getByRole('heading',{name:'Your cart',exact:true}).isVisible(),true);
        assert.equal(await page.getByRole('button',{name:'Checkout unavailable'}).isDisabled(),true);
        assert.match(await page.getByRole('status').innerText(),/Nothing will be charged or ordered/);
        assert.equal(await page.locator('form,script,input[type="email"],input[autocomplete="cc-number"]').count(),0);
        assert.equal(await page.locator('.cart-empty').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(255, 255, 255)');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'cart has no horizontal overflow at '+width);
        if(process.env.CART_TEST_ARTIFACT_DIR){
          await mkdir(process.env.CART_TEST_ARTIFACT_DIR,{recursive:true});
          await page.screenshot({path:path.join(process.env.CART_TEST_ARTIFACT_DIR,'cart-'+width+'.png'),fullPage:true});
        }
        await page.getByRole('link',{name:'Continue exploring'}).click();
        await page.waitForURL(origin+'/index.html');
        assert.equal(await page.locator('#rubyWelcome').isVisible(),true,'Ruby Heart still replays after returning');
        await page.locator('#rubySkip').click();
        assert.equal(await page.locator('#countryCurrent').innerText(),'Country: Canada · Change');
        assert.deepEqual(errors,[],'no JavaScript errors at '+width);
        assert.deepEqual(violations,[],'production CSP supports cart styles at '+width);
        assert.deepEqual(mutations,[],'no purchase or data submission at '+width);
      }finally{await context.close();}
    }
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
