import { fail, redirect } from '@sveltejs/kit';
import { getAccounts } from '#lib/server/queries';
import { mutationMessage } from '#lib/server/mutations';
import { requireAuth } from '#lib/server/results';
import { formValues, readString } from '#lib/utils/forms';
import { accountSchema, fieldErrors } from '#lib/utils/validation';
import type { Actions, PageServerLoad } from './$types';

const VALUES = ['name', 'kind', 'currency', 'openingBalance', 'icon', 'isPrimary'] as const;

export const load: PageServerLoad = async ({ locals }) => {
	const accounts = await getAccounts(locals.supabase);

	return {
		hasAccounts: accounts.length > 0,
		defaultCurrency: locals.profile?.currency ?? 'USD'
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireAuth(locals.user);
		const form = await request.formData();
		const values = formValues(form, VALUES);

		const parsed = accountSchema.safeParse({
			name: readString(form, 'name'),
			kind: readString(form, 'kind'),
			currency: readString(form, 'currency') || 'USD',
			openingBalance: readString(form, 'openingBalance') || '0',
			icon: readString(form, 'icon') || 'account_balance',
			isPrimary: readString(form, 'isPrimary')
		});

		if (!parsed.success) {
			return fail(400, {
				message: 'Revisa los datos de la cuenta.',
				errors: fieldErrors(parsed.error),
				values
			});
		}

		const existing = await getAccounts(locals.supabase);
		// La primera cuenta siempre es la principal: el índice único lo exige.
		const isPrimary = parsed.data.isPrimary || existing.length === 0;

		if (isPrimary) {
			const { error: demoteError } = await locals.supabase
				.from('accounts')
				.update({ is_primary: false })
				.eq('user_id', user.id)
				.eq('is_primary', true);

			if (demoteError) {
				return fail(400, {
					message: mutationMessage(demoteError.message, 'No pudimos preparar la cuenta principal.'),
					values
				});
			}
		}

		const { error } = await locals.supabase.from('accounts').insert({
			user_id: user.id,
			name: parsed.data.name,
			kind: parsed.data.kind,
			currency: parsed.data.currency,
			opening_balance: parsed.data.openingBalance,
			icon: parsed.data.icon,
			is_primary: isPrimary
		});

		if (error) {
			return fail(400, {
				message: mutationMessage(error.message, 'No pudimos crear la cuenta.'),
				values
			});
		}

		redirect(303, '/cuentas');
	}
};
