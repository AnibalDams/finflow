-- ============================================================================
-- 0011 · Propiedad de las suscripciones push
--
-- `endpoint` identifica un dispositivo y es único en toda la tabla. La versión
-- anterior de `register_push_subscription` borraba por endpoint sin mirar al
-- dueño, así que cualquier usuario autenticado que conociera el endpoint de
-- otro podía borrarlo o reasignarlo a su cuenta.
--
-- Regla nueva: se reasigna cuando las claves del dispositivo coinciden (mismo
-- navegador que cambia de cuenta) y se rechaza en cualquier otro caso.
-- ============================================================================

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

	-- Renovación del mismo usuario: se descarta la fila previa.
	delete from public.push_subscriptions
	where endpoint = p_endpoint and user_id = v_user;

	-- El endpoint pertenece a otra cuenta. Solo se adopta si las claves
	-- coinciden (mismo dispositivo, otra sesión); con solo el endpoint no basta.
	if exists (
		select 1 from public.push_subscriptions where endpoint = p_endpoint
	) then
		if exists (
			select 1 from public.push_subscriptions
			where endpoint = p_endpoint and p256dh = p_p256dh and auth = p_auth
		) then
			delete from public.push_subscriptions where endpoint = p_endpoint;
		else
			raise exception 'endpoint_in_use';
		end if;
	end if;

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
