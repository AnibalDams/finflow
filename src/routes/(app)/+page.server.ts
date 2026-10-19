import { addMonths, periodRange } from '#lib/utils/dates';
import { getMonthTotals, listTransactions } from '#lib/server/queries';
import { unwrap } from '#lib/server/results';
import { daysLeftInMonth } from '#lib/utils/dates';
import { toNumber } from '#lib/utils/mappers';
import { sumAmounts } from '#lib/utils/money';
import { cumulativeMonthlySeries, type CashflowRow } from '#lib/utils/series';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, parent }) => {
	const { profile, accounts } = await parent();
	const now = new Date();
	const month = periodRange('month', now);
	const previous = periodRange('month', addMonths(now, -1));

	const requestedType = url.searchParams.get('tipo');
	const filter =
		requestedType === 'income' || requestedType === 'expense' || requestedType === 'transfer'
			? requestedType
			: undefined;

	const requestedAccount = url.searchParams.get('cuenta');
	const selected =
		requestedAccount === 'all'
			? null
			: (accounts.find((account) => account.id === requestedAccount) ??
				accounts.find((account) => account.isPrimary) ??
				accounts[0] ??
				null);

	const [monthRows, previousTotals, recent] = await Promise.all([
		locals.supabase
			.from('transactions')
			.select('amount, type, occurred_at, account_id, counter_account_id')
			.gte('occurred_at', `${month.from}T00:00:00.000Z`)
			.lte('occurred_at', `${month.to}T23:59:59.999Z`)
			.then((result) => unwrap(result, 'movimientos del mes')),
		getMonthTotals(locals.supabase, previous.from, previous.to),
		listTransactions(locals.supabase, { limit: 6, type: filter }).then((page) => page.items)
	]);

	const rows: CashflowRow[] = monthRows.map((row) => ({
		amount: toNumber(row.amount),
		type: row.type,
		occurred_at: row.occurred_at,
		account_id: row.account_id,
		counter_account_id: row.counter_account_id
	}));

	const income = sumAmounts(rows.filter((row) => row.type === 'income').map((row) => row.amount));
	const expense = sumAmounts(rows.filter((row) => row.type === 'expense').map((row) => row.amount));
	const net = income - expense;

	const previousNet = previousTotals.income - previousTotals.expense;
	const delta = previousNet !== 0 ? ((net - previousNet) / Math.abs(previousNet)) * 100 : null;

	const balance = selected
		? selected.balance
		: sumAmounts(accounts.map((account) => account.balance));
	const series = cumulativeMonthlySeries(rows, selected?.id ?? null, balance, now.getDate());

	const budget = profile.monthlyBudget;

	return {
		selectedAccountId: requestedAccount === 'all' ? 'all' : (selected?.id ?? 'all'),
		balance,
		currency: selected?.currency ?? profile.currency,
		filter: filter ?? 'all',
		monthLabel: month.label,
		monthStart: month.from,
		previousLabel: previous.label,
		income,
		expense,
		net,
		delta,
		series,
		recent,
		budget: {
			limit: budget,
			used: budget > 0 ? Math.min(100, (expense / budget) * 100) : 0,
			remaining: Math.max(0, budget - expense),
			daysLeft: daysLeftInMonth(now)
		}
	};
};
