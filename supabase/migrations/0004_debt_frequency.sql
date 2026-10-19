-- 0004: frecuencia de pago, fecha de origen y monto inicial de las deudas.
--
-- `monthly_payment` conserva su nombre por compatibilidad, pero pasa a
-- representar la cuota por periodo (semana, quincena o mes).

do $$
begin
	create type public.debt_frequency as enum ('weekly', 'biweekly', 'monthly');
exception
	when duplicate_object then null;
end
$$;

alter table public.debts
	add column if not exists payment_frequency public.debt_frequency not null default 'monthly',
	add column if not exists started_at date,
	add column if not exists initial_amount numeric(14, 2) not null default 0;

-- Deudas existentes: el origen se aproxima con la fecha de creación.
update public.debts
set started_at = created_at::date
where started_at is null;

alter table public.debts
	alter column started_at set not null,
	alter column started_at set default current_date;

alter table public.debts
	add constraint debts_initial_amount_non_negative check (initial_amount >= 0),
	add constraint debts_initial_amount_within_principal check (initial_amount <= principal_amount);

-- La vista cambia el orden de columnas: se recrea y se vuelve a otorgar acceso.
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

grant select on public.debt_progress to authenticated;
