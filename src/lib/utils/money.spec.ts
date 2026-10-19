import { describe, expect, it } from 'vitest';
import {
	currencySymbol,
	formatCompactMoney,
	formatMoney,
	formatPercent,
	formatSignedAmount,
	fromCents,
	parseAmountInput,
	round2,
	sumAmounts,
	toAmountInput,
	toCents
} from './money';

describe('conversión de centavos', () => {
	it('convierte decimales a centavos enteros y viceversa', () => {
		expect(toCents(12.34)).toBe(1234);
		expect(toCents(0.005)).toBe(1);
		expect(fromCents(1234)).toBe(12.34);
		expect(round2(1.006)).toBe(1.01);
	});

	it('suma sin arrastrar error de coma flotante', () => {
		expect(sumAmounts([0.1, 0.2])).toBe(0.3);
		expect(sumAmounts([19.99, 0.01, 0.02])).toBe(20.02);
		expect(sumAmounts([])).toBe(0);
	});
});

describe('formato de montos', () => {
	it('agrupa miles y usa dos decimales', () => {
		expect(formatMoney(8450.2)).toBe('$8,450.20');
		expect(formatMoney(0)).toBe('$0.00');
	});

	it('marca negativos y signo explícito', () => {
		expect(formatMoney(-1200)).toBe('−$1,200.00');
		expect(formatMoney(1200, 'USD', { sign: true })).toBe('+$1,200.00');
	});

	it('usa el símbolo de la moneda', () => {
		expect(currencySymbol('eur')).toBe('€');
		expect(currencySymbol('PEN')).toBe('S/');
		expect(currencySymbol('XYZ')).toBe('XYZ');
		expect(formatMoney(10, 'EUR')).toBe('€10.00');
	});

	it('aplica el signo según el tipo de movimiento', () => {
		expect(formatSignedAmount(3200, 'income')).toBe('+$3,200.00');
		expect(formatSignedAmount(142.8, 'expense')).toBe('−$142.80');
		expect(formatSignedAmount(500, 'transfer')).toBe('$500.00');
	});

	it('abrevia montos grandes para gráficos', () => {
		expect(formatCompactMoney(340)).toBe('$340.00');
		expect(formatCompactMoney(1200)).toBe('$1.2K');
		expect(formatCompactMoney(10_500)).toBe('$11K');
		expect(formatCompactMoney(-2_500_000)).toBe('$-2.5M');
	});

	it('formatea porcentajes', () => {
		expect(formatPercent(12.345, 1)).toBe('12.3%');
		expect(formatPercent(50)).toBe('50%');
	});
});

describe('parseAmountInput', () => {
	it('acepta punto decimal y separador de miles', () => {
		expect(parseAmountInput('1234.56')).toBe(1234.56);
		expect(parseAmountInput('1,234.56')).toBe(1234.56);
		expect(parseAmountInput('  $1,234.56 ')).toBe(1234.56);
	});

	it('acepta coma decimal', () => {
		expect(parseAmountInput('1234,56')).toBe(1234.56);
		expect(parseAmountInput('$1 234,56')).toBe(1234.56);
	});

	it('interpreta la coma de miles cuando no hay decimales', () => {
		expect(parseAmountInput('1,234')).toBe(1234);
	});

	it('devuelve null para entradas inválidas', () => {
		expect(parseAmountInput('')).toBeNull();
		expect(parseAmountInput('   ')).toBeNull();
		expect(parseAmountInput('abc')).toBeNull();
	});

	it('redondea a dos decimales', () => {
		expect(parseAmountInput('10.006')).toBe(10.01);
	});
});

describe('toAmountInput', () => {
	it('deja vacío el cero y fija dos decimales', () => {
		expect(toAmountInput(0)).toBe('');
		expect(toAmountInput(12.5)).toBe('12.50');
	});
});
