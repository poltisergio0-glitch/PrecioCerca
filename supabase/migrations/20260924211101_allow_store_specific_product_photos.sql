alter table public.precios add column if not exists imagen text;
alter table public.precios drop constraint if exists precios_imagen_https;
alter table public.precios add constraint precios_imagen_https check (imagen is null or imagen ~ '^https://');
