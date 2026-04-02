import { describe, expect, it } from 'vitest';
import { getTransportReadinessTruth } from './transport';

describe('getTransportReadinessTruth', () => {
  it('returns ready truth when the timeline is playable', () => {
    expect(
      getTransportReadinessTruth({
        timelineAvailable: true,
        transportReady: true,
        playbackAction: 'play',
      })
    ).toEqual({
      detailLabel: 'Ready',
      state: 'ready',
      summaryLabel: 'Ready',
      summaryClassName: 'bg-emerald-500/10 text-emerald-300',
    });
  });

  it('returns waiting truth when audio still needs to load', () => {
    expect(
      getTransportReadinessTruth({
        timelineAvailable: true,
        transportReady: false,
        playbackAction: 'load-and-play',
      })
    ).toEqual({
      detailLabel: 'Load to play',
      state: 'waiting',
      summaryLabel: 'Waiting',
      summaryClassName: 'bg-amber-500/10 text-amber-300',
    });
  });

  it('returns blocked truth when audio playback failed', () => {
    expect(
      getTransportReadinessTruth({
        timelineAvailable: true,
        transportReady: false,
        playbackAction: 'retry-play',
      })
    ).toEqual({
      detailLabel: 'Transport blocked',
      state: 'blocked',
      summaryLabel: 'Blocked',
      summaryClassName: 'bg-rose-500/10 text-rose-300',
    });
  });

  it('returns blocked truth when the arrangement timeline is missing', () => {
    expect(
      getTransportReadinessTruth({
        timelineAvailable: false,
        transportReady: false,
        playbackAction: 'wait',
      })
    ).toEqual({
      detailLabel: 'No timeline',
      state: 'blocked',
      summaryLabel: 'Blocked',
      summaryClassName: 'bg-rose-500/10 text-rose-300',
    });
  });
});
