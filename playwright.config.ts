import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: { command: 'npm run build && npm run preview', port: 4173, reuseExistingServer: true },
	testMatch: '**/*.e2e.{ts,js}',
	use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
	timeout: 60_000,
	expect: { timeout: 10_000 },
	// Las pruebas comparten el usuario de demostración: se ejecutan en serie.
	workers: 1
});
