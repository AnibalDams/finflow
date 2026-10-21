import { fail, redirect } from '@sveltejs/kit';
import { getAccounts, getCategories, getTags } from '#lib/server/queries';
import {
	mutationMessage,
	removeFile,
	syncTransactionTags,
	uploadReceipt,
	validateReceipt
} from '#lib/server/mutations';
import { requireAuth } from '#lib/server/results';
import { dateAtOffset, resolveLocalInstant, timeAtOffset } from '#lib/utils/dates';
import { formValues, readFile, readString } from '#lib/utils/forms';
import { fieldErrors, transactionSchema, transferSchema } from '#lib/utils/validation';
import type { Actions, PageServerLoad } from './$types';

const VALUES = [
	'type',
	'amount',
	'accountId',
	'fromAccountId',
	'toAccountId',
	'categoryId',
	'concept',
	'occurredAt',
	'occurredTime',
	'notes',
	'tags'
] as const;

export const load: PageServerLoad = async ({ locals, url }) => {
	const [accounts, categories, tags] = await Promise.all([
		getAccounts(locals.supabase),
		getCategories(locals.supabase),
		getTags(locals.supabase)
	]);

	const requested = url.searchParams.get('tipo');
	const type: 'income' | 'expense' | 'transfer' =
		requested === 'income' || requested === 'transfer' ? requested : 'expense';

	return {
		accounts,
		categories,
		tagSuggestions: tags.map((tag) => tag.name),
		type,
		today: dateAtOffset(locals.tzOffset),
		nowTime: timeAtOffset(locals.tzOffset),
		receiptPrompt: url.searchParams.get('comprobante') === '1',
		currency: locals.profile?.currency ?? 'USD'
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireAuth(locals.user);
		const form = await request.formData();
		const type = readString(form, 'type');
		const values = formValues(form, VALUES);

		if (type === 'transfer') {
			const parsed = transferSchema.safeParse({
				fromAccountId: readString(form, 'fromAccountId'),
				toAccountId: readString(form, 'toAccountId'),
				amount: readString(form, 'amount'),
				concept: readString(form, 'concept'),
				occurredAt: resolveLocalInstant(
					readString(form, 'occurredAtISO'),
					readString(form, 'occurredAt'),
					readString(form, 'occurredTime'),
					locals.tzOffset
				)
			});

			if (!parsed.success) {
				return fail(400, {
					message: 'Revisa los datos de la transferencia.',
					errors: fieldErrors(parsed.error),
					values
				});
			}

			const { error } = await locals.supabase.rpc('register_transfer', {
				p_from_account: parsed.data.fromAccountId,
				p_to_account: parsed.data.toAccountId,
				p_amount: parsed.data.amount,
				p_concept: parsed.data.concept ?? 'Transferencia',
				p_occurred_at: parsed.data.occurredAt
			});

			if (error) {
				return fail(400, {
					message: mutationMessage(error.message, 'No pudimos registrar la transferencia.'),
					values
				});
			}

			redirect(303, '/movimientos');
		}

		const parsed = transactionSchema.safeParse({
			type,
			amount: readString(form, 'amount'),
			accountId: readString(form, 'accountId'),
			categoryId: readString(form, 'categoryId'),
			concept: readString(form, 'concept'),
			occurredAt: resolveLocalInstant(
				readString(form, 'occurredAtISO'),
				readString(form, 'occurredAt'),
				readString(form, 'occurredTime'),
				locals.tzOffset
			),
			notes: readString(form, 'notes'),
			tags: readString(form, 'tags')
		});

		if (!parsed.success) {
			return fail(400, {
				message: 'Revisa los datos del movimiento.',
				errors: fieldErrors(parsed.error),
				values
			});
		}

		const { data: account, error: accountError } = await locals.supabase
			.from('accounts')
			.select('id, currency')
			.eq('id', parsed.data.accountId)
			.maybeSingle();

		if (accountError || !account) {
			return fail(400, {
				message: 'La cuenta seleccionada no está disponible.',
				errors: { accountId: 'Selecciona una cuenta válida' },
				values
			});
		}

		const receipt = readFile(form, 'receipt');
		let attachment: { path: string; name: string } | null = null;

		if (receipt) {
			const problem = await validateReceipt(receipt);
			if (problem) {
				return fail(400, { message: problem, errors: { receipt: problem }, values });
			}

			try {
				attachment = await uploadReceipt(locals.supabase, user.id, receipt);
			} catch (error) {
				return fail(500, {
					message: error instanceof Error ? error.message : 'No pudimos subir el comprobante.',
					values
				});
			}
		}

		const { data: created, error } = await locals.supabase
			.from('transactions')
			.insert({
				user_id: user.id,
				type: parsed.data.type,
				amount: parsed.data.amount,
				currency: account.currency,
				account_id: parsed.data.accountId,
				category_id: parsed.data.categoryId || null,
				concept: parsed.data.concept,
				notes: parsed.data.notes,
				occurred_at: parsed.data.occurredAt,
				attachment_path: attachment?.path ?? null,
				attachment_name: attachment?.name ?? null
			})
			.select('id')
			.single();

		if (error || !created) {
			if (attachment) await removeFile(locals.supabase, 'receipts', attachment.path);
			return fail(400, {
				message: mutationMessage(error?.message ?? '', 'No pudimos guardar el movimiento.'),
				values
			});
		}

		await syncTransactionTags(locals.supabase, user.id, created.id, parsed.data.tags);
		redirect(303, '/movimientos');
	}
};
