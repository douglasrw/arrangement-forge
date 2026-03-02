// ScopeBadge.tsx — Context scope indicator for AI Assistant chat messages.

interface ScopeBadgeProps {
  scope: 'setup' | 'song' | 'section' | 'block';
  target?: string; // section name or "Bass bar 7"
}

const SCOPE_COLORS: Record<ScopeBadgeProps['scope'], string> = {
  setup: 'badge-accent',
  song: 'badge-primary',
  section: 'badge-secondary',
  block: 'badge-info',
};

export function ScopeBadge({ scope, target }: ScopeBadgeProps) {
  const label = target ?? scope.charAt(0).toUpperCase() + scope.slice(1);
  return (
    <span className={`badge badge-sm ${SCOPE_COLORS[scope]} text-xs font-mono`}>
      {label}
    </span>
  );
}
