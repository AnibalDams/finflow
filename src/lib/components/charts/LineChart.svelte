<script lang="ts">
	import {
		areaPath,
		clamp,
		monotonePath,
		nearestIndex,
		niceCeiling,
		type ChartPoint
	} from '#lib/utils/chart';
	import { cn } from '#lib/utils/cn';
	import { currencySymbol, formatCompactMoney, formatMoney } from '#lib/utils/money';

	export interface LineSeries {
		label: string;
		color: string;
		values: number[];
		dashed?: boolean;
		/** Etiqueta corta para el tooltip (por defecto usa `label`). */
		tooltipLabel?: string;
	}

	interface Props {
		series: LineSeries[];
		/** Etiquetas visibles del eje X (una por punto; `''` oculta la marca). */
		labels?: string[];
		/** Etiqueta accesible de cada punto; si falta se usa `labels`. */
		pointLabels?: string[];
		currency?: string;
		height?: number;
		/** Relleno degradado bajo las series continuas. */
		showArea?: boolean;
		/** Etiqueta de la fila de diferencia (solo con dos o más series). */
		differenceLabel?: string;
		class?: string;
	}

	let {
		series,
		labels = [],
		pointLabels = [],
		currency = 'USD',
		height = 190,
		showArea = true,
		differenceLabel = 'Diferencia',
		class: className = ''
	}: Props = $props();

	const uid = $props.id();
	const hintId = `${uid}-hint`;

	const PADDING = { top: 18, right: 16, bottom: 26, left: 46 };
	const TOOLTIP_HALF = 110;

	let container = $state<HTMLDivElement | null>(null);
	let measured = $state(0);
	let activeIndex = $state<number | null>(null);
	let dragging = $state(false);
	let tooltipHeight = $state(0);

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
	const plotHeight = $derived(Math.max(40, height - PADDING.top - PADDING.bottom));

	const count = $derived(
		Math.max(
			1,
			series.reduce((longest, item) => Math.max(longest, item.values.length), 0),
			pointLabels.length,
			labels.length
		)
	);

	const rawMax = $derived(
		Math.max(0, ...series.flatMap((item) => item.values.map((value) => Math.abs(value))))
	);
	const max = $derived(niceCeiling(rawMax));

	const gridLines = $derived(Array.from({ length: 5 }, (_, index) => (index / 4) * max));

	/** El eje no necesita centavos: `$800`, `$1.5K`. */
	function axisLabel(value: number): string {
		if (value >= 1000) return formatCompactMoney(value, currency);
		return `${currencySymbol(currency)}${Math.round(value)}`;
	}

	function xFor(index: number): number {
		const usable = WIDTH - PADDING.left - PADDING.right;
		return PADDING.left + (count <= 1 ? usable / 2 : (index / (count - 1)) * usable);
	}

	function yFor(value: number): number {
		const ratio = clamp(Math.abs(value) / max, 0, 1);
		return PADDING.top + (1 - ratio) * plotHeight;
	}

	const geometry = $derived(
		series.map((item, index) => {
			const points: ChartPoint[] = item.values.map((value, point) => ({
				x: xFor(point),
				y: yFor(value)
			}));
			const line = monotonePath(points);

			return {
				id: `${uid}-${index}`,
				item,
				points,
				line,
				area: showArea && !item.dashed ? areaPath(points, line, PADDING.top + plotHeight) : ''
			};
		})
	);

	const active = $derived.by(() => {
		const index = activeIndex;
		if (index === null || index < 0 || index >= count || series.length === 0) return null;

		const rows = series.map((item) => ({
			key: item.label,
			label: item.tooltipLabel ?? item.label,
			color: item.color,
			value: item.values[index] ?? 0
		}));

		return {
			index,
			x: xFor(index),
			label: pointLabels[index] ?? labels[index] ?? '',
			rows,
			top: Math.min(...rows.map((row) => yFor(row.value))),
			difference: rows.length >= 2 ? rows[0].value - rows[1].value : null
		};
	});

	const tooltipLeft = $derived(
		active ? clamp(active.x, TOOLTIP_HALF, Math.max(WIDTH - TOOLTIP_HALF, TOOLTIP_HALF)) : 0
	);

	const tooltipTop = $derived.by(() => {
		if (!active) return 0;

		const above = active.top - tooltipHeight - 12;
		if (tooltipHeight > 0 && above >= 2) return above;

		return clamp(active.top + 14, 2, Math.max(2, height - tooltipHeight - 2));
	});

	const ariaLabel = $derived(
		`Gráfico interactivo de ${series.map((item) => item.tooltipLabel ?? item.label).join(' y ')}`
	);

	const activeDescription = $derived.by(() => {
		if (!active) return 'Pulsa las flechas para recorrer los puntos del gráfico.';

		const parts = active.rows.map((row) => `${row.label}: ${formatMoney(row.value, currency)}`);
		const date = active.label ? `${active.label}. ` : '';
		const difference =
			active.difference !== null
				? ` ${differenceLabel}: ${formatMoney(active.difference, currency)}.`
				: '';

		return `${date}${parts.join('. ')}.${difference}`;
	});

	function indexFromEvent(event: PointerEvent): number {
		const element = container;
		if (!element) return 0;

		const rect = element.getBoundingClientRect();
		if (rect.width <= 0) return 0;

		const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
		return nearestIndex(x, PADDING.left, WIDTH - PADDING.right, count);
	}

	function handlePointerDown(event: PointerEvent): void {
		dragging = true;
		activeIndex = indexFromEvent(event);
		(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent): void {
		// En táctil solo se activa durante el arrastre; el hover sigue el cursor.
		if (event.pointerType === 'touch' && !dragging) return;
		activeIndex = indexFromEvent(event);
	}

	function handlePointerUp(): void {
		dragging = false;
	}

	function handlePointerLeave(): void {
		if (!dragging) activeIndex = null;
	}

	function handleFocus(): void {
		if (activeIndex === null) activeIndex = count - 1;
	}

	function handleKeyDown(event: KeyboardEvent): void {
		const last = count - 1;
		// Si el periodo cambió y el índice quedó fuera de rango, se retoma el último punto.
		const start = activeIndex === null ? last : Math.min(activeIndex, last);

		switch (event.key) {
			case 'ArrowRight':
			case 'ArrowUp':
				event.preventDefault();
				activeIndex = Math.min(last, start + 1);
				break;
			case 'ArrowLeft':
			case 'ArrowDown':
				event.preventDefault();
				activeIndex = Math.max(0, start - 1);
				break;
			case 'Home':
				event.preventDefault();
				activeIndex = 0;
				break;
			case 'End':
				event.preventDefault();
				activeIndex = last;
				break;
			case 'Escape':
				activeIndex = null;
				break;
			default:
				break;
		}
	}
</script>

<div
	bind:this={container}
	class={cn('relative w-full', className)}
	role="slider"
	aria-roledescription="Gráfico interactivo"
	aria-label={ariaLabel}
	aria-describedby={hintId}
	aria-valuemin={1}
	aria-valuemax={count}
	aria-valuenow={(active?.index ?? 0) + 1}
	aria-valuetext={activeDescription}
	tabindex="0"
	style="touch-action: pan-y"
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerUp}
	onpointerleave={handlePointerLeave}
	onkeydown={handleKeyDown}
	onfocus={handleFocus}
	onblur={() => (activeIndex = null)}
>
	<svg
		class="block w-full"
		style="height:{height}px"
		viewBox={`0 0 ${WIDTH} ${height}`}
		preserveAspectRatio="xMidYMid meet"
		aria-hidden="true"
	>
		<defs>
			{#each geometry as item (item.id)}
				{#if item.area}
					<linearGradient id={item.id} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stop-color={item.item.color} stop-opacity="0.26" />
						<stop offset="100%" stop-color={item.item.color} stop-opacity="0" />
					</linearGradient>
				{/if}
			{/each}
		</defs>

		{#each gridLines as line, index (line)}
			<line
				x1={PADDING.left}
				x2={WIDTH - PADDING.right}
				y1={yFor(line)}
				y2={yFor(line)}
				stroke={index === 0 ? 'var(--color-outline-variant)' : 'var(--color-hairline)'}
				stroke-width="1"
				stroke-dasharray={index === 0 ? undefined : '3 5'}
			/>
			<text
				x={PADDING.left - 8}
				y={yFor(line) + 3.5}
				text-anchor="end"
				font-size="9"
				fill="var(--color-muted-soft)">{axisLabel(line)}</text
			>
		{/each}

		{#each geometry as item (item.id)}
			{#if item.area}
				<path d={item.area} fill="url(#{item.id})" class="chart-area" />
			{/if}
		{/each}

		{#each geometry as item (item.id)}
			<path
				d={item.line}
				fill="none"
				stroke={item.item.color}
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				pathLength={item.item.dashed ? undefined : 1}
				stroke-dasharray={item.item.dashed ? '4 5' : '1'}
				class:chart-line={!item.item.dashed}
				class:chart-line-dashed={item.item.dashed}
			/>
		{/each}

		{#if count <= 12}
			{#each geometry as item (item.id)}
				{#each item.points as point, index (index)}
					<circle
						class="chart-dot"
						cx={point.x}
						cy={point.y}
						r="2.6"
						fill={item.item.color}
						style="animation-delay:{180 + index * 40}ms"
					/>
				{/each}
			{/each}
		{/if}

		{#each labels as label, index (index)}
			{#if label}
				<text
					x={xFor(index)}
					y={height - 8}
					text-anchor="middle"
					font-size="9"
					fill="var(--color-muted-soft)">{label}</text
				>
			{/if}
		{/each}

		{#if active}
			<line
				x1={active.x}
				x2={active.x}
				y1={PADDING.top - 6}
				y2={PADDING.top + plotHeight}
				stroke="var(--color-outline)"
				stroke-width="1"
				stroke-dasharray="4 4"
				class="chart-indicator"
			/>
			{#each active.rows as row, index (index)}
				<circle
					cx={active.x}
					cy={yFor(row.value)}
					r="4.5"
					fill={row.color}
					stroke="var(--color-surface-container-lowest)"
					stroke-width="2"
				/>
			{/each}
		{/if}
	</svg>

	{#if active}
		<div
			bind:clientHeight={tooltipHeight}
			class="pointer-events-none absolute z-10 w-max max-w-[220px] rounded-xl border border-hairline bg-surface-container-lowest px-3 py-2 shadow-hero"
			style="left:{tooltipLeft}px;top:{tooltipTop}px;transform:translateX(-50%)"
			role="status"
			aria-live="polite"
		>
			{#if active.label}
				<p class="text-label-xs font-semibold tracking-wide text-muted uppercase">
					{active.label}
				</p>
			{/if}

			<ul class="mt-1 space-y-1">
				{#each active.rows as row, index (index)}
					<li class="flex items-center justify-between gap-3">
						<span class="flex min-w-0 items-center gap-1.5 text-body-sm text-on-surface-variant">
							<span
								class="size-2 shrink-0 rounded-full"
								style="background-color:{row.color}"
								aria-hidden="true"
							></span>
							<span class="truncate">{row.label}</span>
						</span>
						<span class="shrink-0 tnum text-label-sm font-semibold text-ink">
							{formatMoney(row.value, currency)}
						</span>
					</li>
				{/each}
			</ul>

			{#if active.difference !== null}
				<div
					class="mt-1.5 flex items-center justify-between gap-3 border-t border-hairline/70 pt-1.5"
				>
					<span class="text-label-xs font-semibold tracking-wide text-muted uppercase">
						{differenceLabel}
					</span>
					<span
						class={cn(
							'shrink-0 tnum text-label-sm font-semibold',
							active.difference < 0 ? 'text-tertiary' : 'text-primary'
						)}
					>
						{formatMoney(active.difference, currency, { sign: active.difference > 0 })}
					</span>
				</div>
			{/if}
		</div>
	{/if}
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

<p id={hintId} class="chart-hint mt-1.5 text-center text-label-xs text-muted">
	Arrastra sobre el gráfico o usa ← → para ver cada punto
</p>

<style>
	.chart-area {
		animation: chart-fade 0.5s ease-out both;
	}

	.chart-line {
		animation: line-draw 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.chart-line-dashed {
		animation: chart-fade 0.6s ease-out 0.15s both;
	}

	.chart-dot {
		animation: dot-in 0.35s ease-out both;
	}

	.chart-indicator {
		animation: chart-fade 0.15s ease-out both;
	}

	div:focus-visible {
		outline: 2px solid var(--color-secondary);
		outline-offset: 4px;
		border-radius: 12px;
	}

	.chart-hint {
		display: none;
	}

	@media (hover: hover) and (pointer: fine) {
		.chart-hint {
			display: block;
		}
	}

	@media (hover: none) {
		.chart-hint {
			display: block;
		}
	}

	@keyframes line-draw {
		from {
			stroke-dashoffset: 1;
		}
		to {
			stroke-dashoffset: 0;
		}
	}

	@keyframes chart-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
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
		.chart-area,
		.chart-line,
		.chart-line-dashed,
		.chart-dot,
		.chart-indicator {
			animation: none;
		}
	}
</style>
