alter table public.comercios
  add constraint comercios_costo_delivery_no_negativo check (costo_delivery >= 0),
  add constraint comercios_latitud_valida check (latitud is null or latitud between -90 and 90),
  add constraint comercios_longitud_valida check (longitud is null or longitud between -180 and 180);
alter table public.precios
  add constraint precios_anterior_valido check (precio_anterior is null or
    (precio_anterior >= 0 and (not en_oferta or precio_anterior > precio)));
