import { error, fail } from '@sveltejs/kit';
import {
	getAccounts,
	getCategories,
	getDebts,
	getGoals,
	getProfile,
	listTransactions
} from '#lib/server/queries';
import { mutationMessage } from '#lib/server/mutations';
import { requireAuth } from '#lib/server/results';
import { periodRange } from '#lib/utils/dates';
import { formValues, readString } from '#lib/utils/forms';
import { changePasswordSchema, fieldErrors, profileSchema } from '#lib/utils/validation';
import type { Actions, PageServerLoad } from './$types';

const PROFILE_VALUES = ['fullName', 'currency', 'monthlyBudget'] as const;

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireAuth(locals.user);
	const range = periodRange('month', new Date());
	const profile = locals.profile ?? (await getProfile(locals.supabase, user.id));

	if (!profile) {
		error(500, 'No pudimos cargar tu perfil. Vuelve a iniciar sesión.');
	}

	const [movements, accounts, categories, goals, debts] = await Promise.all([
		listTransactions(locals.supabase, { from: range.from, to: range.to, limit: 100 }),
		getAccounts(locals.supabase),
		getCategories(locals.supabase),
		getGoals(locals.supabase),
		getDebts(locals.supabase)
	]);

	return {
		email: user.email ?? '',
		profile,
		month: {
			from: range.from,
			label: new Date(`${range.from}T12:00:00`).toLocaleDateString('es-ES', {
				month: 'long',
				year: 'numeric'
			})
		},
		movements: movements.items,
		movementTotal: movements.total,
		counts: {
			accounts: accounts.filter((account) => !account.isArchived).length,
			categories: categories.length,
			goals: goals.filter((goal) => goal.status === 'active').length,
			debts: debts.filter((debt) => debt.isActive).length
		}
	};
};

export const actions: Actions = {
	profile: async ({ request, locals }) => {
		const user = requireAuth(locals.user);
		const form = await request.formData();
		const values = formValues(form, PROFILE_VALUES);

		const parsed = profileSchema.safeParse({
			fullName: readString(form, 'fullName'),
			currency: readString(form, 'currency') || 'USD',
			monthlyBudget: readString(form, 'monthlyBudget') || '0'
		});

		if (!parsed.success) {
			return fail(400, {
				intent: 'profile',
				message: 'Revisa tus datos de perfil.',
				errors: fieldErrors(parsed.error),
				values
			});
		}

		const { error } = await locals.supabase
			.from('profiles')
			.update({
				full_name: parsed.data.fullName,
				currency: parsed.data.currency,
				monthly_budget: parsed.data.monthlyBudget
			})
			.eq('id', user.id);

		if (error) {
			return fail(400, {
				intent: 'profile',
				message: mutationMessage(error.message, 'No pudimos guardar tu perfil.'),
				values
			});
		}

		return { ok: true };
	},

	password: async ({ request, locals }) => {
		requireAuth(locals.user);
		const form = await request.formData();

		const parsed = changePasswordSchema.safeParse({
			password: readString(form, 'password'),
			passwordConfirm: readString(form, 'passwordConfirm')
		});

		if (!parsed.success) {
			return fail(400, {
				intent: 'password',
				message: 'Revisa la contraseña.',
				errors: fieldErrors(parsed.error)
			});
		}

		const { error } = await locals.supabase.auth.updateUser({ password: parsed.data.password });

		if (error) {
			return fail(400, {
				intent: 'password',
				message: mutationMessage(error.message, 'No pudimos actualizar la contraseña.')
			});
		}

		return { ok: true };
	}
};
