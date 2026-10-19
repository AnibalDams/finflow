-- Endurecimiento y rendimiento detectados por los advisors de Supabase.
--
-- 1. `handle_new_user()` es SECURITY DEFINER y solo debe ejecutarse como trigger
--    de `auth.users`; se revoca la ejecución vía API para `anon` y `authenticated`.
-- 2. Índices de cobertura para claves foráneas consultadas por las vistas y RPCs.

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

create index if not exists budgets_category_idx on public.budgets (category_id);
create index if not exists debt_payments_transaction_idx on public.debt_payments (transaction_id);
create index if not exists debt_payments_user_idx on public.debt_payments (user_id);
create index if not exists debts_account_idx on public.debts (account_id);
create index if not exists goal_contributions_transaction_idx on public.goal_contributions (transaction_id);
create index if not exists goal_contributions_user_idx on public.goal_contributions (user_id);
create index if not exists goals_account_idx on public.goals (account_id);
create index if not exists transaction_tags_user_idx on public.transaction_tags (user_id);
