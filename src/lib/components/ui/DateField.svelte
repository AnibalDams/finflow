<script lang="ts">
	import { cn } from '#lib/utils/cn';
	import { formatFullDate } from '#lib/utils/dates';
	import AnchoredPopover from './AnchoredPopover.svelte';
	import CalendarPanel from './CalendarPanel.svelte';
	import Icon from './Icon.svelte';
	import TimePanel from './TimePanel.svelte';

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
		/**
		 * En escritorio (≥1024 px) sustituye los controles nativos por el selector
		 * de la app. En móvil el campo se mantiene igual.
		 */
		desktop?: boolean;
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
		class: className = '',
		desktop = false
	}: Props = $props();

	// `lg` de Tailwind equivale a 1024 px. El HTML se sirve en modo móvil y se
	// corrige al montar, cuando `matchMedia` está disponible.
	let isDesktop = $state(false);

	$effect(() => {
		const media = window.matchMedia('(min-width: 1024px)');
		const sync = () => (isDesktop = media.matches);

		sync();
		media.addEventListener('change', sync);
		return () => media.removeEventListener('change', sync);
	});

	const useDesktopPicker = $derived(desktop && isDesktop);
	const dateText = $derived(/^\d{4}-\d{2}-\d{2}$/.test(date) ? formatFullDate(date) : '');
	const timeText = $derived(/^\d{2}:\d{2}$/.test(time) ? time : '');

	let openDate = $state(false);
	let openTime = $state(false);

	const CONTROL =
		'flex w-full items-center gap-2.5 rounded-2xl border bg-surface-container-lowest p-3 text-left shadow-card transition hover:border-secondary/40 focus-visible:border-secondary';
</script>

{#snippet control(
	icon: string,
	caption: string,
	shown: string,
	placeholder: string,
	expanded: boolean
)}
	<span
		class="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/12 text-secondary"
	>
		<Icon name={icon} size={20} />
	</span>
	<span class="min-w-0 flex-1">
		<span class="block text-label-sm text-muted">{caption}</span>
		<span
			class={cn('block truncate text-body font-semibold', shown ? 'text-ink' : 'text-muted-soft')}
		>
			{shown || placeholder}
		</span>
	</span>
	<Icon
		name="expand_more"
		size={20}
		class={cn('shrink-0 text-muted transition-transform duration-150', expanded && 'rotate-180')}
	/>
{/snippet}

<div class={cn('space-y-1.5', className)}>
	{#if useDesktopPicker}
		<div class={cn('grid gap-2', timeName ? 'grid-cols-2' : 'grid-cols-1')}>
			<AnchoredPopover bind:open={openDate} {label} class="w-[19.5rem]">
				{#snippet trigger()}
					<button
						type="button"
						class={cn(CONTROL, error ? 'border-tertiary/60' : 'border-hairline')}
						aria-haspopup="dialog"
						aria-expanded={openDate}
						aria-label={`${label}: ${dateText || 'sin fecha'}`}
						onclick={() => (openDate = !openDate)}
					>
						{@render control('event', label, dateText, 'Elegir fecha', openDate)}
					</button>
				{/snippet}

				<CalendarPanel bind:value={date} onselect={() => (openDate = false)} />
			</AnchoredPopover>

			{#if timeName}
				<AnchoredPopover bind:open={openTime} label={timeLabel} align="end" class="w-[15rem]">
					{#snippet trigger()}
						<button
							type="button"
							class={cn(CONTROL, 'border-hairline')}
							aria-haspopup="dialog"
							aria-expanded={openTime}
							aria-label={`${timeLabel}: ${timeText || 'sin hora'}`}
							onclick={() => (openTime = !openTime)}
						>
							{@render control('schedule', timeLabel, timeText, 'Elegir hora', openTime)}
						</button>
					{/snippet}

					<TimePanel bind:value={time} onclose={() => (openTime = false)} />
				</AnchoredPopover>
			{/if}
		</div>

		<!-- Conserva `name` y el valor para el envío del formulario. -->
		<input type="hidden" {name} value={date} />
		{#if timeName}
			<input type="hidden" name={timeName} value={time} />
		{/if}
	{:else}
		<div class={cn('grid gap-2', timeName ? 'grid-cols-2' : 'grid-cols-1')}>
			<label
				class={cn(
					'flex items-center gap-2.5 rounded-2xl border bg-surface-container-lowest p-3 shadow-card transition focus-within:border-secondary',
					error ? 'border-tertiary/60' : 'border-hairline'
				)}
			>
				<span
					class="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/12 text-secondary"
				>
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
					<span
						class="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/12 text-secondary"
					>
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
	{/if}

	{#if error}
		<p class="text-body-sm font-medium text-tertiary">{error}</p>
	{:else if hint}
		<p class="text-body-sm text-muted">{hint}</p>
	{/if}
</div>
