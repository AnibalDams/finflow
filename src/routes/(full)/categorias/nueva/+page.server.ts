import { fail, redirect } from '@sveltejs/kit';
import { safeRedirect } from '#lib/server/auth-errors';
import { mutationMessage } from '#lib/server/mutations';
import { requireAuth } from '#lib/server/results';
import { formValues, readString } from '#lib/utils/forms';
import { categorySchema, fieldErrors } from '#lib/utils/validation';
import type { Actions, PageServerLoad } from './$types';

const VALUES = ['name', 'kind', 'icon', 'color'] as const;
const BACK = '/cuentas?tab=categorias';

export const load: PageServerLoad = async ({ url }) => {
	const kind: 'expense' | 'income' =
		url.searchParams.get('kind') === 'income' ? 'income' : 'expense';

	return {
		kind,
		volver: safeRedirect(url.searchParams.get('volver'), BACK)
	};
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const user = requireAuth(locals.user);
		const form = await request.formData();
		const values = formValues(form, VALUES);

		const parsed = categorySchema.safeParse({
			name: readString(form, 'name'),
			kind: readString(form, 'kind'),
			icon: readString(form, 'icon'),
			color: readString(form, 'color')
		});

		if (!parsed.success) {
			return fail(400, {
				message: 'Revisa los datos de la categoría.',
				errors: fieldErrors(parsed.error),
				values
			});
		}

		const { error } = await locals.supabase.from('categories').insert({
			user_id: user.id,
			name: parsed.data.name,
			kind: parsed.data.kind,
			icon: parsed.data.icon,
			color: parsed.data.color
		});

		if (error) {
			return fail(400, {
				message: mutationMessage(error.message, 'No pudimos crear la categoría.'),
				values
			});
		}

		redirect(303, safeRedirect(readString(form, 'volver') || url.searchParams.get('volver'), BACK));
	}
};
