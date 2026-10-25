import { describe, expect, it } from 'vitest';
import { areaPath, clamp, monotonePath, nearestIndex, niceCeiling, type ChartPoint } from './chart';

/** Extrae las coordenadas Y de un path SVG (los números impares). */
function pathYValues(path: string): number[] {
	const numbers = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
	return numbers.filter((_, index) => index % 2 === 1);
}

describe('clamp', () => {
	it('acota dentro del rango y respeta los extremos', () => {
		expect(clamp(-5, 0, 10)).toBe(0);
		expect(clamp(5, 0, 10)).toBe(5);
		expect(clamp(50, 0, 10)).toBe(10);
	});
});

describe('niceCeiling', () => {
	it('devuelve 1 cuando no hay datos positivos', () => {
		expect(niceCeiling(0)).toBe(1);
		expect(niceCeiling(-20)).toBe(1);
		expect(niceCeiling(Number.NaN)).toBe(1);
	});

	it('usa pasos legibles sin perder el máximo real', () => {
		expect(niceCeiling(1000)).toBe(1000);
		expect(niceCeiling(1234)).toBe(1600);
		expect(niceCeiling(5)).toBe(6);
		expect(niceCeiling(80)).toBe(80);
	});

	it('nunca queda por debajo del valor recibido', () => {
		for (const value of [1, 7, 42, 333, 999, 1500, 12345]) {
			expect(niceCeiling(value)).toBeGreaterThanOrEqual(value);
		}
	});
});

describe('nearestIndex', () => {
	it('redondea al punto más cercano', () => {
		expect(nearestIndex(0, 0, 300, 4)).toBe(0);
		expect(nearestIndex(40, 0, 300, 4)).toBe(0);
		expect(nearestIndex(60, 0, 300, 4)).toBe(1);
		expect(nearestIndex(300, 0, 300, 4)).toBe(3);
	});

	it('acota fuera del eje y tolera series degeneradas', () => {
		expect(nearestIndex(-100, 0, 300, 4)).toBe(0);
		expect(nearestIndex(900, 0, 300, 4)).toBe(3);
		expect(nearestIndex(50, 0, 300, 1)).toBe(0);
		expect(nearestIndex(50, 100, 100, 5)).toBe(0);
	});
});

describe('monotonePath', () => {
	const points: ChartPoint[] = [
		{ x: 0, y: 80 },
		{ x: 100, y: 0 },
		{ x: 200, y: 80 }
	];

	it('empieza en el primer punto y termina en el último', () => {
		const path = monotonePath(points);
		expect(path.startsWith('M 0 80')).toBe(true);
		expect(path.endsWith('200 80')).toBe(true);
	});

	it('no sobrepasa los valores reales en un extremo local', () => {
		const yValues = pathYValues(monotonePath(points));
		// El pico está en y=0 (arriba): ningún control puede salir del rango.
		expect(Math.min(...yValues)).toBeGreaterThanOrEqual(0);
		expect(Math.max(...yValues)).toBeLessThanOrEqual(80);
	});

	it('aplana la tangente en un extremo local', () => {
		expect(monotonePath(points)).toContain('66.67 0');
	});

	it('dibuja una recta cuando la serie es plana', () => {
		const path = monotonePath([
			{ x: 0, y: 40 },
			{ x: 100, y: 40 }
		]);
		expect(path).toBe('M 0 40 C 33.33 40, 66.67 40, 100 40');
	});

	it('maneja series de un punto o vacías', () => {
		expect(monotonePath([])).toBe('');
		expect(monotonePath([{ x: 10, y: 20 }])).toBe('M 10 20');
	});
});

describe('areaPath', () => {
	it('cierra la línea contra la base', () => {
		const points: ChartPoint[] = [
			{ x: 0, y: 10 },
			{ x: 100, y: 20 }
		];
		const area = areaPath(points, monotonePath(points), 80);
		expect(area.endsWith('L 100 80 L 0 80 Z')).toBe(true);
	});

	it('no genera área con menos de dos puntos', () => {
		expect(areaPath([{ x: 0, y: 10 }], 'M 0 10', 80)).toBe('');
	});
});
