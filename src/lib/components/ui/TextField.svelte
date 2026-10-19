<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils/cn';
	import Icon from './Icon.svelte';

	interface Props extends Omit<HTMLInputAttributes, 'value'> {
		label?: string;
		icon?: string;
		prefix?: string;
		error?: string;
		hint?: string;
		value?: string;
	}

	let {
		label,
		icon,
		prefix,
		error,
		hint,
		value = $bindable(''),
		class: className = '',
		id,
		name,
		...rest
	}: Props = $props();

	const inputId = $derived(id ?? `field-${name ?? label?.toLowerCase().replace(/\s+/g, '-') ?? 'input'}`);
</script>

<div class="space-y-1.5">
	{#if label}
		<label for={inputId} class="block text-label-sm font-medium text-on-surface-variant">
			{label}
		</label>
	{/if}

	<div class="relative flex items-center">
		{#if icon}
			<span class="pointer-events-none absolute left-3 text-muted-soft">
				<Icon name={icon} size={19} />
			</span>
		{/if}
		{#if prefix}
			<span class="pointer-events-none absolute left-3 text-label text-muted">{prefix}</span>
		{/if}

		<input
			id={inputId}
			{name}
			bind:value
			class={cn(
				'h-12 w-full rounded-xl border bg-surface-container-lowest px-3.5 text-body-lg text-ink transition placeholder:text-muted-soft focus:outline-none',
				icon ? 'pl-10.5' : '',
				prefix ? 'pl-8' : '',
				error
					? 'border-tertiary/60 focus:border-tertiary focus:ring-3 focus:ring-tertiary/12'
					: 'border-hairline focus:border-secondary focus:ring-3 focus:ring-secondary/12',
				className
			)}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
			{...rest}
		/>
	</div>

	{#if error}
		<p id="{inputId}-error" class="text-body-sm font-medium text-tertiary">{error}</p>
	{:else if hint}
		<p id="{inputId}-hint" class="text-body-sm text-muted">{hint}</p>
	{/if}
</div>
