<script lang="ts">
	import { page } from '$app/state';
	import Icon from '#lib/components/ui/Icon.svelte';
	import { cn } from '#lib/utils/cn';
	import type { Profile } from '#lib/types/domain';

	interface Props {
		profile: Profile;
		activeGoals: number;
		activeDebts: number;
	}

	let { profile, activeGoals, activeDebts }: Props = $props();

	interface NavItem {
		href: string;
		icon: string;
		label: string;
		badge?: number;
	}

	const items = $derived<NavItem[]>([
		{ href: '/', icon: 'grid_view', label: 'Inicio' },
		{ href: '/movimientos', icon: 'receipt_long', label: 'Movimientos' },
		{ href: '/cuentas', icon: 'account_balance_wallet', label: 'Cuentas / Patrimonio' },
		{ href: '/metricas', icon: 'insights', label: 'Estadísticas / Análisis' },
		{ href: '/planes', icon: 'savings', label: 'Planes / Metas', badge: activeGoals },
		{ href: '/deudas', icon: 'credit_card', label: 'Gestor de Deudas', badge: activeDebts },
		{ href: '/ajustes', icon: 'settings', label: 'Configuración' }
	]);

	const pathname = $derived(page.url.pathname);

	function isActive(href: string): boolean {
		return href === '/' ? pathname === '/' : pathname.startsWith(href);
	}

	const initials = $derived(
		profile.fullName
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part.charAt(0).toUpperCase())
			.join('') || 'FF'
	);
</script>

<aside
	class="fixed inset-y-0 left-0 z-40 hidden w-[280px] flex-col border-r border-hairline/60 bg-surface-container-lowest/75 px-4 pt-5 pb-4 backdrop-blur-xl lg:flex"
	aria-label="Navegación principal"
>
	<a
		href="/"
		class="flex items-center gap-3 rounded-xl px-2 py-1"
		aria-label="Ir al inicio de FinFlow"
	>
		<span
			class="flex size-10 items-center justify-center rounded-xl bg-primary text-on-primary shadow-fab"
		>
			<Icon name="account_balance_wallet" size={22} filled />
		</span>
		<span class="flex flex-col">
			<span class="text-title-md leading-none font-bold tracking-tight text-ink">FinFlow</span>
			<span class="mt-0.5 text-label-sm font-medium text-muted">Finanzas personales</span>
		</span>
	</a>

	<nav class="mt-8 flex-1 space-y-1 overflow-y-auto">
		{#each items as item (item.href)}
			<a
				href={item.href}
				class={cn(
					'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-label font-medium transition-colors',
					isActive(item.href)
						? 'bg-primary text-on-primary shadow-[0_8px_18px_-12px_rgba(0,108,73,0.9)]'
						: 'text-on-surface-variant hover:bg-level-1 hover:text-ink'
				)}
				aria-current={isActive(item.href) ? 'page' : undefined}
			>
				<Icon name={item.icon} size={20} filled={isActive(item.href)} />
				<span class="min-w-0 flex-1 truncate">{item.label}</span>
				{#if item.badge && item.badge > 0}
					<span
						class={cn(
							'flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-label-xs font-bold',
							isActive(item.href) ? 'bg-white/20 text-on-primary' : 'bg-primary/10 text-primary'
						)}
					>
						{item.badge}
					</span>
				{/if}
			</a>
		{/each}
	</nav>

	<a
		href="/ajustes"
		class="mt-4 flex items-center gap-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-3 transition hover:border-secondary/40"
		aria-label="Abrir configuración de la cuenta"
	>
		{#if profile.avatarUrl}
			<img src={profile.avatarUrl} alt="" class="size-10 shrink-0 rounded-full object-cover" />
		{:else}
			<span
				class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-label-sm font-bold text-primary"
			>
				{initials}
			</span>
		{/if}
		<span class="min-w-0 flex-1">
			<span class="block truncate text-label font-semibold text-ink">
				{profile.fullName || 'Tu perfil'}
			</span>
			<span class="block truncate text-label-sm text-muted">Ver ajustes</span>
		</span>
		<Icon name="settings" size={18} class="shrink-0 text-muted" />
	</a>
</aside>
