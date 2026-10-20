/**
 * Actualizaciones del service worker.
 *
 * En cada navegación del cliente se busca una versión nueva. Si queda
 * esperando activación, el banner permite aplicarla con una recarga
 * controlada (SKIP_WAITING + controllerchange).
 */

class ServiceWorkerUpdateStore {
	updateReady = $state(false);
	activating = $state(false);

	private registration: ServiceWorkerRegistration | null = null;
	private listening = false;

	async check(): Promise<void> {
		if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

		try {
			const registration = await navigator.serviceWorker.getRegistration();
			if (!registration) return;

			this.watch(registration);
			this.updateReady = this.updateReady || Boolean(registration.waiting);

			await registration.update();
			this.updateReady = this.updateReady || Boolean(registration.waiting);
		} catch {
			// La comprobación es best-effort: un fallo de red no debe afectar la app.
		}
	}

	activate(): void {
		const waiting = this.registration?.waiting;
		if (!waiting || this.activating) return;

		this.activating = true;
		navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
			once: true
		});
		waiting.postMessage({ type: 'SKIP_WAITING' });

		// Si el navegador no activa el SW, permite reintentar.
		setTimeout(() => {
			this.activating = false;
		}, 6000);
	}

	private watch(registration: ServiceWorkerRegistration): void {
		this.registration = registration;
		if (this.listening) return;
		this.listening = true;

		registration.addEventListener('updatefound', () => {
			const installing = registration.installing;
			if (!installing) return;

			installing.addEventListener('statechange', () => {
				// Solo avisamos si ya había una versión controlando la página.
				if (installing.state === 'installed' && navigator.serviceWorker.controller) {
					this.updateReady = true;
				}
			});
		});
	}
}

export const swUpdate = new ServiceWorkerUpdateStore();
