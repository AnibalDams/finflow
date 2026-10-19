/** Avisos efímeros de la aplicación (éxito, error, información). */

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastItem {
	id: number;
	message: string;
	tone: ToastTone;
	/** Duración visible en milisegundos. */
	duration: number;
}

let counter = 0;

class ToastStore {
	items = $state<ToastItem[]>([]);

	push(message: string, tone: ToastTone = 'info', duration = 3600): void {
		const clean = message.trim();
		if (!clean) return;
		const id = ++counter;
		this.items = [...this.items, { id, message: clean, tone, duration }];
		if (duration > 0) setTimeout(() => this.dismiss(id), duration);
	}

	dismiss(id: number): void {
		this.items = this.items.filter((item) => item.id !== id);
	}
}

export const toasts = new ToastStore();

export function notifySuccess(message: string): void {
	toasts.push(message, 'success');
}

export function notifyError(message: string): void {
	toasts.push(message, 'error', 5200);
}

export function notifyInfo(message: string): void {
	toasts.push(message, 'info');
}
