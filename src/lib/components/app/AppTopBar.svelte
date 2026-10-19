<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import type { DashboardAlert, Profile } from '#lib/types/domain';
	import NotificationsSheet from './NotificationsSheet.svelte';

	interface Props {
		section: string;
		profile: Profile;
		alerts: DashboardAlert[];
	}

	let { section, profile, alerts }: Props = $props();

	let notificationsOpen = $state(false);

	const initials = $derived(
		profile.fullName
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part.charAt(0).toUpperCase())
			.join('') || 'FF'
	);
</script>

<header
	class="fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-[430px] bg-surface/80 pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl"
>
	<div class="flex h-16 items-center justify-between px-4">
		<a href="/" class="flex items-center gap-2.5 rounded-xl" aria-label="Ir al inicio de FinFlow">
			<span class="flex size-8 items-center justify-center rounded-xl bg-primary text-on-primary">
				<Icon name="account_balance_wallet" size={18} filled />
			</span>
			<span class="flex flex-col">
				<span class="text-title-sm leading-none tracking-tight text-ink">FinFlow</span>
				<span class="text-label-sm font-medium text-on-surface-variant">{section}</span>
			</span>
		</a>

		<div class="flex items-center gap-0.5">
			<button
				type="button"
				class="relative flex size-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-level-1 hover:text-on-surface"
				aria-label={alerts.length > 0
					? `Notificaciones, ${alerts.length} avisos pendientes`
					: 'Notificaciones'}
				onclick={() => (notificationsOpen = true)}
			>
				<Icon name="notifications" size={22} />
				{#if alerts.length > 0}
					<span class="absolute top-2.5 right-2.5 size-2 rounded-full bg-tertiary ring-2 ring-surface"
					></span>
				{/if}
			</button>

			<a
				href="/ajustes"
				class="flex size-10 items-center justify-center rounded-full"
				aria-label="Perfil y ajustes"
			>
				<span
					class="flex size-8 items-center justify-center rounded-full bg-primary/12 text-label-sm font-bold text-primary ring-2 ring-primary-container/20"
				>
					{initials}
				</span>
			</a>
		</div>
	</div>
</header>

<NotificationsSheet bind:open={notificationsOpen} {alerts} />
