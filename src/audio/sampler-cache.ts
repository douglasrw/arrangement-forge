// sampler-cache.ts — Singleton cache for Tone.Sampler instances.
// Deduplicates concurrent load requests. Samplers persist across arrangement reloads.

import * as Tone from "tone";
import type { InstrumentType } from "@/types";
import { SampledDrumKit } from "@/audio/sampled-drum-kit";

const CDN_BASE =
  "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/";

/** CDN instrument folders and sparse sample notes per instrument type. */
const INSTRUMENT_CONFIG: Record<
  InstrumentType,
  | { kind: "cdn"; folder: string; notes: string[] }
  | { kind: "local"; urls: Record<string, string>; baseUrl: string }
  | { kind: "sampled" }
> = {
  piano: {
    kind: "cdn",
    folder: "acoustic_grand_piano-mp3",
    notes: ["C2", "C3", "C4", "C5", "C6"],
  },
  bass: {
    kind: "cdn",
    folder: "electric_bass_finger-mp3",
    notes: ["C1", "C2", "C3", "C4"],
  },
  guitar: {
    kind: "cdn",
    folder: "acoustic_guitar_nylon-mp3",
    notes: ["C2", "C3", "C4", "C5"],
  },
  strings: {
    kind: "cdn",
    folder: "string_ensemble_1-mp3",
    notes: ["C2", "C3", "C4", "C5", "C6"],
  },
  drums: {
    kind: "sampled",
  },
};

const cache = new Map<InstrumentType, Tone.Sampler>();
const loading = new Map<InstrumentType, Promise<Tone.Sampler>>();

function buildSamplerUrls(
  cfg: (typeof INSTRUMENT_CONFIG)[InstrumentType]
): { urls: Record<string, string>; baseUrl?: string } {
  if (cfg.kind === "sampled") {
    // Sampled drums use SampledDrumKit, not Tone.Sampler URLs
    return { urls: {} };
  }
  if (cfg.kind === "local") {
    return { urls: cfg.urls, baseUrl: cfg.baseUrl };
  }
  // CDN: build note → URL mapping
  const urls: Record<string, string> = {};
  for (const note of cfg.notes) {
    urls[note] = `${note.replace("#", "%23")}.mp3`;
  }
  return { urls, baseUrl: `${CDN_BASE}${cfg.folder}/` };
}

async function createSampler(type: InstrumentType): Promise<Tone.Sampler> {
  const cfg = INSTRUMENT_CONFIG[type];

  // Sampled drums — load OGG samples via SampledDrumKit
  if (cfg.kind === "sampled") {
    const kit = new SampledDrumKit();
    await kit.load();
    return kit as unknown as Tone.Sampler;
  }

  const { urls, baseUrl } = buildSamplerUrls(cfg);

  return new Promise<Tone.Sampler>((resolve, reject) => {
    const sampler = new Tone.Sampler({
      urls,
      baseUrl,
      onload: () => resolve(sampler),
      onerror: (err) => reject(err),
    });
  });
}

/**
 * Get a cached sampler for the given instrument type.
 * Returns instantly if already loaded; deduplicates concurrent requests.
 */
export async function getSampler(
  type: InstrumentType
): Promise<Tone.Sampler> {
  const existing = cache.get(type);
  if (existing) return existing;

  const inflight = loading.get(type);
  if (inflight) return inflight;

  const promise = createSampler(type);
  loading.set(type, promise);

  try {
    const sampler = await promise;
    cache.set(type, sampler);
    return sampler;
  } finally {
    loading.delete(type);
  }
}

/** Check if all instrument types are already cached (instant playback). */
export function allCached(types: InstrumentType[]): boolean {
  return types.every((t) => cache.has(t));
}
