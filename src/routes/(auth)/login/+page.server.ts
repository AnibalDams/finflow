import { fail, redirect } from '@sveltejs/kit';
import { safeRedirect, translateAuthError } from '#lib/server/auth-errors';
import { checkRateLimit, peekRateLimit, resetRateLimit } from '#lib/server/rate-limit';
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

		// Segunda barrera por cuenta: el límite de IP no frena un ataque
		// distribuido contra un correo concreto. Solo cuentan los fallos.
		const accountKey = `login-account:${parsed.data.email}`;
		const account = peekRateLimit(accountKey, 10);
		if (!account.allowed) {
			setHeaders({ 'retry-after': String(account.retryAfter) });
			return fail(429, {
				message: 'Demasiados intentos para esta cuenta. Espera unos minutos antes de reintentar.',
				values
			});
		}

		const { error } = await locals.supabase.auth.signInWithPassword(parsed.data);

		if (error) {
			checkRateLimit(accountKey, 10, 15 * 60_000);
			return fail(400, { message: translateAuthError(error.message), values });
		}

		resetRateLimit(accountKey);
		redirect(303, safeRedirect(url.searchParams.get('redirectTo')));
	}
};
