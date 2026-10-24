import { expect, test } from '@playwright/test';
import { acceptConfirm, login } from './helpers';

test('crea una categoría con el buscador de iconos, la edita y la elimina', async ({ page }) => {
	const name = `Categoría E2E ${Date.now()}`;

	await login(page);
	await page.goto('/cuentas?tab=categorias');

	const gastos = page
		.locator('section')
		.filter({ has: page.getByRole('heading', { name: 'Gastos', exact: true }) });
	await gastos.getByRole('link', { name: 'Nueva' }).click();
	await expect(page).toHaveURL(/\/categorias\/nueva/);

	await page.getByLabel('Nombre de la categoría').fill(name);

	// El buscador acepta sinónimos en español y conserva el icono elegido.
	const search = page.getByLabel('Buscar ícono');
	await search.fill('vuelo');
	await expect(page.locator('label[title="flight"]')).toBeVisible();
	await page.locator('label[title="flight"]').click();

	await expect(page.getByRole('radio', { name: 'flight', exact: true })).toBeChecked();

	// Al cambiar de grupo con la búsqueda vacía, el icono sigue seleccionado.
	await search.fill('');
	await page.getByRole('button', { name: 'Hogar y servicios' }).click();
	await expect(page.getByText('Seleccionado')).toBeVisible();
	await expect(page.getByRole('radio', { name: 'flight', exact: true })).toBeChecked();

	await page.locator('label[title="home"]').click();
	await page.getByRole('button', { name: 'Crear categoría' }).click();

	await expect(page).toHaveURL(/\/cuentas\?tab=categorias/);
	const row = page.locator('a').filter({ hasText: name });
	await expect(row).toBeVisible();
	await expect(row.locator('.material-symbols-outlined').first()).toHaveText('home');

	// La edición conserva y permite cambiar el icono.
	await row.click();
	await expect(page).toHaveURL(/\/categorias\/[0-9a-f-]{36}/);
	await expect(page.getByRole('radio', { name: 'home', exact: true })).toBeChecked();
	await page.locator('label[title="pets"]').click();
	await page.getByRole('button', { name: 'Guardar cambios' }).click();
	await expect(page.getByText('Categoría actualizada')).toBeVisible({ timeout: 20_000 });

	await page.goto('/cuentas?tab=categorias');
	const updated = page.locator('a').filter({ hasText: name });
	await expect(updated.locator('.material-symbols-outlined').first()).toHaveText('pets');

	// Limpieza: sin movimientos asociados se puede eliminar.
	acceptConfirm(page);
	await updated.click();
	await page.getByRole('button', { name: 'Eliminar categoría' }).click();
	await expect(page).toHaveURL(/\/cuentas\?tab=categorias/);
	await expect(page.getByText(name)).toHaveCount(0);
});
