import { expect, test, type Page } from '@playwright/test';
import { acceptConfirm, login, submitForm } from './helpers';

/** Enciende o apaga el interruptor "Cuenta principal" (label nativo). */
async function setPrimary(page: Page, on: boolean): Promise<void> {
	const input = page.getByLabel('Cuenta principal');
	if ((await input.isChecked()) !== on) await page.getByText('Cuenta principal').click();
	await expect(input).toBeChecked({ checked: on });
}

test('crea una cuenta, la marca como principal, la archiva, reactiva y elimina', async ({ page }) => {
	const name = `Cuenta E2E ${Date.now()}`;

	await login(page);
	await page.goto('/cuentas');

	// Guardamos la cuenta principal actual para restaurarla al final.
	const primaryHref = await page
		.locator('a[href^="/cuentas/"]')
		.filter({ has: page.getByText('Principal', { exact: true }) })
		.first()
		.getAttribute('href');
	expect(primaryHref).toMatch(/^\/cuentas\/[0-9a-f-]{36}$/);

	await page.getByRole('link', { name: 'Nueva cuenta' }).click();
	await expect(page).toHaveURL(/\/cuentas\/nueva/);
	await page.getByLabel('Nombre', { exact: true }).fill(name);
	await page.getByRole('button', { name: 'Crear cuenta' }).click();

	await expect(page).toHaveURL(/\/cuentas$/);
	await expect(page.getByText(name)).toBeVisible();

	// Detalle: marcar como principal.
	await page.getByText(name).click();
	await expect(page).toHaveURL(/\/cuentas\/[0-9a-f-]{36}/);
	await setPrimary(page, true);
	await submitForm(page, 'Guardar cambios');
	await page.reload();
	await expect(page.getByLabel('Cuenta principal')).toBeChecked();

	// Archivar: vuelve al listado y aparece en la sección de archivadas.
	await page.getByRole('button', { name: 'Archivar cuenta' }).click();
	await expect(page).toHaveURL(/\/cuentas$/);
	await expect(page.getByText('Archivadas')).toBeVisible();
	await page.getByText(name).click();
	await expect(page.getByRole('button', { name: 'Reactivar cuenta' })).toBeVisible();

	// Reactivar y eliminar (la cuenta no tiene movimientos).
	await page.getByRole('button', { name: 'Reactivar cuenta' }).click();
	acceptConfirm(page);
	await page.getByRole('button', { name: 'Eliminar cuenta' }).click();

	await expect(page).toHaveURL(/\/cuentas$/);
	await expect(page.getByText(name)).toHaveCount(0);

	// Restauramos la cuenta principal original.
	await page.goto(primaryHref as string);
	await setPrimary(page, true);
	await submitForm(page, 'Guardar cambios');
	await page.reload();
	await expect(page.getByLabel('Cuenta principal')).toBeChecked();
});

test('guarda el presupuesto de una categoría y lo conserva al recargar', async ({ page }) => {
	await login(page);
	await page.goto('/cuentas?tab=presupuestos');

	const limit = page.getByLabel('Límite para Alimentos');
	await expect(limit).toBeVisible();

	const original = await limit.inputValue();
	const next = original === '640.00' ? '620.00' : '640.00';

	await limit.fill(next);
	await submitForm(page, 'Guardar presupuestos');

	// La pestaña se mantiene tras guardar.
	await expect(page.getByLabel('Límite para Alimentos')).toHaveValue(next);
	await page.reload();
	await expect(page.getByLabel('Límite para Alimentos')).toHaveValue(next);

	// Restauramos el valor original.
	const restore = page.getByLabel('Límite para Alimentos');
	await restore.fill(original);
	await submitForm(page, 'Guardar presupuestos');
	await page.reload();
	await expect(page.getByLabel('Límite para Alimentos')).toHaveValue(original);
});

test('las pestañas de cuentas se pueden enlazar por URL', async ({ page }) => {
	await login(page);

	await page.goto('/cuentas?tab=categorias');
	await expect(page.getByRole('heading', { name: 'Gastos' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Ingresos' })).toBeVisible();

	await page.goto('/cuentas?tab=presupuestos');
	await expect(page.getByLabel('Límite para Alimentos')).toBeVisible();
});
