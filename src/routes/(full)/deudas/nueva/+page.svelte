<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/app/PageHeader.svelte';
	import AccountSelect from '#lib/components/ui/AccountSelect.svelte';
	import AmountField from '#lib/components/ui/AmountField.svelte';
	import DateField from '#lib/components/ui/DateField.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import OptionCards from '#lib/components/ui/OptionCards.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import { enhanceForm } from '#lib/utils/enhance';
	import type { FormState } from '#lib/utils/forms';
	import { addFrequency, installmentAmount, monthlyEquivalent } from '#lib/utils/finance';
	import { parseISODate, formatFullDate } from '#lib/utils/dates';
	import {
		DEBT_FREQUENCY_ICONS,
		DEBT_FREQUENCY_LABELS,
		DEBT_FREQUENCY_PERIODS,
		DEBT_KIND_DESCRIPTIONS,
		DEBT_KIND_ICONS,
		DEBT_KIND_LABELS
	} from '#lib/utils/labels';
	import { formatMoney, parseAmountInput } from '#lib/utils/money';
	import type { DebtFrequency, DebtKind, InterestKind } from '#lib/types/domain';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const formState = $derived(form as FormState | null);
	const previous: Record<string, string> = $derived(formState?.errors ?? {});
	const values: Record<string, string> = $derived(formState?.values ?? {});

	let name = $state(values.name ?? '');
	let creditor = $state(values.creditor ?? '');
	let kind = $state<DebtKind>((values.kind as DebtKind) ?? 'credit_card');
	let principalAmount = $state(values.principalAmount ?? '');
	let initialAmount = $state(values.initialAmount ?? '');
	let totalInstallments = $state(values.totalInstallments ?? '12');
	let paidInstallments = $state(values.paidInstallments ?? '0');
	let paymentFrequency = $state<DebtFrequency>(
		(values.paymentFrequency as DebtFrequency) ?? 'monthly'
	);
	let startedAt = $state(values.startedAt ?? data.today);
	let interestKind = $state<InterestKind>((values.interestKind as InterestKind) ?? 'msi');
	let interestRate = $state(values.interestRate ?? '0');
	let dueDay = $state(values.dueDay ?? data.defaultDueDay);
	let firstDueDate = $state(values.firstDueDate ?? data.defaultDueDate);
	let accountId = $state(values.accountId ?? data.defaultAccountId);
	let alertEnabled = $state(values.alertDaysBefore !== '0');
	let saving = $state(false);

	const kindOptions = $derived(
		(['credit_card', 'personal', 'family', 'mortgage'] as DebtKind[]).map((value) => ({
			value,
			label: DEBT_KIND_LABELS[value],
			description: DEBT_KIND_DESCRIPTIONS[value],
			icon: DEBT_KIND_ICONS[value]
		}))
	);

	const monthly = $derived(
		installmentAmount({
			principal: parseAmountInput(principalAmount) ?? 0,
			initialAmount: parseAmountInput(initialAmount) ?? 0,
			totalInstallments: Number(totalInstallments) || 1,
			interestKind,
			interestRate: interestKind === 'msi' ? 0 : Number(interestRate) || 0,
			frequency: paymentFrequency
		})
	);

	const monthlyEq = $derived(monthlyEquivalent(monthly, paymentFrequency));
	const periodLabel = $derived(DEBT_FREQUENCY_PERIODS[paymentFrequency]);

	const frequencyOptions = [
		{ value: 'weekly', label: 'Semanal', icon: DEBT_FREQUENCY_ICONS.weekly },
		{ value: 'biweekly', label: 'Quincenal', icon: DEBT_FREQUENCY_ICONS.biweekly },
		{ value: 'monthly', label: 'Mensual', icon: DEBT_FREQUENCY_ICONS.monthly }
	];

	const paidCount = $derived(
		Math.min(
			Math.max(Number(paidInstallments) || 0, 0),
			Math.max(Number(totalInstallments) || 0, 0)
		)
	);

	const dueDayValue = $derived(
		paymentFrequency === 'monthly' ? dueDay : String(parseISODate(firstDueDate).getDate())
	);

	const schedulePreview = $derived.by(() => {
		const visible = Math.min(Math.max(Number(totalInstallments) || 0, 0), 6);
		const first = parseISODate(firstDueDate);
		return Array.from({ length: visible }, (_, index) => ({
			number: index + 1,
			date: addFrequency(first, index, paymentFrequency),
			paid: index < paidCount
		}));
	});

	const incomeShare = $derived(data.monthlyIncome > 0 ? (monthlyEq / data.monthlyIncome) * 100 : 0);
</script>

{#snippet headerAction()}
	<button
		type="submit"
		form="debt-form"
		class="rounded-full px-3 py-1.5 text-label font-semibold text-primary disabled:opacity-50"
		disabled={saving}
	>
		Guardar
	</button>
{/snippet}

<PageHeader
	title="Registrar obligación"
	close
	centered
	backHref="/deudas"
	dirty={name.length > 0}
	action={headerAction}
/>

<form
	id="debt-form"
	method="POST"
	class="px-4 pt-4 pb-10"
	use:enhance={enhanceForm({
		success: 'Obligación registrada',
		onStart: () => (saving = true),
		onFinish: () => (saving = false)
	})}
>
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			<h1 class="text-title-lg text-ink">Registrar obligación</h1>
			<p class="mt-1 text-body text-on-surface-variant">
				Control riguroso de pasivos y cuotas mensuales.
			</p>
		</div>
		<span
			class="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary/10 px-2.5 py-1 text-label-sm font-semibold text-secondary"
		>
			<Icon name="health_and_safety" size={14} />
			Salud financiera
		</span>
	</div>

	{#if form?.message}
		<div
			class="mt-4 flex items-start gap-2 rounded-xl bg-tertiary/8 px-3 py-2.5 text-body-sm font-medium text-tertiary"
			role="alert"
		>
			<Icon name="error" size={18} class="mt-0.5 shrink-0" />
			{form.message}
		</div>
	{/if}

	<section class="mt-4 space-y-2">
		<h2 class="text-label-sm font-semibold tracking-wide text-on-surface-variant uppercase">
			Tipo de obligación
		</h2>
		<OptionCards
			name="kind"
			columns={2}
			options={kindOptions}
			bind:value={kind}
			error={previous.kind}
		/>
	</section>

	<section
		class="mt-4 space-y-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4"
	>
		<header class="flex items-center justify-between gap-2">
			<h2 class="flex items-center gap-2 text-title-sm text-ink">
				<Icon name="description" size={18} class="text-secondary" />
				Información general
			</h2>
		</header>

		<TextField
			label="Nombre de la obligación"
			name="name"
			placeholder="Ej. Visa Signature · MacBook Pro"
			bind:value={name}
			error={previous.name}
		/>

		<TextField
			label="Entidad o acreedor (opcional)"
			name="creditor"
			placeholder="Ej. Banco Nacional"
			bind:value={creditor}
			error={previous.creditor}
		/>

		<AmountField
			name="principalAmount"
			label="Monto total original o saldo"
			bind:value={principalAmount}
			currency={data.currency}
			tone="secondary"
			quickAmounts={[]}
			error={previous.principalAmount}
		/>

		<DateField
			name="startedAt"
			label="Fecha en que se generó"
			bind:date={startedAt}
			error={previous.startedAt}
		/>

		<div class="space-y-1">
			<AmountField
				name="initialAmount"
				label="Monto ya entregado (opcional)"
				bind:value={initialAmount}
				currency={data.currency}
				tone="secondary"
				quickAmounts={[]}
				error={previous.initialAmount}
			/>
			<p class="text-body-sm text-muted">Lo que ya abonaste al generar la deuda. Puede ser 0.</p>
		</div>
	</section>

	<section
		class="mt-4 space-y-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4"
	>
		<header class="flex items-center justify-between gap-2">
			<h2 class="flex items-center gap-2 text-title-sm text-ink">
				<Icon name="grid_view" size={18} class="text-secondary" />
				Plan de cuotas
			</h2>
			<span
				class="rounded-full bg-secondary/10 px-2 py-0.5 text-label-sm font-semibold text-secondary"
			>
				Amortización
			</span>
		</header>

		<div class="space-y-1.5">
			<p class="text-label-sm font-medium text-on-surface-variant">Frecuencia de pago</p>
			<SegmentedControl
				name="paymentFrequency"
				tone="secondary"
				options={frequencyOptions}
				bind:value={paymentFrequency}
			/>
		</div>

		<div class="grid grid-cols-2 gap-2">
			<TextField
				label="Total de cuotas"
				name="totalInstallments"
				type="number"
				inputmode="numeric"
				min="1"
				max="600"
				bind:value={totalInstallments}
				error={previous.totalInstallments}
			/>
			<TextField
				label="Ya pagadas"
				name="paidInstallments"
				type="number"
				inputmode="numeric"
				min="0"
				max="600"
				bind:value={paidInstallments}
				error={previous.paidInstallments}
			/>
		</div>

		<div class="flex items-center justify-between gap-3 rounded-2xl bg-secondary/6 px-3.5 py-3">
			<div class="min-w-0">
				<p class="text-label-sm font-semibold text-on-surface-variant uppercase">
					Cuota por periodo
				</p>
				<p class="text-body-sm text-muted">
					{DEBT_FREQUENCY_LABELS[paymentFrequency]} · calculada sin recargos
				</p>
			</div>
			<div class="shrink-0 text-right">
				<p class="tnum text-title-md font-bold text-primary">
					{formatMoney(monthly, data.currency)}
					<span class="text-body-sm font-medium text-muted">/{periodLabel}</span>
				</p>
				{#if paymentFrequency !== 'monthly'}
					<p class="text-label-sm font-medium text-muted">
						≈ {formatMoney(monthlyEq, data.currency)}/mes
					</p>
				{/if}
			</div>
		</div>
		<input type="hidden" name="monthlyPayment" value={monthly.toFixed(2)} />

		<div class="space-y-1.5">
			<p class="text-label-sm font-medium text-on-surface-variant">Régimen de tasa / interés</p>
			<SegmentedControl
				name="interestKind"
				tone="secondary"
				options={[
					{ value: 'msi', label: '0% MSI' },
					{ value: 'fixed', label: 'Fija' },
					{ value: 'variable', label: 'Variable' }
				]}
				bind:value={interestKind}
			/>
		</div>

		{#if interestKind !== 'msi'}
			<TextField
				label="Tasa anual (%)"
				name="interestRate"
				type="number"
				inputmode="decimal"
				min="0"
				max="200"
				step="0.01"
				bind:value={interestRate}
				error={previous.interestRate}
			/>
		{/if}
	</section>

	<section
		class="mt-4 space-y-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4"
	>
		<header class="flex items-center justify-between gap-2">
			<h2 class="flex items-center gap-2 text-title-sm text-ink">
				<Icon name="event" size={18} class="text-tertiary" />
				Calendario de pagos
			</h2>
		</header>

		<div class="space-y-2">
			{#if paymentFrequency === 'monthly'}
				<TextField
					label="Día límite de pago"
					name="dueDay"
					type="number"
					inputmode="numeric"
					min="1"
					max="31"
					bind:value={dueDay}
					hint="Día del mes"
					error={previous.dueDay}
				/>
			{:else}
				<input type="hidden" name="dueDay" value={dueDayValue} />
			{/if}
			<DateField
				name="firstDueDate"
				label="Primer vencimiento"
				bind:date={firstDueDate}
				error={previous.firstDueDate}
			/>
		</div>

		<div class="rounded-2xl border border-hairline/70 bg-level-1/40 p-3">
			<div class="flex items-center justify-between gap-2">
				<p class="text-label-sm font-semibold text-on-surface-variant uppercase">Primeras cuotas</p>
				<span class="text-label-sm text-muted">{paidCount} pagadas</span>
			</div>

			<ul class="mt-2 space-y-1.5">
				{#each schedulePreview as row (row.number)}
					<li class="flex items-center justify-between gap-2 text-body-sm">
						<span class="text-ink">Cuota {row.number}</span>
						<span class="min-w-0 flex-1 text-right text-muted">{formatFullDate(row.date)}</span>
						<span
							class="shrink-0 rounded-full px-2 py-0.5 text-label-sm font-semibold {row.paid
								? 'bg-primary/10 text-primary'
								: 'bg-level-1 text-on-surface-variant'}"
						>
							{row.paid ? 'Pagada' : 'Pendiente'}
						</span>
					</li>
				{/each}
			</ul>

			{#if Number(totalInstallments) > schedulePreview.length}
				<p class="mt-2 text-label-sm text-muted">
					+ {Number(totalInstallments) - schedulePreview.length} cuotas más
				</p>
			{/if}
			{#if paidCount > 0}
				<p class="mt-1.5 text-label-sm text-muted">
					Las primeras {paidCount} se registran como pagadas al guardar.
				</p>
			{/if}
		</div>

		<div class="rounded-2xl bg-level-1/70 p-3">
			<Switch
				label="Alertar 5 días antes"
				description="Evita penalizaciones e intereses moratorios"
				bind:checked={alertEnabled}
			/>
			<input type="hidden" name="alertDaysBefore" value={alertEnabled ? '5' : '0'} />
		</div>
	</section>

	<section class="mt-4 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4">
		<AccountSelect
			name="accountId"
			label="Cuenta de pago"
			bind:value={accountId}
			accounts={data.accounts}
			tone="secondary"
			error={previous.accountId}
		/>
	</section>

	<section class="mt-4 rounded-2xl bg-secondary/8 p-4">
		<p class="text-label-sm font-semibold tracking-wide text-secondary uppercase">
			Impacto en tu flujo de caja
		</p>
		<p class="mt-1 text-title-sm text-ink">
			Pagarás
			<span class="tnum font-bold text-secondary">{formatMoney(monthly, data.currency)}</span>
			cada {periodLabel}, equivalente a
			<span class="tnum font-bold text-secondary">{formatMoney(monthlyEq, data.currency)}</span>
			al mes.
		</p>
		{#if data.monthlyIncome > 0}
			<p class="mt-1.5 flex items-start gap-1.5 text-body-sm text-on-surface-variant">
				<Icon name="info" size={16} class="mt-0.5 shrink-0" />
				Comprometerá un
				<span class="font-semibold text-ink">{incomeShare.toFixed(1)}%</span>
				de tus ingresos mensuales previstos.
			</p>
		{:else}
			<p class="mt-1.5 flex items-start gap-1.5 text-body-sm text-on-surface-variant">
				<Icon name="info" size={16} class="mt-0.5 shrink-0" />
				Registra ingresos este mes para medir el peso de esta cuota.
			</p>
		{/if}
	</section>

	<button type="submit" class={buttonClass('primary', 'lg', true, 'mt-4')} disabled={saving}>
		{#if saving}
			<Icon name="progress_activity" size={20} class="animate-spin" />
		{:else}
			<Icon name="check_circle" size={20} />
		{/if}
		Registrar obligación
	</button>

	<p class="mt-3 flex items-center justify-center gap-1.5 text-label-sm text-muted">
		<Icon name="lock" size={14} />
		Tus datos financieros están cifrados con protocolo AES-256
	</p>
</form>
