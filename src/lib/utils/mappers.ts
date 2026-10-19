/**
 * Conversión de filas de la base de datos a los tipos de dominio de la app.
 *
 * Las vistas de PostgreSQL exponen todas sus columnas como anulables, y las
 * funciones que devuelven `jsonb` llegan sin tipar: aquí se normaliza todo una
 * única vez para que el resto de la aplicación trabaje con tipos estrictos.
 */

import type { Json } from '#lib/types/database.types';
import type {
	Account,
	Analytics,
	AnalyticsBudgetRow,
	AnalyticsCategory,
	AnalyticsInsight,
	AnalyticsSeriesPoint,
	BudgetItem,
	Category,
	Debt,
	DebtPayment,
	Goal,
	GoalCategory,
	GoalContribution,
	Profile,
	Tag,
	TransactionItem,
	View,
	Row
} from '#lib/types/domain';
import { monthlyEquivalent } from './finance';

export function toNumber(value: unknown, fallback = 0): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string') {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return fallback;
}

export function toStringValue(value: unknown, fallback = ''): string {
	return typeof value === 'string' ? value : fallback;
}

export function toBoolean(value: unknown, fallback = false): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

export function mapProfile(row: Row<'profiles'>): Profile {
	return {
		id: row.id,
		fullName: row.full_name,
		avatarUrl: row.avatar_url,
		currency: row.currency,
		monthlyBudget: toNumber(row.monthly_budget)
	};
}

export function mapAccount(row: View<'account_balances'>): Account {
	return {
		id: toStringValue(row.id),
		name: toStringValue(row.name),
		kind: row.kind ?? 'checking',
		currency: toStringValue(row.currency, 'USD'),
		icon: toStringValue(row.icon, 'account_balance'),
		color: row.color,
		isPrimary: toBoolean(row.is_primary),
		isArchived: toBoolean(row.is_archived),
		openingBalance: toNumber(row.opening_balance),
		balance: toNumber(row.balance)
	};
}

export function mapCategory(row: Row<'categories'>): Category {
	return {
		id: row.id,
		name: row.name,
		kind: row.kind,
		icon: row.icon,
		color: row.color,
		sortOrder: row.sort_order,
		isArchived: row.is_archived
	};
}

export function mapTag(row: Row<'tags'>): Tag {
	return { id: row.id, name: row.name, color: row.color };
}

export function mapTransaction(row: View<'transactions_detailed'>): TransactionItem {
	return {
		id: toStringValue(row.id),
		type: row.type ?? 'expense',
		amount: toNumber(row.amount),
		currency: toStringValue(row.currency, 'USD'),
		concept: toStringValue(row.concept),
		notes: row.notes,
		occurredAt: toStringValue(row.occurred_at),
		accountId: toStringValue(row.account_id),
		accountName: toStringValue(row.account_name),
		accountIcon: toStringValue(row.account_icon, 'account_balance'),
		counterAccountId: row.counter_account_id,
		counterAccountName: row.counter_account_name,
		categoryId: row.category_id,
		categoryName: row.category_name,
		categoryIcon: row.category_icon,
		categoryColor: row.category_color,
		attachmentPath: row.attachment_path,
		attachmentName: row.attachment_name,
		tagNames: row.tag_names ?? []
	};
}

export function mapBudget(
	row: Row<'budgets'> & {
		category?: { id: string; name: string; icon: string; color: string } | null;
	}
): BudgetItem {
	return {
		id: row.id,
		categoryId: row.category_id,
		categoryName: row.category?.name ?? 'Sin categoría',
		categoryIcon: row.category?.icon ?? 'category',
		categoryColor: row.category?.color ?? '#64748b',
		amount: toNumber(row.amount),
		periodMonth: row.period_month
	};
}

export function mapGoal(row: View<'goal_progress'>): Goal {
	return {
		id: toStringValue(row.id),
		name: toStringValue(row.name),
		description: row.description,
		category: (row.category ?? 'other') as GoalCategory,
		targetAmount: toNumber(row.target_amount),
		initialAmount: toNumber(row.initial_amount),
		savedAmount: toNumber(row.saved_amount),
		remainingAmount: toNumber(row.remaining_amount),
		progressPercent: toNumber(row.progress_percent),
		targetDate: row.target_date,
		status: row.status ?? 'active',
		accountId: row.account_id,
		monthlyContribution:
			row.monthly_contribution === null ? null : toNumber(row.monthly_contribution),
		reminderEnabled: toBoolean(row.reminder_enabled, true),
		reminderDay: toNumber(row.reminder_day, 1),
		imagePath: row.image_path,
		completedAt: row.completed_at,
		lastContributionAt: toStringValue(row.last_contribution_at),
		createdAt: toStringValue(row.created_at)
	};
}

export function mapGoalContribution(row: Row<'goal_contributions'>): GoalContribution {
	return {
		id: row.id,
		amount: toNumber(row.amount),
		occurredAt: row.occurred_at,
		note: row.note
	};
}

export function mapDebt(row: View<'debt_progress'>): Debt {
	const frequency = row.payment_frequency ?? 'monthly';
	const installment = toNumber(row.monthly_payment);

	return {
		id: toStringValue(row.id),
		name: toStringValue(row.name),
		creditor: row.creditor,
		kind: row.kind ?? 'other',
		principalAmount: toNumber(row.principal_amount),
		totalInstallments: toNumber(row.total_installments),
		installmentAmount: installment,
		monthlyEquivalent: monthlyEquivalent(installment, frequency),
		paymentFrequency: frequency,
		startedAt: toStringValue(row.started_at),
		initialAmount: toNumber(row.initial_amount),
		interestKind: row.interest_kind ?? 'msi',
		interestRate: toNumber(row.interest_rate),
		dueDay: toNumber(row.due_day, 1),
		firstDueDate: toStringValue(row.first_due_date),
		alertDaysBefore: toNumber(row.alert_days_before, 5),
		accountId: row.account_id,
		isActive: toBoolean(row.is_active, true),
		notes: row.notes,
		paidAmount: toNumber(row.paid_amount),
		remainingAmount: toNumber(row.remaining_amount),
		installmentsPaid: toNumber(row.installments_paid),
		installmentsLeft: toNumber(row.installments_left),
		progressPercent: toNumber(row.progress_percent),
		nextDueDate: toStringValue(row.next_due_date),
		lastPaymentAt: toStringValue(row.last_payment_at)
	};
}

export function mapDebtPayment(row: Row<'debt_payments'>): DebtPayment {
	return {
		id: row.id,
		amount: toNumber(row.amount),
		occurredAt: row.occurred_at,
		installmentNumber: row.installment_number,
		isExtra: row.is_extra,
		note: row.note,
		transactionId: row.transaction_id
	};
}

function asRecord(value: Json | null | undefined): Record<string, Json | undefined> {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, Json | undefined>)
		: {};
}

function asArray(value: Json | undefined): Json[] {
	return Array.isArray(value) ? value : [];
}

function mapAnalyticsCategory(value: Json): AnalyticsCategory {
	const item = asRecord(value);
	return {
		id: toStringValue(item.id, 'none'),
		name: toStringValue(item.name, 'Sin categoría'),
		icon: toStringValue(item.icon, 'category'),
		color: toStringValue(item.color, '#64748b'),
		amount: toNumber(item.amount),
		previousAmount: toNumber(item.previousAmount),
		share: toNumber(item.share),
		delta: toNumber(item.delta)
	};
}

function mapAnalyticsBudget(value: Json): AnalyticsBudgetRow {
	const item = asRecord(value);
	return {
		id: toStringValue(item.id, 'none'),
		name: toStringValue(item.name, 'Sin categoría'),
		icon: toStringValue(item.icon, 'category'),
		color: toStringValue(item.color, '#64748b'),
		budget: toNumber(item.budget),
		spent: toNumber(item.spent),
		share: toNumber(item.share)
	};
}

function mapAnalyticsSeriesPoint(value: Json): AnalyticsSeriesPoint {
	const item = asRecord(value);
	return {
		date: toStringValue(item.date),
		current: toNumber(item.current),
		previous: toNumber(item.previous)
	};
}

function mapInsight(value: Json | undefined): AnalyticsInsight | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const item = asRecord(value);
	const name = toStringValue(item.name);
	if (!name) return null;
	return {
		name,
		amount: toNumber(item.amount),
		currentAmount: toNumber(item.currentAmount)
	};
}

/** Normaliza la respuesta de `rpc('get_analytics')`. */
export function mapAnalytics(value: Json | null): Analytics {
	const root = asRecord(value ?? null);
	const topCategory = asRecord(root.topCategory);
	return {
		total: toNumber(root.total),
		previousTotal: toNumber(root.previousTotal),
		incomeTotal: toNumber(root.incomeTotal),
		deltaPercent: toNumber(root.deltaPercent),
		categories: asArray(root.categories).map(mapAnalyticsCategory),
		budgets: asArray(root.budgets).map(mapAnalyticsBudget),
		series: asArray(root.series).map(mapAnalyticsSeriesPoint),
		topIncrease: mapInsight(root.topIncrease),
		topDecrease: mapInsight(root.topDecrease),
		topCategory: topCategory.name
			? {
					name: toStringValue(topCategory.name),
					amount: toNumber(topCategory.amount),
					share: toNumber(topCategory.share)
				}
			: null
	};
}
