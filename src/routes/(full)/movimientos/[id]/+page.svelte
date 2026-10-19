<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/app/PageHeader.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import AccountSelect from '#lib/components/ui/AccountSelect.svelte';
	import AmountField from '#lib/components/ui/AmountField.svelte';
	import CategoryPicker from '#lib/components/ui/CategoryPicker.svelte';
	import DateField from '#lib/components/ui/DateField.svelte';
	import ReceiptField from '#lib/components/ui/ReceiptField.svelte';
	import TagInput from '#lib/components/ui/TagInput.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import TextareaField from '#lib/components/ui/TextareaField.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import { enhanceForm } from '#lib/utils/enhance';
	import type { FormState } from '#lib/utils/forms';
	import { formatDateTime } from '#lib/utils/dates';
	import { formatSignedAmount } from '#lib/utils/money';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const transaction = $derived(data.transaction);
	const isTransfer = $derived(transaction.type === 'transfer');
	const formState = $derived(form as FormState | null);
	const previous: Record<string, string> = $derived(formState?.errors ?? {});
	const values: Record<string, string> = $derived(formState?.values ?? {});

	const typeLabel = $derived(
		transaction.type === 'income' ? 'Ingreso' : transaction.type === 'expense' ? 'Gasto' : 'Transferencia'
	);
	const amountTone = $derived(
		transaction.type === 'income' ? 'primary' : transaction.type === 'expense' ? 'tertiary' : 'secondary'
	);

	let amount = $state(values.amount ?? transaction.amount.toFixed(2));
	let accountId = $state(values.accountId ?? transaction.accountId);
	let categoryId = $state(values.categoryId ?? transaction.categoryId ?? '');
	let concept = $state(values.concept ?? transaction.concept);
	let occurredAt = $state(values.occurredAt ?? data.dateValue);
	let occurredTime = $state(values.occurredTime ?? data.timeValue);
	let notes = $state(values.notes ?? transaction.notes ?? '');
	let tags = $state(values.tags ?? transaction.tagNames.join(','));
	let removeReceipt = $state(false);
	let saving = $state(false);
	let deleting = $state(false);

	const categories = $derived(
		data.categories.filter(
			(category) => category.kind === (transaction.type === 'income' ? 'income' : 'expense')
		)
	);

	function confirmDelete(event: SubmitEvent): void {
		if (!window.confirm('¿Eliminar este movimiento? Esta acción no se puede deshacer.')) {
			event.preventDefault();
			return;
		}
		deleting = true;
	}
</script>

<PageHeader title="Detalle del movimiento" backHref="/movimientos" />

<div class="space-y-4 px-4 pt-4 pb-10">
	<section class="rounded-3xl bg-inverse-surface p-5 text-inverse-on-surface shadow-hero">
		<div class="flex items-center justify-between gap-2">
			<span class="rounded-full bg-white/10 px-2.5 py-1 text-label-sm font-semibold">
				{typeLabel}
			</span>
			<span class="text-label-sm text-inverse-on-surface/70">{formatDateTime(transaction.occurredAt)}</span>
		</div>

		<p class="tnum mt-3 text-amount font-bold">
			{formatSignedAmount(transaction.amount, transaction.type, transaction.currency)}
		</p>

		<p class="mt-1 text-body text-inverse-on-surface/80">{transaction.concept}</p>

		<div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-3 text-label-sm text-inverse-on-surface/70">
			<span class="flex items-center gap-1.5">
				<Icon name={transaction.accountIcon ?? 'account_balance_wallet'} size={16} />
				{transaction.accountName}
			</span>
			{#if transaction.categoryName}
				<span class="flex items-center gap-1.5">
					<Icon name={transaction.categoryIcon ?? 'category'} size={16} />
					{transaction.categoryName}
				</span>
			{/if}
			{#if isTransfer && transaction.counterAccountName}
				<span class="flex items-center gap-1.5">
					<Icon name="arrow_forward" size={16} />
					{transaction.counterAccountName}
				</span>
			{/if}
		</div>
	</section>

	{#if data.receiptUrl}
		<div class="flex items-center gap-3 rounded-2xl border border-hairline bg-surface-container-lowest p-3 shadow-card">
			<span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/12 text-secondary">
				<Icon name="description" size={20} />
			</span>
			<div class="min-w-0 flex-1">
				<p class="truncate text-title-sm text-ink">{transaction.attachmentName ?? 'Comprobante'}</p>
				<a
					href={data.receiptUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="text-body-sm font-semibold text-secondary"
				>
					Ver comprobante
				</a>
			</div>
			{#if !isTransfer}
				<label class="flex shrink-0 items-center gap-1.5 text-body-sm text-on-surface-variant">
					<input
						type="checkbox"
						name="removeReceipt"
						value="1"
						form="edit-form"
						bind:checked={removeReceipt}
						class="size-4 rounded border-outline accent-tertiary"
					/>
					Quitar
				</label>
			{/if}
		</div>
	{/if}

	{#if form?.message}
		<div
			class="flex items-start gap-2 rounded-xl bg-tertiary/8 px-3 py-2.5 text-body-sm font-medium text-tertiary"
			role="alert"
		>
			<Icon name="error" size={18} class="mt-0.5 shrink-0" />
			{form.message}
		</div>
	{/if}

	{#if isTransfer}
		<div class="rounded-2xl border border-hairline bg-surface-container-lowest p-4 text-body-sm text-muted">
			Las transferencias se registran como un único movimiento entre cuentas. Para corregir el monto,
			elimínala y vuelve a crearla.
		</div>
	{:else}
		<form
			id="edit-form"
			method="POST"
			action="?/update"
			enctype="multipart/form-data"
			class="space-y-4"
			use:enhance={enhanceForm({
				success: 'Movimiento actualizado',
				onStart: () => (saving = true),
				onFinish: () => (saving = false)
			})}
		>
			<AmountField
				name="amount"
				label="Monto del movimiento"
				bind:value={amount}
				currency={transaction.currency}
				tone={amountTone}
				error={previous.amount}
			/>

			<section class="space-y-2">
				<h2 class="text-title-sm text-ink">Categoría</h2>
				<CategoryPicker
					name="categoryId"
					bind:value={categoryId}
					categories={categories}
					error={previous.categoryId}
					createHref={`/categorias/nueva?kind=${transaction.type === 'income' ? 'income' : 'expense'}&volver=/movimientos/${transaction.id}`}
				/>
			</section>

			<TextField
				label="Concepto o nota"
				name="concept"
				icon="edit_note"
				bind:value={concept}
				error={previous.concept}
			/>

			<AccountSelect
				name="accountId"
				label={transaction.type === 'income' ? 'Cuenta de destino' : 'Cuenta de origen'}
				bind:value={accountId}
				accounts={data.accounts}
				tone={amountTone}
				error={previous.accountId}
			/>

			<DateField
				name="occurredAt"
				timeName="occurredTime"
				bind:date={occurredAt}
				bind:time={occurredTime}
				error={previous.occurredAt}
			/>

			<ReceiptField
				name="receipt"
				error={previous.receipt}
				hint={removeReceipt ? 'El comprobante actual se eliminará al guardar.' : undefined}
			/>

			<TagInput label="Etiquetas" name="tags" bind:value={tags} />

			<details class="rounded-2xl border border-hairline bg-surface-container-lowest p-3" open={notes.length > 0}>
				<summary class="cursor-pointer text-label-sm font-semibold text-on-surface-variant">
					Notas
				</summary>
				<div class="mt-3">
					<TextareaField
						name="notes"
						rows={3}
						placeholder="Detalles que quieras recordar"
						bind:value={notes}
						error={previous.notes}
					/>
				</div>
			</details>

			<button type="submit" class={buttonClass('primary', 'lg', true)} disabled={saving}>
				{#if saving}
					<Icon name="progress_activity" size={20} class="animate-spin" />
				{:else}
					<Icon name="check" size={20} />
				{/if}
				Guardar cambios
			</button>
		</form>
	{/if}

	<form
		method="POST"
		action="?/delete"
		use:enhance={enhanceForm({ success: 'Movimiento eliminado' })}
		onsubmit={confirmDelete}
	>
		<button type="submit" class={buttonClass('danger', 'lg', true)} disabled={deleting}>
			{#if deleting}
				<Icon name="progress_activity" size={20} class="animate-spin" />
			{:else}
				<Icon name="delete" size={20} />
			{/if}
			Eliminar movimiento
		</button>
	</form>
</div>
