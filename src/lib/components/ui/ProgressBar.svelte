<script lang="ts">
	import { cn } from '#lib/utils/cn';

	interface Props {
		/** Porcentaje entre 0 y 100. */
		value: number;
		tone?: 'primary' | 'secondary' | 'tertiary' | 'warning' | 'custom';
		color?: string;
		size?: 'sm' | 'md' | 'lg';
		class?: string;
		label?: string;
	}

	let { value, tone = 'primary', color, size = 'md', class: className = '', label }: Props = $props();

	const clamped = $derived(Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)));

	const HEIGHTS = { sm: 'h-1', md: 'h-2', lg: 'h-2.5' } as const;

	const TONES = {
		primary: 'bg-primary',
		secondary: 'bg-secondary',
		tertiary: 'bg-tertiary',
		warning: 'bg-amber-500',
		custom: ''
	} as const;
</script>

<div
	class={cn('w-full overflow-hidden rounded-full bg-level-1', HEIGHTS[size], className)}
	role="progressbar"
	aria-valuenow={Math.round(clamped)}
	aria-valuemin={0}
	aria-valuemax={100}
	aria-label={label}
>
	<div
		class={cn('h-full rounded-full progress-grow transition-[width] duration-500 ease-out', TONES[tone])}
		style="width:{clamped}%{color ? `;background-color:${color}` : ''}"
	></div>
</div>
