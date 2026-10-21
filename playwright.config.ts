import { defineConfig } from '@playwright/test';

// Producción suele ejecutar el servidor en UTC: las pruebas reproducen ese
// escenario mientras el navegador conserva la zona local.
const env = Object.fromEntries(
	Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
);

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		reuseExistingServer: true,
		env: { ...env, TZ: 'UTC' }
	},
	testMatch: '**/*.e2e.{ts,js}',
	use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
	timeout: 90_000,
	expect: { timeout: 15_000 },
	// Las pruebas comparten el usuario de demostración: se ejecutan en serie.
	workers: 1
});
