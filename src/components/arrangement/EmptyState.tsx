// EmptyState.tsx — Pre-generation placeholder in the arrangement area.

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 select-none">
      <div className="text-4xl text-base-content/20">♪</div>
      <div className="text-center flex flex-col gap-2">
        <p className="text-base-content/50 font-medium">No arrangement yet</p>
        <p className="text-base-content/30 text-sm max-w-xs text-center">
          Enter your chord chart or description on the left, set your style preferences,
          then hit <strong className="text-base-content/50">GENERATE</strong> to create your arrangement.
        </p>
      </div>
      <div className="flex items-center gap-3 text-xs text-base-content/25">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-base-300 flex items-center justify-center text-base-content/40 font-bold text-xs">1</span>
          Input chords
        </span>
        <span className="text-base-content/15">→</span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-base-300 flex items-center justify-center text-base-content/40 font-bold text-xs">2</span>
          Set style
        </span>
        <span className="text-base-content/15">→</span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-base-300 flex items-center justify-center text-base-content/40 font-bold text-xs">3</span>
          Generate
        </span>
      </div>
    </div>
  );
}
