import type { Database } from './database.types';

export type Enums = Database['public']['Enums'];

export type TransactionType = Enums['transaction_type'];
export type AccountKind = Enums['account_kind'];
export type CategoryKind = Enums['category_kind'];
export type GoalStatus = Enums['goal_status'];
export type DebtKind = Enums['debt_kind'];
export type InterestKind = Enums['interest_kind'];

export type Row<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Row'];
export type Insert<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Insert'];
export type Update<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Update'];
export type View<T extends keyof Database['public']['Views']> =
	Database['public']['Views'][T]['Row'];

export interface Profile {
	id: string;
	fullName: string;
	/** Ruta del objeto en el bucket privado `avatars`. */
	avatarPath: string | null;
	/** URL firmada resuelta por el servidor. */
	avatarUrl: string | null;
	currency: string;
	monthlyBudget: number;
}

export interface Account {
	id: string;
	name: string;
	kind: AccountKind;
	currency: string;
	icon: string;
	color: string | null;
	isPrimary: boolean;
	isArchived: boolean;
	openingBalance: number;
	balance: number;
}

export interface Category {
	id: string;
	name: string;
	kind: CategoryKind;
	icon: string;
	color: string;
	sortOrder: number;
	isArchived: boolean;
}

export interface Tag {
	id: string;
	name: string;
	color: string;
}

export interface TransactionItem {
	id: string;
	type: TransactionType;
	amount: number;
	currency: string;
	concept: string;
	notes: string | null;
	occurredAt: string;
	accountId: string;
	accountName: string;
	accountIcon: string;
	counterAccountId: string | null;
	counterAccountName: string | null;
	categoryId: string | null;
	categoryName: string | null;
	categoryIcon: string | null;
	categoryColor: string | null;
	attachmentPath: string | null;
	attachmentName: string | null;
	tagNames: string[];
}

export interface BudgetItem {
	id: string;
	categoryId: string;
	categoryName: string;
	categoryIcon: string;
	categoryColor: string;
	amount: number;
	periodMonth: string;
}

export interface Goal {
	id: string;
	name: string;
	description: string | null;
	category: GoalCategory;
	targetAmount: number;
	initialAmount: number;
	savedAmount: number;
	remainingAmount: number;
	progressPercent: number;
	targetDate: string | null;
	status: GoalStatus;
	accountId: string | null;
	monthlyContribution: number | null;
	reminderEnabled: boolean;
	reminderDay: number;
	imagePath: string | null;
	completedAt: string | null;
	lastContributionAt: string;
	createdAt: string;
}

export type GoalCategory = 'technology' | 'travel' | 'home' | 'education' | 'other';

export interface GoalContribution {
	id: string;
	amount: number;
	occurredAt: string;
	note: string | null;
}

export type DebtFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface Debt {
	id: string;
	name: string;
	creditor: string | null;
	kind: DebtKind;
	principalAmount: number;
	totalInstallments: number;
	/** Cuota por periodo (semana, quincena o mes). */
	installmentAmount: number;
	/** Equivalente mensual de la cuota según la frecuencia. */
	monthlyEquivalent: number;
	paymentFrequency: DebtFrequency;
	startedAt: string;
	initialAmount: number;
	interestKind: InterestKind;
	interestRate: number;
	dueDay: number;
	firstDueDate: string;
	alertDaysBefore: number;
	accountId: string | null;
	isActive: boolean;
	notes: string | null;
	paidAmount: number;
	remainingAmount: number;
	installmentsPaid: number;
	installmentsLeft: number;
	progressPercent: number;
	nextDueDate: string;
	lastPaymentAt: string;
}

export interface DebtPayment {
	id: string;
	amount: number;
	occurredAt: string;
	installmentNumber: number | null;
	isExtra: boolean;
	note: string | null;
	transactionId: string | null;
}

export interface AnalyticsCategory {
	id: string;
	name: string;
	icon: string;
	color: string;
	amount: number;
	previousAmount: number;
	share: number;
	delta: number;
}

export interface AnalyticsBudgetRow {
	id: string;
	name: string;
	icon: string;
	color: string;
	budget: number;
	spent: number;
	share: number;
}

export interface AnalyticsSeriesPoint {
	date: string;
	current: number;
	previous: number;
}

export interface AnalyticsInsight {
	name: string;
	amount: number;
	currentAmount: number;
}

export interface Analytics {
	total: number;
	previousTotal: number;
	incomeTotal: number;
	deltaPercent: number;
	categories: AnalyticsCategory[];
	budgets: AnalyticsBudgetRow[];
	series: AnalyticsSeriesPoint[];
	topIncrease: AnalyticsInsight | null;
	topDecrease: AnalyticsInsight | null;
	topCategory: { name: string; amount: number; share: number } | null;
}

export interface DashboardAlert {
	id: string;
	kind: 'debt_due' | 'debt_overdue' | 'goal_reminder' | 'budget_warning';
	title: string;
	description: string;
	icon: string;
	tone: 'warning' | 'danger' | 'info' | 'success';
}
