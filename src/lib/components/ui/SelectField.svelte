<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils/cn';
	import Icon from './Icon.svelte';
	import OptionSheet from './OptionSheet.svelte';

	interface Props extends Omit<HTMLSelectAttributes, 'value'> {
		label?: string;
		icon?: string;
		error?: string;
		hint?: string;
		value?: string;
		options: Array<{ value: string; label: string; disabled?: boolean; description?: string }>;
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
		required = false,
		disabled = false
	}: Props = $props();

	const uid = $props.id();
	const triggerId = $derived(id ?? `${uid}-trigger`);

	let open = $state(false);
	let trigger = $state<HTMLButtonElement | null>(null);

	const selectedLabel = $derived(options.find((option) => option.value === value)?.label ?? '');
</script>

<div class="space-y-1.5">
	{#if label}
		<span class="block text-label-sm font-medium text-on-surface-variant">{label}</span>
	{/if}

	<button
		type="button"
		id={triggerId}
		bind:this={trigger}
		class={cn(
			'pressable relative flex h-12 w-full items-center gap-2 rounded-xl border bg-surface-container-lowest pr-3 text-left text-body-lg text-ink transition',
			icon ? 'pl-10.5' : 'pl-3.5',
			error ? 'border-tertiary/60' : 'border-hairline hover:border-outline-variant',
			disabled && 'pointer-events-none opacity-60',
			className
		)}
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-label={`${label ? `${label}: ` : ''}${selectedLabel || placeholder || ''}`}
		disabled={disabled ?? false}
		onclick={() => (open = true)}
	>
		{#if icon}
			<span class="pointer-events-none absolute left-3 text-muted-soft">
				<Icon name={icon} size={19} />
			</span>
		{/if}

		<span class={cn('min-w-0 flex-1 truncate', !selectedLabel && 'text-muted-soft')}>
			{selectedLabel || placeholder || ''}
		</span>

		<Icon name="expand_more" size={20} class="shrink-0 text-on-surface-variant" />
	</button>

	<OptionSheet
		bind:open
		title={label ?? placeholder ?? 'Selecciona una opción'}
		name={name ?? undefined}
		label={label ?? ''}
		required={required ?? false}
		returnFocus={trigger}
		bind:value
		options={options}
	/>

	{#if error}
		<p class="text-body-sm font-medium text-tertiary">{error}</p>
	{:else if hint}
		<p class="text-body-sm text-muted">{hint}</p>
	{/if}
</div>
