import { describe, it, expect } from 'vitest';
import { resolveStyle, isInherited } from './style-cascade';
import type { Project, Section, Block } from '@/types';

const project: Project = {
  id: 'p1',
  userId: 'u1',
  name: 'Test',
  key: 'C',
  tempo: 120,
  timeSignature: '4/4',
  genre: 'Jazz',
  subStyle: 'Swing',
  energy: 60,
  groove: 70,
  swingPct: 65,
  dynamics: 50,
  generationHints: '',
  chordChartRaw: '',
  hasArrangement: false,
  generatedAt: null,
  generatedTempo: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const section: Section = {
  id: 's1',
  projectId: 'p1',
  name: 'Verse',
  sortOrder: 0,
  barCount: 8,
  startBar: 1,
  energyOverride: null,
  grooveOverride: null,
  swingPctOverride: null,
  dynamicsOverride: null,
  createdAt: '2026-01-01',
};

const block: Block = {
  id: 'b1',
  stemId: 'st1',
  sectionId: 's1',
  startBar: 1,
  endBar: 4,
  chordDegree: 'I',
  chordQuality: 'maj7',
  chordBassDegree: null,
  style: 'jazz_comp',
  energyOverride: null,
  dynamicsOverride: null,
  midiData: [],
  createdAt: '2026-01-01',
};

describe('resolveStyle', () => {
  it('returns project value when no overrides', () => {
    expect(resolveStyle(project, section, null, 'energy')).toEqual({ value: 60, source: 'project' });
  });

  it('returns section override when set', () => {
    const s = { ...section, energyOverride: 80 };
    expect(resolveStyle(project, s, null, 'energy')).toEqual({ value: 80, source: 'section' });
  });

  it('returns block override when set', () => {
    const b = { ...block, energyOverride: 90 };
    expect(resolveStyle(project, section, b, 'energy')).toEqual({ value: 90, source: 'block' });
  });

  it('block override wins over section override', () => {
    const s = { ...section, energyOverride: 80 };
    const b = { ...block, energyOverride: 90 };
    expect(resolveStyle(project, s, b, 'energy')).toEqual({ value: 90, source: 'block' });
  });

  it('groove cannot be overridden at block level — falls to project', () => {
    expect(resolveStyle(project, section, block, 'groove')).toEqual({ value: 70, source: 'project' });
  });

  it('groove uses section override if set', () => {
    const s = { ...section, grooveOverride: 85 };
    expect(resolveStyle(project, s, block, 'groove')).toEqual({ value: 85, source: 'section' });
  });

  it('swingPct uses project value with null section override', () => {
    expect(resolveStyle(project, section, null, 'swingPct')).toEqual({ value: 65, source: 'project' });
  });
});

describe('isInherited', () => {
  it('section energy is inherited when null override', () => {
    expect(isInherited(section, null, 'energy', 'section')).toBe(true);
  });

  it('section energy is not inherited when override is set', () => {
    const s = { ...section, energyOverride: 80 };
    expect(isInherited(s, null, 'energy', 'section')).toBe(false);
  });

  it('block energy is inherited when null override', () => {
    expect(isInherited(section, block, 'energy', 'block')).toBe(true);
  });

  it('block energy is not inherited when override is set', () => {
    const b = { ...block, energyOverride: 90 };
    expect(isInherited(section, b, 'energy', 'block')).toBe(false);
  });

  it('block groove always inherited (not overridable)', () => {
    expect(isInherited(section, block, 'groove', 'block')).toBe(true);
  });

  it('block level with null block is inherited', () => {
    expect(isInherited(section, null, 'energy', 'block')).toBe(true);
  });
});
