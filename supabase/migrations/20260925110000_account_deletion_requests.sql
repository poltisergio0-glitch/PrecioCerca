-- A signed-in user can request deletion; processing requires privileged review.
create table if not exists public.solicitudes_eliminacion (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  solicitada_at timestamptz not null default now()
);
alter table public.solicitudes_eliminacion enable row level security;
revoke all on public.solicitudes_eliminacion from anon, authenticated;
grant insert, select on public.solicitudes_eliminacion to authenticated;
create policy "solicitar_eliminacion_propia" on public.solicitudes_eliminacion
  for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "consultar_eliminacion_propia" on public.solicitudes_eliminacion
  for select to authenticated using ((select auth.uid()) = usuario_id);
