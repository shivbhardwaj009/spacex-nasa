.PHONY: setup test pipeline pipeline-mock pipeline-real web help

PYTHON ?= python
PIP ?= pip
NPM ?= npm

help:
	@echo "SPHEREx Sky Diary - NASA Space Apps Challenge 2026"
	@echo "Available make targets:"
	@echo "  make setup         - Install Python dependencies and initialize directories"
	@echo "  make test          - Run test suite (pytest)"
	@echo "  make pipeline      - Run complete offline pipeline"
	@echo "  make pipeline-mock - Run complete pipeline on synthetic mock data"
	@echo "  make pipeline-real - Run pipeline configured for real SPHEREx IRSA data"
	@echo "  make web           - Start Next.js development server"

setup:
	$(PIP) install -r requirements.txt
	@cd web && $(NPM) install

test:
	$(PYTHON) -m pytest -v tests

pipeline:
	$(PYTHON) scripts/run_pipeline.py

pipeline-mock:
	$(PYTHON) scripts/run_pipeline.py --config config/settings.yaml --data-source mock

pipeline-real:
	$(PYTHON) scripts/run_pipeline.py --config config/settings.yaml --data-source irsa

mock:
	$(PYTHON) data/mock/generate_mock.py

web:
	cd web && $(NPM) run dev
