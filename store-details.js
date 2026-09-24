(() => {
  const dialog = document.getElementById('store-detail');
  const content = document.getElementById('detail-content');
  function openDetails(card) {
    const row = rows.find(item =>
      item.comercios?.id === card?.dataset.priceStore &&
      item.productos?.id === card?.dataset.priceProduct);
    if (!row) return;
    const store = row.comercios, maps = mapsUrl(store), whatsapp = phone(store.whatsapp);
    const distance = kmTo(store.latitud, store.longitud);
    const address = store.direccion?.trim() ||
      (maps ? 'Ubicación guardada con GPS.' : 'El comercio aún no cargó su ubicación.');
    content.innerHTML =
      '<h2 id="detail-title">' + esc(store.nombre) + '</h2>' +
      (/demo/i.test(store.nombre) ? '<span class="pill sample">Comercio de ejemplo</span>' : '') +
      (store.descripcion ? '<p>' + esc(store.descripcion) + '</p>' : '') +
      '<p><strong>' + esc(row.productos?.nombre || 'Producto') +
      ': $' + money(row.precio) + '</strong> · Stock: ' + (row.stock ?? 0) + '</p>' +
      '<p><strong>Dirección:</strong> ' + esc(address) + '</p>' +
      (userLocation && Number.isFinite(distance) ?
        '<p>A ' + distance.toLocaleString('es-AR', { maximumFractionDigits: 1 }) +
        ' km aproximadamente en línea recta.</p>' : '') +
      (store.horario ? '<p><strong>Horario:</strong> ' + esc(store.horario) + '</p>' : '') +
      '<p><strong>Delivery:</strong> ' +
      (store.hace_delivery ? 'Sí · $' + money(store.costo_delivery || 0) : 'No') + '</p>' +
      (!maps ? '<p>Cuando el comercio cargue su ubicación, podrás abrir la ruta en Google Maps.</p>' : '') +
      '<div class="detail-actions">' +
      (maps ? '<a href="' + esc(maps) +
        '" target="_blank" rel="noopener noreferrer">📍 Cómo llegar con Google Maps</a>' : '') +
      (whatsapp ? '<a href="https://wa.me/' + whatsapp +
        '" target="_blank" rel="noopener noreferrer">Consultar por WhatsApp</a>' : '') +
      (!whatsapp && phone(store.telefono) ? '<a href="tel:+' + phone(store.telefono) +
        '">Llamar al comercio</a>' : '') +
      '<button type="button" id="detail-products">Ver productos del comercio</button></div>';
    document.getElementById('detail-products').onclick = () => {
      dialog.close();
      window.PrecioCercaStores.showProducts(store.id);
    };
    dialog.showModal();
  }
  document.getElementById('results').addEventListener('click', event => {
    const card = event.target.closest('[data-price-store]');
    if (!card || (!event.target.closest('[data-open-details]') &&
        event.target.closest('a,button'))) return;
    openDetails(card);
  });
  document.getElementById('results').addEventListener('keydown', event => {
    const card = event.target.closest('[data-price-store]');
    if (card && event.target === card && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      openDetails(card);
    }
  });
  document.getElementById('detail-close').onclick = () => dialog.close();
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
})();