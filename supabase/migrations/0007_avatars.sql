-- ============================================================================
-- FinFlow · Fotos de perfil
-- Bucket privado; cada objeto vive bajo la carpeta del usuario: {user_id}/...
-- El acceso se resuelve con URLs firmadas desde el servidor.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
	('avatars', 'avatars', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists avatars_select on storage.objects;
create policy avatars_select on storage.objects for select to authenticated
	using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects for insert to authenticated
	with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects for update to authenticated
	using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
	with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects for delete to authenticated
	using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
