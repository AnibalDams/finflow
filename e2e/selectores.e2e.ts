import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('la hoja de cuentas cambia y restaura el resumen del inicio', async ({ page }) => {
	await login(page);

	const trigger = page.getByRole('button', { name: 'Seleccionar cuenta' });
	await expect(trigger).toContainText('Principal USD');

	await trigger.click();
	const sheet = page.getByRole('dialog');
	await expect(sheet.getByRole('heading', { name: 'Seleccionar cuenta' })).toBeVisible();
	await sheet.getByRole('option', { name: /Efectivo/ }).click();

	await expect(page).toHaveURL(/cuenta=/);
	await expect(trigger).toContainText('Efectivo');
	await expect(trigger).toBeFocused();

	await trigger.click();
	await sheet.getByRole('option', { name: /Todas las cuentas/ }).click();
	await expect(page).toHaveURL(/cuenta=all/);
	await expect(trigger).toContainText('Todas las cuentas');

	// Restaura la cuenta principal por defecto.
	await page.goto('/');
	await expect(trigger).toContainText('Principal USD');
});

test('el selector de cuenta de un movimiento actualiza el formulario', async ({ page }) => {
	await login(page);
	await page.goto('/movimientos/nuevo?tipo=expense');

	const trigger = page.getByRole('button', { name: /Cuenta de origen/ });
	await expect(trigger).toHaveAttribute('aria-label', 'Cuenta de origen: Principal USD');

	await trigger.click();
	await page
		.getByRole('dialog')
		.getByRole('option', { name: /Efectivo/ })
		.click();

	await expect(trigger).toHaveAttribute('aria-label', 'Cuenta de origen: Efectivo');
	await expect(page.locator('select[name="accountId"]')).toHaveValue(/[0-9a-f-]{36}/);
	await expect(trigger).toBeFocused();

	// Sale sin guardar para no alterar los datos de demostración.
	await page.goto('/movimientos');
});

test('los filtros de movimientos usan listas expandibles', async ({ page }) => {
	await login(page);
	await page.goto('/movimientos');
	await page.getByRole('button', { name: 'Filtrar movimientos' }).click();

	const sheet = page.getByRole('dialog');
	await sheet.locator('summary').nth(0).click();
	await sheet.getByText('Nómina Principal USD', { exact: true }).click();
	await sheet.locator('summary').nth(1).click();
	await sheet.getByText('Alimentos', { exact: true }).click();
	await sheet.getByRole('button', { name: 'Aplicar filtros' }).click();

	await expect(page).toHaveURL(/cuenta=[0-9a-f-]{36}/);
	await expect(page).toHaveURL(/categoria=[0-9a-f-]{36}/);

	// Restaura la vista sin filtros.
	await page.goto('/movimientos');
});

test('la hoja de notificaciones atrapa el foco y lo devuelve al disparador', async ({ page }) => {
	await login(page);

	const trigger = page.getByRole('button', { name: /Notificaciones/ });
	await trigger.click();

	const sheet = page.getByRole('dialog');
	await expect(sheet).toBeVisible();

	const inside = () =>
		page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')));

	// Más Tabs que elementos enfocables: el foco no debe escapar al fondo.
	for (let index = 0; index < 10; index += 1) {
		await page.keyboard.press('Tab');
		expect(await inside()).toBe(true);
	}

	await page.keyboard.press('Escape');
	await expect(sheet).toHaveCount(0);
	await expect(trigger).toBeFocused();
});

test('moneda y día de recordatorio usan la hoja inferior', async ({ page }) => {
	await login(page);

	await page.goto('/ajustes');
	const currency = page.getByRole('button', { name: /Moneda principal/ });
	await expect(currency).toHaveAttribute('aria-label', /USD/);

	await currency.click();
	const sheet = page.getByRole('dialog');
	await expect(sheet.getByRole('option', { name: /USD/ })).toHaveAttribute('aria-selected', 'true');
	await sheet.getByRole('option', { name: /EUR/ }).click();
	await expect(currency).toHaveAttribute('aria-label', /EUR/);

	// Recarga sin guardar: el perfil conserva USD.
	await page.reload();
	await expect(currency).toHaveAttribute('aria-label', /USD/);

	await page.goto('/planes/nuevo');
	const day = page.getByRole('button', { name: /Día del recordatorio/ });
	await day.click();
	await page.getByRole('dialog').getByRole('option', { name: 'Día 15' }).click();
	await expect(day).toHaveAttribute('aria-label', 'Día del recordatorio: 15');
	await expect(page.locator('select[name="reminderDay"]')).toHaveValue('15');
});
