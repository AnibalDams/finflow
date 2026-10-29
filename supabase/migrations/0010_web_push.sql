-- ============================================================================
-- 0010 · Notificaciones push (Web Push + VAPID)
--
-- El envío corre en un cron horario: el endpoint del servidor llama a
-- `claim_due_notifications()`, que devuelve una sola vez por día y por usuario
-- los avisos que corresponden a su hora local. Toda la aritmética de fechas se
-- hace con `date` en SQL, nunca en JavaScript, para no arrastrar el desfase
-- entre UTC y la zona del usuario.
--
-- `tz_offset` son los minutos por detrás de UTC (Caracas = 240), igual que la
-- cookie `tz_offset` que ya usa la app.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Preferencias de notificación en el perfil
-- ----------------------------------------------------------------------------
alter table public.profiles
	add column if not exists push_enabled boolean not null default false,
	add column if not exists push_time time not null default '09:00',
	add column if not exists tz_offset int not null default 0;

alter table public.profiles drop constraint if exists profiles_tz_offset_range;
alter table public.profiles
	add constraint profiles_tz_offset_range check (tz_offset between -840 and 840);

-- ----------------------------------------------------------------------------
-- 2. Dispositivos suscritos
-- ----------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	-- Un endpoint identifica un dispositivo concreto: es único en toda la tabla.
	endpoint text not null unique check (char_length(endpoint) between 10 and 1200),
	p256dh text not null check (char_length(p256dh) between 20 and 300),
	auth text not null check (char_length(auth) between 8 and 100),
	user_agent text check (char_length(user_agent) <= 300),
	failure_count int not null default 0 check (failure_count >= 0),
	created_at timestamptz not null default now(),
	last_used_at timestamptz
);

create index if not exists push_subscriptions_user_idx
	on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select on public.push_subscriptions;
create policy push_subscriptions_select on public.push_subscriptions
	for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists push_subscriptions_insert on public.push_subscriptions;
create policy push_subscriptions_insert on public.push_subscriptions
	for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists push_subscriptions_update on public.push_subscriptions;
create policy push_subscriptions_update on public.push_subscriptions
	for update to authenticated
	using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists push_subscriptions_delete on public.push_subscriptions;
create policy push_subscriptions_delete on public.push_subscriptions
	for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Bitácora de envíos (dedupe diario)
-- ----------------------------------------------------------------------------
create table if not exists public.notification_log (
	id bigint generated always as identity primary key,
	user_id uuid not null references auth.users (id) on delete cascade,
	kind text not null check (kind in ('debt_due', 'debt_overdue', 'goal_reminder')),
	ref_id uuid not null,
	-- Fecha local del usuario al momento del envío.
	local_date date not null,
	sent_at timestamptz not null default now(),
	unique (user_id, kind, ref_id, local_date)
);

create index if not exists notification_log_sent_idx
	on public.notification_log (sent_at desc);

-- Solo el servidor (service_role) la consulta: no hay políticas para usuarios.
alter table public.notification_log enable row level security;
revoke all on public.notification_log from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Alta de suscripción
--
-- Un mismo dispositivo puede pasar de una cuenta a otra (o el navegador puede
-- renovar el endpoint). Se reasigna el endpoint al usuario autenticado en vez de
-- fallar por el índice único.
-- ----------------------------------------------------------------------------
create or replace function public.register_push_subscription(
	p_endpoint text,
	p_p256dh text,
	p_auth text,
	p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_user uuid := (select auth.uid());
begin
	if v_user is null then
		raise exception 'not_authenticated';
	end if;

	if p_endpoint is null or char_length(p_endpoint) < 10 then
		raise exception 'invalid_endpoint';
	end if;

	if p_p256dh is null or p_auth is null then
		raise exception 'invalid_keys';
	end if;

	delete from public.push_subscriptions where endpoint = p_endpoint;

	insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
	values (
		v_user,
		p_endpoint,
		p_p256dh,
		p_auth,
		nullif(left(coalesce(p_user_agent, ''), 300), '')
	);
end;
$$;

revoke all on function public.register_push_subscription(text, text, text, text)
	from public, anon, authenticated;
grant execute on function public.register_push_subscription(text, text, text, text)
	to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Avisos pendientes de enviar
--
-- Devuelve solo los avisos que aún no se enviaron hoy (fecha local) y reserva
-- la fila en `notification_log` en la misma sentencia. Ejecutarla dos veces el
-- mismo día no duplica envíos.
-- ----------------------------------------------------------------------------
create or replace function public.claim_due_notifications(p_now timestamptz default now())
returns table (
	user_id uuid,
	kind text,
	ref_id uuid,
	label text,
	amount numeric,
	currency text,
	due_date date,
	days_left int,
	target_url text
)
language sql
security definer
set search_path = ''
as $$
with eligible as (
	select
		p.id,
		p.currency,
		extract(hour from p.push_time) * 60 + extract(minute from p.push_time) as push_minutes,
		(p_now - make_interval(mins => p.tz_offset)) at time zone 'UTC' as local_ts
	from public.profiles p
	where p.push_enabled
),
window_users as (
	select
		e.id,
		e.currency,
		e.local_ts::date as local_date
	from eligible e
	where extract(hour from e.local_ts) * 60 + extract(minute from e.local_ts)
		between e.push_minutes and e.push_minutes + 59
),
candidates as (
	-- Cuotas por vencer dentro de la ventana de aviso de cada deuda.
	select
		w.id as user_id,
		'debt_due'::text as kind,
		d.id as ref_id,
		w.local_date,
		d.name::text as label,
		d.monthly_payment as amount,
		w.currency,
		v.next_due_date as due_date,
		(v.next_due_date - w.local_date) as days_left,
		'/deudas/' || d.id::text as target_url
	from window_users w
	join public.debts d on d.user_id = w.id
	join public.debt_progress v on v.id = d.id
	where d.is_active
		and v.remaining_amount > 0
		and (v.next_due_date - w.local_date) between 0 and d.alert_days_before

	union all

	-- Cuotas vencidas: todos los días hasta que se paguen, archiven o borren.
	select
		w.id,
		'debt_overdue',
		d.id,
		w.local_date,
		d.name::text,
		d.monthly_payment,
		w.currency,
		v.next_due_date,
		(v.next_due_date - w.local_date),
		'/deudas/' || d.id::text
	from window_users w
	join public.debts d on d.user_id = w.id
	join public.debt_progress v on v.id = d.id
	where d.is_active
		and v.remaining_amount > 0
		and (v.next_due_date - w.local_date) < 0

	union all

	-- Aportes de planes: desde 3 días antes del recordatorio y hasta el mismo día.
	select
		w.id,
		'goal_reminder',
		g.id,
		w.local_date,
		g.name::text,
		coalesce(g.monthly_contribution, 0),
		w.currency,
		r.reminder_date,
		(r.reminder_date - w.local_date),
		'/planes/' || g.id::text
	from window_users w
	join public.goals g on g.user_id = w.id
	cross join lateral (
		select case
			when date_trunc('month', w.local_date::timestamp)::date + (g.reminder_day - 1)
				>= w.local_date
				then date_trunc('month', w.local_date::timestamp)::date + (g.reminder_day - 1)
			else (date_trunc('month', w.local_date::timestamp) + interval '1 month')::date
				+ (g.reminder_day - 1)
		end as reminder_date
	) r
	where g.status = 'active'
		and g.reminder_enabled
		and (r.reminder_date - w.local_date) between 0 and 3
),
claimed as (
	insert into public.notification_log (user_id, kind, ref_id, local_date)
	select c.user_id, c.kind, c.ref_id, c.local_date from candidates c
	on conflict (user_id, kind, ref_id, local_date) do nothing
	returning
		notification_log.user_id,
		notification_log.kind,
		notification_log.ref_id,
		notification_log.local_date
)
select
	c.user_id,
	c.kind,
	c.ref_id,
	c.label,
	c.amount,
	c.currency,
	c.due_date,
	c.days_left,
	c.target_url
from candidates c
join claimed cl
	on cl.user_id = c.user_id
	and cl.kind = c.kind
	and cl.ref_id = c.ref_id
	and cl.local_date = c.local_date
order by c.user_id, c.due_date;
$$;

revoke all on function public.claim_due_notifications(timestamptz) from public, anon, authenticated;
grant execute on function public.claim_due_notifications(timestamptz) to service_role;
