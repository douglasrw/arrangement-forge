// genre-config.ts — Genre, sub-style, and slider visibility configuration.

export const GENRE_SUBSTYLES: Record<string, string[]> = {
  Jazz: ['Swing', 'Bebop', 'Cool', 'Modal', 'Free', 'Fusion', 'Latin Jazz'],
  Blues: ['Delta', 'Chicago', 'Texas', 'Jump Blues', 'Electric', 'Boogie'],
  Rock: ['Classic', 'Alternative', 'Indie', 'Progressive', 'Punk', 'Garage'],
  Funk: ['Classic Funk', 'P-Funk', 'Acid', 'Neo-soul', 'Disco'],
  Country: ['Traditional', 'Outlaw', 'Bluegrass', 'Country Pop', 'Western Swing'],
  Gospel: ['Traditional', 'Contemporary', 'Southern', 'Praise & Worship'],
  'R&B': ['Classic', 'Contemporary', 'New Jack Swing', 'Quiet Storm'],
  Latin: ['Bossa Nova', 'Samba', 'Son', 'Salsa', 'Bolero', 'Tango'],
  Pop: ['Synth Pop', 'Indie Pop', 'Power Pop', 'Dream Pop', 'Electropop'],
};

export interface GenreSliderConfig {
  energy: boolean;
  groove: boolean;
  feel: boolean;
  swing: boolean;
  dynamics: boolean;
}

export const GENRE_SLIDERS: Record<string, GenreSliderConfig> = {
  Jazz: { energy: true, groove: true, feel: true, swing: true, dynamics: true },
  Blues: { energy: true, groove: true, feel: true, swing: true, dynamics: true },
  Rock: { energy: true, groove: true, feel: true, swing: false, dynamics: true },
  Funk: { energy: true, groove: true, feel: true, swing: true, dynamics: true },
  Country: { energy: true, groove: true, feel: true, swing: true, dynamics: true },
  Gospel: { energy: true, groove: true, feel: true, swing: true, dynamics: true },
  'R&B': { energy: true, groove: true, feel: true, swing: true, dynamics: true },
  Latin: { energy: true, groove: true, feel: true, swing: true, dynamics: true },
  Pop: { energy: true, groove: true, feel: true, swing: false, dynamics: true },
};

export const GENRES: string[] = Object.keys(GENRE_SUBSTYLES);

export const DEFAULT_GENRE = 'Jazz';

// ---------- Drum Pattern Mapping ----------

/** Maps genre + substyle to a drum pattern ID used by drum-patterns.ts */
export const GENRE_DRUM_PATTERNS: Record<string, Record<string, string>> = {
  Jazz: {
    _default: 'jazz_swing',
    'Latin Jazz': 'latin_jazz',
    Fusion: 'fusion_straight',
  },
  Blues: {
    _default: 'blues_shuffle',
    'Jump Blues': 'blues_shuffle',
  },
  Rock: {
    _default: 'rock_straight',
    Punk: 'rock_straight',
    Garage: 'rock_straight',
  },
  Funk: {
    _default: 'funk_pocket',
    'P-Funk': 'funk_pocket',
    Disco: 'pop_four_on_floor',
    'Neo-soul': 'rnb_groove',
  },
  Country: {
    _default: 'country_shuffle',
    Outlaw: 'rock_straight',
    'Western Swing': 'jazz_swing',
    'Country Pop': 'pop_four_on_floor',
  },
  Gospel: {
    _default: 'gospel_drive',
  },
  'R&B': {
    _default: 'rnb_groove',
    'New Jack Swing': 'funk_pocket',
  },
  Latin: {
    _default: 'bossa_nova',
    Samba: 'samba',
    Salsa: 'salsa_cascara',
    Son: 'salsa_cascara',
  },
  Pop: {
    _default: 'pop_four_on_floor',
    'Indie Pop': 'rock_straight',
  },
};

/** Get the drum pattern ID for a genre and substyle combination. */
export function getDrumPatternId(genre: string, substyle: string): string {
  const genreMap = GENRE_DRUM_PATTERNS[genre];
  if (!genreMap) return 'rock_straight'; // safe fallback
  return genreMap[substyle] ?? genreMap['_default'] ?? 'rock_straight';
}
