/**
 * Cálculos financieros del dominio: cuotas de planes, ritmo de ahorro,
 * amortización de deudas y proyecciones. Todo en montos decimales (enteros de
 * centavos por dentro) y sin dependencias de UI para poder probarse aislado.
 */

import { addMonths, daysUntil, diffInMonths, monthsBetween, parseISODate, toISODate } from './dates';
import { fromCents, round2, toCents } from './money';
import type { Debt, Goal, GoalStatus, InterestKind } from '#lib/types/domain';

/** Cuota mensual necesaria para alcanzar una meta en el plazo indicado. */
export interface ContributionPlan {
	months: number;
	monthlyAmount: number;
	remaining: number;
	estimatedDate: string;
}

export function contributionPlan(params: {
	target: number;
	saved: number;
	targetDate?: string | null;
	reference?: Date;
}): ContributionPlan {
	const reference = params.reference ?? new Date();
	const remaining = Math.max(round2(params.target - params.saved), 0);
	const months = params.targetDate
		? monthsBetween(reference, parseISODate(params.targetDate))
		: 12;
	const monthlyAmount = remaining === 0 ? 0 : round2(remaining / months);

	return {
		months,
		monthlyAmount,
		remaining,
		estimatedDate: toISODate(addMonths(reference, months))
	};
}

export type GoalPace = GoalStatus | 'ahead' | 'on_track' | 'behind' | 'overdue';

/** Ritmo del plan comparando el avance real contra el esperado a la fecha. */
export function goalPace(goal: Goal, reference: Date = new Date()): GoalPace {
	if (goal.status === 'completed') return 'completed';
	if (goal.status === 'paused') return 'paused';
	if (!goal.targetDate) return goal.progressPercent >= 50 ? 'on_track' : 'behind';
	if (goal.savedAmount >= goal.targetAmount) return 'completed';

	const startDate = new Date(goal.createdAt);
	const start = Number.isNaN(startDate.getTime()) ? reference : startDate;
	const end = parseISODate(goal.targetDate);

	const totalDays = Math.max(daysUntil(start, end), 1);
	const elapsedDays = Math.max(daysUntil(start, reference), 0);
	const expected = Math.min(elapsedDays / totalDays, 1) * goal.targetAmount;
	const tolerance = goal.targetAmount * 0.05;

	if (daysUntil(end, reference) < 0) return 'overdue';
	if (goal.savedAmount >= expected + tolerance) return 'ahead';
	if (goal.savedAmount >= expected - tolerance) return 'on_track';
	return 'behind';
}

export const GOAL_PACE_LABELS: Record<GoalPace, string> = {
	active: 'En curso',
	completed: 'Completado',
	paused: 'En pausa',
	ahead: 'En ritmo óptimo',
	on_track: 'En tiempo',
	behind: 'Requiere atención',
	overdue: 'Fuera de plazo'
};

/** Cuota mensual de un crédito según el régimen de interés. */
export function installmentAmount(params: {
	principal: number;
	totalInstallments: number;
	interestKind: InterestKind;
	interestRate: number;
}): number {
	const { principal, totalInstallments, interestKind, interestRate } = params;
	if (totalInstallments <= 0) return 0;
	if (interestKind === 'msi' || interestRate <= 0) {
		return round2(principal / totalInstallments);
	}

	const monthlyRate = interestRate / 100 / 12;
	const factor = Math.pow(1 + monthlyRate, -totalInstallments);
	return round2((principal * monthlyRate) / (1 - factor));
}

export interface DebtSimulation {
	months: number;
	date: string;
	interestPaid: number;
	payoffOrder: string[];
}

interface SimulatedDebt {
	id: string;
	name: string;
	balanceCents: number;
	paymentCents: number;
	monthlyRate: number;
}

function simulate(debts: SimulatedDebt[], accelerate: boolean): DebtSimulation {
	const pool = debts
		.filter((debt) => debt.balanceCents > 0 && debt.paymentCents > 0)
		.map((debt) => ({ ...debt }));
	const payoffOrder: string[] = [];
	let totalInterestCents = 0;
	let months = 0;

	while (pool.some((debt) => debt.balanceCents > 0) && months < 600) {
		months += 1;
		let freedCents = 0;

		// Orden por tasa descendente: bola de nieve de mayor impacto (avalancha)
		pool.sort((a, b) => b.monthlyRate - a.monthlyRate || b.balanceCents - a.balanceCents);

		for (const debt of pool) {
			if (debt.balanceCents <= 0) continue;
			const interest = Math.round(debt.balanceCents * debt.monthlyRate);
			totalInterestCents += interest;
			debt.balanceCents += interest;

			const payment = Math.min(debt.paymentCents, debt.balanceCents);
			debt.balanceCents -= payment;

			if (debt.balanceCents <= 0) {
				freedCents += debt.paymentCents;
				if (!payoffOrder.includes(debt.name)) payoffOrder.push(debt.name);
			}
		}

		if (accelerate && freedCents > 0) {
			const target = pool.find((debt) => debt.balanceCents > 0);
			if (target) {
				const extra = Math.min(freedCents, target.balanceCents);
				target.balanceCents -= extra;
				if (target.balanceCents <= 0 && !payoffOrder.includes(target.name)) {
					payoffOrder.push(target.name);
				}
			}
		}
	}

	return {
		months,
		date: toISODate(addMonths(new Date(), months)),
		interestPaid: fromCents(totalInterestCents),
		payoffOrder
	};
}

export interface DebtProjection {
	monthlyCommitment: number;
	baseline: DebtSimulation;
	accelerated: DebtSimulation;
	monthsSaved: number;
	interestSaved: number;
	remainingTotal: number;
}

/**
 * Proyección del pago de deudas comparando el ritmo actual (cada deuda con su
 * cuota mínima) contra el escenario acelerado (las cuotas liberadas se aplican
 * a la deuda con la tasa más alta).
 */
export function debtProjection(debts: Debt[]): DebtProjection {
	const active = debts.filter((debt) => debt.isActive && debt.remainingAmount > 0);
	const simulated: SimulatedDebt[] = active.map((debt) => ({
		id: debt.id,
		name: debt.name,
		balanceCents: toCents(debt.remainingAmount),
		paymentCents: Math.max(toCents(debt.monthlyPayment), 1),
		monthlyRate: debt.interestRate > 0 ? debt.interestRate / 100 / 12 : 0
	}));

	const baseline = simulate(simulated, false);
	const accelerated = simulate(simulated, true);

	return {
		monthlyCommitment: round2(active.reduce((total, debt) => total + debt.monthlyPayment, 0)),
		baseline,
		accelerated,
		monthsSaved: Math.max(baseline.months - accelerated.months, 0),
		interestSaved: round2(Math.max(baseline.interestPaid - accelerated.interestPaid, 0)),
		remainingTotal: round2(active.reduce((total, debt) => total + debt.remainingAmount, 0))
	};
}

export interface DebtAlert {
	debt: Debt;
	dueDate: string;
	daysLeft: number;
	overdue: boolean;
	amount: number;
}

/** Cuotas cuyo vencimiento cae dentro de la ventana de aviso (o ya venció). */
export function upcomingDebtPayments(debts: Debt[], horizonDays = 30, reference = new Date()): DebtAlert[] {
	return debts
		.filter((debt) => debt.isActive && debt.remainingAmount > 0)
		.map((debt) => {
			const daysLeft = daysUntil(debt.nextDueDate, reference);
			const overdue = daysLeft < 0;
			return {
				debt,
				dueDate: debt.nextDueDate,
				daysLeft,
				overdue,
				amount: debt.monthlyPayment
			};
		})
		.filter((alert) => alert.overdue || alert.daysLeft <= horizonDays)
		.sort((a, b) => a.daysLeft - b.daysLeft);
}

/** Etiqueta de vencimiento: `Al día`, `en 7 días`, `vencida hace 3 días`. */
export function dueLabel(alert: DebtAlert): string {
	if (alert.overdue) return `vencida hace ${Math.abs(alert.daysLeft)} días`;
	if (alert.daysLeft === 0) return 'vence hoy';
	if (alert.daysLeft <= alert.debt.alertDaysBefore) return `en ${alert.daysLeft} días`;
	return 'Al día';
}

export type BudgetTone = 'success' | 'warning' | 'danger';

export function budgetTone(percent: number): BudgetTone {
	if (percent >= 100) return 'danger';
	if (percent >= 80) return 'warning';
	return 'success';
}

/** Avance esperado del presupuesto según los días transcurridos del mes. */
export function budgetPaceHint(spentPercent: number, reference = new Date()): string {
	const daysInMonth = new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();
	const elapsed = (reference.getDate() / daysInMonth) * 100;
	if (spentPercent > elapsed + 10) return 'Vas por encima del ritmo del mes';
	if (spentPercent < elapsed - 10) return 'Vas por debajo del ritmo del mes';
	return 'Vas en línea con el ritmo del mes';
}

/** Meses transcurridos entre dos fechas de tipo `date`. */
export function elapsedMonths(from: string, to: string): number {
	return diffInMonths(parseISODate(from), parseISODate(to));
}
