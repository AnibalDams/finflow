import { expect, test } from '@playwright/test';
import { acceptConfirm, login } from './helpers';

test('registra un gasto, lo edita y lo elimina desde el detalle', async ({ page }) => {
	const concept = `Café E2E ${Date.now()}`;
	const edited = `${concept} (editado)`;

	await login(page);
	await page.goto('/movimientos/nuevo');
	await page.getByLabel('Monto a registrar').fill('12.34');
	await page.getByLabel('Concepto o nota').fill(concept);
	await page.getByRole('button', { name: 'Guardar gasto' }).click();

	await expect(page).toHaveURL(/\/movimientos(\?.*)?$/);
	await expect(page.getByText(concept).first()).toBeVisible();

	// El detalle permite editar el concepto.
	await page.getByText(concept).first().click();
	await expect(page).toHaveURL(/\/movimientos\/[0-9a-f-]{36}/);
	await page.getByLabel('Concepto o nota').fill(edited);
	await page.getByRole('button', { name: 'Guardar cambios' }).click();
	await expect(page.getByLabel('Concepto o nota')).toHaveValue(edited);

	// Y eliminarlo definitivamente.
	acceptConfirm(page);
	await page.getByRole('button', { name: 'Eliminar movimiento' }).click();

	await expect(page).toHaveURL(/\/movimientos(\?.*)?$/);
	await expect(page.getByText(edited)).toHaveCount(0);
});

test('busca movimientos por concepto sin perder el mes consultado', async ({ page }) => {
	await login(page);
	await page.goto('/movimientos');

	const search = page.getByLabel('Buscar movimientos');
	await search.fill('zzz-sin-resultados-e2e');
	await search.press('Enter');

	await expect(page).toHaveURL(/q=zzz-sin-resultados-e2e/);
	await expect(page.getByText('Sin resultados')).toBeVisible();
	// El mes sigue viajando en el formulario de búsqueda.
	await expect(page.locator('input[name="mes"]').first()).not.toHaveValue('');
});
