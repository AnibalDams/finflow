<script lang="ts">
	import { page } from '$app/state';
	import Icon from '#lib/components/ui/Icon.svelte';

	interface Tab {
		href: string;
		icon: string;
		label: string;
	}

	const LEFT: Tab[] = [
		{ href: '/', icon: 'grid_view', label: 'Inicio' },
		{ href: '/metricas', icon: 'insights', label: 'Métricas' }
	];

	const RIGHT: Tab[] = [
		{ href: '/planes', icon: 'savings', label: 'Planes' },
		{ href: '/deudas', icon: 'account_balance_wallet', label: 'Deudas' }
	];

	const pathname = $derived(page.url.pathname);

	function isActive(href: string): boolean {
		return href === '/' ? pathname === '/' : pathname.startsWith(href);
	}
</script>

{#snippet tab(item: Tab)}
	<a
		href={item.href}
		class="group relative flex h-12 w-15 flex-col items-center justify-center gap-1 rounded-2xl transition-[color,transform] duration-150 active:scale-95 {isActive(
			item.href
		)
			? 'text-primary'
			: 'text-on-surface-variant hover:text-on-surface'}"
		aria-current={isActive(item.href) ? 'page' : undefined}
	>
		{#if isActive(item.href)}
			<span
				class="nav-tab-indicator absolute -bottom-1 h-1 w-5 rounded-full bg-primary"
				aria-hidden="true"
			></span>
		{/if}
		<span
			class="transition-transform duration-200 {isActive(item.href)
				? '-translate-y-px scale-110'
				: 'group-active:scale-90'}"
		>
			<Icon name={item.icon} size={22} filled={isActive(item.href)} />
		</span>
		<span class="text-label-sm {isActive(item.href) ? 'font-semibold' : 'font-medium'}"
			>{item.label}</span
		>
	</a>
{/snippet}

<nav
	class="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px] border-t border-hairline/60 bg-surface/92 pb-safe shadow-[0_-4px_20px_rgba(19,27,46,0.05)] backdrop-blur-xl lg:hidden"
	aria-label="Navegación principal"
>
	<div class="relative mx-auto flex h-16 items-center justify-around px-1.5">
		{#each LEFT as item (item.href)}
			{@render tab(item)}
		{/each}

		<div class="relative -top-5 flex flex-col items-center">
			<a
				href="/movimientos/nuevo"
				class="flex size-13 items-center justify-center rounded-full bg-primary text-on-primary shadow-fab transition active:scale-90"
				aria-label="Registrar movimiento"
			>
				<Icon name="add" size={26} />
			</a>
		</div>

		{#each RIGHT as item (item.href)}
			{@render tab(item)}
		{/each}
	</div>
</nav>
