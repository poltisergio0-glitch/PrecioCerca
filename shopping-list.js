(() => {
  const KEY = 'preciocerca.shopping-list.v1';
  let selected;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    selected = new Set(Array.isArray(parsed) ?
      parsed.filter(id => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)).slice(0, 20) : []);
  } catch { selected = new Set(); }
  const container = document.getElementById('basket-content');
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify([...selected])); }
    catch (error) { console.warn('No se pudo guardar la lista en este dispositivo.', error); }
  }
  function renderList() {
    if (!selected.size) {
      container.innerHTML = '<p>Tu lista está vacía. Tocá “Agregar a mi lista” en los productos que quieras comparar.</p>';
      return;
    }
    if (!rows.length) {
      container.innerHTML = statusEl.textContent === 'No se pudo consultar la base de datos.' ?
        '<p>No pudimos actualizar la lista. Revisá tu conexión y recargá la app.</p>' :
        '<p>Cargando precios para comparar tu lista…</p>';
      return;
    }
    const products = new Map(rows.filter(row => row.productos?.id)
      .map(row => [row.productos.id, row.productos]));
    const names = [...selected].map(id => ({
      id, name: products.get(id)?.nombre || 'Producto no disponible'
    }));
    const stores = new Map();
    for (const row of rows) {
      const productId = row.productos?.id, storeId = row.comercios?.id;
      if (!selected.has(productId) || !storeId || Number(row.stock) <= 0) continue;
      if (!stores.has(storeId)) stores.set(storeId, { store: row.comercios, prices: new Map() });
      const prices = stores.get(storeId).prices;
      if (!prices.has(productId) || Number(row.precio) < Number(prices.get(productId).precio))
        prices.set(productId, row);
    }
    const complete = [...stores.values()].filter(item => item.prices.size === selected.size);
    complete.sort((a, b) => total(a) - total(b));
    container.innerHTML =
      '<div class="basket-items">' + names.map(item =>
        '<button type="button" data-remove-list="' + esc(item.id) +
        '" aria-label="Quitar ' + esc(item.name) + ' de la lista">' +
        esc(item.name) + ' ×</button>').join('') + '</div>' +
      '<p>' + selected.size + ' ' + (selected.size === 1 ? 'producto elegido' : 'productos elegidos') +
      ' · Guardados en este dispositivo.</p>' +
      (!complete.length ?
        '<p>Ningún comercio tiene todos los productos de esta lista con stock. Probá quitando uno o buscá cada producto por separado.</p>' :
        '<p>' + complete.length + ' ' +
          (complete.length === 1 ? 'comercio tiene' : 'comercios tienen') +
          ' todos los productos de tu lista:</p>' +
        complete.map(item => {
          const base = [...item.prices.values()].reduce((sum, row) => sum + Number(row.precio), 0);
          const delivery = item.store.hace_delivery ? Number(item.store.costo_delivery || 0) : null;
          return '<article class="card"><h3>' + esc(item.store.nombre) + '</h3>' +
            (/demo/i.test(item.store.nombre) ? '<span class="pill sample">Datos de ejemplo</span>' : '') +
            '<div>' + [...item.prices.values()].map(row =>
              '<div>' + esc(row.productos.nombre) + ': $' + money(row.precio) + '</div>').join('') +
            '</div><p class="basket-total">Retiro: $' + money(base) + '</p>' +
            (delivery === null ? '<p>Sin delivery</p>' :
              '<p>Con delivery: <strong>$' + money(base + delivery) +
              '</strong> (envío $' + money(delivery) + ' una sola vez)</p>') +
            (phone(item.store.whatsapp) ? '<a class="contact" target="_blank" rel="noopener noreferrer" href="https://wa.me/' +
              phone(item.store.whatsapp) + '">Consultar por WhatsApp</a>' : '') +
            (mapsUrl(item.store) ? '<a class="contact" target="_blank" rel="noopener noreferrer" href="' +
              esc(mapsUrl(item.store)) + '">Cómo llegar · Google Maps</a>' : '') +
            '</article>';
        }).join(''));
  }
  function total(item) {
    return [...item.prices.values()].reduce((sum, row) => sum + Number(row.precio), 0);
  }
  document.getElementById('results').addEventListener('click', event => {
    const button = event.target.closest('[data-list-product]');
    if (!button) return;
    const id = button.dataset.listProduct;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return;
    if (selected.has(id)) selected.delete(id);
    else if (selected.size < 20) selected.add(id);
    else { alert('La lista admite hasta 20 productos por ahora.'); return; }
    save(); renderList(); render();
  });
  container.addEventListener('click', event => {
    const button = event.target.closest('[data-remove-list]');
    if (!button) return;
    selected.delete(button.dataset.removeList);
    save(); renderList(); render();
  });
  window.PrecioCercaList = { has: id => selected.has(id) };
  window.addEventListener('preciocerca:prices-loaded', renderList);
  window.addEventListener('preciocerca:prices-failed', renderList);
  renderList();
})();