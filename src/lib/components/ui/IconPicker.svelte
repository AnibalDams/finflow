<script lang="ts">
	import { cn } from '#lib/utils/cn';
	import Icon from './Icon.svelte';

	interface Props {
		icons: string[];
		value?: string;
		name: string;
		error?: string;
		class?: string;
	}

	let { icons, value = $bindable(''), name, error, class: className = '' }: Props = $props();
</script>

<div class={cn('space-y-1.5', className)}>
	<div class="grid grid-cols-6 gap-2">
		{#each icons as icon (icon)}
			<label
				class={cn(
					'flex aspect-square cursor-pointer items-center justify-center rounded-xl border transition',
					value === icon
						? 'border-secondary bg-secondary/10 text-secondary'
						: 'border-hairline bg-surface-container-lowest text-muted hover:border-outline-variant'
				)}
				title={icon}
			>
				<input
					type="radio"
					{name}
					value={icon}
					checked={value === icon}
					class="sr-only"
					onchange={() => (value = icon)}
				/>
				<Icon name={icon} size={20} />
			</label>
		{/each}
	</div>

	{#if error}
		<p class="text-body-sm font-medium text-tertiary">{error}</p>
	{/if}
</div>
