<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/app/PageHeader.svelte';
	import AmountField from '#lib/components/ui/AmountField.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import IconPicker from '#lib/components/ui/IconPicker.svelte';
	import OptionCards from '#lib/components/ui/OptionCards.svelte';
	import SelectField from '#lib/components/ui/SelectField.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import { enhanceForm } from '#lib/utils/enhance';
	import type { FormState } from '#lib/utils/forms';
	import {
		ACCOUNT_KIND_ICONS,
		ACCOUNT_KIND_LABELS,
		CURRENCY_OPTIONS,
		ICON_CHOICES,
		currencyIcon
	} from '#lib/utils/labels';
	import type { AccountKind } from '#lib/types/domain';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const formState = $derived(form as FormState | null);
	const previous: Record<string, string> = $derived(formState?.errors ?? {});
	const values: Record<string, string> = $derived(formState?.values ?? {});

	let name = $state(values.name ?? '');
	let kind = $state<AccountKind>((values.kind as AccountKind) ?? 'checking');
	let currency = $state(values.currency ?? data.defaultCurrency);
	let openingBalance = $state(values.openingBalance ?? '0');
	let icon = $state(values.icon ?? ACCOUNT_KIND_ICONS.checking);
	let isPrimary = $state(values.isPrimary === 'on' || !data.hasAccounts);
	let saving = $state(false);

	const kindOptions = (['checking', 'savings', 'pocket', 'cash', 'credit'] as AccountKind[]).map(
		(value) => ({
			value,
			label: ACCOUNT_KIND_LABELS[value],
			icon: ACCOUNT_KIND_ICONS[value]
		})
	);

	const currencyOptions = CURRENCY_OPTIONS.map((option) => ({
		value: option.code,
		label: option.label,
		icon: currencyIcon(option.code)
	}));

	// Sugerimos el ícono de la familia elegida mientras el usuario no lo personalice.
	let suggestedKind = kind;
	$effect(() => {
		if (kind === suggestedKind) return;
		if (Object.values(ACCOUNT_KIND_ICONS).includes(icon)) icon = ACCOUNT_KIND_ICONS[kind];
		suggestedKind = kind;
	});
</script>

{#snippet headerAction()}
	<button
		type="submit"
		form="account-form"
		class="rounded-full px-3 py-1.5 text-label font-semibold text-primary disabled:opacity-50"
		disabled={saving}
	>
		Guardar
	</button>
{/snippet}

<PageHeader title="Nueva cuenta" close centered backHref="/cuentas" action={headerAction} />

<form
	id="account-form"
	method="POST"
	class="space-y-4 px-4 pt-4 pb-10"
	use:enhance={enhanceForm({
		success: 'Cuenta creada',
		onStart: () => (saving = true),
		onFinish: () => (saving = false)
	})}
>
	<div>
		<h1 class="text-title-lg text-ink">Nueva cuenta</h1>
		<p class="mt-1 text-body text-on-surface-variant">
			Define dónde guardas tu dinero para saber tu saldo real.
		</p>
	</div>

	{#if form?.message}
		<div
			class="flex items-start gap-2 rounded-xl bg-tertiary/8 px-3 py-2.5 text-body-sm font-medium text-tertiary"
			role="alert"
		>
			<Icon name="error" size={18} class="mt-0.5 shrink-0" />
			{form.message}
		</div>
	{/if}

	<section class="space-y-2">
		<h2 class="text-label-sm font-semibold tracking-wide text-on-surface-variant uppercase">
			Tipo de cuenta
		</h2>
		<OptionCards
			name="kind"
			columns={2}
			options={kindOptions}
			bind:value={kind}
			error={previous.kind}
		/>
	</section>

	<section class="space-y-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4">
		<h2 class="text-title-sm text-ink">Datos de la cuenta</h2>

		<TextField
			label="Nombre"
			name="name"
			placeholder="Ej. Cuenta nómina, Efectivo, Tarjeta"
			bind:value={name}
			error={previous.name}
		/>

		<SelectField
			label="Moneda"
			name="currency"
			options={currencyOptions}
			bind:value={currency}
			error={previous.currency}
		/>

		<AmountField
			name="openingBalance"
			label="Saldo inicial"
			bind:value={openingBalance}
			{currency}
			tone="primary"
			quickAmounts={[]}
			error={previous.openingBalance}
		/>
		<p class="text-body-sm text-muted">
			Escribe 0 si vas a registrar todos los movimientos desde hoy.
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
			<Icon name="add" size={20} />
		{/if}
		Crear cuenta
	</button>
</form>
