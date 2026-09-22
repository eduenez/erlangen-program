// Drive web/riemann-sphere.html in a real browser.
//
// This page's mathematics is checked elsewhere by replicating the shader on
// the CPU; what only a browser can establish is that the GLSL compiles and
// links on an actual driver, and that the per-pixel compositing of Sec. 3.6
// of `riemann-sphere-plan.md` really does put the plane in front of the
// sphere where it belongs and behind it where it belongs.  So the checks here
// are deliberately the ones that read pixels back off the canvas.
//
//   node scripts/test_riemann_html.js [--headed]
//
// --headed runs against the real GPU, which is the only way the frame-rate
// figure (criterion 11) means anything; headless falls back to SwiftShader,
// where the number is reported but not asserted.

let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('playwright is not installed; run `npm install` first.');
  process.exit(2);
}
const path = require('path');

const HEADED = process.argv.includes('--headed');
let ok = true;
const check = (label, pass, detail) => {
  console.log(`${pass ? 'OK  ' : 'FAIL'}  ${label}${detail ? '  (' + detail + ')' : ''}`);
  ok = ok && !!pass;
};

// Read pixels back off the WebGL canvas.  The drawing buffer is not preserved,
// so the copy has to happen in the same task as the draw: the page's own
// draw() is a top-level function declaration, hence a global, and calling it
// renders synchronously.
async function sample(page, pts) {
  return page.evaluate((pts) => {
    draw();
    const gl = document.getElementById('glcanvas');
    const t = document.createElement('canvas');
    t.width = gl.width; t.height = gl.height;
    const c = t.getContext('2d', { willReadFrequently: true });
    c.drawImage(gl, 0, 0);
    const clamp = (v, hi) => Math.max(0, Math.min(hi - 1, Math.round(v)));
    return pts.map(([x, y]) => {
      const d = c.getImageData(clamp(x, gl.width), clamp(y, gl.height), 1, 1).data;
      return [d[0], d[1], d[2]];
    });
  }, pts);
}
// A point of space to device pixels on the GL canvas.
async function at(page, p) {
  return page.evaluate((p) => {
    const q = sphere.project(sphere.camera(), p);
    return q ? [q.x * devicePixelRatio, q.y * devicePixelRatio] : null;
  }, p);
}
const spread = c => Math.max(...c) - Math.min(...c);
const diff = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

(async () => {
  const browser = await chromium.launch({ headless: !HEADED });
  const page = await browser.newPage({ viewport: { width: 1200, height: 820 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  await page.goto('file://' + path.resolve('web/riemann-sphere.html'));
  await page.waitForFunction('window.__ready === true', { timeout: 15000 });

  // ---- the shader reached a driver ----
  // A compile or link failure throws out of the top-level script, so __ready
  // would never be set and the throw would arrive as a pageerror.
  check('the page loads, so the shader compiled AND linked on a real driver',
        errors.length === 0, errors.join(' | ') || 'no console or page errors');
  const info = await page.evaluate(() => {
    const gl = document.getElementById('glcanvas').getContext('webgl2');
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return { ok: !!gl,
             renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
             nogl: document.getElementById('nogl').style.display };
  });
  check('WebGL2 is live and the fallback notice stays hidden',
        info.ok && info.nogl !== 'flex', info.renderer);

  // ---- something was actually drawn ----
  const centre = await at(page, [0, 0, 0]);
  const [bg, mid] = await sample(page, [[10, 10], centre]);
  check('the shader renders geometry, not a flat field',
        diff(bg, mid) > 20, `corner ${bg} vs sphere centre ${mid}`);

  // ---- criterion 3: the plane is composited per pixel, not per primitive ----
  // Two plane points at the same radius, so the plane's own decoration is
  // identical at both: one in front of the sphere, one behind it.  The one
  // behind must be seen through the sphere's two walls and so must shift
  // toward the sphere's cool hue; the one in front must not.
  await page.evaluate(() => { sphere.setCam(-1.02, 0.22, 4.3); sphere.setZ(1.55, 0.85); });
  const probe = await page.evaluate(() => {
    const cam = sphere.camera();
    const h = Math.hypot(cam.o[0], cam.o[1]);
    const ux = cam.o[0] / h, uy = cam.o[1] / h;        // horizontal, toward the camera
    const R = 2.45;
    return { front: [ ux * R,  uy * R, 0], behind: [-ux * R, -uy * R, 0] };
  });
  const pf = await at(page, probe.front), pb = await at(page, probe.behind);
  const [cf, cb] = await sample(page, [pf, pb]);
  const coolness = c => c[2] - c[0];                    // blue minus red
  check('criterion 3: the plane behind the sphere is seen through it, the plane in front is not',
        coolness(cb) > coolness(cf) + 12,
        `in front ${cf} (B-R ${coolness(cf)}), behind ${cb} (B-R ${coolness(cb)})`);
  check('criterion 3: and the two differ only by that passage, not wildly',
        diff(cf, cb) < 140, `max channel difference ${diff(cf, cb)}`);

  // ---- criterion 4: a marker on the far hemisphere stays visible through the glass ----
  const far = await page.evaluate(() => {
    sphere.setCam(-1.02, 0.40, 4.3); sphere.setZ(1.55, 0.85);
    const P = sphere.derived().P, o = sphere.camera().o;
    const n = Math.hypot(...o);
    return { P, far: (P[0]*o[0] + P[1]*o[1] + P[2]*o[2]) / n < 0 };
  });
  check('the test configuration really does put P on the far hemisphere', far.far);
  const pP = await at(page, far.P);
  const [atP, nearP] = await sample(page, [pP, [pP[0] + 34, pP[1]]]);
  check('criterion 4: P is plainly visible through the near wall',
        diff(atP, nearP) > 15, `P ${atP} vs the sphere beside it ${nearP}, difference ${diff(atP, nearP)}`);

  // ---- the mathematics, as the shipped page computes it ----
  const math = await page.evaluate(() => {
    const out = {};
    sphere.setSigma(-1); sphere.setZ(0, 0);   out.z0south = sphere.derived().P;
    sphere.setSigma(1);                        out.z0north = sphere.derived().P;
    sphere.setSigma(-1); sphere.setZ(0.6, 0.8); out.onCircle = sphere.derived().P;
    sphere.setZ(1.3, -0.7); const a = sphere.derived().P;
    sphere.setSigma(1);     const b = sphere.derived().P;
    out.flip = [a[0] - b[0], a[1] - b[1], a[2] + b[2]];
    sphere.setSigma(-1); sphere.reset();
    return out;
  });
  check('criterion 1: z = 0 gives the pole opposite the one projected from',
        JSON.stringify(math.z0south) === '[0,0,1]' && JSON.stringify(math.z0north) === '[0,0,-1]');
  check('criterion 7: |z| = 1 is fixed pointwise',
        Math.max(...math.onCircle.map((v, i) => Math.abs(v - [0.6, 0.8, 0][i]))) < 1e-12);
  check('criterion 6: toggling the pole negates Z alone',
        Math.max(...math.flip.map(Math.abs)) < 1e-12);

  // ---- real pointer input ----
  // The control panel and the mini-lesson sit over the canvas, and z can
  // project underneath one of them; put both away first so the pointer
  // reaches the overlay.
  await page.evaluate(() => {
    const n = document.getElementById('chkNotes');
    n.checked = false; n.dispatchEvent(new Event('change'));
    document.getElementById('panelHide').click();
  });
  const before = await page.evaluate(() => ({ ...sphere.state.z, az: sphere.state.cam.az }));
  const qz = await page.evaluate(() => {
    const q = sphere.project(sphere.camera(), sphere.derived().planePt); return [q.x, q.y];
  });
  await page.mouse.move(qz[0], qz[1]);
  await page.mouse.down();
  await page.mouse.move(qz[0] + 70, qz[1] + 40, { steps: 8 });
  await page.mouse.up();
  const after = await page.evaluate(() => ({ ...sphere.state.z, az: sphere.state.cam.az }));
  check('dragging z moves it, and does not orbit the camera',
        Math.hypot(after.re - before.re, after.im - before.im) > 0.05 &&
        Math.abs(after.az - before.az) < 1e-9,
        `z moved ${Math.hypot(after.re - before.re, after.im - before.im).toFixed(3)}`);
  const az0 = await page.evaluate(() => sphere.state.cam.az);
  await page.mouse.move(600, 700); await page.mouse.down();
  await page.mouse.move(770, 700, { steps: 8 }); await page.mouse.up();
  check('dragging empty space orbits the camera',
        Math.abs(await page.evaluate(() => sphere.state.cam.az) - az0) > 0.2);

  // ---- criterion 11: frames under a sustained orbit drag ----
  await page.evaluate(() => { sphere.reset(); });
  await page.evaluate(() => { window.__frames = 0;
    (function tick(){ window.__frames++; requestAnimationFrame(tick); })(); });
  await page.mouse.move(600, 400); await page.mouse.down();
  const t0 = Date.now();
  for (let i = 0; i < 60; i++) await page.mouse.move(600 + i * 4, 400 + (i % 12) * 3);
  const elapsed = (Date.now() - t0) / 1000;
  await page.mouse.up();
  const fps = (await page.evaluate(() => window.__frames)) / elapsed;
  const software = /swiftshader|llvmpipe|software/i.test(info.renderer);
  if (software) console.log(`      frame rate ${fps.toFixed(1)} fps under drag on ${info.renderer}` +
                            ` — software rendering, so criterion 11 is not asserted here`);
  else check('criterion 11: at least 30 fps under a sustained camera drag',
             fps >= 30, `${fps.toFixed(1)} fps on ${info.renderer}`);

  // ---- criterion 12: it runs with the network cut ----
  await page.route(/^https?:/, r => r.abort());   // not file://, which IS the page
  await page.reload();
  await page.waitForFunction('window.__ready === true', { timeout: 15000 });
  const [offline] = await sample(page, [centre]);
  check('criterion 12: the page still renders with every request blocked',
        spread(offline) > 3 || diff(offline, bg) > 20, `sphere centre ${offline}`);

  check('no console or page errors throughout', errors.length === 0, errors.join(' | '));
  await page.screenshot({ path: '/tmp/riemann-sphere.png' });
  await browser.close();
  console.log(ok ? '\nALL CHECKS PASSED' : '\nSOME CHECKS FAILED');
  process.exit(ok ? 0 : 1);
})();
