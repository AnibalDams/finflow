<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { cn } from '#lib/utils/cn';
	import {
		formatLongDate,
		formatMonthName,
		monthGrid,
		parseISODate,
		startOfMonth,
		toISODate
	} from '#lib/utils/dates';
	import Icon from './Icon.svelte';

	interface Props {
		/** Fecha seleccionada en formato `YYYY-MM-DD`. */
		value?: string;
		onselect?: (value: string) => void;
	}

	let { value = $bindable(''), onselect }: Props = $props();

	const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
	const today = toISODate(new Date());

	let view = $state(startOfMonth(value ? parseISODate(value) : new Date()));
	const cells = $derived(monthGrid(view));
	const monthLabel = $derived(formatMonthName(view, true));
	/** Día que recibe el foco al abrir y el único con `tabindex=0`. */
	const focused = $derived(
		value && cells.some((cell) => cell.date === value)
			? value
			: (cells.find((cell) => cell.inMonth)?.date ?? today)
	);

	let grid = $state<HTMLDivElement | null>(null);

	function focusDate(date: string): void {
		tick().then(() => {
			grid?.querySelector<HTMLButtonElement>(`button[data-day="${date}"]`)?.focus();
		});
	}

	onMount(() => focusDate(focused));

	function shiftMonth(amount: number): void {
		view = new Date(view.getFullYear(), view.getMonth() + amount, 1);
	}

	function choose(date: string): void {
		value = date;
		onselect?.(date);
	}

	function chooseToday(): void {
		view = startOfMonth(new Date());
		choose(today);
	}

	function onDayKeydown(event: KeyboardEvent): void {
		const date = (event.currentTarget as HTMLElement | null)?.dataset.day;
		if (!date) return;

		const index = cells.findIndex((cell) => cell.date === date);
		if (index < 0) return;

		const column = index % 7;
		let next: number;

		switch (event.key) {
			case 'ArrowLeft':
				next = index - 1;
				break;
			case 'ArrowRight':
				next = index + 1;
				break;
			case 'ArrowUp':
				next = index - 7;
				break;
			case 'ArrowDown':
				next = index + 7;
				break;
			case 'Home':
				next = index - column;
				break;
			case 'End':
				next = index - column + 6;
				break;
			default:
				return;
		}

		if (next < 0 || next >= cells.length) return;

		event.preventDefault();
		focusDate(cells[next].date);
	}
</script>

<div class="space-y-2">
	<header class="flex items-center justify-between gap-1">
		<button
			type="button"
			class="flex size-8 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-level-1"
			aria-label="Mes anterior"
			onclick={() => shiftMonth(-1)}
		>
			<Icon name="chevron_left" size={20} />
		</button>

		<p class="text-label font-semibold text-ink" aria-live="polite">{monthLabel}</p>

		<button
			type="button"
			class="flex size-8 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-level-1"
			aria-label="Mes siguiente"
			onclick={() => shiftMonth(1)}
		>
			<Icon name="chevron_right" size={20} />
		</button>
	</header>

	<div class="grid grid-cols-7 gap-0.5" aria-hidden="true">
		{#each WEEKDAYS as weekday (weekday)}
			<span class="py-1 text-center text-label-xs text-muted">{weekday}</span>
		{/each}
	</div>

	<div class="grid grid-cols-7 gap-0.5" role="group" aria-label={monthLabel} bind:this={grid}>
		{#each cells as cell (cell.date)}
			{@const isSelected = cell.date === value}
			{@const isToday = cell.date === today}
			<button
				type="button"
				data-day={cell.date}
				tabindex={cell.date === focused ? 0 : -1}
				aria-label={formatLongDate(cell.date)}
				aria-current={isToday ? 'date' : undefined}
				aria-pressed={isSelected}
				class={cn(
					'flex h-9 items-center justify-center rounded-xl text-body font-semibold transition',
					isSelected
						? 'bg-secondary text-on-secondary shadow-card'
						: isToday
							? 'bg-secondary/10 text-secondary ring-1 ring-secondary/40 ring-inset'
							: cell.inMonth
								? 'text-ink hover:bg-secondary/8'
								: 'text-muted-soft hover:bg-level-1'
				)}
				onkeydown={onDayKeydown}
				onclick={() => choose(cell.date)}
			>
				{cell.day}
			</button>
		{/each}
	</div>

	<footer class="pt-1">
		<button
			type="button"
			class="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-secondary/10 text-label-sm font-semibold text-secondary transition hover:bg-secondary/15"
			onclick={chooseToday}
		>
			<Icon name="today" size={18} />
			Hoy
		</button>
	</footer>
</div>
