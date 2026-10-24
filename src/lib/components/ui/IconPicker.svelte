<script lang="ts">
	import { cn } from '#lib/utils/cn';
	import type { IconGroup } from '#lib/utils/icons';
	import Icon from './Icon.svelte';

	interface Props {
		/** Lista plana de iconos. Se usa cuando no se pasan grupos. */
		icons?: string[];
		/** Grupos temáticos con sinónimos para el buscador. */
		groups?: IconGroup[];
		value?: string;
		name: string;
		error?: string;
		class?: string;
	}

	let {
		icons = [],
		groups,
		value = $bindable(''),
		name,
		error,
		class: className = ''
	}: Props = $props();

	let query = $state('');
	let activeGroup = $state('all');

	const grouped = $derived(Boolean(groups && groups.length > 0));
	const sourceGroups = $derived<IconGroup[]>(
		grouped && groups ? groups : [{ id: 'all', label: 'Todos', icons }]
	);
	const searchable = $derived(sourceGroups.length > 1 || (sourceGroups[0]?.icons.length ?? 0) > 12);
	const normalizedQuery = $derived(normalizeText(query.trim()));

	/** Compara sin distinguir mayúsculas ni acentos («cafe» encuentra «café»). */
	function normalizeText(value: string): string {
		return value
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '')
			.toLowerCase();
	}

	$effect(() => {
		if (activeGroup !== 'all' && !sourceGroups.some((group) => group.id === activeGroup)) {
			activeGroup = 'all';
		}
	});

	function groupMatches(group: IconGroup, text: string): boolean {
		const terms = [group.label, ...(group.keywords ?? [])];
		return terms.some((term) => normalizeText(term).includes(text));
	}

	function matches(group: IconGroup, icon: string, text: string): boolean {
		return icon.includes(text) || groupMatches(group, text);
	}

	const filteredGroups = $derived.by(() => {
		const text = normalizedQuery;
		return sourceGroups
			.filter((group) => activeGroup === 'all' || group.id === activeGroup)
			.map((group) => {
				const list = text
					? group.icons.filter((icon) => matches(group, icon, text))
					: [...group.icons];

				// El icono elegido nunca desaparece de su grupo aunque el filtro no lo encuentre.
				if (value && group.icons.includes(value) && !list.includes(value)) list.push(value);

				return { ...group, icons: list };
			})
			.filter((group) => group.icons.length > 0);
	});

	function preventSubmit(event: KeyboardEvent): void {
		if (event.key === 'Enter') event.preventDefault();
	}
</script>

<div class={cn('space-y-2', className)}>
	{#if searchable}
		<div class="relative">
			<Icon
				name="search"
				size={18}
				class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
			/>
			<input
				type="search"
				bind:value={query}
				onkeydown={preventSubmit}
				placeholder="Buscar ícono o categoría"
				aria-label="Buscar ícono"
				class="w-full rounded-xl border border-hairline bg-surface-container-lowest py-2 pr-9 pl-9 text-body text-ink placeholder:text-muted-soft focus:border-secondary focus:ring-3 focus:ring-secondary/12 focus:outline-none"
			/>
			{#if query}
				<button
					type="button"
					onclick={() => (query = '')}
					class="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 text-muted hover:text-ink"
					aria-label="Limpiar búsqueda"
				>
					<Icon name="close" size={16} />
				</button>
			{/if}
		</div>
	{/if}

	{#if grouped}
		<div class="-mx-0.5 no-scrollbar flex gap-1.5 overflow-x-auto px-0.5 pb-0.5">
			<button
				type="button"
				onclick={() => (activeGroup = 'all')}
				aria-pressed={activeGroup === 'all'}
				class={cn(
					'shrink-0 rounded-full px-2.5 py-1 text-label-sm font-semibold whitespace-nowrap transition',
					activeGroup === 'all'
						? 'bg-inverse-surface text-inverse-on-surface'
						: 'bg-level-1 text-on-surface-variant'
				)}
			>
				Todos
			</button>
			{#each sourceGroups as group (group.id)}
				<button
					type="button"
					onclick={() => (activeGroup = group.id)}
					aria-pressed={activeGroup === group.id}
					class={cn(
						'shrink-0 rounded-full px-2.5 py-1 text-label-sm font-semibold whitespace-nowrap transition',
						activeGroup === group.id
							? 'bg-inverse-surface text-inverse-on-surface'
							: 'bg-level-1 text-on-surface-variant'
					)}
				>
					{group.label}
				</button>
			{/each}
		</div>
	{/if}

	<!-- El filtro por grupo puede ocultar el icono elegido: se mantiene visible para no perderlo. -->
	{#if value && !filteredGroups.some((group) => group.icons.includes(value))}
		<div class="flex items-center gap-2 rounded-xl border border-secondary/40 bg-secondary/5 p-2">
			<span class="pl-1 text-label-sm font-medium text-muted">Seleccionado</span>
			<label
				class="flex aspect-square cursor-pointer items-center justify-center rounded-xl border border-secondary bg-secondary/10 text-secondary"
				title={value}
			>
				<input type="radio" {name} {value} checked={true} class="sr-only" aria-label={value} />
				<Icon name={value} size={20} />
			</label>
		</div>
	{/if}

	{#if filteredGroups.length > 0}
		<div class="max-h-72 space-y-3 overflow-y-auto rounded-xl p-0.5">
			{#each filteredGroups as group (group.id)}
				<div class="space-y-1.5">
					{#if grouped}
						<p class="text-label-sm font-semibold tracking-wide text-muted uppercase">
							{group.label}
						</p>
					{/if}
					<div class="grid grid-cols-6 gap-2" role="radiogroup" aria-label={group.label}>
						{#each group.icons as icon (icon)}
							<label
								class={cn(
									'flex aspect-square cursor-pointer items-center justify-center rounded-xl border transition',
									value === icon
										? 'border-secondary bg-secondary/10 text-secondary'
										: 'border-hairline bg-surface-container-lowest text-muted hover:border-outline-variant'
								)}
								title={icon}
							>
								<input
									type="radio"
									{name}
									value={icon}
									checked={value === icon}
									class="sr-only"
									aria-label={icon}
									onchange={() => (value = icon)}
								/>
								<Icon name={icon} size={20} />
							</label>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<p class="rounded-xl bg-level-1/70 px-3 py-4 text-center text-body-sm text-muted">
			No encontramos iconos para «{query.trim()}».
		</p>
	{/if}

	{#if error}
		<p class="text-body-sm font-medium text-tertiary">{error}</p>
	{/if}
</div>
