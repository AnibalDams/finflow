<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils/cn';
	import Icon from './Icon.svelte';

	interface Props {
		title?: string;
		subtitle?: string;
		icon?: string;
		iconTone?: 'primary' | 'secondary' | 'tertiary' | 'neutral';
		headerAction?: Snippet;
		children?: Snippet;
		footer?: Snippet;
		class?: string;
		padded?: boolean;
	}

	let {
		title,
		subtitle,
		icon,
		iconTone = 'primary',
		headerAction,
		children,
		footer,
		class: className = '',
		padded = true
	}: Props = $props();

	const TONES: Record<NonNullable<Props['iconTone']>, string> = {
		primary: 'bg-primary/10 text-primary',
		secondary: 'bg-secondary/10 text-secondary',
		tertiary: 'bg-tertiary/10 text-tertiary',
		neutral: 'bg-level-1 text-muted'
	};
</script>

<section
	class={cn(
		'rounded-2xl border border-hairline/70 bg-surface-container-lowest shadow-card',
		padded && 'p-4',
		className
	)}
>
	{#if title || headerAction}
		<header class="mb-3 flex items-center justify-between gap-3">
			<div class="flex min-w-0 items-center gap-2.5">
				{#if icon}
					<span
						class="flex size-9 items-center justify-center rounded-full {TONES[iconTone]}"
						aria-hidden="true"
					>
						<Icon name={icon} size={19} />
					</span>
				{/if}
				<div class="min-w-0">
					{#if title}
						<h2 class="truncate text-title-sm font-semibold text-ink">{title}</h2>
					{/if}
					{#if subtitle}
						<p class="truncate text-body-sm text-muted">{subtitle}</p>
					{/if}
				</div>
			</div>
			{@render headerAction?.()}
		</header>
	{/if}

	{@render children?.()}

	{#if footer}
		<div class="mt-3 border-t border-hairline pt-3">
			{@render footer()}
		</div>
	{/if}
</section>
