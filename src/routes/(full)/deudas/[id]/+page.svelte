<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/app/PageHeader.svelte';
	import AccountSelect from '#lib/components/ui/AccountSelect.svelte';
	import AmountField from '#lib/components/ui/AmountField.svelte';
	import DateField from '#lib/components/ui/DateField.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import ProgressBar from '#lib/components/ui/ProgressBar.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import { enhanceForm } from '#lib/utils/enhance';
	import type { FormState } from '#lib/utils/forms';
	import { daysUntil, formatDayMonth, formatFullDate } from '#lib/utils/dates';
	import { DEBT_KIND_ICONS, DEBT_KIND_LABELS, INTEREST_KIND_LABELS } from '#lib/utils/labels';
	import { formatMoney } from '#lib/utils/money';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const debt = $derived(data.debt);
	const formState = $derived(form as FormState | null);
	const previous: Record<string, string> = $derived(formState?.errors ?? {});

	const now = new Date();
	const days = $derived(daysUntil(debt.nextDueDate, now));

	const status = $derived.by(() => {
		if (!debt.isActive) return { label: 'Saldada', tone: 'bg-primary/10 text-primary' };
		if (days < 0) return { label: 'Vencida', tone: 'bg-tertiary/10 text-tertiary' };
		if (days === 0) return { label: 'Vence hoy', tone: 'bg-tertiary/10 text-tertiary' };
		if (days <= debt.alertDaysBefore) {
			return { label: `En ${days} días`, tone: 'bg-tertiary/10 text-tertiary' };
		}
		return { label: 'Al día', tone: 'bg-secondary/10 text-secondary' };
	});

	let amount = $state(debt.monthlyPayment.toFixed(2));
	let occurredAt = $state(data.today);
	let payAccount = $state(data.defaultAccountId);
	let note = $state('');
	let paying = $state(false);

	let editName = $state(debt.name);
	let editCreditor = $state(debt.creditor ?? '');
	let editMonthly = $state(debt.monthlyPayment.toFixed(2));
	let editDueDay = $state(String(debt.dueDay));
	let editFirstDue = $state(debt.firstDueDate);
	let editAccount = $state(debt.accountId ?? '');
	let editNotes = $state(debt.notes ?? '');
	let editAlert = $state(debt.alertDaysBefore > 0);
	let savingEdit = $state(false);
	let deleting = $state(false);

	function confirmDelete(event: MouseEvent): void {
		const button = event.currentTarget as HTMLButtonElement;
		if (!window.confirm('¿Eliminar esta deuda y su historial de pagos?')) return;
		deleting = true;
		button.form?.requestSubmit();
	}
</script>

<PageHeader title={debt.name} backHref="/deudas" />

<div class="space-y-4 px-4 pt-4 pb-10">
	<section class="rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4 shadow-card">
		<div class="flex items-start gap-3">
			<span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
				<Icon name={DEBT_KIND_ICONS[debt.kind]} size={22} />
			</span>
			<div class="min-w-0 flex-1">
				<p class="text-label-sm text-muted uppercase">{DEBT_KIND_LABELS[debt.kind]}</p>
				<p class="truncate text-title-sm text-ink">{debt.creditor ?? debt.name}</p>
			</div>
			<span class="shrink-0 rounded-full px-2.5 py-1 text-label-sm font-semibold {status.tone}">
				{status.label}
			</span>
		</div>

		<p class="mt-4 text-label-sm text-muted uppercase">Saldo restante</p>
		<p class="tnum text-title-xl font-bold text-ink">
			{formatMoney(debt.remainingAmount, data.currency)}
		</p>
		<p class="text-body-sm text-muted">
			de {formatMoney(debt.principalAmount, data.currency)} originales
		</p>

		<div class="mt-3">
			<ProgressBar
				value={debt.progressPercent}
				size="md"
				tone={debt.isActive ? 'secondary' : 'primary'}
			/>
		</div>
		<div class="mt-1.5 flex items-center justify-between text-label-sm">
			<span class="text-on-surface-variant">
				{debt.installmentsPaid} de {debt.totalInstallments} cuotas amortizadas
			</span>
			<span class="font-semibold text-ink">{Math.round(debt.progressPercent)}%</span>
		</div>

		<div class="mt-4 grid grid-cols-2 gap-2 border-t border-hairline pt-3">
			<div>
				<p class="text-label-sm text-muted uppercase">Cuota mensual</p>
				<p class="tnum text-title-sm font-bold text-ink">
					{formatMoney(debt.monthlyPayment, data.currency)}
				</p>
			</div>
			<div class="text-right">
				<p class="text-label-sm text-muted uppercase">Próximo vencimiento</p>
				<p class="text-title-sm font-bold text-ink">{formatDayMonth(debt.nextDueDate)}</p>
			</div>
		</div>

		<div class="mt-2 grid grid-cols-2 gap-2">
			<div>
				<p class="text-label-sm text-muted uppercase">Tasa</p>
				<p class="text-label text-ink">
					{INTEREST_KIND_LABELS[debt.interestKind]}
					{#if debt.interestRate > 0}· {debt.interestRate}%{/if}
				</p>
			</div>
			<div class="text-right">
				<p class="text-label-sm text-muted uppercase">Pago desde</p>
				<p class="text-label text-ink">
					{data.accounts.find((account) => account.id === debt.accountId)?.name ??
						'Cuenta principal'}
				</p>
			</div>
		</div>
	</section>

	{#if form?.message}
		<div
			class="flex items-start gap-2 rounded-xl bg-tertiary/8 px-3 py-2.5 text-body-sm font-medium text-tertiary"
			role="alert"
		>
			<Icon name="error" size={18} class="mt-0.5 shrink-0" />
			{form.message}
		</div>
	{/if}

	{#if debt.isActive}
		<section class="rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4">
			<h2 class="text-title-sm text-ink">Registrar pago</h2>
			<p class="mt-0.5 text-body-sm text-muted">
				Se creará un gasto en la cuenta seleccionada automáticamente.
			</p>

			<form
				method="POST"
				action="?/pay"
				class="mt-3 space-y-3"
				use:enhance={enhanceForm({
					success: 'Pago registrado',
					onStart: () => (paying = true),
					onFinish: () => (paying = false)
				})}
			>
				<AmountField
					name="amount"
					label="Monto del pago"
					bind:value={amount}
					currency={data.currency}
					tone="primary"
					quickAmounts={[]}
					error={previous.amount}
				/>

				<DateField name="occurredAt" label="Fecha del pago" bind:date={occurredAt} error={previous.occurredAt} />

				<AccountSelect
					name="accountId"
					label="Cuenta de pago"
					bind:value={payAccount}
					accounts={data.accounts}
					tone="primary"
					error={previous.accountId}
				/>

				<TextField
					label="Nota (opcional)"
					name="note"
					icon="sticky_note_2"
					placeholder="Ej. Pago de noviembre"
					bind:value={note}
					error={previous.note}
				/>

				<button type="submit" class={buttonClass('primary', 'md', true)} disabled={paying}>
					{#if paying}
						<Icon name="progress_activity" size={18} class="animate-spin" />
					{:else}
						<Icon name="payments" size={18} />
					{/if}
					Pagar {formatMoney(debt.monthlyPayment, data.currency)}
				</button>
			</form>
		</section>
	{/if}

	<section>
		<div class="flex items-end justify-between gap-2">
			<h2 class="text-title-sm text-ink">Historial de pagos</h2>
			<span class="text-label-sm text-muted">{data.payments.length} pagos</span>
		</div>

		<div class="mt-2 divide-y divide-hairline/70 rounded-2xl border border-hairline/70 bg-surface-container-lowest px-4">
			{#each data.payments as payment (payment.id)}
				<div class="flex items-center gap-3 py-3">
					<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
						<Icon name="check" size={18} />
					</span>
					<div class="min-w-0 flex-1">
						<p class="truncate text-label font-medium text-ink">
							{payment.note ?? `Cuota ${payment.installmentNumber ?? ''}`.trim()}
						</p>
						<p class="text-body-sm text-muted">
							{formatFullDate(payment.occurredAt)}
							{#if payment.installmentNumber}· Cuota {payment.installmentNumber}{/if}
						</p>
					</div>
					<span class="tnum shrink-0 text-label font-bold text-ink">
						{formatMoney(payment.amount, data.currency)}
					</span>
				</div>
			{:else}
				<p class="py-6 text-center text-body-sm text-muted">
					Aún no registras pagos de esta deuda.
				</p>
			{/each}
		</div>
	</section>

	<details class="rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4">
		<summary class="flex cursor-pointer items-center gap-2 text-title-sm text-ink">
			<Icon name="tune" size={18} class="text-secondary" />
			Ajustar deuda
		</summary>

		<form
			method="POST"
			action="?/update"
			class="mt-4 space-y-3"
			use:enhance={enhanceForm({
				success: 'Deuda actualizada',
				onStart: () => (savingEdit = true),
				onFinish: () => (savingEdit = false)
			})}
		>
			<input type="hidden" name="kind" value={debt.kind} />
			<input type="hidden" name="principalAmount" value={debt.principalAmount.toFixed(2)} />
			<input type="hidden" name="totalInstallments" value={debt.totalInstallments} />
			<input type="hidden" name="interestKind" value={debt.interestKind} />
			<input type="hidden" name="interestRate" value={debt.interestRate} />

			<TextField label="Nombre" name="name" bind:value={editName} error={previous.name} />
			<TextField
				label="Entidad o acreedor"
				name="creditor"
				bind:value={editCreditor}
				error={previous.creditor}
			/>

			<AmountField
				name="monthlyPayment"
				label="Cuota mensual"
				bind:value={editMonthly}
				currency={data.currency}
				tone="secondary"
				quickAmounts={[]}
				error={previous.monthlyPayment}
			/>

			<div class="space-y-2">
				<TextField
					label="Día límite"
					name="dueDay"
					type="number"
					inputmode="numeric"
					min="1"
					max="31"
					bind:value={editDueDay}
					error={previous.dueDay}
				/>
				<DateField
					name="firstDueDate"
					label="Primer vencimiento"
					bind:date={editFirstDue}
					error={previous.firstDueDate}
				/>
			</div>

			<AccountSelect
				name="accountId"
				label="Cuenta de pago"
				bind:value={editAccount}
				accounts={data.accounts}
				tone="secondary"
				error={previous.accountId}
			/>

			<div class="rounded-2xl bg-level-1/70 p-3">
				<label class="flex cursor-pointer items-center justify-between gap-3">
					<span class="text-label font-medium text-ink">Alertar 5 días antes</span>
					<input
						type="checkbox"
						bind:checked={editAlert}
						class="size-5 rounded border-outline accent-primary"
					/>
				</label>
				<input type="hidden" name="alertDaysBefore" value={editAlert ? '5' : '0'} />
			</div>

			<div class="space-y-1.5">
				<label for="debt-notes" class="block text-label-sm font-medium text-on-surface-variant">
					Notas
				</label>
				<textarea
					id="debt-notes"
					name="notes"
					rows="2"
					bind:value={editNotes}
					class="w-full rounded-xl border border-hairline bg-surface-container-lowest px-3.5 py-2.5 text-body text-ink placeholder:text-muted-soft focus:border-secondary focus:ring-3 focus:ring-secondary/12 focus:outline-none"
					placeholder="Detalles del acuerdo"
				></textarea>
			</div>

			<button type="submit" class={buttonClass('secondary', 'md', true)} disabled={savingEdit}>
				{#if savingEdit}
					<Icon name="progress_activity" size={18} class="animate-spin" />
				{:else}
					<Icon name="check" size={18} />
				{/if}
				Guardar cambios
			</button>
		</form>
	</details>

	<section class="space-y-2">
		{#if !debt.isActive}
			<form method="POST" action="?/status" use:enhance={enhanceForm({ success: 'Deuda reactivada' })}>
				<input type="hidden" name="status" value="active" />
				<button type="submit" class={buttonClass('outline', 'md', true)}>
					<Icon name="play_arrow" size={18} />
					Reactivar deuda
				</button>
			</form>
		{/if}

		<form
			method="POST"
			action="?/delete"
			use:enhance={enhanceForm({ success: 'Deuda eliminada' })}
		>
			<button
				type="button"
				class={buttonClass('danger', 'md', true)}
				disabled={deleting}
				onclick={confirmDelete}
			>
				<Icon name="delete" size={18} />
				Eliminar deuda
			</button>
		</form>
	</section>
</div>
