import { expect, test, type Page } from '@playwright/test';
import { login, submitForm } from './helpers';

// Valor de `--ff-primary` de la paleta por defecto (`esmeralda`, claro).
const DEFAULT_PRIMARY = '#006c49';

/** Lee una variable de tema resuelta por el navegador. */
function themeVar(page: Page, name: string): Promise<string> {
	return page.evaluate(
		(varName) => getComputedStyle(document.documentElement).getPropertyValue(varName).trim(),
		name
	);
}

function colorScheme(page: Page): Promise<string> {
	return page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
}

test.use({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });

test('cambia paleta, modo y paleta personalizada, y persiste tras recargar', async ({ page }) => {
	await login(page);
	await page.goto('/apariencia');

	await expect(page.getByRole('heading', { name: 'Apariencia' })).toBeVisible();
	expect(await themeVar(page, '--ff-primary')).toBe(DEFAULT_PRIMARY);

	try {
		// 1. La vista previa se aplica al instante, sin guardar.
		await page.getByRole('radio', { name: /Nubank/ }).click({ force: true });
		await expect.poll(() => themeVar(page, '--ff-primary')).not.toBe(DEFAULT_PRIMARY);
		const nubankPrimary = await themeVar(page, '--ff-primary');

		// 2. La paleta personalizada expone el editor y el contraste calculado.
		await page.getByRole('radio', { name: /Personalizada/ }).click({ force: true });
		await expect(page.getByLabel('Color de marca')).toBeVisible();
		await expect(page.getByText(/Contraste mínimo/)).toBeVisible();

		await page.getByLabel('Color de marca').fill('#00aa88');
		await expect.poll(() => themeVar(page, '--ff-primary')).not.toBe(nubankPrimary);

		// 3. Guardar Nubank y comprobar que sobrevive a la recarga.
		await page.getByRole('radio', { name: /Nubank/ }).click({ force: true });
		await expect.poll(() => themeVar(page, '--ff-primary')).toBe(nubankPrimary);
		await submitForm(page, 'Guardar apariencia');
		await page.reload();
		await expect.poll(() => themeVar(page, '--ff-primary')).toBe(nubankPrimary);

		// 4. Modo oscuro explícito.
		await page.getByRole('radio', { name: /Noche/ }).click({ force: true });
		await submitForm(page, 'Guardar apariencia');
		await page.reload();
		expect(await colorScheme(page)).toBe('dark');

		// 5. Restaurar el estado original: esmeralda + sistema.
		await page.getByRole('radio', { name: /Esmeralda/ }).click({ force: true });
		await page.getByRole('radio', { name: /Sistema/ }).click({ force: true });
		await submitForm(page, 'Guardar apariencia');
		await page.reload();
		expect(await themeVar(page, '--ff-primary')).toBe(DEFAULT_PRIMARY);
		expect(await colorScheme(page)).not.toBe('dark');
	} finally {
		// Si una aserción falla a mitad, el usuario demo no queda con otro tema.
		await page.goto('/apariencia');
		await page.getByRole('radio', { name: /Esmeralda/ }).click({ force: true });
		await page.getByRole('radio', { name: /Sistema/ }).click({ force: true });
		await submitForm(page, 'Guardar apariencia').catch(() => undefined);
	}
});
