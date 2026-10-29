/**
 * Estado de las notificaciones push en el navegador.
 *
 * La suscripción es por dispositivo: el servidor guarda una fila por endpoint y
 * envía a todas ellas. El cron decide a quién, según la hora local del perfil.
 */

import { PUBLIC_VAPID_PUBLIC_KEY } from '$app/env/public';
import { urlBase64ToUint8Array } from '#lib/utils/notifications';

export type PushState = 'unsupported' | 'unconfigured' | 'blocked' | 'inactive' | 'active';

class PushStore {
	supported = $state(false);
	permission = $state<NotificationPermission>('default');
	subscribed = $state(false);
	busy = $state(false);
	initialized = $state(false);
	error = $state<string | null>(null);

	get configured(): boolean {
		return PUBLIC_VAPID_PUBLIC_KEY.length > 0;
	}

	get state(): PushState {
		if (!this.supported) return 'unsupported';
		if (!this.configured) return 'unconfigured';
		if (this.permission === 'denied') return 'blocked';
		return this.subscribed ? 'active' : 'inactive';
	}

	/** Se llama al montar la sección de ajustes (necesita `window`). */
	async init(): Promise<void> {
		if (typeof window === 'undefined' || this.initialized) return;
		this.initialized = true;

		this.supported =
			'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

		if (!this.supported) return;

		this.permission = Notification.permission;
		if (!this.configured) return;

		try {
			const registration = await navigator.serviceWorker.getRegistration();
			const subscription = await registration?.pushManager.getSubscription();
			this.subscribed = Boolean(subscription);

			// Auto-curación: el navegador puede revocar el endpoint sin avisar.
			if (this.permission === 'granted' && !subscription) await this.subscribe();
		} catch {
			this.subscribed = false;
		}
	}

	/** Pide permiso y suscribe este dispositivo. Requiere un gesto del usuario. */
	async enable(): Promise<boolean> {
		if (!this.supported || !this.configured || this.busy) return false;

		this.busy = true;
		this.error = null;

		try {
			this.permission = await Notification.requestPermission();
			if (this.permission !== 'granted') return false;

			await this.subscribe();
			return this.subscribed;
		} catch {
			this.error = 'No pudimos activar las notificaciones en este dispositivo.';
			return false;
		} finally {
			this.busy = false;
		}
	}

	/** Quita la suscripción de este dispositivo (los demás no se tocan). */
	async disable(): Promise<void> {
		if (this.busy) return;

		this.busy = true;
		this.error = null;

		try {
			const registration = await navigator.serviceWorker.getRegistration();
			const subscription = await registration?.pushManager.getSubscription();

			if (subscription) {
				await fetch('/api/push/subscribe', {
					method: 'DELETE',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ endpoint: subscription.endpoint })
				});
				await subscription.unsubscribe();
			}

			this.subscribed = false;
		} catch {
			this.error = 'No pudimos desactivar las notificaciones.';
		} finally {
			this.busy = false;
		}
	}

	/** Envía una notificación de prueba a los dispositivos de esta cuenta. */
	async sendTest(): Promise<{ sent: number; failed: number } | null> {
		if (this.busy) return null;

		this.busy = true;
		this.error = null;

		try {
			const response = await fetch('/api/push/test', { method: 'POST' });
			if (!response.ok) {
				this.error = 'No pudimos enviar la prueba.';
				return null;
			}
			return (await response.json()) as { sent: number; failed: number };
		} catch {
			this.error = 'No pudimos enviar la prueba.';
			return null;
		} finally {
			this.busy = false;
		}
	}

	private async subscribe(): Promise<void> {
		const registration = await navigator.serviceWorker.ready;
		const existing = await registration.pushManager.getSubscription();

		const subscription =
			existing ??
			(await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_PUBLIC_KEY)
			}));

		const response = await fetch('/api/push/subscribe', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(subscription.toJSON())
		});

		if (!response.ok) throw new Error('subscribe_failed');

		this.subscribed = true;
	}
}

export const push = new PushStore();
