import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.types';
import type {
	Account,
	Analytics,
	BudgetItem,
	Category,
	Debt,
	DebtPayment,
	Goal,
	GoalContribution,
	Profile,
	Tag,
	TransactionItem
} from '#lib/types/domain';
import {
	mapAccount,
	mapAnalytics,
	mapBudget,
	mapCategory,
	mapDebt,
	mapDebtPayment,
	mapGoal,
	mapGoalContribution,
	mapProfile,
	mapTag,
	mapTransaction,
	toNumber
} from '#lib/utils/mappers';
import { sumAmounts } from '#lib/utils/money';
import type { PeriodRange } from '#lib/utils/dates';
import {
	emptyAnalytics,
	sanitizeSearchTerm,
	summarizeDebts,
	summarizeGoals,
	unwrap,
	type DashboardSummary,
	type MonthTotals,
	type TransactionFilters
} from './results';

export type Db = SupabaseClient<Database>;

/* ==========================================================================
   Lecturas
   ========================================================================== */

export async function getProfile(db: Db, userId: string): Promise<Profile | null> {
	const result = await db.from('profiles').select('*').eq('id', userId).maybeSingle();
	if (result.error) return null;
	return result.data ? mapProfile(result.data) : null;
}

export async function getAccounts(
	db: Db,
	options: { includeArchived?: boolean } = {}
): Promise<Account[]> {
	let query = db.from('account_balances').select('*');
	if (!options.includeArchived) query = query.eq('is_archived', false);
	const data = unwrap(
		await query.order('is_primary', { ascending: false }).order('created_at', { ascending: true }),
		'accounts'
	);
	return data.map(mapAccount);
}

export async function getCategories(
	db: Db,
	options: { includeArchived?: boolean } = {}
): Promise<Category[]> {
	let query = db.from('categories').select('*');
	if (!options.includeArchived) query = query.eq('is_archived', false);
	const data = unwrap(
		await query.order('kind', { ascending: true }).order('sort_order', { ascending: true }),
		'categories'
	);
	return data.map(mapCategory);
}

export async function getTags(db: Db): Promise<Tag[]> {
	const data = unwrap(await db.from('tags').select('*').order('name'), 'tags');
	return data.map(mapTag);
}

export async function listTransactions(
	db: Db,
	filters: TransactionFilters = {}
): Promise<{ items: TransactionItem[]; total: number }> {
	const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
	const offset = Math.max(filters.offset ?? 0, 0);

	let query = db.from('transactions_detailed').select('*', { count: 'exact' });

	if (filters.from) query = query.gte('occurred_at', `${filters.from}T00:00:00.000Z`);
	if (filters.to) query = query.lte('occurred_at', `${filters.to}T23:59:59.999Z`);
	if (filters.type) query = query.eq('type', filters.type);
	if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
	if (filters.accountId) {
		query = query.or(
			`account_id.eq.${filters.accountId},counter_account_id.eq.${filters.accountId}`
		);
	}
	if (filters.search) {
		const term = sanitizeSearchTerm(filters.search);
		if (term) query = query.or(`concept.ilike.%${term}%,notes.ilike.%${term}%`);
	}

	const result = await query.order('occurred_at', { ascending: false }).range(offset, offset + limit - 1);

	if (result.error) {
		console.error('[finflow] transactions:', result.error.message);
		return { items: [], total: 0 };
	}

	return {
		items: (result.data ?? []).map(mapTransaction),
		total: result.count ?? 0
	};
}

export async function getRecentTransactions(db: Db, limit = 6): Promise<TransactionItem[]> {
	const { items } = await listTransactions(db, { limit });
	return items;
}

export async function getTransaction(db: Db, id: string): Promise<TransactionItem | null> {
	const result = await db.from('transactions_detailed').select('*').eq('id', id).maybeSingle();
	if (result.error || !result.data) return null;
	return mapTransaction(result.data);
}

export async function getGoals(db: Db): Promise<Goal[]> {
	const data = unwrap(
		await db.from('goal_progress').select('*').order('target_date', { ascending: true, nullsFirst: false }),
		'goals'
	);
	return data.map(mapGoal);
}

export async function getGoal(
	db: Db,
	id: string
): Promise<{ goal: Goal; contributions: GoalContribution[] } | null> {
	const goalResult = await db.from('goal_progress').select('*').eq('id', id).maybeSingle();
	if (goalResult.error || !goalResult.data) return null;

	const contributions = unwrap(
		await db
			.from('goal_contributions')
			.select('*')
			.eq('goal_id', id)
			.order('occurred_at', { ascending: false })
			.limit(60),
		'goal contributions'
	);

	return { goal: mapGoal(goalResult.data), contributions: contributions.map(mapGoalContribution) };
}

export async function getDebts(db: Db): Promise<Debt[]> {
	const data = unwrap(
		await db.from('debt_progress').select('*').order('is_active', { ascending: false }).order('next_due_date'),
		'debts'
	);
	return data.map(mapDebt);
}

export async function getDebt(
	db: Db,
	id: string
): Promise<{ debt: Debt; payments: DebtPayment[] } | null> {
	const debtResult = await db.from('debt_progress').select('*').eq('id', id).maybeSingle();
	if (debtResult.error || !debtResult.data) return null;

	const payments = unwrap(
		await db
			.from('debt_payments')
			.select('*')
			.eq('debt_id', id)
			.order('occurred_at', { ascending: false })
			.limit(60),
		'debt payments'
	);

	return { debt: mapDebt(debtResult.data), payments: payments.map(mapDebtPayment) };
}

export async function getBudgets(db: Db, periodMonth: string): Promise<BudgetItem[]> {
	const data = unwrap(
		await db
			.from('budgets')
			.select('*, category:categories(id, name, icon, color)')
			.eq('period_month', periodMonth)
			.order('amount', { ascending: false }),
		'budgets'
	);
	return data.map(mapBudget);
}

export async function getAnalytics(db: Db, range: PeriodRange): Promise<Analytics> {
	const result = await db.rpc('get_analytics', {
		p_from: range.from,
		p_to: range.to,
		p_prev_from: range.prevFrom,
		p_prev_to: range.prevTo
	});

	if (result.error) {
		console.error('[finflow] analytics:', result.error.message);
		return emptyAnalytics();
	}

	return mapAnalytics(result.data);
}

export async function getMonthTotals(db: Db, from: string, to: string): Promise<MonthTotals> {
	const data = unwrap(
		await db
			.from('transactions')
			.select('amount, type')
			.gte('occurred_at', `${from}T00:00:00.000Z`)
			.lte('occurred_at', `${to}T23:59:59.999Z`),
		'month totals'
	);

	const income = sumAmounts(
		data.filter((row) => row.type === 'income').map((row) => toNumber(row.amount))
	);
	const expense = sumAmounts(
		data.filter((row) => row.type === 'expense').map((row) => toNumber(row.amount))
	);

	return { income, expense };
}

export async function getDashboardSummary(
	db: Db,
	range: { from: string; to: string }
): Promise<DashboardSummary> {
	const [totals, goals, debts] = await Promise.all([
		getMonthTotals(db, range.from, range.to),
		getGoals(db),
		getDebts(db)
	]);

	return { totals, goals: summarizeGoals(goals), debts: summarizeDebts(debts) };
}

/* ==========================================================================
   Escrituras auxiliares
   ========================================================================== */

export function receiptPath(userId: string, transactionId: string, fileName: string): string {
	const extension = fileName.includes('.') ? fileName.split('.').pop() ?? 'bin' : 'bin';
	const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
	return `${userId}/${transactionId}/${crypto.randomUUID()}.${safeExtension}`;
}

export function goalImagePath(userId: string, goalId: string, fileName: string): string {
	const extension = fileName.includes('.') ? fileName.split('.').pop() ?? 'bin' : 'bin';
	const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
	return `${userId}/${goalId}/${crypto.randomUUID()}.${safeExtension}`;
}

export const ALLOWED_RECEIPT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
