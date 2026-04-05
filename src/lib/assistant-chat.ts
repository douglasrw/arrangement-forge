export const GENERATION_FAILURE_PREFIX = 'Generation failed:';
const GENERATION_FAILURE_FALLBACK = 'The assistant could not finish this request.';
const GENERATION_FAILURE_NEXT_STEP =
  'Review the current input blockers, then try again.';

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
