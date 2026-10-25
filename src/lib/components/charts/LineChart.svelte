<script lang="ts">
	import { cn } from '#lib/utils/cn';
	import { formatCompactMoney } from '#lib/utils/money';

	export interface LineSeries {
		label: string;
		color: string;
		values: number[];
		dashed?: boolean;
	}

	interface Props {
		series: LineSeries[];
		/** Etiquetas del eje X (una por punto). */
		labels?: string[];
		currency?: string;
		height?: number;
		class?: string;
	}

	let {
		series,
		labels = [],
		currency = 'USD',
		height = 190,
		class: className = ''
	}: Props = $props();

	let container = $state<HTMLDivElement | null>(null);
	let measured = $state(0);

	$effect(() => {
		const element = container;
		if (!element) return;

		const observer = new ResizeObserver((entries) => {
			const width = entries[0]?.contentRect.width ?? 0;
			if (width > 0) measured = Math.round(width);
		});

		observer.observe(element);
		return () => observer.disconnect();
	});

	const WIDTH = $derived(Math.max(320, measured || 320));
	const PADDING = { top: 14, right: 18, bottom: 24, left: 40 };

	const max = $derived(
		Math.max(1, ...series.flatMap((item) => item.values.map((value) => Math.abs(value))))
	);

	function xFor(index: number, count: number): number {
		const usable = WIDTH - PADDING.left - PADDING.right;
		return PADDING.left + (count <= 1 ? usable / 2 : (index / (count - 1)) * usable);
	}

	const plotHeight = $derived(height - PADDING.top - PADDING.bottom);

	function yFor(value: number): number {
		const ratio = Math.max(0, Math.min(1, Math.abs(value) / max));
		return PADDING.top + (1 - ratio) * plotHeight;
	}

	function pathFor(values: number[]): string {
		if (values.length === 0) return '';
		return values
			.map(
				(value, index) =>
					`${index === 0 ? 'M' : 'L'} ${xFor(index, values.length).toFixed(2)} ${yFor(value).toFixed(2)}`
			)
			.join(' ');
	}

	const gridLines = $derived([0, 0.25, 0.5, 0.75, 1].map((ratio) => ratio * max));
</script>

<div bind:this={container} class={cn('w-full', className)}>
	<svg
		class="block w-full"
		style="height:{height}px"
		viewBox={`0 0 ${WIDTH} ${height}`}
		preserveAspectRatio="xMidYMid meet"
		role="img"
		aria-label="Comparativa del periodo"
	>
		{#each gridLines as line (line)}
			<line
				x1={PADDING.left}
				x2={WIDTH - PADDING.right}
				y1={yFor(line)}
				y2={yFor(line)}
				stroke="var(--color-hairline)"
				stroke-width="1"
			/>
			<text
				x={PADDING.left - 6}
				y={yFor(line) + 3.5}
				text-anchor="end"
				font-size="9"
				fill="var(--color-muted-soft)">{formatCompactMoney(line, currency)}</text
			>
		{/each}

		{#each series as item (item.label)}
			<path
				d={pathFor(item.values)}
				fill="none"
				stroke={item.color}
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				pathLength={item.dashed ? undefined : 1}
				stroke-dasharray={item.dashed ? '5 5' : '1'}
				class:chart-line={!item.dashed}
			/>
			{#each item.values as value, index (index)}
				<circle
					class="chart-dot"
					cx={xFor(index, item.values.length)}
					cy={yFor(value)}
					r="3"
					fill={item.color}
					style="animation-delay:{260 + index * 50}ms"
				/>
			{/each}
		{/each}

		{#each labels as label, index (index)}
			<text
				x={xFor(index, labels.length)}
				y={height - 6}
				text-anchor="middle"
				font-size="9"
				fill="var(--color-muted-soft)">{label}</text
			>
		{/each}
	</svg>
</div>

{#if series.length > 1}
	<div class="mt-2 flex flex-wrap items-center gap-3">
		{#each series as item (item.label)}
			<span class="flex items-center gap-1.5 text-body-sm text-muted">
				<span
					class="h-0.5 w-4 rounded-full"
					style="background-color:{item.color}"
					aria-hidden="true"
				></span>
				{item.label}
			</span>
		{/each}
	</div>
{/if}

<style>
	.chart-line {
		animation: line-draw 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes line-draw {
		from {
			stroke-dashoffset: 1;
		}
		to {
			stroke-dashoffset: 0;
		}
	}

	.chart-dot {
		animation: dot-in 0.35s ease-out both;
	}

	@keyframes dot-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.chart-line,
		.chart-dot {
			animation: none;
		}
	}
</style>
