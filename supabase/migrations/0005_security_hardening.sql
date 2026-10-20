-- ============================================================================
-- 0005 · Endurecimiento de RPCs, permisos y superficies de datos
--
--   * `get_analytics` valida el rango de fechas (máximo 366 días) para evitar
--     un DoS no autenticado mediante `generate_series`.
--   * Las RPCs de la app dejan de ser ejecutables por `anon`/`PUBLIC`.
--   * `anon` pierde privilegios sobre tablas, vistas y secuencias de `public`.
--     RLS ya impedía leer filas, pero el principio de mínimo privilegio exige
--     retirar también los GRANT por defecto.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Validador de rango de analítica
-- ----------------------------------------------------------------------------
create or replace function public.assert_analytics_range(
	p_from date,
	p_to date,
	p_prev_from date,
	p_prev_to date
)
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
	if p_from is null or p_to is null or p_prev_from is null or p_prev_to is null then
		raise exception 'Rango de fechas requerido' using errcode = '22023';
	end if;

	if p_from > p_to or p_prev_from > p_prev_to then
		raise exception 'Rango de fechas inválido' using errcode = '22023';
	end if;

	if (p_to - p_from) > 366 or (p_prev_to - p_prev_from) > 366 then
		raise exception 'El rango de analítica no puede superar 366 días' using errcode = '22023';
	end if;

	return true;
end;
$$;

revoke all on function public.assert_analytics_range(date, date, date, date) from public, anon;
grant execute on function public.assert_analytics_range(date, date, date, date) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Analítica del periodo (ahora con guarda de rango)
-- ----------------------------------------------------------------------------
create or replace function public.get_analytics(
	p_from date,
	p_to date,
	p_prev_from date,
	p_prev_to date
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
		and t.occurred_at >= p_from::timestamptz
		and t.occurred_at < (p_to + 1)::timestamptz
),
previous_expenses as (
	select t.id, t.amount, t.category_id, t.occurred_at
	from public.transactions t
	where t.type = 'expense'
		and t.occurred_at >= p_prev_from::timestamptz
		and t.occurred_at < (p_prev_to + 1)::timestamptz
),
current_income as (
	select coalesce(sum(t.amount), 0) as total
	from public.transactions t
	where t.type = 'income'
		and t.occurred_at >= p_from::timestamptz
		and t.occurred_at < (p_to + 1)::timestamptz
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
			select sum(ce.amount) from current_expenses ce where ce.occurred_at::date = d.day::date
		), 0) as current_amount,
		coalesce((
			select sum(pe.amount) from previous_expenses pe
			where pe.occurred_at::date = (d.day::date + (p_prev_from - p_from))::date
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
where validated.ok;
$$;

revoke all on function public.get_analytics(date, date, date, date) from public, anon;
grant execute on function public.get_analytics(date, date, date, date) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. RPCs de escritura: solo usuarios autenticados
-- ----------------------------------------------------------------------------
revoke all on function public.register_transfer(uuid, uuid, numeric, text, timestamptz) from public, anon;
grant execute on function public.register_transfer(uuid, uuid, numeric, text, timestamptz) to authenticated;

revoke all on function public.pay_installment(uuid, numeric, uuid, timestamptz) from public, anon;
grant execute on function public.pay_installment(uuid, numeric, uuid, timestamptz) to authenticated;

revoke all on function public.sync_debt_status() from public, anon;
grant execute on function public.sync_debt_status() to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Mínimo privilegio para `anon`
-- ----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Explícito para las vistas (por si el GRANT por defecto se reaplica).
revoke all on public.account_balances from anon;
revoke all on public.transactions_detailed from anon;
revoke all on public.goal_progress from anon;
revoke all on public.debt_progress from anon;

grant select on public.category_templates to authenticated;
grant select on public.account_balances to authenticated;
grant select on public.transactions_detailed to authenticated;
grant select on public.goal_progress to authenticated;
grant select on public.debt_progress to authenticated;
