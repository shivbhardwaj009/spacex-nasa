/**
 * SPHEREx Sky Diary - Challenge Targets & Offline Dictionary.
 *
 * Guarantees zero-network offline coordinate lookups for the 5 challenge targets:
 * Barnard's Star, Epsilon Indi B, WISE 0855, RW Aurigae, R Draconis.
 */

export interface TargetMetadata {
  name: string;
  aliases: string[];
  ra: number;   // Right Ascension in degrees (J2000)
  dec: number;  // Declination in degrees (J2000)
  description: string;
  category: "high-proper-motion" | "brown-dwarf" | "young-stellar" | "variable-star";
  fovDefault: number;
}

// TODO(VERIFY): Confirm optimal SPHEREx Deep Field epoch coverage coordinates for challenge targets.
export const CHALLENGE_TARGETS: TargetMetadata[] = [
  {
    name: "Barnard's Star",
    aliases: ["Barnard", "V2500 Oph", "GJ 699", "HIP 87937"],
    // TODO(VERIFY): High-proper-motion star in Ophiuchus (10.3 arcsec/year)
    ra: 269.45208,
    dec: 4.69339,
    description: "Fastest known proper-motion star in the celestial sphere (10.3\"/year).",
    category: "high-proper-motion",
    fovDefault: 0.2,
  },
  {
    name: "Epsilon Indi B",
    aliases: ["Eps Ind B", "HD 209013 B", "GJ 845 B"],
    // TODO(VERIFY): Cold binary brown dwarf system (T1 + T6)
    ra: 330.84025,
    dec: -56.78608,
    description: "Nearby cold binary brown dwarf system with prominent methane/water absorption.",
    category: "brown-dwarf",
    fovDefault: 0.2,
  },
  {
    name: "WISE 0855",
    aliases: ["WISE 0855-0714", "WISE J085510.83-071442.5", "WISE0855"],
    // TODO(VERIFY): Sub-stellar mover with water clouds at 7.2 light-years (RA 08h55m10.831s, Dec -07d14m42.53s)
    ra: 133.79513,
    dec: -7.24515,
    description: "Fourth-closest sub-stellar system to the Sun (~250K) with candidate water-ice clouds.",
    category: "brown-dwarf",
    fovDefault: 0.2,
  },
  {
    name: "RW Aurigae",
    aliases: ["RW Aur", "HD 33904", "HIP 24450"],
    // TODO(VERIFY): Complex young stellar binary with circumstellar dust disk
    ra: 77.10850,
    dec: 30.40142,
    description: "T Tauri young binary star with active circumstellar dust and gas accretion.",
    category: "young-stellar",
    fovDefault: 0.2,
  },
  {
    name: "R Draconis",
    aliases: ["R Dra", "HD 149886", "HIP 80687"],
    // TODO(VERIFY): High-amplitude Mira-type pulsating variable star
    ra: 247.55446,
    dec: 66.70278,
    description: "High-amplitude Mira pulsating variable star with strong infrared molecular features.",
    category: "variable-star",
    fovDefault: 0.2,
  },
];

/**
 * Find challenge target by name or alias without requiring network access.
 */
export function lookupOfflineTarget(query: string): TargetMetadata | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  for (const t of CHALLENGE_TARGETS) {
    if (t.name.toLowerCase() === q) return t;
    if (t.aliases.some((a) => a.toLowerCase() === q)) return t;
    // Substring match for quick access
    if (t.name.toLowerCase().includes(q) || q.includes(t.name.toLowerCase())) return t;
  }
  return null;
}

