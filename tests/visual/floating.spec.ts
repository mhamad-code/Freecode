import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const THEMES = ['dark', 'light', 'alpine', 'dune', 'ember'];
const OUT = 'artifacts/visual';

mkdirSync(OUT, { recursive: true });

for (const theme of THEMES) {
  test(`publish menu is opaque on ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('fc.theme', value), theme);
    await page.goto('/?mock=1');
    await page.getByRole('button', { name: /Publish/ }).click();

    const menu = page.locator('div[role="menu"]').first();
    await expect(menu).toBeVisible();
    await page.waitForTimeout(250);

    const backgroundColor = await menu.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(backgroundColor).not.toContain('rgba');

    const box = await menu.boundingBox();
    const viewport = page.viewportSize()!;
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    expect(box!.y).toBeGreaterThanOrEqual(0);

    await page.screenshot({ path: `${OUT}/publish-${theme}.png`, clip: { x: Math.max(0, box!.x - 16), y: Math.max(0, box!.y - 16), width: Math.min(viewport.width, box!.width + 32), height: Math.min(viewport.height, box!.height + 32) } });
  });
}

test('model picker becomes a bottom sheet on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 });
  await page.goto('/?mock=1');
  await page.getByRole('button', { name: /DeepSeek/ }).click();

  const sheet = page.locator('div[role="menu"]').last();
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(250);

  const box = await sheet.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(380);
  expect(box!.y + box!.height).toBeGreaterThanOrEqual(740);

  await page.screenshot({ path: `${OUT}/model-sheet-mobile.png` });
});
