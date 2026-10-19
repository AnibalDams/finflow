/**
 * Utilidades monetarias.
 *
 * Todo el dinero se calcula en centavos enteros para evitar el arrastre de
 * errores de coma flotante, y se formatea con agrupación estilo `1,234.56`
 * (formato de los diseños) independientemente del idioma de la interfaz.
 */

const SYMBOLS: Record<string, string> = {
	USD: '$',
	MXN: '$',
	COP: '$',
	ARS: '$',
	CLP: '$',
	PEN: 'S/',
	BRL: 'R$',
	EUR: '€',
	GBP: '£'
};

const NUMBER_FORMAT = new Intl.NumberFormat('en-US', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

/** Convierte un monto decimal a centavos enteros. */
export function toCents(amount: number): number {
	return Math.round(amount * 100);
}

/** Convierte centavos enteros a monto decimal. */
export function fromCents(cents: number): number {
	return cents / 100;
}

/** Suma montos decimales sin perder precisión. */
export function sumAmounts(amounts: Iterable<number>): number {
	let cents = 0;
	for (const amount of amounts) cents += toCents(amount);
	return fromCents(cents);
}

/** Redondea a dos decimales. */
export function round2(amount: number): number {
	return fromCents(toCents(amount));
}

export function currencySymbol(currency = 'USD'): string {
	return SYMBOLS[currency.toUpperCase()] ?? currency.toUpperCase();
}

/** `$8,450.20` · `-S/1,200.00` */
export function formatMoney(amount: number, currency = 'USD', options: { sign?: boolean } = {}): string {
	const negative = amount < 0;
	const absolute = NUMBER_FORMAT.format(Math.abs(amount));
	const prefix = negative ? '−' : options.sign ? '+' : '';
	return `${prefix}${currencySymbol(currency)}${absolute}`;
}

export type AmountDirection = 'income' | 'expense' | 'transfer';

/** Monto con signo según el tipo de movimiento: `+$3,200.00` · `-$142.80`. */
export function formatSignedAmount(amount: number, type: AmountDirection, currency = 'USD'): string {
	if (type === 'transfer') return formatMoney(amount, currency);
	return `${type === 'income' ? '+' : '−'}${currencySymbol(currency)}${NUMBER_FORMAT.format(Math.abs(amount))}`;
}

/** `$1.2K`, `$340` — para ejes de gráficos y espacios reducidos. */
export function formatCompactMoney(amount: number, currency = 'USD'): string {
	const symbol = currencySymbol(currency);
	const absolute = Math.abs(amount);
	if (absolute >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
	if (absolute >= 10_000) return `${symbol}${Math.round(amount / 1000)}K`;
	if (absolute >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
	return `${symbol}${NUMBER_FORMAT.format(amount)}`;
}

export function formatPercent(value: number, digits = 0): string {
	return `${value.toFixed(digits)}%`;
}

/**
 * Interpreta el texto de un campo de monto.
 * Acepta `1,234.56`, `1234,56`, `$1 234,56` y devuelve `null` si no es válido.
 */
export function parseAmountInput(input: string): number | null {
	if (typeof input !== 'string') return null;
	let value = input.trim().replace(/[^\d.,-]/g, '');
	if (!value) return null;

	const lastComma = value.lastIndexOf(',');
	const lastDot = value.lastIndexOf('.');

	if (lastComma > -1 && lastDot > -1) {
		// El último separador es el decimal; el otro es de miles
		if (lastComma > lastDot) {
			value = value.replace(/\./g, '').replace(',', '.');
		} else {
			value = value.replace(/,/g, '');
		}
	} else if (lastComma > -1) {
		const decimals = value.length - lastComma - 1;
		value = decimals <= 2 ? value.replace(',', '.') : value.replace(/,/g, '');
	}

	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return null;
	return round2(parsed);
}

/** Formatea el monto para un `<input>` editable: sin símbolo ni separador de miles. */
export function toAmountInput(amount: number): string {
	return amount === 0 ? '' : amount.toFixed(2);
}
