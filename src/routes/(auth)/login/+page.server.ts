import { fail, redirect } from '@sveltejs/kit';
import { safeRedirect, translateAuthError } from '#lib/server/auth-errors';
import { checkRateLimit } from '#lib/server/rate-limit';
import { formValues, readString } from '#lib/utils/forms';
import { fieldErrors, loginSchema } from '#lib/utils/validation';
import type { Actions } from './$types';

const FIELDS = ['email'] as const;

export const actions: Actions = {
	default: async ({ request, locals, url, getClientAddress, setHeaders }) => {
		const form = await request.formData();
		const values = formValues(form, FIELDS);

		let address = 'unknown';
		try {
			address = getClientAddress();
		} catch {
			// Sin dirección disponible: se limita por clave global.
		}

		const rate = checkRateLimit(`login:${address}`, 30, 5 * 60_000);
		if (!rate.allowed) {
			setHeaders({ 'retry-after': String(rate.retryAfter) });
			return fail(429, {
				message: 'Demasiados intentos. Espera unos minutos antes de reintentar.',
				values
			});
		}

		const parsed = loginSchema.safeParse({
			email: readString(form, 'email'),
			password: readString(form, 'password')
		});

		if (!parsed.success) {
			return fail(400, {
				message: 'Revisa los datos ingresados.',
				errors: fieldErrors(parsed.error),
				values
			});
		}

		const { error } = await locals.supabase.auth.signInWithPassword(parsed.data);

		if (error) {
			return fail(400, { message: translateAuthError(error.message), values });
		}

		redirect(303, safeRedirect(url.searchParams.get('redirectTo')));
	}
};
