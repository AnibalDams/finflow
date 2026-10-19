import type { DashboardAlert, Debt, Goal } from '#lib/types/domain';
import { daysUntil, toISODate } from '#lib/utils/dates';
import { formatMoney } from '#lib/utils/money';

export interface AlertInput {
	debts: Debt[];
	goals: Goal[];
	monthlyExpense: number;
	monthlyBudget: number;
	currency: string;
	reference?: Date;
}

/** Próximo recordatorio de aporte de un plan (día del mes configurado). */
export function nextReminderDate(goal: Goal, reference: Date): string {
	const candidate = new Date(reference.getFullYear(), reference.getMonth(), goal.reminderDay);
	if (daysUntil(toISODate(candidate), reference) < 0) {
		return toISODate(new Date(reference.getFullYear(), reference.getMonth() + 1, goal.reminderDay));
	}
	return toISODate(candidate);
}

/**
 * Alertas accionables derivadas de los datos reales del usuario:
 * cuotas vencidas o por vencer, aportes programados y presupuesto al límite.
 */
export function buildAlerts(input: AlertInput): DashboardAlert[] {
	const reference = input.reference ?? new Date();
	const alerts: DashboardAlert[] = [];

	for (const debt of input.debts) {
		if (!debt.isActive || debt.remainingAmount <= 0) continue;
		const days = daysUntil(debt.nextDueDate, reference);

		if (days < 0) {
			alerts.push({
				id: `debt-overdue-${debt.id}`,
				kind: 'debt_overdue',
				title: `${debt.name} está vencida`,
				description: `La cuota de ${formatMoney(debt.monthlyPayment, input.currency)} venció hace ${Math.abs(days)} días.`,
				icon: 'notification_important',
				tone: 'danger'
			});
			continue;
		}

		if (days <= debt.alertDaysBefore) {
			alerts.push({
				id: `debt-due-${debt.id}`,
				kind: 'debt_due',
				title: `${debt.name} vence ${days === 0 ? 'hoy' : `en ${days} días`}`,
				description: `Programa ${formatMoney(debt.monthlyPayment, input.currency)} para no generar intereses moratorios.`,
				icon: 'schedule',
				tone: 'warning'
			});
		}
	}

	for (const goal of input.goals) {
		if (goal.status !== 'active' || !goal.reminderEnabled) continue;
		const reminder = nextReminderDate(goal, reference);
		const days = daysUntil(reminder, reference);
		if (days > 3) continue;

		alerts.push({
			id: `goal-reminder-${goal.id}`,
			kind: 'goal_reminder',
			title: `Aporte programado · ${goal.name}`,
			description: goal.monthlyContribution
				? `Toca aportar ${formatMoney(goal.monthlyContribution, input.currency)} este mes.`
				: 'Recuerda registrar tu aporte mensual.',
			icon: 'savings',
			tone: 'info'
		});
	}

	if (input.monthlyBudget > 0) {
		const used = (input.monthlyExpense / input.monthlyBudget) * 100;
		if (used >= 100) {
			alerts.push({
				id: 'budget-exceeded',
				kind: 'budget_warning',
				title: 'Presupuesto mensual excedido',
				description: `Has gastado ${formatMoney(input.monthlyExpense, input.currency)} de ${formatMoney(input.monthlyBudget, input.currency)}.`,
				icon: 'warning',
				tone: 'danger'
			});
		} else if (used >= 85) {
			alerts.push({
				id: 'budget-warning',
				kind: 'budget_warning',
				title: 'Estás cerca del límite mensual',
				description: `Te queda ${formatMoney(input.monthlyBudget - input.monthlyExpense, input.currency)} de tu presupuesto.`,
				icon: 'speed',
				tone: 'warning'
			});
		}
	}

	const weight: Record<DashboardAlert['tone'], number> = {
		danger: 0,
		warning: 1,
		info: 2,
		success: 3
	};

	return alerts.sort((a, b) => weight[a.tone] - weight[b.tone]);
}

/** Fecha del próximo vencimiento de deuda, útil para la tarjeta de proyección. */
export function nextDebtDue(debts: Debt[], reference: Date = new Date()): Debt | null {
	const active = debts
		.filter((debt) => debt.isActive && debt.remainingAmount > 0)
		.sort((a, b) => daysUntil(a.nextDueDate, reference) - daysUntil(b.nextDueDate, reference));
	return active[0] ?? null;
}
