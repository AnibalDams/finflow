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
	import { installmentAmount } from '#lib/utils/finance';
	import { DEBT_KIND_DESCRIPTIONS, DEBT_KIND_ICONS, DEBT_KIND_LABELS } from '#lib/utils/labels';
	import { formatMoney, parseAmountInput } from '#lib/utils/money';
	import type { DebtKind, InterestKind } from '#lib/types/domain';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const formState = $derived(form as FormState | null);
	const previous: Record<string, string> = $derived(formState?.errors ?? {});
	const values: Record<string, string> = $derived(formState?.values ?? {});

	let name = $state(values.name ?? '');
	let creditor = $state(values.creditor ?? '');
	let kind = $state<DebtKind>((values.kind as DebtKind) ?? 'credit_card');
	let principalAmount = $state(values.principalAmount ?? '');
	let totalInstallments = $state(values.totalInstallments ?? '12');
	let paidInstallments = $state(values.paidInstallments ?? '0');
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
			totalInstallments: Number(totalInstallments) || 1,
			interestKind,
			interestRate: interestKind === 'msi' ? 0 : Number(interestRate) || 0
		})
	);

	const incomeShare = $derived(
		data.monthlyIncome > 0 ? (monthly / data.monthlyIncome) * 100 : 0
	);
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

	<section class="mt-4 space-y-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4">
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
	</section>

	<section class="mt-4 space-y-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4">
		<header class="flex items-center justify-between gap-2">
			<h2 class="flex items-center gap-2 text-title-sm text-ink">
				<Icon name="grid_view" size={18} class="text-secondary" />
				Plan de cuotas
			</h2>
			<span class="rounded-full bg-secondary/10 px-2 py-0.5 text-label-sm font-semibold text-secondary">
				Amortización
			</span>
		</header>

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
					Cuota mensual estimada
				</p>
				<p class="text-body-sm text-muted">Calculado sin recargos</p>
			</div>
			<p class="tnum shrink-0 text-title-md font-bold text-primary">
				{formatMoney(monthly, data.currency)}
				<span class="text-body-sm font-medium text-muted">/mes</span>
			</p>
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

	<section class="mt-4 space-y-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4">
		<header class="flex items-center justify-between gap-2">
			<h2 class="flex items-center gap-2 text-title-sm text-ink">
				<Icon name="event" size={18} class="text-tertiary" />
				Calendario de pagos
			</h2>
		</header>

		<div class="space-y-2">
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
			<DateField
				name="firstDueDate"
				label="Primer vencimiento"
				bind:date={firstDueDate}
				error={previous.firstDueDate}
			/>
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
			Esta obligación sumará
			<span class="tnum font-bold text-secondary">{formatMoney(monthly, data.currency)}</span>
			a tus gastos fijos mensuales.
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
