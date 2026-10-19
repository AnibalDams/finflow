import { fail } from '@sveltejs/kit';
import { getAccounts, getAnalytics, getBudgets, getCategories } from '#lib/server/queries';
import { mutationMessage } from '#lib/server/mutations';
import { requireAuth } from '#lib/server/results';
import { periodRange } from '#lib/utils/dates';
import { readString } from '#lib/utils/forms';
import { sumAmounts } from '#lib/utils/money';
import { budgetSchema, fieldErrors, type FieldErrors } from '#lib/utils/validation';
import type { Actions, PageServerLoad } from './$types';

type Tab = 'cuentas' | 'categorias' | 'presupuestos';

function parseTab(value: string | null): Tab {
	if (value === 'categorias' || value === 'presupuestos') return value;
	return 'cuentas';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const tab = parseTab(url.searchParams.get('tab'));
	const range = periodRange('month', new Date());

	const [accounts, categories, budgets, analytics] = await Promise.all([
		getAccounts(locals.supabase, { includeArchived: true }),
		getCategories(locals.supabase),
		getBudgets(locals.supabase, range.from),
		getAnalytics(locals.supabase, range)
	]);

	const spentByCategory = new Map(analytics.categories.map((item) => [item.id, item.amount]));
	const budgetByCategory = new Map(budgets.map((item) => [item.categoryId, item.amount]));

	const expenseCategories = categories
		.filter((category) => category.kind === 'expense')
		.map((category) => ({
			...category,
			budget: budgetByCategory.get(category.id) ?? 0,
			spent: spentByCategory.get(category.id) ?? 0
		}));

	return {
		tab,
		accounts,
		categories,
		expenseCategories,
		month: { ...range, label: new Date(`${range.from}T12:00:00`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) },
		totalBalance: sumAmounts(
			accounts.filter((account) => !account.isArchived).map((account) => account.balance)
		),
		monthlyBudget: locals.profile?.monthlyBudget ?? 0,
		currency: locals.profile?.currency ?? 'USD'
	};
};

export const actions: Actions = {
	saveBudgets: async ({ request, locals }) => {
		requireAuth(locals.user);
		const form = await request.formData();
		const user = requireAuth(locals.user);
		const range = periodRange('month', new Date());
		const categories = await getCategories(locals.supabase);
		const expenses = categories.filter((category) => category.kind === 'expense');
		const errors: FieldErrors = {};

		const entries: Array<{ categoryId: string; amount: number }> = [];

		for (const category of expenses) {
			const raw = readString(form, `budget-${category.id}`).trim();
			if (raw === '') continue;

			const parsed = budgetSchema.safeParse({
				categoryId: category.id,
				amount: raw,
				periodMonth: range.from
			});

			if (!parsed.success) {
				errors[`budget-${category.id}`] = parsed.error.issues[0]?.message ?? 'Monto inválido';
				continue;
			}

			entries.push({ categoryId: category.id, amount: parsed.data.amount });
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				message: 'Revisa los límites ingresados.',
				errors,
				values: Object.fromEntries(
					expenses.map((category) => [
						`budget-${category.id}`,
						readString(form, `budget-${category.id}`)
					])
				)
			});
		}

		for (const category of expenses) {
			const entry = entries.find((item) => item.categoryId === category.id);

			if (!entry || entry.amount === 0) {
				const { error } = await locals.supabase
					.from('budgets')
					.delete()
					.eq('category_id', category.id)
					.eq('period_month', range.from);

				if (error) {
					return fail(400, {
						message: mutationMessage(error.message, 'No pudimos guardar los presupuestos.')
					});
				}
				continue;
			}

			const { error } = await locals.supabase.from('budgets').upsert(
				{
					user_id: user.id,
					category_id: category.id,
					period_month: range.from,
					amount: entry.amount
				},
				{ onConflict: 'user_id,category_id,period_month' }
			);

			if (error) {
				return fail(400, {
					message: mutationMessage(error.message, 'No pudimos guardar los presupuestos.')
				});
			}
		}

		return { ok: true };
	}
};
