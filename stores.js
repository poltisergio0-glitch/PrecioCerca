(() => {
  const $ = id => document.getElementById(id);
  let stores = [];
  window.selectedStoreId = null;
  function renderStores() {
    const q = $('store-q').value.trim().toLocaleLowerCase('es-AR');
    const shown = stores.filter(store =>
      ($('show-examples').checked || !/demo/i.test(store.nombre)) && (store.nombre + ' ' + (store.direccion || '')).toLocaleLowerCase('es-AR').includes(q));
    if (userLocation) shown.sort((a, b) =>
      kmTo(a.latitud, a.longitud) - kmTo(b.latitud, b.longitud));
    $('store-status').textContent = shown.length + ' ' +
      (shown.length === 1 ? 'comercio' : 'comercios') +
      (userLocation ? ' · ordenados por cercanía' : '');
    $('store-results').innerHTML = shown.length ? shown.map(store => {
      const distance = kmTo(store.latitud, store.longitud);
      const whatsapp = phone(store.whatsapp);
      const maps = mapsUrl(store);
      return '<article class="card store-card">' +
        '<h3>' + esc(store.nombre) + '</h3>' +
        (/demo/i.test(store.nombre) ? '<span class="pill sample">Comercio de ejemplo</span>' : '') +
        (store.direccion ? '<p>' + esc(store.direccion) + '</p>' : '') +
        '<div class="meta">' +
        (userLocation && Number.isFinite(distance) ?
          '<span class="pill">A ' + distance.toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' km</span>' : '') +
        '<span class="pill">' + (store.hace_delivery ?
          'Delivery $' + money(store.costo_delivery || 0) : 'Sin delivery') + '</span></div>' +
        '<button type="button" data-store-id="' + esc(store.id) + '">Ver sus productos</button>' +
        '<div>' +
        (whatsapp ? '<a class="contact" target="_blank" rel="noopener noreferrer" href="https://wa.me/' +
          whatsapp + '">WhatsApp</a>' : '') +
        (maps ? '<a class="contact" target="_blank" rel="noopener noreferrer" href="' +
          esc(maps) + '">Cómo llegar · Google Maps</a>' : '') +
        '</div></article>';
    }).join('') : '<div class="empty">No encontramos comercios con esa búsqueda.</div>';
  }
  async function loadStores() {
    try {
      const url = SUPABASE_URL + '/rest/v1/comercios?select=id,nombre,direccion,whatsapp,latitud,longitud,hace_delivery,costo_delivery&activo=eq.true&order=nombre.asc';
      const response = await fetch(url, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
      if (!response.ok) throw new Error(await response.text());
      stores = await response.json();
      renderStores();
      showSelected();
    } catch (error) {
      $('store-status').textContent = 'No se pudieron cargar los comercios. Intentá recargar la página.';
      console.error(error);
    }
  }
  function showSelected() {
    const chosen = stores.find(store => store.id === window.selectedStoreId);
    $('selected-store').hidden = !window.selectedStoreId;
    $('selected-store').replaceChildren();
    if (!window.selectedStoreId) return;
    $('selected-store').append('Viendo productos de ');
    const name = document.createElement('strong');
    name.textContent = chosen?.nombre || 'este comercio';
    $('selected-store').append(name, ' · ');
    const clear = document.createElement('button');
    clear.type = 'button'; clear.textContent = 'Ver todos los comercios';
    clear.addEventListener('click', () => {
      window.selectedStoreId = null;
      showSelected(); render();
    });
    $('selected-store').append(clear);
  }
  function showProducts(storeId) {
    if (!stores.some(store => store.id === storeId && ($('show-examples').checked || !/demo/i.test(store.nombre)))) return;
    window.selectedStoreId = storeId;
    $('q').value = '';
    $('only-offers').checked = false;
    $('only-delivery').checked = false;
    $('only-recent').checked = false;
    $('only-favorites').checked = false;
    $('radius').value = 'all';
    selectedCategory = 'Todas';
    renderCategories();
    showSelected(); render();
    $('products-title').scrollIntoView({ behavior: 'smooth' });
  }
  $('store-q').addEventListener('input', renderStores);
  $('store-results').addEventListener('click', event => {
    const button = event.target.closest('[data-store-id]');
    if (button) showProducts(button.dataset.storeId);
  });
  window.PrecioCercaStores = { showProducts, clearSelection: () => {window.selectedStoreId=null;showSelected();render()} };
  window.renderStores = renderStores;
  window.loadStores = loadStores;
  loadStores();
})();