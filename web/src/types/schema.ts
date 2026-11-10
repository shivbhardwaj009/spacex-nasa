/**
 * SPHEREx Sky Diary Contract Schema TypeScript Interfaces (v1.0)
 * Derived from docs/schema.json
 */

export interface Region {
  name: string;
  ra_center: number;
  dec_center: number;
  radius_deg: number;
}

export interface Epoch {
  epoch_id: string;
  date: string;
  band_count: number;
}

export interface Motion {
  ra_rate_arcsec_per_day: number;
  dec_rate_arcsec_per_day: number;
}

export interface Detection {
  epoch_id: string;
  date: string;
  ra: number;
  dec: number;
  flux: number;
  cutout_url: string;
}

export interface Spectrum {
  wavelength_um: number[];
  flux: number[];
  flux_err: number[];
}

export interface Mover {
  object_id: string;
  ra: number;
  dec: number;
  type: "known" | "unknown";
  match_name: string | null;
  confidence: number;
  is_synthetic: boolean;
  motion: Motion;
  detections: Detection[];
  spectrum: Spectrum | null;
}

export interface CandidatesPayload {
  schema_version: "1.0";
  data_version?: string;
  generated_at?: string;
  fov_deg?: number;
  region: Region;
  epochs: Epoch[];
  movers: Mover[];
}

