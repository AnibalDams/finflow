import { describe, expect, it } from 'vitest';
import { RECOVERY_TTL_MS, createRecoveryToken, recoveryKey, verifyRecoveryToken } from './recovery';

const KEY = recoveryKey('secreto-de-prueba-suficientemente-largo');
const OTHER_KEY = recoveryKey('otro-secreto-de-prueba');
const USER = '8c0a1f34-5b6d-4c7e-9f10-2a3b4c5d6e7f';
const NOW = new Date('2026-11-01T12:00:00.000Z').getTime();

describe('createRecoveryToken / verifyRecoveryToken', () => {
	it('acepta un token válido del mismo usuario dentro de la ventana', () => {
		const token = createRecoveryToken(KEY, USER, NOW);
		expect(verifyRecoveryToken(KEY, token, USER, NOW)).toBe(true);
		expect(verifyRecoveryToken(KEY, token, USER, NOW + RECOVERY_TTL_MS - 1)).toBe(true);
	});

	it('rechaza el token de otro usuario', () => {
		const token = createRecoveryToken(KEY, USER, NOW);
		expect(verifyRecoveryToken(KEY, token, '00000000-0000-4000-8000-000000000000', NOW)).toBe(
			false
		);
	});

	it('caduca al vencer la ventana', () => {
		const token = createRecoveryToken(KEY, USER, NOW);
		expect(verifyRecoveryToken(KEY, token, USER, NOW + RECOVERY_TTL_MS)).toBe(false);
	});

	it('rechaza un token manipulado o firmado con otra clave', () => {
		const token = createRecoveryToken(KEY, USER, NOW);
		const tampered = `${token.slice(0, -2)}AA`;
		expect(verifyRecoveryToken(KEY, tampered, USER, NOW)).toBe(false);
		expect(verifyRecoveryToken(OTHER_KEY, token, USER, NOW)).toBe(false);
	});

	it('rechaza valores vacíos o con formato inválido', () => {
		expect(verifyRecoveryToken(KEY, null, USER, NOW)).toBe(false);
		expect(verifyRecoveryToken(KEY, '', USER, NOW)).toBe(false);
		expect(verifyRecoveryToken(KEY, 'v1', USER, NOW)).toBe(false);
		expect(verifyRecoveryToken(KEY, `v2.${USER}.9999999999999.firma`, USER, NOW)).toBe(false);
	});
});
