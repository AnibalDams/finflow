import type { FieldErrors } from './validation';

/** Estado devuelto por las `actions` de formulario. */
export type FormState = {
	message?: string;
	errors?: FieldErrors;
	values?: Record<string, string>;
	success?: boolean;
};

export function readString(form: FormData, key: string): string {
	const value = form.get(key);
	return typeof value === 'string' ? value : '';
}

export function readFile(form: FormData, key: string): File | null {
	const value = form.get(key);
	return value instanceof File && value.size > 0 ? value : null;
}

/** Conserva los valores enviados para repintar el formulario tras un error. */
export function formValues(form: FormData, keys: readonly string[]): Record<string, string> {
	const values: Record<string, string> = {};
	for (const key of keys) values[key] = readString(form, key);
	return values;
}
