<script lang="ts">
	import { page } from '$app/state';
	import AppTopBar from '#lib/components/app/AppTopBar.svelte';
	import BottomNav from '#lib/components/app/BottomNav.svelte';
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

<AppTopBar {section} profile={data.profile} alerts={data.alerts} />

<main class="flex w-full flex-1 flex-col pt-16 pb-28">
	{@render children()}
</main>

<BottomNav />
