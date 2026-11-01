import { describe, expect, it } from 'vitest';
import { safeRedirect, siteOrigin, translateAuthError } from './auth-errors';

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

describe('siteOrigin', () => {
	it('prefiere la URL configurada', () => {
		expect(siteOrigin('https://app.example', 'https://finflow.app', true)).toBe(
			'https://finflow.app'
		);
	});

	it('en producción rechaza el origen de la petición', () => {
		expect(siteOrigin('https://host-manipulado.example', '', true)).toBeNull();
		expect(siteOrigin('http://host-manipulado.example', '', true)).toBeNull();
	});

	it('en desarrollo y en localhost usa la petición', () => {
		expect(siteOrigin('http://localhost:5173', '', true)).toBe('http://localhost:5173');
		expect(siteOrigin('http://127.0.0.1:4173', '', true)).toBe('http://127.0.0.1:4173');
		expect(siteOrigin('http://192.168.0.10:5173', '', false)).toBe('http://192.168.0.10:5173');
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
