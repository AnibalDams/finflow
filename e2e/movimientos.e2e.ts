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

	// Aprovecha la sesión para validar la exportación del historial completo.
	await page.goto('/movimientos?mes=todos');
	await page.getByRole('button', { name: 'Exportar', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'Exportar movimientos' });
	await expect(dialog.getByRole('button', { name: /^Excel/ })).toBeVisible();
	await expect(dialog.getByRole('button', { name: /^HTML estilizado/ })).toBeVisible();

	const [download] = await Promise.all([
		page.waitForEvent('download'),
		dialog.getByRole('button', { name: /^CSV/ }).click()
	]);

	expect(download.suggestedFilename()).toBe('finflow-movimientos-historial.csv');
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

test('navega entre meses sin volver al mes actual', async ({ page }) => {
	await login(page);
	await page.goto('/movimientos');

	// El navegador corre en la zona local: calculamos el mes anterior con su reloj.
	const previousMonth = await page.evaluate(() => {
		const now = new Date();
		const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
	});

	await page.getByRole('link', { name: 'Mes anterior' }).click();

	await expect(page).toHaveURL(new RegExp(`/movimientos\\?mes=${previousMonth}$`));
	// Sólo aparece cuando el mes consultado no es el actual.
	await expect(page.getByRole('link', { name: 'Volver al mes actual' })).toBeVisible();

	// Buscar no debe devolver la vista al mes en curso.
	const search = page.getByLabel('Buscar movimientos');
	await search.fill('zzz-sin-resultados-e2e');
	await search.press('Enter');

	await expect(page).toHaveURL(new RegExp(`mes=${previousMonth}.*q=zzz-sin-resultados-e2e`));
	await expect(page.getByText('Sin resultados')).toBeVisible();

	// Y el atajo restaura el mes actual.
	await page.getByRole('link', { name: 'Volver al mes actual' }).click();
	await expect(page).toHaveURL(/\/movimientos\?q=zzz-sin-resultados-e2e$/);
	await expect(page.getByRole('link', { name: 'Volver al mes actual' })).toHaveCount(0);
});
