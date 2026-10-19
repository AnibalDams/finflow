<script lang="ts">
	import { cn } from '#lib/utils/cn';
	import { formatMoney, formatPercent } from '#lib/utils/money';

	export interface DonutSegment {
		id: string;
		label: string;
		value: number;
		color: string;
	}

	interface Props {
		segments: DonutSegment[];
		centerLabel?: string;
		/** Si se indica, reemplaza al total en el centro. */
		centerValue?: string;
		centerCaption?: string;
		currency?: string;
		class?: string;
	}

	let {
		segments,
		centerLabel = 'Total',
		centerValue,
		centerCaption,
		currency = 'USD',
		class: className = ''
	}: Props = $props();

	const SIZE = 168;
	const THICKNESS = 22;
	const RADIUS = (SIZE - THICKNESS) / 2;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

	const total = $derived(segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0));

	const slices = $derived.by(() => {
		let offset = 0;
		return segments
			.filter((segment) => segment.value > 0)
			.map((segment) => {
				const share = total > 0 ? segment.value / total : 0;
				const length = share * CIRCUMFERENCE;
				const slice = {
					...segment,
					share,
					dash: `${length} ${CIRCUMFERENCE - length}`,
					offset: -offset
				};
				offset += length;
				return slice;
			});
	});
</script>

<div class={cn('flex flex-col items-center gap-5', className)}>
	<div class="relative shrink-0">
		<svg viewBox="0 0 {SIZE} {SIZE}" width={SIZE} height={SIZE} role="img" aria-label="Distribución por categoría">
			<circle
				cx={SIZE / 2}
				cy={SIZE / 2}
				r={RADIUS}
				fill="none"
				stroke="var(--color-level-1)"
				stroke-width={THICKNESS}
			/>
			{#each slices as slice, index (slice.id)}
				<circle
					class="donut-slice"
					cx={SIZE / 2}
					cy={SIZE / 2}
					r={RADIUS}
					fill="none"
					stroke={slice.color}
					stroke-width={THICKNESS}
					stroke-dasharray={slice.dash}
					stroke-dashoffset={slice.offset}
					stroke-linecap="butt"
					transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
					style="--dash-start:{CIRCUMFERENCE};--dash-end:{slice.offset};animation-delay:{index *
						60}ms"
				/>
			{/each}
		</svg>

		<div class="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
			<span class="text-label-sm tracking-wide text-muted-soft uppercase">{centerLabel}</span>
			{#if centerValue}
				<span class="tnum text-title-md font-bold text-ink">{centerValue}</span>
				{#if centerCaption}
					<span class="max-w-24 truncate text-body-sm font-semibold text-primary">{centerCaption}</span>
				{/if}
			{:else}
				<span class="tnum text-title-md text-ink">{formatMoney(total, currency)}</span>
			{/if}
		</div>
	</div>

	<ul class="grid w-full grid-cols-2 gap-x-3 gap-y-3">
		{#each slices as slice, index (slice.id)}
			<li class="animate-stagger min-w-0" style="animation-delay:{index * 60}ms">
				<span class="flex items-center gap-2">
					<span
						class="size-2 shrink-0 rounded-full"
						style="background-color:{slice.color}"
						aria-hidden="true"
					></span>
					<span class="truncate text-body-sm font-medium text-on-surface">{slice.label}</span>
				</span>
				<span class="tnum mt-0.5 block pl-4 text-label-sm text-muted">
					{formatMoney(slice.value, currency)} ({formatPercent(slice.share * 100)})
				</span>
			</li>
		{/each}
		{#if slices.length === 0}
			<li class="col-span-2 py-2 text-center text-body-sm text-muted">Sin datos en el periodo</li>
		{/if}
	</ul>
</div>

<style>
	.donut-slice {
		animation: donut-draw 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes donut-draw {
		from {
			stroke-dashoffset: var(--dash-start);
			opacity: 0;
		}
		to {
			stroke-dashoffset: var(--dash-end);
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.donut-slice {
			animation: none;
		}
	}
</style>
