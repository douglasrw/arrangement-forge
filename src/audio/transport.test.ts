import { describe, expect, it } from 'vitest';
import { getTransportReadinessTruth } from './transport';

describe('getTransportReadinessTruth', () => {
  it('returns ready truth when the timeline is playable', () => {
    expect(
      getTransportReadinessTruth({
        timelineAvailable: true,
        transportReady: true,
        playbackAction: 'play',
        playbackSummary: 'Ready',
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
        playbackSummary: 'Load to play',
      })
    ).toEqual({
      detailLabel: 'Load to play',
      state: 'waiting',
      summaryLabel: 'Waiting',
      summaryClassName: 'bg-amber-500/10 text-amber-300',
    });
  });

  it('returns error truth when audio playback failed', () => {
    expect(
      getTransportReadinessTruth({
        timelineAvailable: true,
        transportReady: false,
        playbackAction: 'retry-play',
        playbackSummary: 'Audio load failed',
      })
    ).toEqual({
      detailLabel: 'Audio load failed',
      state: 'error',
      summaryLabel: 'Error',
      summaryClassName: 'bg-rose-500/10 text-rose-300',
    });
  });

  it('returns blocked truth when the arrangement timeline is missing', () => {
    expect(
      getTransportReadinessTruth({
        timelineAvailable: false,
        transportReady: false,
        playbackAction: 'wait',
        playbackSummary: 'Unavailable',
      })
    ).toEqual({
      detailLabel: 'No timeline',
      state: 'blocked',
      summaryLabel: 'Blocked',
      summaryClassName: 'bg-rose-500/10 text-rose-300',
    });
  });

  it('returns reload truth when a saved arrangement needs to be reloaded', () => {
    expect(
      getTransportReadinessTruth({
        timelineAvailable: false,
        transportReady: false,
        playbackAction: 'unavailable',
        playbackSummary: 'Reload arrangement',
      })
    ).toEqual({
      detailLabel: 'Reload arrangement',
      state: 'blocked',
      summaryLabel: 'Blocked',
      summaryClassName: 'bg-rose-500/10 text-rose-300',
    });
  });
});
