import { getAccounts, getCategories, getMonthTotals, listTransactions } from '#lib/server/queries';
import {
	addMonths,
	formatMonthName,
	localRangeInstants,
	monthKey,
	monthRange,
	parseISODate,
	referenceAtOffset
} from '#lib/utils/dates';
import { parseUuid } from '#lib/utils/uuid';
import type { TransactionType } from '#lib/types/domain';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 25;

function parseType(value: string | null): TransactionType | undefined {
	return value === 'income' || value === 'expense' || value === 'transfer' ? value : undefined;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const reference = referenceAtOffset(locals.tzOffset);
	const rawMonth = url.searchParams.get('mes');
	const month =
		rawMonth === 'todos'
			? null
			: rawMonth && /^\d{4}-\d{2}$/.test(rawMonth)
				? rawMonth
				: monthKey(reference);

	const range = month ? monthRange(month) : null;
	const bounds = range ? localRangeInstants(range, locals.tzOffset) : null;

	const type = parseType(url.searchParams.get('tipo'));
	const accountId = parseUuid(url.searchParams.get('cuenta'));
	const categoryId = parseUuid(url.searchParams.get('categoria'));
	const search = url.searchParams.get('q')?.trim() || undefined;
	const requestedLimit = Number(url.searchParams.get('limit') ?? PAGE_SIZE);
	const limit = Math.min(
		Math.max(Number.isFinite(requestedLimit) ? requestedLimit : PAGE_SIZE, PAGE_SIZE),
		150
	);

	const [page, accounts, categories, totals] = await Promise.all([
		listTransactions(locals.supabase, {
			fromInstant: bounds?.fromInstant,
			toInstant: bounds?.toInstant,
			type,
			accountId,
			categoryId,
			search,
			limit
		}),
		getAccounts(locals.supabase),
		getCategories(locals.supabase),
		bounds
			? getMonthTotals(locals.supabase, bounds.fromInstant, bounds.toInstant)
			: Promise.resolve({ income: 0, expense: 0 })
	]);

	const baseDate = range ? parseISODate(range.from) : reference;

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
