import { describe, it, expect } from 'vitest';
import {
  DEFAULT_GENRE,
  GENRES,
  GENRE_SLIDERS,
  GENRE_SUBSTYLES,
  getDefaultProjectStyle,
  getDefaultProjectStyleTruth,
  getDefaultSubStyleForGenre,
  getInstrumentStyleOptionById,
  getInstrumentStyleSelectionTruth,
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

  it('makes the canonical fallback path explicit when no saved genre exists', () => {
    expect(getDefaultProjectStyleTruth(null)).toEqual({
      requestedGenre: null,
      effectiveGenre: 'Jazz',
      effectiveSubStyle: 'Swing',
      usedCanonicalDefault: true,
      currentState: 'No saved default genre is active, so new projects currently start as Jazz with Swing.',
      nextStep: 'Save a supported default genre here if you want new projects to start somewhere other than Jazz.',
    });
  });

  it('states the current starting point when a saved genre is present', () => {
    expect(getDefaultProjectStyleTruth('Pop')).toEqual({
      requestedGenre: 'Pop',
      effectiveGenre: 'Pop',
      effectiveSubStyle: 'Synth Pop',
      usedCanonicalDefault: false,
      currentState: 'New projects currently start as Pop with Synth Pop.',
      nextStep: 'Choose a different genre here if you want to change that starting point.',
    });
  });
});

describe('getInstrumentStyleSelectionTruth', () => {
  it('exposes canonical instrument style option lookup', () => {
    expect(getInstrumentStyleOptionById('guitar', 'rhythm_strum')).toEqual({
      id: 'rhythm_strum',
      label: 'Rhythm Strum',
    });
    expect(getInstrumentStyleOptionById('guitar', 'surf_lead')).toBeNull();
  });

  it('reports the selected bass style when the request is supported', () => {
    expect(getInstrumentStyleSelectionTruth('bass', 'slap')).toMatchObject({
      instrument: 'bass',
      requestedStyleId: 'slap',
      usedDefaultStyle: false,
      defaultStyleId: 'fingerstyle',
      defaultStyleLabel: 'Fingerstyle',
      selectedStyleId: 'slap',
      selectedStyleLabel: 'Slap',
      supportedStyleIds: ['walking', 'slap', 'pick', 'fingerstyle'],
      supportedStyleLabels: ['Walking', 'Slap', 'Pick', 'Fingerstyle'],
      fallbackApplied: false,
    });
  });

  it('reports the fallback and next step when the requested style is unsupported', () => {
    expect(getInstrumentStyleSelectionTruth('bass', 'walking_bass')).toEqual({
      instrument: 'bass',
      requestedStyleId: 'walking_bass',
      usedDefaultStyle: true,
      defaultStyleId: 'fingerstyle',
      defaultStyleLabel: 'Fingerstyle',
      selectedStyleId: 'fingerstyle',
      selectedStyleLabel: 'Fingerstyle',
      supportedStyleIds: ['walking', 'slap', 'pick', 'fingerstyle'],
      supportedStyleLabels: ['Walking', 'Slap', 'Pick', 'Fingerstyle'],
      fallbackApplied: true,
      currentState: 'bass style "walking_bass" is unavailable, so Fingerstyle is selected instead.',
      nextStep: 'Choose one of the supported bass styles: Walking, Slap, Pick, Fingerstyle.',
    });
  });

  it('makes the default instrument style explicit when the request is blank', () => {
    expect(getInstrumentStyleSelectionTruth('bass', '   ')).toEqual({
      instrument: 'bass',
      requestedStyleId: null,
      usedDefaultStyle: true,
      defaultStyleId: 'fingerstyle',
      defaultStyleLabel: 'Fingerstyle',
      selectedStyleId: 'fingerstyle',
      selectedStyleLabel: 'Fingerstyle',
      supportedStyleIds: ['walking', 'slap', 'pick', 'fingerstyle'],
      supportedStyleLabels: ['Walking', 'Slap', 'Pick', 'Fingerstyle'],
      fallbackApplied: false,
      currentState: 'No explicit bass style was requested, so the default Fingerstyle style is active.',
      nextStep: 'Keep the default Fingerstyle style or choose one of the supported bass styles: Walking, Slap, Pick, Fingerstyle.',
    });
  });
});
