<script lang="ts">
	import { toasts } from '#lib/stores/toast.svelte';
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
			class="animate-rise pointer-events-auto flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-label shadow-elevated {TONES[
				toast.tone
			].klass}"
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
		</div>
	{/each}
</div>
