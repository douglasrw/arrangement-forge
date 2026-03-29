export const GENERATION_FAILURE_PREFIX = 'Generation failed:';

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
    return 'The assistant could not finish this request.';
  }

  if (!content.startsWith(GENERATION_FAILURE_PREFIX)) {
    return content;
  }

  const detail = content.slice(GENERATION_FAILURE_PREFIX.length).trim();
  return detail || 'The assistant could not finish this request.';
}
