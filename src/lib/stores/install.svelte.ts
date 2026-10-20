/**
 * Estado de instalación de la PWA.
 *
 * `beforeinstallprompt` puede dispararse antes de que el usuario abra Ajustes,
 * por eso se captura una sola vez al iniciar el cliente (`hooks.client.ts`).
 */

/** Evento no incluido en la librería DOM de TypeScript. */
export interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[];
	readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
	prompt(): Promise<void>;
}

class InstallStore {
	event = $state<BeforeInstallPromptEvent | null>(null);
	installed = $state(false);
	ios = $state(false);
	initialized = $state(false);

	get canInstall(): boolean {
		return !this.installed && this.event !== null;
	}

	async prompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
		const event = this.event;
		if (!event) return 'unavailable';

		await event.prompt();
		const choice = await event.userChoice;
		this.event = null;

		if (choice.outcome === 'accepted') this.installed = true;
		return choice.outcome;
	}
}

export const install = new InstallStore();

/** Registra los eventos de instalación y detecta iOS/modo standalone. */
export function initInstall(): void {
	if (typeof window === 'undefined' || install.initialized) return;
	install.initialized = true;

	const media = window.matchMedia('(display-mode: standalone)');
	install.installed =
		media.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
	install.ios =
		/iphone|ipad|ipod/i.test(navigator.userAgent) ||
		(/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

	window.addEventListener('beforeinstallprompt', (event) => {
		event.preventDefault();
		install.event = event as BeforeInstallPromptEvent;
	});

	window.addEventListener('appinstalled', () => {
		install.event = null;
		install.installed = true;
	});

	media.addEventListener('change', (event) => {
		install.installed = event.matches;
	});
}
