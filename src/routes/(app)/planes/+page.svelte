<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import ProgressBar from '#lib/components/ui/ProgressBar.svelte';
	import SegmentedLinks from '#lib/components/ui/SegmentedLinks.svelte';
	import { buttonClass } from '#lib/components/ui/button-styles';
	import { cn } from '#lib/utils/cn';
	import { GOAL_CATEGORY_ICONS } from '#lib/utils/labels';
	import { formatFullDate } from '#lib/utils/dates';
	import { contributionPlan, goalPace, GOAL_PACE_LABELS } from '#lib/utils/finance';
	import { formatMoney, formatPercent } from '#lib/utils/money';
	import type { Goal } from '#lib/types/domain';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const now = new Date();

	const activeGoals = $derived(data.goals.filter((goal) => goal.status === 'active'));

	const overallPercent = $derived(
		data.totalTarget > 0 ? (data.totalSaved / data.totalTarget) * 100 : 0
	);

	const filtered = $derived(data.goals.filter((goal) => goal.status === data.filter));

	function planFor(goal: Goal): ReturnType<typeof contributionPlan> {
		return contributionPlan({
			target: goal.targetAmount,
			saved: goal.savedAmount,
			targetDate: goal.targetDate,
			reference: now
		});
	}

	const attention = $derived(
		activeGoals.filter((goal) => {
			const pace = goalPace(goal, now);
			return pace === 'behind' || pace === 'overdue';
		})
	);

	const adjustTarget = $derived(attention[0] ?? activeGoals[0] ?? null);

	const completedGoals = $derived(data.goals.filter((goal) => goal.status === 'completed'));
	const completedTotal = $derived(
		completedGoals.reduce((total, goal) => total + goal.savedAmount, 0)
	);
	const recentCompleted = $derived(completedGoals.slice(0, 4));

	function paceTone(goal: Goal): string {
		const pace = goalPace(goal, now);
		if (pace === 'behind' || pace === 'overdue') return 'bg-tertiary/10 text-tertiary';
		if (pace === 'paused') return 'bg-level-1 text-muted';
		return 'bg-primary/10 text-primary';
	}

	function paceIcon(goal: Goal): string {
		const pace = goalPace(goal, now);
		if (pace === 'completed') return 'task_alt';
		if (pace === 'behind') return 'schedule';
		if (pace === 'overdue') return 'error';
		if (pace === 'paused') return 'pause_circle';
		if (pace === 'ahead') return 'trending_up';
		return 'check_circle';
	}
</script>

<div class="space-y-4 px-4 pt-4 lg:mx-auto lg:max-w-[1440px] lg:space-y-6 lg:px-8 lg:pt-8 lg:pb-10">
	<header
		class="hidden gap-6 rounded-3xl border border-hairline/70 bg-surface-container-lowest p-6 shadow-card lg:grid lg:grid-cols-1 lg:items-center xl:grid-cols-12"
	>
		<div class="xl:col-span-6">
			<p
				class="flex items-center gap-2 text-label-sm font-semibold tracking-[0.16em] text-primary uppercase"
			>
				<span class="size-1.5 rounded-full bg-primary-container" aria-hidden="true"></span>
				Planificación estratégica
			</p>
			<h1 class="mt-2 text-title-xl leading-tight tracking-tight text-ink">
				Planes futuros y wishlist inteligente
			</h1>
			<p class="mt-2 max-w-xl text-body text-on-surface-variant">
				Visualiza, simula y materializa compras de alto impacto sin comprometer tu liquidez
				operativa ni contraer pasivos innecesarios.
			</p>
			<a href="/planes/nuevo" class={buttonClass('primary', 'md', false, 'mt-4')}>
				<Icon name="add" size={18} />
				Planificar nuevo gasto
			</a>
		</div>

		<div class="rounded-2xl bg-level-1/70 p-4 xl:col-span-3">
			<p class="text-label-sm text-muted">Progreso global</p>
			<p class="mt-1 tnum text-title-md font-bold text-ink">
				{formatPercent(overallPercent, 0)}
			</p>
			<p class="text-body-sm text-muted">
				{formatMoney(data.totalSaved)} / {formatMoney(data.totalTarget)}
			</p>
			<div
				class="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-container-high"
				aria-hidden="true"
			>
				<div
					class="h-full rounded-full bg-primary"
					style="width:{Math.min(100, overallPercent)}%"
				></div>
			</div>
		</div>

		<div class="rounded-2xl bg-secondary/8 p-4 xl:col-span-3">
			<p class="text-label-sm text-muted">Cadencia de ahorro</p>
			<p class="mt-1 flex items-center gap-1.5 tnum text-title-md font-bold text-secondary">
				<Icon name="trending_up" size={19} />
				+{formatMoney(data.monthlySaving)}/mes
			</p>
			<p class="text-body-sm text-muted">
				{activeGoals.length}
				{activeGoals.length === 1 ? 'objetivo activo' : 'objetivos activos'}
			</p>
		</div>
	</header>

	<section class="rounded-3xl bg-inverse-surface p-5 text-inverse-on-surface shadow-hero lg:hidden">
		<header class="flex items-center justify-between gap-2">
			<span class="flex items-center gap-1.5 text-label-sm font-semibold tracking-wide uppercase">
				<span class="size-1.5 rounded-full bg-primary-container" aria-hidden="true"></span>
				Planes y metas futuras
			</span>
			<span class="rounded-full bg-white/10 px-2.5 py-1 text-label-sm font-semibold">
				{formatPercent(overallPercent, 0)} completado
			</span>
		</header>

		<p class="mt-4 flex flex-wrap items-baseline gap-1.5">
			<span class="tnum text-[2rem] leading-none font-bold">
				{formatMoney(data.totalSaved)}
			</span>
			<span class="text-body-sm text-inverse-on-surface/60">
				/ {formatMoney(data.totalTarget)} meta
			</span>
		</p>

		<p class="mt-1.5 text-body-sm text-inverse-on-surface/70">
			Ahorro total reservado para tus proyectos
		</p>

		<div class="mt-4 h-2 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
			<div
				class="h-full rounded-full bg-primary-container"
				style="width:{Math.min(100, overallPercent)}%"
			></div>
		</div>

		<div class="mt-3 flex items-center justify-between gap-2 text-label-sm">
			<span class="text-inverse-on-surface/70">
				{activeGoals.length}
				{activeGoals.length === 1 ? 'objetivo activo' : 'objetivos activos'}
			</span>
			<span class="flex items-center gap-1 font-semibold text-primary-container">
				<Icon name="trending_up" size={16} />
				+{formatMoney(data.monthlySaving)}/mes
			</span>
		</div>
	</section>

	<a href="/planes/nuevo" class={buttonClass('primary', 'lg', true, 'lg:hidden')}>
		<span class="flex size-6 items-center justify-center rounded-full border-2 border-white/70">
			<Icon name="add" size={16} />
		</span>
		Planificar nuevo gasto
	</a>

	<SegmentedLinks
		value={data.filter}
		size="sm"
		options={[
			{ value: 'active', label: `Activos (${data.counts.active})`, href: '/planes?estado=activos' },
			{
				value: 'completed',
				label: `Completados (${data.counts.completed})`,
				href: '/planes?estado=completados'
			},
			{ value: 'paused', label: `En pausa (${data.counts.paused})`, href: '/planes?estado=pausa' }
		]}
		class="lg:max-w-xl"
	/>

	<div class="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 xl:grid-cols-3">
		{#each filtered as goal (goal.id)}
			{@const plan = planFor(goal)}
			{@const pace = goalPace(goal, now)}
			<a
				href={`/planes/${goal.id}`}
				class="group pressable block rounded-2xl border border-hairline/70 bg-surface-container-lowest p-3.5 shadow-card hover:border-outline-variant lg:flex lg:flex-col lg:p-5"
			>
				<div class="flex gap-3 lg:w-full lg:flex-col">
					{#if data.images[goal.id]}
						<img
							src={data.images[goal.id]}
							alt=""
							class="size-24 shrink-0 rounded-2xl object-cover lg:h-36 lg:w-full lg:rounded-xl"
							loading="lazy"
						/>
					{:else}
						<span
							class="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-secondary lg:h-36 lg:w-full lg:rounded-xl"
							aria-hidden="true"
						>
							<Icon name={GOAL_CATEGORY_ICONS[goal.category]} size={32} />
						</span>
					{/if}

					<div class="min-w-0 flex-1 lg:w-full">
						<div class="flex items-start justify-between gap-2">
							<p class="line-clamp-2 text-title-sm leading-snug font-bold text-ink">
								{goal.name}
							</p>
							<span
								class={cn(
									'shrink-0 rounded-full px-2 py-0.5 text-label-sm font-bold',
									goal.status === 'completed'
										? 'bg-primary/10 text-primary'
										: 'bg-secondary/10 text-secondary'
								)}
							>
								{formatPercent(goal.progressPercent, 0)}
							</span>
						</div>

						<p class="mt-0.5 truncate text-body-sm text-muted">
							{goal.targetDate
								? `Prevista: ${formatFullDate(goal.targetDate)}`
								: 'Sin fecha límite'}
						</p>

						<p class="text-label-lg mt-2 tnum font-bold text-secondary">
							{formatMoney(goal.savedAmount)}
							<span class="text-body-sm font-medium text-muted">
								de {formatMoney(goal.targetAmount)}
							</span>
						</p>
					</div>
				</div>

				<div class="mt-2.5">
					<ProgressBar
						value={goal.progressPercent}
						size="md"
						tone={goal.status === 'completed' ? 'primary' : 'secondary'}
					/>
				</div>

				<div class="mt-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
					<span
						class="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-sm font-medium {paceTone(
							goal
						)}"
					>
						<Icon name={paceIcon(goal)} size={14} />
						{GOAL_PACE_LABELS[pace]}
					</span>

					<span class="text-label-sm font-medium text-on-surface-variant">
						Faltan {formatMoney(plan.remaining)}
						{#if goal.targetDate}
							· {plan.months} {plan.months === 1 ? 'mes' : 'meses'}
						{/if}
					</span>
				</div>

				{#if pace === 'behind' && plan.monthlyAmount > 0}
					<p
						class="mt-2 rounded-xl bg-level-1/70 px-2.5 py-1.5 text-label-sm text-on-surface-variant"
					>
						Cuota sugerida:
						<span class="tnum font-semibold text-ink">{formatMoney(plan.monthlyAmount)} / mes</span>
					</p>
				{/if}

				<span
					class="mt-3 hidden h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-label font-semibold text-on-primary transition group-hover:bg-primary/90 lg:flex"
				>
					<Icon name="savings" size={17} />
					Aportar capital
				</span>
			</a>
		{:else}
			<div class="rounded-2xl border border-dashed border-outline-variant px-4 py-8 text-center">
				<p class="text-body text-on-surface-variant">
					{data.filter === 'active'
						? 'No tienes planes activos.'
						: data.filter === 'completed'
							? 'Todavía no completas ningún plan.'
							: 'No tienes planes en pausa.'}
				</p>
				{#if data.filter === 'active'}
					<a href="/planes/nuevo" class="mt-3 inline-flex text-label font-semibold text-secondary">
						Crea tu primer plan
					</a>
				{/if}
			</div>
		{/each}
	</div>

	<div class="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
		<section class="rounded-2xl bg-secondary/8 p-4 lg:p-5">
			<div class="flex items-start gap-3">
				<span
					class="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary"
				>
					<Icon name="auto_awesome" size={20} />
				</span>
				<div class="min-w-0">
					<p class="text-title-sm font-bold text-ink">Simulador de impacto</p>
					<p class="text-label-sm font-semibold text-secondary">
						{attention.length === 0
							? 'Proyección financiera saludable'
							: 'Revisa el ritmo de tus planes'}
					</p>
				</div>
			</div>

			<p class="mt-3 text-body text-on-surface-variant">
				{#if activeGoals.length === 0}
					Crea tu primer plan para ver una proyección de tu ahorro.
				{:else if attention.length === 0}
					Al ritmo actual de ahorro ({formatMoney(data.monthlySaving)}/mes), cumplirás tus
					{activeGoals.length}
					{activeGoals.length === 1 ? 'meta' : 'metas'} en los plazos fijados sin generar deuda.
				{:else}
					Con {formatMoney(data.monthlySaving)}/mes, {attention.length} de tus
					{activeGoals.length}
					{activeGoals.length === 1 ? 'meta necesita' : 'metas necesitan'} un ajuste para llegar a tiempo.
				{/if}
			</p>

			<div class="mt-3 flex items-center justify-between gap-2 border-t border-secondary/15 pt-3">
				<span class="flex items-center gap-1.5 text-label-sm text-on-surface-variant">
					<Icon name="eco" size={16} class="text-primary" />
					0% endeudamiento estimado
				</span>
				{#if adjustTarget}
					<a href={`/planes/${adjustTarget.id}`} class="text-label-sm font-semibold text-secondary">
						Ajustar ritmo ›
					</a>
				{/if}
			</div>
		</section>

		<section
			class="hidden rounded-2xl border border-hairline/70 bg-surface-container-lowest p-5 shadow-card lg:flex lg:flex-col"
			aria-label="Hitos alcanzados"
		>
			<header class="flex items-start justify-between gap-3">
				<div class="flex items-center gap-3">
					<span
						class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
					>
						<Icon name="emoji_events" size={20} />
					</span>
					<div>
						<h2 class="text-title-sm text-ink">Hitos alcanzados</h2>
						<p class="text-body-sm text-muted">Metas completadas sin endeudamiento.</p>
					</div>
				</div>
				<span
					class="rounded-full bg-primary/10 px-2.5 py-1 text-label-sm font-semibold text-primary"
				>
					{formatMoney(completedTotal)}
				</span>
			</header>

			<div class="mt-4 flex-1 space-y-2">
				{#each recentCompleted as completed (completed.id)}
					<a
						href={`/planes/${completed.id}`}
						class="flex items-center gap-3 rounded-xl bg-level-1/60 p-2.5 transition hover:bg-level-1"
					>
						{#if data.images[completed.id]}
							<img
								src={data.images[completed.id]}
								alt=""
								class="size-11 shrink-0 rounded-lg object-cover"
								loading="lazy"
							/>
						{:else}
							<span
								class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
							>
								<Icon name={GOAL_CATEGORY_ICONS[completed.category]} size={20} />
							</span>
						{/if}
						<div class="min-w-0 flex-1">
							<p class="truncate text-label font-semibold text-ink">{completed.name}</p>
							<p class="text-body-sm text-muted">
								{completed.completedAt
									? `Completado el ${formatFullDate(completed.completedAt)}`
									: 'Completado'}
								· {formatMoney(completed.savedAmount)}
							</p>
						</div>
						<span
							class="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-label-sm font-semibold text-primary"
						>
							<Icon name="check_circle" size={13} />
							Liquidado
						</span>
					</a>
				{:else}
					<p class="rounded-xl bg-level-1/60 p-3 text-body-sm text-muted">
						Todavía no completas ningún plan. Cuando lo hagas, aparecerá aquí como hito.
					</p>
				{/each}
			</div>

			<a
				href="/planes?estado=completados"
				class="mt-3 flex items-center justify-center gap-1.5 text-label-sm font-semibold text-primary hover:underline"
			>
				Ver todos los completados
				<Icon name="arrow_forward" size={15} />
			</a>
		</section>
	</div>
</div>
