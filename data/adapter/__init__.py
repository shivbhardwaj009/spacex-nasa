"""SPHEREx Sky Diary - Data Adapter Package.

Provides abstract and concrete epoch observation sources (Mock & IRSA),
metadata catalogs, and factory methods.
"""

from data.adapter.base import EpochImage, EpochInfo, EpochSource, RegionInfo
from data.adapter.factory import get_source, load_config
from data.adapter.irsa_source import IrsaFitsSource, query_irsa_cutouts
from data.adapter.metadata_catalog import (
    build_metadata_catalog,
    query_catalog_coverage,
    read_metadata_catalog,
)
from data.adapter.mock_source import MockSource

__all__ = [
    "EpochSource",
    "EpochInfo",
    "EpochImage",
    "RegionInfo",
    "MockSource",
    "IrsaFitsSource",
    "query_irsa_cutouts",
    "get_source",
    "load_config",
    "build_metadata_catalog",
    "read_metadata_catalog",
    "query_catalog_coverage",
]

