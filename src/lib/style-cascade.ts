// style-cascade.ts — Style inheritance cascade resolution.
// Implements the project → section → block inheritance hierarchy.
// null override = "inherit from parent" (CSS specificity pattern).

import type { Project, Section, Block } from '@/types';

export type CascadeField = 'energy' | 'groove' | 'feel' | 'swingPct' | 'dynamics';
export type CascadeSource = 'project' | 'section' | 'block';

export interface CascadeResult {
  value: number;
  source: CascadeSource;
}

/**
 * Resolve the effective value of a style field at the most specific non-null level.
 * Block override wins, then section override, then project default.
 * Note: blocks can only override 'energy' and 'dynamics'; groove/swingPct fall through to section.
 */
export function resolveStyle(
  project: Project,
  section: Section,
  block: Block | null,
  field: CascadeField
): CascadeResult {
  // Block level (only energy and dynamics are overridable at block level)
  if (block) {
    if (field === 'energy' && block.energyOverride != null) {
      return { value: block.energyOverride, source: 'block' };
    }
    if (field === 'dynamics' && block.dynamicsOverride != null) {
      return { value: block.dynamicsOverride, source: 'block' };
    }
  }

  // Section level
  if (field === 'energy' && section.energyOverride != null) {
    return { value: section.energyOverride, source: 'section' };
  }
  if (field === 'groove' && section.grooveOverride != null) {
    return { value: section.grooveOverride, source: 'section' };
  }
  if (field === 'feel' && section.feelOverride != null) {
    return { value: section.feelOverride, source: 'section' };
  }
  if (field === 'swingPct' && section.swingPctOverride != null) {
    return { value: section.swingPctOverride, source: 'section' };
  }
  if (field === 'dynamics' && section.dynamicsOverride != null) {
    return { value: section.dynamicsOverride, source: 'section' };
  }

  // Project default
  const projectValue = project[field as keyof Pick<Project, 'energy' | 'groove' | 'feel' | 'swingPct' | 'dynamics'>];
  return { value: (projectValue ?? 0) as number, source: 'project' };
}

/**
 * Returns true if the given field at the given level is inherited (not overridden).
 * Used to display inherited values dimmer vs overridden values bold.
 */
export function isInherited(
  section: Section,
  block: Block | null,
  field: CascadeField,
  level: 'section' | 'block'
): boolean {
  if (level === 'block') {
    if (!block) return true;
    if (field === 'energy') return block.energyOverride == null;
    if (field === 'dynamics') return block.dynamicsOverride == null;
    return true; // groove/feel/swingPct cannot be overridden at block level
  }

  // level === 'section'
  if (field === 'energy') return section.energyOverride == null;
  if (field === 'groove') return section.grooveOverride == null;
  if (field === 'feel') return section.feelOverride == null;
  if (field === 'swingPct') return section.swingPctOverride == null;
  if (field === 'dynamics') return section.dynamicsOverride == null;
  return true;
}
