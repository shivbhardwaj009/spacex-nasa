.PHONY: setup test pipeline web help

PYTHON ?= python
PIP ?= pip
NPM ?= npm

help:
	@echo "SPHEREx Sky Diary - NASA Space Apps Challenge 2026"
	@echo "Available make targets:"
	@echo "  make setup     - Install Python dependencies and initialize directories"
	@echo "  make test      - Run test suite (pytest)"
	@echo "  make pipeline  - Run offline pipeline / mock data generator"
	@echo "  make web       - Start Next.js development server"

setup:
	$(PIP) install -r requirements.txt
	@cd web && $(NPM) install

test:
	$(PYTHON) -m pytest -v tests

pipeline:
	$(PYTHON) -m detection.processing --config config/settings.yaml
	$(PYTHON) -m detection.movers.pipeline
	$(PYTHON) -m matching
	$(PYTHON) -m spectra

mock:
	$(PYTHON) data/mock/generate_mock.py

web:
	cd web && $(NPM) run dev

