<script lang="ts">
	import { cn } from '#lib/utils/cn';
	import Icon from './Icon.svelte';

	interface Option {
		value: string;
		label: string;
		description?: string;
		icon?: string;
	}

	interface Props {
		options: Option[];
		value?: string;
		name: string;
		columns?: 1 | 2;
		error?: string;
		class?: string;
	}

	let { options, value = $bindable(''), name, columns = 2, error, class: className = '' }: Props = $props();
</script>

<div class={cn('space-y-1.5', className)}>
	<div class={cn('grid gap-2', columns === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
		{#each options as option (option.value)}
			<label
				class={cn(
					'flex cursor-pointer items-start gap-2.5 rounded-2xl border p-3 transition',
					value === option.value
						? 'border-secondary bg-secondary/6 shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-secondary)_12%,transparent)]'
						: 'border-hairline bg-surface-container-lowest hover:border-outline-variant'
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
					<span
						class={cn(
							'flex size-9 shrink-0 items-center justify-center rounded-full',
							value === option.value ? 'bg-secondary/15 text-secondary' : 'bg-level-1 text-muted'
						)}
					>
						<Icon name={option.icon} size={18} />
					</span>
				{/if}

				<span class="min-w-0">
					<span class="block text-label text-ink">{option.label}</span>
					{#if option.description}
						<span class="mt-0.5 block text-body-sm text-muted">{option.description}</span>
					{/if}
				</span>
			</label>
		{/each}
	</div>

	{#if error}
		<p class="text-body-sm font-medium text-tertiary">{error}</p>
	{/if}
</div>
