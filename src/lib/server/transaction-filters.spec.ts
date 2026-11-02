import { describe, expect, it } from 'vitest';
import { readMonth, readTransactionType } from './transaction-filters';

const fallback = new Date(2026, 9, 18);

describe('readMonth', () => {
	it('acepta la clave canónica y enlaces antiguos con día', () => {
		expect(readMonth('2026-08', fallback)).toBe('2026-08');
		expect(readMonth('2026-08-17', fallback)).toBe('2026-08');
	});

	it('interpreta `todos` como todo el historial', () => {
		expect(readMonth('todos', fallback)).toBeNull();
	});

	it('cae al mes de referencia ante valores inválidos', () => {
		expect(readMonth(null, fallback)).toBe('2026-10');
		expect(readMonth('agosto', fallback)).toBe('2026-10');
		expect(readMonth('2026-13', fallback)).toBe('2026-10');
	});
});

describe('readTransactionType', () => {
	it('solo admite los tipos soportados', () => {
		expect(readTransactionType('expense')).toBe('expense');
		expect(readTransactionType('transfer')).toBe('transfer');
		expect(readTransactionType('otros')).toBeUndefined();
		expect(readTransactionType(null)).toBeUndefined();
	});
});
