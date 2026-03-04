// project.ts — Data model types mirroring the Supabase database schema.
// All fields use camelCase (transformed from snake_case at the Supabase boundary).

export interface Profile {
  id: string;
  displayName: string;
  chordDisplayMode: 'letter' | 'roman';
  defaultGenre: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  key: string;
  tempo: number; // 40-240
  timeSignature: string; // '4/4', '3/4', '6/8', etc.
  genre: string;
  subStyle: string;
  energy: number; // 0-100
  groove: number; // 0-100 complexity (pattern busyness)
  feel: number; // 0-100 humanization (timing looseness)
  swingPct: number | null; // 50-80, null = not applicable
  dynamics: number; // 0-100
  generationHints: string;
  chordChartRaw: string;
  hasArrangement: boolean;
  generatedAt: string | null;
  generatedTempo: number | null;
  createdAt: string;
  updatedAt: string;
}

export type InstrumentType = 'drums' | 'bass' | 'piano' | 'guitar' | 'strings';

export interface Stem {
  id: string;
  projectId: string;
  instrument: InstrumentType;
  sortOrder: number;
  volume: number; // 0.0-1.0
  pan: number; // -1.0 (L) to 1.0 (R)
  isMuted: boolean;
  isSolo: boolean;
  createdAt: string;
}

export interface Section {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
  barCount: number;
  startBar: number;
  energyOverride: number | null;
  grooveOverride: number | null;
  feelOverride: number | null;
  swingPctOverride: number | null;
  dynamicsOverride: number | null;
  createdAt: string;
}

export interface Block {
  id: string;
  stemId: string;
  sectionId: string;
  startBar: number;
  endBar: number;
  chordDegree: string | null;
  chordQuality: string | null;
  chordBassDegree: string | null;
  style: string;
  energyOverride: number | null;
  dynamicsOverride: number | null;
  midiData: MidiNoteData[];
  createdAt: string;
}

export interface Chord {
  id: string;
  projectId: string;
  barNumber: number;
  degree: string | null; // 'I', 'ii', 'V', 'bII', null = N.C.
  quality: string | null; // 'maj7', 'min7', 'dom7'
  bassDegree: string | null; // for slash chords
}

export interface AiChatMessage {
  id: string;
  projectId: string;
  role: 'user' | 'assistant';
  content: string;
  scope: 'setup' | 'song' | 'section' | 'block';
  scopeTarget: string | null;
  createdAt: string;
}

export interface MidiNoteData {
  note: string; // 'C4', 'Bb3'
  time: number; // beats from block start
  duration: number; // beats
  velocity: number; // 0-127
}

// --- Generation API types ---

export interface GenerationRequest {
  project_id: string;
  key: string;
  tempo: number;
  time_signature: string;
  genre: string;
  sub_style: string;
  energy: number;
  groove: number;
  feel: number;
  swing_pct: number | null;
  dynamics: number;
  chords: ChordEntry[];
  generation_hints: string;
  stems: string[];
}

export interface ChordEntry {
  bar_number: number;
  degree: string | null;
  quality: string | null;
  bass_degree: string | null;
}

export interface GenerationResponse {
  sections: SectionData[];
  stems: StemData[];
  blocks: BlockData[];
  chords: ChordData[];
}

export interface SectionData {
  name: string;
  sort_order: number;
  bar_count: number;
  start_bar: number;
}

export interface StemData {
  instrument: string;
  sort_order: number;
}

export interface BlockData {
  stem_instrument: string;
  section_name: string;
  start_bar: number;
  end_bar: number;
  chord_degree: string | null;
  chord_quality: string | null;
  style: string;
  midi_data: MidiNoteData[];
}

export interface ChordData {
  bar_number: number;
  degree: string | null;
  quality: string | null;
  bass_degree: string | null;
}
