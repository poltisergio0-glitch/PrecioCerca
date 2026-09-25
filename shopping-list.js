(() => {
  const KEY = 'preciocerca.shopping-list.v1';
  const MODE_KEY = 'preciocerca.purchase-mode.v1';
  let selected;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    selected = new Set(Array.isArray(parsed) ?
      parsed.filter(id => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)).slice(0, 20) : []);
  } catch { selected = new Set(); }
  let mode = localStorage.getItem(MODE_KEY) === 'delivery' ? 'delivery' : 'pickup';
  const container = document.getElementById('basket-content');
  const jump = document.getElementById('basket-jump');
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify([...selected])); }
    catch (error) { console.warn('No se pudo guardar la compra en este dispositivo.', error); }
  }
  function total(item) {
    const subtotal = [...item.prices.values()].reduce((sum, row) => sum + Number(row.precio), 0);
    return subtotal + (mode === 'delivery' ? Number(item.store.costo_delivery || 0) : 0);
  }
  function card(item, recommendation) {
    const subtotal = [...item.prices.values()].reduce((sum, row) => sum + Number(row.precio), 0);
    const store = item.store;
    const distance = kmTo(store.latitud, store.longitud);
    return '<article class="card' + (recommendation ? ' recommended' : '') + '">' +
      '<h3>' + esc(store.nombre) + '</h3>' +
      (/demo/i.test(store.nombre) ? '<span class="pill sample">Datos de ejemplo</span>' : '') +
      (userLocation && Number.isFinite(distance) ? '<p>A ' + distance.toLocaleString('es-AR', {maximumFractionDigits:1}) + ' km aproximadamente</p>' : '') +
      '<div>' + [...item.prices.values()].map(row =>
        '<div>' + esc(row.productos.nombre) + ': $' + money(row.precio) + '</div>').join('') + '</div>' +
      (mode === 'delivery' ? '<p>Productos: $' + money(subtotal) + ' · Envío: $' + money(store.costo_delivery || 0) + '</p>' : '') +
      '<p class="basket-total">Total ' + (mode === 'delivery' ? 'con delivery' : 'para retirar') + ': $' + money(total(item)) + '</p>' +
      (phone(store.whatsapp) ? '<a class="contact" target="_blank" rel="noopener noreferrer" href="https://wa.me/' +
        phone(store.whatsapp) + '">Consultar por WhatsApp</a> ' : '') +
      (mapsUrl(store) ? '<a class="contact" target="_blank" rel="noopener noreferrer" href="' +
        esc(mapsUrl(store)) + '">Cómo llegar · Google Maps</a>' : '') +
      '</article>';
  }
  function partialCard(item, names) {
    const available = [...item.prices.values()];
    const missing = names.filter(product => !item.prices.has(product.id));
    const store = item.store;
    const distance = kmTo(store.latitud, store.longitud);
    const subtotal = available.reduce((sum, row) => sum + Number(row.precio), 0);
    return '<article class="card"><h3>' + esc(store.nombre) + '</h3>' +
      '<p><strong>Tiene ' + available.length + ' de ' + names.length + ' productos elegidos</strong></p>' +
      (userLocation && Number.isFinite(distance) ? '<p>A ' +
        distance.toLocaleString('es-AR',{maximumFractionDigits:1}) + ' km aproximadamente</p>' : '') +
      '<div>' + available.map(row => '<div>' + esc(row.productos.nombre) + ': $' +
        money(row.precio) + '</div>').join('') + '</div>' +
      '<p>Falta: ' + missing.map(product => esc(product.name)).join(', ') + '.</p>' +
      '<p><strong>Subtotal de los productos disponibles: $' + money(subtotal) +
        '</strong> · No es el total de tu compra.</p>' +
      (phone(store.whatsapp) ? '<a class="contact" target="_blank" rel="noopener noreferrer" href="https://wa.me/' +
        phone(store.whatsapp) + '">Consultar disponibilidad por WhatsApp</a> ' : '') +
      (mapsUrl(store) ? '<a class="contact" target="_blank" rel="noopener noreferrer" href="' +
        esc(mapsUrl(store)) + '">Cómo llegar · Google Maps</a>' : '') +
      '</article>';
  }
  function renderPurchase() {
    jump.hidden = !selected.size;
    jump.textContent = 'Comparar mi compra (' + selected.size + ')';
    if (!selected.size) {
      container.innerHTML = '<p>Buscá un producto y tocá “Elegir para comparar”. Si elegís varios, veremos qué comercio reúne toda tu compra y cuánto cuesta allí.</p>';
      return;
    }
    if (!rows.length) {
      container.innerHTML = statusEl.textContent === 'No se pudo consultar la base de datos.' ?
        '<p>No pudimos actualizar los precios. Revisá tu conexión y recargá la app.</p>' :
        pricesLoaded ? '<p>Todavía no hay productos disponibles para comparar.</p>' :
        '<p>Cargando precios para comparar tu compra…</p>';
      return;
    }
    const products = new Map(rows.filter(row => row.productos?.id)
      .map(row => [row.productos.id, row.productos]));
    const names = [...selected].map(id => ({id, name: products.get(id)?.nombre || 'Producto no disponible'}));
    const stores = new Map();
    for (const row of rows) {
      const productId = row.productos?.id, storeId = row.comercios?.id;
      if (!selected.has(productId) || !storeId || Number(row.stock) <= 0) continue;
      if (mode === 'delivery' && !row.comercios.hace_delivery) continue;
      if (!Number.isFinite(Number(row.precio)) || Number(row.precio) < 0) continue;
      if (!stores.has(storeId)) stores.set(storeId, {store:row.comercios, prices:new Map()});
      const prices = stores.get(storeId).prices;
      if (!prices.has(productId) || Number(row.precio) < Number(prices.get(productId).precio))
        prices.set(productId, row);
    }
    const complete = [...stores.values()].filter(item => item.prices.size === selected.size);
    const real = complete.filter(item => !/demo/i.test(item.store.nombre)).sort((a,b) => total(a)-total(b));
    const examples = complete.filter(item => /demo/i.test(item.store.nombre)).sort((a,b) => total(a)-total(b));
    const partial = [...stores.values()].filter(item => !/demo/i.test(item.store.nombre) &&
      item.prices.size > 0 && item.prices.size < selected.size)
      .sort((a,b) => b.prices.size-a.prices.size ||
        a.store.nombre.localeCompare(b.store.nombre,'es'));
    const savings = real.length > 1 ? total(real[1])-total(real[0]) : 0;
    container.innerHTML =
      '<div class="basket-items">' + names.map(item =>
        '<button type="button" data-remove-list="' + esc(item.id) +
        '" aria-label="Quitar ' + esc(item.name) + ' de la compra">' +
        esc(item.name) + ' ×</button>').join('') + '</div>' +
      '<fieldset class="basket-mode"><legend>¿Cómo querés comprar?</legend>' +
      '<label><input type="radio" name="purchase-mode" value="pickup"' + (mode === 'pickup' ? ' checked' : '') + '> Retiro en el local</label>' +
      '<label><input type="radio" name="purchase-mode" value="delivery"' + (mode === 'delivery' ? ' checked' : '') + '> Con delivery</label></fieldset>' +
      (real.length ?
        '<p class="recommendation">' +
        (real.length === 1 ? 'Este comercio reúne toda tu compra:' :
          'El comercio con el menor total para tu compra:' +
          (savings > 0 ? ' Ahorrás $' + money(savings) + ' frente al siguiente.' : '')) + '</p>' +
        card(real[0], true) +
        (real.length > 1 ? '<details><summary>Ver otros ' + (real.length-1) + ' comercios</summary>' +
          real.slice(1).map(item => card(item, false)).join('') + '</details>' : '') :
        '<p role="status">Todavía ningún comercio real ' +
        (mode === 'delivery' ? 'con delivery ' : '') +
        'tiene todos estos productos con stock.</p>' +
        (partial.length ? '<p>Estos locales tienen parte de tu compra. Podés consultarles por los productos que faltan:</p>' +
          partial.slice(0,3).map(item => partialCard(item,names)).join('') : 
          '<p>Probá cambiar la modalidad o los productos elegidos.</p>')) +
      (examples.length ? '<details><summary>Ver ejemplo de comparación con datos de prueba</summary>' +
        '<p>Estos comercios son de demostración; sus precios no son ofertas reales.</p>' +
        examples.map(item => card(item, false)).join('') + '</details>' : '');
  }
  document.getElementById('results').addEventListener('click', event => {
    const button = event.target.closest('[data-list-product]');
    if (!button) return;
    const id = button.dataset.listProduct;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return;
    if (selected.has(id)) selected.delete(id);
    else if (selected.size < 20) selected.add(id);
    else { alert('Podés comparar hasta 20 productos por ahora.'); return; }
    save(); renderPurchase(); render();
  });
  container.addEventListener('click', event => {
    const button = event.target.closest('[data-remove-list]');
    if (!button) return;
    selected.delete(button.dataset.removeList);
    save(); renderPurchase(); render();
  });
  container.addEventListener('change', event => {
    if (event.target.name !== 'purchase-mode') return;
    mode = event.target.value === 'delivery' ? 'delivery' : 'pickup';
    try { localStorage.setItem(MODE_KEY, mode); } catch {}
    renderPurchase();
  });
  jump.addEventListener('click', () => document.getElementById('basket').scrollIntoView({behavior:'smooth',block:'start'}));
  window.PrecioCercaList = {has: id => selected.has(id)};
  window.addEventListener('preciocerca:prices-loaded', renderPurchase);
  window.addEventListener('preciocerca:prices-failed', renderPurchase);
  renderPurchase();
})();