import { fail, redirect } from '@sveltejs/kit';
import { translateAuthError } from '#lib/server/auth-errors';
import { readString } from '#lib/utils/forms';
import { fieldErrors, resetSchema } from '#lib/utils/validation';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	return { hasRecoverySession: Boolean(user) };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();

		const parsed = resetSchema.safeParse({
			password: readString(form, 'password'),
			passwordConfirm: readString(form, 'passwordConfirm')
		});

		if (!parsed.success) {
			return fail(400, { message: 'Revisa los datos ingresados.', errors: fieldErrors(parsed.error) });
		}

		const { error } = await locals.supabase.auth.updateUser({ password: parsed.data.password });

		if (error) {
			return fail(400, { message: translateAuthError(error.message) });
		}

		redirect(303, '/');
	}
};
