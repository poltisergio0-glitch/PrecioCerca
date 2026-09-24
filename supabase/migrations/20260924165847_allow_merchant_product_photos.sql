insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-productos', 'fotos-productos', true, 2097152,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "comerciantes_suben_fotos_productos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'fotos-productos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.comercios c
    where c.propietario_id = (select auth.uid()) and c.activo = true
  )
);
