"""Shared build-time helpers for the notebooks in this directory. Nothing
here is imported by the shipped .ipynb files themselves -- each notebook
must remain fully self-contained (clone or download *one* file and it just
works, with no dependency on this repo), so this module only removes
boilerplate from the *generator* scripts. Run a generator script with
python3 to (re)produce its .ipynb.
"""
import nbformat as nbf

CC_URL = "https://creativecommons.org/licenses/by/4.0/"
AUTHOR_NAME = "Eduardo Dueñez"
AUTHOR_URL = "https://supernumero.us/about"
REPO = "eduenez/erlangen-program"


class NotebookBuilder:
    """repo_path: the path of this notebook within the erlangen-program
    repo, e.g. 'notebooks/lattice-groups.ipynb' -- used only to build the
    Open-in-Colab badge URL."""

    def __init__(self, repo_path):
        self.colab_url = f"https://colab.research.google.com/github/{REPO}/blob/main/{repo_path}"
        self.cells = []

    def md(self, text):
        self.cells.append(nbf.v4.new_markdown_cell(text))

    def code(self, text):
        self.cells.append(nbf.v4.new_code_cell(text))

    def title(self, title, subtitle, intro_md):
        self.md(f"""\
# {title}
## {subtitle}

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)]({self.colab_url})
[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)]({CC_URL})

---

{intro_md}
""")

    def license_footer(self, short_title):
        self.md(f"""\
---
## License

This notebook is released under the [Creative Commons Attribution 4.0
International License (CC BY 4.0)]({CC_URL}). You are free to copy, adapt,
and redistribute it, including for commercial purposes, provided you give
appropriate credit.

Suggested attribution: *"{short_title}" by [{AUTHOR_NAME}]({AUTHOR_URL}),
licensed under [CC BY 4.0]({CC_URL}).*
""")

    def write(self, path):
        nb = nbf.v4.new_notebook()
        nb["cells"] = self.cells
        nb["metadata"]["kernelspec"] = {"name": "python3", "display_name": "Python 3", "language": "python"}
        nbf.write(nb, path)
