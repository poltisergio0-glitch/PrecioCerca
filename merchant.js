(() => {
  const BASE = 'https://kgrnpypzounvgphjdrjg.supabase.co/rest/v1';
  const KEY = 'sb_publishable_3bnREPlK6nB7l5ISLX5wDg_WdaMYIX_';
  const $ = id => document.getElementById(id);
  let stores = [], pendingLocation = null;
  function message(text) { $('merchant-message').textContent = text; }
  function fillEditForm() {
    const store = stores.find(item => item.id === $('merchant-edit-store').value);
    $('merchant-edit-name').value = store?.nombre || '';
    $('merchant-edit-address').value = store?.direccion || '';
    $('merchant-edit-whatsapp').value = store?.whatsapp || '';
    $('merchant-edit-delivery').checked = Boolean(store?.hace_delivery);
    $('merchant-edit-delivery-cost').value = store?.hace_delivery ? store.costo_delivery ?? 0 : '';
  }
  async function api(path, options = {}) {
    const session = await window.PrecioCercaAuth.getSession();
    if (!session) throw new Error('Ingresá a tu cuenta para administrar un comercio.');
    const response = await fetch(BASE + path, {
      method: options.method || 'GET',
      headers: { apikey: KEY, Authorization: 'Bearer ' + session.access_token,
        'Content-Type': 'application/json', Prefer: 'return=representation',
        ...(options.upsert ? { Prefer: 'resolution=merge-duplicates,return=representation' } : {}) },
      ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || 'No se pudo guardar. Intentá otra vez.');
    return body;
  }
  async function refresh() {
    const session = await window.PrecioCercaAuth.getSession();
    $('merchant-panel').hidden = !session;
    if (!session) { stores = []; $('merchant-edit-store').value = ''; fillEditForm(); return; }
    try {
      const prior = $('merchant-store').value;
      const priorEdit = $('merchant-edit-store').value;
      stores = await api('/comercios?select=id,nombre,direccion,whatsapp,hace_delivery,costo_delivery,latitud,longitud&activo=eq.true&propietario_id=eq.' + encodeURIComponent(session.user.id) + '&order=nombre.asc');
      $('merchant-store').replaceChildren(new Option('Elegí un local', ''));
      stores.forEach(store => $('merchant-store').add(new Option(store.nombre, store.id)));
      if (stores.some(store => store.id === prior)) $('merchant-store').value = prior;
      $('merchant-edit-store').replaceChildren(new Option('Elegí un local para editar', ''));
      stores.forEach(store => $('merchant-edit-store').add(new Option(store.nombre, store.id)));
      if (stores.some(store => store.id === priorEdit)) $('merchant-edit-store').value = priorEdit;
      fillEditForm();
      const products = await api('/productos?select=id,nombre,marca&activo=eq.true&order=nombre.asc');
      $('merchant-product').replaceChildren(new Option('Nuevo producto', ''));
      products.forEach(product => $('merchant-product').add(new Option(product.nombre + (product.marca ? ' · ' + product.marca : ''), product.id)));
      message(stores.length ? 'Elegí tu local para cargar un precio.' : 'Registrá tu local para comenzar.');
    } catch (error) { message(error.message); }
  }
  $('merchant-edit-store').addEventListener('change', fillEditForm);
  $('merchant-edit-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = $('merchant-edit-save'); button.disabled = true;
    try {
      const storeId = $('merchant-edit-store').value;
      const original = stores.find(store => store.id === storeId);
      if (!original) throw new Error('Elegí un local propio para editar.');
      const nombre = $('merchant-edit-name').value.trim();
      const direccion = $('merchant-edit-address').value.trim();
      const whatsapp = $('merchant-edit-whatsapp').value.replace(/\D/g, '');
      const delivery = $('merchant-edit-delivery').checked;
      const cost = Number($('merchant-edit-delivery-cost').value || 0);
      if (!nombre) throw new Error('Escribí el nombre del comercio.');
      if (!direccion && (original.latitud == null || original.longitud == null))
        throw new Error('Escribí la dirección o actualizá el GPS del local.');
      if (whatsapp && (whatsapp.length < 8 || whatsapp.length > 15))
        throw new Error('Escribí WhatsApp con código de país y solo números.');
      if (!Number.isFinite(cost) || cost < 0) throw new Error('Ingresá un costo de delivery válido.');
      const updated = await api('/comercios?id=eq.' + encodeURIComponent(storeId), {
        method: 'PATCH',
        body: { nombre, direccion, whatsapp: whatsapp || null,
          hace_delivery: delivery, costo_delivery: delivery ? cost : 0 }
      });
      if (!updated.length) throw new Error('No se pudo actualizar el local. Volvé a intentarlo.');
      await refresh();
      message('Datos del local actualizados.');
      window.dispatchEvent(new Event('preciocerca:prices-updated'));
    } catch (error) { message(error.message); }
    finally { button.disabled = false; }
  });
  function getPosition() {
    if (!navigator.geolocation) return Promise.reject(new Error('Este navegador no permite obtener la ubicación.'));
    return new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject,
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
  }
  $('merchant-new-gps').addEventListener('click', async () => {
    const button = $('merchant-new-gps'); button.disabled = true;
    pendingLocation = null;
    $('merchant-new-gps-status').textContent = 'Buscando tu ubicación…';
    try {
      const position = await getPosition();
      if (position.coords.accuracy > 1000)
        throw new Error('La ubicación es poco precisa. Activá el GPS e intentá nuevamente.');
      pendingLocation = { latitud: position.coords.latitude, longitud: position.coords.longitude };
      $('merchant-new-gps-status').textContent = 'GPS listo. Se guardará junto con el local.';
    } catch (error) {
      $('merchant-new-gps-status').textContent = error.code === 1 ?
        'Permití la ubicación en el navegador para continuar.' :
        (error.message || 'No se pudo obtener la ubicación.');
    } finally { button.disabled = false; }
  });
  $('merchant-geolocate').addEventListener('click', async () => {
    const storeId = $('merchant-store').value;
    if (!stores.some(store => store.id === storeId)) { message('Elegí tu local primero.'); return; }
    if (!navigator.geolocation) { message('Este navegador no permite obtener la ubicación.'); return; }
    const button = $('merchant-geolocate'); button.disabled = true;
    message('Buscando la ubicación del local…');
    try {
      const position = await getPosition();
      if (position.coords.accuracy > 1000)
        throw new Error('La ubicación es poco precisa. Activá el GPS e intentá nuevamente.');
      await api('/comercios?id=eq.' + encodeURIComponent(storeId), { method: 'PATCH',
        body: { latitud: position.coords.latitude, longitud: position.coords.longitude } });
      message('Ubicación guardada. La distancia será aproximada en línea recta.');
      window.dispatchEvent(new Event('preciocerca:prices-updated'));
    } catch (error) {
      message(error.code === 1 ? 'Permití la ubicación en el navegador para continuar.' :
        (error.message || 'No se pudo obtener la ubicación.'));
    } finally { button.disabled = false; }
  });
  $('merchant-store-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = $('merchant-store-save'); button.disabled = true;
    try {
      const session = await window.PrecioCercaAuth.getSession();
      if (!session) throw new Error('Ingresá a tu cuenta primero.');
      const whatsapp = $('merchant-whatsapp').value.replace(/\D/g, '');
      if (whatsapp && (whatsapp.length < 8 || whatsapp.length > 15)) throw new Error('Escribí WhatsApp con código de país y solo números.');
      if (!$('merchant-address').value.trim() && !pendingLocation)
        throw new Error('Escribí la dirección o usá el GPS para ubicar el local.');
      const delivery = $('merchant-delivery').checked;
      const result = await api('/comercios', { method: 'POST', body: {
        propietario_id: session.user.id,
        nombre: $('merchant-store-name').value.trim(),
        direccion: $('merchant-address').value.trim(),
        whatsapp: whatsapp || null,
        hace_delivery: delivery,
        costo_delivery: delivery ? Number($('merchant-delivery-cost').value || 0) : 0,
        ...(pendingLocation || {})
      } });
      $('merchant-store-form').reset();
      pendingLocation = null;
      $('merchant-new-gps-status').textContent = 'Opcional. Hacelo cuando estés en el local.';
      await refresh();
      $('merchant-store').value = result[0].id;
      $('merchant-edit-store').value = result[0].id;
      fillEditForm();
      message('Local registrado. Ya podés cargar productos.');
    } catch (error) { message(error.message); }
    finally { button.disabled = false; }
  });
  async function uploadPhoto(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
      throw new Error('Elegí una imagen JPG, PNG o WebP.');
    if (file.size > 2097152) throw new Error('La foto debe pesar hasta 2 MB.');
    const session = await window.PrecioCercaAuth.getSession();
    if (!session) throw new Error('Ingresá a tu cuenta para subir una foto.');
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
    const path = session.user.id + '/' + crypto.randomUUID() + '.' + ext;
    const response = await fetch('https://kgrnpypzounvgphjdrjg.supabase.co/storage/v1/object/fotos-productos/' + path, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + session.access_token,
        'Content-Type': file.type, 'cache-control': '3600' },
      body: file
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'No se pudo subir la foto. Intentá de nuevo.');
    }
    return 'https://kgrnpypzounvgphjdrjg.supabase.co/storage/v1/object/public/fotos-productos/' + path;
  }
  $('merchant-price-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = $('merchant-price-save'); button.disabled = true;
    try {
      const storeId = $('merchant-store').value;
      if (!stores.some(store => store.id === storeId)) throw new Error('Elegí tu local primero.');
      const price = Number($('merchant-price').value);
      const enteredPrevious = $('merchant-previous-price').value.trim();
      const offer = $('merchant-offer').checked;
      if (enteredPrevious && !offer) throw new Error('Marcá “Está en oferta” para indicar un precio anterior.');
      if (enteredPrevious && Number(enteredPrevious) <= price)
        throw new Error('El precio anterior de una oferta debe ser mayor al precio actual.');
      let productId = $('merchant-product').value;
      const photo = $('merchant-photo').files[0];
      if (productId && photo) throw new Error('La foto se agrega al crear un producto nuevo. Elegí “Nuevo producto”.');
      if (!productId) {
        const nombre = $('merchant-product-name').value.trim();
        if (!nombre) throw new Error('Elegí un producto existente o escribí el nombre de uno nuevo.');
        if (photo && $('merchant-image').value.trim()) throw new Error('Elegí una foto o un enlace, no ambos.');
        if (photo) message('Subiendo foto del producto…');
        const image = photo ? await uploadPhoto(photo) : $('merchant-image').value.trim() || null;
        const created = await api('/productos', { method: 'POST', body: {
          nombre, marca: $('merchant-brand').value.trim() || null,
          imagen: image
        } });
        productId = created[0].id;
      }
      const existing = await api('/precios?select=precio,precio_anterior&producto_id=eq.' +
        encodeURIComponent(productId) + '&comercio_id=eq.' + encodeURIComponent(storeId) + '&limit=1');
      const previous = enteredPrevious ? Number(enteredPrevious) :
        existing.length && Number(existing[0].precio) !== price ? Number(existing[0].precio) :
        (existing[0]?.precio_anterior == null ? null : Number(existing[0].precio_anterior));
      await api('/precios?on_conflict=producto_id,comercio_id', { method: 'POST', upsert: true, body: {
        producto_id: productId, comercio_id: storeId,
        precio: price, precio_anterior: previous,
        stock: Number($('merchant-stock').value),
        en_oferta: $('merchant-offer').checked,
        actualizado_at: new Date().toISOString()
      } });
      $('merchant-price-form').reset();
      await refresh();
      $('merchant-store').value = storeId;
      message('Precio guardado. Ya aparece en la búsqueda.');
      window.dispatchEvent(new Event('preciocerca:prices-updated'));
    } catch (error) { message(error.message); }
    finally { button.disabled = false; }
  });
  window.addEventListener('preciocerca:session', refresh);
  refresh();
})();
