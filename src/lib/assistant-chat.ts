import { getProjectSelectionTruth, type ProjectSelectionSnapshot } from '@/store/project-store';
import type { Block, Section, Stem, AiChatMessage } from '@/types';

export const GENERATION_FAILURE_PREFIX = 'Generation failed:';
const GENERATION_FAILURE_FALLBACK = 'The assistant could not finish this request.';
const GENERATION_FAILURE_NEXT_STEP =
  'Review the current input blockers, then try again.';

export type AssistantSelectionPresentation = {
  tone: 'ready' | 'blocked';
  badge: string;
  value: string;
  detail: string;
  scope: AiChatMessage['scope'];
  scopeTarget: string | null;
};

function formatBarRange(startBar: number, endBar: number): string {
  return startBar === endBar ? `bar ${startBar}` : `bars ${startBar}-${endBar}`;
}

export function getAssistantSelectionPresentation(input: {
  sections: Section[];
  blocks: Block[];
  stems: Stem[];
  selection: ProjectSelectionSnapshot;
}): AssistantSelectionPresentation {
  const selectionTruth = getProjectSelectionTruth(input, input.selection);

  if (selectionTruth.status === 'selected-section') {
    const section = input.sections.find((candidate) => candidate.id === selectionTruth.sectionId);

    if (section) {
      return {
        tone: 'ready',
        badge: 'Selected scope',
        value: `${section.name} (${section.startBar}-${section.startBar + section.barCount - 1})`,
        detail: selectionTruth.nextStep,
        scope: 'section',
        scopeTarget: `${section.name} (${formatBarRange(section.startBar, section.startBar + section.barCount - 1)})`,
      };
    }
  }

  if (selectionTruth.status === 'selected-block') {
    const block = input.blocks.find((candidate) => candidate.id === selectionTruth.blockId);
    const stem = input.stems.find((candidate) => candidate.id === selectionTruth.stemId);
    const section = input.sections.find((candidate) => candidate.id === selectionTruth.sectionId);

    if (block && stem && section) {
      const instrumentLabel = `${stem.instrument.charAt(0).toUpperCase()}${stem.instrument.slice(1)}`;

      return {
        tone: 'ready',
        badge: 'Selected scope',
        value: `${stem.instrument} ${block.startBar}-${block.endBar} in ${section.name}`,
        detail: selectionTruth.nextStep,
        scope: 'block',
        scopeTarget: `${instrumentLabel} ${formatBarRange(block.startBar, block.endBar)} in ${section.name}`,
      };
    }
  }

  if (selectionTruth.status === 'missing-selection') {
    return {
      tone: 'blocked',
      badge: 'Fallback scope',
      value: 'Whole song fallback',
      detail: `${selectionTruth.currentState} ${selectionTruth.nextStep}`.trim(),
      scope: 'song',
      scopeTarget: 'Whole song fallback',
    };
  }

  return {
    tone: 'ready',
    badge: 'Default scope',
    value: 'Whole song default',
    detail: `${selectionTruth.currentState} ${selectionTruth.nextStep}`.trim(),
    scope: 'song',
    scopeTarget: 'Whole song default',
  };
}

export function formatGenerationFailureMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message.trim() : '';

  return detail
    ? `${GENERATION_FAILURE_PREFIX} ${detail}`
    : 'Generation failed.';
}

export function isGenerationFailureContent(content: string): boolean {
  return content.startsWith(GENERATION_FAILURE_PREFIX) || content === 'Generation failed.';
}

export function getGenerationFailureDetail(content: string): string {
  if (content === 'Generation failed.') {
    return GENERATION_FAILURE_FALLBACK;
  }

  if (!content.startsWith(GENERATION_FAILURE_PREFIX)) {
    return content;
  }

  const detail = content.slice(GENERATION_FAILURE_PREFIX.length).trim();
  return detail || GENERATION_FAILURE_FALLBACK;
}

export function getGenerationFailureNextStep(content: string): string {
  const detail = getGenerationFailureDetail(content);
  const nextStepMatch = detail.match(/next step:\s*(.+)$/i);

  if (nextStepMatch?.[1]) {
    return nextStepMatch[1].trim();
  }

  return GENERATION_FAILURE_NEXT_STEP;
}

export function getGenerationFailurePrimaryDetail(content: string): string {
  const detail = getGenerationFailureDetail(content);
  const nextStepMatch = detail.match(/^(.*?)(?:\s+next step:\s*.+)?$/i);
  const primaryDetail = nextStepMatch?.[1]?.trim();

  return primaryDetail || GENERATION_FAILURE_FALLBACK;
}
