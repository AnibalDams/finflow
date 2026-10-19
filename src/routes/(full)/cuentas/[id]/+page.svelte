<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/app/PageHeader.svelte';
	import AmountField from '#lib/components/ui/AmountField.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import IconPicker from '#lib/components/ui/IconPicker.svelte';
	import OptionCards from '#lib/components/ui/OptionCards.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import { enhanceForm } from '#lib/utils/enhance';
	import type { FormState } from '#lib/utils/forms';
	import { ACCOUNT_KIND_ICONS, ACCOUNT_KIND_LABELS, ICON_CHOICES } from '#lib/utils/labels';
	import { formatMoney } from '#lib/utils/money';
	import type { AccountKind } from '#lib/types/domain';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const account = $derived(data.account);
	const formState = $derived(form as FormState | null);
	const previous: Record<string, string> = $derived(formState?.errors ?? {});

	let name = $state(account.name);
	let kind = $state<AccountKind>(account.kind);
	let openingBalance = $state(account.openingBalance.toFixed(2));
	let icon = $state(account.icon);
	let isPrimary = $state(account.isPrimary);
	let saving = $state(false);
	let deleting = $state(false);
	let archiveSaving = $state(false);

	const kindOptions = (
		['checking', 'savings', 'pocket', 'cash', 'credit'] as AccountKind[]
	).map((value) => ({
		value,
		label: ACCOUNT_KIND_LABELS[value],
		icon: ACCOUNT_KIND_ICONS[value]
	}));

	function confirmDelete(event: MouseEvent): void {
		const button = event.currentTarget as HTMLButtonElement;
		if (!window.confirm(`¿Eliminar la cuenta ${account.name}?`)) return;
		deleting = true;
		button.form?.requestSubmit();
	}
</script>

<PageHeader title={account.name} backHref="/cuentas" />

<div class="space-y-4 px-4 pt-4 pb-10">
	<section class="rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4 shadow-card">
		<div class="flex items-center gap-3">
			<span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
				<Icon name={account.icon} size={22} />
			</span>
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-1.5">
					<p class="truncate text-title-sm text-ink">{account.name}</p>
					{#if account.isPrimary}
						<span class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-label-sm font-semibold text-primary">
							Principal
						</span>
					{/if}
					{#if account.isArchived}
						<span class="shrink-0 rounded-full bg-level-1 px-2 py-0.5 text-label-sm font-semibold text-muted">
							Archivada
						</span>
					{/if}
				</div>
				<p class="text-body-sm text-muted">{ACCOUNT_KIND_LABELS[account.kind]} · {account.currency}</p>
			</div>
		</div>

		<p class="mt-4 text-label-sm text-muted uppercase">Saldo actual</p>
		<p class="tnum text-title-xl font-bold text-ink">
			{formatMoney(account.balance, account.currency)}
		</p>
		<p class="mt-1 text-body-sm text-muted">
			{data.transactionCount}
			{data.transactionCount === 1 ? 'movimiento registrado' : 'movimientos registrados'}
		</p>
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

	<form
		method="POST"
		action="?/update"
		class="space-y-3"
		use:enhance={enhanceForm({
			success: 'Cuenta actualizada',
			onStart: () => (saving = true),
			onFinish: () => (saving = false)
		})}
	>
		<section class="space-y-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4">
			<h2 class="text-title-sm text-ink">Datos de la cuenta</h2>

			<TextField label="Nombre" name="name" bind:value={name} error={previous.name} />

			<OptionCards name="kind" columns={2} options={kindOptions} bind:value={kind} error={previous.kind} />

			<AmountField
				name="openingBalance"
				label="Saldo inicial"
				bind:value={openingBalance}
				currency={account.currency}
				tone="primary"
				quickAmounts={[]}
				error={previous.openingBalance}
			/>

			<input type="hidden" name="currency" value={account.currency} />
			<p class="text-body-sm text-muted">
				La moneda ({account.currency}) no se puede cambiar: tus movimientos ya están registrados en
				ella.
			</p>
		</section>

		<section class="space-y-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4">
			<h2 class="text-title-sm text-ink">Apariencia</h2>
			<IconPicker name="icon" icons={ICON_CHOICES} bind:value={icon} error={previous.icon} />
			<div class="rounded-2xl bg-level-1/70 p-3">
				<Switch
					label="Cuenta principal"
					description="Se usa por defecto al registrar movimientos"
					name="isPrimary"
					value="on"
					bind:checked={isPrimary}
				/>
			</div>
		</section>

		<button type="submit" class={buttonClass('primary', 'lg', true)} disabled={saving}>
			{#if saving}
				<Icon name="progress_activity" size={20} class="animate-spin" />
			{:else}
				<Icon name="check" size={20} />
			{/if}
			Guardar cambios
		</button>
	</form>

	<section class="space-y-2">
		<form
			method="POST"
			action="?/archive"
			use:enhance={enhanceForm({
				success: account.isArchived ? 'Cuenta reactivada' : 'Cuenta archivada',
				onStart: () => (archiveSaving = true),
				onFinish: () => (archiveSaving = false)
			})}
		>
			<input type="hidden" name="archived" value={account.isArchived ? 'false' : 'true'} />
			<button type="submit" class={buttonClass('outline', 'md', true)} disabled={archiveSaving}>
				{#if archiveSaving}
					<Icon name="progress_activity" size={18} class="animate-spin" />
				{:else}
					<Icon name={account.isArchived ? 'unarchive' : 'archive'} size={18} />
				{/if}
				{account.isArchived ? 'Reactivar cuenta' : 'Archivar cuenta'}
			</button>
		</form>

		{#if data.transactionCount === 0}
			<form
				method="POST"
				action="?/delete"
				use:enhance={enhanceForm({ success: 'Cuenta eliminada' })}
			>
				<button
					type="button"
					class={buttonClass('danger', 'md', true)}
					disabled={deleting}
					onclick={confirmDelete}
				>
					{#if deleting}
						<Icon name="progress_activity" size={18} class="animate-spin" />
					{:else}
						<Icon name="delete" size={18} />
					{/if}
					Eliminar cuenta
				</button>
			</form>
		{/if}
	</section>
</div>
