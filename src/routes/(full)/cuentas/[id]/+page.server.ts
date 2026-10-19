import { error, fail, redirect } from '@sveltejs/kit';
import { getAccounts } from '#lib/server/queries';
import { mutationMessage } from '#lib/server/mutations';
import { requireAuth } from '#lib/server/results';
import { formValues, readString } from '#lib/utils/forms';
import { accountSchema, fieldErrors } from '#lib/utils/validation';
import type { Account } from '#lib/types/domain';
import type { Actions, PageServerLoad } from './$types';

const VALUES = ['name', 'kind', 'currency', 'openingBalance', 'icon', 'isPrimary'] as const;

async function loadAccount(locals: App.Locals, id: string): Promise<Account | null> {
	const accounts = await getAccounts(locals.supabase, { includeArchived: true });
	return accounts.find((account) => account.id === id) ?? null;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const account = await loadAccount(locals, params.id);

	if (!account) {
		error(404, 'No encontramos esa cuenta.');
	}

	const { count } = await locals.supabase
		.from('transactions')
		.select('id', { count: 'exact', head: true })
		.eq('account_id', account.id);

	return {
		account,
		transactionCount: count ?? 0
	};
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
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

		if (parsed.data.isPrimary) {
			const { error: demoteError } = await locals.supabase
				.from('accounts')
				.update({ is_primary: false })
				.eq('user_id', user.id)
				.eq('is_primary', true)
				.neq('id', params.id);

			if (demoteError) {
				return fail(400, {
					message: mutationMessage(demoteError.message, 'No pudimos preparar la cuenta principal.'),
					values
				});
			}
		}

		const { error: updateError } = await locals.supabase
			.from('accounts')
			.update({
				name: parsed.data.name,
				kind: parsed.data.kind,
				opening_balance: parsed.data.openingBalance,
				icon: parsed.data.icon,
				is_primary: parsed.data.isPrimary
			})
			.eq('id', params.id);

		if (updateError) {
			return fail(400, {
				message: mutationMessage(updateError.message, 'No pudimos actualizar la cuenta.'),
				values
			});
		}

		return { ok: true };
	},

	archive: async ({ request, locals, params }) => {
		requireAuth(locals.user);
		const form = await request.formData();
		const archived = readString(form, 'archived') === 'true';

		const { error: updateError } = await locals.supabase
			.from('accounts')
			.update({ is_archived: archived, ...(archived ? { is_primary: false } : {}) })
			.eq('id', params.id);

		if (updateError) {
			return fail(400, {
				message: mutationMessage(updateError.message, 'No pudimos cambiar el estado de la cuenta.')
			});
		}

		if (archived) redirect(303, '/cuentas');

		return { ok: true };
	},

	delete: async ({ locals, params }) => {
		requireAuth(locals.user);

		const { count } = await locals.supabase
			.from('transactions')
			.select('id', { count: 'exact', head: true })
			.eq('account_id', params.id);

		if ((count ?? 0) > 0) {
			return fail(400, {
				message:
					'Esta cuenta tiene movimientos asociados. Archívala para conservar tu historial.'
			});
		}

		const { error: deleteError } = await locals.supabase
			.from('accounts')
			.delete()
			.eq('id', params.id);

		if (deleteError) {
			return fail(400, {
				message: mutationMessage(deleteError.message, 'No pudimos eliminar la cuenta.')
			});
		}

		redirect(303, '/cuentas');
	}
};
