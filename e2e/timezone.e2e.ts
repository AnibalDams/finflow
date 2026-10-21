import { expect, test } from '@playwright/test';
import { acceptConfirm, login } from './helpers';

// El servidor de las pruebas corre en UTC y el navegador en UTC-4: reproduce
// el desfase de zona horaria de producción.
test.use({ timezoneId: 'America/Caracas' });

function localDateInCaracas(): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'America/Caracas',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(new Date());

	const value = (type: Intl.DateTimeFormatPartTypes): string =>
		parts.find((part) => part.type === type)?.value ?? '';

	return `${value('year')}-${value('month')}-${value('day')}`;
}

test('guarda la hora local y agrupa el movimiento bajo "Hoy"', async ({ page }) => {
	const concept = `TZ E2E ${Date.now()}`;
	const today = localDateInCaracas();

	await login(page);
	await page.goto('/movimientos/nuevo');

	await page.getByLabel('Monto a registrar').fill('1.23');
	await page.getByLabel('Concepto o nota').fill(concept);
	await page.getByLabel('Fecha').fill(today);
	await page.getByLabel('Hora').fill('13:12');
	await page.getByRole('button', { name: 'Guardar gasto' }).click();

	await expect(page).toHaveURL(/\/movimientos(\?.*)?$/);
	await expect(page.getByText(/^Hoy,/).first()).toBeVisible();

	const row = page.locator('a[href^="/movimientos/"]').filter({ hasText: concept }).first();
	await expect(row).toBeVisible();
	await row.click();

	// La hora elegida no debe desplazarse por la zona del servidor.
	await expect(page.getByText(/01:12/)).toBeVisible();
	await expect(page.getByText(/^Hoy,/).first()).toBeVisible();

	acceptConfirm(page);
	await page.getByRole('button', { name: 'Eliminar movimiento' }).click();
	await expect(page).toHaveURL(/\/movimientos(\?.*)?$/);
	await expect(page.getByText(concept)).toHaveCount(0);
});
