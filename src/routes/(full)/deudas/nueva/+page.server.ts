import { fail, redirect } from '@sveltejs/kit';
import { getAccounts, getMonthTotals } from '#lib/server/queries';
import { mutationMessage } from '#lib/server/mutations';
import { requireAuth } from '#lib/server/results';
import { defaultAccount } from '#lib/server/shell';
import { addMonths, periodRange, toISODate } from '#lib/utils/dates';
import { addFrequency, installmentAmount } from '#lib/utils/finance';
import { formValues, readString } from '#lib/utils/forms';
import { debtSchema, fieldErrors } from '#lib/utils/validation';
import type { Actions, PageServerLoad } from './$types';

const VALUES = [
	'name',
	'creditor',
	'kind',
	'principalAmount',
	'initialAmount',
	'totalInstallments',
	'paidInstallments',
	'monthlyPayment',
	'paymentFrequency',
	'startedAt',
	'interestKind',
	'interestRate',
	'dueDay',
	'firstDueDate',
	'accountId',
	'notes'
] as const;

export const load: PageServerLoad = async ({ locals }) => {
	const month = periodRange('month', new Date());
	const [accounts, totals] = await Promise.all([
		getAccounts(locals.supabase),
		getMonthTotals(locals.supabase, month.from, month.to)
	]);
	const nextMonth = addMonths(new Date(), 1);

	return {
		accounts,
		defaultAccountId: defaultAccount(accounts)?.id ?? '',
		monthlyIncome: totals.income,
		today: toISODate(new Date()),
		defaultDueDate: toISODate(nextMonth),
		defaultDueDay: String(nextMonth.getDate()),
		currency: locals.profile?.currency ?? 'USD'
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireAuth(locals.user);
		const form = await request.formData();
		const values = formValues(form, VALUES);

		const parsed = debtSchema.safeParse({
			name: readString(form, 'name'),
			creditor: readString(form, 'creditor'),
			kind: readString(form, 'kind'),
			principalAmount: readString(form, 'principalAmount'),
			initialAmount: readString(form, 'initialAmount') || '0',
			totalInstallments: readString(form, 'totalInstallments'),
			paidInstallments: readString(form, 'paidInstallments') || '0',
			monthlyPayment: readString(form, 'monthlyPayment'),
			paymentFrequency: readString(form, 'paymentFrequency') || 'monthly',
			startedAt: readString(form, 'startedAt'),
			interestKind: readString(form, 'interestKind'),
			interestRate: readString(form, 'interestRate') || '0',
			dueDay: readString(form, 'dueDay'),
			firstDueDate: readString(form, 'firstDueDate'),
			alertDaysBefore: readString(form, 'alertDaysBefore') || '5',
			accountId: readString(form, 'accountId'),
			notes: readString(form, 'notes')
		});

		if (!parsed.success) {
			return fail(400, {
				message: 'Revisa los datos de la obligación.',
				errors: fieldErrors(parsed.error),
				values
			});
		}

		if (parsed.data.paidInstallments > parsed.data.totalInstallments) {
			return fail(400, {
				message: 'Las cuotas pagadas no pueden superar el total de cuotas.',
				errors: { paidInstallments: 'Revisa las cuotas pagadas' },
				values
			});
		}

		const accountId = parsed.data.accountId || null;
		if (accountId) {
			const { data: account } = await locals.supabase
				.from('accounts')
				.select('id')
				.eq('id', accountId)
				.maybeSingle();

			if (!account) {
				return fail(400, {
					message: 'La cuenta seleccionada no está disponible.',
					errors: { accountId: 'Selecciona una cuenta válida' },
					values
				});
			}
		}

		// La cuota se recalcula en el servidor: nunca se confía en el valor del formulario.
		const monthlyPayment = installmentAmount({
			principal: parsed.data.principalAmount,
			initialAmount: parsed.data.initialAmount,
			totalInstallments: parsed.data.totalInstallments,
			interestKind: parsed.data.interestKind,
			interestRate: parsed.data.interestRate,
			frequency: parsed.data.paymentFrequency
		});

		if (parsed.data.paidInstallments > 0 && monthlyPayment <= 0) {
			return fail(400, {
				message: 'El monto inicial cubre toda la deuda; no hay cuotas que registrar.',
				errors: { initialAmount: 'Deja al menos una cuota pendiente' },
				values
			});
		}

		const { data: created, error } = await locals.supabase
			.from('debts')
			.insert({
				user_id: user.id,
				name: parsed.data.name,
				creditor: parsed.data.creditor,
				kind: parsed.data.kind,
				principal_amount: parsed.data.principalAmount,
				initial_amount: parsed.data.initialAmount,
				total_installments: parsed.data.totalInstallments,
				monthly_payment: monthlyPayment,
				payment_frequency: parsed.data.paymentFrequency,
				started_at: parsed.data.startedAt,
				interest_kind: parsed.data.interestKind,
				interest_rate: parsed.data.interestKind === 'msi' ? 0 : parsed.data.interestRate,
				due_day: parsed.data.dueDay,
				first_due_date: parsed.data.firstDueDate,
				alert_days_before: parsed.data.alertDaysBefore,
				account_id: accountId,
				notes: parsed.data.notes
			})
			.select('id')
			.single();

		if (error || !created) {
			return fail(400, {
				message: mutationMessage(error?.message ?? '', 'No pudimos registrar la obligación.'),
				values
			});
		}

		if (parsed.data.paidInstallments > 0) {
			const start = new Date(`${parsed.data.firstDueDate}T12:00:00.000Z`);
			const rows = Array.from({ length: parsed.data.paidInstallments }, (_, index) => ({
				user_id: user.id,
				debt_id: created.id,
				amount: monthlyPayment,
				occurred_at: addFrequency(start, index, parsed.data.paymentFrequency).toISOString(),
				installment_number: index + 1,
				note: 'Cuota registrada al crear la obligación'
			}));

			await locals.supabase.from('debt_payments').insert(rows);
		}

		redirect(303, '/deudas');
	}
};
