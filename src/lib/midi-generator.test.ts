import { describe, it, expect } from 'vitest';
import { generate } from './midi-generator';
import type { GenerationRequest } from '@/types';

const baseRequest: GenerationRequest = {
  project_id: 'test',
  key: 'C',
  tempo: 120,
  time_signature: '4/4',
  genre: 'Jazz',
  sub_style: 'Swing',
  energy: 50,
  groove: 50,
  feel: 50,
  swing_pct: 65,
  dynamics: 50,
  chords: [
    { bar_number: 1, degree: 'I', quality: 'maj7', bass_degree: null },
    { bar_number: 2, degree: 'ii', quality: 'min7', bass_degree: null },
    { bar_number: 3, degree: 'V', quality: 'dom7', bass_degree: null },
    { bar_number: 4, degree: 'I', quality: 'maj7', bass_degree: null },
  ],
  generation_hints: '',
  stems: ['drums', 'bass', 'piano'],
};

describe('generate', () => {
  it('returns sections, stems, blocks, chords', () => {
    const result = generate(baseRequest);
    expect(result.sections.length).toBeGreaterThan(0);
    expect(result.stems.length).toBe(3);
    expect(result.blocks.length).toBeGreaterThan(0);
    expect(result.chords.length).toBe(4);
  });

  it('blocks cover every bar of every stem', () => {
    const result = generate(baseRequest);
    const totalBars = result.sections.reduce((sum, s) => sum + s.bar_count, 0);
    for (const stem of result.stems) {
      const stemBlocks = result.blocks.filter((b) => b.stem_instrument === stem.instrument);
      const coveredBars = stemBlocks.reduce((sum, b) => sum + (b.end_bar - b.start_bar + 1), 0);
      expect(coveredBars).toBe(totalBars);
    }
  });

  it('sections have non-overlapping contiguous start_bars', () => {
    const result = generate(baseRequest);
    const sorted = [...result.sections].sort((a, b) => a.start_bar - b.start_bar);
    expect(sorted[0].start_bar).toBe(1);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].start_bar).toBe(sorted[i - 1].start_bar + sorted[i - 1].bar_count);
    }
  });

  it('MIDI data contains at least 2 notes per block', () => {
    const result = generate(baseRequest);
    for (const block of result.blocks) {
      expect(block.midi_data.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('velocities are in valid range 1-127', () => {
    const result = generate(baseRequest);
    for (const block of result.blocks) {
      for (const note of block.midi_data) {
        expect(note.velocity).toBeGreaterThanOrEqual(1);
        expect(note.velocity).toBeLessThanOrEqual(127);
      }
    }
  });

  it('returns correct number of chord entries', () => {
    const result = generate(baseRequest);
    expect(result.chords.length).toBe(baseRequest.chords.length);
  });

  it('assigns Jazz styles for Jazz genre', () => {
    const result = generate(baseRequest);
    const drumBlock = result.blocks.find((b) => b.stem_instrument === 'drums');
    expect(drumBlock?.style).toContain('jazz');
  });

  it('generates sections for 12-bar chord progression', () => {
    const chords = Array.from({ length: 12 }, (_, i) => ({
      bar_number: i + 1,
      degree: 'I',
      quality: 'maj7',
      bass_degree: null,
    }));
    const result = generate({ ...baseRequest, chords });
    expect(result.sections).toHaveLength(3);
    expect(result.sections.map((s) => s.name)).toEqual(['Intro', 'Verse', 'Chorus']);
  });

  it('generates sections for 16-bar progression', () => {
    const chords = Array.from({ length: 16 }, (_, i) => ({
      bar_number: i + 1, degree: 'I', quality: null, bass_degree: null,
    }));
    const result = generate({ ...baseRequest, chords });
    expect(result.sections).toHaveLength(3);
    expect(result.sections[1].bar_count).toBe(8);
  });

  it('handles empty chord progression gracefully', () => {
    const result = generate({ ...baseRequest, chords: [] });
    expect(result.sections.length).toBeGreaterThan(0);
  });

  it('creates per-section blocks for pitched instruments (not a single block)', () => {
    const chords = Array.from({ length: 12 }, (_, i) => ({
      bar_number: i + 1,
      degree: i % 2 === 0 ? 'I' : 'V',
      quality: 'maj7',
      bass_degree: null,
    }));
    const result = generate({ ...baseRequest, chords, stems: ['drums', 'bass', 'piano', 'guitar', 'strings'] });
    const sections = result.sections; // 12-bar: Intro(4), Verse(4), Chorus(4)
    expect(sections).toHaveLength(3);

    for (const instrument of ['bass', 'piano', 'guitar', 'strings']) {
      const blocks = result.blocks.filter((b) => b.stem_instrument === instrument);
      expect(blocks).toHaveLength(sections.length);

      // Each block should match a section's bar range
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const block = blocks.find((b) => b.section_name === section.name);
        expect(block).toBeDefined();
        expect(block!.start_bar).toBe(section.start_bar);
        expect(block!.end_bar).toBe(section.start_bar + section.bar_count - 1);
      }
    }
  });

  it('pitched instrument blocks have correct section_name (not always first section)', () => {
    const chords = Array.from({ length: 12 }, (_, i) => ({
      bar_number: i + 1,
      degree: 'I',
      quality: 'maj7',
      bass_degree: null,
    }));
    const result = generate({ ...baseRequest, chords, stems: ['bass'] });
    const bassBlocks = result.blocks.filter((b) => b.stem_instrument === 'bass');
    const sectionNames = bassBlocks.map((b) => b.section_name);
    expect(sectionNames).toEqual(['Intro', 'Verse', 'Chorus']);
  });

  it('pitched blocks MIDI data has correct bar count per section', () => {
    const chords = Array.from({ length: 16 }, (_, i) => ({
      bar_number: i + 1,
      degree: 'I',
      quality: 'maj7',
      bass_degree: null,
    }));
    const result = generate({ ...baseRequest, chords, stems: ['bass'] });
    const sections = result.sections; // 16-bar: Intro(4), Verse(8), Chorus(4)
    const bassBlocks = result.blocks.filter((b) => b.stem_instrument === 'bass');

    // Each block's MIDI note count should be proportional to its section's bar count.
    // Walking bass produces ~4 notes per bar, so a 4-bar section should have ~16 notes
    // and an 8-bar section should have ~32 notes.
    for (const block of bassBlocks) {
      const section = sections.find((s) => s.name === block.section_name);
      expect(section).toBeDefined();
      const barCount = block.end_bar - block.start_bar + 1;
      expect(barCount).toBe(section!.bar_count);
      // Each bar generates at least 1 note for bass
      expect(block.midi_data.length).toBeGreaterThanOrEqual(barCount);
    }
  });

  it('drum and pitched instruments produce same number of blocks (one per section)', () => {
    const chords = Array.from({ length: 12 }, (_, i) => ({
      bar_number: i + 1,
      degree: 'I',
      quality: null,
      bass_degree: null,
    }));
    const result = generate({ ...baseRequest, chords, stems: ['drums', 'bass', 'piano'] });
    const drumBlocks = result.blocks.filter((b) => b.stem_instrument === 'drums');
    const bassBlocks = result.blocks.filter((b) => b.stem_instrument === 'bass');
    const pianoBlocks = result.blocks.filter((b) => b.stem_instrument === 'piano');
    expect(drumBlocks).toHaveLength(bassBlocks.length);
    expect(drumBlocks).toHaveLength(pianoBlocks.length);
  });
});
