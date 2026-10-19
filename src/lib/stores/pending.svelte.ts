/** Mutaciones de formulario en curso, para el indicador global de actividad. */

class PendingStore {
	/** Cantidad de envíos activos (pueden solaparse). */
	count = $state(0);

	get active(): boolean {
		return this.count > 0;
	}

	start(): void {
		this.count += 1;
	}

	finish(): void {
		this.count = Math.max(0, this.count - 1);
	}
}

export const pending = new PendingStore();
