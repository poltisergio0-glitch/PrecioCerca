(() => {
  const BASE = 'https://kgrnpypzounvgphjdrjg.supabase.co/rest/v1/favoritos';
  const KEY = 'sb_publishable_3bnREPlK6nB7l5ISLX5wDg_WdaMYIX_';
  let saved = new Set(), userId = null;
  const filter = document.getElementById('favorites-filter');
  const only = document.getElementById('only-favorites');
  const notice = document.getElementById('favorites-message');
  const changed = () => window.dispatchEvent(new Event('preciocerca:favorites-updated'));
  async function call(path, options, session) {
    const response = await fetch(BASE + path, {
      method: options.method || 'GET',
      headers: { apikey: KEY, Authorization: 'Bearer ' + session.access_token,
        'Content-Type': 'application/json', Prefer: 'return=representation' },
      ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'No se pudo actualizar favoritos.');
    return data;
  }
  async function refresh() {
    const session = await window.PrecioCercaAuth.getSession();
    userId = session?.user?.id || null;
    if (!session) {
      saved = new Set(); only.checked = false; filter.hidden = true;
      notice.textContent = ''; changed(); return;
    }
    filter.hidden = false;
    try {
      const rows = await call('?select=producto_id&usuario_id=eq.' + encodeURIComponent(userId), {}, session);
      if (userId !== session.user.id) return;
      saved = new Set(rows.map(row => row.producto_id));
      notice.textContent = ''; changed();
    } catch (error) { notice.textContent = error.message; }
  }
  window.PrecioCercaFavorites = { has: id => saved.has(id), active: () => Boolean(userId) };
  document.getElementById('results').addEventListener('click', async event => {
    const button = event.target.closest('[data-favorite-product]');
    if (!button) return;
    const session = await window.PrecioCercaAuth.getSession();
    if (!session) { notice.textContent = 'Ingresá a tu cuenta para guardar favoritos.'; return; }
    const id = button.dataset.favoriteProduct;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return;
    button.disabled = true;
    try {
      if (saved.has(id)) {
        await call('?usuario_id=eq.' + encodeURIComponent(session.user.id) +
          '&producto_id=eq.' + encodeURIComponent(id), { method: 'DELETE' }, session);
        saved.delete(id);
      } else {
        await call('', { method: 'POST', body: { usuario_id: session.user.id, producto_id: id } }, session);
        saved.add(id);
      }
      notice.textContent = 'Favoritos actualizados.';
      changed();
    } catch (error) { notice.textContent = error.message; button.disabled = false; }
  });
  only.addEventListener('change', changed);
  window.addEventListener('preciocerca:session', refresh);
  refresh();
})();
