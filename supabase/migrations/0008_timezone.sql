-- ============================================================================
-- 0008 · Analítica con zona horaria
--
-- `p_offset_minutes` es el offset del navegador (minutos por detrás de UTC).
-- Los timestamps se desplazan a la hora local antes de compararlos y agruparlos,
-- de modo que el día/mes coincidan con lo que ve el usuario.
-- ============================================================================

drop function if exists public.get_analytics(date, date, date, date);

create or replace function public.get_analytics(
	p_from date,
	p_to date,
	p_prev_from date,
	p_prev_to date,
	p_offset_minutes int default 0
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with validated as (
	select public.assert_analytics_range(p_from, p_to, p_prev_from, p_prev_to) as ok
),
current_expenses as (
	select t.id, t.amount, t.category_id, t.occurred_at
	from public.transactions t
	where t.type = 'expense'
		and (t.occurred_at + make_interval(mins => coalesce(p_offset_minutes, 0)))::timestamp
			>= p_from::timestamp
		and (t.occurred_at + make_interval(mins => coalesce(p_offset_minutes, 0)))::timestamp
			< (p_to + 1)::timestamp
),
previous_expenses as (
	select t.id, t.amount, t.category_id, t.occurred_at
	from public.transactions t
	where t.type = 'expense'
		and (t.occurred_at + make_interval(mins => coalesce(p_offset_minutes, 0)))::timestamp
			>= p_prev_from::timestamp
		and (t.occurred_at + make_interval(mins => coalesce(p_offset_minutes, 0)))::timestamp
			< (p_prev_to + 1)::timestamp
),
current_income as (
	select coalesce(sum(t.amount), 0) as total
	from public.transactions t
	where t.type = 'income'
		and (t.occurred_at + make_interval(mins => coalesce(p_offset_minutes, 0)))::timestamp
			>= p_from::timestamp
		and (t.occurred_at + make_interval(mins => coalesce(p_offset_minutes, 0)))::timestamp
			< (p_to + 1)::timestamp
),
totals as (
	select
		coalesce((select sum(amount) from current_expenses), 0) as current_total,
		coalesce((select sum(amount) from previous_expenses), 0) as previous_total,
		(select total from current_income) as income_total
),
by_category as (
	select
		coalesce(c.id::text, 'none') as category_id,
		coalesce(c.name, 'Sin categoría') as name,
		coalesce(c.icon, 'category') as icon,
		coalesce(c.color, '#64748b') as color,
		coalesce(cur.total, 0) as current_amount,
		coalesce(prev.total, 0) as previous_amount
	from public.categories c
	left join (
		select category_id, sum(amount) as total from current_expenses group by category_id
	) cur on cur.category_id = c.id
	left join (
		select category_id, sum(amount) as total from previous_expenses group by category_id
	) prev on prev.category_id = c.id
	where c.kind = 'expense'
	union all
	select
		'none', 'Sin categoría', 'category', '#64748b',
		coalesce((select sum(amount) from current_expenses where category_id is null), 0),
		coalesce((select sum(amount) from previous_expenses where category_id is null), 0)
),
categories_with_share as (
	select
		*,
		case
			when (select current_total from totals) > 0
				then round(current_amount / (select current_total from totals) * 100, 1)
			else 0
		end as share,
		round(current_amount - previous_amount, 2) as delta
	from by_category
	where current_amount > 0 or previous_amount > 0
),
budget_rows as (
	select
		c.id::text as category_id,
		c.name,
		c.icon,
		c.color,
		b.amount as budget_amount,
		coalesce(cur.total, 0) as spent_amount
	from public.budgets b
	join public.categories c on c.id = b.category_id
	left join (
		select category_id, sum(amount) as total from current_expenses group by category_id
	) cur on cur.category_id = c.id
	where b.period_month = date_trunc('month', p_from)::date
),
series as (
	select
		d.day::date as day,
		coalesce((
			select sum(ce.amount) from current_expenses ce
			where (ce.occurred_at + make_interval(mins => coalesce(p_offset_minutes, 0)))::date
				= d.day::date
		), 0) as current_amount,
		coalesce((
			select sum(pe.amount) from previous_expenses pe
			where (pe.occurred_at + make_interval(mins => coalesce(p_offset_minutes, 0)))::date
				= (d.day::date + (p_prev_from - p_from))::date
		), 0) as previous_amount
	from generate_series(p_from, p_to, interval '1 day') as d(day)
)
select jsonb_build_object(
	'total', (select current_total from totals),
	'previousTotal', (select previous_total from totals),
	'incomeTotal', (select income_total from totals),
	'deltaPercent', case
		when (select previous_total from totals) > 0
			then round(
				((select current_total from totals) - (select previous_total from totals))
				/ (select previous_total from totals) * 100,
				1
			)
		else 0
	end,
	'categories', coalesce((
		select jsonb_agg(
			jsonb_build_object(
				'id', category_id,
				'name', name,
				'icon', icon,
				'color', color,
				'amount', current_amount,
				'previousAmount', previous_amount,
				'share', share,
				'delta', delta
			)
			order by current_amount desc
		)
		from categories_with_share
	), '[]'::jsonb),
	'budgets', coalesce((
		select jsonb_agg(
			jsonb_build_object(
				'id', category_id,
				'name', name,
				'icon', icon,
				'color', color,
				'budget', budget_amount,
				'spent', spent_amount,
				'share', case when budget_amount > 0 then round(spent_amount / budget_amount * 100, 1) else 0 end
			)
			order by budget_amount desc
		)
		from budget_rows
	), '[]'::jsonb),
	'series', coalesce((
		select jsonb_agg(
			jsonb_build_object(
				'date', day,
				'current', current_amount,
				'previous', previous_amount
			)
			order by day
		)
		from series
	), '[]'::jsonb),
	'topIncrease', (
		select jsonb_build_object('name', name, 'amount', delta, 'currentAmount', current_amount)
		from categories_with_share
		where delta > 0
		order by delta desc
		limit 1
	),
	'topDecrease', (
		select jsonb_build_object('name', name, 'amount', delta, 'currentAmount', current_amount)
		from categories_with_share
		where delta < 0
		order by delta asc
		limit 1
	),
	'topCategory', (
		select jsonb_build_object('name', name, 'amount', current_amount, 'share', share)
		from categories_with_share
		order by current_amount desc
		limit 1
	)
)
from validated
where validated.ok
	and coalesce(p_offset_minutes, 0) between -840 and 840;
$$;

revoke all on function public.get_analytics(date, date, date, date, int) from public, anon;
grant execute on function public.get_analytics(date, date, date, date, int) to authenticated;
