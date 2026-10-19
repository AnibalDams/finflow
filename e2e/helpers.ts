import { expect, type Page } from '@playwright/test';

/**
 * Credenciales del usuario de demostración creado por `supabase/seed.sql`.
 * Se pueden sobrescribir con `E2E_EMAIL` / `E2E_PASSWORD`.
 */
export const DEMO = {
	email: process.env.E2E_EMAIL ?? 'demo@finflow.app',
	password: process.env.E2E_PASSWORD ?? 'FinFlow2026!'
};

/** Inicia sesión con el usuario de demostración y espera el panel principal. */
export async function login(page: Page): Promise<void> {
	await page.goto('/login');
	await page.getByLabel('Correo electrónico').fill(DEMO.email);
	await page.getByLabel('Contraseña').fill(DEMO.password);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page.getByRole('heading', { name: /Hola,/ })).toBeVisible({ timeout: 20_000 });
}

/** Acepta los `window.confirm` que aparezcan (borrados y pagos). */
export function acceptConfirm(page: Page): void {
	page.on('dialog', (dialog) => void dialog.accept());
}

/**
 * Envía un formulario y espera a que el servidor procese la petición POST.
 * Evita recargar la página mientras la petición sigue en vuelo (lo que
 * cancelaba el guardado y dejaba el valor anterior).
 */
export async function submitForm(page: Page, buttonName: string): Promise<void> {
	await Promise.all([
		page.waitForResponse((response) => response.request().method() === 'POST'),
		page.getByRole('button', { name: buttonName }).click()
	]);
}
