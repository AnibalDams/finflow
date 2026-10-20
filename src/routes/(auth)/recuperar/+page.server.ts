import { fail } from '@sveltejs/kit';
import { SITE_URL } from '$app/env/private';
import { translateAuthError } from '#lib/server/auth-errors';
import { checkRateLimit } from '#lib/server/rate-limit';
import { formValues, readString } from '#lib/utils/forms';
import { fieldErrors, recoverySchema } from '#lib/utils/validation';
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

		const rate = checkRateLimit(`recovery:${address}`, 10, 15 * 60_000);
		if (!rate.allowed) {
			setHeaders({ 'retry-after': String(rate.retryAfter) });
			return fail(429, {
				message: 'Demasiadas solicitudes. Espera unos minutos antes de reintentar.',
				values
			});
		}

		const parsed = recoverySchema.safeParse({ email: readString(form, 'email') });

		if (!parsed.success) {
			return fail(400, {
				message: 'Revisa el correo ingresado.',
				errors: fieldErrors(parsed.error),
				values
			});
		}

		const origin = SITE_URL || url.origin;
		const { error } = await locals.supabase.auth.resetPasswordForEmail(parsed.data.email, {
			redirectTo: `${origin}/auth/confirm?next=/restablecer`
		});

		if (error) {
			return fail(400, { message: translateAuthError(error.message), values });
		}

		// Respuesta uniforme: no se revela si el correo existe o no.
		return { success: true, sent: true, values };
	}
};
