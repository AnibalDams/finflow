<script lang="ts">
	import { tick } from 'svelte';
	import { cn } from '#lib/utils/cn';
	import Icon from './Icon.svelte';
	import Sheet from './Sheet.svelte';

	interface OptionSheetOption {
		value: string;
		label: string;
		description?: string;
		icon?: string;
		disabled?: boolean;
	}

	interface Props {
		title: string;
		open?: boolean;
		value?: string;
		options: OptionSheetOption[];
		/** Nombre del campo para el envío del formulario. */
		name?: string;
		/** Etiqueta accesible del campo oculto. */
		label?: string;
		tone?: 'primary' | 'secondary' | 'tertiary';
		required?: boolean;
		emptyLabel?: string;
		/** Elemento que recupera el foco al cerrar la hoja. */
		returnFocus?: HTMLElement | null;
		/** Notifica la elección (útil cuando el valor lo controla el padre). */
		onchange?: (value: string) => void;
	}

	let {
		title,
		open = $bindable(false),
		value = $bindable(''),
		options,
		name,
		label = title,
		tone = 'primary',
		required = false,
		emptyLabel = 'No hay opciones disponibles',
		returnFocus = null,
		onchange
	}: Props = $props();

	const TONE = {
		primary: { tile: 'bg-primary/12 text-primary', check: 'text-primary', row: 'bg-primary/8' },
		secondary: {
			tile: 'bg-secondary/12 text-secondary',
			check: 'text-secondary',
			row: 'bg-secondary/8'
		},
		tertiary: {
			tile: 'bg-tertiary/12 text-tertiary',
			check: 'text-tertiary',
			row: 'bg-tertiary/8'
		}
	} as const;

	let listbox = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (!open) return;
		// El Sheet monta la lista en el siguiente tick; enfoca la opción activa.
		tick().then(() => {
			const target =
				listbox?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]') ??
				listbox?.querySelector<HTMLElement>('[role="option"]:not([disabled])');
			target?.focus({ preventScroll: false });
		});
	});

	function choose(option: OptionSheetOption): void {
		if (option.disabled) return;
		value = option.value;
		open = false;
		onchange?.(option.value);
	}

	function onKeydown(event: KeyboardEvent): void {
		if (!listbox) return;
		const items = Array.from(
			listbox.querySelectorAll<HTMLElement>('[role="option"]:not([disabled])')
		);
		if (items.length === 0) return;

		const current = items.indexOf(document.activeElement as HTMLElement);
		let next = current;

		if (event.key === 'ArrowDown') next = current < 0 ? 0 : (current + 1) % items.length;
		else if (event.key === 'ArrowUp') next = current <= 0 ? items.length - 1 : current - 1;
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = items.length - 1;
		else return;

		event.preventDefault();
		items[next]?.focus();
	}
</script>

<!--
	Select nativo invisible: conserva `name`, `required` y el valor enviado por
	el formulario, mientras la interacción visible ocurre en la hoja inferior.
-->
{#if name}
	<select
		{name}
		bind:value
		{required}
		tabindex="-1"
		aria-hidden="true"
		aria-label={label}
		class="sr-only"
	>
		{#if value === ''}
			<option value="" disabled>{label}</option>
		{/if}
		{#each options as option (option.value)}
			<option value={option.value} disabled={option.disabled}>{option.label}</option>
		{/each}
	</select>
{/if}

<Sheet {title} bind:open {returnFocus}>
	<div
		class="space-y-1.5 pt-1 pb-2"
		role="listbox"
		aria-label={title}
		tabindex="-1"
		bind:this={listbox}
		onkeydown={onKeydown}
	>
		{#if options.length === 0}
			<p class="py-8 text-center text-body-sm text-muted">{emptyLabel}</p>
		{/if}

		{#each options as option (option.value)}
			{@const selected = option.value === value}
			<button
				type="button"
				role="option"
				aria-selected={selected}
				disabled={option.disabled}
				class={cn(
					'flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40',
					selected
						? cn('border-transparent', TONE[tone].row)
						: 'border-hairline/70 bg-surface-container-lowest hover:bg-level-1/60'
				)}
				onclick={() => choose(option)}
			>
				{#if option.icon}
					<span
						class={cn(
							'flex size-10 shrink-0 items-center justify-center rounded-xl',
							selected ? TONE[tone].tile : 'bg-level-1 text-on-surface-variant'
						)}
					>
						<Icon name={option.icon} size={20} />
					</span>
				{/if}

				<span class="min-w-0 flex-1">
					<span class="block truncate text-label font-medium text-ink">{option.label}</span>
					{#if option.description}
						<span class="block truncate text-body-sm text-muted">{option.description}</span>
					{/if}
				</span>

				{#if selected}
					<Icon name="check_circle" size={20} filled class={TONE[tone].check} />
				{:else}
					<Icon name="radio_button_unchecked" size={20} class="text-muted-soft" />
				{/if}
			</button>
		{/each}
	</div>
</Sheet>
