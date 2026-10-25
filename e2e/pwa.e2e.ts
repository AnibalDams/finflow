import { expect, test } from '@playwright/test';
import { login } from './helpers';

interface ManifestIcon {
	src: string;
	sizes: string;
	type: string;
	purpose: string;
}

interface Manifest {
	name: string;
	short_name: string;
	display: string;
	start_url: string;
	scope: string;
	icons: ManifestIcon[];
}

test('publica el manifest y los iconos de la PWA', async ({ page, request }) => {
	const response = await request.get('/manifest.webmanifest');
	expect(response.ok()).toBeTruthy();

	const manifest = (await response.json()) as Manifest;
	expect(manifest.name).toContain('FinFlow');
	expect(manifest.short_name).toBe('FinFlow');
	expect(manifest.display).toBe('standalone');
	expect(manifest.start_url).toBe('/');
	expect(manifest.scope).toBe('/');
	expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
	expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);

	for (const size of ['192x192', '512x512']) {
		const icon = manifest.icons.find((item) => item.sizes === size && item.purpose === 'any');
		expect(icon).toBeTruthy();

		const image = await request.get(icon!.src);
		expect(image.ok()).toBeTruthy();
		expect(image.headers()['content-type']).toContain('image/png');
	}

	await login(page);
	await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
		'href',
		'/manifest.webmanifest'
	);
	await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
		'href',
		/\/icons\/apple-touch-icon\.png$/
	);
});

test('registra el service worker y muestra la página offline', async ({ page, context }) => {
	await login(page);

	const active = await page.evaluate(async () => {
		if (!('serviceWorker' in navigator)) return false;
		const registration = await navigator.serviceWorker.ready;
		return Boolean(registration.active);
	});
	expect(active).toBe(true);

	// Recarga para que la página quede controlada por el service worker.
	await page.reload();
	await context.setOffline(true);

	await page.reload();
	await expect(page.getByText('Sin conexión')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();

	await context.setOffline(false);
});

test('muestra la sección para instalar la aplicación', async ({ page }) => {
	await login(page);
	await page.goto('/ajustes');

	await expect(page.getByRole('heading', { name: 'Instalar aplicación' })).toBeVisible();
	await expect(
		page.getByText(/Instalar FinFlow|pantalla de inicio|Tenla a mano/i).first()
	).toBeVisible();
});

test('comprueba si hay una versión nueva al navegar', async ({ page }) => {
	await login(page);

	await page.evaluate(async () => {
		await navigator.serviceWorker.ready;

		const target = window as Window & { __swUpdateCalls?: number };
		target.__swUpdateCalls = 0;

		const original = ServiceWorkerRegistration.prototype.update;
		ServiceWorkerRegistration.prototype.update = function (this: ServiceWorkerRegistration) {
			target.__swUpdateCalls = (target.__swUpdateCalls ?? 0) + 1;
			return original.call(this);
		};
	});

	await page.getByRole('link', { name: /Métricas|Estadísticas/ }).click();
	await expect(page).toHaveURL(/\/metricas/);

	await expect
		.poll(() =>
			page.evaluate(() => (window as Window & { __swUpdateCalls?: number }).__swUpdateCalls ?? 0)
		)
		.toBeGreaterThan(0);
});

test('ofrece actualizar cuando hay una versión esperando', async ({ page }) => {
	await login(page);

	await page.evaluate(async () => {
		await navigator.serviceWorker.ready;

		const target = window as Window & { __swMessage?: string };
		const fakeWaiting = {
			state: 'installed',
			postMessage(message: unknown) {
				target.__swMessage = JSON.stringify(message);
			}
		};

		const container = navigator.serviceWorker as unknown as {
			getRegistration: () => Promise<unknown>;
		};
		container.getRegistration = async () => ({
			waiting: fakeWaiting,
			update: async () => {},
			addEventListener: () => {}
		});
	});

	await page.getByRole('link', { name: /Métricas|Estadísticas/ }).click();
	await expect(page.getByText('Nueva versión disponible')).toBeVisible();

	await page.getByRole('button', { name: 'Actualizar' }).click();
	await expect
		.poll(() =>
			page.evaluate(() => (window as Window & { __swMessage?: string }).__swMessage ?? '')
		)
		.toContain('SKIP_WAITING');
});
