import { expect, test } from '@playwright/test';
import { acceptConfirm, login } from './helpers';

test('registra una obligación, paga una cuota y la elimina con su movimiento', async ({ page }) => {
	const name = `Deuda E2E ${Date.now()}`;

	await login(page);
	await page.goto('/deudas/nueva');
	await page.getByLabel('Nombre de la obligación').fill(name);
	await page.getByLabel('Monto total original o saldo').fill('1,200');
	await page.getByLabel('Total de cuotas').fill('12');
	await page.getByLabel('Ya pagadas').fill('0');
	await page.getByLabel('Día límite de pago').fill('10');
	await page.getByLabel('Primer vencimiento').fill('2026-11-10');
	await page.getByRole('button', { name: 'Registrar obligación' }).click();

	// Crear devuelve al listado; el detalle se abre con el botón de la tarjeta.
	await expect(page).toHaveURL(/\/deudas$/);
	await expect(page.getByText(name)).toBeVisible();
	await page.getByRole('link', { name: `Ver detalle de ${name}` }).click();
	await expect(page).toHaveURL(/\/deudas\/[0-9a-f-]{36}/);
	await expect(page.getByText('$1,200.00').first()).toBeVisible();
	await expect(page.getByText('$100.00').first()).toBeVisible();

	// El pago genera el movimiento de gasto y baja el saldo pendiente.
	await page.getByLabel('Monto del pago').fill('100');
	await page.getByRole('button', { name: /^Pagar/ }).click();
	await expect(page.getByText('$1,100.00').first()).toBeVisible({ timeout: 20_000 });

	// Eliminar la deuda devuelve al listado.
	acceptConfirm(page);
	await page.getByRole('button', { name: 'Eliminar deuda' }).click();
	await expect(page).toHaveURL(/\/deudas$/);
	await expect(page.getByText(name)).toHaveCount(0);

	// El gasto asociado se elimina desde el detalle del movimiento.
	await page.goto('/movimientos');
	const payment = page.getByText(new RegExp(`Pago de cuota · ${name}`)).first();
	await expect(payment).toBeVisible();
	await payment.click();
	await expect(page).toHaveURL(/\/movimientos\/[0-9a-f-]{36}/);
	await page.getByRole('button', { name: 'Eliminar movimiento' }).click();
	await expect(page).toHaveURL(/\/movimientos(\?.*)?$/);
	await expect(page.getByText(new RegExp(`Pago de cuota · ${name}`))).toHaveCount(0);
});

test('registra una deuda semanal con monto inicial y cuotas pagadas', async ({ page }) => {
	const name = `Deuda Semanal E2E ${Date.now()}`;

	await login(page);
	await page.goto('/deudas/nueva');
	await page.getByLabel('Nombre de la obligación').fill(name);
	await page.getByLabel('Monto total original o saldo').fill('520');
	await page.getByLabel('Monto ya entregado (opcional)').fill('20');
	await page.getByLabel('Total de cuotas').fill('26');
	await page.getByLabel('Ya pagadas').fill('2');
	await page.locator('label').filter({ hasText: 'Semanal' }).click();
	await page.getByLabel('Fecha en que se generó').fill('2026-10-01');
	await page.getByLabel('Primer vencimiento').fill('2026-10-08');

	// (520 - 20) / 26 = 19.23 por semana.
	await expect(page.getByText('$19.23').first()).toBeVisible();
	await page.getByRole('button', { name: 'Registrar obligación' }).click();

	await expect(page).toHaveURL(/\/deudas$/);
	await page.getByRole('link', { name: `Ver detalle de ${name}` }).click();
	await expect(page).toHaveURL(/\/deudas\/[0-9a-f-]{36}/);

	// 20 entregados + 2 cuotas de 19.23; quedan 461.54.
	await expect(page.getByText('$461.54').first()).toBeVisible();
	await expect(page.getByText('Semanal', { exact: true })).toBeVisible();
	await expect(page.getByText('2 de 26 cuotas amortizadas')).toBeVisible();

	// Limpieza: la deuda no generó movimientos.
	acceptConfirm(page);
	await page.getByRole('button', { name: 'Eliminar deuda' }).click();
	await expect(page).toHaveURL(/\/deudas$/);
	await expect(page.getByText(name)).toHaveCount(0);
});

test('elige un icono propio por deuda y lo cambia al editarla', async ({ page }) => {
	const name = `Deuda Icono E2E ${Date.now()}`;

	await login(page);
	await page.goto('/deudas/nueva');
	await page.getByLabel('Nombre de la obligación').fill(name);
	await page.getByLabel('Monto total original o saldo').fill('1,200');
	await page.getByLabel('Total de cuotas').fill('12');
	await page.getByLabel('Ya pagadas').fill('0');
	await page.getByLabel('Día límite de pago').fill('10');
	await page.getByLabel('Primer vencimiento').fill('2026-11-10');

	// El buscador encuentra el icono por su sinónimo («vuelo» → Transporte).
	await page.getByLabel('Buscar ícono').fill('vuelo');
	await page.locator('label[title="flight"]').click();
	await expect(page.getByRole('radio', { name: 'flight', exact: true })).toBeChecked();

	await page.getByRole('button', { name: 'Registrar obligación' }).click();
	await expect(page).toHaveURL(/\/deudas$/);
	await expect(page.getByText(name)).toBeVisible();

	await page.getByRole('link', { name: `Ver detalle de ${name}` }).click();
	await expect(page).toHaveURL(/\/deudas\/[0-9a-f-]{36}/);

	const heroIcon = page.locator('span.size-11 span.material-symbols-outlined').first();
	await expect(heroIcon).toHaveText('flight');

	// El formulario de ajuste permite cambiarlo.
	await page.getByText('Ajustar deuda').click();
	await page.getByLabel('Buscar ícono').fill('');
	await page.locator('label[title="home"]').click();
	await page.getByRole('button', { name: 'Guardar cambios' }).click();
	await expect(heroIcon).toHaveText('home', { timeout: 20_000 });

	// Limpieza.
	acceptConfirm(page);
	await page.getByRole('button', { name: 'Eliminar deuda' }).click();
	await expect(page).toHaveURL(/\/deudas$/);
	await expect(page.getByText(name)).toHaveCount(0);
});
