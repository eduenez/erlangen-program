const { chromium } = require('playwright');
const path = require('path');

async function setRange(page, id, value) {
  await page.evaluate(([id, value]) => {
    const el = document.getElementById(id);
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, [id, value]);
}

function check(label, got, expect) {
  const ok = got === expect;
  console.log(`${label}: got=${got} expect=${expect} ${ok ? 'OK' : 'MISMATCH'}`);
  return ok;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('pageerror: ' + err.message));

  const url = 'file://' + path.resolve('web/lattice-groups.html');
  await page.goto(url);
  await page.waitForFunction('window.__ready === true', { timeout: 10000 });

  let ok = true;

  // default: two generators, square, N=3 -> 49 lattice points, 48 nonzero vectors
  ok &= check('default arrows (square,N=3)', await page.evaluate('window.__lastArrowCount'), 48);
  ok &= check('default copies (square,N=3)', await page.evaluate('window.__lastCopyCount'), 49);

  // hexagonal
  await page.selectOption('#preset', 'hexagonal');
  ok &= check('hex arrows', await page.evaluate('window.__lastArrowCount'), 48);
  ok &= check('hex copies', await page.evaluate('window.__lastCopyCount'), 49);

  // one generator
  await page.selectOption('#mode', 'one');
  ok &= check('cyclic arrows (N=3)', await page.evaluate('window.__lastArrowCount'), 6);
  ok &= check('cyclic copies (N=3)', await page.evaluate('window.__lastCopyCount'), 7);

  const presetHidden = await page.evaluate("document.getElementById('row-preset').classList.contains('hidden')");
  console.log('preset row hidden when mode=one:', presetHidden, presetHidden ? 'OK' : 'MISMATCH');
  ok &= presetHidden;

  // back to two generators, custom, N=2
  await page.selectOption('#mode', 'two');
  await page.selectOption('#preset', 'custom');
  await setRange(page, 'v1len', '1.0'); await setRange(page, 'v1ang', '0');
  await setRange(page, 'v2len', '1.0'); await setRange(page, 'v2ang', '90');
  await setRange(page, 'nrange', '2');
  ok &= check('custom square-equiv arrows', await page.evaluate('window.__lastArrowCount'), 24);
  ok &= check('custom square-equiv copies', await page.evaluate('window.__lastCopyCount'), 25);

  // --- drag test: drag the anchor, check offset preserved, then change a slider
  //     and confirm the anchor position PERSISTS (not reset to its initial spot) ---
  await page.locator('#jxgbox-orbit').scrollIntoViewIfNeeded();
  const box = await page.locator('#jxgbox-orbit').boundingBox();
  const bb = [-6, 6, 6, -6]; // left, top, right, bottom in user coords
  const toPx = (x, y) => ({
    px: box.x + ((x - bb[0]) / (bb[2] - bb[0])) * box.width,
    py: box.y + ((bb[1] - y) / (bb[1] - bb[3])) * box.height
  });
  const getAnchorPos = () => page.evaluate(() => [anchor.X(), anchor.Y()]);
  const start = await getAnchorPos();
  console.log('anchor start:', start.map(v => v.toFixed(2)));

  const p0 = toPx(start[0], start[1]);
  const p1 = toPx(2.5, 2.0);
  await page.mouse.move(p0.px, p0.py);
  await page.mouse.down();
  await page.mouse.move(p1.px, p1.py, { steps: 10 });
  await page.mouse.up();
  const afterDrag = await getAnchorPos();
  console.log('anchor after drag (target ~2.5,2.0):', afterDrag.map(v => v.toFixed(2)));

  // now change a slider (triggers full redraw/rebuild of polygons) and confirm anchor unchanged
  await setRange(page, 'nrange', '4');
  const afterSliderChange = await getAnchorPos();
  const preserved = Math.abs(afterSliderChange[0] - afterDrag[0]) < 1e-6 &&
                     Math.abs(afterSliderChange[1] - afterDrag[1]) < 1e-6;
  console.log('anchor preserved after slider change:', preserved, preserved ? 'OK' : 'MISMATCH');
  ok &= preserved;

  // confirm a polygon's vertex actually tracks the dragged anchor + its offset
  const vertCheck = await page.evaluate(() => {
    const poly = currentOrbitPolys[0];
    return [poly.vertices[0].X() - anchor.X(), poly.vertices[0].Y() - anchor.Y()];
  });
  console.log('first polygon vertex offset from anchor (should be a fixed MOTIF+lattice offset, unchanged by drag):', vertCheck.map(v => v.toFixed(3)));

  console.log('console/page errors:', JSON.stringify(errors, null, 2));
  ok &= errors.length === 0;

  await page.screenshot({ path: '/tmp/refined_full.png', fullPage: true });
  await browser.close();
  console.log(ok ? '\nALL CHECKS PASSED' : '\nSOME CHECKS FAILED');
  process.exit(ok ? 0 : 1);
})();
