import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const url = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const json = (status: number, body: object) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Usá POST.' });
  const token = /^Bearer (.+)$/i.exec(request.headers.get('Authorization') || '')?.[1];
  if (!url || !serviceKey) return json(503, { error: 'Servicio no configurado.' });
  if (!token) return json(401, { error: 'Ingresá a tu cuenta.' });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: identity, error: authError } = await admin.auth.getUser(token);
  if (authError || !identity.user) return json(401, { error: 'La sesión venció. Ingresá de nuevo.' });
  const userId = identity.user.id;
  const { data: pending, error: requestError } = await admin.from('solicitudes_eliminacion')
    .select('usuario_id').eq('usuario_id', userId).maybeSingle();
  if (requestError) return json(500, { error: 'No se pudo verificar la solicitud.' });
  if (!pending) return json(403, { error: 'Primero solicitá la eliminación desde tu cuenta.' });

  try {
    const photoPrefix = url + '/storage/v1/object/public/fotos-productos/' + userId + '/';
    for (const table of ['productos', 'precios']) {
      const { error: clearError } = await admin.from(table).update({ imagen: null })
        .like('imagen', photoPrefix + '%');
      if (clearError) throw clearError;
    }
    // The app uploads files exclusively under the authenticated user's UUID.
    for (let page = 0; page < 100; page++) {
      const { data: files, error: listError } = await admin.storage.from('fotos-productos')
        .list(userId, { limit: 100, offset: 0 });
      if (listError) throw listError;
      const paths = (files || []).filter(file => file.name && file.id).map(file => userId + '/' + file.name);
      if (!paths.length) break;
      const { error: removeError } = await admin.storage.from('fotos-productos').remove(paths);
      if (removeError) throw removeError;
      if (page === 99) throw new Error('Demasiadas fotos para procesar en una operación.');
    }
    // The schema cascades auth.users -> usuarios -> comercios -> precios,
    // and also removes favorites, lists and the deletion request.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;
    return json(200, { deleted: true });
  } catch (error) {
    console.error('Account deletion failed for', userId, error);
    return json(500, { error: 'No se completó la eliminación. Tu solicitud quedó registrada; intentá otra vez.' });
  }
});
