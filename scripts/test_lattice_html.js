// Drive web/lattice-groups.html in a headless browser and check the
// mathematics and the interaction rules of the page.
//
// The page renders the tessellation on a WebGL2 canvas and the overlay on a
// Canvas-2D one, so the checks come in two kinds: state assertions made
// through the page's `lattice` console interface, and pixel assertions made
// by reading the WebGL canvas back.  The decisive property under test is that
// the coloring is constant on orbits: points differing by a group element
// must receive the identical color, since that is what makes the tiling
// faithful rather than merely repetitive.

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('playwright is not installed; run `npm install` first.');
  console.error('(If npm fails with UNABLE_TO_GET_ISSUER_CERT_LOCALLY, your network is');
  console.error(' intercepting TLS and npm needs to be pointed at the intercepting CA.)');
  process.exit(2);
}
const path = require('path');

let ok = true;

function check(label, got, expect) {
  const pass = got === expect;
  console.log(`${label}: got=${got} expect=${expect} ${pass ? 'OK' : 'MISMATCH'}`);
  ok = ok && pass;
  return pass;
}

function checkNear(label, got, expect, tol) {
  const pass = Math.abs(got - expect) <= tol;
  console.log(`${label}: got=${got} expect=${expect}±${tol} ${pass ? 'OK' : 'MISMATCH'}`);
  ok = ok && pass;
  return pass;
}

function checkTrue(label, pass, detail) {
  console.log(`${label}: ${pass ? 'OK' : 'MISMATCH'}${detail ? ' — ' + detail : ''}`);
  ok = ok && !!pass;
  return pass;
}

// Read back the WebGL canvas as a data URL, then sample pixels from it in the
// page (the WebGL context is created without preserveDrawingBuffer, so the
// sampling is done by re-drawing into a 2-D canvas immediately after a frame).
async function samplePixels(page, points) {
  return page.evaluate(async (pts) => {
    // Force a fresh frame, then copy the GL canvas before the compositor
    // discards its drawing buffer.
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const gl = document.getElementById('glcanvas');
    const tmp = document.createElement('canvas');
    tmp.width = gl.width; tmp.height = gl.height;
    tmp.getContext('2d').drawImage(gl, 0, 0);
    const c2 = tmp.getContext('2d');
    return pts.map(([x, y]) => {
      const d = c2.getImageData(Math.round(x), Math.round(y), 1, 1).data;
      return [d[0], d[1], d[2]];
    });
  }, points);
}

// Complex point -> device pixel coordinates on the GL canvas.
async function toDevicePx(page, zs) {
  return page.evaluate((zs) => {
    const st = window.lattice.state, vp = st.viewport;
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth, H = window.innerHeight;
    return zs.map(([re, im]) => [
      (W / 2 + (re - vp.cx) / vp.upp) * dpr,
      (H / 2 - (im - vp.cy) / vp.upp) * dpr,
    ]);
  }, zs);
}

const dist = (p, q) => Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2]));

(async () => {
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('pageerror: ' + err.message));

  const url = 'file://' + path.resolve('web/lattice-groups.html');
  await page.goto(url);
  await page.waitForFunction('window.__ready === true', { timeout: 10000 });

  // ---- WebGL2 must be available; the page must not have fallen back ----
  const glOk = await page.evaluate(
    "document.getElementById('nogl').style.display !== 'flex' && " +
    "!!document.getElementById('glcanvas').getContext('webgl2')");
  checkTrue('WebGL2 context available', glOk);

  // ---- defaults: the square lattice a = 1, b = i ----
  const st0 = await page.evaluate('JSON.parse(JSON.stringify(window.lattice.state))');
  check('default a.re', st0.a.re, 1);
  check('default a.im', st0.a.im, 0);
  check('default b.re', st0.b.re, 0);
  check('default b.im', st0.b.im, 1);

  // ---- the coloring is constant on orbits ----
  // Sample a point and several of its translates by m·a + n·b; all must carry
  // the identical color.  This is the property the whole lesson rests on.
  {
    const base = [0.37, 0.21];
    const shifts = [[0, 0], [1, 0], [0, 1], [2, -1], [-1, -2], [1, 1]];
    const pts = shifts.map(([m, n]) => [base[0] + m, base[1] + n]);
    const px = await toDevicePx(page, pts);
    const cols = await samplePixels(page, px);
    const worst = Math.max(...cols.slice(1).map(c => dist(cols[0], c)));
    checkTrue('square lattice: color constant on the orbit', worst <= 2,
      `max channel deviation ${worst} over ${shifts.length} translates`);
  }

  // ---- a sheared lattice: same test, non-orthogonal generators ----
  await page.evaluate('window.lattice.setA(1.3, 0.4); window.lattice.setB(-0.5, 1.1)');
  {
    const A = [1.3, 0.4], B = [-0.5, 1.1], base = [0.12, -0.33];
    const shifts = [[0, 0], [1, 0], [0, 1], [-2, 1], [1, -1], [2, 2]];
    const pts = shifts.map(([m, n]) => [base[0] + m * A[0] + n * B[0],
                                        base[1] + m * A[1] + n * B[1]]);
    const px = await toDevicePx(page, pts);
    const cols = await samplePixels(page, px);
    const worst = Math.max(...cols.slice(1).map(c => dist(cols[0], c)));
    checkTrue('sheared lattice: color constant on the orbit', worst <= 2,
      `max channel deviation ${worst} over ${shifts.length} translates`);
  }

  // ---- distinct orbits get distinct colors ----
  {
    const pts = [[0.15, 0.15], [0.55, 0.35], [0.85, 0.75]];
    await page.evaluate('window.lattice.setA(1, 0); window.lattice.setB(0, 1)');
    const px = await toDevicePx(page, pts);
    const cols = await samplePixels(page, px);
    let minSep = Infinity;
    for (let i = 0; i < cols.length; i++)
      for (let j = i + 1; j < cols.length; j++) minSep = Math.min(minSep, dist(cols[i], cols[j]));
    checkTrue('distinct orbits get distinct colors', minSep >= 10,
      `min channel separation ${minSep}`);
  }

  // ---- collinearity is refused ----
  await page.evaluate('window.lattice.setA(1, 0); window.lattice.setB(2, 0)');
  {
    const b = await page.evaluate('window.lattice.state.b');
    const sinAngle = Math.abs(b.im) / Math.hypot(b.re, b.im);
    checkTrue('b dragged onto the line through a is pushed off', sinAngle > 0.05,
      `|sin∠(a,b)| = ${sinAngle.toFixed(4)}`);
    checkNear('refused b keeps its length', Math.hypot(b.re, b.im), 2, 1e-9);
  }

  // ---- snapping to zero, and the strip it produces ----
  await page.evaluate('window.lattice.setA(1, 0); window.lattice.setB(0.02, 0.03)');
  {
    const b = await page.evaluate('window.lattice.state.b');
    check('b near 0 snaps to exactly 0 (re)', b.re, 0);
    check('b near 0 snaps to exactly 0 (im)', b.im, 0);
  }
  // With b = 0 the group is ⟨a⟩ = ⟨1⟩ and the tile is a vertical strip: the
  // color must now be constant along each vertical line, and still periodic
  // with period 1 horizontally.
  {
    const px = await toDevicePx(page, [[0.3, 0.0], [0.3, 1.7], [0.3, -2.2], [1.3, 0.9]]);
    const cols = await samplePixels(page, px);
    const alongStrip = Math.max(dist(cols[0], cols[1]), dist(cols[0], cols[2]));
    const acrossPeriod = dist(cols[0], cols[3]);
    checkTrue('strip: color constant along the direction of the strip', alongStrip <= 2,
      `max channel deviation ${alongStrip}`);
    checkTrue('strip: color repeats with period a', acrossPeriod <= 2,
      `max channel deviation ${acrossPeriod}`);
  }
  // The surviving generator may not itself be snapped away.
  await page.evaluate('window.lattice.setA(0.01, 0)');
  {
    const a = await page.evaluate('window.lattice.state.a');
    checkTrue('the sole surviving generator cannot be sent to 0',
      Math.hypot(a.re, a.im) > 0, `|a| = ${Math.hypot(a.re, a.im).toFixed(3)}`);
  }

  // ---- dragging: the anchor z₀ follows the pointer, generators stay put ----
  await page.evaluate('window.lattice.reset()');
  {
    const before = await page.evaluate('JSON.parse(JSON.stringify(window.lattice.state))');
    const start = (await page.evaluate(`(() => {
      const st = window.lattice.state, vp = st.viewport;
      return [window.innerWidth/2 + (st.z0.re - vp.cx)/vp.upp,
              window.innerHeight/2 - (st.z0.im - vp.cy)/vp.upp];
    })()`));
    await page.mouse.move(start[0], start[1]);
    await page.mouse.down();
    await page.mouse.move(start[0] + 120, start[1] - 80, { steps: 8 });
    await page.mouse.up();
    const after = await page.evaluate('JSON.parse(JSON.stringify(window.lattice.state))');
    const moved = Math.hypot(after.z0.re - before.z0.re, after.z0.im - before.z0.im);
    checkTrue('dragging z₀ moves the anchor', moved > 0.1, `moved ${moved.toFixed(3)}`);
    checkTrue('dragging z₀ leaves the generators untouched',
      after.a.re === before.a.re && after.a.im === before.a.im &&
      after.b.re === before.b.re && after.b.im === before.b.im);
  }

  // ---- the toggles and the one-parameter slider ----
  await page.click('#chkGroup');
  check('group-picture toggle', await page.evaluate('window.lattice.state.showGroup'), true);
  await page.click('#chkOrbit');
  check('orbit toggle', await page.evaluate('window.lattice.state.showOrbit'), false);
  await page.evaluate('window.lattice.setT(1.5)');
  checkNear('one-parameter time', await page.evaluate('window.lattice.state.t'), 1.5, 1e-9);

  // ---- no page or console errors throughout ----
  checkTrue('no console/page errors', errors.length === 0, JSON.stringify(errors));

  await page.evaluate('window.lattice.reset()');
  await page.screenshot({ path: '/tmp/lattice_groups.png' });
  await browser.close();
  console.log(ok ? '\nALL CHECKS PASSED' : '\nSOME CHECKS FAILED');
  process.exit(ok ? 0 : 1);
})();
