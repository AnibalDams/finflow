<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils/cn';

	interface Props extends Omit<HTMLTextareaAttributes, 'value'> {
		label?: string;
		error?: string;
		hint?: string;
		value?: string;
	}

	let {
		label,
		error,
		hint,
		value = $bindable(''),
		class: className = '',
		id,
		name,
		rows = 3,
		...rest
	}: Props = $props();

	const areaId = $derived(id ?? `textarea-${name ?? label?.toLowerCase().replace(/\s+/g, '-') ?? 'field'}`);
</script>

<div class="space-y-1.5">
	{#if label}
		<label for={areaId} class="block text-label-sm font-medium text-on-surface-variant">
			{label}
		</label>
	{/if}

	<textarea
		id={areaId}
		{name}
		{rows}
		bind:value
		class={cn(
			'w-full resize-none rounded-xl border bg-surface-container-lowest px-3.5 py-3 text-body text-ink transition placeholder:text-muted-soft focus:outline-none',
			error
				? 'border-tertiary/60 focus:border-tertiary focus:ring-3 focus:ring-tertiary/12'
				: 'border-hairline focus:border-secondary focus:ring-3 focus:ring-secondary/12',
			className
		)}
		aria-invalid={error ? 'true' : undefined}
		{...rest}
	></textarea>

	{#if error}
		<p class="text-body-sm font-medium text-tertiary">{error}</p>
	{:else if hint}
		<p class="text-body-sm text-muted">{hint}</p>
	{/if}
</div>
