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
	import { formatFullDate } from '#lib/utils/dates';
	import { contributionPlan, goalPace, GOAL_PACE_LABELS } from '#lib/utils/finance';
	import { GOAL_CATEGORY_LABELS } from '#lib/utils/labels';
	import { formatMoney, formatPercent } from '#lib/utils/money';
	import type { GoalCategory } from '#lib/types/domain';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const goal = $derived(data.goal);
	const formState = $derived(form as FormState | null);
	const previous: Record<string, string> = $derived(formState?.errors ?? {});

	const now = new Date();
	const pace = $derived(goalPace(goal, now));
	const plan = $derived(
		contributionPlan({
			target: goal.targetAmount,
			saved: goal.savedAmount,
			targetDate: goal.targetDate,
			reference: now
		})
	);

	let amount = $state('');
	let occurredAt = $state(data.today);
	let note = $state('');
	let savingContribution = $state(false);

	let editName = $state(goal.name);
	let editTarget = $state(goal.targetAmount.toFixed(2));
	let editDate = $state(goal.targetDate ?? data.today);
	let editCategory = $state<GoalCategory>(goal.category);
	let editAccount = $state(goal.accountId ?? '');
	let editMonthly = $state((goal.monthlyContribution ?? plan.monthlyAmount).toFixed(2));
	let editReminder = $state(goal.reminderEnabled);
	let editReminderDay = $state(String(goal.reminderDay));
	let reminderSheetOpen = $state(false);
	let reminderTrigger = $state<HTMLButtonElement | null>(null);
	let removeImage = $state(false);
	let savingEdit = $state(false);
	let deleting = $state(false);
	let statusSaving = $state<string | null>(null);

	const REMINDER_DAYS = ['1', '5', '10', '15', '20', '25', '28'].map((day) => ({
		value: day,
		label: `Día ${day}`,
		icon: 'event'
	}));

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

	function confirmDelete(event: SubmitEvent): void {
		if (!window.confirm('¿Eliminar este plan y su historial de aportaciones?')) {
			event.preventDefault();
			return;
		}
		deleting = true;
	}
</script>

<PageHeader title={goal.name} backHref="/planes" />

<div class="space-y-4 px-4 pt-4 pb-10">
	{#if data.imageUrl}
		<img src={data.imageUrl} alt="" class="h-44 w-full rounded-2xl object-cover" />
	{/if}

	<section class="rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4 shadow-card">
		<div class="flex flex-wrap items-center gap-2">
			<span class="rounded-full bg-secondary/10 px-2.5 py-1 text-label-sm font-semibold text-secondary">
				{GOAL_CATEGORY_LABELS[goal.category]}
			</span>
			<span class="rounded-full bg-primary/10 px-2.5 py-1 text-label-sm font-semibold text-primary">
				{GOAL_PACE_LABELS[pace]}
			</span>
			<span class="rounded-full bg-level-1 px-2.5 py-1 text-label-sm font-medium text-on-surface-variant">
				{goal.targetDate ? `Meta: ${formatFullDate(goal.targetDate)}` : 'Sin fecha límite'}
			</span>
		</div>

		<p class="tnum mt-3 text-title-lg font-bold text-ink">
			{formatMoney(goal.savedAmount, data.currency)}
			<span class="text-body font-medium text-muted">de {formatMoney(goal.targetAmount, data.currency)}</span>
		</p>

		<div class="mt-3">
			<ProgressBar value={goal.progressPercent} size="lg" tone="primary" />
		</div>

		<div class="mt-2 flex items-center justify-between text-label-sm">
			<span class="font-semibold text-primary">{formatPercent(goal.progressPercent, 0)} completado</span>
			<span class="text-on-surface-variant">Faltan {formatMoney(goal.remainingAmount)}</span>
		</div>

		<div class="mt-4 grid grid-cols-2 gap-2 border-t border-hairline pt-3">
			<div>
				<p class="text-label-sm text-muted uppercase">Cuota sugerida</p>
				<p class="tnum text-title-sm font-bold text-ink">{formatMoney(plan.monthlyAmount)}/mes</p>
			</div>
			<div class="text-right">
				<p class="text-label-sm text-muted uppercase">
					{goal.targetDate ? 'Meses restantes' : 'Plazo estimado'}
				</p>
				<p class="tnum text-title-sm font-bold text-ink">
					{plan.months} {plan.months === 1 ? 'mes' : 'meses'}
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

	<section class="rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4">
		<h2 class="text-title-sm text-ink">Registrar aportación</h2>

		<form
			method="POST"
			action="?/contribute"
			class="mt-3 space-y-3"
			use:enhance={enhanceForm({
				success: 'Aportación registrada',
				onStart: () => (savingContribution = true),
				onFinish: () => (savingContribution = false)
			})}
		>
			<AmountField
				name="amount"
				label="Monto de la aportación"
				bind:value={amount}
				currency={data.currency}
				tone="primary"
				quickAmounts={[50, 100, 250]}
				error={previous.amount}
			/>

			<DateField name="occurredAt" label="Fecha" bind:date={occurredAt} error={previous.occurredAt} />

			<TextField
				label="Nota (opcional)"
				name="note"
				icon="sticky_note_2"
				placeholder="Ej. Aporte quincenal"
				bind:value={note}
				error={previous.note}
			/>

			<button type="submit" class={buttonClass('primary', 'md', true)} disabled={savingContribution}>
				{#if savingContribution}
					<Icon name="progress_activity" size={18} class="animate-spin" />
				{:else}
					<Icon name="add" size={18} />
				{/if}
				Registrar aportación
			</button>
		</form>
	</section>

	<section>
		<div class="flex items-end justify-between gap-2">
			<h2 class="text-title-sm text-ink">Historial de aportaciones</h2>
			<span class="text-label-sm text-muted">{data.contributions.length} registros</span>
		</div>

		<div class="mt-2 divide-y divide-hairline/70 rounded-2xl border border-hairline/70 bg-surface-container-lowest px-4">
			{#each data.contributions as contribution (contribution.id)}
				<div class="flex items-center gap-3 py-3">
					<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
						<Icon name="savings" size={18} />
					</span>
					<div class="min-w-0 flex-1">
						<p class="truncate text-label font-medium text-ink">
							{contribution.note ?? 'Aportación'}
						</p>
						<p class="text-body-sm text-muted">{formatFullDate(contribution.occurredAt)}</p>
					</div>
					<span class="tnum shrink-0 text-label font-bold text-primary">
						+{formatMoney(contribution.amount, data.currency)}
					</span>
				</div>
			{:else}
				<p class="py-6 text-center text-body-sm text-muted">
					Aún no registras aportaciones para este plan.
				</p>
			{/each}
		</div>
	</section>

	<details class="rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4">
		<summary class="flex cursor-pointer items-center gap-2 text-title-sm text-ink">
			<Icon name="tune" size={18} class="text-secondary" />
			Ajustar plan
		</summary>

		<form
			method="POST"
			action="?/update"
			enctype="multipart/form-data"
			class="mt-4 space-y-3"
			use:enhance={enhanceForm({
				success: 'Plan actualizado',
				onStart: () => (savingEdit = true),
				onFinish: () => (savingEdit = false)
			})}
		>
			<input type="hidden" name="initialAmount" value={goal.initialAmount.toFixed(2)} />

			<TextField label="Nombre" name="name" bind:value={editName} error={previous.name} />

			<AmountField
				name="targetAmount"
				label="Costo total"
				bind:value={editTarget}
				currency={data.currency}
				tone="secondary"
				quickAmounts={[]}
				error={previous.targetAmount}
			/>

			<DateField
				name="targetDate"
				label="Fecha objetivo"
				bind:date={editDate}
				error={previous.targetDate}
			/>

			<OptionCards
				name="category"
				columns={2}
				options={categoryOptions}
				bind:value={editCategory}
				error={previous.category}
			/>

			<AccountSelect
				name="accountId"
				label="Cuenta vinculada"
				bind:value={editAccount}
				accounts={data.accounts}
				tone="secondary"
				error={previous.accountId}
			/>

			<AmountField
				name="monthlyContribution"
				label="Aportación mensual"
				bind:value={editMonthly}
				currency={data.currency}
				tone="primary"
				quickAmounts={[]}
				error={previous.monthlyContribution}
			/>

			<div class="rounded-2xl bg-level-1/70 p-3">
				<Switch
					name="reminderEnabled"
					bind:checked={editReminder}
					label="Recordatorio programado"
					description={`Aportación cada día ${editReminderDay} del mes`}
				/>
				{#if editReminder}
					<div class="mt-2 flex items-center justify-between gap-2 border-t border-hairline/70 pt-2.5">
						<span class="text-body-sm text-on-surface-variant">Día del recordatorio</span>
						<button
							type="button"
							bind:this={reminderTrigger}
							class="pressable flex items-center gap-1.5 rounded-xl border border-hairline bg-surface-container-lowest px-2.5 py-1.5 text-label font-medium text-ink"
							aria-haspopup="listbox"
							aria-expanded={reminderSheetOpen}
							aria-label={`Día del recordatorio: ${editReminderDay}`}
							onclick={() => (reminderSheetOpen = true)}
						>
							{editReminderDay}
							<Icon name="expand_more" size={16} class="text-muted" />
						</button>
					</div>

					<OptionSheet
						bind:open={reminderSheetOpen}
						title="Día del recordatorio"
						name="reminderDay"
						label="Día del recordatorio"
						bind:value={editReminderDay}
						options={REMINDER_DAYS}
						tone="secondary"
						returnFocus={reminderTrigger}
					/>
				{/if}
			</div>

			<div class="space-y-1.5">
				<span class="text-label-sm font-medium text-on-surface-variant">Imagen del plan</span>
				<input
					type="file"
					name="image"
					accept="image/png,image/jpeg,image/webp"
					class="block w-full text-body-sm text-on-surface-variant file:mr-3 file:rounded-full file:border-0 file:bg-secondary/10 file:px-3 file:py-1.5 file:text-label-sm file:font-semibold file:text-secondary"
				/>
				{#if goal.imagePath}
					<label class="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
						<input
							type="checkbox"
							name="removeImage"
							value="1"
							bind:checked={removeImage}
							class="size-4 rounded border-outline accent-tertiary"
						/>
						Quitar imagen actual
					</label>
				{/if}
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
		{#if goal.status === 'active'}
			<form
				method="POST"
				action="?/status"
				use:enhance={enhanceForm({
					success: 'Plan pausado',
					onStart: () => (statusSaving = 'paused'),
					onFinish: () => (statusSaving = null)
				})}
			>
				<input type="hidden" name="status" value="paused" />
				<button
					type="submit"
					class={buttonClass('outline', 'md', true)}
					disabled={statusSaving === 'paused'}
				>
					{#if statusSaving === 'paused'}
						<Icon name="progress_activity" size={18} class="animate-spin" />
					{:else}
						<Icon name="pause" size={18} />
					{/if}
					Pausar plan
				</button>
			</form>
			<form
				method="POST"
				action="?/status"
				use:enhance={enhanceForm({
					success: 'Plan completado',
					onStart: () => (statusSaving = 'completed'),
					onFinish: () => (statusSaving = null)
				})}
			>
				<input type="hidden" name="status" value="completed" />
				<button
					type="submit"
					class={buttonClass('outline', 'md', true)}
					disabled={statusSaving === 'completed'}
				>
					{#if statusSaving === 'completed'}
						<Icon name="progress_activity" size={18} class="animate-spin" />
					{:else}
						<Icon name="task_alt" size={18} />
					{/if}
					Marcar como completado
				</button>
			</form>
		{:else}
			<form
				method="POST"
				action="?/status"
				use:enhance={enhanceForm({
					success: 'Plan reactivado',
					onStart: () => (statusSaving = 'active'),
					onFinish: () => (statusSaving = null)
				})}
			>
				<input type="hidden" name="status" value="active" />
				<button
					type="submit"
					class={buttonClass('outline', 'md', true)}
					disabled={statusSaving === 'active'}
				>
					{#if statusSaving === 'active'}
						<Icon name="progress_activity" size={18} class="animate-spin" />
					{:else}
						<Icon name="play_arrow" size={18} />
					{/if}
					Reactivar plan
				</button>
			</form>
		{/if}

		<form
			method="POST"
			action="?/delete"
			use:enhance={enhanceForm({ success: 'Plan eliminado' })}
			onsubmit={confirmDelete}
		>
			<button type="submit" class={buttonClass('danger', 'md', true)} disabled={deleting}>
				{#if deleting}
					<Icon name="progress_activity" size={18} class="animate-spin" />
				{:else}
					<Icon name="delete" size={18} />
				{/if}
				Eliminar plan
			</button>
		</form>
	</section>
</div>
