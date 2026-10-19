<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils/cn';
	import Icon from './Icon.svelte';

	interface Props extends Omit<HTMLSelectAttributes, 'value'> {
		label?: string;
		icon?: string;
		error?: string;
		hint?: string;
		value?: string;
		options: Array<{ value: string; label: string; disabled?: boolean }>;
		placeholder?: string;
	}

	let {
		label,
		icon,
		error,
		hint,
		value = $bindable(''),
		options,
		placeholder,
		class: className = '',
		id,
		name,
		...rest
	}: Props = $props();

	const selectId = $derived(id ?? `select-${name ?? label?.toLowerCase().replace(/\s+/g, '-') ?? 'field'}`);
</script>

<div class="space-y-1.5">
	{#if label}
		<label for={selectId} class="block text-label-sm font-medium text-on-surface-variant">
			{label}
		</label>
	{/if}

	<div class="relative flex items-center">
		{#if icon}
			<span class="pointer-events-none absolute left-3 text-muted-soft">
				<Icon name={icon} size={19} />
			</span>
		{/if}

		<select
			id={selectId}
			{name}
			bind:value
			class={cn(
				'h-12 w-full appearance-none rounded-xl border bg-surface-container-lowest pr-10 text-body-lg text-ink transition focus:outline-none',
				icon ? 'pl-10.5' : 'pl-3.5',
				error
					? 'border-tertiary/60 focus:border-tertiary focus:ring-3 focus:ring-tertiary/12'
					: 'border-hairline focus:border-secondary focus:ring-3 focus:ring-secondary/12',
				className
			)}
			aria-invalid={error ? 'true' : undefined}
			{...rest}
		>
			{#if placeholder}
				<option value="" disabled={rest.required}>{placeholder}</option>
			{/if}
			{#each options as option (option.value)}
				<option value={option.value} disabled={option.disabled}>{option.label}</option>
			{/each}
		</select>

		<span class="pointer-events-none absolute right-3 text-on-surface-variant">
			<Icon name="expand_more" size={20} />
		</span>
	</div>

	{#if error}
		<p class="text-body-sm font-medium text-tertiary">{error}</p>
	{:else if hint}
		<p class="text-body-sm text-muted">{hint}</p>
	{/if}
</div>
