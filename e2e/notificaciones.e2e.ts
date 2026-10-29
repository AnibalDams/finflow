import { expect, test } from '@playwright/test';
import { login, submitForm } from './helpers';

test('guarda la hora del aviso y el interruptor de notificaciones', async ({ page }) => {
	await login(page);
	await page.goto('/ajustes');

	const time = page.getByLabel('Hora del aviso');
	await expect(time).toBeVisible();

	const originalTime = await time.inputValue();
	const toggle = page.getByRole('switch', { name: /Avisarme de cuotas y aportes/ });
	const originalEnabled = await toggle.isChecked();

	if (!originalEnabled) await page.getByText('Avisarme de cuotas y aportes').first().click();
	await expect(toggle).toBeChecked();

	await time.fill('07:30');
	await submitForm(page, 'Guardar preferencias');
	await page.reload();

	await expect(page.getByLabel('Hora del aviso')).toHaveValue('07:30');
	await expect(page.getByRole('switch', { name: /Avisarme de cuotas y aportes/ })).toBeChecked();

	// Restauramos las preferencias del usuario de demostración.
	await page.getByLabel('Hora del aviso').fill(originalTime);

	if (!originalEnabled) {
		await page.getByText('Avisarme de cuotas y aportes').first().click();
	}

	await submitForm(page, 'Guardar preferencias');
	await page.reload();
	await expect(page.getByLabel('Hora del aviso')).toHaveValue(originalTime);
	await expect(page.getByRole('switch', { name: /Avisarme de cuotas y aportes/ })).toBeChecked({
		checked: originalEnabled
	});
});

test('explica el estado de las notificaciones en este dispositivo', async ({ page }) => {
	await login(page);
	await page.goto('/ajustes');

	await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible();
	await expect(
		page
			.getByText(
				/Falta configuración|Sin activar|Activadas en este dispositivo|no admite push|bloqueadas/i
			)
			.first()
	).toBeVisible();
});

test('el cron rechaza peticiones sin el secreto', async ({ request }) => {
	const response = await request.get('/api/cron/notifications');

	expect(response.status()).toBe(401);
});

test('no acepta suscripciones push sin sesión', async ({ request }) => {
	const response = await request.post('/api/push/subscribe', {
		data: {
			endpoint: 'https://push.example.com/send/abc123',
			keys: {
				p256dh: 'BOrX'.repeat(8),
				auth: '0123456789abcdef'
			}
		}
	});

	expect(response.status()).toBe(401);
});
