-- 0012: catálogo de monedas por usuario.
--
-- Hasta ahora la interfaz ofrecía una lista fija de códigos. Esta tabla permite
-- que cada usuario agregue las monedas con las que trabaja, con USD y EUR como
-- base. Las claves foráneas impiden borrar una moneda que siga en uso y evitan
-- que el catálogo se desincronice de los datos reales.

-- ----------------------------------------------------------------------------
-- 1. Catálogo
-- ----------------------------------------------------------------------------
create table if not exists public.currencies (
	user_id uuid not null references auth.users (id) on delete cascade,
	code text not null check (code ~ '^[A-Z]{3}$'),
	name text not null check (char_length(trim(name)) between 1 and 60),
	created_at timestamptz not null default now(),
	primary key (user_id, code)
);

alter table public.currencies enable row level security;

drop policy if exists currencies_select on public.currencies;
create policy currencies_select on public.currencies for select to authenticated
	using ((select auth.uid()) = user_id);

drop policy if exists currencies_insert on public.currencies;
create policy currencies_insert on public.currencies for insert to authenticated
	with check ((select auth.uid()) = user_id);

drop policy if exists currencies_update on public.currencies;
create policy currencies_update on public.currencies for update to authenticated
	using ((select auth.uid()) = user_id)
	with check ((select auth.uid()) = user_id);

drop policy if exists currencies_delete on public.currencies;
create policy currencies_delete on public.currencies for delete to authenticated
	using ((select auth.uid()) = user_id);

revoke all on public.currencies from anon;
grant select, insert, update, delete on public.currencies to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Semilla y códigos ya en uso
-- ----------------------------------------------------------------------------
-- La migración falla de forma explícita si algún dato histórico no es un código
-- válido: es preferible detenerse a normalizar sin avisar.
do $$
begin
	if exists (select 1 from public.profiles where currency !~ '^[A-Z]{3}$')
		or exists (select 1 from public.accounts where currency !~ '^[A-Z]{3}$')
		or exists (select 1 from public.transactions where currency !~ '^[A-Z]{3}$') then
		raise exception '0012: hay códigos de moneda inválidos; normalízalos antes de aplicar';
	end if;
end $$;

insert into public.currencies (user_id, code, name)
select p.id, c.code, c.name
from public.profiles p
cross join (values ('USD', 'Dólar estadounidense'), ('EUR', 'Euro')) as c(code, name)
on conflict (user_id, code) do nothing;

insert into public.currencies (user_id, code, name)
select distinct p.id, p.currency, p.currency from public.profiles p
on conflict (user_id, code) do nothing;

insert into public.currencies (user_id, code, name)
select distinct a.user_id, a.currency, a.currency from public.accounts a
on conflict (user_id, code) do nothing;

insert into public.currencies (user_id, code, name)
select distinct t.user_id, t.currency, t.currency from public.transactions t
on conflict (user_id, code) do nothing;

-- ----------------------------------------------------------------------------
-- 3. Integridad: perfiles, cuentas y movimientos apuntan al catálogo
-- ----------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_currency_fk;
alter table public.profiles add constraint profiles_currency_fk
	foreign key (id, currency) references public.currencies (user_id, code);

alter table public.accounts drop constraint if exists accounts_currency_fk;
alter table public.accounts add constraint accounts_currency_fk
	foreign key (user_id, currency) references public.currencies (user_id, code);

alter table public.transactions drop constraint if exists transactions_currency_fk;
alter table public.transactions add constraint transactions_currency_fk
	foreign key (user_id, currency) references public.currencies (user_id, code);

-- ----------------------------------------------------------------------------
-- 4. Altas de usuario: monedas base antes del perfil
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
	-- El código llega como metadato del registro; se sanea antes de usarlo.
	profile_currency := upper(
		regexp_replace(
			coalesce(nullif(trim(new.raw_user_meta_data ->> 'currency'), ''), 'USD'),
			'[^A-Za-z]',
			'',
			'g'
		)
	);
	if char_length(profile_currency) <> 3 then
		profile_currency := 'USD';
	end if;

	-- Perfil y cuenta principal referencian el catálogo: se siembra primero.
	insert into public.currencies (user_id, code, name)
	values
		(new.id, 'USD', 'Dólar estadounidense'),
		(new.id, 'EUR', 'Euro'),
		(new.id, profile_currency, profile_currency)
	on conflict (user_id, code) do nothing;

	insert into public.profiles (id, full_name, currency)
	values (
		new.id,
		coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''),
		profile_currency
	)
	on conflict (id) do nothing;

	insert into public.categories (user_id, name, kind, icon, color, sort_order)
	select new.id, ct.name, ct.kind, ct.icon, ct.color, ct.sort_order
	from public.category_templates ct
	on conflict (user_id, kind, name) do nothing;

	insert into public.accounts (user_id, name, kind, currency, icon, is_primary)
	values (new.id, 'Cuenta Principal', 'checking', profile_currency, 'account_balance', true)
	returning id into new_account_id;

	return new;
end;
$$;
