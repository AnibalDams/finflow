-- ============================================================================
-- FinFlow · Datos de demostración
--
-- Crea un dataset equivalente a los diseños (Octubre 2026 vs Septiembre 2026)
-- para la cuenta demo@finflow.app. Idempotente: si ya hay movimientos, no hace
-- nada. Se ejecuta con privilegios de servicio (los datos se insertan para un
-- usuario concreto, no dependen de RLS).
-- ============================================================================

do $$
declare
	v_email text := 'demo@finflow.app';
	v_uid uuid;
	v_acc_principal uuid;
	v_acc_nomina uuid;
	v_acc_bolsillo uuid;
	v_acc_cash uuid;
	v_cat record;
	v_cat_vivienda uuid;
	v_cat_alimentos uuid;
	v_cat_transporte uuid;
	v_cat_ocio uuid;
	v_cat_salud uuid;
	v_cat_educacion uuid;
	v_cat_nomina uuid;
	v_cat_freelance uuid;
	v_cat_extra uuid;
	v_goal_mac uuid;
	v_goal_japon uuid;
	v_goal_oficina uuid;
	v_debt_visa uuid;
	v_debt_auto uuid;
	v_debt_familiar uuid;
	v_tx uuid;
	v_tag_reembolsable uuid;
	v_tag_viajes uuid;
	v_tag_proyecto uuid;
	i int;
begin
	select id into v_uid from auth.users where email = v_email;

	if v_uid is null then
		raise exception 'El usuario % no existe. Regístralo primero.', v_email;
	end if;

	-- Confirmar correo para permitir el acceso en la demo
	update auth.users
	set email_confirmed_at = coalesce(email_confirmed_at, now())
	where id = v_uid;

	if exists (select 1 from public.transactions where user_id = v_uid) then
		raise notice 'Regenerando datos de demostración para %', v_email;
	end if;

	-- Reinicio del dataset de demostración (solo afecta a la cuenta demo)
	delete from public.transaction_tags where user_id = v_uid;
	delete from public.tags where user_id = v_uid;
	delete from public.debt_payments where user_id = v_uid;
	delete from public.debts where user_id = v_uid;
	delete from public.goal_contributions where user_id = v_uid;
	delete from public.goals where user_id = v_uid;
	delete from public.budgets where user_id = v_uid;
	delete from public.transactions where user_id = v_uid;
	delete from public.accounts where user_id = v_uid;

	-- ------------------------------------------------------------------
	-- Perfil
	-- ------------------------------------------------------------------
	update public.profiles
	set full_name = 'Sofía Ramírez', currency = 'USD', monthly_budget = 3000.00
	where id = v_uid;

	-- ------------------------------------------------------------------
	-- Cuentas (el saldo inicial se ajusta al final para calzar exacto)
	-- ------------------------------------------------------------------
	insert into public.accounts (user_id, name, kind, currency, icon, is_primary)
	values (v_uid, 'Principal USD', 'checking', 'USD', 'account_balance', true)
	returning id into v_acc_principal;

	insert into public.accounts (user_id, name, kind, currency, icon)
	values (v_uid, 'Nómina Principal USD', 'checking', 'USD', 'payments')
	returning id into v_acc_nomina;

	insert into public.accounts (user_id, name, kind, currency, icon)
	values (v_uid, 'Bolsillo Ahorros FinFlow', 'pocket', 'USD', 'savings')
	returning id into v_acc_bolsillo;

	insert into public.accounts (user_id, name, kind, currency, icon)
	values (v_uid, 'Efectivo', 'cash', 'USD', 'wallet')
	returning id into v_acc_cash;

	-- ------------------------------------------------------------------
	-- Categorías de referencia
	-- ------------------------------------------------------------------
	select id into v_cat_vivienda from public.categories where user_id = v_uid and kind = 'expense' and name = 'Vivienda';
	select id into v_cat_alimentos from public.categories where user_id = v_uid and kind = 'expense' and name = 'Alimentos';
	select id into v_cat_transporte from public.categories where user_id = v_uid and kind = 'expense' and name = 'Transporte';
	select id into v_cat_ocio from public.categories where user_id = v_uid and kind = 'expense' and name = 'Ocio';
	select id into v_cat_salud from public.categories where user_id = v_uid and kind = 'expense' and name = 'Salud';
	select id into v_cat_educacion from public.categories where user_id = v_uid and kind = 'expense' and name = 'Educación';
	select id into v_cat_nomina from public.categories where user_id = v_uid and kind = 'income' and name = 'Nómina';
	select id into v_cat_freelance from public.categories where user_id = v_uid and kind = 'income' and name = 'Freelance';
	select id into v_cat_extra from public.categories where user_id = v_uid and kind = 'income' and name = 'Extra';

	-- ------------------------------------------------------------------
	-- Etiquetas
	-- ------------------------------------------------------------------
	insert into public.tags (user_id, name, color) values (v_uid, 'Reembolsable', '#bc0b3b')
	returning id into v_tag_reembolsable;
	insert into public.tags (user_id, name, color) values (v_uid, 'Viajes', '#4648d4')
	returning id into v_tag_viajes;
	insert into public.tags (user_id, name, color) values (v_uid, 'Proyecto FinFlow', '#006c49')
	returning id into v_tag_proyecto;

	-- ------------------------------------------------------------------
	-- Movimientos · Octubre 2026 (total gastos: 1,850.50)
	-- ------------------------------------------------------------------
	insert into public.transactions (user_id, type, amount, account_id, category_id, concept, occurred_at)
	values
		-- Vivienda · 703.19
		(v_uid, 'expense', 620.00, v_acc_principal, v_cat_vivienda, 'Renta departamento', '2026-10-01 09:00-06'),
		(v_uid, 'expense', 83.19, v_acc_principal, v_cat_vivienda, 'Climatización estacional', '2026-10-10 19:30-06'),
		-- Alimentos · 481.13
		(v_uid, 'expense', 295.83, v_acc_nomina, v_cat_alimentos, 'Despensa semanal', '2026-10-05 18:20-06'),
		(v_uid, 'expense', 142.80, v_acc_nomina, v_cat_alimentos, 'Supermercado Whole Foods', '2026-10-17 12:10-06'),
		(v_uid, 'expense', 42.50, v_acc_principal, v_cat_alimentos, 'Cena Bistro Gourmet', '2026-10-18 20:45-06'),
		-- Transporte · 259.07
		(v_uid, 'expense', 100.00, v_acc_principal, v_cat_transporte, 'Estacionamiento mensual', '2026-10-02 08:00-06'),
		(v_uid, 'expense', 140.57, v_acc_nomina, v_cat_transporte, 'Gasolina', '2026-10-08 07:40-06'),
		(v_uid, 'expense', 18.50, v_acc_cash, v_cat_transporte, 'Uber Ride', '2026-10-16 23:15-06'),
		-- Ocio · 222.06
		(v_uid, 'expense', 24.99, v_acc_principal, v_cat_ocio, 'Suscripción Netflix & Spotify', '2026-10-12 06:00-06'),
		(v_uid, 'expense', 47.07, v_acc_cash, v_cat_ocio, 'Cine y snacks', '2026-10-11 21:00-06'),
		(v_uid, 'expense', 150.00, v_acc_principal, v_cat_ocio, 'Salida con amigos', '2026-10-14 22:30-06'),
		-- Salud · 185.05
		(v_uid, 'expense', 85.05, v_acc_nomina, v_cat_salud, 'Farmacia', '2026-10-09 17:05-06'),
		(v_uid, 'expense', 100.00, v_acc_nomina, v_cat_salud, 'Consulta médica', '2026-10-06 10:00-06');

	-- ------------------------------------------------------------------
	-- Movimientos · Septiembre 2026 (total gastos: 2,172.00)
	-- ------------------------------------------------------------------
	insert into public.transactions (user_id, type, amount, account_id, category_id, concept, occurred_at)
	values
		(v_uid, 'expense', 500.00, v_acc_principal, v_cat_vivienda, 'Renta departamento', '2026-09-01 09:00-06'),
		(v_uid, 'expense', 83.19, v_acc_principal, v_cat_vivienda, 'Climatización estacional', '2026-09-10 19:30-06'),
		(v_uid, 'expense', 400.00, v_acc_nomina, v_cat_alimentos, 'Supermercado', '2026-09-06 12:00-06'),
		(v_uid, 'expense', 123.43, v_acc_nomina, v_cat_alimentos, 'Despensa semanal', '2026-09-20 18:00-06'),
		(v_uid, 'expense', 177.22, v_acc_nomina, v_cat_transporte, 'Gasolina', '2026-09-08 07:40-06'),
		(v_uid, 'expense', 100.00, v_acc_cash, v_cat_transporte, 'Uber y taxis', '2026-09-22 22:00-06'),
		(v_uid, 'expense', 200.00, v_acc_principal, v_cat_ocio, 'Salida con amigos', '2026-09-13 22:30-06'),
		(v_uid, 'expense', 101.57, v_acc_cash, v_cat_ocio, 'Cine y snacks', '2026-09-19 21:00-06'),
		(v_uid, 'expense', 24.99, v_acc_principal, v_cat_ocio, 'Suscripción Netflix & Spotify', '2026-09-12 06:00-06'),
		(v_uid, 'expense', 185.05, v_acc_nomina, v_cat_salud, 'Farmacia', '2026-09-09 17:05-06'),
		(v_uid, 'expense', 276.55, v_acc_principal, v_cat_educacion, 'Curso de inglés', '2026-09-15 20:00-06');

	-- ------------------------------------------------------------------
	-- Ingresos · Octubre 2026 (total: 4,200.00) y Septiembre
	-- ------------------------------------------------------------------
	insert into public.transactions (user_id, type, amount, account_id, category_id, concept, occurred_at)
	values
		(v_uid, 'income', 3200.00, v_acc_nomina, v_cat_nomina, 'Nómina Tech Corp', '2026-10-18 09:30-06'),
		(v_uid, 'income', 650.00, v_acc_principal, v_cat_freelance, 'Freelance UI Design', '2026-10-17 15:00-06'),
		(v_uid, 'income', 350.00, v_acc_principal, v_cat_extra, 'Venta marketplace', '2026-10-07 11:20-06'),
		(v_uid, 'income', 3200.00, v_acc_nomina, v_cat_nomina, 'Nómina Tech Corp', '2026-09-18 09:30-06'),
		(v_uid, 'income', 400.00, v_acc_principal, v_cat_freelance, 'Freelance Branding', '2026-09-24 15:00-06');

	-- ------------------------------------------------------------------
	-- Etiquetas sobre movimientos concretos
	-- ------------------------------------------------------------------
	select id into v_tx from public.transactions
	where user_id = v_uid and concept = 'Cena Bistro Gourmet'
	order by created_at desc limit 1;
	if v_tx is not null then
		insert into public.transaction_tags (transaction_id, tag_id, user_id)
		values (v_tx, v_tag_reembolsable, v_uid), (v_tx, v_tag_viajes, v_uid)
		on conflict do nothing;
	end if;

	select id into v_tx from public.transactions
	where user_id = v_uid and concept = 'Supermercado Whole Foods'
	order by created_at desc limit 1;
	if v_tx is not null then
		insert into public.transaction_tags (transaction_id, tag_id, user_id)
		values (v_tx, v_tag_proyecto, v_uid)
		on conflict do nothing;
	end if;

	-- ------------------------------------------------------------------
	-- Presupuestos por categoría · Octubre 2026
	-- ------------------------------------------------------------------
	insert into public.budgets (user_id, category_id, period_month, amount)
	values
		(v_uid, v_cat_vivienda, '2026-10-01', 800.00),
		(v_uid, v_cat_alimentos, '2026-10-01', 600.00),
		(v_uid, v_cat_transporte, '2026-10-01', 350.00),
		(v_uid, v_cat_ocio, '2026-10-01', 250.00),
		(v_uid, v_cat_salud, '2026-10-01', 200.00)
	on conflict (user_id, category_id, period_month) do nothing;

	-- ------------------------------------------------------------------
	-- Planes y metas
	-- ------------------------------------------------------------------
	insert into public.goals (
		user_id, name, description, target_amount, initial_amount, target_date,
		category, status, account_id, monthly_contribution, reminder_day
	)
	values (
		v_uid, 'MacBook Pro M3 Max', 'Equipo de trabajo para diseño y desarrollo',
		2499.00, 300.00, '2026-11-15', 'technology', 'active', v_acc_bolsillo, 220.00, 1
	) returning id into v_goal_mac;

	insert into public.goals (
		user_id, name, description, target_amount, initial_amount, target_date,
		category, status, account_id, monthly_contribution, reminder_day
	)
	values (
		v_uid, 'Viaje a Japón', 'Dos semanas recorriendo Kioto y Tokio',
		4500.00, 0, '2027-05-10', 'travel', 'active', v_acc_bolsillo, 375.00, 5
	) returning id into v_goal_japon;

	insert into public.goals (
		user_id, name, description, target_amount, initial_amount, target_date,
		category, status, account_id, monthly_contribution, reminder_day
	)
	values (
		v_uid, 'Renovación Oficina', 'Escritorio ergonómico y silla nueva',
		1200.00, 400.00, '2026-12-01', 'home', 'active', v_acc_bolsillo, 200.00, 1
	) returning id into v_goal_oficina;

	insert into public.goals (user_id, name, target_amount, initial_amount, target_date, category, status, monthly_contribution, completed_at)
	values
		(v_uid, 'Fondo de Emergencia', 3000.00, 3000.00, '2026-08-01', 'other', 'completed', 250.00, '2026-08-02 10:00-06'),
		(v_uid, 'Cámara Canon R50', 1200.00, 1200.00, '2026-06-15', 'technology', 'completed', 150.00, '2026-06-10 10:00-06');

	insert into public.goals (user_id, name, target_amount, initial_amount, target_date, category, status, monthly_contribution)
	values (v_uid, 'Curso de Inglés C1', 800.00, 150.00, '2027-03-01', 'education', 'paused', 100.00);

	-- Aportes de los planes activos (MacBook: 300 + 1,500 = 1,800 · Japón: 2,250)
	for i in 0..9 loop
		insert into public.goal_contributions (user_id, goal_id, amount, occurred_at, note)
		values (v_uid, v_goal_mac, 150.00, ('2026-01-05'::date + (i || ' month')::interval), 'Aportación mensual');
	end loop;

	for i in 0..5 loop
		insert into public.goal_contributions (user_id, goal_id, amount, occurred_at, note)
		values (v_uid, v_goal_japon, 375.00, ('2026-05-05'::date + (i || ' month')::interval), 'Aportación mensual');
	end loop;

	-- ------------------------------------------------------------------
	-- Deudas (compromiso mensual: 485.00)
	-- ------------------------------------------------------------------
	insert into public.debts (
		user_id, name, creditor, kind, principal_amount, total_installments, monthly_payment,
		interest_kind, interest_rate, due_day, first_due_date, alert_days_before, account_id
	)
	values (
		v_uid, 'Tarjeta Visa Signature', 'Apple Store · MSI', 'credit_card',
		1500.00, 12, 125.00, 'msi', 0, 5, '2026-06-05', 5, v_acc_principal
	) returning id into v_debt_visa;

	insert into public.debts (
		user_id, name, creditor, kind, principal_amount, total_installments, monthly_payment,
		interest_kind, interest_rate, due_day, first_due_date, alert_days_before, account_id
	)
	values (
		v_uid, 'Préstamo Personal Auto', 'Crédito Vehicular Bancario', 'personal',
		6240.00, 24, 260.00, 'fixed', 4.5, 15, '2025-11-15', 5, v_acc_nomina
	) returning id into v_debt_auto;

	insert into public.debts (
		user_id, name, creditor, kind, principal_amount, total_installments, monthly_payment,
		interest_kind, interest_rate, due_day, first_due_date, alert_days_before, account_id
	)
	values (
		v_uid, 'Préstamo Familiar', 'Apoyo Mudanza · Sin interés', 'family',
		400.00, 4, 100.00, 'msi', 0, 28, '2026-09-28', 5, v_acc_principal
	) returning id into v_debt_familiar;

	-- Cuotas ya pagadas (históricas)
	for i in 0..4 loop
		insert into public.debt_payments (user_id, debt_id, amount, occurred_at, installment_number)
		values (v_uid, v_debt_visa, 125.00, ('2026-06-05'::date + (i || ' month')::interval), i + 1);
	end loop;

	for i in 0..11 loop
		insert into public.debt_payments (user_id, debt_id, amount, occurred_at, installment_number)
		values (v_uid, v_debt_auto, 260.00, ('2025-11-15'::date + (i || ' month')::interval), i + 1);
	end loop;

	for i in 0..1 loop
		insert into public.debt_payments (user_id, debt_id, amount, occurred_at, installment_number)
		values (v_uid, v_debt_familiar, 100.00, ('2026-09-28'::date + (i || ' month')::interval), i + 1);
	end loop;

	-- ------------------------------------------------------------------
	-- Calibrar saldos iniciales para que el saldo final coincida con el diseño
	-- ------------------------------------------------------------------
	update public.accounts a
	set opening_balance = t.target - (
		coalesce((
			select sum(
				case
					when tx.type = 'income' then tx.amount
					when tx.type = 'expense' then -tx.amount
					when tx.type = 'transfer' then -tx.amount
					else 0
				end
			)
			from public.transactions tx
			where tx.account_id = a.id
		), 0)
		+ coalesce((
			select sum(tx.amount)
			from public.transactions tx
			where tx.type = 'transfer' and tx.counter_account_id = a.id
		), 0)
	)
	from (
		values
			(v_acc_principal, 8450.20::numeric),
			(v_acc_nomina, 4820.50::numeric),
			(v_acc_bolsillo, 4850.00::numeric),
			(v_acc_cash, 250.00::numeric)
	) as t(id, target)
	where a.id = t.id;

	raise notice 'Datos de demostración creados para %', v_email;
end;
$$;
