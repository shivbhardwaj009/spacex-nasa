"""SPHEREx Data Source Factory.

Instantiates EpochSource implementations based on config/settings.yaml.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

import yaml

from data.adapter.base import EpochSource
from data.adapter.irsa_source import IrsaFitsSource
from data.adapter.mock_source import MockSource

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def load_config(config_path: Optional[str | Path] = None) -> Dict[str, Any]:
    """Load configuration from YAML file."""
    path = Path(config_path or (PROJECT_ROOT / "config" / "settings.yaml"))
    if not path.is_file():
        return {"data_source": "mock"}
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def get_source(config: Optional[Dict[str, Any] | str | Path] = None) -> EpochSource:
    """Factory creating EpochSource instance based on config data_source setting.

    Parameters
    ----------
    config : dict | str | Path, optional
        Configuration dictionary or path to settings.yaml.

    Returns
    -------
    EpochSource
        MockSource if data_source is 'mock', or IrsaFitsSource if 'irsa'.

    Raises
    ------
    ValueError
        If data_source is not recognized.
    """
    if isinstance(config, (str, Path)):
        cfg = load_config(config)
    elif isinstance(config, dict):
        cfg = config
    else:
        cfg = load_config()

    data_source = cfg.get("data_source", "mock").strip().lower()

    if data_source == "mock":
        mock_cfg = cfg.get("mock", {})
        seed = mock_cfg.get("random_seed", 42)
        return MockSource(seed=seed)
    elif data_source == "irsa":
        data_dir = cfg.get("pipeline", {}).get("raw_dir", "data/raw")
        return IrsaFitsSource(data_dir=data_dir)
    else:
        raise ValueError(
            f"Unsupported data_source: '{data_source}'. Must be either 'mock' or 'irsa'."
        )

