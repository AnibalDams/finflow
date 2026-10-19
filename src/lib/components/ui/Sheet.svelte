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
	}

	let { title, subtitle, open = $bindable(false), children, footer }: Props = $props();

	function close(): void {
		open = false;
	}

	function onKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && open) close();
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<div class="fixed inset-0 z-90 mx-auto flex max-w-[430px] flex-col justify-end">
		<button
			type="button"
			class="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
			aria-label="Cerrar"
			onclick={close}
			transition:fade={{ duration: motionDuration(160) }}
		></button>

		<div
			class="relative z-10 flex max-h-[86dvh] flex-col overflow-hidden rounded-t-3xl bg-surface-container-lowest shadow-sheet"
			role="dialog"
			aria-modal="true"
			aria-label={title}
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
				<footer class="border-t border-hairline px-5 pt-3 pb-safe pb-4">
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}
