import { describe, expect, it } from 'vitest';
import type { ClaimedNotification } from '#lib/types/domain';
import { buildPushPayload, urlBase64ToUint8Array } from './notifications';

function notification(overrides: Partial<ClaimedNotification> = {}): ClaimedNotification {
	return {
		userId: '8a4fbc9b-195b-47b3-a775-2349e68bee9e',
		kind: 'debt_due',
		refId: '1f3a3c5c-893d-4f5c-9b66-338ed0a4340a',
		label: 'Tarjeta Visa',
		amount: 125,
		currency: 'USD',
		dueDate: '2026-11-05',
		daysLeft: 3,
		targetUrl: '/deudas/1f3a3c5c-893d-4f5c-9b66-338ed0a4340a',
		...overrides
	};
}

describe('buildPushPayload', () => {
	it('anuncia una cuota que vence en varios días', () => {
		const payload = buildPushPayload(notification());

		expect(payload.title).toBe('Tarjeta Visa vence en 3 días');
		expect(payload.body).toContain('$125.00');
		expect(payload.body).toContain('5 Nov');
		expect(payload.url).toBe('/deudas/1f3a3c5c-893d-4f5c-9b66-338ed0a4340a');
		expect(payload.tag).toBe('debt-1f3a3c5c-893d-4f5c-9b66-338ed0a4340a');
	});

	it('distingue hoy y mañana', () => {
		expect(buildPushPayload(notification({ daysLeft: 0 })).title).toBe('Tarjeta Visa vence hoy');
		expect(buildPushPayload(notification({ daysLeft: 1 })).title).toBe('Tarjeta Visa vence mañana');
	});

	it('recuerda una cuota vencida con los días transcurridos', () => {
		const payload = buildPushPayload(
			notification({ kind: 'debt_overdue', daysLeft: -1, dueDate: '2026-11-05' })
		);

		expect(payload.title).toBe('Tarjeta Visa está vencida');
		expect(payload.body).toContain('venció hace 1 día');
		expect(payload.body).toContain('$125.00');
	});

	it('usa el singular y el plural correctos para los días vencidos', () => {
		expect(buildPushPayload(notification({ kind: 'debt_overdue', daysLeft: -5 })).body).toContain(
			'venció hace 5 días'
		);
	});

	it('arma el recordatorio de un plan con y sin aportación', () => {
		const withAmount = buildPushPayload(
			notification({
				kind: 'goal_reminder',
				label: 'Viaje a Japón',
				amount: 200,
				daysLeft: 0,
				targetUrl: '/planes/51278f4e-4c5b-47e1-b366-8b72244f0d2c'
			})
		);
		const withoutAmount = buildPushPayload(
			notification({ kind: 'goal_reminder', amount: 0, daysLeft: 2 })
		);

		expect(withAmount.title).toBe('Aporte programado · Viaje a Japón');
		expect(withAmount.body).toContain('$200.00');
		expect(withAmount.tag).toBe('goal-1f3a3c5c-893d-4f5c-9b66-338ed0a4340a');
		expect(withoutAmount.body).toContain('Recuerda registrar tu aporte mensual');
	});

	it('mantiene el mismo tag entre días para reemplazar el aviso anterior', () => {
		expect(buildPushPayload(notification({ daysLeft: 5 })).tag).toBe(
			buildPushPayload(notification({ daysLeft: 1 })).tag
		);
	});
});

describe('urlBase64ToUint8Array', () => {
	it('decodifica una clave base64url con relleno', () => {
		// "BOrX" en base64url → 3 bytes + 1 de relleno.
		const bytes = urlBase64ToUint8Array('BOrX');

		expect(Array.from(bytes)).toEqual([4, 234, 215]);
	});

	it('admite caracteres - y _', () => {
		const bytes = urlBase64ToUint8Array('-_8');

		expect(Array.from(bytes)).toEqual([251, 255]);
	});
});
