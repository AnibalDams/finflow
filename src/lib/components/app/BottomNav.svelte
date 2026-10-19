<script lang="ts">
	import { page } from '$app/state';
	import Icon from '#lib/components/ui/Icon.svelte';

	const LEFT = [
		{ href: '/', icon: 'grid_view', label: 'Inicio' },
		{ href: '/metricas', icon: 'insights', label: 'Métricas' }
	] as const;

	const RIGHT = [
		{ href: '/planes', icon: 'savings', label: 'Planes' },
		{ href: '/deudas', icon: 'account_balance_wallet', label: 'Deudas' }
	] as const;

	const pathname = $derived(page.url.pathname);

	function isActive(href: string): boolean {
		return href === '/' ? pathname === '/' : pathname.startsWith(href);
	}
</script>

<nav
	class="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px] border-t border-hairline/60 bg-surface/92 pb-safe shadow-[0_-4px_20px_rgba(19,27,46,0.05)] backdrop-blur-xl"
	aria-label="Navegación principal"
>
	<div class="relative mx-auto flex h-16 items-center justify-around px-1.5">
		{#each LEFT as item (item.href)}
			<a
				href={item.href}
				class="flex h-12 w-15 flex-col items-center justify-center gap-1 rounded-2xl transition-colors {isActive(
					item.href
				)
					? 'text-primary'
					: 'text-on-surface-variant hover:text-on-surface'}"
				aria-current={isActive(item.href) ? 'page' : undefined}
			>
				<Icon name={item.icon} size={22} filled={isActive(item.href)} />
				<span class="text-label-sm {isActive(item.href) ? 'font-semibold' : 'font-medium'}"
					>{item.label}</span
				>
			</a>
		{/each}

		<div class="relative -top-5 flex flex-col items-center">
			<a
				href="/movimientos/nuevo"
				class="flex size-13 items-center justify-center rounded-full bg-primary text-on-primary shadow-fab transition active:scale-95"
				aria-label="Registrar movimiento"
			>
				<Icon name="add" size={26} />
			</a>
		</div>

		{#each RIGHT as item (item.href)}
			<a
				href={item.href}
				class="flex h-12 w-15 flex-col items-center justify-center gap-1 rounded-2xl transition-colors {isActive(
					item.href
				)
					? 'text-primary'
					: 'text-on-surface-variant hover:text-on-surface'}"
				aria-current={isActive(item.href) ? 'page' : undefined}
			>
				<Icon name={item.icon} size={22} filled={isActive(item.href)} />
				<span class="text-label-sm {isActive(item.href) ? 'font-semibold' : 'font-medium'}"
					>{item.label}</span
				>
			</a>
		{/each}
	</div>
</nav>
