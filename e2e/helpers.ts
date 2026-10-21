import { expect, test, type Page } from '@playwright/test';

/**
 * Credenciales de un usuario de pruebas dedicado. No se incluye ninguna
 * contraseña por defecto: deben venir de `E2E_EMAIL` / `E2E_PASSWORD` (secretos
 * de CI). Si faltan, las pruebas que requieren sesión se omiten.
 */
export const DEMO = {
	email: process.env.E2E_EMAIL ?? 'demo@finflow.app',
	password: process.env.E2E_PASSWORD ?? ''
};

/** Inicia sesión con el usuario de pruebas y espera el panel principal. */
export async function login(page: Page): Promise<void> {
	if (!DEMO.password) {
		test.skip(true, 'Configura E2E_EMAIL y E2E_PASSWORD para ejecutar las pruebas con sesión.');
		return;
	}

	await page.goto('/login', { waitUntil: 'domcontentloaded' });
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
