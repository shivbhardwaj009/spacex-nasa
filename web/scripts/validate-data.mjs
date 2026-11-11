#!/usr/bin/env node
/**
 * SPHEREx Sky Diary - Prebuild Schema & Asset Validator.
 *
 * Validates:
 * 1. candidates.json against schema v1.0 specifications and semantic invariants.
 * 2. Every referenced cutout_url actually exists on disk in web/public/.
 * 3. Every referenced epoch frame in frames_manifest.json exists on disk.
 *
 * Exits with status 1 on any error to halt 'npm run build'.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WEB_ROOT = path.resolve(__dirname, "..");
const PROJECT_ROOT = path.resolve(WEB_ROOT, "..");
const PUBLIC_DATA_DIR = path.join(WEB_ROOT, "public", "data");
const SCHEMA_FILE = path.join(PROJECT_ROOT, "docs", "schema.json");

console.log("================================================================================");
console.log("SPHEREx Sky Diary - Prebuild Data & Schema Verification");
console.log("================================================================================");

let hasErrors = false;

function reportError(msg) {
  console.error(`[VALIDATION ERROR] ${msg}`);
  hasErrors = true;
}

// 1. Verify schema definition exists
if (!fs.existsSync(SCHEMA_FILE)) {
  reportError(`Schema contract file missing at: ${SCHEMA_FILE}`);
}

const candidatesPath = path.join(PUBLIC_DATA_DIR, "candidates.json");
if (!fs.existsSync(candidatesPath)) {
  reportError(`candidates.json missing from public data directory: ${candidatesPath}`);
} else {
  let doc;
  try {
    const raw = fs.readFileSync(candidatesPath, "utf-8");
    doc = JSON.parse(raw);
  } catch (err) {
    reportError(`Failed to parse candidates.json as valid JSON: ${err.message}`);
  }

  if (doc) {
    // 2. Validate schema_version
    if (doc.schema_version !== "1.0") {
      reportError(`Unsupported schema_version '${doc.schema_version}'. Expected '1.0'.`);
    }

    // 3. Validate region
    if (!doc.region || typeof doc.region !== "object") {
      reportError("Missing required 'region' object in candidates.json.");
    } else {
      if (typeof doc.region.ra_center !== "number" || typeof doc.region.dec_center !== "number") {
        reportError("Region must contain valid numerical 'ra_center' and 'dec_center'.");
      }
    }

    // 4. Validate epochs
    if (!Array.isArray(doc.epochs) || doc.epochs.length === 0) {
      reportError("Candidates document must contain non-empty 'epochs' array.");
    } else {
      for (const [idx, ep] of doc.epochs.entries()) {
        if (!ep.epoch_id || typeof ep.epoch_id !== "string") {
          reportError(`Epoch at index ${idx} missing string 'epoch_id'.`);
        }
        if (!ep.date || isNaN(new Date(ep.date).getTime())) {
          reportError(`Epoch at index ${idx} ('${ep.epoch_id}') has invalid ISO date '${ep.date}'.`);
        }
      }
    }

    // 5. Validate movers and verify referenced cutout files on disk
    if (!Array.isArray(doc.movers)) {
      reportError("Field 'movers' must be an array.");
    } else {
      let missingCutoutsCount = 0;
      let totalDetectionsCount = 0;

      for (const [idx, m] of doc.movers.entries()) {
        if (!m.object_id) {
          reportError(`Mover at index ${idx} missing 'object_id'.`);
        }
        if (m.type !== "known" && m.type !== "unknown") {
          reportError(`Mover '${m.object_id}' has invalid type '${m.type}'. Must be 'known' or 'unknown'.`);
        }
        if (typeof m.confidence !== "number" || m.confidence < 0 || m.confidence > 1) {
          reportError(`Mover '${m.object_id}' confidence ${m.confidence} out of range [0.0, 1.0].`);
        }
        if (typeof m.is_synthetic !== "boolean") {
          reportError(`Mover '${m.object_id}' missing boolean 'is_synthetic'.`);
        }
        if (!Array.isArray(m.detections) || m.detections.length === 0) {
          reportError(`Mover '${m.object_id}' must have at least 1 detection.`);
        } else {
          for (const det of m.detections) {
            totalDetectionsCount++;
            if (!det.cutout_url) {
              reportError(`Mover '${m.object_id}' detection at epoch '${det.epoch_id}' missing 'cutout_url'.`);
            } else {
              // Verify file existence in web/public/
              const cleanRel = det.cutout_url.startsWith("/") ? det.cutout_url.slice(1) : det.cutout_url;
              const diskPath = path.join(WEB_ROOT, "public", cleanRel);
              if (!fs.existsSync(diskPath)) {
                missingCutoutsCount++;
                if (missingCutoutsCount <= 5) {
                  reportError(`Referenced cutout image does not exist on disk: ${cleanRel} (expected at ${diskPath})`);
                }
              }
            }
          }
        }
      }

      if (missingCutoutsCount > 5) {
        reportError(`... and ${missingCutoutsCount - 5} additional referenced cutouts are missing from disk.`);
      }

      console.log(`[✓] Checked ${doc.movers.length} movers and ${totalDetectionsCount} detections.`);
    }

    // 6. Verify Python docs/validate.py validation if python is available
    try {
      const validatorPy = path.join(PROJECT_ROOT, "docs", "validate.py");
      if (fs.existsSync(validatorPy)) {
        execFileSync("python", [validatorPy, candidatesPath], {
          encoding: "utf-8",
          stdio: "pipe",
        });
        console.log("[✓] Python docs/validate.py confirmed full jsonschema draft 2020-12 compliance.");
      }
    } catch (pyErr) {
      reportError(`Full schema validation via docs/validate.py failed: ${pyErr.message}`);
    }
  }
}

// 7. Verify frames_manifest.json and frame images if present
const manifestPath = path.join(PUBLIC_DATA_DIR, "frames_manifest.json");
if (fs.existsSync(manifestPath)) {
  try {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const m = JSON.parse(raw);
    if (Array.isArray(m.frames)) {
      for (const f of m.frames) {
        if (f.file) {
          const frameRel = f.file.startsWith("/") ? f.file.slice(1) : f.file;
          // Could be relative to frames/ or web/public/
          const candidate1 = path.join(PUBLIC_DATA_DIR, "frames", path.basename(frameRel));
          const candidate2 = path.join(WEB_ROOT, "public", frameRel);
          if (!fs.existsSync(candidate1) && !fs.existsSync(candidate2)) {
            reportError(`Referenced frame file missing on disk: ${f.file}`);
          }
        }
      }
      console.log(`[✓] Checked ${m.frames.length} epoch display frames.`);
    }
  } catch (err) {
    reportError(`Failed to parse frames_manifest.json: ${err.message}`);
  }
}

console.log("================================================================================");
if (hasErrors) {
  console.error("FAILED: Prebuild schema or asset validation failed! Aborting build.");
  console.log("================================================================================");
  process.exit(1);
} else {
  console.log("SUCCESS: All static data payloads & assets verified against Schema v1.0!");
  console.log("================================================================================");
  process.exit(0);
}

