<script lang="ts">
	import { navigating, page } from '$app/state';
	import AppTopBar from '#lib/components/app/AppTopBar.svelte';
	import BottomNav from '#lib/components/app/BottomNav.svelte';
	import DesktopSidebar from '#lib/components/app/DesktopSidebar.svelte';
	import DesktopTopBar from '#lib/components/app/DesktopTopBar.svelte';
	import NavProgress from '#lib/components/app/NavProgress.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const SECTIONS: Array<[string, string]> = [
		['/', 'Inicio'],
		['/movimientos', 'Movimientos'],
		['/metricas', 'Métricas'],
		['/planes', 'Planes'],
		['/deudas', 'Deudas'],
		['/cuentas', 'Cuentas'],
		['/ajustes', 'Ajustes']
	];

	const section = $derived(
		SECTIONS.find(([href]) =>
			href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href)
		)?.[1] ?? 'Inicio'
	);
</script>

<NavProgress top="calc(env(safe-area-inset-top) + 64px)" topLg="0px" />

<AppTopBar {section} profile={data.profile} alerts={data.alerts} />

<DesktopSidebar
	profile={data.profile}
	activeGoals={data.summaries.goals.active}
	activeDebts={data.summaries.debts.count}
/>
<DesktopTopBar accounts={data.accounts} profile={data.profile} alerts={data.alerts} />

<main
	class="flex w-full flex-1 flex-col pt-16 pb-28 transition-opacity duration-150 lg:pt-[72px] lg:pb-0 lg:pl-[280px]"
	class:opacity-60={navigating.to !== null}
	aria-busy={navigating.to !== null}
>
	{#key page.route.id}
		<div class="animate-page-in flex w-full min-w-0 flex-1 flex-col">
			{@render children()}
		</div>
	{/key}
</main>

<BottomNav />
