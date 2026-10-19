<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';
	import { toasts } from '#lib/stores/toast.svelte';
	import { motionDuration } from '#lib/utils/motion';
	import Icon from './Icon.svelte';

	const TONES = {
		success: { icon: 'check_circle', klass: 'bg-primary text-on-primary' },
		error: { icon: 'error', klass: 'bg-tertiary text-on-tertiary' },
		info: { icon: 'info', klass: 'bg-inverse-surface text-inverse-on-surface' }
	} as const;
</script>

<div
	class="pointer-events-none fixed inset-x-0 bottom-24 z-100 mx-auto flex max-w-[430px] flex-col items-center gap-2 px-4"
	role="status"
	aria-live="polite"
>
	{#each toasts.items as toast (toast.id)}
		<div
			class="pointer-events-auto relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl px-3.5 py-2.5 text-label shadow-elevated {TONES[
				toast.tone
			].klass}"
			transition:fly={{ y: 14, duration: motionDuration(200), easing: cubicOut }}
		>
			<Icon name={TONES[toast.tone].icon} size={18} filled />
			<span class="min-w-0 flex-1">{toast.message}</span>
			<button
				type="button"
				class="shrink-0 rounded-full p-1 opacity-70 transition hover:opacity-100"
				aria-label="Cerrar aviso"
				onclick={() => toasts.dismiss(toast.id)}
			>
				<Icon name="close" size={16} />
			</button>

			{#if toast.duration > 0}
				<span
					class="toast-timer absolute inset-x-0 bottom-0 h-0.5 origin-left bg-current opacity-25"
					style="animation-duration:{toast.duration}ms"
					aria-hidden="true"
				></span>
			{/if}
		</div>
	{/each}
</div>

<style>
	.toast-timer {
		animation-name: toast-timer;
		animation-timing-function: linear;
		animation-fill-mode: both;
	}

	@keyframes toast-timer {
		from {
			transform: scaleX(1);
		}
		to {
			transform: scaleX(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.toast-timer {
			animation: none;
			opacity: 0;
		}
	}
</style>
