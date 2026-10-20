import { fail, redirect } from '@sveltejs/kit';
import { SITE_URL } from '$app/env/private';
import { translateAuthError } from '#lib/server/auth-errors';
import { isPasswordBreached } from '#lib/server/password-safety';
import { checkRateLimit } from '#lib/server/rate-limit';
import { formValues, readString } from '#lib/utils/forms';
import { fieldErrors, registerSchema } from '#lib/utils/validation';
import type { Actions, PageServerLoad } from './$types';

const FIELDS = ['fullName', 'email', 'currency'] as const;

export const load: PageServerLoad = async () => {
	return { defaultCurrency: 'USD' };
};

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

		const rate = checkRateLimit(`register:${address}`, 10, 60 * 60_000);
		if (!rate.allowed) {
			setHeaders({ 'retry-after': String(rate.retryAfter) });
			return fail(429, {
				message: 'Demasiados intentos de registro. Espera antes de reintentar.',
				values
			});
		}

		const parsed = registerSchema.safeParse({
			fullName: readString(form, 'fullName'),
			email: readString(form, 'email'),
			password: readString(form, 'password'),
			passwordConfirm: readString(form, 'passwordConfirm'),
			currency: readString(form, 'currency') || 'USD'
		});

		if (!parsed.success) {
			return fail(400, {
				message: 'Revisa los datos ingresados.',
				errors: fieldErrors(parsed.error),
				values
			});
		}

		const { fullName, email, password, currency } = parsed.data;

		if (await isPasswordBreached(password)) {
			return fail(400, {
				message: 'Esa contraseña aparece en filtraciones públicas. Elige otra.',
				errors: { password: 'Elige una contraseña que no esté filtrada' },
				values
			});
		}

		const origin = SITE_URL || url.origin;
		const { data, error } = await locals.supabase.auth.signUp({
			email,
			password,
			options: {
				data: { full_name: fullName, currency },
				emailRedirectTo: `${origin}/auth/confirm?next=/`
			}
		});

		if (error) {
			return fail(400, { message: translateAuthError(error.message), values });
		}

		// Con la confirmación por correo activada no hay sesión todavía.
		if (!data.session) {
			return { success: true, needsConfirmation: true, values };
		}

		redirect(303, '/');
	}
};
