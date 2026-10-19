import { describe, expect, it } from 'vitest';
import {
	accountSchema,
	budgetSchema,
	categorySchema,
	changePasswordSchema,
	contributionSchema,
	debtSchema,
	fieldErrors,
	goalSchema,
	loginSchema,
	paymentSchema,
	profileSchema,
	registerSchema,
	transactionSchema,
	transferSchema
} from './validation';

const uuid = '11111111-1111-4111-8111-111111111111';
const otherUuid = '22222222-2222-4222-8222-222222222222';

describe('fieldErrors', () => {
	it('convierte los issues de Zod en un mapa campo → mensaje', () => {
		const result = accountSchema.safeParse({
			name: 'A',
			kind: 'nope',
			currency: 'US',
			openingBalance: '0',
			icon: 'wallet',
			isPrimary: ''
		});
		expect(result.success).toBe(false);
		if (result.success) return;
		const errors = fieldErrors(result.error);
		expect(Object.keys(errors).sort()).toEqual(['currency', 'kind', 'name']);
		expect(errors.name).toBe('Escribe un nombre');
	});
});

describe('autenticación', () => {
	it('normaliza el correo y exige contraseña', () => {
		const login = loginSchema.parse({ email: ' Demo@FinFlow.app ', password: 'x' });
		expect(login.email).toBe('demo@finflow.app');
		expect(loginSchema.safeParse({ email: 'no-es-correo', password: 'x' }).success).toBe(false);
	});

	it('valida el registro y la confirmación de contraseña', () => {
		const base = {
			fullName: 'Sofía Ramírez',
			email: 'sofia@finflow.app',
			password: 'FinFlow2026!',
			currency: 'usd'
		};
		const register = registerSchema.parse({ ...base, passwordConfirm: 'FinFlow2026!' });
		expect(register.currency).toBe('USD');

		const mismatch = registerSchema.safeParse({ ...base, passwordConfirm: 'Otra' });
		expect(mismatch.success).toBe(false);
		if (mismatch.success) return;
		expect(fieldErrors(mismatch.error).passwordConfirm).toBe('Las contraseñas no coinciden');
	});

	it('exige 8 caracteres en el cambio de contraseña', () => {
		const short = changePasswordSchema.safeParse({ password: 'corta', passwordConfirm: 'corta' });
		expect(short.success).toBe(false);
		expect(
			changePasswordSchema.safeParse({ password: 'LargaClave1', passwordConfirm: 'LargaClave1' })
				.success
		).toBe(true);
	});
});

describe('movimientos', () => {
	const base = {
		type: 'expense',
		amount: '1,234.56',
		accountId: uuid,
		categoryId: uuid,
		concept: 'Supermercado',
		occurredAt: '2026-10-18T09:30:00.000Z'
	};

	it('acepta un gasto válido y normaliza el monto', () => {
		const parsed = transactionSchema.parse(base);
		expect(parsed.amount).toBe(1234.56);
		expect(parsed.tags).toEqual([]);
	});

	it('rechaza montos en cero o negativos', () => {
		expect(transactionSchema.safeParse({ ...base, amount: '0' }).success).toBe(false);
		const result = transactionSchema.safeParse({ ...base, amount: '0' });
		if (result.success) return;
		expect(fieldErrors(result.error).amount).toBe('el monto debe ser mayor a cero');
	});

	it('exige concepto y cuenta', () => {
		expect(transactionSchema.safeParse({ ...base, concept: 'a' }).success).toBe(false);
		expect(transactionSchema.safeParse({ ...base, accountId: 'no-uuid' }).success).toBe(false);
	});

	it('limpia y limita las etiquetas', () => {
		const parsed = transactionSchema.parse({
			...base,
			tags: ' #Casa, mercado ,, ,'
		});
		expect(parsed.tags).toEqual(['Casa', 'mercado']);
	});

	it('exige cuentas distintas en una transferencia', () => {
		const transfer = transferSchema.safeParse({
			fromAccountId: uuid,
			toAccountId: uuid,
			amount: '100',
			concept: '',
			occurredAt: '2026-10-18T09:30:00.000Z'
		});
		expect(transfer.success).toBe(false);
		if (transfer.success) return;
		expect(fieldErrors(transfer.error).toAccountId).toBe('Elige dos cuentas distintas');
	});
});

describe('planes y deudas', () => {
	it('valida una meta con aportación inicial opcional', () => {
		const goal = goalSchema.parse({
			name: 'Viaje a Japón',
			targetAmount: '3,000',
			initialAmount: '0',
			targetDate: '2027-03-01',
			category: 'travel',
			accountId: '',
			monthlyContribution: '250',
			reminderEnabled: 'on',
			reminderDay: '5'
		});
		expect(goal).toMatchObject({
			targetAmount: 3000,
			initialAmount: 0,
			monthlyContribution: 250,
			reminderEnabled: true,
			reminderDay: 5,
			accountId: ''
		});
		expect(goal.description).toBeNull();
	});

	it('valida una deuda con su régimen de interés', () => {
		const raw = {
			name: 'Tarjeta de crédito',
			creditor: '',
			kind: 'credit_card',
			principalAmount: '12,000',
			initialAmount: '1,000',
			totalInstallments: '12',
			paidInstallments: '2',
			monthlyPayment: '1,000',
			paymentFrequency: 'monthly',
			startedAt: '2026-01-10',
			interestKind: 'msi',
			interestRate: '0',
			dueDay: '10',
			firstDueDate: '2026-11-10',
			alertDaysBefore: '5',
			accountId: uuid,
			notes: ''
		};
		const debt = debtSchema.parse(raw);
		expect(debt).toMatchObject({
			principalAmount: 12_000,
			initialAmount: 1000,
			totalInstallments: 12,
			paidInstallments: 2,
			monthlyPayment: 1000,
			paymentFrequency: 'monthly',
			startedAt: '2026-01-10',
			interestKind: 'msi',
			creditor: null,
			notes: null
		});

		expect(debtSchema.safeParse({ ...raw, totalInstallments: 0 }).success).toBe(false);
		expect(debtSchema.safeParse({ ...raw, dueDay: 40 }).success).toBe(false);
		expect(debtSchema.safeParse({ ...raw, interestRate: 250 }).success).toBe(false);
		expect(debtSchema.safeParse({ ...raw, paymentFrequency: 'daily' }).success).toBe(false);
		expect(
			debtSchema.safeParse({ ...raw, initialAmount: '12,000', principalAmount: '12,000' }).success
		).toBe(true);
		expect(
			debtSchema.safeParse({ ...raw, initialAmount: '12,001', principalAmount: '12,000' }).success
		).toBe(false);
	});

	it('valida aportaciones y pagos', () => {
		expect(
			contributionSchema.parse({
				goalId: uuid,
				amount: '500',
				occurredAt: '2026-10-18T12:00:00.000Z',
				note: ''
			})
		).toMatchObject({ amount: 500, note: null });

		expect(
			paymentSchema.parse({
				debtId: uuid,
				amount: '1,000',
				accountId: '',
				occurredAt: '2026-10-18T12:00:00.000Z',
				isExtra: 'on',
				note: ''
			})
		).toMatchObject({ amount: 1000, isExtra: true, accountId: '' });
	});
});

describe('cuentas, categorías y perfil', () => {
	it('acepta saldo inicial cero y normaliza la moneda', () => {
		const account = accountSchema.parse({
			name: 'Efectivo',
			kind: 'cash',
			currency: 'usd',
			openingBalance: '0',
			icon: 'wallet',
			isPrimary: 'on'
		});
		expect(account).toMatchObject({ currency: 'USD', openingBalance: 0, isPrimary: true });

		expect(
			accountSchema.parse({
				name: 'Efectivo',
				kind: 'cash',
				currency: 'USD',
				openingBalance: '0',
				icon: 'wallet',
				isPrimary: ''
			}).isPrimary
		).toBe(false);
	});

	it('rechaza saldos negativos y tipos desconocidos', () => {
		expect(
			accountSchema.safeParse({
				name: 'Efectivo',
				kind: 'cash',
				currency: 'USD',
				openingBalance: '-10',
				icon: 'wallet',
				isPrimary: ''
			}).success
		).toBe(false);
		expect(
			accountSchema.safeParse({
				name: 'Efectivo',
				kind: 'cheque',
				currency: 'USD',
				openingBalance: '0',
				icon: 'wallet',
				isPrimary: ''
			}).success
		).toBe(false);
	});

	it('valida el color de la categoría', () => {
		expect(
			categorySchema.parse({
				name: 'Alimentos',
				kind: 'expense',
				icon: 'restaurant',
				color: '#10B981'
			}).color
		).toBe('#10B981');
		expect(
			categorySchema.safeParse({
				name: 'Alimentos',
				kind: 'expense',
				icon: 'restaurant',
				color: 'verde'
			}).success
		).toBe(false);
	});

	it('permite presupuesto cero y exige mes válido', () => {
		expect(
			budgetSchema.parse({ categoryId: uuid, amount: '0', periodMonth: '2026-10-01' })
		).toMatchObject({ amount: 0 });
		expect(
			budgetSchema.safeParse({ categoryId: uuid, amount: '100', periodMonth: '2026-10' }).success
		).toBe(false);
	});

	it('valida el perfil con presupuesto cero', () => {
		const profile = profileSchema.parse({
			fullName: 'Sofía Ramírez',
			currency: 'mxn',
			monthlyBudget: '0'
		});
		expect(profile).toMatchObject({ currency: 'MXN', monthlyBudget: 0 });
		expect(
			profileSchema.safeParse({ fullName: 'S', currency: 'MXN', monthlyBudget: '0' }).success
		).toBe(false);
	});
});
