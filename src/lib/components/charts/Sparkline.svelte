<script lang="ts">
	import { cn } from '#lib/utils/cn';

	interface Props {
		/** Serie de valores (al menos 2 puntos). */
		values: number[];
		/** Color de la línea. */
		stroke?: string;
		/** Relleno degradado bajo la línea. */
		fillTop?: string;
		fillBottom?: string;
		height?: number;
		strokeWidth?: number;
		class?: string;
	}

	let {
		values,
		stroke = '#6ffbbe',
		fillTop = 'rgba(111,251,190,0.35)',
		fillBottom = 'rgba(111,251,190,0)',
		height = 80,
		strokeWidth = 2.5,
		class: className = ''
	}: Props = $props();

	const WIDTH = 300;
	const BASELINE = 78;
	const PAD = 5;

	const geometry = $derived.by(() => {
		const series = values.length >= 2 ? values : [0, 0];
		const min = Math.min(...series);
		const max = Math.max(...series);
		const span = max - min || 1;
		const step = (WIDTH - PAD * 2) / (series.length - 1);

		const points = series.map((value, index) => ({
			x: PAD + index * step,
			y: BASELINE - ((value - min) / span) * 62
		}));

		let line = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
		for (let index = 1; index < points.length; index += 1) {
			const previous = points[index - 1];
			const current = points[index];
			const mid = (previous.x + current.x) / 2;
			line += ` C ${mid.toFixed(2)} ${previous.y.toFixed(2)}, ${mid.toFixed(2)} ${current.y.toFixed(2)}, ${current.x.toFixed(2)} ${current.y.toFixed(2)}`;
		}

		const area = `${line} L ${(WIDTH - PAD).toFixed(2)} ${BASELINE} L ${PAD} ${BASELINE} Z`;
		return { line, area, last: points[points.length - 1] };
	});

	const uid = $props.id();
	const gradientId = `spark-${uid}`;
</script>

<svg
	class={cn('block w-full', className)}
	viewBox={`0 0 ${WIDTH} ${BASELINE + 2}`}
	height={height}
	preserveAspectRatio="none"
	role="img"
	aria-label="Tendencia del periodo"
>
	<defs>
		<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color={fillTop} />
			<stop offset="100%" stop-color={fillBottom} />
		</linearGradient>
	</defs>

	<path d={geometry.area} fill="url(#{gradientId})" class="spark-area" />
	<path
		class="spark-line"
		d={geometry.line}
		fill="none"
		stroke={stroke}
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
		pathLength={1}
		stroke-dasharray="1"
		vector-effect="non-scaling-stroke"
	/>
	<circle
		class="spark-dot"
		cx={geometry.last.x}
		cy={geometry.last.y}
		r="4"
		fill={stroke}
		stroke="#1b2537"
		stroke-width="2"
		vector-effect="non-scaling-stroke"
	/>
</svg>

<style>
	.spark-area {
		animation: spark-fade 0.5s ease-out both;
	}

	.spark-line {
		animation: spark-draw 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.spark-dot {
		animation: spark-fade 0.3s ease-out 0.45s both;
	}

	@keyframes spark-draw {
		from {
			stroke-dashoffset: 1;
		}
		to {
			stroke-dashoffset: 0;
		}
	}

	@keyframes spark-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spark-area,
		.spark-line,
		.spark-dot {
			animation: none;
		}
	}
</style>
