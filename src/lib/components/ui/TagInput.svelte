<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import { cn } from '#lib/utils/cn';

	interface Props {
		name: string;
		value?: string;
		label?: string;
		placeholder?: string;
		/** Máximo de etiquetas permitidas. */
		max?: number;
		class?: string;
	}

	let { name, value = $bindable(''), label, placeholder = '+ Nueva', max = 8, class: className = '' }: Props = $props();

	let draft = $state('');

	const tags = $derived(
		value
			.split(',')
			.map((tag) => tag.trim())
			.filter((tag) => tag.length > 0)
	);

	function addTag(): void {
		const candidate = draft.trim().replace(/^#/, '').slice(0, 30);
		draft = '';
		if (!candidate || tags.includes(candidate) || tags.length >= max) return;
		value = [...tags, candidate].join(',');
	}

	function removeTag(tag: string): void {
		value = tags.filter((item) => item !== tag).join(',');
	}

	function onKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' || event.key === ',') {
			event.preventDefault();
			addTag();
			return;
		}
		if (event.key === 'Backspace' && draft.length === 0 && tags.length > 0) {
			removeTag(tags[tags.length - 1]);
		}
	}
</script>

<div class={cn('space-y-1.5', className)}>
	{#if label}
		<p class="text-label-sm font-medium text-on-surface-variant">{label}</p>
	{/if}

	<input type="hidden" {name} value={value} />

	<div
		class="flex flex-wrap items-center gap-2 rounded-2xl border border-hairline bg-surface-container-lowest p-2.5 transition focus-within:border-secondary focus-within:ring-3 focus-within:ring-secondary/12"
	>
		{#each tags as tag (tag)}
			<span
				class="flex items-center gap-1 rounded-full bg-primary/10 py-1 pr-1.5 pl-2.5 text-label-sm font-semibold text-primary"
			>
				#{tag}
				<button
					type="button"
					class="flex size-5 items-center justify-center rounded-full transition hover:bg-primary/15"
					aria-label={`Quitar etiqueta ${tag}`}
					onclick={() => removeTag(tag)}
				>
					<Icon name="close" size={13} />
				</button>
			</span>
		{/each}

		<input
			bind:value={draft}
			onkeydown={onKeydown}
			onblur={addTag}
			type="text"
			placeholder={tags.length === 0 ? 'Añade una etiqueta y pulsa Enter' : placeholder}
			aria-label="Nueva etiqueta"
			class="min-w-28 flex-1 bg-transparent px-1 text-body text-ink placeholder:text-muted-soft focus:outline-none"
		/>
	</div>
</div>
