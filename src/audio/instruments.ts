// instruments.ts — Async instrument factory using SoundFont samplers.
// All instruments are Tone.Sampler instances loaded from FluidR3_GM CDN
// or self-hosted drum samples. Caching is handled by sampler-cache.ts.

import * as Tone from "tone";
import type { InstrumentType } from "@/types";
import { getSampler } from "./sampler-cache";

export type AnyInstrument = Tone.Sampler;

/** Create (or retrieve cached) instrument sampler for the given type. */
export async function createInstrument(
  type: InstrumentType
): Promise<AnyInstrument> {
  return getSampler(type);
}
