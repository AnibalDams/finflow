import { fail } from '@sveltejs/kit';
import {
	getAccounts,
	getCategories,
	getDebts,
	getGoals,
	listTransactions
} from '#lib/server/queries';
import { mutationMessage, removeFile, uploadAvatar, validateImage } from '#lib/server/mutations';
import { isPasswordBreached } from '#lib/server/password-safety';
import { checkRateLimit } from '#lib/server/rate-limit';
import { requireAuth } from '#lib/server/results';
import { periodRange } from '#lib/utils/dates';
import { formValues, readFile, readString } from '#lib/utils/forms';
import { changePasswordSchema, fieldErrors, profileSchema } from '#lib/utils/validation';
import type { Actions, PageServerLoad } from './$types';

const PROFILE_VALUES = ['fullName', 'currency', 'monthlyBudget'] as const;

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireAuth(locals.user);
	const range = periodRange('month', new Date());

	const [movements, accounts, categories, goals, debts] = await Promise.all([
		listTransactions(locals.supabase, { from: range.from, to: range.to, limit: 100 }),
		getAccounts(locals.supabase),
		getCategories(locals.supabase),
		getGoals(locals.supabase),
		getDebts(locals.supabase)
	]);

	return {
		email: user.email ?? '',
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

	avatar: async ({ request, locals }) => {
		const user = requireAuth(locals.user);
		const form = await request.formData();
		const file = readFile(form, 'avatar');

		if (!file) {
			return fail(400, {
				intent: 'avatar',
				message: 'Selecciona una imagen para tu foto de perfil.'
			});
		}

		const problem = await validateImage(file);
		if (problem) {
			return fail(400, { intent: 'avatar', message: problem });
		}

		const { data: current } = await locals.supabase
			.from('profiles')
			.select('avatar_url')
			.eq('id', user.id)
			.maybeSingle();

		let uploaded: { path: string };

		try {
			uploaded = await uploadAvatar(locals.supabase, user.id, file);
		} catch (uploadError) {
			return fail(400, {
				intent: 'avatar',
				message:
					uploadError instanceof Error ? uploadError.message : 'No pudimos subir tu foto de perfil.'
			});
		}

		const { error } = await locals.supabase
			.from('profiles')
			.update({ avatar_url: uploaded.path })
			.eq('id', user.id);

		if (error) {
			await removeFile(locals.supabase, 'avatars', uploaded.path);
			return fail(400, {
				intent: 'avatar',
				message: mutationMessage(error.message, 'No pudimos guardar tu foto de perfil.')
			});
		}

		if (current?.avatar_url) {
			await removeFile(locals.supabase, 'avatars', current.avatar_url);
		}

		return { ok: true };
	},

	removeAvatar: async ({ locals }) => {
		const user = requireAuth(locals.user);

		const { data } = await locals.supabase
			.from('profiles')
			.select('avatar_url')
			.eq('id', user.id)
			.maybeSingle();

		const { error } = await locals.supabase
			.from('profiles')
			.update({ avatar_url: null })
			.eq('id', user.id);

		if (error) {
			return fail(400, {
				intent: 'avatar',
				message: 'No pudimos quitar tu foto de perfil.'
			});
		}

		if (data?.avatar_url) {
			await removeFile(locals.supabase, 'avatars', data.avatar_url);
		}

		return { ok: true };
	},

	password: async ({ request, locals, setHeaders }) => {
		const user = requireAuth(locals.user);
		const form = await request.formData();

		const rate = checkRateLimit(`password:${user.id}`, 10, 15 * 60_000);
		if (!rate.allowed) {
			setHeaders({ 'retry-after': String(rate.retryAfter) });
			return fail(429, {
				intent: 'password',
				message: 'Demasiados intentos. Espera unos minutos antes de reintentar.'
			});
		}

		const parsed = changePasswordSchema.safeParse({
			currentPassword: readString(form, 'currentPassword'),
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

		if (!user.email) {
			return fail(400, {
				intent: 'password',
				message: 'No pudimos verificar tu cuenta. Vuelve a iniciar sesión.'
			});
		}

		// Reautenticación: una sesión activa no basta para cambiar la contraseña.
		const { error: verifyError } = await locals.supabase.auth.signInWithPassword({
			email: user.email,
			password: parsed.data.currentPassword
		});

		if (verifyError) {
			return fail(400, {
				intent: 'password',
				message: 'La contraseña actual no es correcta.',
				errors: { currentPassword: 'Contraseña actual incorrecta' }
			});
		}

		if (await isPasswordBreached(parsed.data.password)) {
			return fail(400, {
				intent: 'password',
				message: 'Esa contraseña aparece en filtraciones públicas. Elige otra.',
				errors: { password: 'Elige una contraseña que no esté filtrada' }
			});
		}

		const { error } = await locals.supabase.auth.updateUser({ password: parsed.data.password });

		if (error) {
			return fail(400, {
				intent: 'password',
				message: mutationMessage(error.message, 'No pudimos actualizar la contraseña.')
			});
		}

		// Cierra las demás sesiones para que un token robado no sobreviva al cambio.
		const { error: signOutError } = await locals.supabase.auth.signOut({ scope: 'others' });
		if (signOutError) {
			console.error('[finflow] revoke other sessions:', signOutError.message);
		}

		return { ok: true };
	}
};
