<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import PageHeader from '#lib/components/app/PageHeader.svelte';
	import PixelSprite from '#lib/components/seasonal/PixelSprite.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import {
		DEFAULT_SCHEDULE,
		fitCustomPalette,
		formatTimeOfDay,
		modeForMinutes,
		parseTimeOfDay,
		themeContrast,
		type CustomPalette,
		type ThemePreference,
		type ThemeSchedule
	} from '#lib/theme/derive';
	import type { ThemeMode } from '#lib/theme/palettes';
	import { clearThemePreview, previewTheme } from '#lib/theme/theme.svelte';
	import { enhanceForm } from '#lib/utils/enhance';
	import type { FormState } from '#lib/utils/forms';
	import { formatMoney } from '#lib/utils/money';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const formState = $derived(form as FormState | null);
	const errors = $derived(formState?.errors ?? {});
	const values = $derived(formState?.values ?? {});

	const MODES = [
		{ value: 'light', label: 'Claro', icon: 'light_mode' },
		{ value: 'dark', label: 'Noche', icon: 'dark_mode' },
		{ value: 'schedule', label: 'Horario', icon: 'schedule' },
		{ value: 'system', label: 'Sistema', icon: 'brightness_auto' }
	] as const;

	const NEUTRALS = [
		{ value: 'cool', label: 'Frío' },
		{ value: 'neutral', label: 'Neutro' },
		{ value: 'warm', label: 'Cálido' }
	] as const;

	// Se leen una sola vez para sembrar el formulario; así el estado local queda
	// explícito y no se genera el aviso de `state_referenced_locally`.
	const initial = {
		palette: values.palette ?? data.theme.palette,
		mode: values.mode ?? data.theme.mode,
		primary: values.customPrimary ?? data.theme.custom?.primary ?? '#006c49',
		secondary: values.customSecondary ?? data.theme.custom?.secondary ?? '#4648d4',
		tertiary: values.customTertiary ?? data.theme.custom?.tertiary ?? '#bc0b3b',
		neutral: values.customNeutral ?? data.theme.custom?.neutral ?? 'neutral',
		scheduleLight: values.scheduleLightStart ?? formatTimeOfDay(data.schedule.lightStart),
		scheduleDark: values.scheduleDarkStart ?? formatTimeOfDay(data.schedule.darkStart),
		seasonal: values.seasonal ?? data.seasonal
	};

	let palette = $state(initial.palette);
	let mode = $state(initial.mode);
	let customPrimary = $state(initial.primary);
	let customSecondary = $state(initial.secondary);
	let customTertiary = $state(initial.tertiary);
	let neutral = $state(initial.neutral);
	let scheduleLight = $state(initial.scheduleLight);
	let scheduleDark = $state(initial.scheduleDark);

	// La temporada se guarda como `auto`, `off` o el id de un pack (forzado).
	let seasonalOn = $state(initial.seasonal !== 'off');
	let seasonalForced = $state(initial.seasonal === 'navidad');

	$effect(() => {
		if (!seasonalOn) seasonalForced = false;
	});

	const seasonal = $derived(!seasonalOn ? 'off' : seasonalForced ? 'navidad' : 'auto');

	const seasonStatus = $derived(
		seasonal === 'off'
			? 'Desactivada. La app se verá igual todo el año.'
			: seasonal === 'navidad'
				? 'Vista previa forzada: se aplicará al guardar.'
				: data.season
					? 'Activa ahora. Se apaga sola el 7 de enero.'
					: 'Se activa sola del 1 de diciembre al 6 de enero.'
	);

	let saving = $state(false);
	let saved = $state(false);
	let systemDark = $state(false);
	// Reloj local redondeado al minuto: mantiene la vista previa al día cuando el
	// modo es «Horario» y se cruza una franja con la pantalla abierta.
	let clock = $state(new Date());

	onMount(() => {
		const query = window.matchMedia('(prefers-color-scheme: dark)');
		systemDark = query.matches;

		const listen = (event: MediaQueryListEvent): void => {
			systemDark = event.matches;
		};
		query.addEventListener('change', listen);

		const ticker = setInterval(() => (clock = new Date()), 30_000);

		return () => {
			query.removeEventListener('change', listen);
			clearInterval(ticker);
		};
	});

	const schedulePreference = $derived<ThemeSchedule>({
		lightStart: parseTimeOfDay(scheduleLight) ?? DEFAULT_SCHEDULE.lightStart,
		darkStart: parseTimeOfDay(scheduleDark) ?? DEFAULT_SCHEDULE.darkStart
	});

	const resolvedMode = $derived<'light' | 'dark'>(
		mode === 'schedule'
			? modeForMinutes(schedulePreference, clock.getHours() * 60 + clock.getMinutes())
			: mode === 'dark'
				? 'dark'
				: mode === 'light'
					? 'light'
					: systemDark
						? 'dark'
						: 'light'
	);

	const custom = $derived<CustomPalette>({
		primary: customPrimary,
		secondary: customSecondary,
		tertiary: customTertiary,
		neutral: neutral === 'cool' || neutral === 'warm' ? neutral : 'neutral'
	});

	const preference = $derived<ThemePreference>({
		palette,
		mode: isMode(mode),
		custom: palette === 'custom' ? custom : null
	});

	const contrast = $derived(themeContrast(preference, resolvedMode));
	const minContrast = $derived(
		Math.min(contrast.body, contrast.muted, contrast.primary, contrast.hero)
	);
	const badge = $derived(minContrast >= 7 ? 'AAA' : minContrast >= 4.5 ? 'AA' : 'Bajo');

	// La vista previa se aplica al documento y se retira al salir de la pantalla.
	$effect(() => {
		previewTheme(preference, schedulePreference);
		return clearThemePreview;
	});

	function isMode(value: string): ThemeMode {
		return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
	}

	function fitContrast(): void {
		const fitted = fitCustomPalette(custom, resolvedMode);
		customPrimary = fitted.primary;
		customSecondary = fitted.secondary;
		customTertiary = fitted.tertiary;
	}

	function handleFinish(): void {
		saving = false;
		if (!saved) return;
		saved = false;
		void invalidateAll().then(clearThemePreview);
	}
</script>

{#snippet headerAction()}
	<button
		type="submit"
		form="theme-form"
		class="rounded-full px-3 py-1.5 text-label font-semibold text-primary disabled:opacity-50"
		disabled={saving}
	>
		Guardar
	</button>
{/snippet}

<PageHeader
	title="Apariencia"
	subtitle="Paleta, modo y contraste"
	centered
	backHref="/ajustes"
	action={headerAction}
/>

<form
	id="theme-form"
	method="POST"
	class="space-y-6 px-4 pt-4 pb-10"
	use:enhance={enhanceForm({
		success: 'Apariencia guardada',
		onSuccess: () => (saved = true),
		onStart: () => (saving = true),
		onFinish: handleFinish
	})}
>
	{#if formState?.message}
		<div
			class="flex items-start gap-2 rounded-control bg-tertiary/8 px-3 py-2.5 text-body-sm font-medium text-tertiary"
			role="alert"
		>
			<Icon name="error" size={18} class="mt-0.5 shrink-0" />
			{formState.message}
		</div>
	{/if}

	<section class="space-y-2.5" aria-label="Vista previa del tema">
		<p class="text-label-sm font-semibold tracking-[0.14em] text-muted uppercase">Vista previa</p>

		<div class="overflow-hidden rounded-panel hero-surface p-5 shadow-hero">
			<div class="flex items-start justify-between gap-3">
				<p class="text-label-sm font-medium tracking-[0.14em] uppercase opacity-60">
					Balance disponible
				</p>
				<span class="rounded-full bg-hero-overlay px-2.5 py-1 text-label-sm font-semibold">
					+12,4 %
				</span>
			</div>

			<p class="mt-1.5 tnum text-title-xl">{formatMoney(12480.5, 'USD')}</p>

			<div class="mt-3 flex flex-wrap gap-2">
				<span class="rounded-full bg-hero-overlay px-2.5 py-1 text-label-sm text-primary-fixed">
					Ingresos +1.240,00
				</span>
				<span class="rounded-full bg-hero-overlay px-2.5 py-1 text-label-sm text-tertiary-fixed">
					Gastos −860,00
				</span>
			</div>
		</div>

		<div class="grid grid-cols-3 gap-2">
			<div class="rounded-card bg-primary px-2 py-2.5 text-center text-label-sm text-on-primary">
				Marca
			</div>
			<div
				class="rounded-card bg-secondary px-2 py-2.5 text-center text-label-sm text-on-secondary"
			>
				Planes
			</div>
			<div class="rounded-card bg-tertiary px-2 py-2.5 text-center text-label-sm text-on-tertiary">
				Gastos
			</div>
		</div>

		<div class="rounded-card border border-hairline bg-surface-container-lowest p-4">
			<div class="flex items-center gap-3">
				<span
					class="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary"
				>
					<Icon name="savings" size={18} />
				</span>
				<div class="min-w-0">
					<p class="text-body font-medium text-ink">Superficie de tarjeta</p>
					<p class="text-body-sm text-muted">Texto secundario y bordes del sistema.</p>
				</div>
			</div>
			<div class="mt-3 h-2 overflow-hidden rounded-full bg-level-1">
				<div class="h-full w-2/3 rounded-full bg-primary"></div>
			</div>
		</div>
	</section>

	<fieldset class="space-y-2">
		<legend class="text-label-sm font-semibold tracking-[0.14em] text-muted uppercase">
			Modo de color
		</legend>
		<div class="grid grid-cols-4 gap-1 rounded-full bg-level-1 p-1">
			{#each MODES as option (option.value)}
				<label
					class="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-full text-label-sm font-semibold transition-colors {mode ===
					option.value
						? 'bg-surface-container-lowest text-ink shadow-card'
						: 'text-on-surface-variant hover:text-on-surface'}"
				>
					<input type="radio" name="mode" value={option.value} bind:group={mode} class="sr-only" />
					<Icon name={option.icon} size={17} />
					{option.label}
				</label>
			{/each}
		</div>

		{#if mode === 'schedule'}
			<div class="grid grid-cols-2 gap-2">
				<label class="rounded-control border border-hairline bg-surface-container-lowest px-3 py-2">
					<span class="block text-label-sm font-medium text-muted">Claro desde</span>
					<input
						type="time"
						name="scheduleLightStart"
						bind:value={scheduleLight}
						class="mt-1 w-full bg-transparent tnum text-body font-medium text-ink focus-visible:outline-none"
					/>
				</label>
				<label class="rounded-control border border-hairline bg-surface-container-lowest px-3 py-2">
					<span class="block text-label-sm font-medium text-muted">Oscuro desde</span>
					<input
						type="time"
						name="scheduleDarkStart"
						bind:value={scheduleDark}
						class="mt-1 w-full bg-transparent tnum text-body font-medium text-ink focus-visible:outline-none"
					/>
				</label>
			</div>
			{#if errors.scheduleLightStart || errors.scheduleDarkStart}
				<p class="text-body-sm font-medium text-tertiary">
					{errors.scheduleLightStart ?? errors.scheduleDarkStart}
				</p>
			{/if}
			<p class="text-body-sm text-muted">
				Claro de {scheduleLight} a {scheduleDark} y oscuro el resto del día, según la hora de tu dispositivo.
				Cambia solo, sin recargar.
			</p>
		{:else}
			<input type="hidden" name="scheduleLightStart" value={scheduleLight} />
			<input type="hidden" name="scheduleDarkStart" value={scheduleDark} />
			<p class="text-body-sm text-muted">
				«Sistema» sigue el modo claro u oscuro de tu dispositivo, sin recargar.
			</p>
		{/if}
	</fieldset>

	<fieldset class="space-y-3 rounded-card border border-hairline bg-surface-container-lowest p-4">
		<legend class="sr-only">Temporada</legend>

		<Switch label="Decoración de temporada" description={seasonStatus} bind:checked={seasonalOn} />
		<input type="hidden" name="seasonal" value={seasonal} />

		{#if seasonal === 'navidad' || data.season?.id === 'navidad'}
			<div class="flex items-end gap-2 rounded-control bg-level-1/60 px-3 py-2">
				<PixelSprite name="tree" size={34} motion="bob" />
				<PixelSprite name="santa" size={28} motion="bob" />
				<PixelSprite name="gift" size={20} />
				<PixelSprite name="boot" size={18} />
				<span class="ml-auto text-right text-body-sm text-muted">Navidad<br />1 dic – 6 ene</span>
			</div>
		{/if}

		<div class="flex flex-wrap gap-2">
			{#if seasonal === 'navidad'}
				<button
					type="button"
					class={buttonClass('tonal', 'sm')}
					onclick={() => (seasonalForced = false)}
				>
					<Icon name="restart_alt" size={16} />
					Volver a automático
				</button>
			{:else if !data.season}
				<button
					type="button"
					class={buttonClass('tonal', 'sm')}
					onclick={() => {
						seasonalOn = true;
						seasonalForced = true;
					}}
				>
					<Icon name="celebration" size={16} />
					Ver ahora
				</button>
			{/if}
		</div>
	</fieldset>

	<fieldset class="space-y-2">
		<legend class="text-label-sm font-semibold tracking-[0.14em] text-muted uppercase">
			Paletas
		</legend>

		<div class="grid gap-2 sm:grid-cols-2">
			{#each data.palettes as item (item.id)}
				<label
					class="cursor-pointer rounded-card border p-3 transition {palette === item.id
						? 'border-primary bg-primary/6 ring-2 ring-primary/25'
						: 'border-hairline bg-surface-container-lowest hover:border-outline-variant'}"
				>
					<input type="radio" name="palette" value={item.id} bind:group={palette} class="sr-only" />
					<span class="flex items-center gap-1.5">
						{#each [item.preview.primary, item.preview.secondary, item.preview.tertiary] as color, index (index)}
							<span class="size-6 rounded-full ring-1 ring-black/5" style="background-color:{color}"
							></span>
						{/each}
						{#if palette === item.id}
							<Icon name="check_circle" size={18} class="ml-auto text-primary" />
						{/if}
					</span>
					<span class="mt-2 block text-label text-ink">{item.name}</span>
					<span class="mt-0.5 block text-body-sm text-muted">{item.description}</span>
				</label>
			{/each}
		</div>
		{#if errors.palette}
			<p class="text-body-sm font-medium text-tertiary">{errors.palette}</p>
		{/if}
	</fieldset>

	<fieldset
		class="space-y-3 rounded-card border p-4 transition {palette === 'custom'
			? 'border-primary bg-primary/6 ring-2 ring-primary/25'
			: 'border-hairline bg-surface-container-lowest'}"
	>
		<legend class="sr-only">Paleta personalizada</legend>

		<label class="flex cursor-pointer items-center gap-3">
			<input type="radio" name="palette" value="custom" bind:group={palette} class="sr-only" />
			<span
				class="size-9 shrink-0 rounded-full ring-1 ring-black/5"
				style="background:conic-gradient(from 210deg, {customPrimary}, {customSecondary}, {customTertiary}, {customPrimary})"
				aria-hidden="true"
			></span>
			<span class="min-w-0 flex-1">
				<span class="block text-label text-ink">Personalizada</span>
				<span class="block text-body-sm text-muted">
					Elige tus propios colores de marca, planes y gastos.
				</span>
			</span>
			{#if palette === 'custom'}
				<Icon name="check_circle" size={18} class="shrink-0 text-primary" />
			{/if}
		</label>

		{#if palette === 'custom'}
			<div class="space-y-3 border-t border-hairline/70 pt-3">
				<div class="grid gap-2 sm:grid-cols-3">
					<label
						class="flex items-center justify-between gap-2 rounded-control bg-level-1/70 px-3 py-2"
					>
						<span class="text-body-sm font-medium text-ink">Marca</span>
						<input
							type="color"
							name="customPrimary"
							value={customPrimary}
							oninput={(event) => (customPrimary = event.currentTarget.value)}
							aria-label="Color de marca"
							class="h-8 w-11 cursor-pointer rounded-control border border-hairline bg-transparent"
						/>
					</label>
					<label
						class="flex items-center justify-between gap-2 rounded-control bg-level-1/70 px-3 py-2"
					>
						<span class="text-body-sm font-medium text-ink">Planes</span>
						<input
							type="color"
							name="customSecondary"
							value={customSecondary}
							oninput={(event) => (customSecondary = event.currentTarget.value)}
							aria-label="Color de planes"
							class="h-8 w-11 cursor-pointer rounded-control border border-hairline bg-transparent"
						/>
					</label>
					<label
						class="flex items-center justify-between gap-2 rounded-control bg-level-1/70 px-3 py-2"
					>
						<span class="text-body-sm font-medium text-ink">Gastos</span>
						<input
							type="color"
							name="customTertiary"
							value={customTertiary}
							oninput={(event) => (customTertiary = event.currentTarget.value)}
							aria-label="Color de gastos"
							class="h-8 w-11 cursor-pointer rounded-control border border-hairline bg-transparent"
						/>
					</label>
				</div>

				<div>
					<p class="text-body-sm font-medium text-ink">Temperatura del neutro</p>
					<div class="mt-1.5 grid grid-cols-3 gap-1 rounded-full bg-level-1 p-1">
						{#each NEUTRALS as option (option.value)}
							<label
								class="flex h-9 cursor-pointer items-center justify-center rounded-full text-label-sm font-semibold transition-colors {neutral ===
								option.value
									? 'bg-surface-container-lowest text-ink shadow-card'
									: 'text-on-surface-variant hover:text-on-surface'}"
							>
								<input
									type="radio"
									name="customNeutral"
									value={option.value}
									bind:group={neutral}
									class="sr-only"
								/>
								{option.label}
							</label>
						{/each}
					</div>
				</div>

				<div
					class="flex flex-wrap items-center justify-between gap-2 rounded-control bg-primary/6 px-3 py-2"
				>
					<p class="text-body-sm text-ink">
						Contraste mínimo
						<span class="tnum font-semibold">{minContrast.toFixed(1)}:1</span>
						<span class="ml-1 font-semibold">{badge}</span>
					</p>
					<button type="button" class={buttonClass('tonal', 'sm')} onclick={fitContrast}>
						<Icon name="auto_fix" size={16} />
						Auto-ajustar
					</button>
				</div>

				<p class="text-body-sm text-muted">
					Los colores se corrigen solos para mantener la legibilidad en claro y en oscuro.
				</p>
			</div>
		{/if}
	</fieldset>

	<button type="submit" class={buttonClass('primary', 'lg', true)} disabled={saving}>
		{#if saving}
			<Icon name="progress_activity" size={18} class="animate-spin" />
		{:else}
			<Icon name="check" size={18} />
		{/if}
		Guardar apariencia
	</button>

	<p class="text-center text-label-sm text-muted">
		El tema se aplica al instante y se sincroniza con tu cuenta.
	</p>
</form>
