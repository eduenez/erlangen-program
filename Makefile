PYTHON ?= python3.12

.PHONY: venv test test-notebooks test-html clean-venv

# Create an isolated venv with everything needed to build/run/test the
# notebooks, and register its own scoped Jupyter kernel (named "python3",
# but living inside .venv/share/jupyter/kernels/ -- it will not shadow or
# be shadowed by any other "python3" kernel registered elsewhere).
venv:
	$(PYTHON) -m venv .venv
	.venv/bin/pip install --upgrade pip
	.venv/bin/pip install -r requirements.txt
	.venv/bin/python -m ipykernel install --sys-prefix --name python3 \
		--display-name "Python 3 (erlangen-program .venv)"

# Execute every notebook top to bottom and fail on the first error. This
# only exercises the default widget state, not every slider position --
# see README.md.
test-notebooks:
	.venv/bin/jupyter nbconvert --to notebook --execute --inplace \
		--ExecutePreprocessor.timeout=60 --ExecutePreprocessor.kernel_name=python3 \
		notebooks/*.ipynb

# Drive the standalone HTML/JS pages with a headless browser (Playwright).
test-html:
	npm test

test: test-notebooks test-html

clean-venv:
	rm -rf .venv
