<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import InstallApp from '#lib/components/app/InstallApp.svelte';
	import ProfilePhoto from '#lib/components/app/ProfilePhoto.svelte';
	import PushDevice from '#lib/components/app/PushDevice.svelte';
	import AmountField from '#lib/components/ui/AmountField.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import SelectField from '#lib/components/ui/SelectField.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import { notifyError, notifySuccess } from '#lib/stores/toast.svelte';
	import { formatFullDate } from '#lib/utils/dates';
	import { enhanceForm } from '#lib/utils/enhance';
	import { csvNumber, downloadCsv, downloadPdf } from '#lib/utils/export';
	import type { FormState } from '#lib/utils/forms';
	import { CURRENCY_OPTIONS, TRANSACTION_TYPE_LABELS, currencyIcon } from '#lib/utils/labels';
	import { formatMoney } from '#lib/utils/money';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const formState = $derived(form as FormState | null);
	const errors: Record<string, string> = $derived(formState?.errors ?? {});
	const values: Record<string, string> = $derived(formState?.values ?? {});

	const profile = $derived(data.profile);

	let fullName = $state(values.fullName ?? profile.fullName);
	let currency = $state(values.currency ?? profile.currency);
	let monthlyBudget = $state(values.monthlyBudget ?? profile.monthlyBudget.toFixed(2));
	let savingProfile = $state(false);

	let currentPassword = $state('');
	let password = $state('');
	let passwordConfirm = $state('');
	let savingPassword = $state(false);
	let leaving = $state(false);

	let pushEnabled = $state(profile.pushEnabled);
	let pushTime = $state(profile.pushTime);
	let savingNotifications = $state(false);

	const initials = $derived(
		profile.fullName
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('') || 'FF'
	);

	const currencyOptions = CURRENCY_OPTIONS.map((option) => ({
		value: option.code,
		label: option.label,
		icon: currencyIcon(option.code)
	}));

	const stats = $derived([
		{ label: 'Cuentas', value: data.counts.accounts, icon: 'account_balance_wallet' },
		{ label: 'Categorías', value: data.counts.categories, icon: 'category' },
		{ label: 'Planes activos', value: data.counts.goals, icon: 'flag' },
		{ label: 'Deudas activas', value: data.counts.debts, icon: 'credit_card' }
	]);

	function exportCsv(): void {
		try {
			const rows: Array<Array<string | number>> = [
				['Fecha', 'Concepto', 'Cuenta', 'Categoría', 'Tipo', 'Monto', 'Moneda'],
				...data.movements.map((movement) => [
					formatFullDate(movement.occurredAt),
					movement.concept,
					movement.accountName,
					movement.categoryName ?? 'Sin categoría',
					TRANSACTION_TYPE_LABELS[movement.type],
					csvNumber(movement.amount),
					movement.currency
				])
			];

			downloadCsv(`finflow-movimientos-${data.month.from}.csv`, rows);
			notifySuccess('Movimientos exportados');
		} catch (error) {
			console.error('[finflow] csv export:', error);
			notifyError('No pudimos generar el CSV.');
		}
	}

	async function exportPdf(): Promise<void> {
		try {
			const income = data.movements
				.filter((movement) => movement.type === 'income')
				.reduce((total, movement) => total + movement.amount, 0);
			const expense = data.movements
				.filter((movement) => movement.type === 'expense')
				.reduce((total, movement) => total + movement.amount, 0);

			await downloadPdf({
				title: 'Movimientos del mes',
				subtitle: `${data.month.label} · ${profile.fullName}`,
				summary: [
					['Movimientos', String(data.movements.length)],
					['Ingresos', formatMoney(income, profile.currency)],
					['Gastos', formatMoney(expense, profile.currency)],
					['Balance', formatMoney(income - expense, profile.currency)]
				],
				head: ['Fecha', 'Concepto', 'Cuenta', 'Tipo', 'Monto'],
				body: data.movements.map((movement) => [
					formatFullDate(movement.occurredAt),
					movement.concept,
					movement.accountName,
					TRANSACTION_TYPE_LABELS[movement.type],
					formatMoney(movement.amount, movement.currency)
				]),
				fileName: `finflow-movimientos-${data.month.from}.pdf`,
				footnote: 'Generado con FinFlow.'
			});
			notifySuccess('Informe PDF descargado');
		} catch (error) {
			console.error('[finflow] pdf export:', error);
			notifyError('No pudimos generar el PDF.');
		}
	}
</script>

<div
	class="space-y-4 px-4 pt-4 pb-10 lg:mx-auto lg:grid lg:max-w-[1440px] lg:grid-cols-12 lg:gap-6 lg:space-y-0 lg:px-8 lg:pt-8 lg:pb-10"
>
	<header class="hidden lg:col-span-12 lg:block">
		<p class="text-label-sm font-semibold tracking-[0.16em] text-primary uppercase">Tu cuenta</p>
		<h1 class="mt-1 text-title-xl tracking-tight text-ink">Configuración</h1>
		<p class="mt-1 text-body text-on-surface-variant">
			Administra tu perfil, seguridad, presupuesto y datos de FinFlow.
		</p>
	</header>

	<section
		class="rounded-3xl bg-inverse-surface p-5 text-inverse-on-surface shadow-hero lg:col-span-12 lg:p-6"
	>
		<div class="flex items-center gap-3">
			<span
				class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-container text-title-sm font-bold text-inverse-surface"
			>
				{#if profile.avatarUrl}
					<img src={profile.avatarUrl} alt="" class="size-full object-cover" />
				{:else}
					{initials}
				{/if}
			</span>
			<div class="min-w-0">
				<p class="truncate text-title-sm font-semibold">{profile.fullName || 'Tu perfil'}</p>
				<p class="truncate text-body-sm text-inverse-on-surface/70">{data.email}</p>
			</div>
		</div>

		<div class="mt-4 grid grid-cols-4 gap-2">
			{#each stats as stat (stat.label)}
				<div class="rounded-2xl bg-white/8 p-2 text-center">
					<Icon name={stat.icon} size={18} class="mx-auto text-primary-container" />
					<p class="mt-1 tnum text-title-sm font-bold">{stat.value}</p>
					<p class="text-[10px] leading-tight text-inverse-on-surface/60">{stat.label}</p>
				</div>
			{/each}
		</div>
	</section>

	<div class="space-y-4 lg:col-span-4">
		<ProfilePhoto
			avatarUrl={profile.avatarUrl}
			hasAvatar={Boolean(profile.avatarPath)}
			{initials}
		/>

		<a
			href={resolve('/(app)/cuentas')}
			class="flex items-center gap-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-3.5 shadow-card transition hover:border-secondary/40"
		>
			<span
				class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary"
			>
				<Icon name="account_balance_wallet" size={20} />
			</span>
			<div class="min-w-0 flex-1">
				<p class="text-body font-medium text-ink">Cuentas y categorías</p>
				<p class="text-body-sm text-muted">Saldos, íconos y presupuestos por categoría</p>
			</div>
			<Icon name="chevron_right" size={20} class="shrink-0 text-muted" />
		</a>
	</div>

	<div class="space-y-4 lg:col-span-8">
		<section
			class="space-y-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4 lg:p-5"
		>
			<h2 class="flex items-center gap-2 text-title-sm text-ink">
				<Icon name="person" size={18} class="text-secondary" />
				Perfil
			</h2>

			{#if form?.intent === 'profile' && form.message}
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
				action="?/profile"
				class="space-y-3"
				use:enhance={enhanceForm({
					success: 'Perfil actualizado',
					onStart: () => (savingProfile = true),
					onFinish: () => (savingProfile = false)
				})}
			>
				<TextField
					label="Nombre completo"
					name="fullName"
					bind:value={fullName}
					error={errors.fullName}
				/>
				<SelectField
					label="Moneda principal"
					name="currency"
					options={currencyOptions}
					bind:value={currency}
					error={errors.currency}
				/>
				<AmountField
					name="monthlyBudget"
					label="Presupuesto mensual global"
					bind:value={monthlyBudget}
					{currency}
					tone="primary"
					quickAmounts={[]}
					error={errors.monthlyBudget}
				/>
				<p class="text-body-sm text-muted">
					Se usa como meta general en Inicio; los límites por categoría se editan en Cuentas.
				</p>

				<button type="submit" class={buttonClass('secondary', 'md', true)} disabled={savingProfile}>
					{#if savingProfile}
						<Icon name="progress_activity" size={18} class="animate-spin" />
					{:else}
						<Icon name="check" size={18} />
					{/if}
					Guardar perfil
				</button>
			</form>
		</section>

		<section class="space-y-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4">
			<h2 class="flex items-center gap-2 text-title-sm text-ink">
				<Icon name="notifications" size={18} class="text-secondary" />
				Notificaciones
			</h2>

			{#if form?.intent === 'notifications' && form.message}
				<div
					class="flex items-start gap-2 rounded-xl bg-tertiary/8 px-3 py-2.5 text-body-sm font-medium text-tertiary"
					role="alert"
				>
					<Icon name="error" size={18} class="mt-0.5 shrink-0" />
					{form.message}
				</div>
			{/if}

			<p class="text-body-sm text-muted">
				Un recordatorio al día por cada cuota por vencer o vencida, hasta que la pagues, la archives
				o la elimines.
			</p>

			<form
				method="POST"
				action="?/notifications"
				class="space-y-3"
				use:enhance={enhanceForm({
					success: 'Preferencias de notificación guardadas',
					onStart: () => (savingNotifications = true),
					onFinish: () => (savingNotifications = false)
				})}
			>
				<Switch
					label="Avisarme de cuotas y aportes"
					description="Se envía a la hora local de tu dispositivo"
					name="pushEnabled"
					bind:checked={pushEnabled}
				/>

				<TextField
					label="Hora del aviso"
					name="pushTime"
					type="time"
					bind:value={pushTime}
					error={errors.pushTime}
					hint="Elige la hora a la que quieres recibir el recordatorio"
				/>

				<PushDevice />

				<button
					type="submit"
					class={buttonClass('secondary', 'md', true)}
					disabled={savingNotifications}
				>
					{#if savingNotifications}
						<Icon name="progress_activity" size={18} class="animate-spin" />
					{:else}
						<Icon name="check" size={18} />
					{/if}
					Guardar preferencias
				</button>
			</form>
		</section>

		<section
			class="space-y-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4"
		>
			<h2 class="flex items-center gap-2 text-title-sm text-ink">
				<Icon name="lock" size={18} class="text-secondary" />
				Contraseña
			</h2>

			{#if form?.intent === 'password' && form.message}
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
				action="?/password"
				class="space-y-3"
				use:enhance={enhanceForm({
					success: 'Contraseña actualizada',
					onSuccess: () => {
						currentPassword = '';
						password = '';
						passwordConfirm = '';
					},
					onStart: () => (savingPassword = true),
					onFinish: () => (savingPassword = false)
				})}
			>
				<TextField
					label="Contraseña actual"
					name="currentPassword"
					type="password"
					icon="lock"
					autocomplete="current-password"
					bind:value={currentPassword}
					error={errors.currentPassword}
				/>
				<TextField
					label="Nueva contraseña"
					name="password"
					type="password"
					icon="lock"
					autocomplete="new-password"
					bind:value={password}
					error={errors.password}
					hint="Mínimo 12 caracteres, con letras y números"
				/>
				<TextField
					label="Confirmar contraseña"
					name="passwordConfirm"
					type="password"
					icon="lock_reset"
					autocomplete="new-password"
					bind:value={passwordConfirm}
					error={errors.passwordConfirm}
				/>

				<button
					type="submit"
					class={buttonClass('secondary', 'md', true)}
					disabled={savingPassword}
				>
					{#if savingPassword}
						<Icon name="progress_activity" size={18} class="animate-spin" />
					{:else}
						<Icon name="key" size={18} />
					{/if}
					Cambiar contraseña
				</button>
			</form>
		</section>

		<section
			class="space-y-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest p-4"
		>
			<h2 class="flex items-center gap-2 text-title-sm text-ink">
				<Icon name="download" size={18} class="text-secondary" />
				Exportar datos
			</h2>
			<p class="text-body-sm text-muted">
				{data.movements.length} de {data.movementTotal} movimientos de {data.month.label}. Para
				otros periodos usa
				<a href={resolve('/(app)/metricas')} class="font-semibold text-secondary underline"
					>Métricas</a
				>.
			</p>

			<div class="grid grid-cols-2 gap-2">
				<button type="button" class={buttonClass('outline', 'md', true)} onclick={exportCsv}>
					<Icon name="csv" size={18} />
					CSV
				</button>
				<button type="button" class={buttonClass('outline', 'md', true)} onclick={exportPdf}>
					<Icon name="picture_as_pdf" size={18} />
					PDF
				</button>
			</div>
		</section>
	</div>

	<div class="lg:col-span-12">
		<InstallApp />
	</div>

	<section class="space-y-2 lg:col-span-12">
		<form
			method="POST"
			action="/auth/salir"
			use:enhance={enhanceForm({
				onStart: () => (leaving = true),
				onFinish: () => (leaving = false)
			})}
		>
			<button type="submit" class={buttonClass('danger', 'md', true)} disabled={leaving}>
				{#if leaving}
					<Icon name="progress_activity" size={18} class="animate-spin" />
				{:else}
					<Icon name="logout" size={18} />
				{/if}
				Cerrar sesión
			</button>
		</form>
		<p class="text-center text-label-sm text-muted">
			FinFlow · Tus datos financieros están cifrados con protocolo AES-256
		</p>
	</section>
</div>
