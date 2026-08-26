# Spiral similarity groups: platform assessment, prototype scope, and implementation contract

## 0. Purpose and assumptions

This document plans the next lesson of the `erlangen-program` repository; it makes no changes to the existing lattice lesson.
We address three questions, in order: which platform can realize the stated visualization goals (Section 2); what a limited but complete prototype should contain (Section 4); and what precise instructions an implementing agent requires (Sections 3 and 5, the latter being the contract proper).
The mathematical specification (Section 3) is deliberately explicit, since the implementing agent should compute nothing that we have not derived here.

We assume the existing lesson `web/lattice-groups.html` is a self-contained JSXGraph page implementing translation lattices with droplist-selected generators and an uncolored fundamental parallelogram; nothing below depends on its internals, and it is to remain untouched.

The document is organized as follows:
Section 1 distills the requirements that drive the platform decision.
Section 2 assesses candidate platforms and states our recommendation.
Section 3 gives the complete mathematical specification of the prototype.
Section 4 fixes the prototype scope, in and out.
Section 5 is the implementation contract: architecture, milestones, acceptance criteria, and constraints.
Section 6 sketches the roadmap beyond the prototype.

## 1. Requirements driving the platform choice

Three requirements are decisive; the remainder (draggable points, buttons, captions) are met by essentially every candidate.

1. **Continuous coloring of a fundamental region, reproduced faithfully on every translate.**
   Each point of the region receives a distinct color, and the coloring must repeat *exactly* on each group transform of the region --- not approximately, and not by tinting precomputed tiles.
2. **Real-time response.**
   The generator `a` is dragged freely; the entire tessellation (region, boundary curves, coloring) must re-render at interactive rates, i.e., every frame of the drag.
3. **Browser-only delivery.**
   A lesson is a file the students open; ideally it works from disk (`file://`) with no build step, no server, and no network.

Requirement 1 is the crux, and it is worth stating the observation that resolves it.
Coloring the plane by translates of a fundamental region is *not* a drawing problem (draw the region, then draw its copies); it is an *inverse* problem, solved independently at every pixel: given a pixel representing the complex number `z`, compute the canonical representative of the orbit of `z` inside the fundamental region, and color the pixel by that representative.
Faithfulness of the coloring across translates is then automatic --- points of a common orbit receive the identical color *by construction*, rather than by careful copying.
A computation performed independently per pixel, sixty times per second, is precisely what a GPU fragment shader does; on a CPU (hence in any SVG- or canvas-2D-based library) the same computation at full-window resolution is one to two orders of magnitude too slow to track a drag.

## 2. Platform assessment

| Platform | Draggable geometry | Per-pixel orbit coloring | Real-time under drag | No build step | Verdict |
|---|---|---|---|---|---|
| JSXGraph (current) | excellent | no (SVG; its density-plot facility is CPU-bound) | no | yes | keep for lessons not requiring coloring |
| GeoGebra (embedded) | excellent | no | no | yes (heavy payload) | rejected |
| Desmos API | good | no custom per-pixel color | no | yes | rejected |
| p5.js (WebGL mode) | adequate | yes (shaders) | yes | yes (CDN dependency) | viable second choice |
| three.js | adequate | yes | yes | yes (large dependency) | overkill: we need one full-screen quad, not a scene graph |
| **Vanilla WebGL2 fragment shader + Canvas-2D overlay** | full control | yes | yes | yes (zero dependencies) | **recommended** |

**Recommendation.**
A single self-contained HTML file with two stacked canvases:
a WebGL2 canvas underneath, running one fragment shader that colors every pixel by its canonical orbit representative and draws the region boundaries; and a Canvas-2D overlay on top, drawing axes, the draggable points, the orbit figures, and the "picture of the group".
Pointer events attach to the overlay; plain JavaScript (no framework) glues the two.
The entire mathematics of the shader fits in roughly forty lines of GLSL (Section 3); the overlay is ordinary 2-D drawing.
This choice costs us JSXGraph's ready-made construction tools, but the prototype needs only two draggable points and a handful of buttons, which is a modest price; in exchange we obtain requirement 1 exactly, requirement 2 with headroom, and a lesson with no external dependency whatsoever (it works offline, from disk, indefinitely).

We do *not* propose migrating the lattice lesson; a hybrid repository (JSXGraph where construction tools dominate, shader pages where coloring dominates) is a feature, not an inconsistency.
In fact, the shader architecture specified below generalizes verbatim to the translation-lattice lesson (the log-coordinates step is simply omitted), so a later port is cheap if desired.

## 3. Mathematical specification

Throughout, the plane is identified with ℂ, and `n ∈ {1, 2, …, 12}` while `a ∈ ℂ` satisfies `a ≠ 0` and `|a| ≠ 1` (the interface enforces `| |a| − 1 | ≥ ε` with `ε = 0.02`, and `0.1 ≤ |a| ≤ 10`).

### 3.1 The group and its action

Let `ζ = exp(2πi/n)`, and let `G = G(a, n)` be the group of transformations of ℂ generated by `μ_a : z ↦ a·z` and `ρ : z ↦ ζ·z`.
Every element of `G` is `z ↦ a^k ζ^j z` with `k ∈ ℤ`, `j ∈ {0, …, n−1}`, and this representation is unique (since `|a| ≠ 1` forces `k` and then `j`); hence `G ≅ ℤ × ℤ/nℤ`, and the action of `G` on `ℂ× = ℂ ∖ {0}` is free.
Freeness has a pedagogical payoff: the orbit of the point `1` is the set `{ a^k ζ^j }`, a *bona fide* picture of the group itself, drawn inside the very plane the group acts on.

### 3.2 Logarithmic coordinates and the canonical representative

Fix `α = Log(a)` (see Section 3.5 for the branch discipline) and `τ = 2πi/n`.
Under `w = log z` (any branch), the action of `G` on ℂ× becomes the action by translations of the lattice `Λ = ℤα + ℤτ` on ℂ; the condition `|a| ≠ 1` says `Re(α) ≠ 0`, hence `α` and `τ` are ℝ-linearly independent and `Λ` is a full lattice.
Note that the fundamental region is therefore the exponential of the parallelogram spanned by `α` and `τ = 2πi/n` --- the README's "spanned by α and 2πi" is the `n = 1` case, and we take the liberty of correcting it here; for `n = 1` the region is the full annulus between radii `1` and `|a|`, as stated there.

The per-pixel computation is now three lines.
Given the pixel's complex number `z ≠ 0`:

1. `w = log|z| + i·arg(z)` (any branch of `arg`; the choice is immaterial, since `2πi = n·τ ∈ Λ`, so different branches differ by a lattice vector);
2. write `w = u·α + v·τ` by inverting the real 2×2 matrix `M = [Re α, Re τ; Im α, Im τ]` (invertible precisely because `|a| ≠ 1`);
3. take `(u, v) ← (frac(u), frac(v)) ∈ [0,1)²`; the canonical representative of the orbit of `z` is `exp(u·α + v·τ)`, and `(u, v)` are its intrinsic coordinates.

### 3.3 Coloring and boundaries

The pixel is colored by a fixed continuous injective map `c : [0,1]² → RGB`; for definiteness, take the bilinear interpolation of four distinct corner colors chosen so that the four are affinely independent in RGB-space (e.g., corners `(0,0), (1,0), (0,1), (1,1)` mapped to teal, gold, plum, and off-white), but any continuous map separating points is acceptable, and the implementing agent may substitute a perceptually smoother one.
Faithfulness across translates requires no further work: two points on one orbit produce the identical `(u, v)`, hence the identical color.

Boundaries of the region and of all its translates are the loci `u ∈ ℤ` or `v ∈ ℤ`; the shader draws them as dark curves of *constant screen width*, using screen-space derivatives (`fwidth`) of `u` and `v` for resolution-independent antialiasing.
The curves `v ∈ ℤ` are the circles `|z| = |a|^k` when `arg(α)=0` and logarithmic spirals in general; the curves `u ∈ ℤ` are their transversal spiral family; near `z = 0` infinitely many translates accumulate, the derivative-based line width degrades gracefully into a blur, and the shader should additionally fade the boundary curves to zero within a few pixels of the origin.

### 3.4 Orbit of a marked figure

The marked figure is a capital "F", specified as two polylines in template coordinates anchored at the origin:
stem `(0,0)–(0,1)`, top arm `(0,1)–(0.6,1)`, middle arm `(0,0.6)–(0.45,0.6)` (drawn as the polyline `(0,0)→(0,1)→(0.6,1)` plus the segment `(0,0.6)→(0.45,0.6)`).
The letter F has trivial symmetry group, as required.
Given the draggable anchor `z₀ ≠ 0` and a fixed scale `s` (default `s = 0.25`, adjustable), the base figure is `F₀ = { z₀ + s·p : p ∈ template }`, and the orbit consists of the images `g(F₀) = { a^k ζ^j (z₀ + s·p) }` for `g = a^k ζ^j ∈ G`.
The overlay draws all images meeting the viewport; the range of `k` is culled by `r_min / (|z₀| + 2s) ≤ |a|^k ≤ r_max / max(|z₀| − 2s, δ)` where `r_min, r_max` are the viewport's radial bounds and `δ` guards against `z₀` near the origin, with a hard cap (say 400 figures) as a safety valve.
Note that the images exhibit exactly the size and orientation changes the lesson is after; no separate mechanism is needed.

### 3.5 Branch discipline for `Log(a)` under dragging

If `α` is recomputed as the principal `Log(a)` on every frame, then dragging `a` across the negative real axis jumps `α` by `2πi`.
The lattice `Λ` is unchanged (again since `2πi = n·τ ∈ Λ`), so the *tessellation* does not jump, but the coordinates `(u, v)` undergo a basis change and the *coloring* relabels discontinuously --- a jarring artifact.
The remedy: during a drag, update `arg(a)` by continuity (accumulate the winding of `a` across frames) and set `α = log|a| + i·arg_continuous(a)`; reset to the principal branch only when a drag begins from rest.
This is the one numerical subtlety of the prototype, and the contract makes it an explicit acceptance criterion.

### 3.6 The one-parameter subgroup

The continuous path through `G`'s ambient Lie group is `t ↦ (z ↦ exp(t·α)·z)`, `t ∈ ℝ`; at integer `t` it visits the discrete subgroup `⟨μ_a⟩`.
A slider (with an optional play button) animates `t`, drawing a ghost image `exp(t·α)·F₀` gliding along the logarithmic spiral through the discrete orbit copies; the contrast between the gliding ghost and the stationary discrete copies *is* the intended lesson on continuous versus discrete subgroups, and the spiral `{ exp(t·α)·z₀ : t ∈ ℝ }` should be drawn faintly as the orbit of the one-parameter group.

## 4. Prototype scope

**In scope (version 0), one file `web/spiral-groups.html`:**

- draggable generator `a` with the unit circle drawn as a visibly "forbidden" locus and the constraint of Section 3 enforced during drags;
- `n` selected from buttons `1, 2, …, 12` (`n = 1` deliberately included: it exhibits the annulus, and pedagogically it is the pure homothety case);
- GPU tessellation: coloring, boundaries, origin fade, per Sections 3.2–3.3;
- draggable `z₀` with the F-figure orbit of Section 3.4, with a visibility toggle;
- "picture of the group" toggle: the orbit of `1`, drawn as labeled dots `a^k ζ^j` (labels for small `|k|` only);
- one-parameter slider and animation per Section 3.6;
- a caption panel of three to five short paragraphs making the pedagogical points explicit: composing two jumps lands on a third orbit point (closure); the reverse jump exists (inverses); doing nothing is a jump (identity); one point per orbit inside the fundamental region (quotient); gliding versus hopping (continuous versus discrete).

**Out of scope (version 0):**
translation lattices (existing lesson); `Conj`, dihedral groups, and every orientation-reversing example; the `Sim = Sim₊ ⋊ Conj` and `Sim₊ = Trans ⋊ Spiral` lessons; touch-device polish beyond basic single-pointer dragging; saving or sharing of states.

## 5. Implementation contract

This section is addressed to the implementing agent.

### 5.1 Architecture and constraints

- One HTML file, `web/spiral-groups.html`; no external resources of any kind (no CDN, no fonts, no images); must run from `file://` in current Chrome and Firefox.
- Two stacked canvases sized to the window with `devicePixelRatio` handling: WebGL2 beneath (fragment shader of Sections 3.2–3.3), Canvas-2D above (axes, unit circle, points `a` and `z₀`, F-orbit, group picture, one-parameter ghost).
- If WebGL2 is unavailable, display a plain-language message; do not attempt a CPU fallback.
- A single JavaScript object holds the state `{ a, n, z0, showOrbit, showGroup, t, viewport }`; all rendering is a pure function of this state; shader parameters (`α`, `τ`, `M⁻¹`, viewport transform) are passed as uniforms each frame.
- Viewport: pan by dragging empty space, zoom by wheel, centered at `0` initially with radius ≈ 4.
- Code style: no framework, no build step, no minification; generous comments keyed to the section numbers of this document, since the instructor will read and modify the source.

### 5.2 Milestones

1. **M1 --- Static tessellation.** Shader renders coloring and boundaries for hard-coded `a = 1.1·exp(0.35i)`, `n = 5`, with pan and zoom.
2. **M2 --- Live generators.** Draggable `a` (with forbidden-circle enforcement and the branch discipline of Section 3.5) and the `n` buttons.
3. **M3 --- Orbits.** Draggable `z₀`, F-figure orbit with culling, group-picture toggle.
4. **M4 --- One-parameter animation and captions.** Slider, play button, ghost figure, faint spiral orbit; caption panel text.
5. **M5 --- QA pass.** The acceptance criteria below, verified and reported one by one.

### 5.3 Acceptance criteria

1. `a = 2, n = 1`: the tessellation is concentric annuli with boundary circles at radii `2^k`; colors vary continuously within each annulus and repeat identically annulus to annulus.
2. `a = 2, n = 6`: annular sectors bounded by circles `|z| = 2^k` and six rays; each annulus splits into six congruent sectors carrying identical color patterns.
3. `a = 1.05·exp(0.3i), n = 3`: "curved parallelograms" bounded by two families of logarithmic spirals; no visible seams or color mismatches across any boundary at any zoom.
4. Dragging `a` slowly across the negative real axis produces no discontinuity in the coloring (Section 3.5).
5. Attempting to drag `a` onto the unit circle is prevented, with the forbidden locus visibly indicated; `a` cannot be dragged to `0`.
6. With `z₀` placed on a region boundary, every F-image in the orbit lies on a corresponding boundary; the F-images visibly scale by `|a|` and rotate by `arg(a)` from copy to copy.
7. The group picture with `a = 1.2·exp(iπ/7), n = 3` shows dots along a spiral scaffold, three per "ring", and the dot at `1` coincides with the F-orbit anchor when `z₀ = 1`.
8. Full-window drag of `a` sustains at least 30 fps at 1920×1080 on integrated graphics (target 60).
9. The file opens from disk with the network disabled and renders correctly.
10. Every constant of Section 3 (`ε`, radial bounds of `a`, `s`, the figure cap, corner colors) appears once, named, at the top of the script.

### 5.4 What the agent must not do

Do not introduce dependencies, build tooling, or TypeScript; do not restructure the repository; do not modify `web/lattice-groups.html`; do not substitute an approximate tiling (drawing transformed copies of a rendered region) for the per-pixel inverse computation of Section 3.2; do not silently change the mathematics --- any deviation from Section 3 must be surfaced as a question, not committed as code.

## 6. Roadmap beyond the prototype

We list the natural successors, in rough order of construction cost, each reusing the two-canvas architecture:

1. **Translation lattices, recolored**: port of the existing lesson to the shader architecture (drop the `log` step; the lattice basis becomes the draggable pair `a, b`), gaining continuous dragging and the colored fundamental parallelogram.
2. **`Conj` and dihedral groups**: the reflection `z ↦ z*` added to the rotation groups; fundamental wedges of angle `π/n`; first appearance of orientation reversal and of a non-normal subgroup, hence the door to `Sim = Sim₊ ⋊ Conj`.
3. **A "tour of `Sim₊`"** lesson composing a translation, a homothety, and a rotation interactively, with the semidirect relations `Sim₊ = Trans ⋊ Spiral` and `Spiral = Htty × Rotn` read off from what commutes and what does not.
4. Only thereafter, a capstone juxtaposing the lessons as one narrative on normal subgroups and (semi)direct products, before the formal definition of group is given in lecture.
