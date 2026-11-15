import { describe, expect, test } from 'vitest';
import {
	bestOn,
	contrastRatio,
	ensureContrast,
	hexToOklch,
	mixColors,
	normalizeHex,
	oklchToHex,
	relativeLuminance,
	withAlpha
} from './color';

describe('normalizeHex', () => {
	test('acepta formatos cortos, largos y con o sin almohadilla', () => {
		expect(normalizeHex('#ABC')).toBe('#aabbcc');
		expect(normalizeHex('006c49')).toBe('#006c49');
		expect(normalizeHex('  #FFFFFF ')).toBe('#ffffff');
	});

	test('rechaza valores inválidos sin lanzar', () => {
		expect(normalizeHex('#12345')).toBeNull();
		expect(normalizeHex('rebeccapurple')).toBeNull();
		expect(normalizeHex(12)).toBeNull();
		expect(normalizeHex(null)).toBeNull();
	});
});

describe('conversión OKLCH', () => {
	test('ida y vuelta conserva el color', () => {
		for (const hex of ['#006c49', '#5266eb', '#820ad1', '#ffffff', '#000000', '#9fe870']) {
			expect(oklchToHex(hexToOklch(hex))).toBe(hex);
		}
	});

	test('el blanco y el negro caen en los extremos de luminosidad', () => {
		expect(hexToOklch('#ffffff').l).toBeCloseTo(1, 2);
		expect(hexToOklch('#000000').l).toBeCloseTo(0, 2);
	});
});

describe('contraste WCAG', () => {
	test('blanco sobre negro es 21:1', () => {
		expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
	});

	test('un neutro conocido mantiene su ratio', () => {
		expect(contrastRatio('#64748b', '#ffffff')).toBeGreaterThan(4.5);
		expect(contrastRatio('#64748b', '#ffffff')).toBeLessThan(5);
	});

	test('bestOn elige el extremo legible', () => {
		expect(bestOn('#006c49')).toBe('#ffffff');
		expect(bestOn('#9fe870')).toBe('#0f172a');
	});

	test('ensureContrast sube la luminosidad hasta cumplir', () => {
		const adjusted = ensureContrast(hexToOklch('#9fe870'), '#ffffff', 4.5);
		expect(contrastRatio(oklchToHex(adjusted), '#ffffff')).toBeGreaterThanOrEqual(4.5);
	});

	test('relativeLuminance es monótona', () => {
		expect(relativeLuminance('#000000')).toBe(0);
		expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
	});
});

describe('utilidades de mezcla', () => {
	test('withAlpha produce rgb con transparencia', () => {
		expect(withAlpha('#006c49', 0.1)).toBe('rgb(0 108 73 / 0.1)');
	});

	test('mixColors interpola en el punto medio', () => {
		const mid = hexToOklch(mixColors('#000000', '#ffffff', 0.5));
		expect(mid.l).toBeCloseTo(0.5, 1);
	});
});
