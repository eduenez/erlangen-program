// Drive web/spiral-groups.html in a real browser.
//
// This page carries the most intricate shader of the three, and two of its
// claims can only be settled by reading pixels back:
//
//   * that the branch cut of arg(z) leaves NO seam.  The per-pixel computation
//     takes the logarithm, whose imaginary part jumps by 2*pi across the
//     negative real axis; that jump is n*tau, a lattice vector, so the orbit
//     coordinates are unchanged and the colouring is continuous across it.
//     The page computes the coordinates' screen footprints analytically for
//     exactly this reason -- fwidth() would spike on the cut and draw a
//     spurious meridian.
//   * that dragging the generator a across the negative real axis does not
//     make the colouring jump.  arg(a) is accumulated by continuity rather
//     than recomputed as a principal value (Sec. 3.5 of spiral-groups-plan.md).
//
//   node scripts/test_spiral_html.js [--headed]

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
const dist = (p, q) => Math.max(...p.map((v, i) => Math.abs(v - q[i])));

// The drawing buffer is not preserved, so the copy must happen in the same
// task as the draw; the page's draw() is a top-level declaration, hence global.
async function samplePixels(page, pts) {
  return page.evaluate((pts) => {
    draw();
    const gl = document.getElementById('glcanvas');
    const t = document.createElement('canvas');
    t.width = gl.width; t.height = gl.height;
    const c = t.getContext('2d', { willReadFrequently: true });
    c.drawImage(gl, 0, 0);
    const cl = (v, hi) => Math.max(0, Math.min(hi - 1, Math.round(v)));
    return pts.map(([x, y]) => {
      const d = c.getImageData(cl(x, gl.width), cl(y, gl.height), 1, 1).data;
      return [d[0], d[1], d[2]];
    });
  }, pts);
}
// Complex points to device pixels, through the page's own toPx.
async function toDev(page, zs) {
  return page.evaluate((zs) => zs.map(([re, im]) => {
    const q = toPx({ re, im });
    return [q.x * devicePixelRatio, q.y * devicePixelRatio];
  }), zs);
}
// Sampling lands on rounded pixel centres, so a fixed tolerance would be a
// guess; calibrate against the colour gradient measured at the points
// themselves.  The calibration must cover EVERY sample, not just the first:
// on this page the tiles shrink geometrically toward the origin, so the same
// half-pixel of rounding costs several times as much colour at small |z| as
// at large.
async function tolerance(page, devPts) {
  const pts = [].concat(...devPts.map(p => [p, [p[0] + 1, p[1]], [p[0], p[1] + 1]]));
  const c = await samplePixels(page, pts);
  let g = 0;
  for (let i = 0; i < c.length; i += 3)
    g = Math.max(g, dist(c[i], c[i + 1]), dist(c[i], c[i + 2]));
  return Math.max(3, Math.ceil(1.6 * g));
}

(async () => {
  const browser = await chromium.launch({ headless: !HEADED });
  const page = await browser.newPage({ viewport: { width: 1100, height: 820 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  await page.goto('file://' + path.resolve('web/spiral-groups.html'));
  await page.waitForFunction('window.__ready === true', { timeout: 15000 });

  const info = await page.evaluate(() => {
    const gl = document.getElementById('glcanvas').getContext('webgl2');
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return { ok: !!gl, nogl: document.getElementById('nogl').style.display,
             renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) };
  });
  check('the page loads, so the shader compiled AND linked on a real driver',
        errors.length === 0, errors.join(' | ') || info.renderer);
  check('WebGL2 is live and the fallback notice stays hidden',
        info.ok && info.nogl !== 'flex');

  // ---- the branch cut leaves no seam ----
  // With a = 2 and n = 1 the fundamental region is the full annulus, the
  // v-family of curves is not drawn, and the colour depends on |z| alone.  So
  // the colour must be CONSTANT all the way round any circle whose radius is
  // not a power of two -- including where it crosses the negative real axis,
  // which is precisely where arg(z) jumps by 2*pi.
  await page.evaluate(() => { spiral.setA(2, 0); spiral.setN(1); });
  {
    const R = 1.5, ang = [];
    for (let k = 0; k < 24; k++) ang.push(-Math.PI + (k + 0.5) * (2 * Math.PI / 24));
    ang.push(Math.PI - 1e-6, -Math.PI + 1e-6);      // straddling the cut itself
    const pts = ang.map(t => [R * Math.cos(t), R * Math.sin(t)]);
    const dev = await toDev(page, pts);
    const cols = await samplePixels(page, dev);
    const tol = await tolerance(page, dev);
    const worst = Math.max(...cols.map(c => dist(cols[0], c)));
    check('n = 1: the colour is constant round a circle, so the branch cut leaves no seam',
          worst <= tol, `max deviation ${worst} over 26 angles, tolerance ${tol}`);
    // and specifically the two samples either side of the cut
    const a1 = cols[cols.length - 2], a2 = cols[cols.length - 1];
    check('the two samples straddling the negative real axis agree',
          dist(a1, a2) <= tol, `${a1} vs ${a2}, difference ${dist(a1, a2)}`);
  }
  // ---- n = 1: the annuli repeat exactly ----
  {
    const pts = [[1.2, 0.35], [2.4, 0.70], [0.6, 0.175]];   // |z| doubling: one annulus apart
    const dev = await toDev(page, pts);
    const cols = await samplePixels(page, dev);
    const tol = await tolerance(page, dev);
    check('n = 1: the colouring repeats identically from annulus to annulus',
          Math.max(dist(cols[0], cols[1]), dist(cols[0], cols[2])) <= tol,
          `deviations ${dist(cols[0], cols[1])} and ${dist(cols[0], cols[2])}, tolerance ${tol}`);
  }

  // ---- the colouring is constant on orbits (the property the lesson rests on) ----
  await page.evaluate(() => {
    spiral.setN(5);
    spiral.setA(1 + Math.cos(2 * Math.PI / 5), Math.sin(2 * Math.PI / 5));  // a = 1 + zeta
  });
  {
    const base = { re: 0.9 * Math.cos(0.8), im: 0.9 * Math.sin(0.8) };
    const pts = await page.evaluate((base) => {
      const dv = derived(), out = [];
      for (const [k, j] of [[0,0],[1,0],[-1,0],[0,1],[0,3],[1,2],[-1,4]]) {
        const w = cMul(groupElem(dv.alpha, k, j), base);
        out.push([w.re, w.im]);
      }
      return out;
    }, base);
    const dev = await toDev(page, pts);
    const cols = await samplePixels(page, dev);
    const tol = await tolerance(page, dev);
    const worst = Math.max(...cols.slice(1).map(c => dist(cols[0], c)));
    check('a = 1 + zeta, n = 5: the colour is constant on the orbit',
          worst <= tol, `max deviation ${worst} over 6 group elements, tolerance ${tol}`);
    // The pixel comparison above is dominated by rounding to pixel centres, and
    // its tolerance is correspondingly loose.  The sharp statement is about the
    // orbit coordinates themselves, which the shader derives per pixel: they
    // must be identical, not merely close, at every point of an orbit.
    const uvSpread = await page.evaluate((pts) => {
      const dv = derived();
      const uv = ([re, im]) => { const r = Math.hypot(re, im);
        const w = [Math.log(r), Math.atan2(im, re)];
        const u = dv.Minv[0]*w[0] + dv.Minv[1]*w[1], v = dv.Minv[2]*w[0] + dv.Minv[3]*w[1];
        const f = x => x - Math.floor(x);
        return [f(u), f(v)]; };
      const c = pts.map(uv);
      const circ = (a, b) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));
      return Math.max(...c.map(p => Math.max(circ(p[0], c[0][0]), circ(p[1], c[0][1]))));
    }, pts);
    check('and the orbit coordinates themselves agree exactly, not merely closely',
          uvSpread < 1e-12, `max deviation in (frac u, frac v) is ${uvSpread.toExponential(1)}`);
  }
  // ---- and distinct orbits are told apart ----
  {
    const pts = [[0.55, 0.25], [1.15, 0.30], [0.80, -0.95]];
    const dev = await toDev(page, pts);
    const cols = await samplePixels(page, dev);
    let sep = Infinity;
    for (let i = 0; i < cols.length; i++)
      for (let j = i + 1; j < cols.length; j++) sep = Math.min(sep, dist(cols[i], cols[j]));
    check('distinct orbits get distinct colours', sep >= 10, `min separation ${sep}`);
  }

  // ---- the n buttons: clicking box n must highlight box n ----
  // (This is a regression guard: the highlight was once off by one, because the
  // buttons share their container with the caption "Order n =".)
  {
    let bad = [];
    for (const n of [1, 4, 9, 12]) {
      await page.locator('#nButtons button').nth(n - 1).click();
      const r = await page.evaluate(() => ({
        n: spiral.state.n,
        sel: [...document.querySelectorAll('#nButtons button')]
               .filter(b => b.classList.contains('sel')).map(b => b.textContent) }));
      if (r.n !== n || r.sel.length !== 1 || r.sel[0] !== String(n)) bad.push(`${n}->${r.n}/${r.sel}`);
    }
    check('clicking box n selects n and highlights exactly box n', bad.length === 0, bad.join(' '));
  }

  // ---- the generator may not sit on the unit circle ----
  {
    const r = await page.evaluate(() => {
      spiral.setA(1, 0);
      return Math.hypot(spiral.state.a.re, spiral.state.a.im); });
    check('a is pushed off the unit circle', Math.abs(r - 1) >= 0.02 - 1e-12,
          `|a| = ${r.toFixed(4)}`);
  }
  // ---- arg(a) snaps to a multiple of pi, so a real generator is reachable ----
  {
    const r = await page.evaluate(() => {
      spiral.setA(2 * Math.cos(0.004), 2 * Math.sin(0.004));
      return { ...spiral.state.a }; });
    check('a near the real axis snaps to exactly real', r.im === 0, `a = ${r.re} + ${r.im}i`);
  }

  // ---- Sec. 3.5: dragging a across the negative real axis must not make the
  //      colouring jump.  arg(a) is accumulated, so it passes THROUGH pi rather
  //      than wrapping to -pi.
  await page.evaluate(() => {
    document.getElementById('panelHide').click();      // the panels cover a's position
    const c = document.getElementById('chkNotes'); c.checked = false;
    c.dispatchEvent(new Event('change'));
    spiral.setN(5); spiral.setA(-2, 0.2);
  });
  {
    const before = await page.evaluate(() => spiral.state.argA);
    const start = await page.evaluate(() => { const q = toPx(spiral.state.a); return [q.x, q.y]; });
    const end   = await page.evaluate(() => { const q = toPx({ re: -2, im: -0.2 }); return [q.x, q.y]; });
    // Probe a pixel in the middle of a tile, so that a boundary curve sweeping
    // across it as the tessellation shifts does not masquerade as a jump.
    const probe = await toDev(page, [await page.evaluate(() => {
      const dv = derived();
      const uv = z => { const r = Math.hypot(z.re, z.im), w = [Math.log(r), Math.atan2(z.im, z.re)];
        return [dv.Minv[0]*w[0] + dv.Minv[1]*w[1], dv.Minv[2]*w[0] + dv.Minv[3]*w[1]]; };
      for (let th = 0; th < 6.28; th += 0.05) {
        const z = { re: 1.35*Math.cos(th), im: 1.35*Math.sin(th) };
        const [a, b] = uv(z), fa = a - Math.floor(a), fb = b - Math.floor(b);
        if (fa > 0.35 && fa < 0.65 && fb > 0.35 && fb < 0.65) return [z.re, z.im];
      }
      return [1.35, 0];
    })]);
    const seq = [];
    await page.mouse.move(start[0], start[1]);
    await page.mouse.down();
    const N = 12;
    for (let i = 1; i <= N; i++) {
      await page.mouse.move(start[0] + (end[0] - start[0]) * i / N,
                            start[1] + (end[1] - start[1]) * i / N);
      seq.push((await samplePixels(page, probe))[0]);
    }
    await page.mouse.up();
    const after = await page.evaluate(() => ({ argA: spiral.state.argA,
                                               r: Math.hypot(spiral.state.a.re, spiral.state.a.im) }));
    check('arg(a) is accumulated across the cut, not wrapped to the principal value',
          after.argA > Math.PI, `arg(a) went ${before.toFixed(3)} -> ${after.argA.toFixed(3)}`
          + ` (the principal value would be ${(after.argA - 2 * Math.PI).toFixed(3)})`);
    check('and |a| is unchanged by the crossing', Math.abs(after.r - 2.01) < 0.02,
          `|a| = ${after.r.toFixed(3)}`);
    // What the page avoids: on the principal branch arg(a) would drop by 2*pi
    // here.  The lattice is unchanged by that (2*pi*i = n*tau), so the
    // tessellation would hold still while the COLOURING relabelled -- which is
    // precisely the artefact Sec. 3.5 exists to prevent.  Measure it, and
    // require the real drag to stay far below it.
    const relabel = await page.evaluate((p) => {
      const read = () => { draw();
        const gl = document.getElementById('glcanvas');
        const t = document.createElement('canvas'); t.width = gl.width; t.height = gl.height;
        const c = t.getContext('2d'); c.drawImage(gl, 0, 0);
        const d = c.getImageData(Math.round(p[0]), Math.round(p[1]), 1, 1).data;
        return [d[0], d[1], d[2]]; };
      const cont = read();
      spiral.state.argA -= 2 * Math.PI; const princ = read();
      spiral.state.argA += 2 * Math.PI;
      return Math.max(...cont.map((v, i) => Math.abs(v - princ[i])));
    }, probe[0]);
    const steps = seq.slice(1).map((c, i) => dist(seq[i], c));
    const worst = Math.max(...steps);
    // 20 levels out of 255 is a plainly visible shift; the point of the floor is
    // only to be sure the comparison below is measuring something real.
    check('a principal branch really would relabel the colouring here',
          relabel > 20, `it would jump by ${relabel} levels at this pixel`);
    check('the colouring does not relabel as a crosses the negative real axis',
          worst < 0.35 * relabel,
          `largest step ${worst} against a relabel of ${relabel}`);
  }

  // ---- frames under a sustained drag ----
  await page.evaluate(() => { window.__f = 0;
    (function t(){ window.__f++; requestAnimationFrame(t); })(); });
  await page.mouse.move(600, 500); await page.mouse.down();
  const t0 = Date.now();
  for (let i = 0; i < 60; i++) await page.mouse.move(600 + i * 4, 500 + (i % 10) * 3);
  const secs = (Date.now() - t0) / 1000;
  await page.mouse.up();
  const fps = (await page.evaluate(() => window.__f)) / secs;
  if (/swiftshader|llvmpipe|software/i.test(info.renderer))
    console.log(`      frame rate ${fps.toFixed(1)} fps on ${info.renderer}` +
                ` — software rendering, so this is reported, not asserted`);
  else check('at least 30 fps under a sustained drag', fps >= 30,
             `${fps.toFixed(1)} fps on ${info.renderer}`);

  // ---- it runs with the network cut ----
  await page.route(/^https?:/, r => r.abort());
  await page.reload();
  await page.waitForFunction('window.__ready === true', { timeout: 15000 });
  {
    const dev = await toDev(page, [[1.1, 0.4]]);
    const [c] = await samplePixels(page, dev);
    check('the page still renders with every request blocked',
          Math.max(...c) - Math.min(...c) > 3 || Math.max(...c) > 20, `sample ${c}`);
  }

  check('no console or page errors throughout', errors.length === 0, errors.join(' | '));
  await page.screenshot({ path: '/tmp/spiral-groups.png' });
  await browser.close();
  console.log(ok ? '\nALL CHECKS PASSED' : '\nSOME CHECKS FAILED');
  process.exit(ok ? 0 : 1);
})();
