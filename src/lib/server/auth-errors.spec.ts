import { describe, expect, it } from 'vitest';
import { safeRedirect, translateAuthError } from './auth-errors';

describe('safeRedirect', () => {
	it('permite rutas internas', () => {
		expect(safeRedirect('/ajustes')).toBe('/ajustes');
		expect(safeRedirect('/movimientos?mes=2026-10')).toBe('/movimientos?mes=2026-10');
	});

	it('rechaza destinos externos y variantes de bypass', () => {
		expect(safeRedirect('//evil.example')).toBe('/');
		expect(safeRedirect('https://evil.example')).toBe('/');
		expect(safeRedirect('/\\evil.example')).toBe('/');
		expect(safeRedirect('/%5Cevil.example')).toBe('/');
		expect(safeRedirect('/ruta\nLocation: https://evil.example')).toBe('/');
		expect(safeRedirect(null, '/login')).toBe('/login');
	});
});

describe('translateAuthError', () => {
	it('no reenvía mensajes crudos del proveedor', () => {
		expect(translateAuthError('Invalid login credentials')).toBe(
			'Correo o contraseña incorrectos.'
		);
		expect(translateAuthError('unexpected provider detail')).toBe(
			'No pudimos completar la operación. Inténtalo de nuevo.'
		);
	});
});
