<script lang="ts">
	import { cn } from '#lib/utils/cn';

	interface Props {
		label: string;
		description?: string;
		checked?: boolean;
		name?: string;
		value?: string;
		class?: string;
		disabled?: boolean;
	}

	let {
		label,
		description,
		checked = $bindable(false),
		name,
		value = 'on',
		class: className = '',
		disabled = false
	}: Props = $props();
</script>

<label
	class={cn(
		'flex cursor-pointer items-center justify-between gap-3 py-1',
		disabled && 'cursor-not-allowed opacity-60',
		className
	)}
>
	<span class="min-w-0">
		<span class="block text-label text-ink">{label}</span>
		{#if description}
			<span class="mt-0.5 block text-body-sm text-muted">{description}</span>
		{/if}
	</span>

	<span class="relative shrink-0">
		<input
			type="checkbox"
			{name}
			{value}
			{disabled}
			bind:checked
			class="peer sr-only"
			role="switch"
			aria-checked={checked}
		/>
		<span
			class={cn(
				'block h-7 w-12 rounded-full transition-colors',
				checked ? 'bg-primary' : 'bg-outline-variant'
			)}
		></span>
		<span
			class={cn(
				'pointer-events-none absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-sm transition-transform',
				checked && 'translate-x-5'
			)}
		></span>
	</span>
</label>
