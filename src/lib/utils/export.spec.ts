import { describe, expect, it } from 'vitest';
import { csvNumber, toCsv } from './export';

describe('csvNumber', () => {
	it('usa coma decimal para hojas de cálculo en español', () => {
		expect(csvNumber(1234.5)).toBe('1234,50');
		expect(csvNumber(-10)).toBe('-10,00');
	});
});

describe('toCsv', () => {
	it('une celdas con punto y coma y filas con CRLF', () => {
		expect(
			toCsv([
				['Categoría', 'Monto'],
				['Alimentos', 600]
			])
		).toBe('Categoría;Monto\r\nAlimentos;600');
	});

	it('escapa separadores, comillas y saltos de línea', () => {
		expect(toCsv([['Casa; jardín', 'Dice "hola"', 'a\nb']])).toBe('"Casa; jardín";"Dice ""hola""";"a\nb"');
	});

	it('representa valores vacíos como celdas vacías', () => {
		expect(toCsv([[null, undefined, '', 0]])).toBe(';;;0');
	});
});
