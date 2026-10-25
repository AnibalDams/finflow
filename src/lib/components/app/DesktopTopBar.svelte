<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '#lib/components/ui/Icon.svelte';
	import OptionSheet from '#lib/components/ui/OptionSheet.svelte';
	import type { Account, DashboardAlert, Profile } from '#lib/types/domain';
	import NotificationsSheet from './NotificationsSheet.svelte';

	interface Props {
		accounts: Account[];
		profile: Profile;
		alerts: DashboardAlert[];
	}

	let { accounts, profile, alerts }: Props = $props();

	let notificationsOpen = $state(false);
	let accountSheetOpen = $state(false);
	let accountTrigger = $state<HTMLButtonElement | null>(null);

	const requested = $derived(page.url.searchParams.get('cuenta'));

	const selectedId = $derived(
		requested === 'all'
			? 'all'
			: (accounts.find((account) => account.id === requested)?.id ??
					accounts.find((account) => account.isPrimary)?.id ??
					accounts[0]?.id ??
					'all')
	);

	const selected = $derived(
		selectedId === 'all' ? null : (accounts.find((account) => account.id === selectedId) ?? null)
	);

	const accountLabel = $derived(selected ? selected.name : 'Todas las cuentas');

	const accountOptions = $derived([
		...accounts.map((account) => ({
			value: account.id,
			label: account.name,
			description: account.currency,
			icon: account.icon
		})),
		{
			value: 'all',
			label: 'Todas las cuentas',
			description: 'Resumen consolidado',
			icon: 'apps'
		}
	]);

	const initials = $derived(
		profile.fullName
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part.charAt(0).toUpperCase())
			.join('') || 'FF'
	);

	const searchValue = $derived(page.url.searchParams.get('q') ?? '');

	function selectAccount(value: string): void {
		const target = accountTrigger;

		void (async () => {
			if (page.url.pathname === '/') {
				const search = new URLSearchParams(page.url.searchParams.toString());
				search.set('cuenta', value);
				await goto(`/?${search.toString()}`, { reset: false });
			} else {
				await goto(`/?cuenta=${encodeURIComponent(value)}`);
			}

			// La navegación puede perder el foco: lo devolvemos al disparador.
			target?.focus({ preventScroll: true });
		})();
	}
</script>

<header
	class="fixed top-0 right-0 left-[280px] z-40 hidden h-[72px] border-b border-hairline/60 bg-surface/85 backdrop-blur-xl lg:flex"
>
	<div class="mx-auto flex h-full w-full max-w-[1440px] items-center gap-4 px-8">
		<button
			type="button"
			bind:this={accountTrigger}
			class="pressable flex h-10 max-w-60 shrink-0 items-center gap-2 rounded-xl border border-hairline bg-surface-container-lowest px-3 text-label font-medium text-ink transition hover:border-secondary/40"
			aria-haspopup="listbox"
			aria-expanded={accountSheetOpen}
			aria-label="Seleccionar cuenta"
			title="Filtrar Inicio por cuenta"
			onclick={() => (accountSheetOpen = true)}
		>
			<Icon name={selected?.icon ?? 'account_balance_wallet'} size={18} class="text-primary" />
			<span class="min-w-0 flex-1 truncate text-left">{accountLabel}</span>
			<Icon name="expand_more" size={17} class="shrink-0 text-muted" />
		</button>

		<form method="GET" action="/movimientos" class="min-w-0 flex-1" role="search">
			<label class="relative block max-w-xl">
				<span class="sr-only">Buscar transacciones</span>
				<Icon
					name="search"
					size={19}
					class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-soft"
				/>
				<input
					type="search"
					name="q"
					value={searchValue}
					placeholder="Buscar transacciones, fechas o notas…"
					autocomplete="off"
					class="h-10 w-full rounded-full border border-hairline bg-level-1/60 pr-3 pl-10 text-body text-ink placeholder:text-muted-soft focus:border-secondary focus:ring-3 focus:ring-secondary/12 focus:outline-none"
				/>
			</label>
		</form>

		<div class="ml-auto flex shrink-0 items-center gap-2">
			<button
				type="button"
				class="relative flex size-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-level-1 hover:text-on-surface"
				aria-label={alerts.length > 0
					? `Notificaciones, ${alerts.length} avisos pendientes`
					: 'Notificaciones'}
				onclick={() => (notificationsOpen = true)}
			>
				<Icon name="notifications" size={21} />
				{#if alerts.length > 0}
					<span class="absolute top-2 right-2 size-2 rounded-full bg-tertiary ring-2 ring-surface"
					></span>
				{/if}
			</button>

			<a
				href="/movimientos/nuevo"
				class="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-label font-semibold text-on-primary shadow-[0_8px_18px_-10px_rgba(0,108,73,0.75)] transition hover:bg-primary/90"
				aria-label="Registrar / Nuevo"
			>
				<Icon name="add" size={19} />
				<span class="hidden xl:inline">Registrar / Nuevo</span>
			</a>

			<a
				href="/ajustes"
				class="ml-1 flex size-10 items-center justify-center rounded-full"
				aria-label="Perfil y ajustes"
			>
				{#if profile.avatarUrl}
					<img
						src={profile.avatarUrl}
						alt=""
						class="size-9 rounded-full object-cover ring-2 ring-primary-container/20"
					/>
				{:else}
					<span
						class="flex size-9 items-center justify-center rounded-full bg-primary/12 text-label-sm font-bold text-primary ring-2 ring-primary-container/20"
					>
						{initials}
					</span>
				{/if}
			</a>
		</div>
	</div>
</header>

<OptionSheet
	bind:open={accountSheetOpen}
	title="Seleccionar cuenta"
	value={selectedId}
	options={accountOptions}
	tone="primary"
	returnFocus={accountTrigger}
	onchange={selectAccount}
/>

<NotificationsSheet bind:open={notificationsOpen} {alerts} />
