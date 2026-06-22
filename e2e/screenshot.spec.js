import { test } from '@playwright/test';

const SMARTS = '[#8]~[#6]~[#8]';
const OUT_DIR = 'static/screenshots';

const CONFIGS = {
	desktop: { width: 960, height: 800, columns: '2' },
	mobile: { width: 390, height: 800, columns: '1' },
};

/**
 * Navigate to /smarts, set columns, type SMARTS, wait for highlights.
 * @param {import('@playwright/test').Page} page
 * @param {{ width: number, height: number, columns: string }} config
 */
async function setupPage(page, config) {
	await page.setViewportSize({ width: config.width, height: config.height });
	await page.goto('/smarts');

	// Wait for initial molecule render
	await page.waitForSelector('.sr-shell', { timeout: 30000 });
	await page.waitForFunction(() => !document.querySelector('.sr-shell.is-rendering'), {
		timeout: 30000,
	});

	// Open Settings dialog and set number of columns
	await page.getByLabel('Settings').click();
	await page.waitForSelector('[role="dialog"]');
	await page.getByRole('radio', { name: config.columns }).click();
	await page.keyboard.press('Escape');
	await page.waitForTimeout(300);

	// Type SMARTS into CodeMirror editor
	const editor = page.locator('.cm-content');
	await editor.click();
	await page.keyboard.press('Control+a');
	await page.keyboard.type(SMARTS, { delay: 15 });

	// Wait for highlight render
	await page.waitForTimeout(600);
	await page.waitForFunction(() => !document.querySelector('.sr-shell.is-rendering'), {
		timeout: 30000,
	});
	await page.waitForTimeout(300);
}

for (const [name, config] of Object.entries(CONFIGS)) {
	test(`take ${name} screenshot`, async ({ page }) => {
		await setupPage(page, config);
		await page.screenshot({
			path: `${OUT_DIR}/_${name}.png`,
			fullPage: false,
		});
	});
}
