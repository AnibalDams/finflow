<script lang="ts">
	interface Props {
		/** Alto en píxeles de la banda. */
		height?: number;
		class?: string;
	}

	let { height = 14, class: className = '' }: Props = $props();

	const BULBS = [
		{ x: 20, y: 12, color: '#e63946', delay: 0 },
		{ x: 60, y: 5, color: '#f4c95d', delay: 0.25 },
		{ x: 100, y: 12, color: '#4edea3', delay: 0.5 },
		{ x: 140, y: 5, color: '#e63946', delay: 0.75 },
		{ x: 180, y: 12, color: '#f4c95d', delay: 1 },
		{ x: 220, y: 5, color: '#4edea3', delay: 1.25 },
		{ x: 260, y: 12, color: '#e63946', delay: 1.5 },
		{ x: 300, y: 5, color: '#f4c95d', delay: 1.75 }
	];
</script>

<div class="season-garland {className}" style="height:{height}px" aria-hidden="true">
	<svg viewBox="0 0 320 18" preserveAspectRatio="none" focusable="false">
		<path
			d="M0 3 Q 20 15 40 3 T 80 3 T 120 3 T 160 3 T 200 3 T 240 3 T 280 3 T 320 3"
			fill="none"
			stroke="#14532d"
			stroke-width="3.4"
			stroke-linecap="round"
		/>
		{#each BULBS as bulb (bulb.x)}
			<circle
				class="season-bulb"
				cx={bulb.x}
				cy={bulb.y}
				r="2.7"
				fill={bulb.color}
				style="animation-delay:{bulb.delay}s"
			/>
		{/each}
	</svg>
</div>
