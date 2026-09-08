# The Riemann sphere: platform assessment, prototype scope, and implementation contract

## 0. Purpose and assumptions

This document plans the next lesson of the `erlangen-program` repository, item 5 of the README's roadmap ("The Riemann sphere — stereographic projection, and the same Möbius group realized as transformations of `S²`"). It makes no changes to the existing lessons (`web/lattice-groups.html`, `web/spiral-groups.html`).

We scope this prototype to the **first half** of item 5 only: stereographic projection itself — a plane, a sphere, a pole, and one draggable point whose image is tracked live. The **second half** ("the same Möbius group realized as transformations of `S²`") is deferred to Section 6; it presupposes item 4 (Möbius transformations of the plane), which does not exist yet, and nothing here depends on it.

As before, the document is organized so that Section 1 distills the requirements that drive the platform decision, Section 2 assesses candidates and states our recommendation, Section 3 gives the complete mathematical specification, Section 4 fixes prototype scope, Section 5 is the implementation contract, and Section 6 sketches the roadmap beyond the prototype.

## 1. Requirements driving the platform choice

1. **A convincingly solid, translucent sphere.** Students must be able to see *into* it: a marker that lands on the far (occluded) hemisphere must remain visible, not just theoretically "behind glass."
2. **The complex plane, drawn as an actual plane**, extended past the sphere's silhouette, so that its intersection with the sphere — the equator — is visible as a natural consequence of the geometry, not a separately drawn curve.
3. **One draggable point on the plane**, with its sphere-side image and the straight line joining {pole, sphere point, plane point} all updating together, live, as it is dragged.
4. **Free camera rotation**, at interactive rates. Translucency alone does not deliver "seeing inside" from a single fixed viewpoint — the student must be able to orbit the sphere to look at the marker from any side.
5. **Browser-only, single self-contained file, no dependencies, works from `file://` indefinitely** — the standing requirement every lesson in this repository already satisfies.
6. **A selectable projection pole** (north or south), cheap to support, and needed outright by the world-map extension of Section 6.

Unlike the two existing lessons, no serious candidate here has trouble drawing *a* sphere; the crux is requirement 1 done *exactly*, not approximately, without writing a full transparency-sorting engine. The resolving observation: **a sphere is convex**, so from any viewpoint every backward-facing patch of its surface lies strictly behind every forward-facing patch along each line of sight. Rendering back faces first, then front faces, blended on top, is therefore *exactly* correct for a single convex translucent solid — no per-triangle depth sort is needed, at any camera angle. This is a much cheaper problem than translucency in general, and is why a from-scratch renderer is a reasonable scope here (see Section 2).

## 2. Platform assessment

| Platform | Real 3-D + depth | Correct translucent convex solid | No dependency / offline forever | Verdict |
|---|---|---|---|---|
| JSXGraph | no (2-D only) | no | yes | rejected — no true depth |
| CSS 3-D transforms (layered circles/ellipses) | crude | no (no real depth test) | yes | rejected — cannot shade a solid surface correctly |
| three.js | excellent, essentially free | yes (built-in) | no — CDN, or several hundred KB bundled inline | rejected, to preserve the zero-dependency property the rest of the repo has committed to; revisit if that property is ever relaxed |
| Hand-rolled software 3-D on Canvas-2D (manual projection + painter's-algorithm quad sort) | adequate at this scene's complexity | yes, achievable by hand for one convex mesh | yes | viable fallback — more hand-written geometry code than the WebGL option, and no reason to prefer it here |
| **Vanilla WebGL2**: one sphere mesh, one plane quad, line/point primitives, perspective camera with orbit controls, back-faces-then-front-faces draw order | excellent | yes, exactly (Section 1) | yes | **recommended** |

**Recommendation.** A single self-contained HTML file, `web/riemann-sphere.html` (or `docs/riemann-sphere.html` — see the companion deployment plan in `course-data`, which is independent of this document and may or may not rename `web/` first; nothing here depends on which). One WebGL2 canvas: a coarse UV-sphere mesh (Section 3), a semi-transparent plane quad extending past the sphere's silhouette, a line segment and two point markers for the drag mechanism, and a plain perspective camera the student can orbit and zoom with the pointer. Unlike the two existing lessons, **no custom per-pixel inverse-orbit math is needed in the fragment shader** — this is ordinary rasterization, so the shader here is considerably simpler than `lattice-groups.html`'s or `spiral-groups.html`'s (a flat or simple Lambert-shaded fragment shader, alpha-blended, that is all). The two-canvas WebGL2-plus-overlay architecture is not needed either, since there is no per-pixel computation the overlay would exist to avoid; ordinary WebGL2 draw calls plus pointer-event handling on the canvas itself suffice.

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

## 4. Prototype scope

**In scope (version 0), one file `web/riemann-sphere.html`:**

- a coarse UV-sphere mesh (a modest latitude/longitude grid — a few dozen quads is ample; this is not a shading-quality lesson), rendered with correct back-faces-then-front-faces translucent draw order (Section 1) at a fixed, generous alpha;
- a plane quad (or a light grid) at `Z = 0`, semi-opaque, extending comfortably past the sphere's silhouette — no separate equator geometry (Section 3.3);
- one draggable point on the plane, constrained to `Z = 0` (Section 3.2), with a live-updating marker at its sphere-side image and the connecting segment from `Pole(σ)` through both;
- a perspective camera the student can orbit (drag on empty space) and zoom (wheel/pinch), defaulting to a three-quarter view that already shows some of the far hemisphere through the translucent surface;
- a toggle between `σ = −1` (default, south) and `σ = +1` (north), per Sections 3.1 and 3.4;
- a caption panel of three to five short paragraphs, matching the existing lessons' convention: what a point and its sphere image are (Section 3.1); why the pole maps to infinity and the opposite pole to the origin; why the equator is exactly the unit circle (Section 3.3); the qualitative distortion fact of Section 3.4, stated for students (no derivation), tied to "why we default to the south pole."

**Out of scope (version 0):** the Möbius group acting on `S²` (Section 6.1, needs item 4 first); the world-map texture (Section 6.2); a general (non-pole) projection point; touch-device polish beyond basic single-pointer drag and pinch-zoom; saving or sharing of states.

## 5. Implementation contract

This section is addressed to the implementing agent.

### 5.1 Architecture and constraints

- One HTML file, `web/riemann-sphere.html`; no external resources of any kind (no CDN, no fonts, no images, no three.js); must run from `file://` in current Chrome and Firefox.
- One WebGL2 canvas sized to the window with `devicePixelRatio` handling. No Canvas-2D overlay is required (contrast the two existing lessons): the caption panel and any buttons/toggles are ordinary HTML/CSS `<div>`s positioned over the canvas, exactly as the existing lessons' control panels already are.
- A single JavaScript object holds the state `{ z, sigma, camera }`; all rendering is a pure function of this state; `Pole(sigma)`, the view/projection matrices, and the alpha value are passed as uniforms each frame.
- If WebGL2 is unavailable, display a plain-language message; do not attempt a CPU fallback (matching the existing lessons' own rule).
- Code style: no framework, no build step, no minification; generous comments keyed to the section numbers of this document.

### 5.2 Milestones

1. **M1 — Static translucent scene.** Sphere and plane rendered with correct back-faces-then-front-faces order, camera orbit and zoom working, a single fixed demo point (no drag yet).
2. **M2 — Live drag.** Draggable plane point (Section 3.2), live sphere-side marker and connecting segment.
3. **M3 — Pole toggle.** `σ = ±1` switch (Section 3.1), verified as one sign flip in the shared formula, not two branches.
4. **M4 — Captions and QA.** Caption panel text; the acceptance criteria below, verified and reported one by one.

### 5.3 Acceptance criteria

1. With `σ = −1` (default) and `z = 0`, the sphere marker sits exactly at the north pole `(0, 0, 1)`; with `σ = +1` and `z = 0`, it sits exactly at the south pole `(0, 0, −1)`.
2. Dragging `z` out to `|z| = 20` places the sphere marker visibly within a small neighborhood of `Pole(σ)`, demonstrating the point-at-infinity limit.
3. With the plane drawn as specified (radius comfortably past 1, semi-opaque, at `Z = 0`), its visible intersection with the sphere coincides with the sphere's own silhouette-equator from every camera angle tested — no separate equator curve is ever drawn (Section 3.3).
4. Orbiting the camera to any angle that places the current sphere marker on the far hemisphere still shows the marker and the connecting segment through the translucent surface, correctly dimmed but visible — not hidden, not drawn with incorrect (inside-out) blending.
5. The connecting segment from `Pole(σ)` to the dragged plane point visibly passes through the sphere marker at all times; there is no code path that places the marker anywhere other than on that segment (Section 3.2).
6. Toggling `σ` with `z` held fixed flips the marker to the mirror latitude (`X, Y` unchanged, `Z` negated) — confirms the one-sign-flip formula of Section 3.1, not a pair of independently written cases.
7. Full-window camera drag sustains at least 30 fps at 1920×1080 on integrated graphics (target 60).
8. The file opens from disk with the network disabled and renders correctly.
9. Every constant of this document (sphere radius `1`, plane half-extent, default camera distance, translucency alpha, any epsilon guards) appears once, named, at the top of the script.

### 5.4 What the agent must not do

Do not introduce dependencies (three.js included), build tooling, or TypeScript; do not restructure the repository or rename `web/`; do not modify `web/lattice-groups.html` or `web/spiral-groups.html`; do not implement the two poles as independent code branches rather than the single signed formula of Section 3.1; do not fake translucency with a technique that only looks correct from the default camera angle (it must be correct under arbitrary orbit, per Section 1's back-faces-then-front-faces argument); do not silently change the mathematics of Section 3 — any deviation must be surfaced as a question, not committed as code.

## 6. Roadmap beyond the prototype

1. **The Möbius group on `S²`** (the second half of README item 5): once item 4 (Möbius transformations of the plane) exists, show a rotation of the sphere and the induced motion of the plane picture side by side, and vice versa — the standard fact that every rotation of `S²` corresponds to a Möbius transformation of `ℂ` of a specific restricted form. A brief mention of the antipodal map `z ↦ −1/z̄` (the sphere's own antipodal symmetry, read off in plane coordinates) is a natural bridge.
2. **The world map.** Texture the sphere with an equirectangular world map, reusing the UV-sphere mesh's own texture coordinates (already present for shading — no new mesh work). Render the corresponding projected image *in the plane* by, for each plane pixel, computing its sphere point via the closed-form map of Section 3.1 and sampling the texture there. Unlike the projection prototype above, **this half genuinely is a per-pixel inverse problem**, in the same spirit as `lattice-groups.html` and `spiral-groups.html`'s own fragment shaders — a texture lookup stands in for their palette color. Default `σ = −1` (Section 3.4): the south pole (least interesting, most distorted under this choice) is the one pushed to the map's necessarily-cropped, spread-out edge.
3. **General (non-pole) projection point**, lower priority: projecting from an arbitrary point of `S²` rather than only the two poles, as a bridge to the fact that *every* Möbius transformation of `ℂ` arises this way — good scaffolding for the formal `PSL(2, ℂ)`-acts-on-the-Riemann-sphere material eventually, but out of scope until item 4 exists.
