<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '#lib/components/ui/Icon.svelte';
	import ProgressBar from '#lib/components/ui/ProgressBar.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import { cn } from '#lib/utils/cn';
	import { enhanceForm } from '#lib/utils/enhance';
	import { addMonths, daysUntil, formatDayMonth, formatMonthName } from '#lib/utils/dates';
	import { DEBT_KIND_ICONS, DEBT_KIND_LABELS } from '#lib/utils/labels';
	import { formatMoney } from '#lib/utils/money';
	import type { Debt, DebtKind } from '#lib/types/domain';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let payingId = $state<string | null>(null);

	const now = new Date();

	const KIND_STYLES: Record<DebtKind, { accent: string; tile: string }> = {
		credit_card: { accent: 'border-l-tertiary', tile: 'bg-tertiary/10 text-tertiary' },
		personal: { accent: 'border-l-primary', tile: 'bg-primary/10 text-primary' },
		family: { accent: 'border-l-secondary', tile: 'bg-secondary/10 text-secondary' },
		mortgage: { accent: 'border-l-secondary', tile: 'bg-secondary/10 text-secondary' },
		other: { accent: 'border-l-outline-variant', tile: 'bg-level-1 text-muted' }
	};

	const filters = $derived([
		{ value: 'todas', label: `Todas (${data.counts.todas})`, href: '/deudas' },
		{ value: 'tarjetas', label: `Tarjetas (${data.counts.tarjetas})`, href: '/deudas?tipo=tarjetas' },
		{
			value: 'prestamos',
			label: `Préstamos (${data.counts.prestamos})`,
			href: '/deudas?tipo=prestamos'
		},
		{ value: 'familia', label: `Familia (${data.counts.familia})`, href: '/deudas?tipo=familia' }
	]);

	const payoffDate = $derived(
		data.projection.baseline.months > 0
			? formatMonthName(addMonths(now, data.projection.baseline.months), true)
			: null
	);

	function statusOf(debt: Debt): { label: string; tone: string } {
		const days = daysUntil(debt.nextDueDate, now);

		if (days < 0) return { label: 'Vencida', tone: 'bg-tertiary/10 text-tertiary' };
		if (debt.installmentsLeft <= 1) {
			return { label: 'Finaliza pronto', tone: 'bg-primary/10 text-primary' };
		}
		if (days === 0) return { label: 'Vence hoy', tone: 'bg-tertiary/10 text-tertiary' };
		if (days <= debt.alertDaysBefore) {
			return { label: `En ${days} días`, tone: 'bg-tertiary/10 text-tertiary' };
		}
		return { label: 'Al día', tone: 'bg-secondary/10 text-secondary' };
	}

	function confirmPayment(event: MouseEvent, debt: Debt): void {
		const button = event.currentTarget as HTMLButtonElement;
		const message = `¿Registrar el pago de ${formatMoney(debt.monthlyPayment, data.currency)} para ${debt.name}?`;
		if (window.confirm(message)) button.form?.requestSubmit();
	}
</script>

<div class="space-y-4 px-4 pt-4">
	<section class="rounded-3xl bg-inverse-surface p-5 text-inverse-on-surface shadow-hero">
		<header class="flex items-center justify-between gap-2">
			<span class="flex items-center gap-1.5 text-label-sm font-semibold tracking-wide uppercase">
				<Icon name="account_balance" size={16} class="text-primary-container" />
				Estado de amortización
			</span>
			<span class="flex items-center gap-1.5 rounded-full bg-primary-container/20 px-2.5 py-1 text-label-sm font-semibold text-primary-container">
				<span class="size-1.5 rounded-full bg-primary-container" aria-hidden="true"></span>
				En curso
			</span>
		</header>

		<p class="mt-4 text-label-sm font-semibold tracking-wide text-inverse-on-surface/60 uppercase">
			Deuda total pendiente
		</p>
		<p class="tnum mt-1 flex items-baseline gap-1.5">
			<span class="text-[2rem] leading-none font-bold">{formatMoney(data.totals.remaining, data.currency)}</span>
			<span class="text-body-sm text-inverse-on-surface/60">{data.currency}</span>
		</p>

		<div class="mt-4 grid grid-cols-2 gap-2">
			<div class="rounded-2xl bg-white/8 p-3">
				<p class="text-label-sm text-inverse-on-surface/60">Compromiso mensual</p>
				<p class="tnum mt-0.5 text-title-sm font-bold">
					{formatMoney(data.totals.monthly, data.currency)}
				</p>
				<p class="text-label-sm text-inverse-on-surface/60">
					{data.active.length} {data.active.length === 1 ? 'cuota activa' : 'cuotas activas'}
				</p>
			</div>
			<div class="rounded-2xl bg-white/8 p-3">
				<p class="text-label-sm text-inverse-on-surface/60">Total amortizado</p>
				<p class="tnum mt-0.5 text-title-sm font-bold">
					{formatMoney(data.totals.paid, data.currency)}
				</p>
				<p class="text-label-sm text-inverse-on-surface/60">
					de {formatMoney(data.totals.historical, data.currency)} hist.
				</p>
			</div>
		</div>

		<div class="mt-4 flex items-center justify-between text-label-sm">
			<span class="text-inverse-on-surface/70">Progreso de liberación</span>
			<span class="font-semibold text-primary-container">
				{Math.round(data.totals.progress)}% pagado
			</span>
		</div>
		<div class="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
			<div
				class="h-full rounded-full bg-primary-container"
				style="width:{Math.min(100, data.totals.progress)}%"
			></div>
		</div>
	</section>

	<a href="/deudas/nueva" class={buttonClass('primary', 'lg', true)}>
		<span class="flex size-6 items-center justify-center rounded-full border-2 border-white/70">
			<Icon name="add" size={16} />
		</span>
		Registrar deuda / cuota
	</a>

	{#if data.alerts.length > 0}
		<section class="rounded-2xl bg-secondary/6 p-3.5">
			<div class="flex items-start gap-3">
				<span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-secondary">
					<Icon name="event_upcoming" size={20} />
				</span>
				<div class="min-w-0 flex-1">
					<div class="flex items-start justify-between gap-2">
						<p class="text-title-sm text-ink">Próximos 30 días</p>
						<span class="rounded-full bg-secondary/10 px-2 py-0.5 text-label-sm font-semibold text-secondary">
							{data.alerts.length} {data.alerts.length === 1 ? 'alerta' : 'alertas'}
						</span>
					</div>
					<p class="mt-0.5 text-body-sm text-on-surface-variant">
						Programa tus cuotas antes de la fecha límite para blindar tu historial y evitar cargos
						moratorios.
					</p>
				</div>
			</div>

			<div class="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
				{#each data.alerts as alert (alert.debt.id)}
					<a
						href={`/deudas/${alert.debt.id}`}
						class={cn(
							'flex shrink-0 items-center gap-1.5 rounded-lg border bg-surface-container-lowest px-2.5 py-1.5 text-label-sm font-semibold whitespace-nowrap',
							alert.overdue
								? 'border-tertiary/40 text-tertiary'
								: 'border-outline-variant text-ink'
						)}
					>
						<Icon name={alert.overdue ? 'error' : 'schedule'} size={14} />
						{formatDayMonth(alert.dueDate)} • {formatMoney(alert.amount, data.currency)}
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<section>
		<div class="flex items-end justify-between gap-2">
			<h2 class="text-title-md text-ink">Obligaciones activas</h2>
			<span class="text-label-sm text-muted">
				{data.active.length} {data.active.length === 1 ? 'compromiso' : 'compromisos'}
			</span>
		</div>

		<div class="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
			{#each filters as filter (filter.value)}
				<a
					href={filter.href}
					aria-current={data.filter === filter.value ? 'page' : undefined}
					class="shrink-0 rounded-full px-3 py-1.5 text-label-sm font-semibold whitespace-nowrap transition"
					class:bg-inverse-surface={data.filter === filter.value}
					class:text-inverse-on-surface={data.filter === filter.value}
					class:bg-level-1={data.filter !== filter.value}
					class:text-on-surface-variant={data.filter !== filter.value}
				>
					{filter.label}
				</a>
			{/each}
		</div>

		<div class="mt-2 space-y-3">
			{#each data.filtered as debt (debt.id)}
				{@const style = KIND_STYLES[debt.kind]}
				{@const status = statusOf(debt)}
				{@const urgent = data.urgentIds.includes(debt.id)}
				<article
					class="rounded-2xl border border-hairline/70 border-l-4 {style.accent} bg-surface-container-lowest p-3.5 shadow-card"
				>
					<div class="flex items-start gap-3">
						<span class="flex size-11 shrink-0 items-center justify-center rounded-xl {style.tile}">
							<Icon name={DEBT_KIND_ICONS[debt.kind]} size={22} />
						</span>
						<div class="min-w-0 flex-1">
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0">
									<p class="truncate text-title-sm text-ink">{debt.name}</p>
									<p class="truncate text-body-sm text-muted">
										{debt.creditor ?? DEBT_KIND_LABELS[debt.kind]}
									</p>
								</div>
								<span class="shrink-0 rounded-full px-2 py-0.5 text-label-sm font-semibold {status.tone}">
									{status.label}
								</span>
							</div>
						</div>
					</div>

					<div class="mt-3 grid grid-cols-2 gap-2">
						<div>
							<p class="text-label-sm text-muted">Saldo restante</p>
							<p class="tnum text-title-sm font-bold text-ink">
								{formatMoney(debt.remainingAmount, data.currency)}
							</p>
							<p class="text-label-sm text-muted">
								de {formatMoney(debt.principalAmount, data.currency)} orig.
							</p>
						</div>
						<div class="text-right">
							<p class="text-label-sm text-muted">Cuota mensual</p>
							<p class="tnum text-title-sm font-bold text-ink">
								{formatMoney(debt.monthlyPayment, data.currency)}
							</p>
							<p class="text-label-sm text-muted">Vence: {formatDayMonth(debt.nextDueDate)}</p>
						</div>
					</div>

					<div class="mt-3">
						<div class="flex items-center justify-between text-label-sm">
							<span class="text-on-surface-variant">
								{debt.installmentsPaid} de {debt.totalInstallments} cuotas amortizadas
							</span>
							<span class="font-semibold text-ink">{Math.round(debt.progressPercent)}%</span>
						</div>
						<div class="mt-1">
							<ProgressBar
								value={debt.progressPercent}
								size="sm"
								tone={urgent ? 'tertiary' : 'secondary'}
							/>
						</div>
					</div>

					<div class="mt-3 flex items-stretch gap-2">
						<form
							method="POST"
							action="?/pay"
							class="flex-1"
							use:enhance={enhanceForm({
								success: 'Pago registrado',
								onStart: () => (payingId = debt.id),
								onFinish: () => (payingId = null)
							})}
						>
							<input type="hidden" name="debtId" value={debt.id} />
							<input type="hidden" name="amount" value={debt.monthlyPayment.toFixed(2)} />
							<input type="hidden" name="accountId" value={debt.accountId ?? ''} />
							<button
								type="button"
								class={buttonClass(urgent ? 'primary' : 'tonal', 'md', true)}
								disabled={payingId === debt.id}
								onclick={(event) => confirmPayment(event, debt)}
							>
								{#if payingId === debt.id}
									<Icon name="progress_activity" size={18} class="animate-spin" />
								{:else}
									<Icon name="payments" size={18} />
								{/if}
								Pagar cuota ({formatMoney(debt.monthlyPayment, data.currency)})
							</button>
						</form>
						<a
							href={`/deudas/${debt.id}`}
							class="flex w-11 shrink-0 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest text-secondary"
							aria-label={`Ver detalle de ${debt.name}`}
						>
							<Icon name="calendar_month" size={20} />
						</a>
					</div>
				</article>
			{:else}
				<div class="rounded-2xl border border-dashed border-outline-variant px-4 py-8 text-center">
					<p class="text-body text-on-surface-variant">
						{data.active.length === 0
							? 'No tienes deudas activas. ¡Buen momento para planificar!'
							: 'No hay deudas en este filtro.'}
					</p>
					{#if data.active.length === 0}
						<a href="/deudas/nueva" class="mt-3 inline-flex text-label font-semibold text-primary">
							Registrar mi primera deuda
						</a>
					{/if}
				</div>
			{/each}
		</div>
	</section>

	{#if data.active.length > 0}
		<section class="rounded-2xl bg-secondary/6 p-4">
			<div class="flex items-start justify-between gap-2">
				<div>
					<p class="text-title-sm text-ink">Proyección de cero deudas</p>
					<p class="text-label-sm text-secondary">
						{payoffDate ?? 'Sin proyección disponible'}
					</p>
				</div>
				<span class="flex size-9 items-center justify-center rounded-full bg-secondary/12 text-secondary">
					<Icon name="trending_down" size={20} />
				</span>
			</div>

			<p class="mt-2 text-body text-on-surface-variant">
				Manteniendo el ritmo actual de pagos programados
				({formatMoney(data.projection.monthlyCommitment, data.currency)}/mes), saldarás tus pasivos en
				{data.projection.baseline.months}
				{data.projection.baseline.months === 1 ? 'mes' : 'meses'}.
				{#if data.projection.interestSaved > 0}
					Adelantar pagos a la deuda con mayor tasa podría ahorrarte hasta
					{formatMoney(data.projection.interestSaved, data.currency)} en intereses.
				{/if}
			</p>

			<div class="mt-3 flex items-center gap-2 border-t border-secondary/15 pt-3">
				<Icon name="savings" size={18} class="text-primary" />
				<p class="text-label-sm text-on-surface-variant">
					Ahorro estimado en intereses:
					<span class="tnum font-semibold text-ink">
						{formatMoney(data.projection.interestSaved, data.currency)}
					</span>
				</p>
			</div>
		</section>
	{/if}
</div>
