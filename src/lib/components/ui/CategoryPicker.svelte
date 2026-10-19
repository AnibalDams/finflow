<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import type { Category } from '#lib/types/domain';
	import { cn } from '#lib/utils/cn';

	interface Props {
		categories: Category[];
		value?: string;
		name: string;
		error?: string;
		/** Enlace para crear una categoría nueva. */
		createHref?: string;
		createLabel?: string;
		class?: string;
	}

	let {
		categories,
		value = $bindable(''),
		name,
		error,
		createHref,
		createLabel = 'Nueva',
		class: className = ''
	}: Props = $props();
</script>

<div class={cn('space-y-1.5', className)}>
	<div class="grid grid-cols-4 gap-2">
		{#each categories as category (category.id)}
			<label
				class={cn(
					'flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border px-1 pt-2.5 pb-2 transition',
					value === category.id
						? 'border-transparent bg-primary/10'
						: 'border-hairline bg-surface-container-lowest hover:border-outline-variant'
				)}
			>
				<input
					type="radio"
					{name}
					value={category.id}
					checked={value === category.id}
					class="sr-only"
					onchange={() => (value = category.id)}
				/>
				<span
					class="flex size-12 items-center justify-center rounded-full transition"
					style={value === category.id
						? `background-color:${category.color};color:#fff`
						: 'background-color:var(--color-level-1);color:var(--color-muted)'}
				>
					<Icon name={category.icon} size={22} />
				</span>
				<span
					class={cn(
						'truncate text-label-sm',
						value === category.id ? 'text-ink' : 'text-on-surface-variant'
					)}>{category.name}</span
				>
			</label>
		{/each}

		{#if createHref}
			<a
				href={createHref}
				class="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-outline-variant px-1 pt-2.5 pb-2 transition hover:bg-level-1/60"
			>
				<span class="flex size-12 items-center justify-center rounded-full bg-level-1 text-on-surface-variant">
					<Icon name="add" size={22} />
				</span>
				<span class="truncate text-label-sm text-on-surface-variant">{createLabel}</span>
			</a>
		{/if}
	</div>

	{#if error}
		<p class="text-body-sm font-medium text-tertiary">{error}</p>
	{/if}
</div>
