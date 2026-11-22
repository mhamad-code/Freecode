import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * UI honesty: every control either does something observable or is disabled
 * with an explanation. A click that changes nothing (and is not disabled) fails
 * the test, which is what keeps decorative buttons out of the app.
 */

const boot = async (page: Page, path = '/') => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(path);
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  return errors;
};

/** Clicks a control and fails when nothing observable changed. */
async function expectEffect(page: Page, target: Locator, label: string) {
  const count = await target.count();
  expect(count, `${label} should exist`).toBeGreaterThan(0);
  const first = target.first();
  if (await first.isDisabled()) {
    const reason = await first.getAttribute('title');
    expect(reason, `${label} is disabled without an explanation`).toBeTruthy();
    return;
  }
  const before = await page.evaluate(() => ({
    html: document.body.innerHTML.length,
    url: location.href,
    dialogs: document.querySelectorAll('[role="dialog"]').length,
    menus: document.querySelectorAll('[role="menu"]').length,
    toasts: document.querySelectorAll('[role="status"]').length,
  }));
  await first.click();
  await page.waitForTimeout(350);
  const after = await page.evaluate(() => ({
    html: document.body.innerHTML.length,
    url: location.href,
    dialogs: document.querySelectorAll('[role="dialog"]').length,
    menus: document.querySelectorAll('[role="menu"]').length,
    toasts: document.querySelectorAll('[role="status"]').length,
  }));
  const changed =
    before.url !== after.url ||
    before.dialogs !== after.dialogs ||
    before.menus !== after.menus ||
    before.toasts !== after.toasts ||
    Math.abs(before.html - after.html) > 40;
  expect(changed, `${label} did nothing visible`).toBe(true);
  await page.keyboard.press('Escape');
}

test.describe('UI honesty', () => {
  test('rail, toolbar and tabs react to every click', async ({ page }) => {
    const errors = await boot(page);
    for (const name of ['Home', 'Sites', 'Integrations', 'Settings']) {
      await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name }).click();
      await page.waitForTimeout(200);
    }
    for (const name of ['Overview', 'Terminal', 'Files', 'Layout']) {
      await expectEffect(page, page.getByRole('button', { name, exact: true }), name);
    }
    expect(errors).toEqual([]);
  });

  test('new file and folder are created inline and validated', async ({ page }) => {
    const errors = await boot(page);
    await page.getByRole('button', { name: 'Files', exact: true }).click();
    await page.getByRole('button', { name: 'New file' }).click();
    const input = page.getByRole('textbox', { name: 'New file' });
    await expect(input).toBeFocused();
    await input.press('Enter');
    await expect(page.getByRole('alert')).toContainText('Enter a name');
    await input.fill('src/utils/a.ts');
    await input.press('Enter');
    await expect(page.getByText('src/utils/a.ts').first()).toBeVisible();
    await expect(page.getByRole('textbox').filter({ hasText: '' }).first()).toBeVisible();

    await page.getByRole('button', { name: 'New folder' }).click();
    const folderInput = page.getByRole('textbox', { name: 'New folder' });
    await folderInput.fill('empty-dir');
    await folderInput.press('Enter');
    await expect(page.getByText('empty-dir').first()).toBeVisible();

    await page.waitForTimeout(1200);
    await page.reload();
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await page.getByRole('button', { name: 'Files', exact: true }).click();
    await expect(page.getByText('empty-dir').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('the browser tab is honest: no fake page, external links open a tab', async ({ page, context }) => {
    await boot(page);
    await page.getByRole('button', { name: 'New tab' }).click();
    await page.getByRole('button', { name: 'Browser' }).click();
    await expect(page.getByText('Start browsing')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Cloud browser');
    await expect(page.locator('body')).not.toContainText('The agent can open pages');

    const popup = context.waitForEvent('page');
    const address = page.getByRole('textbox', { name: 'Search or enter URL' });
    await address.fill('example.com');
    await address.press('Enter');
    await expect(page.getByText('External sites open in a new tab')).toBeVisible();
    await popup;
  });

  test('unavailable features are disabled with a reason', async ({ page }) => {
    await boot(page, '/settings/mcp');
    const addServer = page.getByRole('button', { name: 'Add', exact: true }).first();
    await expect(addServer).toBeDisabled();
    await expect(addServer).toHaveAttribute('title', /MCP/);

    await page.goto('/settings/account');
    const github = page.getByRole('button', { name: 'Connect' }).first();
    await expect(github).toBeDisabled();

    await page.goto('/settings/project');
    const runNow = page.getByRole('button', { name: /run/i }).first();
    if (await runNow.count()) await expect(runNow).toBeDisabled();
  });

  test('composer attachments explain why they are unavailable', async ({ page }) => {
    await boot(page);
    await page.getByRole('button', { name: /attach/i }).click();
    const attach = page.getByRole('menuitem', { name: /^Attach/ }).first();
    await expect(attach).toBeDisabled();
    await expect(attach).toHaveAttribute('title', /not available/i);
  });

  test('editing a user message forks the conversation', async ({ page }) => {
    await boot(page, '/?mock=1');
    const composer = page.getByRole('textbox', { name: /Describe what you want/ });
    await composer.fill('first message');
    await composer.press('Enter');
    await expect(page.getByText('first message')).toBeVisible();
    await page.getByText('first message').hover();
    await page.getByRole('button', { name: 'Edit' }).click();
    const editor = page.locator('textarea.area').first();
    await editor.fill('edited message');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('edited message')).toBeVisible();
    await expect(page.getByText('Message edited')).toBeVisible();
  });

  test('phone width keeps the drawer and settings usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const errors = await boot(page);
    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await expect(page.getByRole('complementary', { name: 'Sidebar' })).toBeVisible();
    await page.getByRole('button', { name: 'New chat' }).first().click();
    await page.goto('/settings/general');
    await expect(page.getByRole('heading', { name: 'Settings' }).or(page.getByText('Settings').first())).toBeVisible();
    expect(errors).toEqual([]);
  });
});
