import { buildAlerts, nextDebtDue } from '#lib/server/alerts';
import { signedUrl } from '#lib/server/mutations';
import { getDebts, getGoals, getMonthTotals } from '#lib/server/queries';
import { summarizeDebts, summarizeGoals } from '#lib/server/results';
import { loadShell } from '#lib/server/shell';
import { periodRange } from '#lib/utils/dates';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const shell = await loadShell(locals);
	const now = new Date();
	const month = periodRange('month', now);

	const [totals, goals, debts] = await Promise.all([
		getMonthTotals(locals.supabase, month.from, month.to),
		getGoals(locals.supabase),
		getDebts(locals.supabase)
	]);

	const alerts = buildAlerts({
		debts,
		goals,
		monthlyExpense: totals.expense,
		monthlyBudget: shell.profile.monthlyBudget,
		currency: shell.profile.currency,
		reference: now
	});

	// La foto vive en un bucket privado: el cliente recibe una URL firmada.
	const profile = shell.profile.avatarPath
		? {
				...shell.profile,
				avatarUrl: await signedUrl(locals.supabase, 'avatars', shell.profile.avatarPath, 3600)
			}
		: shell.profile;

	return {
		...shell,
		profile,
		monthLabel: month.label,
		totals,
		alerts,
		summaries: { goals: summarizeGoals(goals), debts: summarizeDebts(debts) },
		nextDue: nextDebtDue(debts, now)
	};
};
