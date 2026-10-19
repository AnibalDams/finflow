import { fail, redirect } from '@sveltejs/kit';
import { translateAuthError } from '#lib/server/auth-errors';
import { formValues, readString } from '#lib/utils/forms';
import { fieldErrors, registerSchema } from '#lib/utils/validation';
import type { Actions, PageServerLoad } from './$types';

const FIELDS = ['fullName', 'email', 'currency'] as const;

export const load: PageServerLoad = async () => {
	return { defaultCurrency: 'USD' };
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const form = await request.formData();
		const values = formValues(form, FIELDS);

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

		const { data, error } = await locals.supabase.auth.signUp({
			email,
			password,
			options: {
				data: { full_name: fullName, currency },
				emailRedirectTo: `${url.origin}/auth/confirm?next=/`
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
