<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import { cn } from '#lib/utils/cn';

	interface Props {
		icon?: string;
		title: string;
		description?: string;
		action?: Snippet;
		class?: string;
	}

	let { icon = 'inbox', title, description, action, class: className = '' }: Props = $props();
</script>

<div class={cn('flex flex-col items-center gap-3 px-6 py-10 text-center', className)}>
	<span class="flex size-14 items-center justify-center rounded-full bg-level-1 text-muted">
		<Icon name={icon} size={26} />
	</span>
	<div class="space-y-1">
		<p class="text-title-sm text-ink">{title}</p>
		{#if description}
			<p class="mx-auto max-w-72 text-body-sm text-muted">{description}</p>
		{/if}
	</div>
	{@render action?.()}
</div>
