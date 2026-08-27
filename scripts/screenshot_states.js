// Capture a few representative states of web/lattice-groups.html, for use in
// slides and handouts.  Screenshots land in /tmp.

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('playwright is not installed; run `npm install` first.');
  process.exit(2);
}
const path = require('path');

const STATES = [
  { name: 'square',   a: [1, 0],     b: [0, 1],      note: 'the square lattice' },
  { name: 'hexagonal', a: [1, 0],    b: [0.5, Math.sqrt(3) / 2], note: 'the hexagonal lattice' },
  { name: 'sheared',  a: [1.3, 0.4], b: [-0.5, 1.1], note: 'a slanted lattice' },
  { name: 'strip',    a: [1, 0],     b: [0, 0],      note: 'b = 0: the cyclic group, a strip' },
];

(async () => {
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  await page.goto('file://' + path.resolve('web/lattice-groups.html'));
  await page.waitForFunction('window.__ready === true');
  await page.click('#chkGroup');            // show the group picture as well

  for (const s of STATES) {
    await page.evaluate(([a, b]) => {
      window.lattice.setA(a[0], a[1]);
      window.lattice.setB(b[0], b[1]);
    }, [s.a, s.b]);
    await new Promise(r => setTimeout(r, 120));
    const out = `/tmp/lattice_${s.name}.png`;
    await page.screenshot({ path: out });
    console.log(`${out}  —  ${s.note}`);
  }

  await browser.close();
})();
