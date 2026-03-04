import { describe, it, expect } from 'vitest';
import {
  buildDrumMidi,
  applySwing,
  applyEnergy,
  applyDynamics,
  applyFeel,
  knuthHash,
  VALID_DRUM_NOTES,
  PATTERNS,
  FILLS,
} from './drum-patterns';
import type { MidiNoteData } from '@/types';

// Default params factory for tests
function makeParams(overrides: Partial<Parameters<typeof buildDrumMidi>[0]> = {}): Parameters<typeof buildDrumMidi>[0] {
  return {
    genre: 'Rock',
    substyle: 'Classic',
    barCount: 1,
    beatsPerBar: 4,
    energy: 50,
    dynamics: 50,
    swingPct: null,
    groove: 0,
    feel: 0,
    sectionType: 'Verse',
    sectionIndex: 1,
    isLastSection: false,
    barNumberInSection: 0,
    barNumberGlobal: 1,
    totalBarsInSection: 4,
    ...overrides,
  };
}

const ALL_GENRES = ['Jazz', 'Blues', 'Rock', 'Funk', 'Country', 'Gospel', 'R&B', 'Latin', 'Pop'];

describe('drum-patterns', () => {
  // ---- Basic Output ----

  describe('buildDrumMidi returns non-empty array for all 9 genres', () => {
    for (const genre of ALL_GENRES) {
      it(`${genre} returns notes`, () => {
        const notes = buildDrumMidi(makeParams({ genre }));
        expect(notes.length).toBeGreaterThan(0);
      });
    }
  });

  it('all returned notes have valid GM drum note names', () => {
    for (const genre of ALL_GENRES) {
      const notes = buildDrumMidi(makeParams({ genre }));
      for (const n of notes) {
        expect(VALID_DRUM_NOTES.has(n.note)).toBe(true);
      }
    }
  });

  it('all velocities are 0-110 (clamped range)', () => {
    for (const genre of ALL_GENRES) {
      const notes = buildDrumMidi(makeParams({ genre, energy: 90, dynamics: 90 }));
      for (const n of notes) {
        expect(n.velocity).toBeGreaterThanOrEqual(0);
        expect(n.velocity).toBeLessThanOrEqual(110);
      }
    }
  });

  it('all times are >= 0 and < beatsPerBar', () => {
    for (const genre of ALL_GENRES) {
      const notes = buildDrumMidi(makeParams({ genre, beatsPerBar: 4 }));
      for (const n of notes) {
        expect(n.time).toBeGreaterThanOrEqual(0);
        expect(n.time).toBeLessThan(4.1); // small tolerance for groove jitter
      }
    }
  });

  // ---- Energy Scaling ----

  it('energy scaling: count notes at energy=20 < count at energy=80', () => {
    const lowNotes = buildDrumMidi(makeParams({ energy: 20, dynamics: 50, groove: 0 }));
    const highNotes = buildDrumMidi(makeParams({ energy: 80, dynamics: 50, groove: 0 }));
    expect(lowNotes.length).toBeLessThan(highNotes.length);
  });

  // ---- Swing ----

  it('swing: upbeat note times differ between swingPct=50 and swingPct=67', () => {
    const straight = buildDrumMidi(makeParams({
      genre: 'Jazz',
      swingPct: 50,
      groove: 0,
      energy: 50,
      dynamics: 50,
    }));
    const swung = buildDrumMidi(makeParams({
      genre: 'Jazz',
      swingPct: 67,
      groove: 0,
      energy: 50,
      dynamics: 50,
    }));

    // Collect upbeat times (notes near 0.5 beat marks)
    const getUpbeats = (notes: MidiNoteData[]) =>
      notes.filter((n) => {
        const frac = n.time % 1;
        return frac > 0.3 && frac < 0.9;
      });

    const straightUpbeats = getUpbeats(straight);
    const swungUpbeats = getUpbeats(swung);

    // At least some notes should be at different positions
    if (straightUpbeats.length > 0 && swungUpbeats.length > 0) {
      const straightTimes = straightUpbeats.map((n) => n.time.toFixed(3));
      const swungTimes = swungUpbeats.map((n) => n.time.toFixed(3));
      // Not all times should match
      const allMatch = straightTimes.every((t, i) => t === swungTimes[i]);
      expect(allMatch).toBe(false);
    }
  });

  // ---- Dynamics ----

  it('dynamics: velocity spread at dynamics=20 < velocity spread at dynamics=80', () => {
    const narrow = buildDrumMidi(makeParams({ dynamics: 20, groove: 0, energy: 50 }));
    const wide = buildDrumMidi(makeParams({ dynamics: 80, groove: 0, energy: 50 }));

    const spread = (notes: MidiNoteData[]) => {
      if (notes.length === 0) return 0;
      const vels = notes.map((n) => n.velocity);
      return Math.max(...vels) - Math.min(...vels);
    };

    expect(spread(narrow)).toBeLessThan(spread(wide));
  });

  // ---- Fills ----

  it('fills: last bar of non-final section uses fill pattern', () => {
    // Bar in middle of section -- normal groove
    const normalBar = buildDrumMidi(makeParams({
      barNumberInSection: 0,
      totalBarsInSection: 4,
      isLastSection: false,
      barNumberGlobal: 5,
    }));

    // Last bar of section -- should be fill
    const fillBar = buildDrumMidi(makeParams({
      barNumberInSection: 3,
      totalBarsInSection: 4,
      isLastSection: false,
      barNumberGlobal: 8,
    }));

    // The fill should have different note composition than the normal bar
    const normalNotes = normalBar.map((n) => n.note).sort().join(',');
    const fillNotes = fillBar.map((n) => n.note).sort().join(',');
    // They should differ (fill includes toms or different snare patterns)
    expect(normalNotes).not.toBe(fillNotes);
  });

  // ---- Crash ----

  it('crash: first bar of non-intro section contains C#3 (crash)', () => {
    const notes = buildDrumMidi(makeParams({
      sectionType: 'Chorus',
      sectionIndex: 2,
      barNumberInSection: 0,
      barNumberGlobal: 9,
    }));

    const hasCrash = notes.some((n) => n.note === 'C#3');
    expect(hasCrash).toBe(true);
  });

  it('crash: Intro section (sectionIndex=0) does NOT have crash', () => {
    const notes = buildDrumMidi(makeParams({
      sectionType: 'Intro',
      sectionIndex: 0,
      barNumberInSection: 0,
      barNumberGlobal: 1,
    }));

    const hasCrash = notes.some((n) => n.note === 'C#3');
    expect(hasCrash).toBe(false);
  });

  // ---- Time Signature ----

  it('3/4 time: no notes at time >= 3.0 within a bar', () => {
    const notes = buildDrumMidi(makeParams({
      beatsPerBar: 3,
      groove: 0,
    }));

    for (const n of notes) {
      expect(n.time).toBeLessThan(3.0);
    }
  });

  // ---- Determinism ----

  it('determinism: same inputs produce same outputs on two calls', () => {
    const params = makeParams({ barNumberGlobal: 42 });
    const first = buildDrumMidi(params);
    const second = buildDrumMidi(params);

    expect(first.length).toBe(second.length);
    for (let i = 0; i < first.length; i++) {
      expect(first[i].note).toBe(second[i].note);
      expect(first[i].time).toBe(second[i].time);
      expect(first[i].velocity).toBe(second[i].velocity);
    }
  });

  // ---- Bar Variation ----

  it('no two consecutive bars have identical note arrays', () => {
    const bar1 = buildDrumMidi(makeParams({
      barNumberGlobal: 1,
      groove: 0,
      energy: 50,
      dynamics: 50,
    }));
    const bar2 = buildDrumMidi(makeParams({
      barNumberGlobal: 2,
      groove: 0,
      energy: 50,
      dynamics: 50,
    }));

    // Serialize for comparison
    const serialize = (notes: MidiNoteData[]) =>
      notes.map((n) => `${n.note}:${n.time.toFixed(4)}:${n.velocity}`).join('|');

    expect(serialize(bar1)).not.toBe(serialize(bar2));
  });

  // ---- Genre Structural Properties (AC #2) ----

  describe('genre structural tests', () => {
    it('Jazz: ride cymbal (D#3) is primary timekeeping (most hits, more than hi-hat)', () => {
      // Test across multiple bars to account for bar variation
      let rideCount = 0;
      let hihatCount = 0;
      for (let bar = 1; bar <= 4; bar++) {
        const notes = buildDrumMidi(makeParams({
          genre: 'Jazz',
          substyle: 'Swing',
          barNumberGlobal: bar,
          groove: 0,
          energy: 50,
          dynamics: 50,
          sectionIndex: 0,
        }));
        rideCount += notes.filter((n) => n.note === 'D#3' || n.note === 'F3').length;
        hihatCount += notes.filter((n) => n.note === 'F#2').length;
      }
      expect(rideCount).toBeGreaterThan(hihatCount);
    });

    it('Rock: hi-hat 8th notes with kick on beats 1 and 3', () => {
      const notes = buildDrumMidi(makeParams({
        genre: 'Rock',
        barNumberGlobal: 1,
        groove: 0,
        energy: 50,
        dynamics: 50,
        sectionIndex: 0,
      }));

      const hihatHits = notes.filter((n) => n.note === 'F#2');
      expect(hihatHits.length).toBeGreaterThanOrEqual(6); // at least 6 of 8 8th notes

      const kickHits = notes.filter((n) => n.note === 'C2');
      const hasKickOnBeat1 = kickHits.some((h) => Math.abs(h.time) < 0.1);
      const hasKickOnBeat3 = kickHits.some((h) => Math.abs(h.time - 2) < 0.1);
      expect(hasKickOnBeat1).toBe(true);
      expect(hasKickOnBeat3).toBe(true);
    });

    it('Funk: 16th-note hi-hats with ghost snare notes (velocity < 40)', () => {
      const notes = buildDrumMidi(makeParams({
        genre: 'Funk',
        barNumberGlobal: 1,
        groove: 0,
        energy: 50,
        dynamics: 50,
        sectionIndex: 0,
      }));

      const hihatHits = notes.filter((n) => n.note === 'F#2');
      expect(hihatHits.length).toBeGreaterThanOrEqual(12); // 16th-note hats

      const ghostSnares = notes.filter((n) => n.note === 'D2' && n.velocity < 40);
      expect(ghostSnares.length).toBeGreaterThanOrEqual(2);
    });

    it('Latin: includes side stick (C#2), hi-hat (F#2) absent', () => {
      // Test multiple bars to ensure pattern consistency
      let sideStickCount = 0;
      let hihatCount = 0;
      for (let bar = 1; bar <= 4; bar++) {
        const notes = buildDrumMidi(makeParams({
          genre: 'Latin',
          substyle: 'Bossa Nova',
          barNumberGlobal: bar,
          groove: 0,
          energy: 50,
          dynamics: 50,
          sectionIndex: 0,
        }));
        sideStickCount += notes.filter((n) => n.note === 'C#2').length;
        hihatCount += notes.filter((n) => n.note === 'F#2').length;
      }
      expect(sideStickCount).toBeGreaterThan(0);
      expect(hihatCount).toBe(0);
    });

    it('Country: side stick (C#2) on beats 2 and 4, snare (D2) absent from backbeat', () => {
      const notes = buildDrumMidi(makeParams({
        genre: 'Country',
        barNumberGlobal: 1,
        groove: 0,
        energy: 50,
        dynamics: 50,
        sectionIndex: 0,
      }));

      // Country uses side stick, not full snare on backbeats
      const sideStick = notes.filter((n) => n.note === 'C#2');
      const hasSideStickOn2 = sideStick.some((h) => Math.abs(h.time - 1) < 0.15);
      const hasSideStickOn4 = sideStick.some((h) => Math.abs(h.time - 3) < 0.15);
      expect(hasSideStickOn2).toBe(true);
      expect(hasSideStickOn4).toBe(true);

      // Should NOT have full snare on 2 and 4 (no D2 on backbeats)
      const snareOnBackbeats = notes.filter(
        (n) => n.note === 'D2' && (Math.abs(n.time - 1) < 0.15 || Math.abs(n.time - 3) < 0.15)
      );
      expect(snareOnBackbeats.length).toBe(0);
    });

    it('Blues: shuffle feel with kick on 1 and 3, snare on 2 and 4', () => {
      const notes = buildDrumMidi(makeParams({
        genre: 'Blues',
        barNumberGlobal: 1,
        groove: 0,
        energy: 50,
        dynamics: 50,
        sectionIndex: 0,
      }));

      const kicks = notes.filter((n) => n.note === 'C2');
      const hasKickOn1 = kicks.some((h) => Math.abs(h.time) < 0.1);
      const hasKickOn3 = kicks.some((h) => Math.abs(h.time - 2) < 0.1);
      expect(hasKickOn1).toBe(true);
      expect(hasKickOn3).toBe(true);

      const snares = notes.filter((n) => n.note === 'D2' && n.velocity >= 40);
      const hasSnareOn2 = snares.some((h) => Math.abs(h.time - 1) < 0.1);
      const hasSnareOn4 = snares.some((h) => Math.abs(h.time - 3) < 0.1);
      expect(hasSnareOn2).toBe(true);
      expect(hasSnareOn4).toBe(true);
    });

    it('Gospel: driving 8th-note hi-hat with strong backbeat', () => {
      const notes = buildDrumMidi(makeParams({
        genre: 'Gospel',
        barNumberGlobal: 1,
        groove: 0,
        energy: 50,
        dynamics: 50,
        sectionIndex: 0,
      }));

      const hihatHits = notes.filter((n) => n.note === 'F#2');
      expect(hihatHits.length).toBeGreaterThanOrEqual(6); // 8th notes

      // Strong backbeat
      const snares = notes.filter((n) => n.note === 'D2' && n.velocity >= 70);
      const hasSnareOn2 = snares.some((h) => Math.abs(h.time - 1) < 0.15);
      const hasSnareOn4 = snares.some((h) => Math.abs(h.time - 3) < 0.15);
      expect(hasSnareOn2).toBe(true);
      expect(hasSnareOn4).toBe(true);
    });

    it('R&B: 16th-note hi-hat with ghost notes (velocity < 40)', () => {
      const notes = buildDrumMidi(makeParams({
        genre: 'R&B',
        barNumberGlobal: 1,
        groove: 0,
        energy: 50,
        dynamics: 50,
        sectionIndex: 0,
      }));

      const hihatHits = notes.filter((n) => n.note === 'F#2');
      expect(hihatHits.length).toBeGreaterThanOrEqual(12);

      const ghostSnares = notes.filter((n) => n.note === 'D2' && n.velocity < 40);
      expect(ghostSnares.length).toBeGreaterThanOrEqual(1);
    });

    it('Pop: four-on-the-floor kick, snare on 2 and 4', () => {
      const notes = buildDrumMidi(makeParams({
        genre: 'Pop',
        barNumberGlobal: 1,
        groove: 0,
        energy: 50,
        dynamics: 50,
        sectionIndex: 0,
      }));

      const kicks = notes.filter((n) => n.note === 'C2');
      // Four-on-the-floor: kick on every beat
      const hasKickOn1 = kicks.some((h) => Math.abs(h.time) < 0.1);
      const hasKickOn2 = kicks.some((h) => Math.abs(h.time - 1) < 0.1);
      const hasKickOn3 = kicks.some((h) => Math.abs(h.time - 2) < 0.1);
      const hasKickOn4 = kicks.some((h) => Math.abs(h.time - 3) < 0.1);
      expect(hasKickOn1).toBe(true);
      expect(hasKickOn2).toBe(true);
      expect(hasKickOn3).toBe(true);
      expect(hasKickOn4).toBe(true);

      const snares = notes.filter((n) => n.note === 'D2');
      const hasSnareOn2 = snares.some((h) => Math.abs(h.time - 1) < 0.15);
      const hasSnareOn4 = snares.some((h) => Math.abs(h.time - 3) < 0.15);
      expect(hasSnareOn2).toBe(true);
      expect(hasSnareOn4).toBe(true);
    });
  });

  // ---- Utility Functions ----

  describe('knuthHash', () => {
    it('returns values between 0 and 1', () => {
      for (let i = 0; i < 100; i++) {
        const h = knuthHash(i);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(1);
      }
    });

    it('is deterministic', () => {
      expect(knuthHash(42)).toBe(knuthHash(42));
      expect(knuthHash(42, 7)).toBe(knuthHash(42, 7));
    });
  });

  describe('applySwing', () => {
    it('does not shift downbeats', () => {
      expect(applySwing(0, 0.67, 4)).toBe(0);
      expect(applySwing(1, 0.67, 4)).toBe(1);
      expect(applySwing(2, 0.67, 4)).toBe(2);
    });

    it('shifts upbeats when swing > 0.5', () => {
      const shifted = applySwing(0.5, 0.67, 4);
      expect(shifted).toBeGreaterThan(0.5);
    });

    it('no shift at swing=0.5 (straight)', () => {
      expect(applySwing(0.5, 0.5, 4)).toBe(0.5);
    });
  });

  describe('applyEnergy', () => {
    it('low energy removes 16th hats and ghost notes', () => {
      const input = [
        { note: 'F#2', time: 0.25, duration: 0.05, velocity: 45 }, // 16th hat - removed
        { note: 'F#2', time: 0.5,  duration: 0.1,  velocity: 55 }, // 8th hat - kept
        { note: 'D2',  time: 0.5,  duration: 0.1,  velocity: 30 }, // ghost - removed
        { note: 'D2',  time: 1,    duration: 0.2,  velocity: 90 }, // backbeat - kept
      ];
      const result = applyEnergy(input, 20);
      expect(result.length).toBe(2);
    });
  });

  describe('applyDynamics', () => {
    it('clamps velocity to 0-110', () => {
      const input = [
        { note: 'D2', time: 0, duration: 0.2, velocity: 100 },
        { note: 'D2', time: 1, duration: 0.1, velocity: 25 },
      ];
      const result = applyDynamics(input, 100);
      for (const h of result) {
        expect(h.velocity).toBeLessThanOrEqual(110);
        expect(h.velocity).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('applyFeel', () => {
    it('returns unmodified times at feel=0', () => {
      const input = [
        { note: 'C2', time: 0, duration: 0.25, velocity: 100 },
        { note: 'D2', time: 1, duration: 0.2,  velocity: 90 },
      ];
      const result = applyFeel(input, 0, 1);
      expect(result[0].time).toBe(0);
      expect(result[1].time).toBe(1);
    });

    it('adds offsets at feel>0', () => {
      const input = [
        { note: 'C2', time: 0.5, duration: 0.25, velocity: 100 },
        { note: 'D2', time: 1,   duration: 0.2,  velocity: 90 },
      ];
      const result = applyFeel(input, 100, 42);
      // At least one time should differ
      const anyDifferent = result.some(
        (h, i) => Math.abs(h.time - input[i].time) > 0.001
      );
      expect(anyDifferent).toBe(true);
    });
  });

  // ---- Pattern Registry ----

  describe('pattern registry', () => {
    it('has at least 9 patterns', () => {
      expect(PATTERNS.size).toBeGreaterThanOrEqual(9);
    });

    it('all patterns have at least 2 bars', () => {
      PATTERNS.forEach((p) => {
        expect(p.bars.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('has at least 9 fills', () => {
      expect(FILLS.length).toBeGreaterThanOrEqual(9);
    });
  });
});
