import { z } from 'zod';
import { parseAmountInput } from './money';

export type FieldErrors = Record<string, string>;

/** Convierte un error de Zod en un mapa `campo → mensaje`. */
export function fieldErrors(error: z.ZodError): FieldErrors {
	const errors: FieldErrors = {};
	for (const issue of error.issues) {
		const key = issue.path.join('.') || 'form';
		if (!errors[key]) errors[key] = issue.message;
	}
	return errors;
}

const email = z
	.string()
	.trim()
	.toLowerCase()
	.pipe(z.email({ message: 'Ingresa un correo electrónico válido' }));

const password = z
	.string()
	.min(12, 'La contraseña debe tener al menos 12 caracteres')
	.max(72, 'La contraseña no puede superar los 72 caracteres')
	.refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
		message: 'Incluye al menos una letra y un número'
	});

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max, `Máximo ${max} caracteres`)
		.optional()
		.transform((value) => (value && value.length > 0 ? value : null));

/** Monto monetario escrito por el usuario (`1,234.56`). */
function money(label: string, options: { allowZero?: boolean; max?: number } = {}) {
	const { allowZero = false, max = 99_999_999 } = options;
	return z
		.string()
		.trim()
		.min(1, `Ingresa ${label}`)
		.refine((value) => parseAmountInput(value) !== null, { message: `${label} no es válido` })
		.transform((value) => parseAmountInput(value) ?? Number.NaN)
		.refine((value) => (allowZero ? value >= 0 : value > 0), {
			message: allowZero ? `${label} no puede ser negativo` : `${label} debe ser mayor a cero`
		})
		.refine((value) => value <= max, { message: `${label} es demasiado alto` });
}

const isoDate = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Selecciona una fecha válida');

const isoDateTime = z.string().trim().min(10, 'Selecciona una fecha válida');

const uuid = z.uuid({ message: 'Selecciona una opción válida' });

/* ==========================================================================
   Autenticación
   ========================================================================== */

export const loginSchema = z.object({
	email,
	password: z.string().min(1, 'Ingresa tu contraseña')
});

export const registerSchema = z
	.object({
		fullName: z.string().trim().min(2, 'Escribe tu nombre').max(80, 'El nombre es demasiado largo'),
		email,
		password,
		passwordConfirm: z.string(),
		currency: z.string().trim().length(3, 'Selecciona una moneda').toUpperCase()
	})
	.refine((data) => data.password === data.passwordConfirm, {
		message: 'Las contraseñas no coinciden',
		path: ['passwordConfirm']
	});

export const recoverySchema = z.object({ email });

export const resetSchema = z
	.object({ password, passwordConfirm: z.string() })
	.refine((data) => data.password === data.passwordConfirm, {
		message: 'Las contraseñas no coinciden',
		path: ['passwordConfirm']
	});

/* ==========================================================================
   Movimientos
   ========================================================================== */

export const transferSchema = z
	.object({
		fromAccountId: uuid,
		toAccountId: uuid,
		amount: money('el monto'),
		concept: optionalText(140),
		occurredAt: isoDateTime
	})
	.refine((data) => data.fromAccountId !== data.toAccountId, {
		message: 'Elige dos cuentas distintas',
		path: ['toAccountId']
	});

export const transactionSchema = z.object({
	type: z.enum(['income', 'expense']),
	amount: money('el monto'),
	accountId: uuid,
	categoryId: z.union([uuid, z.literal('')]).optional(),
	concept: z
		.string()
		.trim()
		.min(2, 'Escribe un concepto')
		.max(140, 'El concepto es demasiado largo'),
	occurredAt: isoDateTime,
	notes: optionalText(500),
	tags: z
		.string()
		.optional()
		.transform((value) =>
			(value ?? '')
				.split(',')
				.map((tag) => tag.trim().replace(/^#/, ''))
				.filter((tag) => tag.length > 0 && tag.length <= 30)
				.slice(0, 8)
		)
});

/* ==========================================================================
   Planes
   ========================================================================== */

export const goalSchema = z.object({
	name: z.string().trim().min(3, 'Escribe un nombre').max(80, 'El nombre es demasiado largo'),
	description: optionalText(300),
	targetAmount: money('la meta'),
	initialAmount: money('el ahorro inicial', { allowZero: true }),
	targetDate: isoDate,
	category: z.enum(['technology', 'travel', 'home', 'education', 'other']),
	accountId: z.union([uuid, z.literal('')]).optional(),
	monthlyContribution: money('la aportación mensual', { allowZero: true }),
	reminderEnabled: z
		.union([z.literal('on'), z.literal('true'), z.literal('false'), z.literal('')])
		.optional()
		.transform((value) => value === 'on' || value === 'true'),
	reminderDay: z.coerce.number().int().min(1).max(28).default(1)
});

export const contributionSchema = z.object({
	goalId: uuid,
	amount: money('el monto'),
	occurredAt: isoDateTime,
	note: optionalText(200)
});

/* ==========================================================================
   Deudas
   ========================================================================== */

export const debtSchema = z
	.object({
		name: z.string().trim().min(3, 'Escribe el nombre de la deuda').max(80),
		creditor: optionalText(80),
		kind: z.enum(['credit_card', 'personal', 'family', 'mortgage', 'other']),
		principalAmount: money('el monto total'),
		initialAmount: money('el monto inicial', { allowZero: true }),
		totalInstallments: z.coerce
			.number()
			.int()
			.min(1, 'Mínimo 1 cuota')
			.max(600, 'Máximo 600 cuotas'),
		paidInstallments: z.coerce.number().int().min(0).max(600).default(0),
		monthlyPayment: money('la cuota'),
		paymentFrequency: z.enum(['weekly', 'biweekly', 'monthly']).default('monthly'),
		startedAt: isoDate,
		interestKind: z.enum(['msi', 'fixed', 'variable']),
		interestRate: z.coerce
			.number()
			.min(0, 'No puede ser negativo')
			.max(200, 'Revisa la tasa')
			.default(0),
		dueDay: z.coerce.number().int().min(1, 'Día inválido').max(31, 'Día inválido'),
		firstDueDate: isoDate,
		alertDaysBefore: z.coerce.number().int().min(0).max(30).default(5),
		accountId: z.union([uuid, z.literal('')]).optional(),
		notes: optionalText(300)
	})
	.refine((data) => data.initialAmount <= data.principalAmount, {
		message: 'El monto inicial no puede superar el monto total',
		path: ['initialAmount']
	});

export const paymentSchema = z.object({
	debtId: uuid,
	amount: money('el monto'),
	accountId: z.union([uuid, z.literal('')]).optional(),
	occurredAt: isoDateTime,
	isExtra: z
		.union([z.literal('on'), z.literal('true'), z.literal('false'), z.literal('')])
		.optional()
		.transform((value) => value === 'on' || value === 'true'),
	note: optionalText(200)
});

/* ==========================================================================
   Cuentas, categorías, presupuesto y perfil
   ========================================================================== */

export const accountSchema = z.object({
	name: z.string().trim().min(2, 'Escribe un nombre').max(60),
	kind: z.enum(['checking', 'savings', 'pocket', 'cash', 'credit']),
	currency: z.string().trim().length(3, 'Moneda inválida').toUpperCase(),
	openingBalance: money('el saldo inicial', { allowZero: true }),
	icon: z.string().trim().min(1).max(40).default('account_balance'),
	isPrimary: z
		.union([z.literal('on'), z.literal('true'), z.literal('false'), z.literal('')])
		.optional()
		.transform((value) => value === 'on' || value === 'true')
});

export const categorySchema = z.object({
	name: z.string().trim().min(2, 'Escribe un nombre').max(40),
	kind: z.enum(['expense', 'income']),
	icon: z.string().trim().min(1).max(40).default('category'),
	color: z
		.string()
		.trim()
		.regex(/^#[0-9a-fA-F]{6}$/, 'Elige un color válido')
		.default('#64748b')
});

export const budgetSchema = z.object({
	categoryId: uuid,
	amount: money('el límite', { allowZero: true }),
	periodMonth: isoDate
});

export const profileSchema = z.object({
	fullName: z.string().trim().min(2, 'Escribe tu nombre').max(80),
	currency: z.string().trim().length(3, 'Moneda inválida').toUpperCase(),
	monthlyBudget: money('el presupuesto mensual', { allowZero: true })
});

export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, 'Ingresa tu contraseña actual'),
		password,
		passwordConfirm: z.string()
	})
	.refine((data) => data.password === data.passwordConfirm, {
		message: 'Las contraseñas no coinciden',
		path: ['passwordConfirm']
	});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type DebtInput = z.infer<typeof debtSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
