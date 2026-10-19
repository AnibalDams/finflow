<script lang="ts">
	import { untrack } from 'svelte';
	import { navigating } from '$app/state';
	import { pending } from '#lib/stores/pending.svelte';

	interface Props {
		/** Distancia desde el borde superior (bajo la cabecera correspondiente). */
		top?: string;
	}

	let { top = '0px' }: Props = $props();

	/** Navegaciones y guardados en curso comparten el mismo indicador. */
	const busy = $derived(navigating.to !== null || pending.active);

	let shown = $state(false);
	let showTimer: ReturnType<typeof setTimeout> | undefined;
	let hideTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		clearTimeout(showTimer);
		clearTimeout(hideTimer);

		if (busy) {
			// Retardo mínimo para no parpadear en navegaciones instantáneas.
			if (!untrack(() => shown)) showTimer = setTimeout(() => (shown = true), 90);
		} else {
			hideTimer = setTimeout(() => (shown = false), 160);
		}

		return () => {
			clearTimeout(showTimer);
			clearTimeout(hideTimer);
		};
	});
</script>

<div
	class="pointer-events-none fixed inset-x-0 z-100 mx-auto h-0.5 max-w-[430px] overflow-hidden transition-opacity duration-150 {shown
		? 'opacity-100'
		: 'opacity-0'}"
	style:top
	aria-hidden="true"
>
	<div
		class="nav-progress h-full w-full rounded-b-full bg-primary"
		class:nav-progress-active={shown}
	></div>
</div>
