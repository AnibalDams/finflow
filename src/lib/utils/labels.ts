import type {
	AccountKind,
	DebtFrequency,
	DebtKind,
	GoalCategory,
	GoalStatus,
	InterestKind,
	TransactionType
} from '#lib/types/domain';

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
	income: 'Ingreso',
	expense: 'Gasto',
	transfer: 'Transferencia'
};

export const TRANSACTION_TYPE_ICONS: Record<TransactionType, string> = {
	income: 'arrow_downward_alt',
	expense: 'arrow_upward_alt',
	transfer: 'sync_alt'
};

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
	checking: 'Cuenta corriente',
	savings: 'Ahorros',
	pocket: 'Bolsillo',
	cash: 'Efectivo',
	credit: 'Tarjeta de crédito'
};

export const ACCOUNT_KIND_ICONS: Record<AccountKind, string> = {
	checking: 'account_balance',
	savings: 'savings',
	pocket: 'account_balance_wallet',
	cash: 'wallet',
	credit: 'credit_card'
};

export const DEBT_KIND_LABELS: Record<DebtKind, string> = {
	credit_card: 'Tarjeta de Crédito',
	personal: 'Personal / Auto',
	family: 'Familiar o Amigo',
	mortgage: 'Hipotecario / Otro',
	other: 'Otra obligación'
};

export const DEBT_KIND_DESCRIPTIONS: Record<DebtKind, string> = {
	credit_card: 'MSI y compras diferidas',
	personal: 'Bancario o prendario',
	family: 'Compromiso directo',
	mortgage: 'Largo plazo garantizado',
	other: 'Otros compromisos'
};

export const DEBT_KIND_ICONS: Record<DebtKind, string> = {
	credit_card: 'credit_card',
	personal: 'directions_car',
	family: 'group',
	mortgage: 'home',
	other: 'receipt_long'
};

export const INTEREST_KIND_LABELS: Record<InterestKind, string> = {
	msi: '0% MSI',
	fixed: 'Fija',
	variable: 'Variable'
};

export const DEBT_FREQUENCY_LABELS: Record<DebtFrequency, string> = {
	weekly: 'Semanal',
	biweekly: 'Quincenal',
	monthly: 'Mensual'
};

/** Unidad usada junto al monto de la cuota: "$100 / semana". */
export const DEBT_FREQUENCY_PERIODS: Record<DebtFrequency, string> = {
	weekly: 'semana',
	biweekly: 'quincena',
	monthly: 'mes'
};

export const DEBT_FREQUENCY_ICONS: Record<DebtFrequency, string> = {
	weekly: 'view_week',
	biweekly: 'date_range',
	monthly: 'calendar_month'
};

export const GOAL_CATEGORY_LABELS: Record<GoalCategory, string> = {
	technology: 'Tecnología',
	travel: 'Viajes',
	home: 'Hogar',
	education: 'Educación',
	other: 'Otros'
};

export const GOAL_CATEGORY_ICONS: Record<GoalCategory, string> = {
	technology: 'laptop_mac',
	travel: 'flight_takeoff',
	home: 'cottage',
	education: 'school',
	other: 'savings'
};

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
	active: 'Activo',
	completed: 'Completado',
	paused: 'En pausa'
};

export const GOAL_IDEA_TAGS: Array<{ label: string; category: GoalCategory; name: string }> = [
	{ label: 'MacBook', category: 'technology', name: 'MacBook Pro M3 Max' },
	{ label: 'Viaje', category: 'travel', name: 'Viaje a Japón' },
	{ label: 'Reserva', category: 'home', name: 'Renovación del hogar' },
	{ label: 'Curso', category: 'education', name: 'Curso de especialización' }
];

export const CURRENCY_OPTIONS = [
	{ code: 'USD', label: 'USD · Dólar estadounidense' },
	{ code: 'MXN', label: 'MXN · Peso mexicano' },
	{ code: 'EUR', label: 'EUR · Euro' },
	{ code: 'COP', label: 'COP · Peso colombiano' },
	{ code: 'ARS', label: 'ARS · Peso argentino' },
	{ code: 'CLP', label: 'CLP · Peso chileno' },
	{ code: 'PEN', label: 'PEN · Sol peruano' },
	{ code: 'BRL', label: 'BRL · Real brasileño' }
];

const CURRENCY_ICONS: Record<string, string> = {
	USD: 'attach_money',
	EUR: 'euro'
};

/** Ícono de Material Symbols para una moneda, con respaldo genérico. */
export function currencyIcon(code: string): string {
	return CURRENCY_ICONS[code] ?? 'payments';
}

export const ICON_CHOICES = [
	'account_balance',
	'account_balance_wallet',
	'savings',
	'wallet',
	'credit_card',
	'payments',
	'currency_exchange'
];

/** Íconos sugeridos para categorías de gasto e ingreso. */
export const CATEGORY_ICONS = [
	'restaurant',
	'local_cafe',
	'shopping_cart',
	'shopping_bag',
	'directions_car',
	'local_gas_station',
	'home',
	'bolt',
	'wifi',
	'phone_iphone',
	'sports_esports',
	'movie',
	'fitness_center',
	'medical_services',
	'school',
	'pets',
	'flight_takeoff',
	'card_giftcard',
	'receipt_long',
	'work',
	'trending_up',
	'payments',
	'savings',
	'category'
];

/** Paleta de colores alineada con los tokens del diseño. */
export const COLOR_PALETTE = [
	'#008358',
	'#3c5ad7',
	'#be2850',
	'#f59e0b',
	'#8b5cf6',
	'#0ea5e9',
	'#10b981',
	'#ef4444',
	'#64748b',
	'#ec4899',
	'#14b8a6',
	'#6366f1'
];
