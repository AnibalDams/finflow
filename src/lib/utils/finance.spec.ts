import { describe, expect, it } from 'vitest';
import type { Debt, Goal } from '#lib/types/domain';
import { toISODate } from './dates';
import {
	addFrequency,
	budgetTone,
	contributionPlan,
	debtProjection,
	dueLabel,
	elapsedMonths,
	goalPace,
	installmentAmount,
	monthlyEquivalent,
	nextDueDate,
	periodsPerMonth,
	upcomingDebtPayments,
	type DebtAlert
} from './finance';

function buildGoal(overrides: Partial<Goal> = {}): Goal {
	return {
		id: 'goal-1',
		name: 'Viaje',
		description: null,
		category: 'travel',
		targetAmount: 1200,
		initialAmount: 0,
		savedAmount: 0,
		remainingAmount: 1200,
		progressPercent: 0,
		targetDate: null,
		status: 'active',
		accountId: null,
		monthlyContribution: null,
		reminderEnabled: false,
		reminderDay: 1,
		imagePath: null,
		completedAt: null,
		lastContributionAt: '2026-01-01T00:00:00.000Z',
		createdAt: '2026-01-01T00:00:00.000Z',
		...overrides
	};
}

function buildDebt(overrides: Partial<Debt> = {}): Debt {
	return {
		id: 'debt-1',
		name: 'Tarjeta',
		creditor: null,
		kind: 'credit_card',
		principalAmount: 1000,
		totalInstallments: 4,
		installmentAmount: 250,
		monthlyEquivalent: 250,
		paymentFrequency: 'monthly',
		startedAt: '2026-01-01',
		initialAmount: 0,
		interestKind: 'msi',
		interestRate: 0,
		dueDay: 5,
		firstDueDate: '2026-01-05',
		alertDaysBefore: 5,
		accountId: null,
		isActive: true,
		notes: null,
		paidAmount: 0,
		remainingAmount: 1000,
		installmentsPaid: 0,
		installmentsLeft: 4,
		progressPercent: 0,
		nextDueDate: '2026-01-05',
		lastPaymentAt: '2026-01-05T00:00:00.000Z',
		...overrides
	};
}

describe('installmentAmount', () => {
	it('reparte el principal sin interés', () => {
		expect(
			installmentAmount({
				principal: 1200,
				totalInstallments: 12,
				interestKind: 'msi',
				interestRate: 0
			})
		).toBe(100);
	});

	it('ignora la tasa cuando el régimen es MSI', () => {
		expect(
			installmentAmount({
				principal: 1200,
				totalInstallments: 12,
				interestKind: 'msi',
				interestRate: 36
			})
		).toBe(100);
	});

	it('aplica la amortización francesa cuando hay tasa', () => {
		const payment = installmentAmount({
			principal: 1200,
			totalInstallments: 12,
			interestKind: 'fixed',
			interestRate: 12
		});
		// Con 12% anual a 12 meses la cuota supera ligeramente el reparto simple.
		expect(payment).toBeGreaterThan(100);
		expect(payment).toBeLessThan(110);
	});

	it('devuelve 0 sin cuotas', () => {
		expect(
			installmentAmount({
				principal: 1200,
				totalInstallments: 0,
				interestKind: 'msi',
				interestRate: 0
			})
		).toBe(0);
	});

	it('descuenta el monto ya entregado del saldo a financiar', () => {
		expect(
			installmentAmount({
				principal: 1200,
				initialAmount: 200,
				totalInstallments: 10,
				interestKind: 'msi',
				interestRate: 0
			})
		).toBe(100);
	});

	it('usa la tasa periódica según la frecuencia', () => {
		const weekly = installmentAmount({
			principal: 1200,
			totalInstallments: 52,
			interestKind: 'fixed',
			interestRate: 12,
			frequency: 'weekly'
		});
		const monthly = installmentAmount({
			principal: 1200,
			totalInstallments: 12,
			interestKind: 'fixed',
			interestRate: 12,
			frequency: 'monthly'
		});
		// La cuota semanal es ~1/4 de la mensual, no 1/4.33.
		expect(weekly).toBeGreaterThan(monthly / 4.4);
		expect(weekly).toBeLessThan(monthly / 4);
	});
});

describe('frecuencia de deudas', () => {
	it('calcula los periodos mensuales por frecuencia', () => {
		expect(periodsPerMonth('monthly')).toBe(1);
		expect(periodsPerMonth('biweekly')).toBe(2);
		expect(periodsPerMonth('weekly')).toBeCloseTo(52 / 12, 5);
	});

	it('convierte la cuota a su equivalente mensual', () => {
		expect(monthlyEquivalent(100, 'monthly')).toBe(100);
		expect(monthlyEquivalent(100, 'biweekly')).toBe(200);
		expect(monthlyEquivalent(100, 'weekly')).toBe(433.33);
	});

	it('suma vencimientos según la frecuencia', () => {
		const start = new Date(2026, 0, 1);
		expect(toISODate(addFrequency(start, 2, 'weekly'))).toBe('2026-01-15');
		expect(toISODate(addFrequency(start, 2, 'biweekly'))).toBe('2026-01-31');
		expect(toISODate(addFrequency(start, 2, 'monthly'))).toBe('2026-03-01');
	});

	it('calcula el próximo vencimiento con las cuotas pagadas', () => {
		expect(nextDueDate('2026-01-05', 0, 'monthly')).toBe('2026-01-05');
		expect(nextDueDate('2026-01-05', 3, 'monthly')).toBe('2026-04-05');
		expect(nextDueDate('2026-01-05', 3, 'weekly')).toBe('2026-01-26');
		expect(nextDueDate('2026-01-05', 3, 'biweekly')).toBe('2026-02-19');
	});
});

describe('contributionPlan', () => {
	it('reparte el restante en 12 meses cuando no hay fecha objetivo', () => {
		const plan = contributionPlan({
			target: 1200,
			saved: 200,
			reference: new Date(2026, 0, 15)
		});
		expect(plan.months).toBe(12);
		expect(plan.remaining).toBe(1000);
		expect(plan.monthlyAmount).toBe(83.33);
		expect(plan.estimatedDate).toBe('2027-01-15');
	});

	it('ajusta la cuota al plazo elegido', () => {
		const plan = contributionPlan({
			target: 1200,
			saved: 200,
			targetDate: '2026-07-01',
			reference: new Date(2026, 0, 1)
		});
		expect(plan.months).toBe(6);
		expect(plan.monthlyAmount).toBe(166.67);
	});

	it('no pide aportes cuando la meta ya está cubierta', () => {
		const plan = contributionPlan({ target: 500, saved: 500, reference: new Date(2026, 0, 1) });
		expect(plan.remaining).toBe(0);
		expect(plan.monthlyAmount).toBe(0);
	});
});

describe('goalPace', () => {
	it('respeta los estados explícitos', () => {
		expect(goalPace(buildGoal({ status: 'paused' }))).toBe('paused');
		expect(goalPace(buildGoal({ status: 'completed' }))).toBe('completed');
	});

	it('sin fecha objetivo se apoya en el avance acumulado', () => {
		expect(goalPace(buildGoal({ progressPercent: 60 }))).toBe('on_track');
		expect(goalPace(buildGoal({ progressPercent: 20 }))).toBe('behind');
	});

	it('compara el avance contra el esperado a la fecha', () => {
		const base: Partial<Goal> = {
			targetDate: '2026-12-31',
			targetAmount: 1200,
			createdAt: '2026-01-01T00:00:00.000Z'
		};
		const reference = new Date(2026, 5, 30);
		expect(goalPace(buildGoal({ ...base, savedAmount: 600 }), reference)).toBe('on_track');
		expect(goalPace(buildGoal({ ...base, savedAmount: 700 }), reference)).toBe('ahead');
		expect(goalPace(buildGoal({ ...base, savedAmount: 100 }), reference)).toBe('behind');
		expect(goalPace(buildGoal({ ...base, savedAmount: 1200 }), reference)).toBe('completed');
		expect(goalPace(buildGoal({ ...base, savedAmount: 300 }), new Date(2027, 0, 15))).toBe(
			'overdue'
		);
	});
});

describe('debtProjection', () => {
	it('proyecta el pago con la cuota mínima', () => {
		const projection = debtProjection([buildDebt()]);
		expect(projection.baseline.months).toBe(4);
		expect(projection.monthlyCommitment).toBe(250);
		expect(projection.remainingTotal).toBe(1000);
		expect(projection.baseline.payoffOrder).toEqual(['Tarjeta']);
	});

	it('acelera el pago aplicando las cuotas liberadas', () => {
		const projection = debtProjection([
			buildDebt({ id: 'a', name: 'Pequeña', remainingAmount: 200, monthlyEquivalent: 200 }),
			buildDebt({ id: 'b', name: 'Grande', remainingAmount: 1800, monthlyEquivalent: 200 })
		]);
		expect(projection.monthlyCommitment).toBe(400);
		expect(projection.accelerated.months).toBeLessThan(projection.baseline.months);
		expect(projection.monthsSaved).toBeGreaterThan(0);
	});

	it('ignora deudas inactivas o saldadas', () => {
		const projection = debtProjection([
			buildDebt({ id: 'a', isActive: false }),
			buildDebt({ id: 'b', remainingAmount: 0 })
		]);
		expect(projection.monthlyCommitment).toBe(0);
		expect(projection.remainingTotal).toBe(0);
		expect(projection.baseline.months).toBe(0);
	});
});

describe('alertas de vencimiento', () => {
	const reference = new Date(2026, 9, 18);

	it('incluye cuotas vencidas y próximas dentro del horizonte', () => {
		const alerts = upcomingDebtPayments(
			[
				buildDebt({ id: 'a', nextDueDate: '2026-10-21' }),
				buildDebt({ id: 'b', nextDueDate: '2026-10-16' }),
				buildDebt({ id: 'c', nextDueDate: '2026-12-30' })
			],
			30,
			reference
		);
		expect(alerts.map((alert) => alert.debt.id)).toEqual(['b', 'a']);
		expect(alerts[0].overdue).toBe(true);
	});

	it('etiqueta cada vencimiento', () => {
		const label = (daysToDue: number, alertDaysBefore = 5): string => {
			const date = new Date(2026, 9, 18);
			date.setDate(date.getDate() + daysToDue);
			const due = toISODate(date);
			const debt = buildDebt({ nextDueDate: due, alertDaysBefore });
			const alerts = upcomingDebtPayments([debt], 60, reference);
			const alert: DebtAlert = alerts[0];
			return dueLabel(alert);
		};

		expect(label(-2)).toContain('vencida hace 2 días');
		expect(label(0)).toBe('vence hoy');
		expect(label(3)).toBe('en 3 días');
		expect(label(20)).toBe('Al día');
	});
});

describe('presupuesto', () => {
	it('asigna tono según el porcentaje consumido', () => {
		expect(budgetTone(50)).toBe('success');
		expect(budgetTone(80)).toBe('warning');
		expect(budgetTone(120)).toBe('danger');
	});
});

describe('elapsedMonths', () => {
	it('cuenta meses entre fechas de tipo date', () => {
		expect(elapsedMonths('2026-01-01', '2026-07-01')).toBe(6);
	});
});
