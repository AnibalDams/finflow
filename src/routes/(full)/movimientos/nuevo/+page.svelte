<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import PageHeader from '#lib/components/app/PageHeader.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import AccountSelect from '#lib/components/ui/AccountSelect.svelte';
	import AmountField from '#lib/components/ui/AmountField.svelte';
	import CategoryPicker from '#lib/components/ui/CategoryPicker.svelte';
	import DateField from '#lib/components/ui/DateField.svelte';
	import ReceiptField from '#lib/components/ui/ReceiptField.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';
	import TagInput from '#lib/components/ui/TagInput.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import TextareaField from '#lib/components/ui/TextareaField.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import { formatInputTime, toISODate } from '#lib/utils/dates';
	import { enhanceForm } from '#lib/utils/enhance';
	import type { FormState } from '#lib/utils/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const formState = $derived(form as FormState | null);
	const previous: Record<string, string> = $derived(formState?.errors ?? {});
	const values: Record<string, string> = $derived(formState?.values ?? {});

	const initialAccount =
		data.accounts.find((account) => account.isPrimary)?.id ?? data.accounts[0]?.id ?? '';
	const secondaryAccount =
		data.accounts.find((account) => account.id !== initialAccount)?.id ?? initialAccount;

	const initialType = (values.type as 'income' | 'expense' | 'transfer' | undefined) ?? data.type;

	let type: 'income' | 'expense' | 'transfer' = $state(initialType);
	let amount = $state(values.amount ?? '');
	let accountId = $state(values.accountId || initialAccount);
	let fromAccountId = $state(values.fromAccountId || initialAccount);
	let toAccountId = $state(values.toAccountId || secondaryAccount);
	let categoryId = $state(values.categoryId ?? '');
	let concept = $state(values.concept ?? '');
	let occurredAt = $state(values.occurredAt ?? '');
	let occurredTime = $state(values.occurredTime ?? '');
	let notes = $state(values.notes ?? '');
	let tags = $state(values.tags ?? '');
	let saving = $state(false);

	// El servidor puede estar en otra zona: la hora por defecto se corrige en el cliente.
	onMount(() => {
		if (!values.occurredAt) occurredAt = toISODate(new Date());
		if (!values.occurredTime) occurredTime = formatInputTime(new Date());
	});

	// Instante real que se envía al servidor (la zona la conoce el navegador).
	const occurredAtIso = $derived.by(() => {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredAt) || !/^\d{2}:\d{2}$/.test(occurredTime)) {
			return '';
		}

		const [year, month, day] = occurredAt.split('-').map(Number);
		const [hours, minutes] = occurredTime.split(':').map(Number);
		const date = new Date(year, month - 1, day, hours, minutes);

		return Number.isNaN(date.getTime()) ? '' : date.toISOString();
	});

	const tone = $derived(
		type === 'income' ? 'primary' : type === 'transfer' ? 'secondary' : 'tertiary'
	);
	const isTransfer = $derived(type === 'transfer');

	const visibleCategories = $derived(
		data.categories.filter(
			(category) => category.kind === (type === 'income' ? 'income' : 'expense')
		)
	);

	const heading = $derived(
		isTransfer ? 'Nueva transferencia' : type === 'income' ? 'Nuevo ingreso' : 'Nuevo gasto'
	);
	const submitLabel = $derived(
		isTransfer ? 'Transferir' : type === 'income' ? 'Guardar ingreso' : 'Guardar gasto'
	);
	const currency = $derived(
		data.accounts.find((account) => account.id === accountId)?.currency ?? data.currency
	);
</script>

<PageHeader title={heading} close centered backHref="/" />

<form
	method="POST"
	enctype="multipart/form-data"
	class="space-y-4 px-4 pt-4 pb-10"
	use:enhance={enhanceForm({
		success: isTransfer ? 'Transferencia registrada' : 'Movimiento guardado',
		onStart: () => (saving = true),
		onFinish: () => (saving = false)
	})}
>
	{#if form?.message}
		<div
			class="flex items-start gap-2 rounded-xl bg-tertiary/8 px-3 py-2.5 text-body-sm font-medium text-tertiary"
			role="alert"
		>
			<Icon name="error" size={18} class="mt-0.5 shrink-0" />
			{form.message}
		</div>
	{/if}

	<SegmentedControl
		name="type"
		bind:value={type}
		{tone}
		options={[
			{ value: 'expense', label: 'Gasto', icon: 'north_east' },
			{ value: 'income', label: 'Ingreso', icon: 'south_west' },
			{ value: 'transfer', label: 'Transferir', icon: 'sync_alt' }
		]}
	/>

	<AmountField
		name="amount"
		bind:value={amount}
		{currency}
		{tone}
		error={previous.amount}
		autofocus={!values.amount}
	/>

	{#if !isTransfer}
		<ReceiptField name="receipt" error={previous.receipt} />

		<section class="space-y-2">
			<div class="flex items-end justify-between gap-3">
				<h2 class="text-title-sm text-ink">Categoría</h2>
				<a href="/cuentas?tab=categorias" class="text-label-sm font-semibold text-secondary">
					Ver todas
				</a>
			</div>

			<CategoryPicker
				name="categoryId"
				bind:value={categoryId}
				categories={visibleCategories}
				error={previous.categoryId}
				createHref={`/categorias/nueva?kind=${type === 'income' ? 'income' : 'expense'}&volver=/movimientos/nuevo`}
			/>
		</section>
	{/if}

	<TextField
		label="Concepto o nota"
		name="concept"
		icon="edit_note"
		placeholder={isTransfer ? 'Transferencia entre cuentas' : 'Ej. Cena Bistro Gourmet'}
		bind:value={concept}
		error={previous.concept}
	/>

	{#if isTransfer}
		<AccountSelect
			name="fromAccountId"
			label="Cuenta de origen"
			bind:value={fromAccountId}
			accounts={data.accounts}
			tone="tertiary"
			error={previous.fromAccountId}
		/>
		<AccountSelect
			name="toAccountId"
			label="Cuenta de destino"
			bind:value={toAccountId}
			accounts={data.accounts}
			hintPrefix="Recibe:"
			tone="primary"
			error={previous.toAccountId}
		/>
	{:else}
		<AccountSelect
			name="accountId"
			label={type === 'income' ? 'Cuenta de destino' : 'Cuenta de origen'}
			bind:value={accountId}
			accounts={data.accounts}
			error={previous.accountId}
		/>
	{/if}

	<DateField
		name="occurredAt"
		timeName="occurredTime"
		bind:date={occurredAt}
		bind:time={occurredTime}
		error={previous.occurredAt}
	/>
	<input type="hidden" name="occurredAtISO" value={occurredAtIso} />

	<TagInput label="Etiquetas opcionales" name="tags" bind:value={tags} />

	<details class="rounded-2xl border border-hairline bg-surface-container-lowest p-3">
		<summary class="cursor-pointer text-label-sm font-semibold text-on-surface-variant">
			Añadir una nota
		</summary>
		<div class="mt-3">
			<TextareaField
				label="Notas"
				name="notes"
				rows={3}
				placeholder="Detalles que quieras recordar"
				bind:value={notes}
				error={previous.notes}
			/>
		</div>
	</details>

	<div class="pt-1">
		<button
			type="submit"
			class={buttonClass('primary', 'lg', true)}
			disabled={saving}
			aria-busy={saving}
		>
			{#if saving}
				<Icon name="progress_activity" size={20} class="animate-spin" />
			{:else}
				<Icon name="check" size={20} />
			{/if}
			{submitLabel}
		</button>
	</div>

	<p class="pb-2 text-center text-body-sm text-muted">
		{isTransfer
			? 'El saldo se mueve entre tus cuentas sin alterar tus ingresos ni gastos.'
			: 'El movimiento actualizará el saldo de la cuenta y tus métricas del mes.'}
	</p>
</form>
