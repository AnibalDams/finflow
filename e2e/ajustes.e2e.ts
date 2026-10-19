import { expect, test } from '@playwright/test';
import { login, submitForm } from './helpers';

test('guarda el perfil y conserva los datos al recargar', async ({ page }) => {
	await login(page);
	await page.goto('/ajustes');

	const budget = page.getByLabel('Presupuesto mensual global');
	await expect(budget).toBeVisible();
	const original = await budget.inputValue();
	const next = original === '3000.00' ? '3100.00' : '3000.00';

	await budget.fill(next);
	await submitForm(page, 'Guardar perfil');
	await page.reload();
	await expect(page.getByLabel('Presupuesto mensual global')).toHaveValue(next);

	// Restauramos el valor original del usuario de demostración.
	await page.getByLabel('Presupuesto mensual global').fill(original);
	await submitForm(page, 'Guardar perfil');
	await page.reload();
	await expect(page.getByLabel('Presupuesto mensual global')).toHaveValue(original);
});

test('avisa cuando las contraseñas no coinciden', async ({ page }) => {
	await login(page);
	await page.goto('/ajustes');

	await page.getByLabel('Nueva contraseña').fill('ClaveNueva2026');
	await page.getByLabel('Confirmar contraseña').fill('ClaveDistinta2026');
	await page.getByRole('button', { name: 'Cambiar contraseña' }).click();

	await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible();
});

test('exporta el CSV de movimientos del mes', async ({ page }) => {
	await login(page);
	await page.goto('/ajustes');

	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('button', { name: 'CSV' }).click()
	]);

	expect(download.suggestedFilename()).toMatch(/^finflow-movimientos-\d{4}-\d{2}-01\.csv$/);
});
