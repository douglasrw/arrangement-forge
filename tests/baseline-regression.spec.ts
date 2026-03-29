import { test, expect, type Locator, type Page } from '@playwright/test';
import { login } from './helpers/auth';

function libraryProjectCard(page: Page, projectName: string): Locator {
  return page
    .getByTestId('library-project-card')
    .filter({ has: page.getByRole('heading', { name: projectName, exact: true }) })
    .first();
}

async function searchLibrary(page: Page, query: string) {
  await page.getByTestId('library-search-input').fill(query);
  await page.waitForTimeout(400);
}

async function openAssistantPanel(page: Page) {
  const assistantInput = page.getByTestId('ai-assistant-input');

  if (await assistantInput.isVisible().catch(() => false)) {
    return assistantInput;
  }

  await page.getByRole('button', { name: 'AI Assistant' }).click();
  await expect(assistantInput).toBeVisible();
  return assistantInput;
}

async function deleteProjectIfPresent(page: Page, projectName: string) {
  await page.goto('/library');
  await expect(page.getByRole('heading', { name: 'My Library' })).toBeVisible();
  await searchLibrary(page, projectName);

  const card = libraryProjectCard(page, projectName);
  if (!(await card.isVisible().catch(() => false))) {
    return;
  }

  await card.getByRole('button', { name: `Delete ${projectName}` }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(card).toHaveCount(0);
}

test.describe('Baseline Regression', () => {
  test('library create, assistant generation, and reload stay coherent', async ({ page }) => {
    test.setTimeout(90_000);

    const projectName = `Baseline Harness ${Date.now()}`;
    const assistantPrompt = 'Make it moodier with a restrained intro pocket.';
    const generationSummary = /generated 1 section across 4 bars/i;
    let projectCreated = false;

    try {
      await login(page);
      await expect(page.getByRole('heading', { name: 'My Library' })).toBeVisible();

      await page.getByTestId('library-create-project').click();
      projectCreated = true;

      await expect(page).toHaveURL(/\/project\/.+/);
      const projectId = page.url().split('/').at(-1);

      await expect(page.getByTestId('editor-shell')).toBeVisible();
      await expect(page.getByTestId('arrangement-empty-state')).toBeVisible();

      await page.getByTestId('project-name-trigger').click();
      await page.getByTestId('project-name-input').fill(projectName);
      await page.getByTestId('project-name-input').press('Enter');
      await expect(page.getByTestId('project-name-trigger')).toHaveText(projectName);

      await page.getByRole('button', { name: 'Text' }).click();
      await page.locator('#chord-chart-raw-input').fill('Cmaj7 | Dm7 | G7 | Cmaj7');

      const assistantInput = await openAssistantPanel(page);
      await assistantInput.fill(assistantPrompt);
      await page.getByTestId('ai-assistant-send').click();

      await expect(page.getByText(assistantPrompt)).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(generationSummary)).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole('button', { name: /Intro/ }).first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByTestId('status-bar')).toContainText('Saved', {
        timeout: 20_000,
      });
      await expect(page.getByTestId('arrangement-empty-state')).toHaveCount(0);

      await page.goto('/library');
      await expect(page.getByRole('heading', { name: 'My Library' })).toBeVisible();
      await searchLibrary(page, projectName);

      const libraryCard = libraryProjectCard(page, projectName);
      await expect(libraryCard).toBeVisible();
      await expect(libraryCard).toContainText('Generated');
      await libraryCard.click();

      if (projectId) {
        await expect(page).toHaveURL(new RegExp(`/project/${projectId}$`));
      }

      await expect(page.getByTestId('editor-shell')).toBeVisible();
      await expect(page.getByTestId('project-name-trigger')).toHaveText(projectName);
      await expect(page.getByRole('button', { name: /Intro/ }).first()).toBeVisible();

      const reopenedAssistantInput = await openAssistantPanel(page);
      await expect(reopenedAssistantInput).toBeVisible();
      await expect(page.getByText(assistantPrompt)).toBeVisible();
      await expect(page.getByText(generationSummary)).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('editor-shell')).toBeVisible();
      await expect(page.getByTestId('project-name-trigger')).toHaveText(projectName);
      await expect(page.getByRole('button', { name: /Intro/ }).first()).toBeVisible();

      const reloadedAssistantInput = await openAssistantPanel(page);
      await expect(reloadedAssistantInput).toBeVisible();
      await expect(page.getByText(assistantPrompt)).toBeVisible();
      await expect(page.getByText(generationSummary)).toBeVisible();
    } finally {
      if (projectCreated) {
        await deleteProjectIfPresent(page, projectName);
      }
    }
  });
});
