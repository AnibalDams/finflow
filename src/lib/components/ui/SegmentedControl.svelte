<script lang="ts">
	import { cn } from '#lib/utils/cn';

	type Tone = 'neutral' | 'primary' | 'tertiary' | 'secondary';

	interface Option {
		value: string;
		label: string;
		icon?: string;
	}

	interface Props {
		options: Option[];
		/** Valor seleccionado (enlazable). */
		value?: string;
		/** Si se indica, el control participa en un formulario. */
		name?: string;
		/** Color del segmento activo. */
		tone?: Tone;
		size?: 'sm' | 'md';
		class?: string;
	}

	let {
		options,
		value = $bindable(''),
		name,
		tone = 'neutral',
		size = 'md',
		class: className = ''
	}: Props = $props();

	const TONE_ACTIVE: Record<Tone, string> = {
		neutral: 'bg-surface-container-lowest shadow-card',
		primary: 'bg-primary shadow-[0_2px_10px_-2px_var(--ff-glow)]',
		tertiary: 'bg-tertiary shadow-card',
		secondary: 'bg-secondary shadow-card'
	};

	const TONE_TEXT: Record<Tone, string> = {
		neutral: 'text-ink',
		primary: 'text-on-primary',
		tertiary: 'text-on-tertiary',
		secondary: 'text-on-secondary'
	};

	const activeIndex = $derived(
		Math.max(
			0,
			options.findIndex((option) => option.value === value)
		)
	);
	const columns = $derived(Math.max(1, options.length));
</script>

<div
	class={cn('relative grid rounded-full bg-level-1 p-1', className)}
	style="grid-template-columns:repeat({columns},minmax(0,1fr))"
>
	<span
		class={cn(
			'absolute top-1 bottom-1 left-1 rounded-full transition-transform duration-200 ease-out',
			TONE_ACTIVE[tone]
		)}
		style="width:calc((100% - 8px)/{columns});transform:translateX(calc({activeIndex} * 100%))"
		aria-hidden="true"
	></span>

	{#each options as option (option.value)}
		<label
			class={cn(
				'relative z-10 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full font-semibold transition-colors active:opacity-75',
				size === 'sm' ? 'h-8 text-label-sm' : 'h-11 text-label',
				value === option.value ? TONE_TEXT[tone] : 'text-on-surface-variant hover:text-on-surface'
			)}
		>
			<input
				type="radio"
				{name}
				value={option.value}
				checked={value === option.value}
				class="sr-only"
				onchange={() => (value = option.value)}
			/>
			{#if option.icon}
				<span class="material-symbols-outlined text-[18px]" aria-hidden="true">{option.icon}</span>
			{/if}
			{option.label}
		</label>
	{/each}
</div>
