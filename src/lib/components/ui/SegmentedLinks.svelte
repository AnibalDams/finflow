<script lang="ts">
	import { cn } from '#lib/utils/cn';

	interface Option {
		value: string;
		label: string;
		href: string;
	}

	interface Props {
		options: Option[];
		value: string;
		class?: string;
		/** offset para el indicador deslizante cuando hay muchas opciones */
		size?: 'sm' | 'md';
	}

	let { options, value, class: className = '', size = 'md' }: Props = $props();

	const activeIndex = $derived(Math.max(0, options.findIndex((option) => option.value === value)));
	const columns = $derived(Math.max(1, options.length));
</script>

<nav class={cn('relative flex rounded-full bg-level-1 p-1', className)}>
	<span
		class="absolute top-1 bottom-1 rounded-full bg-surface-container-lowest shadow-[0_1px_4px_rgba(19,27,46,0.10)] transition-transform duration-200 ease-out"
		style="left:4px;width:calc((100% - 8px)/{columns});transform:translateX(calc({activeIndex} * 100%))"
		aria-hidden="true"
	></span>

	{#each options as option (option.value)}
		<a
			href={option.href}
			class={cn(
				'relative z-10 flex flex-1 items-center justify-center rounded-full font-semibold transition-colors',
				size === 'sm' ? 'h-8 text-label-sm' : 'h-10 text-label',
				value === option.value ? 'text-ink' : 'text-on-surface-variant hover:text-on-surface'
			)}
			aria-current={value === option.value ? 'page' : undefined}
		>
			{option.label}
		</a>
	{/each}
</nav>
