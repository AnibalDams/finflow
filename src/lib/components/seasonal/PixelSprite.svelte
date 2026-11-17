<script lang="ts">
	import { cn } from '#lib/utils/cn';
	import { spriteDimensions, spriteFrameCount, spriteSheet, type SpriteName } from './sprites';

	interface Props {
		name: SpriteName;
		/** Ancho en píxeles; la altura se calcula por proporción. */
		size?: number;
		/** Reproduce los fotogramas del sprite. */
		animate?: boolean;
		/** Movimiento continuo decorativo. */
		motion?: 'none' | 'bob' | 'swing' | 'twinkle';
		/** Si se indica, el sprite se anuncia; si no, es decorativo. */
		label?: string;
		class?: string;
	}

	let {
		name,
		size = 48,
		animate = true,
		motion = 'none',
		label,
		class: className = ''
	}: Props = $props();

	const dimensions = $derived(spriteDimensions(name));
	const frames = $derived(spriteFrameCount(name));
	const sheet = $derived(spriteSheet(name));
	const height = $derived(Math.round((size * dimensions.height) / dimensions.width));
</script>

<span
	class={cn(
		'season-sprite inline-block shrink-0 select-none',
		frames > 1 && animate && 'season-sprite-frames',
		motion === 'bob' && 'season-bob',
		motion === 'swing' && 'season-swing',
		motion === 'twinkle' && 'season-twinkle',
		className
	)}
	style="width:{size}px;height:{height}px;background-image:url('{sheet}');background-size:{frames *
		100}% 100%;background-position:0 0"
	data-frames={frames}
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
></span>
