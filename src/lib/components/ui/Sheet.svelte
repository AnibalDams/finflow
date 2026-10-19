<script lang="ts">
	import { cubicIn, cubicOut } from 'svelte/easing';
	import { fade, fly } from 'svelte/transition';
	import type { Snippet } from 'svelte';
	import { motionDuration } from '#lib/utils/motion';
	import Icon from './Icon.svelte';

	interface Props {
		title: string;
		subtitle?: string;
		open?: boolean;
		children?: Snippet;
		footer?: Snippet;
		/** Elemento que recupera el foco al cerrar; si se omite, el activo al abrir. */
		returnFocus?: HTMLElement | null;
		onclose?: () => void;
	}

	let {
		title,
		subtitle,
		open = $bindable(false),
		children,
		footer,
		returnFocus = null,
		onclose
	}: Props = $props();

	let panel = $state<HTMLDivElement | null>(null);
	let wasOpen = false;
	let restoreTarget: HTMLElement | null = null;

	const FOCUSABLE =
		'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

	function close(): void {
		open = false;
		onclose?.();
	}

	function focusables(): HTMLElement[] {
		if (!panel) return [];
		return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
			(element) => element.tabIndex >= 0 && element.getClientRects().length > 0
		);
	}

	function onKeydown(event: KeyboardEvent): void {
		if (!open) return;

		if (event.key === 'Escape') {
			close();
			return;
		}

		if (event.key !== 'Tab' || !panel) return;

		const items = focusables();
		if (items.length === 0) {
			event.preventDefault();
			panel.focus();
			return;
		}

		const first = items[0];
		const last = items[items.length - 1];
		const active = document.activeElement as HTMLElement | null;

		if (event.shiftKey) {
			if (active === first || active === panel || !panel.contains(active)) {
				event.preventDefault();
				last.focus();
			}
		} else if (active === last || !panel.contains(active)) {
			event.preventDefault();
			first.focus();
		}
	}

	$effect(() => {
		if (open) {
			if (!wasOpen) {
				wasOpen = true;
				restoreTarget = returnFocus ?? (document.activeElement as HTMLElement | null);
				// El panel recibe el foco; un consumidor puede moverlo después (p. ej. OptionSheet).
				panel?.focus({ preventScroll: true });
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
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<div class="fixed inset-0 z-90 mx-auto flex max-w-[430px] flex-col justify-end" style="margin-block:0">
		<button
			type="button"
			class="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
			aria-label="Cerrar"
			onclick={close}
			transition:fade={{ duration: motionDuration(160) }}
		></button>

		<div
			class="relative z-10 flex max-h-[86dvh] flex-col overflow-hidden rounded-t-3xl bg-surface-container-lowest shadow-sheet outline-none"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			tabindex="-1"
			bind:this={panel}
			in:fly={{ y: 48, duration: motionDuration(220), easing: cubicOut }}
			out:fly={{ y: 64, duration: motionDuration(160), easing: cubicIn }}
		>
			<header class="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
				<div class="min-w-0">
					<h2 class="text-title-md text-ink">{title}</h2>
					{#if subtitle}
						<p class="text-body-sm text-muted">{subtitle}</p>
					{/if}
				</div>
				<button
					type="button"
					class="flex size-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-level-1"
					aria-label="Cerrar"
					onclick={close}
				>
					<Icon name="close" size={20} />
				</button>
			</header>

			<div class="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
				{@render children?.()}
			</div>

			{#if footer}
				<footer class="border-t border-hairline px-5 pt-3 pb-4 pb-safe">
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}
