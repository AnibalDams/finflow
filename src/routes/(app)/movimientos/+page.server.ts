import { getAccounts, getCategories, getMonthTotals, listTransactions } from '#lib/server/queries';
import {
	addMonths,
	monthKey,
	monthRange,
	parseISODate,
	formatMonthName
} from '#lib/utils/dates';
import type { TransactionType } from '#lib/types/domain';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 25;

function parseType(value: string | null): TransactionType | undefined {
	return value === 'income' || value === 'expense' || value === 'transfer' ? value : undefined;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const now = new Date();
	const rawMonth = url.searchParams.get('mes');
	const month =
		rawMonth === 'todos'
			? null
			: rawMonth && /^\d{4}-\d{2}$/.test(rawMonth)
				? rawMonth
				: monthKey(now);

	const range = month ? monthRange(month) : null;

	const type = parseType(url.searchParams.get('tipo'));
	const accountId = url.searchParams.get('cuenta') || undefined;
	const categoryId = url.searchParams.get('categoria') || undefined;
	const search = url.searchParams.get('q')?.trim() || undefined;
	const requestedLimit = Number(url.searchParams.get('limit') ?? PAGE_SIZE);
	const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : PAGE_SIZE, PAGE_SIZE), 150);

	const [page, accounts, categories, totals] = await Promise.all([
		listTransactions(locals.supabase, {
			from: range?.from,
			to: range?.to,
			type,
			accountId,
			categoryId,
			search,
			limit
		}),
		getAccounts(locals.supabase),
		getCategories(locals.supabase),
		range ? getMonthTotals(locals.supabase, range.from, range.to) : Promise.resolve({ income: 0, expense: 0 })
	]);

	const baseDate = range ? parseISODate(range.from) : now;

	return {
		items: page.items,
		total: page.total,
		accounts,
		categories,
		totals,
		limit,
		month,
		rangeLabel: range ? formatMonthName(range.from, true) : 'Todo el historial',
		previousMonth: monthKey(addMonths(baseDate, -1)),
		nextMonth: monthKey(addMonths(baseDate, 1)),
		filters: {
			type: type ?? 'all',
			accountId: accountId ?? '',
			categoryId: categoryId ?? '',
			search: search ?? ''
		},
		hasFilters: Boolean(type || accountId || categoryId || search)
	};
};
