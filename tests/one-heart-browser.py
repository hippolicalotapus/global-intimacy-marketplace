"""Optional Chromium integration check: python tests/one-heart-browser.py site/one-heart-customization-preview.html
Requires playwright Python package and an installed Chromium browser. No network, deployment or payment.
"""
import json
import sys
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

html = Path(sys.argv[1]).read_text(encoding="utf-8")
with sync_playwright() as playwright:
    browser_path = shutil.which('chromium') or shutil.which('chromium-browser')
    options = {'headless': True}
    if browser_path:
        options.update(executable_path=browser_path, args=['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--single-process'])
    browser = playwright.chromium.launch(**options)
    page = browser.new_page()
    page.set_content(html, wait_until="load")
    results = page.evaluate(r"""() => {
      const $ = id => document.getElementById(id);
      const checks = [];
      const check = (name, ok) => checks.push({name, pass: Boolean(ok)});
      check('standard price', $('summary').textContent.includes('$74.99'));
      $('caption').value = 'Original Words';
      $('caption').dispatchEvent(new Event('input', {bubbles:true}));
      check('art preview', $('art').textContent.includes('Original Words'));
      $('request').click();
      let r = JSON.parse($('requestOutput').textContent);
      check('offline no payment', r.checkoutEnabled === false && r.orderCreated === false);
      check('selection recorded', r.request.text === 'Original Words');
      $('style').value = '8499';
      $('style').dispatchEvent(new Event('input', {bubbles:true}));
      check('stale request invalidated', $('requestOutput').textContent.includes('Selections changed'));
      check('premium price', $('summary').textContent.includes('$84.99'));
      $('request').click();
      r = JSON.parse($('requestOutput').textContent);
      check('premium request', r.request.style === 'premium');
      $('caption').value = 'bad\u007ftext';
      $('request').click();
      check('DEL rejected', $('requestOutput').textContent.includes('Invalid selections'));
      $('caption').value = 'bad\ntext';
      check('HTML text input strips newline', $('caption').value === 'badtext');
      return checks;
    }""")
    browser.close()
print(json.dumps(results, indent=2))
assert all(item["pass"] for item in results)
