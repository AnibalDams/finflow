import { expect, test, type Locator, type Page } from '@playwright/test';
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

/**
 * Comprueba que el `box-shadow` del elemento use el color primario del tema.
 * Protege contra glows hardcodeados (por ejemplo, un verde fijo de la marca).
 */
function shadowFollowsPrimary(locator: Locator): Promise<boolean> {
	return locator.evaluate((node) => {
		const primary = getComputedStyle(document.documentElement)
			.getPropertyValue('--ff-primary')
			.trim();
		const digits = primary.replace('#', '');
		const channels = [0, 2, 4].map((index) => Number.parseInt(digits.slice(index, index + 2), 16));
		return getComputedStyle(node).boxShadow.includes(channels.join(', '));
	});
}

function colorScheme(page: Page): Promise<string> {
	return page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
}

test.use({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });

test('cambia paleta, modo y paleta personalizada, y persiste tras recargar', async ({ page }) => {
	await login(page);
	await page.goto('/apariencia');

	await expect(page).toHaveTitle('Apariencia · FinFlow');
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

		// El glow de los botones sigue la paleta, también en escritorio.
		await expect
			.poll(() => shadowFollowsPrimary(page.getByRole('button', { name: 'Guardar apariencia' })))
			.toBe(true);

		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto('/');
		await expect
			.poll(() => shadowFollowsPrimary(page.getByRole('link', { name: 'Registrar / Nuevo' })))
			.toBe(true);
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/apariencia');

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

test('la decoración de temporada se fuerza y se restaura', async ({ page }) => {
	await login(page);
	await page.goto('/apariencia');

	const toggle = page.getByRole('switch');
	const seasonRoot = page.locator('[data-season]');

	try {
		// Estado conocido sin decoración, sea cual sea la fecha de ejecución.
		if (await toggle.isChecked()) {
			await page.getByText('Decoración de temporada').click();
			await submitForm(page, 'Guardar apariencia');
			await page.reload();
		}
		await expect(seasonRoot).toHaveCount(0);

		// Forzar Navidad fuera de temporada.
		await page.getByRole('button', { name: 'Ver ahora' }).click();
		await submitForm(page, 'Guardar apariencia');
		await page.reload();

		await expect(page.locator('[data-season="navidad"]')).toHaveCount(1);
		await expect(page.locator('.season-snow')).toHaveCount(1);

		// La decoración acompaña a la navegación y aparece en el chrome de la app.
		await page.goto('/');
		await expect(page.locator('[data-season="navidad"]')).toHaveCount(1);
		await expect(page.locator('.season-garland').first()).toBeAttached();
		await expect(page.getByText('Feliz Navidad')).toBeVisible();

		// Restaurar automático.
		await page.goto('/apariencia');
		await page.getByRole('button', { name: 'Volver a automático' }).click();
		await submitForm(page, 'Guardar apariencia');
		await page.reload();
		await expect(page.getByRole('switch')).toBeChecked();
	} finally {
		await page.goto('/apariencia');
		const forced = page.getByRole('button', { name: 'Volver a automático' });
		if (await forced.isVisible().catch(() => false)) await forced.click();
		await submitForm(page, 'Guardar apariencia').catch(() => undefined);
	}
});
