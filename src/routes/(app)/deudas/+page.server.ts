import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { getDebts } from '#lib/server/queries';
import { mutationMessage } from '#lib/server/mutations';
import { requireAuth } from '#lib/server/results';
import { daysUntil, referenceAtOffset } from '#lib/utils/dates';
import { debtProjection, upcomingDebtPayments } from '#lib/utils/finance';
import { readString } from '#lib/utils/forms';
import { sumAmounts } from '#lib/utils/money';
import { paymentSchema } from '#lib/utils/validation';
import type { DebtKind } from '#lib/types/domain';
import type { Actions, PageServerLoad } from './$types';

type DebtFilter = 'todas' | 'tarjetas' | 'prestamos' | 'familia';

const FILTER_KINDS: Record<Exclude<DebtFilter, 'todas'>, DebtKind[]> = {
	tarjetas: ['credit_card'],
	prestamos: ['personal', 'mortgage', 'other'],
	familia: ['family']
};

function parseFilter(value: string | null): DebtFilter {
	if (value === 'tarjetas' || value === 'prestamos' || value === 'familia') return value;
	return 'todas';
}

const idSchema = z.uuid();

export const load: PageServerLoad = async ({ locals, url }) => {
	const debts = await getDebts(locals.supabase);
	const reference = referenceAtOffset(locals.tzOffset);
	const active = debts.filter((debt) => debt.isActive && debt.remainingAmount > 0);
	const filter = parseFilter(url.searchParams.get('tipo'));

	const filtered =
		filter === 'todas' ? active : active.filter((debt) => FILTER_KINDS[filter].includes(debt.kind));

	const totalPaid = sumAmounts(debts.map((debt) => debt.paidAmount));
	const historical = sumAmounts(debts.map((debt) => debt.principalAmount));

	return {
		debts,
		active,
		filtered,
		filter,
		counts: {
			todas: active.length,
			tarjetas: active.filter((debt) => debt.kind === 'credit_card').length,
			prestamos: active.filter((debt) => FILTER_KINDS.prestamos.includes(debt.kind)).length,
			familia: active.filter((debt) => debt.kind === 'family').length
		},
		totals: {
			remaining: sumAmounts(active.map((debt) => debt.remainingAmount)),
			monthly: sumAmounts(active.map((debt) => debt.monthlyEquivalent)),
			paid: totalPaid,
			historical,
			progress: historical > 0 ? Math.min(100, (totalPaid / historical) * 100) : 0
		},
		alerts: upcomingDebtPayments(debts, 30, reference),
		projection: debtProjection(debts),
		urgentIds: active
			.filter((debt) => daysUntil(debt.nextDueDate, reference) <= debt.alertDaysBefore)
			.map((debt) => debt.id),
		currency: locals.profile?.currency ?? 'USD'
	};
};

export const actions: Actions = {
	pay: async ({ request, locals }) => {
		requireAuth(locals.user);
		const form = await request.formData();
		const debtId = form.get('debtId');

		if (typeof debtId !== 'string' || !idSchema.safeParse(debtId).success) {
			return fail(400, { message: 'No pudimos identificar la deuda.' });
		}

		const parsed = paymentSchema.safeParse({
			debtId,
			amount: readString(form, 'amount'),
			accountId: readString(form, 'accountId'),
			occurredAt: new Date().toISOString(),
			isExtra: 'false',
			note: ''
		});

		if (!parsed.success) {
			return fail(400, {
				message: parsed.error.issues[0]?.message ?? 'Revisa el monto del pago.'
			});
		}

		const { error } = await locals.supabase.rpc('pay_installment', {
			p_debt_id: parsed.data.debtId,
			p_amount: parsed.data.amount,
			p_account_id: parsed.data.accountId ? parsed.data.accountId : undefined,
			p_occurred_at: parsed.data.occurredAt
		});

		if (error) {
			return fail(400, {
				message: mutationMessage(error.message, 'No pudimos registrar el pago.')
			});
		}

		return { ok: true };
	}
};
