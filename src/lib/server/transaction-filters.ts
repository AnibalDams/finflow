/**
 * Lectura de los filtros de movimientos que llegan por la URL.
 *
 * La usan la página y el endpoint de exportación para interpretar el mes y el
 * tipo con las mismas reglas (incluidos enlaces antiguos con fecha completa).
 */

import { monthParam, parseMonthParam } from '#lib/utils/dates';
import type { TransactionType } from '#lib/types/domain';

/** Acepta `YYYY-MM` (canónico), `YYYY-MM-DD` de enlaces antiguos y `todos`. */
export function readMonth(value: string | null, fallback: Date): string | null {
	if (value === 'todos') return null;
	if (value && /^\d{4}-\d{2}(-\d{2})?$/.test(value)) {
		const key = value.slice(0, 7);
		if (parseMonthParam(key)) return key;
	}
	return monthParam(fallback);
}

export function readTransactionType(value: string | null): TransactionType | undefined {
	return value === 'income' || value === 'expense' || value === 'transfer' ? value : undefined;
}
