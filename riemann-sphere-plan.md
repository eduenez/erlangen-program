# The Riemann sphere: platform assessment, prototype scope, and implementation contract

## 0. Purpose and assumptions

This document plans the next lesson of the `erlangen-program` repository, item 5 of the README's roadmap ("The Riemann sphere — stereographic projection, and the same Möbius group realized as transformations of `S²`"). It makes no changes to the existing lessons (`web/lattice-groups.html`, `web/spiral-groups.html`).

We scope this prototype to the **first half** of item 5 only: stereographic projection itself — a plane, a sphere, a pole, and one draggable point whose image is tracked live. The **second half** ("the same Möbius group realized as transformations of `S²`") is deferred to Section 6; it presupposes item 4 (Möbius transformations of the plane), which does not exist yet, and nothing here depends on it.

As before, the document is organized so that Section 1 distills the requirements that drive the platform decision, Section 2 assesses candidates and states our recommendation, Section 3 gives the complete mathematical specification, Section 4 fixes prototype scope, Section 5 is the implementation contract, and Section 6 sketches the roadmap beyond the prototype.

**Revision note.** Sections 1, 2, 4 and 5 have been rewritten. The earlier draft rested requirement 1 on the convexity of the sphere, and recommended a sphere mesh drawn back faces first and front faces second on the strength of it; Section 1 now shows that this argument, sound for the sphere in isolation, does not survive the plane that requirement 2 puts *through* the sphere, and Section 2 recommends per-pixel analytic ray casting in its place. Requirement 7 — reuse by the Möbius sequel, which the instructor stated after the earlier draft — points the same way. The mathematics of Sections 3.1 through 3.4 is unchanged, and has now been checked numerically; Sections 3.5 through 3.7 are new.

## 1. Requirements driving the platform choice

1. **A convincingly solid, translucent sphere.** Students must be able to see *into* it: a marker that lands on the far (occluded) hemisphere must remain visible, not just theoretically "behind glass."
2. **The complex plane, drawn as an actual plane**, extended past the sphere's silhouette, so that its intersection with the sphere — the equator — is visible as a natural consequence of the geometry, not a separately drawn curve.
3. **One draggable point on the plane**, with its sphere-side image and the straight line joining {pole, sphere point, plane point} all updating together, live, as it is dragged.
4. **Free camera rotation**, at interactive rates. Translucency alone does not deliver "seeing inside" from a single fixed viewpoint — the student must be able to orbit the sphere to look at the marker from any side.
5. **Browser-only, single self-contained file, no dependencies, works from `file://` indefinitely** — the standing requirement every lesson in this repository already satisfies.
6. **A selectable projection pole** (north or south), cheap to support, and needed outright by the world-map extension of Section 6.
7. **Tooling reusable by the Möbius sequel.** The stated intent is that this applet's machinery carry over to a lesson showing Möbius transformations acting on a stereographically projected world map. We record this as a requirement rather than an aspiration, since it disqualifies any architecture in which the plane picture and the sphere picture are produced by mechanisms the sequel would have to throw away and rebuild.

Unlike the two existing lessons, no serious candidate here has trouble drawing *a* sphere; the crux is requirement 1 done *exactly*, and requirement 7 honored.

It is worth setting down the argument that fails, since it is attractive and was the basis of an earlier draft. A sphere is convex, so from any viewpoint every backward-facing patch of its surface lies strictly behind every forward-facing patch along each line of sight; drawing back faces first and front faces second, blended over them, is therefore exactly correct for a single convex translucent solid, with no per-triangle depth sort, at any camera angle. That reasoning is sound, and it is insufficient here, because requirement 2 puts a plane *through* the sphere, and a convex solid together with a plane cutting it is not convex. Along a given line of sight the plane may be crossed before the ray enters the sphere, while it is inside, or after it leaves; and which of the three occurs varies from pixel to pixel *within a single view*. Casting rays over a 160×160 grid from the camera `(0, −4, 1.2)` toward the origin, the plane is crossed inside the sphere's chord at 1518 pixels and outside it at 3670; every other camera position we tested (three-quarter, near-polar, near-equatorial, from below) likewise yields both classes at once. Hence no *global* draw order can be correct everywhere at once — not for any splitting of the sphere's faces, and not for any ordering of whole primitives, since the required order is a per-pixel fact, not a per-primitive one.

Two remarks, lest the conclusion seem heavier than it is. First, the failure is one of *exactness*, not of plausibility: a global order produces a picture that is right over most of the frame and wrong in a band, which is precisely the sort of defect that survives casual inspection and then puzzles a student who orbits the camera. Second, the remedy is cheap here, because the scene's surfaces are a quadric and a plane, the two shapes whose intersections with a ray are given in closed form.

## 2. Platform assessment

| Platform | Exact where the plane cuts the sphere | Reusable by the Möbius sequel | No dependency, offline forever | Verdict |
|---|---|---|---|---|
| JSXGraph | no (2-D only) | no | yes | rejected — no true depth |
| CSS 3-D transforms (layered circles/ellipses) | no | no | yes | rejected — cannot shade a solid surface correctly |
| three.js | not without per-fragment work one would have to write anyway | in part | no — CDN, or several hundred KB bundled inline | rejected, to preserve the zero-dependency property the rest of the repository has committed to |
| Software 3-D on Canvas-2D (manual projection, painter's algorithm) | no — a painter's algorithm is a global order, which is exactly what Section 1 rules out | no | yes | rejected |
| WebGL2, sphere mesh + plane quad, back faces then front faces | no (Section 1) | no — the plane picture would be rebuilt per pixel for the sequel regardless | yes | rejected: the ordering fault of Section 1 |
| **WebGL2, one fragment shader casting one ray per pixel against analytic surfaces** | yes, by construction | yes — the sequel replaces two shading functions and no geometry | yes | **recommended** |

**Recommendation.** A single self-contained HTML file, `web/riemann-sphere.html`, holding one WebGL2 canvas that draws one full-screen triangle, under a fragment shader that casts one ray per pixel against the scene's surfaces *analytically*: the unit sphere (a quadratic in the ray parameter), the plane `Z = 0` (a linear one), the projecting segment (a capsule), and the two markers (balls). The at most six hit parameters along a ray — the sphere's entry and exit, the plane, the capsule, and the two markers — are sorted and composited front to back with per-surface opacity (Section 3.6). This is exact at every camera angle and in every configuration, the overlap region included, and it requires no mesh, no vertex buffers, no depth buffer and no draw-order discipline whatsoever. A Canvas-2D overlay above it carries text only — the labels of the poles and marked points, and the readouts — and the controls are ordinary HTML, exactly as in the two existing lessons.

This is, in fact, the architecture those two lessons already use: one full-screen triangle, one fragment shader, a 2-D overlay for lettering. We adopt it here for four reasons, of which only the first is about correctness. It is exact, per Section 1. It satisfies requirement 7 outright: the decoration of each surface is a *function of the hit point* rather than geometry, so the world map and then the Möbius pullback replace two functions and leave the renderer alone (Sections 3.7 and 6). It reuses, unchanged, the analytic antialiasing the existing lessons developed for precisely the aliasing this scene suffers (Section 3.7). And it keeps the repository's three lessons architecturally of a piece, which matters for an instructor who intends to read and modify all of them.

The price is that ray–surface intersections must be written by hand — a dozen lines each, given in Section 3.6 — and that hardware rasterization's free perspective interpolation and multisampled silhouettes are given up; the silhouette must instead be antialiased analytically from the discriminant, which Section 3.7 specifies. For a scene of one sphere and one plane this is a modest price. Note that the per-pixel cost is *lower* than either existing lesson's, whose shaders already sustain 60 fps at full window: a handful of arithmetic operations, one square root, and a short sort.

## 3. Mathematical specification

### 3.1 Coordinates, the two poles, and the projection formula

Identify the plane `ℂ` with `{(x, y, 0) : x, y ∈ ℝ} ⊂ ℝ³` via `z = x + iy ↦ (x, y, 0)`, and let `S²` be the unit sphere centered at the origin. Fix `σ ∈ {+1, −1}`: `σ = +1` means we project **from the north pole** `N = (0, 0, 1)`; `σ = −1` means we project **from the south pole** `S = (0, 0, −1)`. Write `Pole(σ) = (0, 0, σ)`.

Derivation for `σ = +1` (the other follows by the reflection `Z ↦ −Z`, i.e. by symmetry across the equatorial plane, which exchanges the two poles): parametrize the line through `N` and the plane point `(x, y, 0)` as `(tx, ty, 1 − t)`, `t ∈ ℝ` (`t = 0` at `N`, `t = 1` at the plane point). Substituting into `X² + Y² + Z² = 1` gives `t²(x² + y²) + (1 − t)² = 1`, i.e. `t²(1 + |z|²) = 2t`, whose nonzero root is
```
t* = 2 / (1 + |z|²).
```
Hence, for `σ = +1`:
```
X = 2x / (1 + |z|²),    Y = 2y / (1 + |z|²),    Z = 1 − t* = (|z|² − 1) / (1 + |z|²).
```
Reflecting `Z ↦ −Z` gives the `σ = −1` case. Both are captured by one formula, and `t*` is unchanged by the reflection since it does not involve `Z`:
```
X(z) = 2 Re(z) / (1 + |z|²)
Y(z) = 2 Im(z) / (1 + |z|²)
Z_σ(z) = σ (|z|² − 1) / (1 + |z|²)
```
`Pole(σ)` itself corresponds to `z = ∞` (the point removed from the domain of the projection); the opposite pole `Pole(−σ)` is the image of `z = 0`, since `Z_σ(0) = −σ`. Concretely: projecting from the south pole (`σ = −1`, the instructor's stated preference) sends `z = 0` to the **north** pole and `z = ∞` to the **south** pole; projecting from the north pole (`σ = +1`, the more common textbook convention) does the reverse. Both are supported by the one formula above with a single sign flip — the implementing agent must not code the two poles as independent branches (see Section 5.4).

### 3.2 The projection line and the drag mechanism

For the live dragged point `z = x + iy`, the segment to draw is simply the straight segment from `Pole(σ)` to the plane point `(x, y, 0)` — the sphere-side image `(X, Y, Z_σ(z))` is *automatically* on it, at parameter `t*` from Section 3.1, and needs no separate placement logic. Concretely, `point(t) = Pole(σ) + t · [(x, y, 0) − Pole(σ)]`, `t ∈ [0, 1]`, with `t = 0` at the pole, `t = 1` at the plane point, and `t = t* = 2/(1+|z|^2) \in (0,1)` at the point on the sphere. Draw the full segment (pole to plane point); the sphere marker is placed at `t*` on it, not computed independently, so the three points can never visibly drift apart.

Dragging is a plane-only operation: the drag point is constrained to `Z = 0`. Standard technique: unproject the pointer's screen ray under the current camera and intersect it with the plane `Z = 0` (a single linear solve, since the plane is a coordinate plane); no raycasting against the sphere or any other geometry is needed for the drag itself.

### 3.3 The equator is not a separate curve

For `|z| = 1` (the plane's own unit circle), `Z_σ(z) = σ(1 − 1)/(2) = 0` for **either** value of `σ`, and `X = 2x/2 = x`, `Y = y`. That is: **the sphere's equator has exactly the plane's own `(X, Y)` coordinates.** If the plane is drawn generously large (radius comfortably past 1) and semi-opaque at `Z = 0` in the same scene as the sphere, its intersection with the sphere's silhouette *is* the equator — automatically, by the renderer's own depth test, with no equator curve to compute or draw separately. This is the direct answer to requirement 2 of Section 1.

### 3.4 Distortion, and why the instructor's stated pole preference is the right one for the world-map extension

Stereographic projection is conformal (angle-preserving); its local scale factor is the classical
```
λ(z) = 2 / (1 + |z|²),         so that   ds²_sphere = λ(z)² |dz|²   (pullback of the round metric).
```
This is confirmed directly along the positive real axis (`z = r ≥ 0`, `σ = +1`, so `X = 2r/(1+r²)`, `Z = (r²−1)/(1+r²)`, a great semicircle traced as `r` ranges over `[0, ∞)`):
```
dX/dr = 2(1 − r²)/(1 + r²)²,     dZ/dr = 4r/(1 + r²)²
(dX/dr)² + (dZ/dr)² = 4[(1−r²)² + 4r²] / (1+r²)^4 = 4(1+r²)² / (1+r²)^4 = 4/(1+r²)²
⟹ d(arclength)/dr = 2/(1+r²) = λ(r).
```
By the rotational symmetry `z ↦ e^{iθ}z` (a rotation of the sphere about the `Z`-axis) and conformality, the same holds along every ray, hence for all `z`.

`λ` is maximal (`λ(0) = 2`) at `z = 0` — antipodal to the projection pole — and decreases to `0` as `|z| → ∞`, i.e. approaching the projection pole itself. Consequently, going in the cartographically relevant direction (sphere → plane), distortion is **least** near the pole *opposite* the one being projected from, and grows *without bound* near the projection pole, whose own neighborhood is spread out over the unbounded far reaches of the plane. Projecting from the **south** pole (`σ = −1`, the instructor's stated preference) therefore sends the south pole's neighborhood to `z` near `∞` — exactly the effect wanted for the eventual world map, where the least interesting (Antarctic) region is the one pushed out to the edge of a necessarily-cropped, large-but-finite map. This is not a matter of taste to be revisited later: `σ = −1` is the pole choice the stated goal (Section 6.2) actually requires, so it should be the prototype's *default*, with `σ = +1` available as the alternative already needed for requirement 6.

### 3.5 Orientation: a second, independent reason for the south pole

Section 3.4 argues for `σ = −1` from the distortion. There is a second reason, which also disarms a trap waiting for the world map, and which we have not seen stated in the textbooks: *the two poles differ in orientation, not merely in scale*.

Give `S²` its outward-normal orientation: a tangent frame `(e₁, e₂)` at `P` counts as positive when `(e₁, e₂, P)` is right-handed, `P` itself being the outward normal of the unit sphere there. The asymmetry is already visible at the origin, and in one line. Differentiating the map `F` of Section 3.1 at `z = 0` gives `∂F/∂x = (2, 0, 0)` and `∂F/∂y = (0, 2, 0)` for *either* sign of `σ` — neither `X` nor `Y` involves `σ`, and `∂Z/∂x = ∂Z/∂y = 0` at the origin, `Z` being an even function of `(x, y)` — so the frame's cross product is `(0, 0, 4)` in both cases. The *image point* is what depends on `σ`: it is the north pole for `σ = −1`, where the outward normal is `(0, 0, 1)`, and the south pole for `σ = +1`, where the outward normal is `(0, 0, −1)`. Hence the same plane frame maps to a positively oriented frame in the first case and a negatively oriented one in the second. That this is no peculiarity of the origin we checked numerically: the sign of `(∂F/∂x × ∂F/∂y) · F` is positive at all of 400 pseudorandom plane points for `σ = −1`, and negative at all 400 for `σ = +1`. Hence:

> **Projection from the south pole onto the equatorial plane is orientation-preserving with respect to the sphere's outward normal; projection from the north pole is orientation-reversing.**

Recall the standard atlas of the Riemann sphere, whose first chart is the projection from the north pole, `w_N = (X + iY)/(1 − Z)`. A two-line computation gives `1/w_N = (X − iY)/(1 + Z)`, i.e.
```
w_N = 1 / conj(w_S),
```
so the two projections differ by an inversion *composed with a conjugation*: they induce conjugate complex structures, and exactly one of them is holomorphic for a given orientation of the sphere. Textbooks that project from the north pole and keep the plane's usual orientation are therefore quietly accepting a reversal, which costs them nothing because they never draw a chiral figure on the sphere.

We, however, intend to draw the most chiral figure there is, namely a world map. The consequence is practical and worth stating plainly: **projected from the south pole, a map painted on the sphere appears in the plane unmirrored**; projected from the north pole it comes out as its mirror image, and a conjugation must be inserted somewhere to repair it. Together with Section 3.4 this settles `σ = −1` as the default twice over, for independent reasons — distortion and orientation — and it is why the prototype should letter the poles on screen (Section 4), so that a student can see which one is where.

A pedagogical dividend, cheap to collect: the pennant flag of the two existing lessons is already a chiral figure with a known-good implementation. Placing it on the plane and its image on the sphere exhibits conformality (its corners keep their angles) and orientation (its pennant keeps its side) in one picture, and toggling `σ` flips the second without touching the first.

### 3.6 The rendering model: one ray per pixel, sorted exactly

Let the camera sit at `o` with unit ray direction `d` through the pixel (Section 5.1 fixes the camera itself). The scene's hits are, in closed form:

- **The sphere** `|X| = 1`. With `b = o·d` and `c = o·o − 1`, the discriminant is `Δ = b² − c`; for `Δ > 0` the two hits are `t = −b ∓ √Δ`, entry then exit. The outward normal at a hit is the hit point itself. `Δ` also drives the silhouette's antialiasing (Section 3.7).
- **The plane** `Z = 0`. `t = −o_z / d_z`, skipped when `|d_z|` falls below an epsilon (the grazing case, where the plane covers no pixel it does not already cover).
- **The projecting segment** from `Pole(σ)` to the plane point, drawn as a *capsule* of radius `ρ`: the hit is obtained from the closed-form distance between the ray and the segment, and its normal from the vector joining the closest pair. A capsule, and not a line drawn on the overlay, precisely because requirement 1 demands that the segment be seen *inside* the sphere, correctly dimmed by the wall it passes behind.
- **The two markers**, at the plane point and at its sphere image, drawn as balls of radius `ρ_m` — the same quadratic as the sphere, recentred.

Collect the hits with `t > 0`, each tagged with its surface, sort them (at most six: the sphere's two, the plane's one, and the nearest hit of each opaque primitive, the far side of an opaque body being invisible — so an insertion sort is ample), and composite front to back in the standard way: maintaining transmittance `T` initialized to 1 and colour `C` to 0, each hit of colour `c` and opacity `α` contributes `C ← C + T·α·c` and then `T ← T·(1 − α)`. The background shows through as `T` times the background colour. Nothing about this depends on the camera, which is the whole point.

Two details of shading, both cheap and both worth the trouble. The sphere's two hits should not be shaded identically: dimming the far wall (the exit hit) reads immediately as depth, where equal treatment reads as a flat disc. And the marker on the sphere should be placed at the parameter `t*` of Section 3.2 along the *segment*, never computed independently, so that the three collinear points cannot drift apart — the criterion of Section 5.3 tests exactly this.

### 3.7 Decoration of the surfaces, and its antialiasing

Neither surface is bare. The sphere carries a *graticule* (meridians and parallels), the plane a grid together with its unit circle, and, in the sequel, the sphere and the plane both carry the world map. We call all of this the surfaces' *decoration*, and the essential point is that decoration is a **function evaluated at the hit point**, not geometry added to the scene. This is what makes requirement 7 attainable: the world map replaces `sphereShade(P)` and `planeShade(z)`, and the Möbius lesson composes a transformation into them, while the renderer of Section 3.6 is untouched.

Both decorations alias, and badly. The plane's grid is seen at grazing incidence near the horizon, where its screen period falls below a pixel; the sphere's meridians crowd together at the poles. This is the same problem the two existing lessons solve, and we reuse their solution verbatim rather than inventing another: the screen-space footprint of each coordinate is computed *analytically*, and the decoration's amplitude is attenuated by a Gaussian envelope agreeing with the box-filter transfer function to second order (the function named `blurAtt` in both existing files). Note that `fwidth` is not an acceptable substitute: it spikes across the branch cut of the longitude and would draw a spurious seam down one meridian, which is the identical fault `spiral-groups.html` documents for the branch cut of `arg`. Note also that the longitude's branch cut is the seam an equirectangular map possesses anyway, so the two coincide and only one of them needs handling.

The silhouette needs its own treatment, rasterization's multisampling being unavailable: the sphere's coverage should be feathered over roughly a pixel using `Δ` near zero, since `√Δ` is the half-chord and vanishes exactly at the silhouette.

## 4. Prototype scope

**In scope (version 0), one file `web/riemann-sphere.html`:**

- the unit sphere and the plane `Z = 0`, ray-cast analytically and composited exactly (Section 3.6), the sphere translucent at a fixed generous opacity and its far wall dimmed;
- the plane extending comfortably past the sphere's silhouette, decorated with a grid and its unit circle — and no separate equator geometry, the equator being where the plane meets the sphere (Section 3.3);
- a graticule on the sphere, antialiased per Section 3.7, sufficient to read latitude and longitude by eye and to make the poles legible as poles;
- one draggable point on the plane, constrained to `Z = 0` (Section 3.2), with a live marker at its sphere-side image and the connecting capsule from `Pole(σ)` through both, correctly dimmed where it passes inside the sphere;
- a perspective camera the student can orbit (drag on empty space) and zoom (wheel or pinch), opening at a three-quarter view that already shows some of the far hemisphere through the surface;
- lettering for the two poles and the marked points, and readouts of `z` and of its image `(X, Y, Z)`, on a Canvas-2D overlay (text only);
- a toggle between `σ = −1` (default, south) and `σ = +1` (north), per Sections 3.1, 3.4 and 3.5;
- optionally, and cheaply, the pennant flag of the existing lessons on the plane with its image on the sphere, per the dividend noted in Section 3.5;
- a control panel and a mini-lesson panel following the existing lessons' current convention exactly — the collapsible three-state panel (full, compact, hidden) and the "Show mini-lesson" checkbox — so that the three lessons behave alike on a phone;
- a mini-lesson of three to five short paragraphs: what a point and its sphere image are; why the projection pole maps to infinity and the opposite pole to the origin; why the equator is exactly the unit circle (Section 3.3); the qualitative distortion fact of Section 3.4 stated without derivation, tied to "why we default to the south pole"; and, in one sentence, that angles and handedness both survive the map (Section 3.5).

**Out of scope (version 0):** the Möbius group acting on `S²` (Section 6.1, which needs README item 4 first); the world-map texture (Section 6.2); a general, non-pole projection point (Section 6.3); touch-device polish beyond single-pointer drag and pinch-zoom; saving or sharing of states.

## 5. Implementation contract

This section is addressed to the implementing agent.

### 5.1 Architecture and constraints

- One HTML file, `web/riemann-sphere.html`; no external resources of any kind (no CDN, no fonts, no images, no three.js); must run from `file://` in current Chrome, Safari and Firefox.
- Two stacked full-window canvases with `devicePixelRatio` handling, exactly as the two existing lessons have them: a WebGL2 canvas beneath, running the single fragment shader of Sections 3.6 and 3.7 over one full-screen triangle, and a Canvas-2D overlay above it for lettering and readouts only. Pointer events attach to the overlay.
- If WebGL2 is unavailable, display a plain-language message; do not attempt a CPU fallback.
- A single JavaScript object holds the state `{ z, sigma, camera }`; all rendering is a pure function of it, and every derived quantity (`Pole(σ)`, the camera basis, `t*`) is recomputed per frame and passed as uniforms.
- Camera: an orbit camera given by azimuth, elevation and distance, with elevation clamped short of the poles to keep the up-vector well defined; drag on empty space orbits, the wheel zooms. Dragging the plane point takes precedence over orbiting when the pointer goes down within a few pixels of it, as in the existing lessons.
- Dragging is a plane-only operation (Section 3.2): unproject the pointer ray under the current camera and intersect it with `Z = 0`. Guard the near-grazing case, where that intersection runs away to the horizon: clamp `|z|` to a named maximum rather than allowing a non-finite drag.
- Code style: no framework, no build step, no minification; generous comments keyed to the section numbers of this document, since the instructor will read and modify the source. Constants named once at the top, per criterion 10 below.
- `web/index.html`, the landing page, gains a card for the new lesson; nothing else in the repository changes.

### 5.2 Milestones

1. **M1 — The scene, cast and composited.** Sphere and plane ray-cast and composited front to back (Section 3.6), camera orbit and zoom working, no decoration and no drag yet. The acceptance criterion to satisfy first is number 3 below: the overlap must be right before anything is built on top of it.
2. **M2 — Decoration.** Graticule, plane grid and unit circle, with the analytic antialiasing and the silhouette feathering of Section 3.7.
3. **M3 — Live drag.** Draggable plane point, sphere-side marker placed at `t*` on the capsule, readouts.
4. **M4 — Pole toggle.** `σ = ±1` as one sign flip in the shared formula, not two branches.
5. **M5 — Panels and QA.** Control panel and mini-lesson matching the existing lessons' conventions; the acceptance criteria below, verified and reported one by one.

### 5.3 Acceptance criteria

1. With `σ = −1` (default) and `z = 0`, the sphere marker sits exactly at the north pole `(0, 0, 1)`; with `σ = +1` and `z = 0`, exactly at the south pole `(0, 0, −1)`.
2. Dragging `z` out to `|z| = 20` places the sphere marker demonstrably within a small neighbourhood of `Pole(σ)`, exhibiting the limit at infinity.
3. **The overlap is exact.** Orbit to a low, near-equatorial view (elevation of roughly 15°). The half of the plane behind the sphere must be dimmed by passage through exactly the two walls it lies behind, the half in front not at all, and the transition must occur only where the geometry puts it: along the sphere's silhouette and along the equator, and nowhere else. In particular, no seam may appear along the unit circle where the plane enters the sphere, and the picture must not change qualitatively as the camera passes through the plane. This is the criterion that the rejected architecture of Section 2 fails, and it is to be checked at M1, before anything is layered on top of it.
4. Orbiting to any angle that places the sphere marker on the far hemisphere still shows the marker and the connecting capsule through the translucent surface, correctly dimmed but plainly visible — neither hidden nor blended inside-out.
5. The capsule from `Pole(σ)` to the dragged plane point visibly passes through the sphere marker at all times, and no code path places that marker anywhere but on the segment (Section 3.2).
6. Toggling `σ` with `z` held fixed flips the marker to the mirror latitude (`X`, `Y` unchanged, `Z` negated), confirming the single signed formula of Section 3.1 rather than a pair of independently written cases.
7. `|z| = 1` is fixed pointwise: the marker lies on the equator and on the plane's own unit circle simultaneously, for either `σ` (Section 3.3).
8. If the optional flag of Section 3.5 is drawn: with `σ = −1` the flag on the plane and its image on the sphere have the same handedness, viewed from outside; with `σ = +1` they are mirror images. Angles are preserved in both cases.
9. Neither the plane's grid near the horizon nor the sphere's graticule near the poles aliases into moiré at any zoom; both fade toward their mean instead (Section 3.7). No seam appears along any single meridian.
10. Every constant of this document (the sphere's radius, the plane's half-extent and grid spacing, the default camera, the opacities, the capsule and marker radii, the clamp on `|z|`, every epsilon guard) appears once, named, at the top of the script.
11. Full-window camera drag sustains at least 30 fps at 1920×1080 on integrated graphics (target 60).
12. The file opens from disk with the network disabled and renders correctly, and behaves on a phone held upright: the panel opens compact, and the picture is visible.

### 5.4 What the agent must not do

Do not introduce dependencies (three.js included), build tooling, or TypeScript; do not restructure the repository; do not modify `web/lattice-groups.html` or `web/spiral-groups.html`; do not implement the two poles as independent code branches rather than the single signed formula of Section 3.1; do not substitute a mesh with a global draw order for the per-pixel compositing of Section 3.6, nor any other scheme that is correct only from some camera angles (Section 1 explains why none can be correct from all); do not use `fwidth` for the decoration's footprints (Section 3.7); do not silently change the mathematics of Section 3 — any deviation must be surfaced as a question, not committed as code.

## 6. Roadmap beyond the prototype

1. **The Möbius group on `S²`** (the second half of README item 5): once item 4 exists, show a rotation of the sphere beside the induced motion of the plane picture, and conversely — the standard fact that the rotations of `S²` correspond to Möbius transformations of `ℂ` of a restricted form. The antipodal map `z ↦ −1/z̄`, read off in plane coordinates, is a natural bridge, and Section 3.5's orientation discussion is what makes the bar in it unsurprising.
2. **The world map.** Paint an equirectangular map on the sphere by sampling it at the ray's hit point (Section 3.7), and render the projected image in the plane by, for each plane pixel, computing its sphere point through the closed form of Section 3.1 and sampling the map there. This half genuinely is a per-pixel inverse problem, in the same spirit as the two existing lessons' shaders, with a texture lookup standing in for their palette; the architecture of Section 2 was chosen so that it costs two functions and no geometry. Default `σ = −1`, which by Section 3.4 pushes the least interesting region (the Antarctic) out to the necessarily cropped edge of the plane picture, and by Section 3.5 leaves the continents unmirrored. Self-containment obliges us to embed the map rather than fetch it: a coarse equirectangular land mask, of the order of 512×256 and one bit deep, as a base64 `data:` URI, costs a few kilobytes and no network. Two things to settle when we come to it, neither of which affects the prototype: whether a land mask suffices or coastlines are wanted, and whether the graticule remains legible over the map.
3. **A general, non-pole projection point**, lower priority: projecting from an arbitrary point of `S²` rather than the two poles, as scaffolding for the fact that every Möbius transformation arises this way, and thence for `PSL(2, ℂ)` acting on the Riemann sphere. Out of scope until item 4 exists.
