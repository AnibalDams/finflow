import { describe, expect, it } from 'vitest';
import { accountImpact, alignSeries, cumulativeMonthlySeries, totalImpact, type CashflowRow } from './series';

function row(overrides: Partial<CashflowRow> = {}): CashflowRow {
	return {
		amount: 100,
		type: 'expense',
		occurred_at: '2026-10-05T12:00:00.000Z',
		account_id: 'cuenta-a',
		counter_account_id: null,
		...overrides
	};
}

describe('accountImpact', () => {
	it('resta los gastos y suma los ingresos de la cuenta', () => {
		expect(accountImpact(row(), 'cuenta-a')).toBe(-100);
		expect(accountImpact(row({ type: 'income' }), 'cuenta-a')).toBe(100);
	});

	it('ignora los movimientos de otras cuentas cuando se filtra', () => {
		expect(accountImpact(row(), 'cuenta-b')).toBe(0);
	});

	it('trata las transferencias como neutras sin filtro de cuenta', () => {
		const transfer = row({ type: 'transfer', account_id: 'cuenta-a', counter_account_id: 'cuenta-b' });
		expect(accountImpact(transfer, null)).toBe(0);
		expect(accountImpact(transfer, 'cuenta-a')).toBe(-100);
		expect(accountImpact(transfer, 'cuenta-b')).toBe(100);
		expect(accountImpact(transfer, 'cuenta-c')).toBe(0);
	});
});

describe('totalImpact', () => {
	it('suma el impacto de varios movimientos sin error de coma flotante', () => {
		const rows = [
			row({ amount: 0.1 }),
			row({ amount: 0.2 }),
			row({ amount: 50, type: 'income' })
		];
		expect(totalImpact(rows, 'cuenta-a')).toBe(49.7);
	});
});

describe('cumulativeMonthlySeries', () => {
	it('acumula día a día y termina en el saldo actual', () => {
		const rows = [
			row({ amount: 100, occurred_at: '2026-10-02T12:00:00.000Z' }),
			row({ amount: 50, type: 'income', occurred_at: '2026-10-04T12:00:00.000Z' })
		];
		// Partimos de 200 y restamos en el día del gasto.
		const series = cumulativeMonthlySeries(rows, 'cuenta-a', 150, 5);
		expect(series).toHaveLength(5);
		expect(series).toEqual([200, 100, 100, 150, 150]);
		expect(series.at(-1)).toBe(150);
	});

	it('ignora movimientos fuera del mes mostrado', () => {
		const series = cumulativeMonthlySeries(
			[row({ amount: 999, occurred_at: '2026-09-30T12:00:00.000Z' })],
			'cuenta-a',
			0,
			5
		);
		expect(series.every((value) => value === 0)).toBe(true);
	});
});

describe('alignSeries', () => {
	it('recorta y rellena ambas series al mismo tamaño', () => {
		expect(alignSeries([1, 2, 3, 4], [1, 2], 3)).toEqual({
			current: [1, 2, 3],
			previous: [1, 2, 0]
		});
	});
});
