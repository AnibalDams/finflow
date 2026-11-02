<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import Sheet from '#lib/components/ui/Sheet.svelte';
	import { notifyError, notifySuccess } from '#lib/stores/toast.svelte';
	import { formatFullDate } from '#lib/utils/dates';
	import { downloadReport } from '#lib/utils/export';
	import { TRANSACTION_TYPE_LABELS } from '#lib/utils/labels';
	import { formatMoney, sumAmounts } from '#lib/utils/money';
	import type { ReportDocument, ReportFormat } from '#lib/utils/report';
	import type { TransactionItem } from '#lib/types/domain';

	interface Props {
		open?: boolean;
		/** Clave `YYYY-MM` o `null` para todo el historial. */
		month: string | null;
		label: string;
		total: number;
		currency: string;
		profileName: string;
		/** Parámetros de la vista (mes y filtros activos). */
		scopeQuery: string;
		hasFilters: boolean;
	}

	let {
		open = $bindable(false),
		month,
		label,
		total,
		currency,
		profileName,
		scopeQuery,
		hasFilters
	}: Props = $props();

	interface ExportPayload {
		items: TransactionItem[];
		total: number;
		truncated: boolean;
	}

	const FORMATS: Array<{
		value: ReportFormat;
		label: string;
		description: string;
		icon: string;
		tone: string;
	}> = [
		{
			value: 'pdf',
			label: 'PDF',
			description: 'Informe con resumen y tabla, listo para imprimir.',
			icon: 'picture_as_pdf',
			tone: 'bg-tertiary/10 text-tertiary'
		},
		{
			value: 'xlsx',
			label: 'Excel',
			description: 'Libro .xlsx con montos numéricos y formato.',
			icon: 'table_view',
			tone: 'bg-primary/10 text-primary'
		},
		{
			value: 'csv',
			label: 'CSV',
			description: 'Datos planos compatibles con cualquier hoja de cálculo.',
			icon: 'grid_on',
			tone: 'bg-secondary/10 text-secondary'
		},
		{
			value: 'html',
			label: 'HTML estilizado',
			description: 'Página autocontenida con el diseño de FinFlow.',
			icon: 'code',
			tone: 'bg-amber-500/12 text-amber-700'
		}
	];

	/** Debe coincidir con el tope del endpoint de exportación. */
	const MAX_ROWS = 5000;

	let busy = $state<ReportFormat | null>(null);
	let error = $state('');

	$effect(() => {
		if (!open) {
			busy = null;
			error = '';
		}
	});

	function isExportPayload(value: unknown): value is ExportPayload {
		if (typeof value !== 'object' || value === null) return false;
		const data = value as Record<string, unknown>;
		return (
			Array.isArray(data.items) &&
			typeof data.total === 'number' &&
			typeof data.truncated === 'boolean'
		);
	}

	async function loadItems(): Promise<ExportPayload> {
		const response = await fetch(`/movimientos/exportar?${scopeQuery}`, {
			headers: { accept: 'application/json' }
		});
		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const payload: unknown = await response.json();
		if (!isExportPayload(payload)) throw new Error('Respuesta inválida');
		return payload;
	}

	function buildReport(items: TransactionItem[]): ReportDocument {
		const income = sumAmounts(
			items.filter((item) => item.type === 'income').map((item) => item.amount)
		);
		const expense = sumAmounts(
			items.filter((item) => item.type === 'expense').map((item) => item.amount)
		);
		const notes = hasFilters
			? 'Exportación filtrada según los criterios de la pestaña Movimientos.'
			: 'Incluye todos los movimientos del periodo seleccionado.';

		return {
			title: 'Movimientos',
			subtitle: label,
			profileName,
			currency,
			summary: [
				['Movimientos', String(items.length)],
				['Ingresos', formatMoney(income, currency)],
				['Gastos', formatMoney(expense, currency)],
				['Balance', formatMoney(income - expense, currency)]
			],
			sections: [
				{
					heading: 'Detalle de movimientos',
					columns: [
						{ label: 'Fecha' },
						{ label: 'Concepto' },
						{ label: 'Cuenta' },
						{ label: 'Categoría' },
						{ label: 'Tipo' },
						{ label: 'Monto', align: 'right' },
						{ label: 'Moneda', align: 'center' }
					],
					rows: items.map((item) => [
						formatFullDate(item.occurredAt),
						item.concept,
						item.accountName,
						item.categoryName ?? 'Sin categoría',
						TRANSACTION_TYPE_LABELS[item.type],
						{ value: item.amount, format: 'money', currency: item.currency },
						item.currency
					])
				}
			],
			fileName: `finflow-movimientos-${month ?? 'historial'}`,
			note: `${notes} Documento generado por FinFlow.`
		};
	}

	async function exportAs(format: ReportFormat): Promise<void> {
		if (busy || total === 0) return;

		busy = format;
		error = '';

		try {
			const payload = await loadItems();

			if (payload.items.length === 0) {
				error = 'No hay movimientos que coincidan con los filtros.';
				return;
			}

			await downloadReport(format, buildReport(payload.items));
			notifySuccess(
				`${format === 'xlsx' ? 'Excel' : format.toUpperCase()} descargado (${payload.items.length} movimientos)`
			);
			open = false;
		} catch (cause) {
			console.error('[finflow] export movements:', cause);
			error = 'No pudimos generar la exportación. Inténtalo de nuevo.';
			notifyError('No pudimos generar la exportación.');
		} finally {
			busy = null;
		}
	}
</script>

<Sheet title="Exportar movimientos" subtitle={label} bind:open>
	<div class="space-y-4 pb-2">
		<div class="rounded-2xl bg-level-1/70 p-3">
			<p class="text-label font-semibold text-ink">
				{total}
				{total === 1 ? 'movimiento' : 'movimientos'}
			</p>
			<p class="mt-0.5 text-body-sm text-muted">
				{hasFilters
					? 'Se aplican los filtros activos de la pestaña.'
					: 'Todos los movimientos del periodo seleccionado.'}
			</p>
			{#if total > MAX_ROWS}
				<p class="mt-2 flex items-start gap-1.5 text-body-sm text-amber-700">
					<Icon name="info" size={16} class="mt-0.5 shrink-0" />
					Se exportarán los primeros {MAX_ROWS} de {total} movimientos.
				</p>
			{/if}
			{#if error}
				<p class="mt-2 flex items-start gap-1.5 text-body-sm text-tertiary" role="alert">
					<Icon name="error" size={16} class="mt-0.5 shrink-0" />
					{error}
				</p>
			{/if}
		</div>

		<div class="grid gap-2">
			{#each FORMATS as option (option.value)}
				<button
					type="button"
					class="flex items-center gap-3 rounded-2xl border border-hairline/70 bg-surface-container-lowest px-3 py-3 text-left transition hover:bg-level-1/60 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
					disabled={busy !== null || total === 0}
					aria-busy={busy === option.value}
					onclick={() => exportAs(option.value)}
				>
					<span class="flex size-10 shrink-0 items-center justify-center rounded-xl {option.tone}">
						{#if busy === option.value}
							<Icon name="progress_activity" size={20} class="animate-spin" />
						{:else}
							<Icon name={option.icon} size={20} />
						{/if}
					</span>
					<span class="min-w-0 flex-1">
						<span class="block text-label font-semibold text-ink">{option.label}</span>
						<span class="block text-body-sm text-muted">{option.description}</span>
					</span>
					<Icon name="chevron_right" size={18} class="shrink-0 text-muted-soft" />
				</button>
			{/each}
		</div>

		{#if total === 0}
			<p class="text-center text-body-sm text-muted">
				No hay movimientos para exportar en este periodo.
			</p>
		{/if}
	</div>
</Sheet>
