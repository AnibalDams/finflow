/** Valores aceptados por `cn`: cadenas, arreglos y mapas condicionales. */
export type ClassValue =
	| string
	| number
	| bigint
	| boolean
	| null
	| undefined
	| ClassValue[]
	| Record<string, unknown>;

/** Compone clases CSS omitiendo valores falsos. */
export function cn(...values: ClassValue[]): string {
	const classes: string[] = [];

	for (const value of values) {
		if (!value) continue;

		if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
			classes.push(String(value));
		} else if (Array.isArray(value)) {
			const nested = cn(...value);
			if (nested) classes.push(nested);
		} else {
			for (const [key, enabled] of Object.entries(value)) {
				if (enabled) classes.push(key);
			}
		}
	}

	return classes.join(' ');
}
