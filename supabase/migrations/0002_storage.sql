-- ============================================================================
-- FinFlow · Almacenamiento de archivos
-- Buckets privados; el acceso se resuelve con URLs firmadas desde el servidor.
-- Cada objeto vive bajo la carpeta del usuario: {user_id}/...
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
	('receipts', 'receipts', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']),
	('goal-images', 'goal-images', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy receipts_select on storage.objects for select to authenticated
	using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy receipts_insert on storage.objects for insert to authenticated
	with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy receipts_update on storage.objects for update to authenticated
	using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text)
	with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy receipts_delete on storage.objects for delete to authenticated
	using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy goal_images_select on storage.objects for select to authenticated
	using (bucket_id = 'goal-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy goal_images_insert on storage.objects for insert to authenticated
	with check (bucket_id = 'goal-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy goal_images_update on storage.objects for update to authenticated
	using (bucket_id = 'goal-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
	with check (bucket_id = 'goal-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy goal_images_delete on storage.objects for delete to authenticated
	using (bucket_id = 'goal-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
