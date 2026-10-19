<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/app/PageHeader.svelte';
	import AccountSelect from '#lib/components/ui/AccountSelect.svelte';
	import AmountField from '#lib/components/ui/AmountField.svelte';
	import DateField from '#lib/components/ui/DateField.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import OptionCards from '#lib/components/ui/OptionCards.svelte';
	import OptionSheet from '#lib/components/ui/OptionSheet.svelte';
	import ProgressBar from '#lib/components/ui/ProgressBar.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import { enhanceForm } from '#lib/utils/enhance';
	import type { FormState } from '#lib/utils/forms';
	import { monthsBetween, parseISODate } from '#lib/utils/dates';
	import { contributionPlan } from '#lib/utils/finance';
	import { GOAL_CATEGORY_LABELS, GOAL_IDEA_TAGS } from '#lib/utils/labels';
	import { formatMoney, formatPercent, parseAmountInput } from '#lib/utils/money';
	import type { GoalCategory } from '#lib/types/domain';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const formState = $derived(form as FormState | null);
	const previous: Record<string, string> = $derived(formState?.errors ?? {});
	const values: Record<string, string> = $derived(formState?.values ?? {});

	const now = new Date();

	let name = $state(values.name ?? '');
	let targetAmount = $state(values.targetAmount ?? '');
	let initialAmount = $state(values.initialAmount ?? '');
	let targetDate = $state(values.targetDate ?? data.defaultDate);
	let category = $state<GoalCategory>((values.category as GoalCategory) ?? 'technology');
	let accountId = $state(values.accountId ?? data.defaultAccountId);
	let reminderEnabled = $state(true);
	let reminderDay = $state(values.reminderDay ?? '1');
	let reminderSheetOpen = $state(false);
	let reminderTrigger = $state<HTMLButtonElement | null>(null);
	let saving = $state(false);
	let preview = $state<string | null>(null);

	const REMINDER_DAYS = ['1', '5', '10', '15', '20', '25', '28'].map((day) => ({
		value: day,
		label: `Día ${day}`,
		icon: 'event'
	}));

	const target = $derived(parseAmountInput(targetAmount) ?? 0);
	const saved = $derived(parseAmountInput(initialAmount) ?? 0);
	const plan = $derived(
		contributionPlan({ target, saved, targetDate, reference: now })
	);
	const coverage = $derived(target > 0 ? Math.min(100, (saved / target) * 100) : 0);
	const monthsLeft = $derived(targetDate ? monthsBetween(now, parseISODate(targetDate)) : 12);

	const categoryOptions = $derived(
		(['technology', 'travel', 'home', 'education', 'other'] as GoalCategory[]).map((value) => ({
			value,
			label: GOAL_CATEGORY_LABELS[value],
			icon:
				value === 'technology'
					? 'laptop'
					: value === 'travel'
						? 'flight'
						: value === 'home'
							? 'home'
							: value === 'education'
								? 'school'
								: 'category'
		}))
	);

	function useIdea(idea: { name: string; category: GoalCategory }): void {
		name = idea.name;
		category = idea.category;
	}

	function onImage(event: Event): void {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (preview) URL.revokeObjectURL(preview);
		preview = file ? URL.createObjectURL(file) : null;
	}
</script>

{#snippet headerAction()}
	<button
		type="submit"
		form="goal-form"
		class="rounded-full px-3 py-1.5 text-label font-semibold text-primary disabled:opacity-50"
		disabled={saving}
	>
		Guardar
	</button>
{/snippet}

<PageHeader
	title="Nuevo plan"
	close
	centered
	backHref="/planes"
	dirty={name.length > 0}
	action={headerAction}
/>

<form
	id="goal-form"
	method="POST"
	enctype="multipart/form-data"
	class="px-4 pt-4 pb-10"
	use:enhance={enhanceForm({
		success: 'Plan creado',
		onStart: () => (saving = true),
		onFinish: () => (saving = false)
	})}
>
	<span
		class="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-2.5 py-1 text-label-sm font-semibold text-secondary uppercase"
	>
		<Icon name="auto_awesome" size={14} />
		Metas inteligentes
	</span>

	<h1 class="mt-2 text-title-lg text-ink">Nuevo plan o meta de gasto</h1>
	<p class="mt-1 text-body text-on-surface-variant">
		Define lo que deseas comprar o vivir y proyecta tu ahorro con precisión financiera.
	</p>

	<div class="relative mt-4 h-40 overflow-hidden rounded-2xl bg-secondary/10">
		{#if preview}
			<img src={preview} alt="Imagen del plan" class="size-full object-cover" />
		{:else}
			<span class="flex size-full flex-col items-center justify-center gap-1 text-secondary">
				<Icon name="image" size={30} />
				<span class="text-label-sm font-medium">Añade una imagen inspiradora</span>
			</span>
		{/if}

		<label
			class="absolute right-3 bottom-3 flex cursor-pointer items-center gap-1.5 rounded-full bg-inverse-surface/85 px-3 py-1.5 text-label-sm font-semibold text-inverse-on-surface backdrop-blur"
		>
			<Icon name="photo_camera" size={16} />
			{preview ? 'Cambiar foto' : 'Añadir foto'}
			<input
				type="file"
				name="image"
				accept="image/png,image/jpeg,image/webp"
				class="sr-only"
				onchange={onImage}
			/>
		</label>
	</div>
	{#if previous.image}
		<p class="mt-1.5 text-body-sm font-medium text-tertiary">{previous.image}</p>
	{/if}

	<div class="mt-4 space-y-2">
		<p class="text-body-sm text-muted">¿Buscando ideas?</p>
		<div class="flex flex-wrap gap-2">
			{#each GOAL_IDEA_TAGS as idea (idea.label)}
				<button
					type="button"
					class="rounded-full bg-level-1 px-2.5 py-1 text-label-sm font-semibold text-secondary transition hover:bg-secondary/10"
					onclick={() => useIdea(idea)}
				>
					{idea.label}
				</button>
			{/each}
		</div>
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

	<section class="mt-4 space-y-4 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4">
		<header class="flex items-center justify-between gap-2">
			<h2 class="text-label-sm font-bold tracking-wide text-on-surface-variant uppercase">
				1. Datos de la meta
			</h2>
			<Icon name="flag" size={18} class="text-secondary" />
		</header>

		<TextField
			label="Nombre del objetivo o artículo"
			name="name"
			icon="edit_note"
			placeholder="Ej. MacBook Pro M3 Max"
			bind:value={name}
			error={previous.name}
		/>

		<AmountField
			name="targetAmount"
			label="Costo total estimado / meta monetaria"
			bind:value={targetAmount}
			currency={data.currency}
			tone="secondary"
			quickAmounts={[]}
			error={previous.targetAmount}
		/>

		<DateField
			name="targetDate"
			label="Fecha objetivo o límite"
			bind:date={targetDate}
			error={previous.targetDate}
			hint={`Tiempo estimado: ~${monthsLeft} ${monthsLeft === 1 ? 'mes' : 'meses'}`}
		/>

		<div class="space-y-1.5">
			<h3 class="text-label-sm font-medium text-on-surface-variant">Categoría de la meta</h3>
			<OptionCards
				name="category"
				columns={2}
				options={categoryOptions}
				bind:value={category}
				error={previous.category}
			/>
		</div>
	</section>

	<section class="mt-4 space-y-4 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4">
		<header class="flex items-center justify-between gap-2">
			<h2 class="text-label-sm font-bold tracking-wide text-on-surface-variant uppercase">
				2. Estrategia financiera
			</h2>
			<Icon name="calculate" size={18} class="text-secondary" />
		</header>

		<div class="space-y-1.5">
			<div class="flex items-center justify-between gap-2">
				<span class="text-label-sm font-medium text-on-surface-variant">
					Ahorro inicial ya disponible
				</span>
				<span class="text-label-sm font-semibold text-primary">
					{formatPercent(coverage, 0)} cubierto
				</span>
			</div>
			<AmountField
				name="initialAmount"
				label="Ahorro inicial"
				bind:value={initialAmount}
				currency={data.currency}
				tone="primary"
				quickAmounts={[]}
				error={previous.initialAmount}
			/>
		</div>

		<input type="hidden" name="monthlyContribution" value={plan.monthlyAmount.toFixed(2)} />

		<div class="rounded-2xl bg-secondary/8 p-4">
			<div class="flex items-center justify-between gap-2">
				<p class="text-label-sm font-semibold tracking-wide text-secondary uppercase">
					Cálculo en vivo
				</p>
				<span class="flex size-8 items-center justify-center rounded-full bg-secondary/12 text-secondary">
					<Icon name="calculate" size={18} />
				</span>
			</div>

			<p class="mt-1 text-title-sm text-ink">Cuota mensual sugerida</p>
			<p class="tnum mt-1 flex items-baseline gap-1">
				<span class="text-amount font-bold text-secondary">{formatMoney(plan.monthlyAmount)}</span>
				<span class="text-body-sm font-medium text-muted">/ mes</span>
			</p>

			<div class="mt-3">
				<ProgressBar value={coverage} tone="secondary" size="md" />
			</div>

			<div class="mt-2 flex items-center justify-between gap-2 text-label-sm">
				<span class="text-on-surface-variant">Inicias con: {formatMoney(saved)}</span>
				<span class="text-on-surface-variant">Resta: {formatMoney(plan.remaining)}</span>
			</div>

			<p class="mt-2 text-body-sm text-on-surface-variant">
				{#if target <= 0}
					Indica el costo total para calcular tu cuota mensual.
				{:else if plan.remaining === 0}
					¡Meta cubierta! Ya tienes el monto completo reservado.
				{:else}
					Necesitas ahorrar ~{formatMoney(plan.monthlyAmount)}/mes durante
					{plan.months}
					{plan.months === 1 ? 'mes' : 'meses'} para cumplir tu meta con holgura.
				{/if}
			</p>
		</div>

		<AccountSelect
			name="accountId"
			label="Vincular a cuenta / bolsillo"
			bind:value={accountId}
			accounts={data.accounts}
			tone="secondary"
			error={previous.accountId}
		/>

		<div class="rounded-2xl bg-level-1/70 p-3">
			<Switch
				name="reminderEnabled"
				bind:checked={reminderEnabled}
				label="Recordatorio programado"
				description={`Aportación cada día ${reminderDay} del mes`}
			/>

			{#if reminderEnabled}
				<div class="mt-2 flex items-center justify-between gap-2 border-t border-hairline/70 pt-2.5">
					<span class="text-body-sm text-on-surface-variant">Día del recordatorio</span>
					<button
						type="button"
						bind:this={reminderTrigger}
						class="pressable flex items-center gap-1.5 rounded-xl border border-hairline bg-surface-container-lowest px-2.5 py-1.5 text-label font-medium text-ink"
						aria-haspopup="listbox"
						aria-expanded={reminderSheetOpen}
						aria-label={`Día del recordatorio: ${reminderDay}`}
						onclick={() => (reminderSheetOpen = true)}
					>
						{reminderDay}
						<Icon name="expand_more" size={16} class="text-muted" />
					</button>
				</div>

				<OptionSheet
					bind:open={reminderSheetOpen}
					title="Día del recordatorio"
					name="reminderDay"
					label="Día del recordatorio"
					bind:value={reminderDay}
					options={REMINDER_DAYS}
					tone="secondary"
					returnFocus={reminderTrigger}
				/>
			{/if}
		</div>
	</section>

	<div class="mt-4 flex items-start gap-2.5 rounded-2xl bg-secondary/6 p-3.5">
		<Icon name="verified_user" size={20} class="mt-0.5 shrink-0 text-secondary" />
		<p class="text-body-sm text-on-surface-variant">
			Tu dinero permanecerá separado en una bóveda de alta rentabilidad con comisiones de retiro
			solo si tus prioridades cambian.
		</p>
	</div>

	<button type="submit" class={buttonClass('primary', 'lg', true, 'mt-4')} disabled={saving}>
		{#if saving}
			<Icon name="progress_activity" size={20} class="animate-spin" />
		{:else}
			<Icon name="rocket_launch" size={20} />
		{/if}
		Crear plan de gasto
	</button>

	<a href="/planes" class="mt-3 block text-center text-label font-semibold text-on-surface-variant">
		Cancelar y regresar
	</a>
</form>
