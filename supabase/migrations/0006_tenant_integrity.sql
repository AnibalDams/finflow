-- ============================================================================
-- 0006 · Integridad multi-tenant en las referencias
--
-- Las políticas RLS validan `user_id`, pero las claves foráneas originales solo
-- miraban el `id`. Eso permitía crear referencias a filas de otro usuario si se
-- conocía su UUID (oráculo de existencia, bloqueo de borrados por RESTRICT).
-- Estas claves foráneas compuestas obligan a que la fila referenciada tenga el
-- mismo `user_id`. Se añaden como NOT VALID y luego se validan para no bloquear
-- la tabla durante la creación.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Índices únicos que las FK compuestas necesitan
-- ----------------------------------------------------------------------------
create unique index if not exists accounts_user_id_id_key on public.accounts (user_id, id);
create unique index if not exists categories_user_id_id_key on public.categories (user_id, id);
create unique index if not exists transactions_user_id_id_key on public.transactions (user_id, id);
create unique index if not exists tags_user_id_id_key on public.tags (user_id, id);
create unique index if not exists goals_user_id_id_key on public.goals (user_id, id);
create unique index if not exists debts_user_id_id_key on public.debts (user_id, id);

-- ----------------------------------------------------------------------------
-- 2. Claves foráneas compuestas
-- ----------------------------------------------------------------------------
do $$
begin
	if not exists (
		select 1 from pg_constraint
		where conname = 'transactions_account_tenant_fk'
			and conrelid = 'public.transactions'::regclass
	) then
		alter table public.transactions
			add constraint transactions_account_tenant_fk
			foreign key (user_id, account_id)
			references public.accounts (user_id, id)
			on delete restrict
			not valid;
	end if;

	if not exists (
		select 1 from pg_constraint
		where conname = 'transactions_counter_account_tenant_fk'
			and conrelid = 'public.transactions'::regclass
	) then
		alter table public.transactions
			add constraint transactions_counter_account_tenant_fk
			foreign key (user_id, counter_account_id)
			references public.accounts (user_id, id)
			on delete restrict
			not valid;
	end if;

	if not exists (
		select 1 from pg_constraint
		where conname = 'transactions_category_tenant_fk'
			and conrelid = 'public.transactions'::regclass
	) then
		alter table public.transactions
			add constraint transactions_category_tenant_fk
			foreign key (user_id, category_id)
			references public.categories (user_id, id)
			on delete set null (category_id)
			not valid;
	end if;

	if not exists (
		select 1 from pg_constraint
		where conname = 'transaction_tags_transaction_tenant_fk'
			and conrelid = 'public.transaction_tags'::regclass
	) then
		alter table public.transaction_tags
			add constraint transaction_tags_transaction_tenant_fk
			foreign key (user_id, transaction_id)
			references public.transactions (user_id, id)
			on delete cascade
			not valid;
	end if;

	if not exists (
		select 1 from pg_constraint
		where conname = 'transaction_tags_tag_tenant_fk'
			and conrelid = 'public.transaction_tags'::regclass
	) then
		alter table public.transaction_tags
			add constraint transaction_tags_tag_tenant_fk
			foreign key (user_id, tag_id)
			references public.tags (user_id, id)
			on delete cascade
			not valid;
	end if;

	if not exists (
		select 1 from pg_constraint
		where conname = 'budgets_category_tenant_fk'
			and conrelid = 'public.budgets'::regclass
	) then
		alter table public.budgets
			add constraint budgets_category_tenant_fk
			foreign key (user_id, category_id)
			references public.categories (user_id, id)
			on delete cascade
			not valid;
	end if;

	if not exists (
		select 1 from pg_constraint
		where conname = 'goals_account_tenant_fk'
			and conrelid = 'public.goals'::regclass
	) then
		alter table public.goals
			add constraint goals_account_tenant_fk
			foreign key (user_id, account_id)
			references public.accounts (user_id, id)
			on delete set null (account_id)
			not valid;
	end if;

	if not exists (
		select 1 from pg_constraint
		where conname = 'goal_contributions_goal_tenant_fk'
			and conrelid = 'public.goal_contributions'::regclass
	) then
		alter table public.goal_contributions
			add constraint goal_contributions_goal_tenant_fk
			foreign key (user_id, goal_id)
			references public.goals (user_id, id)
			on delete cascade
			not valid;
	end if;

	if not exists (
		select 1 from pg_constraint
		where conname = 'goal_contributions_transaction_tenant_fk'
			and conrelid = 'public.goal_contributions'::regclass
	) then
		alter table public.goal_contributions
			add constraint goal_contributions_transaction_tenant_fk
			foreign key (user_id, transaction_id)
			references public.transactions (user_id, id)
			on delete set null (transaction_id)
			not valid;
	end if;

	if not exists (
		select 1 from pg_constraint
		where conname = 'debts_account_tenant_fk'
			and conrelid = 'public.debts'::regclass
	) then
		alter table public.debts
			add constraint debts_account_tenant_fk
			foreign key (user_id, account_id)
			references public.accounts (user_id, id)
			on delete set null (account_id)
			not valid;
	end if;

	if not exists (
		select 1 from pg_constraint
		where conname = 'debt_payments_debt_tenant_fk'
			and conrelid = 'public.debt_payments'::regclass
	) then
		alter table public.debt_payments
			add constraint debt_payments_debt_tenant_fk
			foreign key (user_id, debt_id)
			references public.debts (user_id, id)
			on delete cascade
			not valid;
	end if;

	if not exists (
		select 1 from pg_constraint
		where conname = 'debt_payments_transaction_tenant_fk'
			and conrelid = 'public.debt_payments'::regclass
	) then
		alter table public.debt_payments
			add constraint debt_payments_transaction_tenant_fk
			foreign key (user_id, transaction_id)
			references public.transactions (user_id, id)
			on delete set null (transaction_id)
			not valid;
	end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. Validación de los datos existentes
-- ----------------------------------------------------------------------------
alter table public.transactions validate constraint transactions_account_tenant_fk;
alter table public.transactions validate constraint transactions_counter_account_tenant_fk;
alter table public.transactions validate constraint transactions_category_tenant_fk;
alter table public.transaction_tags validate constraint transaction_tags_transaction_tenant_fk;
alter table public.transaction_tags validate constraint transaction_tags_tag_tenant_fk;
alter table public.budgets validate constraint budgets_category_tenant_fk;
alter table public.goals validate constraint goals_account_tenant_fk;
alter table public.goal_contributions validate constraint goal_contributions_goal_tenant_fk;
alter table public.goal_contributions validate constraint goal_contributions_transaction_tenant_fk;
alter table public.debts validate constraint debts_account_tenant_fk;
alter table public.debt_payments validate constraint debt_payments_debt_tenant_fk;
alter table public.debt_payments validate constraint debt_payments_transaction_tenant_fk;
