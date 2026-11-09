<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { cn } from '#lib/utils/cn';
	import { formatInputTime } from '#lib/utils/dates';
	import { buttonClass } from './button-styles';
	import Icon from './Icon.svelte';

	interface Props {
		/** Hora seleccionada en formato `HH:mm`. */
		value?: string;
		onclose?: () => void;
	}

	let { value = $bindable(''), onclose }: Props = $props();

	const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
	const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
	const PRESETS = ['09:00', '12:00', '18:00', '21:00'];
	const NOW = formatInputTime(new Date());

	const hour = $derived(value ? value.slice(0, 2) : NOW.slice(0, 2));
	const minute = $derived(value ? value.slice(3, 5) : NOW.slice(3, 5));

	let hourList = $state<HTMLDivElement | null>(null);
	let minuteList = $state<HTMLDivElement | null>(null);

	function scrollToSelected(list: HTMLDivElement | null, key: string): void {
		const option = list?.querySelector<HTMLElement>(`[data-value="${key}"]`);
		if (!list || !option) return;
		list.scrollTop = Math.max(
			0,
			option.offsetTop - list.clientHeight / 2 + option.clientHeight / 2
		);
	}

	onMount(() => {
		tick().then(() => {
			scrollToSelected(hourList, hour);
			scrollToSelected(minuteList, minute);
		});
	});

	function pickHour(next: string): void {
		value = `${next}:${minute}`;
	}

	function pickMinute(next: string): void {
		value = `${hour}:${next}`;
	}

	function applyPreset(next: string): void {
		value = next;
		onclose?.();
	}

	const CHIP =
		'flex h-8 items-center justify-center rounded-full border border-hairline/70 px-3 text-label-sm font-semibold text-on-surface-variant transition hover:border-secondary/40 hover:bg-secondary/8 hover:text-secondary';
</script>

<div class="space-y-2.5">
	<div class="flex flex-wrap gap-1.5">
		<button type="button" class={CHIP} onclick={() => applyPreset(NOW)}>Ahora</button>
		{#each PRESETS as preset (preset)}
			<button
				type="button"
				class={cn(
					CHIP,
					value === preset &&
						'border-transparent bg-secondary text-on-secondary hover:bg-secondary/90 hover:text-on-secondary'
				)}
				onclick={() => applyPreset(preset)}
			>
				{preset}
			</button>
		{/each}
	</div>

	<div class="grid grid-cols-2 gap-1.5">
		<div>
			<p class="px-1 pb-1 text-label-xs tracking-[0.12em] text-muted uppercase">Hora</p>
			<div
				class="relative no-scrollbar max-h-52 overflow-y-auto rounded-xl border border-hairline/70 p-1"
				role="group"
				aria-label="Horas"
				bind:this={hourList}
			>
				{#each HOURS as option (option)}
					<button
						type="button"
						data-value={option}
						aria-label={`Hora ${option}`}
						aria-pressed={option === hour}
						class={cn(
							'flex h-8 w-full items-center justify-center rounded-lg text-body font-semibold transition',
							option === hour ? 'bg-secondary text-on-secondary' : 'text-ink hover:bg-secondary/8'
						)}
						onclick={() => pickHour(option)}
					>
						{option}
					</button>
				{/each}
			</div>
		</div>

		<div>
			<p class="px-1 pb-1 text-label-xs tracking-[0.12em] text-muted uppercase">Minutos</p>
			<div
				class="relative no-scrollbar max-h-52 overflow-y-auto rounded-xl border border-hairline/70 p-1"
				role="group"
				aria-label="Minutos"
				bind:this={minuteList}
			>
				{#each MINUTES as option (option)}
					<button
						type="button"
						data-value={option}
						aria-label={`Minuto ${option}`}
						aria-pressed={option === minute}
						class={cn(
							'flex h-8 w-full items-center justify-center rounded-lg text-body font-semibold transition',
							option === minute ? 'bg-secondary text-on-secondary' : 'text-ink hover:bg-secondary/8'
						)}
						onclick={() => pickMinute(option)}
					>
						{option}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<button type="button" class={buttonClass('tonal', 'sm', true)} onclick={() => onclose?.()}>
		<Icon name="check" size={18} />
		Listo
	</button>
</div>
