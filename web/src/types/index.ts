/**
 * SPHEREx Sky Diary - Type Definitions.
 *
 * Types derived directly from schema v1.0 via json-schema-to-typescript.
 */

import { SPHERExSkyDiaryContractSchema } from "./schema";

export * from "./schema";

export type CandidateCatalog = SPHERExSkyDiaryContractSchema;
export type MoverCandidate = SPHERExSkyDiaryContractSchema["movers"][number];
export type Detection = MoverCandidate["detections"][number];
export type MoverDetection = Detection;
export type Spectrum = NonNullable<MoverCandidate["spectrum"]>;
export type EpochInfo = SPHERExSkyDiaryContractSchema["epochs"][number];
export type RegionInfo = SPHERExSkyDiaryContractSchema["region"];

