"""SPHEREx Sky Diary JSON Schema Validator.

Validates candidate mover files against docs/schema.json (Draft 2020-12)
and enforces semantic integrity constraints (e.g., spectral array lengths).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import jsonschema
from jsonschema import Draft202012Validator


class ContractValidationError(ValueError):
    """Raised when data fails schema validation or semantic invariants."""
    pass


def get_default_schema_path() -> Path:
    """Return the absolute path to docs/schema.json."""
    return Path(__file__).resolve().parent / "schema.json"


def load_schema(schema_path: Optional[str | Path] = None) -> Dict[str, Any]:
    """Load and parse the JSON Schema document."""
    path = Path(schema_path) if schema_path else get_default_schema_path()
    if not path.is_file():
        raise FileNotFoundError(f"Schema file not found at {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def validate_file(
    file_path: str | Path,
    schema_path: Optional[str | Path] = None
) -> Dict[str, Any]:
    """Validate a JSON file against schema.json and semantic invariants.

    Parameters
    ----------
    file_path : str | Path
        Path to candidate JSON file.
    schema_path : str | Path, optional
        Custom schema path. Defaults to docs/schema.json.

    Returns
    -------
    dict
        Parsed and validated candidate payload.

    Raises
    ------
    FileNotFoundError
        If file_path or schema_path does not exist.
    ContractValidationError
        If schema validation fails or semantic invariants are violated.
    """
    target = Path(file_path)
    if not target.is_file():
        raise FileNotFoundError(f"Target data file not found at {target}")

    with open(target, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as err:
            raise ContractValidationError(f"Invalid JSON syntax in {target}: {err}") from err

    schema = load_schema(schema_path)
    validator = Draft202012Validator(schema)

    errors: List[str] = []
    for err in sorted(validator.iter_errors(data), key=lambda e: e.path):
        loc = ".".join(str(p) for p in err.path) or "root"
        errors.append(f"Field '{loc}': {err.message}")

    if errors:
        error_msg = f"Schema validation failed for {target} with {len(errors)} error(s):\n" + "\n".join(f" - {e}" for e in errors)
        raise ContractValidationError(error_msg)

    # Semantic invariant checks beyond standard JSON Schema
    epoch_ids = {e["epoch_id"] for e in data.get("epochs", [])}

    for idx, mover in enumerate(data.get("movers", [])):
        obj_id = mover.get("object_id", f"mover[{idx}]")

        # Verify detections reference defined epochs
        for d_idx, det in enumerate(mover.get("detections", [])):
            if det.get("epoch_id") not in epoch_ids:
                errors.append(
                    f"Mover '{obj_id}' detection[{d_idx}] references unknown epoch_id '{det.get('epoch_id')}'"
                )

        # Verify spectrum array length equality
        spectrum = mover.get("spectrum")
        if spectrum is not None:
            w_len = len(spectrum.get("wavelength_um", []))
            f_len = len(spectrum.get("flux", []))
            e_len = len(spectrum.get("flux_err", []))

            if not (w_len == f_len == e_len):
                errors.append(
                    f"Mover '{obj_id}' spectrum array length mismatch: "
                    f"wavelength_um({w_len}) vs flux({f_len}) vs flux_err({e_len})"
                )

    if errors:
        error_msg = f"Semantic invariant validation failed for {target}:\n" + "\n".join(f" - {e}" for e in errors)
        raise ContractValidationError(error_msg)

    return data


def main() -> None:
    """CLI runner for validation."""
    if len(sys.argv) < 2:
        print("Usage: python docs/validate.py <path_to_json>")
        sys.exit(1)

    target_path = sys.argv[1]
    try:
        data = validate_file(target_path)
        print(f"[OK] {target_path} is valid schema v{data.get('schema_version')} with {len(data.get('movers', []))} movers.")
    except Exception as exc:
        print(f"[ERROR] Validation failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

