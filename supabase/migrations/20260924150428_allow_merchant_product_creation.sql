create policy comerciante_crear_producto on public.productos
for insert to authenticated
with check (
  exists (
    select 1 from public.comercios c
    where c.propietario_id = (select auth.uid())
      and c.activo = true
  )
);
