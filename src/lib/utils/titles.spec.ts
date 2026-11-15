import { describe, expect, test } from 'vitest';
import { pageTitle } from './titles';

describe('pageTitle', () => {
	test('resuelve las secciones principales', () => {
		expect(pageTitle('/')).toBe('Inicio · FinFlow');
		expect(pageTitle('/movimientos')).toBe('Movimientos · FinFlow');
		expect(pageTitle('/metricas')).toBe('Métricas · FinFlow');
		expect(pageTitle('/ajustes')).toBe('Configuración · FinFlow');
	});

	test('prioriza las rutas específicas sobre las de sección', () => {
		expect(pageTitle('/movimientos/nuevo')).toBe('Nuevo movimiento · FinFlow');
		expect(pageTitle('/movimientos/abc-123')).toBe('Detalle del movimiento · FinFlow');
		expect(pageTitle('/deudas/nueva')).toBe('Nueva deuda · FinFlow');
		expect(pageTitle('/cuentas/abc-123')).toBe('Detalle de la cuenta · FinFlow');
		expect(pageTitle('/categorias/nueva')).toBe('Nueva categoría · FinFlow');
	});

	test('tolera la barra final', () => {
		expect(pageTitle('/movimientos/')).toBe('Movimientos · FinFlow');
	});

	test('cae en la marca para rutas desconocidas', () => {
		expect(pageTitle('/no-existe')).toBe('FinFlow');
	});
});
