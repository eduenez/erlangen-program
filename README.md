# The Erlangen Program, Concretely

A sequence of self-contained, interactive lessons on groups of geometric
transformations — an accessible, modern introduction to the philosophy
behind Klein's *Erlangen Program*: a geometry is defined by its group of
transformations, and different groups (isometries, similarities, affine
maps, projective/Möbius maps) give genuinely different geometries on the
same underlying space.

Each lesson is purely mathematical: no course, institution, schedule, or
grading context of any kind. Every lesson is licensed
[CC BY 4.0](LICENSE) — copy, adapt, and reuse freely with attribution.

## Status

Early stage. Building lessons as Jupyter/Colab notebooks (`ipywidgets` for
sliders, dropdowns and entry boxes; Plotly for pan/zoom/rotate figures).
Requires a live kernel (Colab or local Jupyter) to be interactive.

## Planned lesson sequence

1. **Discrete groups with one or two generators** — translations, and the
   isometry groups of the square and hexagonal lattices.
2. **One-parameter groups** — translations along a line, rotations,
   "spiral" groups ($z \mapsto e^{at} z$).
3. **Linear and affine transformations of the plane.**
4. **Möbius transformations of the extended complex plane** — orientation-
   preserving first, then reflections/inversions.
5. **The Riemann sphere** — stereographic projection, and the same Möbius
   group realized as transformations of $S^2$.
6. **Groups as matrices, matrices as actions** — the formal notion of a
   group action, motivated by the matrix representations used above.

Lower priority, time permitting: isometries/similarities/affine maps of
3-space; projectivities of the real projective plane.

## Development setup

    make venv       # creates .venv/, installs requirements.txt, registers
                     # a "python3" Jupyter kernel scoped to .venv (won't
                     # clash with any other "python3" kernel on the machine)

Everything below assumes `.venv` is set up; nothing installs system-wide.

## Building a notebook

Each notebook has a generator script in `notebooks/` (e.g.
`build_lattice_groups.py`) — run it with `.venv/bin/python3` to
(re)produce the `.ipynb`.

## Testing

    make test

Executes every `notebooks/*.ipynb` top to bottom via the venv's own Jupyter
kernel, failing on the first error.

This only exercises the *default* widget state — running a notebook top to
bottom isn't the same as dragging every slider, since `ipywidgets` callbacks
fire in response to live front-end events that batch execution doesn't
simulate. Treat it as "the code has no bugs on load," not "every slider
position was checked." The actual math each widget calls into should be
covered by its own plain (non-widget) test — see how
`build_lattice_groups.py`'s `lattice_points`/`cyclic_points` functions were
verified against known cases before ever being wired to a slider.
