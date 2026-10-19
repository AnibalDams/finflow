import { prefersReducedMotion } from 'svelte/motion';

/**
 * Duración efectiva de una transición de Svelte.
 * Devuelve 0 si el sistema operativo pide movimiento reducido.
 */
export function motionDuration(ms: number): number {
	return prefersReducedMotion.current ? 0 : ms;
}
