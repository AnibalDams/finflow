<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<div class="flex min-h-dvh flex-col bg-background lg:grid lg:grid-cols-[1.05fr_1fr]">
	<aside
		class="hidden flex-col justify-between bg-inverse-surface p-12 text-inverse-on-surface lg:flex"
		aria-hidden="true"
	>
		<div class="flex items-center gap-3">
			<span
				class="flex size-11 items-center justify-center rounded-2xl bg-primary-container text-inverse-surface"
			>
				<Icon name="account_balance_wallet" size={24} filled />
			</span>
			<span class="text-title-lg font-bold tracking-tight">FinFlow</span>
		</div>

		<div class="max-w-md">
			<p class="text-label-sm font-semibold tracking-[0.18em] text-primary-container uppercase">
				Finanzas personales
			</p>
			<h2 class="mt-3 text-title-xl leading-tight font-bold">
				Claridad total sobre tu dinero, en un solo lugar.
			</h2>
			<p class="mt-4 text-body-lg text-inverse-on-surface/70">
				Movimientos, presupuestos, metas y deudas conectados en un panel que te ayuda a decidir
				mejor.
			</p>

			<ul class="mt-8 space-y-3 text-body text-inverse-on-surface/80">
				<li class="flex items-center gap-3">
					<span
						class="flex size-8 items-center justify-center rounded-full bg-primary/20 text-primary-fixed"
					>
						<Icon name="insights" size={17} />
					</span>
					Métricas y comparativas de tus periodos
				</li>
				<li class="flex items-center gap-3">
					<span
						class="flex size-8 items-center justify-center rounded-full bg-secondary/30 text-secondary-fixed"
					>
						<Icon name="savings" size={17} />
					</span>
					Planes de ahorro con seguimiento real
				</li>
				<li class="flex items-center gap-3">
					<span
						class="flex size-8 items-center justify-center rounded-full bg-tertiary/30 text-tertiary-fixed"
					>
						<Icon name="credit_card" size={17} />
					</span>
					Control de cuotas y fechas de pago
				</li>
			</ul>
		</div>

		<p class="flex items-center gap-2 text-label-sm text-inverse-on-surface/50">
			<Icon name="lock" size={15} />
			Tus datos financieros se procesan de forma privada.
		</p>
	</aside>

	<div class="flex min-h-dvh flex-col lg:min-h-0 lg:justify-center lg:py-10">
		<header class="flex flex-col items-center gap-2.5 px-6 pt-12 pt-safe pb-6 text-center lg:pt-0">
			<span
				class="flex size-13 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-fab lg:hidden"
			>
				<Icon name="account_balance_wallet" size={26} filled />
			</span>
			<div>
				<h1 class="text-title-lg tracking-tight text-ink lg:text-title-xl">FinFlow</h1>
				<p class="mt-0.5 text-body text-muted">Tus finanzas personales, claras y bajo control.</p>
			</div>
		</header>

		<div
			class="flex-1 px-5 pb-10 pb-safe lg:mx-auto lg:w-full lg:max-w-md lg:flex-none lg:px-6 lg:pb-0"
		>
			{@render children()}
		</div>
	</div>
</div>
