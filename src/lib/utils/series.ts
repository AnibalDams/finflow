import type { TransactionType } from '#lib/types/domain';
import { fromCents, toCents } from './money';

/** Movimiento tal como llega de la vista `transactions` (solo lo necesario). */
export interface CashflowRow {
	amount: number;
	type: TransactionType;
	occurred_at: string;
	account_id: string;
	counter_account_id: string | null;
}

/**
 * Impacto de un movimiento sobre el saldo de una cuenta.
 * Las transferencias restan en la cuenta origen y suman en la destino; cuando
 * no se filtra por cuenta, su efecto global es neutro.
 */
export function accountImpact(row: CashflowRow, accountId: string | null): number {
	if (row.type === 'transfer') {
		if (accountId === null) return 0;
		if (row.account_id === accountId) return -row.amount;
		if (row.counter_account_id === accountId) return row.amount;
		return 0;
	}

	if (accountId !== null && row.account_id !== accountId) return 0;
	return row.type === 'income' ? row.amount : -row.amount;
}

/** Total que un conjunto de movimientos aporta a una cuenta. */
export function totalImpact(rows: CashflowRow[], accountId: string | null): number {
	let cents = 0;
	for (const row of rows) cents += toCents(accountImpact(row, accountId));
	return fromCents(cents);
}

/**
 * Serie acumulada día a día del mes (una entrada por día transcurrido).
 * El último punto coincide con el saldo actual de la cuenta seleccionada.
 */
export function cumulativeMonthlySeries(
	rows: CashflowRow[],
	accountId: string | null,
	currentBalance: number,
	dayCount: number,
	offsetMinutes = 0
): number[] {
	const daily = new Array<number>(Math.max(1, dayCount)).fill(0);

	for (const row of rows) {
		const local = new Date(new Date(row.occurred_at).getTime() - offsetMinutes * 60_000);
		const day = local.getUTCDate();
		if (day < 1 || day > daily.length) continue;
		daily[day - 1] += toCents(accountImpact(row, accountId));
	}

	let running = toCents(currentBalance) - daily.reduce((sum, value) => sum + value, 0);
	return daily.map((value) => {
		running += value;
		return fromCents(running);
	});
}

export interface MonthlyBar {
	label: string;
	value: number;
}

/** Serie comparativa del periodo actual frente al anterior, alineada por índice. */
export function alignSeries(
	current: number[],
	previous: number[],
	size: number
): {
	current: number[];
	previous: number[];
} {
	const fill = (values: number[]): number[] => {
		const copy = values.slice(0, size);
		while (copy.length < size) copy.push(0);
		return copy;
	};
	return { current: fill(current), previous: fill(previous) };
}
