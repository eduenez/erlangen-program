const { chromium } = require('playwright');
const path = require('path');

async function setRange(page, id, value) {
  await page.evaluate(([id, value]) => {
    const el = document.getElementById(id);
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, [id, value]);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
  const url = 'file://' + path.resolve('web/lattice-groups.html');
  await page.goto(url);
  await page.waitForFunction('window.__ready === true');

  await page.locator('#jxgbox').screenshot({ path: '/tmp/state_square.png' });

  await page.selectOption('#preset', 'hexagonal');
  await page.locator('#jxgbox').screenshot({ path: '/tmp/state_hex.png' });

  await page.selectOption('#preset', 'custom');
  await setRange(page, 'v1ang', '20');
  await setRange(page, 'v2ang', '35');
  await page.locator('#jxgbox').screenshot({ path: '/tmp/state_near_parallel.png' });

  await browser.close();
})();
