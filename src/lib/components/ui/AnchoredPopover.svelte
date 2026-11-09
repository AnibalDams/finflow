<script lang="ts">
	import type { Snippet } from 'svelte';
	import { tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { cn } from '#lib/utils/cn';
	import { motionDuration } from '#lib/utils/motion';

	interface Props {
		open?: boolean;
		/** Etiqueta accesible del panel. */
		label: string;
		/** Borde del contenedor al que se ancla el panel. */
		align?: 'start' | 'end';
		class?: string;
		/** Elemento que abre y cierra el panel. */
		trigger: Snippet;
		children?: Snippet;
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		label,
		align = 'start',
		class: className = '',
		trigger,
		children,
		onclose
	}: Props = $props();

	let root = $state<HTMLDivElement | null>(null);
	let panel = $state<HTMLDivElement | null>(null);
	let placement = $state<'bottom' | 'top'>('bottom');
	let wasOpen = false;
	let restoreTarget: HTMLElement | null = null;

	function close(): void {
		open = false;
		onclose?.();
	}

	$effect(() => {
		if (open) {
			if (!wasOpen) {
				wasOpen = true;
				restoreTarget = document.activeElement as HTMLElement | null;
			}
			return;
		}

		if (wasOpen) {
			wasOpen = false;
			const target = restoreTarget;
			restoreTarget = null;
			target?.focus({ preventScroll: true });
		}
	});

	// Abre hacia arriba cuando el panel no cabe bajo el campo, para no quedar
	// fuera del viewport en formularios largos.
	$effect(() => {
		if (!open) {
			placement = 'bottom';
			return;
		}

		tick().then(() => {
			if (!panel || !root) return;

			const gap = 8;
			const rect = root.getBoundingClientRect();
			const fitsBelow = rect.bottom + gap + panel.offsetHeight <= window.innerHeight;
			const fitsAbove = rect.top - gap - panel.offsetHeight >= 0;

			placement = !fitsBelow && fitsAbove ? 'top' : 'bottom';
		});
	});

	// Cierra al pulsar fuera del trigger y del panel. Se registra en el siguiente
	// frame para no capturar el mismo clic que abrió el panel.
	$effect(() => {
		if (!open) return;

		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as Node | null;
			if (!target || root?.contains(target)) return;
			close();
		};

		const frame = requestAnimationFrame(() =>
			document.addEventListener('pointerdown', onPointerDown, true)
		);

		return () => {
			cancelAnimationFrame(frame);
			document.removeEventListener('pointerdown', onPointerDown, true);
		};
	});

	function onKeydown(event: KeyboardEvent): void {
		if (!open || event.key !== 'Escape') return;
		event.stopPropagation();
		close();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="relative" bind:this={root}>
	{@render trigger()}

	{#if open}
		<div
			class={cn(
				'absolute z-50 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-3 shadow-elevated',
				align === 'end' ? 'right-0' : 'left-0',
				placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
				className
			)}
			role="dialog"
			aria-label={label}
			bind:this={panel}
			transition:fade={{ duration: motionDuration(140) }}
		>
			{@render children?.()}
		</div>
	{/if}
</div>
