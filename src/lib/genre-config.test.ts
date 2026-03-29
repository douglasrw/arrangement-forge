import { describe, it, expect } from 'vitest';
import {
  DEFAULT_GENRE,
  GENRES,
  GENRE_SLIDERS,
  GENRE_SUBSTYLES,
  getDefaultProjectStyle,
  getDefaultSubStyleForGenre,
  normalizeGenrePreference,
} from './genre-config';

describe('GENRE_SUBSTYLES', () => {
  it('contains Jazz with Swing', () => {
    expect(GENRE_SUBSTYLES['Jazz']).toContain('Swing');
  });

  it('contains Latin with Bossa Nova', () => {
    expect(GENRE_SUBSTYLES['Latin']).toContain('Bossa Nova');
  });

  it('has 9 genres', () => {
    expect(Object.keys(GENRE_SUBSTYLES)).toHaveLength(9);
  });

  it('all genres have at least 4 sub-styles', () => {
    for (const substyles of Object.values(GENRE_SUBSTYLES)) {
      expect(substyles.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('GENRE_SLIDERS', () => {
  it('Jazz has all 5 sliders enabled', () => {
    expect(GENRE_SLIDERS['Jazz']).toEqual({ energy: true, groove: true, feel: true, swing: true, dynamics: true });
  });

  it('Rock has swing disabled', () => {
    expect(GENRE_SLIDERS['Rock'].swing).toBe(false);
  });

  it('Pop has swing disabled', () => {
    expect(GENRE_SLIDERS['Pop'].swing).toBe(false);
  });

  it('has entries for all genres', () => {
    for (const genre of Object.keys(GENRE_SUBSTYLES)) {
      expect(GENRE_SLIDERS[genre]).toBeDefined();
    }
  });
});

describe('GENRES', () => {
  it('is an array of genre names', () => {
    expect(Array.isArray(GENRES)).toBe(true);
    expect(GENRES).toContain('Jazz');
    expect(GENRES).toContain('Blues');
  });
});

describe('DEFAULT_GENRE', () => {
  it('is Jazz', () => expect(DEFAULT_GENRE).toBe('Jazz'));
});

describe('project style defaults', () => {
  it('keeps supported genre preferences intact', () => {
    expect(normalizeGenrePreference('Pop')).toBe('Pop');
    expect(getDefaultSubStyleForGenre('Pop')).toBe('Synth Pop');
  });

  it('falls back to the canonical default for missing or unsupported genres', () => {
    expect(normalizeGenrePreference(null)).toBe('Jazz');
    expect(getDefaultProjectStyle('Unsupported')).toEqual({
      genre: 'Jazz',
      subStyle: 'Swing',
    });
  });
});
