import { expect, test } from '@playwright/test';
import { acceptConfirm, login } from './helpers';

test.describe('escritorio', () => {
	test.use({ viewport: { width: 1440, height: 900 } });

	test('muestra el shell de escritorio y navega por todas las secciones', async ({ page }) => {
		await login(page);

		await expect(page.getByRole('complementary', { name: 'Navegación principal' })).toBeVisible();
		await expect(page.locator('nav[aria-label="Navegación principal"]')).toBeHidden();
		await expect(page.getByRole('searchbox', { name: 'Buscar transacciones' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Registrar / Nuevo' })).toBeVisible();

		const sections: Array<[RegExp, RegExp]> = [
			[/Cuentas \/ Patrimonio/, /Cuentas y gestión patrimonial/],
			[/Estadísticas \/ Análisis/, /Estadísticas y rendimiento/],
			[/Planes \/ Metas/, /Planes futuros y wishlist inteligente/],
			[/Gestor de Deudas/, /Gestor de obligaciones y deudas/],
			[/Configuración/, /Configuración/]
		];

		for (const [link, heading] of sections) {
			await page.getByRole('link', { name: link }).click();
			await expect(page.getByRole('heading', { name: heading })).toBeVisible();
		}

		await page.getByRole('link', { name: 'Inicio', exact: true }).click();
		await expect(page.getByRole('heading', { name: /Hola,/ })).toBeVisible();
	});

	test('el buscador global lleva al historial filtrado', async ({ page }) => {
		await login(page);

		await page.getByRole('searchbox', { name: 'Buscar transacciones' }).fill('Cena');
		await page.getByRole('searchbox', { name: 'Buscar transacciones' }).press('Enter');

		await expect(page).toHaveURL(/\/movimientos\?q=Cena/);
		await expect(page.getByText('Cena Bistro Gourmet').first()).toBeVisible();
	});

	test('no genera desbordamiento horizontal en 1024 px', async ({ page }) => {
		await page.setViewportSize({ width: 1024, height: 800 });
		await login(page);
		// Los tipos de letra externos cambian los anchos de texto: medimos el
		// layout definitivo, no el estado intermedio con fuentes de respaldo.
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(150);

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBeLessThanOrEqual(1);
	});

	test('registra un movimiento con el selector de fecha y hora de escritorio', async ({ page }) => {
		const concept = `Selector E2E ${Date.now()}`;

		await login(page);
		await page.goto('/movimientos/nuevo');

		await page.getByLabel('Monto a registrar').fill('4.56');
		await page.getByLabel('Concepto o nota').fill(concept);

		await page.getByRole('button', { name: /^Fecha:/ }).click();
		const calendar = page.getByRole('dialog', { name: 'Fecha' });
		await expect(calendar).toBeVisible();
		await calendar.getByRole('button', { name: 'Hoy' }).click();
		await expect(calendar).toBeHidden();

		await page.getByRole('button', { name: /^Hora:/ }).click();
		const clock = page.getByRole('dialog', { name: 'Hora' });
		await expect(clock).toBeVisible();
		await clock.getByRole('button', { name: 'Hora 13' }).click();
		await clock.getByRole('button', { name: 'Minuto 12' }).click();
		await clock.getByRole('button', { name: 'Listo' }).click();
		await expect(clock).toBeHidden();

		await page.getByRole('button', { name: 'Guardar gasto' }).click();
		await expect(page).toHaveURL(/\/movimientos(\?.*)?$/);

		await page.getByText(concept).first().click();
		await expect(page).toHaveURL(/\/movimientos\/[0-9a-f-]{36}/);
		// La hora elegida llega al detalle sin desfase.
		await expect(page.getByText(/01:12/)).toBeVisible();

		acceptConfirm(page);
		await page.getByRole('button', { name: 'Eliminar movimiento' }).click();
		await expect(page).toHaveURL(/\/movimientos(\?.*)?$/);
		await expect(page.getByText(concept)).toHaveCount(0);
	});
});

test.describe('móvil', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('conserva la navegación inferior y oculta el shell de escritorio', async ({ page }) => {
		await login(page);

		await expect(page.locator('nav[aria-label="Navegación principal"]')).toBeVisible();
		await expect(page.getByRole('complementary', { name: 'Navegación principal' })).toBeHidden();
		await expect(page.getByRole('searchbox', { name: 'Buscar transacciones' })).toBeHidden();

		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(150);

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBeLessThanOrEqual(1);
	});
});
