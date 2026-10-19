import { expect, test } from '@playwright/test';
import { DEMO, login } from './helpers';

test('protege las rutas privadas y pide iniciar sesión', async ({ page }) => {
	await page.goto('/cuentas');

	await expect(page).toHaveURL(/\/login/);
	await expect(page.getByRole('heading', { name: /Inicia sesión|Accede/ })).toBeVisible();
});

test('rechaza credenciales incorrectas sin revelar detalles', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Correo electrónico').fill(DEMO.email);
	await page.getByLabel('Contraseña').fill('clave-incorrecta-2026');
	await page.getByRole('button', { name: 'Entrar' }).click();

	await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible();
	await expect(page).toHaveURL(/\/login/);
});

test('inicia sesión y muestra el resumen del mes', async ({ page }) => {
	await login(page);

	await expect(page.getByRole('heading', { name: /Hola,/ })).toBeVisible();
	await expect(page.getByText(/Resumen de|salud financiera|gastos crecieron/)).toBeVisible();
});

test('cierra sesión y vuelve al inicio de sesión', async ({ page }) => {
	await login(page);
	await page.goto('/ajustes');
	await page.getByRole('button', { name: 'Cerrar sesión' }).click();

	await expect(page).toHaveURL(/\/login/);
	await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
});
