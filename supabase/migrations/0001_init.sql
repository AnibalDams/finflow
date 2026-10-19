-- ============================================================================
-- FinFlow · Esquema inicial
-- Aplicación móvil de finanzas personales
--
-- Convenciones:
--   * Todo el dinero se almacena como numeric(14,2). Nunca floats.
--   * Toda tabla de dominio lleva user_id y RLS por auth.uid().
--   * Los saldos y progresos NO se duplican en columnas: se derivan en vistas
--     con security_invoker = on para evitar desincronización.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tipos
-- ----------------------------------------------------------------------------
create type public.account_kind as enum ('checking', 'savings', 'pocket', 'cash', 'credit');
create type public.transaction_type as enum ('income', 'expense', 'transfer');
create type public.category_kind as enum ('expense', 'income');
create type public.goal_status as enum ('active', 'completed', 'paused');
create type public.debt_kind as enum ('credit_card', 'personal', 'family', 'mortgage', 'other');
create type public.interest_kind as enum ('msi', 'fixed', 'variable');

-- ----------------------------------------------------------------------------
-- 2. Utilidades
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
	new.updated_at := now();
	return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. Perfiles
-- ----------------------------------------------------------------------------
create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	full_name text not null default '' check (char_length(full_name) <= 80),
	avatar_url text,
	currency text not null default 'USD' check (char_length(currency) = 3),
	monthly_budget numeric(14, 2) not null default 0 check (monthly_budget >= 0),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
	before update on public.profiles
	for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Plantillas de categorías (catálogo base copiado a cada usuario nuevo)
-- ----------------------------------------------------------------------------
create table public.category_templates (
	id serial primary key,
	kind public.category_kind not null,
	name text not null,
	icon text not null,
	color text not null,
	sort_order int not null default 0,
	unique (kind, name)
);

insert into public.category_templates (kind, name, icon, color, sort_order) values
	('expense', 'Alimentos', 'restaurant', '#10b981', 10),
	('expense', 'Transporte', 'directions_subway', '#4648d4', 20),
	('expense', 'Ocio', 'sports_esports', '#6063ee', 30),
	('expense', 'Vivienda', 'home', '#bc0b3b', 40),
	('expense', 'Salud', 'medical_services', '#ff7886', 50),
	('expense', 'Compras', 'shopping_bag', '#6c7a71', 60),
	('expense', 'Servicios', 'bolt', '#eab308', 70),
	('expense', 'Educación', 'school', '#0ea5e9', 80),
	('expense', 'Otro', 'category', '#64748b', 90),
	('income', 'Nómina', 'work', '#006c49', 10),
	('income', 'Freelance', 'palette', '#4edea3', 20),
	('income', 'Extra', 'add_circle', '#10b981', 30),
	('income', 'Otro ingreso', 'payments', '#64748b', 40);

-- ----------------------------------------------------------------------------
-- 5. Cuentas y bolsillos
-- ----------------------------------------------------------------------------
create table public.accounts (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	name text not null check (char_length(trim(name)) between 1 and 60),
	kind public.account_kind not null default 'checking',
	currency text not null default 'USD' check (char_length(currency) = 3),
	opening_balance numeric(14, 2) not null default 0,
	icon text not null default 'account_balance',
	color text,
	is_primary boolean not null default false,
	is_archived boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index accounts_user_idx on public.accounts (user_id) where not is_archived;

create unique index accounts_single_primary_idx
	on public.accounts (user_id)
	where is_primary and not is_archived;

create trigger accounts_set_updated_at
	before update on public.accounts
	for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. Categorías del usuario
-- ----------------------------------------------------------------------------
create table public.categories (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	name text not null check (char_length(trim(name)) between 1 and 40),
	kind public.category_kind not null,
	icon text not null default 'category',
	color text not null default '#64748b',
	sort_order int not null default 0,
	is_archived boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (user_id, kind, name)
);

create index categories_user_idx on public.categories (user_id, kind) where not is_archived;

create trigger categories_set_updated_at
	before update on public.categories
	for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. Movimientos
-- ----------------------------------------------------------------------------
create table public.transactions (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	type public.transaction_type not null,
	amount numeric(14, 2) not null check (amount > 0),
	currency text not null default 'USD' check (char_length(currency) = 3),
	account_id uuid not null references public.accounts (id) on delete restrict,
	counter_account_id uuid references public.accounts (id) on delete restrict,
	category_id uuid references public.categories (id) on delete set null,
	concept text not null default '' check (char_length(concept) <= 140),
	notes text check (char_length(notes) <= 500),
	occurred_at timestamptz not null default now(),
	attachment_path text,
	attachment_name text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint transactions_transfer_counter check (
		(type = 'transfer') = (counter_account_id is not null)
	),
	constraint transactions_transfer_distinct check (
		counter_account_id is null or counter_account_id <> account_id
	)
);

create index transactions_user_date_idx on public.transactions (user_id, occurred_at desc);
create index transactions_account_idx on public.transactions (account_id);
create index transactions_counter_account_idx on public.transactions (counter_account_id);
create index transactions_category_idx on public.transactions (category_id);

create trigger transactions_set_updated_at
	before update on public.transactions
	for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. Etiquetas
-- ----------------------------------------------------------------------------
create table public.tags (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	name text not null check (char_length(trim(name)) between 1 and 30),
	color text not null default '#4648d4',
	created_at timestamptz not null default now(),
	unique (user_id, name)
);

create table public.transaction_tags (
	transaction_id uuid not null references public.transactions (id) on delete cascade,
	tag_id uuid not null references public.tags (id) on delete cascade,
	user_id uuid not null references auth.users (id) on delete cascade,
	primary key (transaction_id, tag_id)
);

create index transaction_tags_tag_idx on public.transaction_tags (tag_id);

-- ----------------------------------------------------------------------------
-- 9. Presupuestos por categoría (el límite global vive en profiles.monthly_budget)
-- ----------------------------------------------------------------------------
create table public.budgets (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	category_id uuid not null references public.categories (id) on delete cascade,
	period_month date not null check (date_trunc('month', period_month) = period_month),
	amount numeric(14, 2) not null check (amount >= 0),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (user_id, category_id, period_month)
);

create index budgets_period_idx on public.budgets (user_id, period_month);

create trigger budgets_set_updated_at
	before update on public.budgets
	for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 10. Planes y metas
-- ----------------------------------------------------------------------------
create table public.goals (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	name text not null check (char_length(trim(name)) between 1 and 80),
	description text check (char_length(description) <= 300),
	target_amount numeric(14, 2) not null check (target_amount > 0),
	initial_amount numeric(14, 2) not null default 0 check (initial_amount >= 0),
	target_date date,
	category text not null default 'other' check (category in ('technology', 'travel', 'home', 'education', 'other')),
	image_path text,
	status public.goal_status not null default 'active',
	account_id uuid references public.accounts (id) on delete set null,
	monthly_contribution numeric(14, 2) check (monthly_contribution >= 0),
	reminder_enabled boolean not null default true,
	reminder_day int not null default 1 check (reminder_day between 1 and 28),
	completed_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index goals_user_status_idx on public.goals (user_id, status);

create trigger goals_set_updated_at
	before update on public.goals
	for each row execute function public.set_updated_at();

create table public.goal_contributions (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	goal_id uuid not null references public.goals (id) on delete cascade,
	amount numeric(14, 2) not null check (amount > 0),
	occurred_at timestamptz not null default now(),
	note text check (char_length(note) <= 200),
	transaction_id uuid references public.transactions (id) on delete set null,
	created_at timestamptz not null default now()
);

create index goal_contributions_goal_idx on public.goal_contributions (goal_id, occurred_at desc);

-- ----------------------------------------------------------------------------
-- 11. Deudas
-- ----------------------------------------------------------------------------
create table public.debts (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	name text not null check (char_length(trim(name)) between 1 and 80),
	creditor text check (char_length(creditor) <= 80),
	kind public.debt_kind not null default 'other',
	principal_amount numeric(14, 2) not null check (principal_amount > 0),
	total_installments int not null default 1 check (total_installments between 1 and 600),
	monthly_payment numeric(14, 2) not null check (monthly_payment >= 0),
	interest_kind public.interest_kind not null default 'msi',
	interest_rate numeric(6, 3) not null default 0 check (interest_rate >= 0),
	due_day int not null default 1 check (due_day between 1 and 31),
	first_due_date date not null,
	alert_days_before int not null default 5 check (alert_days_before between 0 and 30),
	account_id uuid references public.accounts (id) on delete set null,
	is_active boolean not null default true,
	notes text check (char_length(notes) <= 300),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index debts_user_idx on public.debts (user_id) where is_active;

create trigger debts_set_updated_at
	before update on public.debts
	for each row execute function public.set_updated_at();

create table public.debt_payments (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	debt_id uuid not null references public.debts (id) on delete cascade,
	amount numeric(14, 2) not null check (amount > 0),
	occurred_at timestamptz not null default now(),
	installment_number int check (installment_number > 0),
	is_extra boolean not null default false,
	transaction_id uuid references public.transactions (id) on delete set null,
	note text check (char_length(note) <= 200),
	created_at timestamptz not null default now()
);

create index debt_payments_debt_idx on public.debt_payments (debt_id, occurred_at desc);

-- ----------------------------------------------------------------------------
-- 12. RLS
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.category_templates enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.tags enable row level security;
alter table public.transaction_tags enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;

-- profiles: la clave primaria es el propio id de usuario
create policy profiles_select on public.profiles for select to authenticated
	using ((select auth.uid()) = id);
create policy profiles_insert on public.profiles for insert to authenticated
	with check ((select auth.uid()) = id);
create policy profiles_update on public.profiles for update to authenticated
	using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- category_templates: catálogo de solo lectura para usuarios autenticados
create policy category_templates_select on public.category_templates for select to authenticated
	using (true);

-- Política uniforme para las tablas de dominio con columna user_id
do $$
declare
	tbl text;
begin
	foreach tbl in array array[
		'accounts', 'categories', 'transactions', 'tags', 'transaction_tags',
		'budgets', 'goals', 'goal_contributions', 'debts', 'debt_payments'
	]
	loop
		execute format(
			'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
			tbl || '_select', tbl
		);
		execute format(
			'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
			tbl || '_insert', tbl
		);
		execute format(
			'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
			tbl || '_update', tbl
		);
		execute format(
			'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
			tbl || '_delete', tbl
		);
	end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- 13. Vistas derivadas (saldos y progresos calculados, nunca almacenados)
-- ----------------------------------------------------------------------------
create view public.account_balances
with (security_invoker = on)
as
select
	a.id,
	a.user_id,
	a.name,
	a.kind,
	a.currency,
	a.icon,
	a.color,
	a.is_primary,
	a.is_archived,
	a.opening_balance,
	a.opening_balance + coalesce(
		sum(
			case
				when t.type = 'income' then t.amount
				when t.type = 'expense' then -t.amount
				when t.type = 'transfer' then -t.amount
				else 0
			end
		) filter (where t.account_id = a.id),
		0
	) + coalesce(
		sum(t.amount) filter (where t.type = 'transfer' and t.counter_account_id = a.id),
		0
	) as balance,
	a.created_at,
	a.updated_at
from public.accounts a
left join public.transactions t
	on t.account_id = a.id or t.counter_account_id = a.id
group by a.id;

create view public.transactions_detailed
with (security_invoker = on)
as
select
	t.id,
	t.user_id,
	t.type,
	t.amount,
	t.currency,
	t.concept,
	t.notes,
	t.occurred_at,
	t.attachment_path,
	t.attachment_name,
	t.account_id,
	t.counter_account_id,
	t.category_id,
	t.created_at,
	t.updated_at,
	acc.name as account_name,
	acc.icon as account_icon,
	acc.kind as account_kind,
	cacc.name as counter_account_name,
	c.name as category_name,
	c.icon as category_icon,
	c.color as category_color,
	c.kind as category_kind,
	coalesce(
		(
			select array_agg(tg.name order by tg.name)
			from public.transaction_tags tt
			join public.tags tg on tg.id = tt.tag_id
			where tt.transaction_id = t.id
		),
		'{}'::text[]
	) as tag_names
from public.transactions t
join public.accounts acc on acc.id = t.account_id
left join public.accounts cacc on cacc.id = t.counter_account_id
left join public.categories c on c.id = t.category_id;

create view public.goal_progress
with (security_invoker = on)
as
select
	g.id,
	g.user_id,
	g.name,
	g.description,
	g.target_amount,
	g.initial_amount,
	g.target_date,
	g.category,
	g.image_path,
	g.status,
	g.account_id,
	g.monthly_contribution,
	g.reminder_enabled,
	g.reminder_day,
	g.completed_at,
	g.created_at,
	g.updated_at,
	g.initial_amount + coalesce(sum(gc.amount), 0) as saved_amount,
	least(
		round(
			(g.initial_amount + coalesce(sum(gc.amount), 0)) / g.target_amount * 100,
			1
		),
		100
	) as progress_percent,
	greatest(g.target_amount - (g.initial_amount + coalesce(sum(gc.amount), 0)), 0) as remaining_amount,
	coalesce(max(gc.occurred_at), g.created_at) as last_contribution_at
from public.goals g
left join public.goal_contributions gc on gc.goal_id = g.id
group by g.id;

create view public.debt_progress
with (security_invoker = on)
as
select
	d.id,
	d.user_id,
	d.name,
	d.creditor,
	d.kind,
	d.principal_amount,
	d.total_installments,
	d.monthly_payment,
	d.interest_kind,
	d.interest_rate,
	d.due_day,
	d.first_due_date,
	d.alert_days_before,
	d.account_id,
	d.is_active,
	d.notes,
	d.created_at,
	d.updated_at,
	coalesce(sum(p.amount), 0) as paid_amount,
	greatest(d.principal_amount - coalesce(sum(p.amount), 0), 0) as remaining_amount,
	count(p.id) filter (where not p.is_extra) as installments_paid,
	least(round(coalesce(sum(p.amount), 0) / d.principal_amount * 100, 1), 100) as progress_percent,
	greatest(d.total_installments - count(p.id) filter (where not p.is_extra), 0) as installments_left,
	case
		when count(p.id) filter (where not p.is_extra) > 0
			then (d.first_due_date + (count(p.id) filter (where not p.is_extra) || ' month')::interval)::date
		else d.first_due_date
	end as next_due_date,
	coalesce(max(p.occurred_at), d.created_at) as last_payment_at
from public.debts d
left join public.debt_payments p on p.debt_id = d.id
group by d.id;

-- ----------------------------------------------------------------------------
-- 14. Altas de usuario: perfil + categorías + cuenta inicial
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
	new_account_id uuid;
	profile_currency text;
begin
	profile_currency := coalesce(nullif(trim(new.raw_user_meta_data ->> 'currency'), ''), 'USD');

	insert into public.profiles (id, full_name, currency)
	values (
		new.id,
		coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''),
		upper(left(profile_currency, 3))
	)
	on conflict (id) do nothing;

	insert into public.categories (user_id, name, kind, icon, color, sort_order)
	select new.id, ct.name, ct.kind, ct.icon, ct.color, ct.sort_order
	from public.category_templates ct
	on conflict (user_id, kind, name) do nothing;

	insert into public.accounts (user_id, name, kind, currency, icon, is_primary)
	values (new.id, 'Cuenta Principal', 'checking', upper(left(profile_currency, 3)), 'account_balance', true)
	returning id into new_account_id;

	return new;
end;
$$;

create trigger on_auth_user_created
	after insert on auth.users
	for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 15. Funciones transaccionales (atómicas) y de analítica
-- ----------------------------------------------------------------------------

-- Transferencia entre cuentas del mismo usuario.
create or replace function public.register_transfer(
	p_from_account uuid,
	p_to_account uuid,
	p_amount numeric,
	p_concept text default 'Transferencia',
	p_occurred_at timestamptz default now()
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
	v_user uuid := (select auth.uid());
	v_id uuid;
begin
	if v_user is null then
		raise exception 'No autenticado' using errcode = '28000';
	end if;

	if p_amount is null or p_amount <= 0 then
		raise exception 'El monto debe ser mayor a cero' using errcode = '22023';
	end if;

	if p_from_account = p_to_account then
		raise exception 'Las cuentas de origen y destino deben ser distintas' using errcode = '22023';
	end if;

	if not exists (
		select 1 from public.accounts
		where id = p_from_account and user_id = v_user and not is_archived
	) then
		raise exception 'Cuenta de origen inválida' using errcode = '42501';
	end if;

	if not exists (
		select 1 from public.accounts
		where id = p_to_account and user_id = v_user and not is_archived
	) then
		raise exception 'Cuenta de destino inválida' using errcode = '42501';
	end if;

	insert into public.transactions (
		user_id, type, amount, currency, account_id, counter_account_id, concept, occurred_at
	)
	select
		v_user, 'transfer', p_amount, a.currency, p_from_account, p_to_account,
		coalesce(nullif(trim(p_concept), ''), 'Transferencia'), coalesce(p_occurred_at, now())
	from public.accounts a
	where a.id = p_from_account
	returning id into v_id;

	return v_id;
end;
$$;

-- Pago de cuota de una deuda: registra el pago y el gasto asociado de forma atómica.
create or replace function public.pay_installment(
	p_debt_id uuid,
	p_amount numeric default null,
	p_account_id uuid default null,
	p_occurred_at timestamptz default now()
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
	v_user uuid := (select auth.uid());
	v_debt public.debts;
	v_amount numeric(14, 2);
	v_account uuid;
	v_payment_id uuid;
	v_transaction_id uuid;
	v_installment int;
begin
	if v_user is null then
		raise exception 'No autenticado' using errcode = '28000';
	end if;

	select * into v_debt from public.debts where id = p_debt_id and user_id = v_user;
	if not found then
		raise exception 'Deuda no encontrada' using errcode = '42501';
	end if;

	select count(*) filter (where not is_extra) + 1
	into v_installment
	from public.debt_payments
	where debt_id = p_debt_id;

	v_amount := coalesce(p_amount, v_debt.monthly_payment);
	if v_amount is null or v_amount <= 0 then
		raise exception 'Monto de pago inválido' using errcode = '22023';
	end if;

	v_account := coalesce(p_account_id, v_debt.account_id);
	if v_account is null then
		select id into v_account
		from public.accounts
		where user_id = v_user and not is_archived
		order by is_primary desc, created_at
		limit 1;
	end if;

	if v_account is null or not exists (
		select 1 from public.accounts where id = v_account and user_id = v_user
	) then
		raise exception 'Cuenta de pago inválida' using errcode = '42501';
	end if;

	insert into public.transactions (
		user_id, type, amount, currency, account_id, concept, occurred_at
	)
	select
		v_user, 'expense', v_amount, a.currency, v_account,
		'Pago de cuota · ' || v_debt.name, coalesce(p_occurred_at, now())
	from public.accounts a
	where a.id = v_account
	returning id into v_transaction_id;

	insert into public.debt_payments (
		user_id, debt_id, amount, occurred_at, installment_number, transaction_id
	)
	values (
		v_user, p_debt_id, v_amount, coalesce(p_occurred_at, now()), v_installment, v_transaction_id
	)
	returning id into v_payment_id;

	if v_installment >= v_debt.total_installments then
		update public.debts set is_active = false where id = p_debt_id;
	end if;

	return v_payment_id;
end;
$$;

-- Analítica del periodo. Devuelve un único jsonb con series, distribución,
-- comparativa contra el periodo anterior e insights derivados de los datos.
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
with current_expenses as (
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
);
$$;

-- ----------------------------------------------------------------------------
-- 16. Tareas programadas: activar/desactivar deudas pagadas por completo
-- ----------------------------------------------------------------------------
create or replace function public.sync_debt_status()
returns void
language sql
security invoker
set search_path = ''
as $$
update public.debts d
set is_active = false
where d.is_active
	and (
		select count(*) filter (where not p.is_extra)
		from public.debt_payments p
		where p.debt_id = d.id
	) >= d.total_installments;
$$;

-- ----------------------------------------------------------------------------
-- 17. Permisos
-- ----------------------------------------------------------------------------
grant usage on schema public to authenticated;

grant select on public.category_templates to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.accounts to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, update, delete on public.transaction_tags to authenticated;
grant select, insert, update, delete on public.budgets to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.goal_contributions to authenticated;
grant select, insert, update, delete on public.debts to authenticated;
grant select, insert, update, delete on public.debt_payments to authenticated;

grant select on public.account_balances to authenticated;
grant select on public.transactions_detailed to authenticated;
grant select on public.goal_progress to authenticated;
grant select on public.debt_progress to authenticated;

grant execute on function public.register_transfer(uuid, uuid, numeric, text, timestamptz) to authenticated;
grant execute on function public.pay_installment(uuid, numeric, uuid, timestamptz) to authenticated;
grant execute on function public.get_analytics(date, date, date, date) to authenticated;
grant execute on function public.sync_debt_status() to authenticated;

revoke all on public.category_templates from anon;
