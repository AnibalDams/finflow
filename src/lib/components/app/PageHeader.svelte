<script lang="ts">
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import Icon from '#lib/components/ui/Icon.svelte';
	import { cn } from '#lib/utils/cn';

	interface Props {
		title: string;
		subtitle?: string;
		/** Destino del botón "atrás"; si se omite, se usa el historial. */
		backHref?: string;
		/** Muestra una X de cierre en lugar de la flecha. */
		close?: boolean;
		/** Centra el título (pantallas de creación). */
		centered?: boolean;
		action?: Snippet;
		class?: string;
		dirty?: boolean;
	}

	let {
		title,
		subtitle,
		backHref,
		close = false,
		centered = false,
		action,
		class: className = '',
		dirty = false
	}: Props = $props();

	function goBack(): void {
		if (dirty && !window.confirm('Hay cambios sin guardar. ¿Salir de todos modos?')) return;
		if (backHref) {
			goto(backHref);
			return;
		}
		if (window.history.length > 1) window.history.back();
		else goto('/');
	}
</script>

<header
	class={cn(
		'sticky top-0 z-40 border-b border-hairline/60 bg-surface/85 pt-safe backdrop-blur-xl lg:static lg:rounded-t-3xl lg:pt-0',
		className
	)}
>
	<div class={cn('flex h-16 items-center gap-2 px-3', centered && 'relative justify-center')}>
		<button
			type="button"
			class={cn(
				'flex size-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-level-1 hover:text-on-surface',
				centered && 'absolute left-3'
			)}
			aria-label={close ? 'Cerrar' : 'Volver'}
			onclick={goBack}
		>
			<Icon name={close ? 'close' : 'arrow_back'} size={22} />
		</button>

		<div class={cn('min-w-0 flex-1', centered && 'text-center')}>
			<h1 class="truncate text-title-sm text-ink">{title}</h1>
			{#if subtitle}
				<p class="truncate text-body-sm text-muted">{subtitle}</p>
			{/if}
		</div>

		<div class={cn(centered && 'absolute right-3')}>
			{@render action?.()}
		</div>
	</div>
</header>
