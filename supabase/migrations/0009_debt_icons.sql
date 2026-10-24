-- 0009: icono propio por deuda.
--
-- Hasta ahora la interfaz mostraba el icono del tipo de obligación. Esta
-- columna permite elegir un icono alusivo a cada deuda; las existentes
-- conservan el icono que ya se mostraba para su tipo.

alter table public.debts
	add column if not exists icon text not null default 'receipt_long';

update public.debts
set icon = case kind
	when 'credit_card' then 'credit_card'
	when 'personal' then 'directions_car'
	when 'family' then 'group'
	when 'mortgage' then 'home'
	else 'receipt_long'
end;

alter table public.debts
	add constraint debts_icon_length check (char_length(trim(icon)) between 1 and 40);

-- La vista cambia de columnas: se recrea y se vuelve a otorgar acceso.
drop view if exists public.debt_progress;

create view public.debt_progress
with (security_invoker = on)
as
select
	d.id,
	d.user_id,
	d.name,
	d.creditor,
	d.kind,
	d.icon,
	d.principal_amount,
	d.total_installments,
	d.monthly_payment,
	d.interest_kind,
	d.interest_rate,
	d.due_day,
	d.first_due_date,
	d.payment_frequency,
	d.started_at,
	d.initial_amount,
	d.alert_days_before,
	d.account_id,
	d.is_active,
	d.notes,
	d.created_at,
	d.updated_at,
	d.initial_amount + coalesce(sum(p.amount), 0) as paid_amount,
	greatest(d.principal_amount - d.initial_amount - coalesce(sum(p.amount), 0), 0) as remaining_amount,
	count(p.id) filter (where not p.is_extra) as installments_paid,
	least(
		round(
			(d.initial_amount + coalesce(sum(p.amount), 0)) / d.principal_amount * 100,
			1
		),
		100
	) as progress_percent,
	greatest(d.total_installments - count(p.id) filter (where not p.is_extra), 0) as installments_left,
	case
		when count(p.id) filter (where not p.is_extra) > 0 then
			(
				d.first_due_date
				+ (
					(count(p.id) filter (where not p.is_extra))::int
					* case d.payment_frequency
						when 'weekly' then interval '7 days'
						when 'biweekly' then interval '15 days'
						else interval '1 month'
					end
				)
			)::date
		else d.first_due_date
	end as next_due_date,
	coalesce(max(p.occurred_at), d.created_at) as last_payment_at
from public.debts d
left join public.debt_payments p on p.debt_id = d.id
group by d.id;

revoke all on public.debt_progress from anon;
grant select on public.debt_progress to authenticated;
