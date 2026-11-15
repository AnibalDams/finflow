import { expect, test } from '@playwright/test';
import { login, submitForm } from './helpers';

// Código fuera de ISO 4217: demuestra que el catálogo admite monedas propias.
const CODE = 'ZZT';
const NAME = 'Moneda de prueba E2E';

test('agrega, renombra y elimina una moneda personalizada', async ({ page }) => {
	await login(page);
	await page.goto('/ajustes');

	// Una ejecución anterior fallida pudo dejar la moneda creada.
	if (await page.getByRole('button', { name: `Eliminar ${CODE}` }).count()) {
		await submitForm(page, `Eliminar ${CODE}`);
		await expect(page.getByRole('button', { name: `Eliminar ${CODE}` })).toHaveCount(0);
	}

	await page.getByLabel('Código').fill(CODE);
	await page.getByLabel('Nombre', { exact: true }).fill(NAME);
	await submitForm(page, 'Agregar moneda');
	await expect(page.getByRole('button', { name: `Renombrar ${CODE}` })).toBeVisible();

	// La moneda principal no se puede eliminar; la nueva sí.
	await expect(page.getByRole('button', { name: 'Eliminar USD' })).toBeDisabled();
	await expect(page.getByRole('button', { name: `Eliminar ${CODE}` })).toBeEnabled();

	// Ya está disponible en el selector de la moneda principal.
	await page.getByRole('button', { name: /Moneda principal/ }).click();
	await expect(page.getByRole('option', { name: new RegExp(`^${CODE}`) })).toBeVisible();
	await page.keyboard.press('Escape');

	const renamed = `${NAME} (editada)`;
	await page.getByRole('button', { name: `Renombrar ${CODE}` }).click();
	await page.getByLabel(`Nombre de ${CODE}`, { exact: true }).fill(renamed);
	await submitForm(page, `Guardar nombre de ${CODE}`);
	await expect(page.getByText(renamed, { exact: true })).toBeVisible();

	// Limpieza: el usuario de demostración queda como estaba.
	await submitForm(page, `Eliminar ${CODE}`);
	await expect(page.getByRole('button', { name: `Renombrar ${CODE}` })).toHaveCount(0);
});
