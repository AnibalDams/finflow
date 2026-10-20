import { error, fail, redirect } from '@sveltejs/kit';
import { getAccounts, getCategories, getTransaction } from '#lib/server/queries';
import {
	mutationMessage,
	removeFile,
	replaceTransactionTags,
	signedUrl,
	uploadReceipt,
	validateReceipt
} from '#lib/server/mutations';
import { requireAuth } from '#lib/server/results';
import { toISODate } from '#lib/utils/dates';
import { formValues, readFile, readString } from '#lib/utils/forms';
import { fieldErrors, transactionSchema } from '#lib/utils/validation';
import type { Actions, PageServerLoad } from './$types';

const VALUES = [
	'amount',
	'accountId',
	'categoryId',
	'concept',
	'occurredAt',
	'occurredTime',
	'notes',
	'tags'
] as const;

function occurredAtISO(rawDate: string, rawTime: string): string {
	const date = rawDate.trim();
	const time = rawTime.trim() || '12:00';

	if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return '';

	const parsed = new Date(`${date}T${time}:00`);
	return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function pad(value: number): string {
	return String(value).padStart(2, '0');
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const transaction = await getTransaction(locals.supabase, params.id);

	if (!transaction) {
		error(404, 'No encontramos ese movimiento.');
	}

	const [accounts, categories, receiptUrl] = await Promise.all([
		getAccounts(locals.supabase),
		getCategories(locals.supabase),
		transaction.attachmentPath
			? signedUrl(locals.supabase, 'receipts', transaction.attachmentPath)
			: Promise.resolve(null)
	]);

	const occurred = new Date(transaction.occurredAt);

	return {
		transaction,
		accounts,
		categories,
		receiptUrl,
		dateValue: toISODate(occurred),
		timeValue: `${pad(occurred.getHours())}:${pad(occurred.getMinutes())}`,
		currency: locals.profile?.currency ?? 'USD'
	};
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		const user = requireAuth(locals.user);
		const current = await getTransaction(locals.supabase, params.id);

		if (!current) {
			error(404, 'No encontramos ese movimiento.');
		}

		if (current.type === 'transfer') {
			return fail(400, {
				message: 'Las transferencias no se editan: elimínalas y vuelve a registrarlas.'
			});
		}

		const form = await request.formData();
		const values = formValues(form, VALUES);

		const parsed = transactionSchema.safeParse({
			type: current.type,
			amount: readString(form, 'amount'),
			accountId: readString(form, 'accountId'),
			categoryId: readString(form, 'categoryId'),
			concept: readString(form, 'concept'),
			occurredAt: occurredAtISO(readString(form, 'occurredAt'), readString(form, 'occurredTime')),
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

		const { data: account } = await locals.supabase
			.from('accounts')
			.select('id, currency')
			.eq('id', parsed.data.accountId)
			.maybeSingle();

		if (!account) {
			return fail(400, {
				message: 'La cuenta seleccionada no está disponible.',
				errors: { accountId: 'Selecciona una cuenta válida' },
				values
			});
		}

		const receipt = readFile(form, 'receipt');
		const removeReceipt = readString(form, 'removeReceipt') === '1';

		let nextPath = removeReceipt ? null : current.attachmentPath;
		let nextName = removeReceipt ? null : current.attachmentName;
		let uploaded: { path: string; name: string } | null = null;

		if (receipt) {
			const problem = await validateReceipt(receipt);
			if (problem) {
				return fail(400, { message: problem, errors: { receipt: problem }, values });
			}

			try {
				uploaded = await uploadReceipt(locals.supabase, user.id, receipt);
			} catch (uploadError) {
				return fail(500, {
					message:
						uploadError instanceof Error ? uploadError.message : 'No pudimos subir el comprobante.',
					values
				});
			}

			nextPath = uploaded.path;
			nextName = uploaded.name;
		}

		const { error: updateError } = await locals.supabase
			.from('transactions')
			.update({
				amount: parsed.data.amount,
				currency: account.currency,
				account_id: parsed.data.accountId,
				category_id: parsed.data.categoryId || null,
				concept: parsed.data.concept,
				notes: parsed.data.notes,
				occurred_at: parsed.data.occurredAt,
				attachment_path: nextPath,
				attachment_name: nextName
			})
			.eq('id', current.id);

		if (updateError) {
			if (uploaded) await removeFile(locals.supabase, 'receipts', uploaded.path);
			return fail(400, {
				message: mutationMessage(updateError.message, 'No pudimos actualizar el movimiento.'),
				values
			});
		}

		if (current.attachmentPath && current.attachmentPath !== nextPath) {
			await removeFile(locals.supabase, 'receipts', current.attachmentPath);
		}

		await replaceTransactionTags(locals.supabase, user.id, current.id, parsed.data.tags);

		// Igual que en el resto de detalles: no redirigimos a la misma URL porque
		// eso fuerza una recarga nativa y puede pisar una acción posterior.
		return { ok: true };
	},

	delete: async ({ locals, params }) => {
		requireAuth(locals.user);
		const current = await getTransaction(locals.supabase, params.id);

		if (!current) {
			error(404, 'No encontramos ese movimiento.');
		}

		const { error: deleteError } = await locals.supabase
			.from('transactions')
			.delete()
			.eq('id', current.id);

		if (deleteError) {
			return fail(400, {
				message: mutationMessage(deleteError.message, 'No pudimos eliminar el movimiento.')
			});
		}

		if (current.attachmentPath) {
			await removeFile(locals.supabase, 'receipts', current.attachmentPath);
		}

		redirect(303, '/movimientos');
	}
};
