<script lang="ts">
	interface Props {
		/** Cantidad de copos. Se mantiene bajo para no castigar el móvil. */
		count?: number;
	}

	let { count = 20 }: Props = $props();

	/** PRNG determinista: el HTML del servidor y el del cliente coinciden. */
	function mulberry32(seed: number): () => number {
		let value = seed;
		return () => {
			value = (value + 0x6d2b79f5) | 0;
			let t = value;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	const FLAKES = (() => {
		const random = mulberry32(20261224);
		return Array.from({ length: count }, () => ({
			x: Math.round(random() * 1000) / 10,
			size: 2 + Math.round(random() * 3),
			delay: Math.round(random() * 120) / 10,
			duration: 7 + Math.round(random() * 80) / 10,
			drift: Math.round((random() - 0.5) * 60),
			opacity: 0.35 + Math.round(random() * 45) / 100
		}));
	})();
</script>

<div class="season-snow" aria-hidden="true">
	{#each FLAKES as flake, index (index)}
		<span
			class="season-flake"
			style="--x:{flake.x}%;--snow-size:{flake.size}px;--snow-delay:{flake.delay}s;--snow-duration:{flake.duration}s;--snow-drift:{flake.drift}px;--snow-opacity:{flake.opacity}"
		></span>
	{/each}
</div>
