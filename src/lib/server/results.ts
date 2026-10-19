import { error as httpError } from '@sveltejs/kit';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Analytics, Debt, Goal, TransactionType } from '#lib/types/domain';

/** Error inesperado de datos: se traduce a una página de error legible. */
export function unwrap<T>(
	result: { data: T | null; error: PostgrestError | null },
	context: string,
	status = 500
): T {
	if (result.error) {
		console.error(`[finflow] ${context}:`, result.error.message);
		httpError(status, 'No pudimos cargar la información. Inténtalo de nuevo.');
	}
	if (result.data === null || result.data === undefined) {
		httpError(status, 'No pudimos cargar la información. Inténtalo de nuevo.');
	}
	return result.data;
}

export function assertMutation(
	result: { error: PostgrestError | null },
	context: string,
	fallback: string
): void {
	if (result.error) {
		console.error(`[finflow] ${context}:`, result.error.message);
		httpError(500, fallback);
	}
}

export function requireAuth<T>(value: T | null | undefined, message = 'Sesión no válida'): T {
	if (value === null || value === undefined) httpError(401, message);
	return value;
}

export interface TransactionFilters {
	from?: string;
	to?: string;
	type?: TransactionType;
	categoryId?: string;
	accountId?: string;
	search?: string;
	limit?: number;
	offset?: number;
}

/** Escapa caracteres con significado en la sintaxis de filtros de PostgREST. */
export function sanitizeSearchTerm(term: string): string {
	return term
		.trim()
		.replace(/[\\%_]/g, (match) => `\\${match}`)
		.replace(/[,()*]/g, ' ')
		.slice(0, 60);
}

export function emptyAnalytics(): Analytics {
	return {
		total: 0,
		previousTotal: 0,
		incomeTotal: 0,
		deltaPercent: 0,
		categories: [],
		budgets: [],
		series: [],
		topIncrease: null,
		topDecrease: null,
		topCategory: null
	};
}

export type MonthTotals = { income: number; expense: number };
export type GoalSummary = { active: number; saved: number; target: number; percent: number };
export type DebtSummary = {
	count: number;
	remaining: number;
	monthlyCommitment: number;
	paid: number;
	original: number;
	percent: number;
};

export interface DashboardSummary {
	totals: MonthTotals;
	goals: GoalSummary;
	debts: DebtSummary;
}

export function summarizeGoals(goals: Goal[]): GoalSummary {
	const active = goals.filter((goal) => goal.status === 'active');
	const saved = active.reduce((total, goal) => total + goal.savedAmount, 0);
	const target = active.reduce((total, goal) => total + goal.targetAmount, 0);
	return {
		active: active.length,
		saved,
		target,
		percent: target > 0 ? (saved / target) * 100 : 0
	};
}

export function summarizeDebts(debts: Debt[]): DebtSummary {
	const active = debts.filter((debt) => debt.isActive);
	const remaining = active.reduce((total, debt) => total + debt.remainingAmount, 0);
	const paid = active.reduce((total, debt) => total + debt.paidAmount, 0);
	const original = active.reduce((total, debt) => total + debt.principalAmount, 0);
	return {
		count: active.length,
		remaining,
		monthlyCommitment: active.reduce((total, debt) => total + debt.monthlyEquivalent, 0),
		paid,
		original,
		percent: original > 0 ? (paid / original) * 100 : 0
	};
}
