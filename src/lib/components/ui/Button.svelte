<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import Icon from './Icon.svelte';
	import { buttonClass, type ButtonSize, type ButtonVariant } from './button-styles';

	interface Props extends HTMLButtonAttributes {
		variant?: ButtonVariant;
		size?: ButtonSize;
		block?: boolean;
		icon?: string;
		iconFilled?: boolean;
		loading?: boolean;
		children?: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		block = false,
		icon,
		iconFilled = false,
		loading = false,
		class: className = '',
		children,
		type = 'button',
		disabled = false,
		...rest
	}: Props = $props();
</script>

<button
	type={type}
	class={buttonClass(variant, size, block, className)}
	disabled={disabled || loading}
	aria-busy={loading}
	{...rest}
>
	{#if loading}
		<Icon name="progress_activity" size={18} class="animate-spin" />
	{:else if icon}
		<Icon name={icon} size={size === 'lg' ? 20 : 18} filled={iconFilled} />
	{/if}
	{@render children?.()}
</button>
