import { fail } from '@sveltejs/kit';
import { translateAuthError } from '#lib/server/auth-errors';
import { formValues, readString } from '#lib/utils/forms';
import { fieldErrors, recoverySchema } from '#lib/utils/validation';
import type { Actions } from './$types';

const FIELDS = ['email'] as const;

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const form = await request.formData();
		const values = formValues(form, FIELDS);

		const parsed = recoverySchema.safeParse({ email: readString(form, 'email') });

		if (!parsed.success) {
			return fail(400, {
				message: 'Revisa el correo ingresado.',
				errors: fieldErrors(parsed.error),
				values
			});
		}

		const { error } = await locals.supabase.auth.resetPasswordForEmail(parsed.data.email, {
			redirectTo: `${url.origin}/auth/confirm?next=/restablecer`
		});

		if (error) {
			return fail(400, { message: translateAuthError(error.message), values });
		}

		// Respuesta uniforme: no se revela si el correo existe o no.
		return { success: true, sent: true, values };
	}
};
