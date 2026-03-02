// description-parser.ts — Free-text description → structured controls parser.
// Simple keyword matching for MVP. Not NLP.
// Returns suggested values; callers decide whether to apply them.

export interface ParseResult {
  genre?: string;
  subStyle?: string;
  energy?: number;
  tempo?: number;
  timeSignature?: string;
  key?: string;
  generationHints: string; // unparsed remainder
}

const GENRE_KEYWORDS: Record<string, string> = {
  jazz: 'Jazz',
  blues: 'Blues',
  rock: 'Rock',
  funk: 'Funk',
  country: 'Country',
  gospel: 'Gospel',
  'r&b': 'R&B',
  rnb: 'R&B',
  latin: 'Latin',
  bossa: 'Latin',
  samba: 'Latin',
  pop: 'Pop',
};

const SUBSTYLE_KEYWORDS: Record<string, string> = {
  swing: 'Swing',
  bebop: 'Bebop',
  cool: 'Cool',
  modal: 'Modal',
  fusion: 'Fusion',
  'latin jazz': 'Latin Jazz',
  delta: 'Delta',
  chicago: 'Chicago',
  texas: 'Texas',
  'bossa nova': 'Bossa Nova',
  tango: 'Tango',
  salsa: 'Salsa',
  boogie: 'Boogie',
  stride: 'Stride',
  punk: 'Punk',
  progressive: 'Progressive',
  bluegrass: 'Bluegrass',
  'neo-soul': 'Neo-soul',
  disco: 'Disco',
};

const ENERGY_KEYWORDS: Record<string, number> = {
  soft: 20,
  gentle: 25,
  mellow: 30,
  medium: 50,
  moderate: 50,
  high: 75,
  intense: 90,
  powerful: 85,
};

const TIME_SIG_KEYWORDS: Record<string, string> = {
  waltz: '3/4',
  march: '2/4',
};

const KEY_NAMES = [
  'C#', 'Db', 'D#', 'Eb', 'F#', 'Gb', 'G#', 'Ab', 'A#', 'Bb',
  'C', 'D', 'E', 'F', 'G', 'A', 'B',
];

export function parseDescription(text: string): ParseResult {
  const lower = text.toLowerCase();
  const result: ParseResult = { generationHints: '' };
  const consumed = new Set<string>();

  // Check multi-word substyle keywords first (longer matches first)
  for (const [kw, value] of Object.entries(SUBSTYLE_KEYWORDS)) {
    if (lower.includes(kw)) {
      result.subStyle = value;
      consumed.add(kw);
      break;
    }
  }

  // Genre
  for (const [kw, value] of Object.entries(GENRE_KEYWORDS)) {
    if (lower.includes(kw)) {
      result.genre = value;
      consumed.add(kw);
      break;
    }
  }

  // Energy
  for (const [kw, value] of Object.entries(ENERGY_KEYWORDS)) {
    if (lower.includes(kw)) {
      result.energy = value;
      consumed.add(kw);
      break;
    }
  }

  // Time signature
  for (const [kw, value] of Object.entries(TIME_SIG_KEYWORDS)) {
    if (lower.includes(kw)) {
      result.timeSignature = value;
      consumed.add(kw);
      break;
    }
  }

  // Explicit time signature pattern (e.g. "3/4", "6/8")
  const timeSigMatch = text.match(/\b(\d\/\d)\b/);
  if (timeSigMatch) {
    result.timeSignature = timeSigMatch[1];
    consumed.add(timeSigMatch[1]);
  }

  // Tempo (e.g. "120 bpm", "bpm 140", "tempo: 90")
  const tempoMatch = text.match(/\b(\d{2,3})\s*bpm\b/i) ?? text.match(/\btempo[:\s]+(\d{2,3})\b/i);
  if (tempoMatch) {
    const bpm = parseInt(tempoMatch[1], 10);
    if (bpm >= 40 && bpm <= 240) {
      result.tempo = bpm;
      consumed.add(tempoMatch[0].toLowerCase());
    }
  }

  // Key (e.g. "key of Bb", "in C major", "in F#")
  const keyMatch = text.match(/\b(?:key\s+of\s+|in\s+)?([A-G][#b]?)\s*(?:major|minor|maj|min)?\b/);
  if (keyMatch) {
    const candidate = keyMatch[1];
    if (KEY_NAMES.includes(candidate) || /^[A-G]$/.test(candidate)) {
      result.key = candidate;
      consumed.add(keyMatch[0].toLowerCase());
    }
  }

  // Build generationHints from words not consumed by structured parsing
  const words = text.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  const hints = words.filter((word) => {
    const lw = word.toLowerCase();
    return !Array.from(consumed).some((kw) => lw.includes(kw));
  });
  result.generationHints = hints.join(', ');

  return result;
}
