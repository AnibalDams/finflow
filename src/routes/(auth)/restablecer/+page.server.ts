import { fail, redirect } from '@sveltejs/kit';
import { translateAuthError } from '#lib/server/auth-errors';
import { isPasswordBreached } from '#lib/server/password-safety';
import { checkRateLimit } from '#lib/server/rate-limit';
import { readString } from '#lib/utils/forms';
import { fieldErrors, resetSchema } from '#lib/utils/validation';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	return { hasRecoverySession: Boolean(user) };
};

export const actions: Actions = {
	default: async ({ request, locals, getClientAddress, setHeaders }) => {
		const form = await request.formData();

		let address = 'unknown';
		try {
			address = getClientAddress();
		} catch {
			// Sin dirección disponible: se limita por clave global.
		}

		const rate = checkRateLimit(`reset:${address}`, 10, 15 * 60_000);
		if (!rate.allowed) {
			setHeaders({ 'retry-after': String(rate.retryAfter) });
			return fail(429, {
				message: 'Demasiados intentos. Espera unos minutos antes de reintentar.'
			});
		}

		const parsed = resetSchema.safeParse({
			password: readString(form, 'password'),
			passwordConfirm: readString(form, 'passwordConfirm')
		});

		if (!parsed.success) {
			return fail(400, {
				message: 'Revisa los datos ingresados.',
				errors: fieldErrors(parsed.error)
			});
		}

		if (await isPasswordBreached(parsed.data.password)) {
			return fail(400, {
				message: 'Esa contraseña aparece en filtraciones públicas. Elige otra.',
				errors: { password: 'Elige una contraseña que no esté filtrada' }
			});
		}

		const { error } = await locals.supabase.auth.updateUser({ password: parsed.data.password });

		if (error) {
			return fail(400, { message: translateAuthError(error.message) });
		}

		redirect(303, '/');
	}
};
