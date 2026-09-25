alter table public.precios add column if not exists oferta_hasta timestamptz;
comment on column public.precios.oferta_hasta is 'Fin de vigencia de la oferta, en horario absoluto UTC.';
