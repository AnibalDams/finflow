<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import Sheet from '#lib/components/ui/Sheet.svelte';
	import type { DashboardAlert } from '#lib/types/domain';

	interface Props {
		alerts: DashboardAlert[];
		open?: boolean;
		onclose?: () => void;
	}

	let { alerts, open = $bindable(false), onclose }: Props = $props();

	const TONES = {
		danger: 'bg-tertiary/10 text-tertiary',
		warning: 'bg-amber-500/12 text-amber-700',
		info: 'bg-secondary/10 text-secondary',
		success: 'bg-primary/10 text-primary'
	} as const;
</script>

<Sheet
	title="Notificaciones"
	subtitle={alerts.length === 0 ? 'Todo en orden' : `${alerts.length} avisos activos`}
	bind:open
	{onclose}
>
	<div class="space-y-2.5 pt-1 pb-2">
		{#if alerts.length === 0}
			<div class="flex flex-col items-center gap-2 py-10 text-center">
				<span
					class="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
				>
					<Icon name="check_circle" size={26} filled />
				</span>
				<p class="text-label text-ink">Sin pendientes por ahora</p>
				<p class="max-w-64 text-body-sm text-muted">
					Te avisaremos cuando una cuota esté por vencer o el presupuesto llegue al límite.
				</p>
			</div>
		{:else}
			{#each alerts as alert (alert.id)}
				<article
					class="flex gap-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-3.5"
				>
					<span
						class="flex size-10 shrink-0 items-center justify-center rounded-full {TONES[
							alert.tone
						]}"
					>
						<Icon name={alert.icon} size={20} filled />
					</span>
					<div class="min-w-0">
						<p class="text-label text-ink">{alert.title}</p>
						<p class="mt-0.5 text-body-sm text-muted">{alert.description}</p>
					</div>
				</article>
			{/each}
		{/if}
	</div>
</Sheet>
