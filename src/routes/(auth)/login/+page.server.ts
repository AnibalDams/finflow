import { fail, redirect } from '@sveltejs/kit';
import { safeRedirect, translateAuthError } from '#lib/server/auth-errors';
import { formValues, readString } from '#lib/utils/forms';
import { fieldErrors, loginSchema } from '#lib/utils/validation';
import type { Actions } from './$types';

const FIELDS = ['email'] as const;

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const form = await request.formData();
		const values = formValues(form, FIELDS);

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
