import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { getAccounts, getDebt } from '#lib/server/queries';
import { mutationMessage } from '#lib/server/mutations';
import { requireAuth } from '#lib/server/results';
import { defaultAccount } from '#lib/server/shell';
import { dateAtOffset, localDateTimeToUtc } from '#lib/utils/dates';
import { formValues, readString } from '#lib/utils/forms';
import { debtSchema, fieldErrors, paymentSchema } from '#lib/utils/validation';
import type { Actions, PageServerLoad } from './$types';

const EDIT_VALUES = [
	'name',
	'creditor',
	'principalAmount',
	'initialAmount',
	'totalInstallments',
	'interestKind',
	'interestRate',
	'monthlyPayment',
	'paymentFrequency',
	'startedAt',
	'dueDay',
	'firstDueDate',
	'accountId',
	'notes'
] as const;

const statusSchema = z.union([z.literal('active'), z.literal('inactive')]);

export const load: PageServerLoad = async ({ locals, params }) => {
	const result = await getDebt(locals.supabase, params.id);

	if (!result) {
		error(404, 'No encontramos esa deuda.');
	}

	const accounts = await getAccounts(locals.supabase);

	return {
		debt: result.debt,
		payments: result.payments,
		accounts,
		defaultAccountId: result.debt.accountId ?? defaultAccount(accounts)?.id ?? '',
		today: dateAtOffset(locals.tzOffset),
		currency: locals.profile?.currency ?? 'USD'
	};
};

export const actions: Actions = {
	pay: async ({ request, locals, params }) => {
		requireAuth(locals.user);
		const form = await request.formData();
		const rawDate = readString(form, 'occurredAt');

		const parsed = paymentSchema.safeParse({
			debtId: params.id,
			amount: readString(form, 'amount'),
			accountId: readString(form, 'accountId'),
			occurredAt: localDateTimeToUtc(
				rawDate || dateAtOffset(locals.tzOffset),
				'12:00',
				locals.tzOffset
			),
			isExtra: 'false',
			note: readString(form, 'note')
		});

		if (!parsed.success) {
			return fail(400, {
				intent: 'pay',
				message: parsed.error.issues[0]?.message ?? 'Revisa el monto del pago.',
				errors: fieldErrors(parsed.error),
				values: formValues(form, ['amount', 'occurredAt', 'note'] as const)
			});
		}

		const { error: rpcError } = await locals.supabase.rpc('pay_installment', {
			p_debt_id: parsed.data.debtId,
			p_amount: parsed.data.amount,
			p_account_id: parsed.data.accountId ? parsed.data.accountId : undefined,
			p_occurred_at: new Date(parsed.data.occurredAt).toISOString()
		});

		if (rpcError) {
			return fail(400, {
				intent: 'pay',
				message: mutationMessage(rpcError.message, 'No pudimos registrar el pago.')
			});
		}

		return { ok: true };
	},

	update: async ({ request, locals, params }) => {
		requireAuth(locals.user);
		const form = await request.formData();
		const values = formValues(form, EDIT_VALUES);

		const parsed = debtSchema.safeParse({
			name: readString(form, 'name'),
			creditor: readString(form, 'creditor'),
			kind: readString(form, 'kind'),
			principalAmount: readString(form, 'principalAmount'),
			initialAmount: readString(form, 'initialAmount') || '0',
			totalInstallments: readString(form, 'totalInstallments'),
			paidInstallments: '0',
			monthlyPayment: readString(form, 'monthlyPayment'),
			paymentFrequency: readString(form, 'paymentFrequency') || 'monthly',
			startedAt: readString(form, 'startedAt'),
			interestKind: readString(form, 'interestKind'),
			interestRate: readString(form, 'interestRate') || '0',
			dueDay: readString(form, 'dueDay'),
			firstDueDate: readString(form, 'firstDueDate'),
			alertDaysBefore: readString(form, 'alertDaysBefore') || '0',
			accountId: readString(form, 'accountId'),
			notes: readString(form, 'notes')
		});

		if (!parsed.success) {
			return fail(400, {
				intent: 'update',
				message: 'Revisa los datos de la deuda.',
				errors: fieldErrors(parsed.error),
				values
			});
		}

		const { error: updateError } = await locals.supabase
			.from('debts')
			.update({
				name: parsed.data.name,
				creditor: parsed.data.creditor,
				monthly_payment: parsed.data.monthlyPayment,
				payment_frequency: parsed.data.paymentFrequency,
				started_at: parsed.data.startedAt,
				initial_amount: parsed.data.initialAmount,
				due_day: parsed.data.dueDay,
				first_due_date: parsed.data.firstDueDate,
				alert_days_before: parsed.data.alertDaysBefore,
				account_id: parsed.data.accountId || null,
				notes: parsed.data.notes
			})
			.eq('id', params.id);

		if (updateError) {
			return fail(400, {
				intent: 'update',
				message: mutationMessage(updateError.message, 'No pudimos actualizar la deuda.'),
				values
			});
		}

		return { ok: true };
	},

	status: async ({ request, locals, params }) => {
		requireAuth(locals.user);
		const form = await request.formData();
		const parsed = statusSchema.safeParse(readString(form, 'status'));

		if (!parsed.success) {
			return fail(400, { message: 'Estado no válido.' });
		}

		const { error: updateError } = await locals.supabase
			.from('debts')
			.update({ is_active: parsed.data === 'active' })
			.eq('id', params.id);

		if (updateError) {
			return fail(400, {
				message: mutationMessage(updateError.message, 'No pudimos cambiar el estado.')
			});
		}

		return { ok: true };
	},

	delete: async ({ locals, params }) => {
		requireAuth(locals.user);
		const { error: deleteError } = await locals.supabase.from('debts').delete().eq('id', params.id);

		if (deleteError) {
			return fail(400, {
				message: mutationMessage(deleteError.message, 'No pudimos eliminar la deuda.')
			});
		}

		redirect(303, '/deudas');
	}
};
