<script lang="ts">
	import { cn } from '#lib/utils/cn';
	import Icon from './Icon.svelte';

	interface Props {
		/** Nombre del campo de fecha. */
		name: string;
		date?: string;
		/** Nombre del campo de hora (opcional). */
		timeName?: string;
		time?: string;
		label?: string;
		timeLabel?: string;
		error?: string;
		hint?: string;
		class?: string;
	}

	let {
		name,
		date = $bindable(''),
		timeName,
		time = $bindable(''),
		label = 'Fecha',
		timeLabel = 'Hora',
		error,
		hint,
		class: className = ''
	}: Props = $props();
</script>

<div class={cn('space-y-1.5', className)}>
	<div class={cn('grid gap-2', timeName ? 'grid-cols-2' : 'grid-cols-1')}>
		<label
			class={cn(
				'flex items-center gap-2.5 rounded-2xl border bg-surface-container-lowest p-3 shadow-card transition focus-within:border-secondary',
				error ? 'border-tertiary/60' : 'border-hairline'
			)}
		>
			<span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/12 text-secondary">
				<Icon name="event" size={20} />
			</span>
			<span class="min-w-0 flex-1">
				<span class="block text-label-sm text-muted">{label}</span>
				<input
					type="date"
					{name}
					bind:value={date}
					required
					class="w-full min-w-0 bg-transparent text-body font-semibold text-ink focus:outline-none"
				/>
			</span>
		</label>

		{#if timeName}
			<label
				class="flex items-center gap-2.5 rounded-2xl border border-hairline bg-surface-container-lowest p-3 shadow-card transition focus-within:border-secondary"
			>
				<span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/12 text-secondary">
					<Icon name="schedule" size={20} />
				</span>
				<span class="min-w-0 flex-1">
					<span class="block text-label-sm text-muted">{timeLabel}</span>
					<input
						type="time"
						name={timeName}
						bind:value={time}
						class="w-full min-w-0 bg-transparent text-body font-semibold text-ink focus:outline-none"
					/>
				</span>
			</label>
		{/if}
	</div>

	{#if error}
		<p class="text-body-sm font-medium text-tertiary">{error}</p>
	{:else if hint}
		<p class="text-body-sm text-muted">{hint}</p>
	{/if}
</div>
