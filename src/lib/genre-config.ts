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
  swing: boolean;
  dynamics: boolean;
}

export const GENRE_SLIDERS: Record<string, GenreSliderConfig> = {
  Jazz: { energy: true, groove: true, swing: true, dynamics: true },
  Blues: { energy: true, groove: true, swing: true, dynamics: true },
  Rock: { energy: true, groove: true, swing: false, dynamics: true },
  Funk: { energy: true, groove: true, swing: true, dynamics: true },
  Country: { energy: true, groove: true, swing: true, dynamics: true },
  Gospel: { energy: true, groove: true, swing: true, dynamics: true },
  'R&B': { energy: true, groove: true, swing: true, dynamics: true },
  Latin: { energy: true, groove: true, swing: true, dynamics: true },
  Pop: { energy: true, groove: true, swing: false, dynamics: true },
};

export const GENRES: string[] = Object.keys(GENRE_SUBSTYLES);

export const DEFAULT_GENRE = 'Jazz';
