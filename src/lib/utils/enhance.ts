import type { SubmitFunction } from '$app/forms';
import { notifyError, notifySuccess } from '#lib/stores/toast.svelte';
import type { FormState } from './forms';

export interface EnhanceOptions {
	/** Mensaje mostrado cuando la acción responde con éxito. */
	success?: string;
	/** Se ejecuta tras un éxito con los datos devueltos por la acción. */
	onSuccess?: (data: Record<string, unknown> | undefined) => void;
	/** Repinta los valores del formulario tras un fallo (por defecto `true`). */
	resetOnFailure?: boolean;
	/** Se ejecuta al iniciar el envío. */
	onStart?: () => void;
	/** Se ejecuta cuando termina el procesamiento de la respuesta. */
	onFinish?: () => void;
}

function failureMessage(data: FormState | undefined): string {
	if (data?.message) return data.message;
	const first = data?.errors ? Object.values(data.errors)[0] : undefined;
	return first ?? 'Revisa los datos ingresados.';
}

/**
 * Envío de formularios con `use:enhance`: muestra avisos, conserva los valores
 * ante errores de validación y mantiene la posición del scroll.
 */
export function enhanceForm(
	options: EnhanceOptions = {}
): SubmitFunction<Record<string, unknown> | undefined, FormState | undefined> {
	const { success, onSuccess, resetOnFailure = true, onStart, onFinish } = options;

	return () => {
		onStart?.();

		return async ({ result, update }) => {
			if (result.type === 'failure') {
				notifyError(failureMessage(result.data));
			} else if (result.type === 'error') {
				notifyError(result.error.message);
			} else if (result.type === 'success') {
				if (success) notifySuccess(success);
				onSuccess?.(result.data);
			} else if (result.type === 'redirect' && success) {
				notifySuccess(success);
			}

			await update({ reset: result.type === 'failure' ? !resetOnFailure : false });
			onFinish?.();
		};
	};
}
