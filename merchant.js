(() => {
  const BASE = 'https://kgrnpypzounvgphjdrjg.supabase.co/rest/v1';
  const KEY = 'sb_publishable_3bnREPlK6nB7l5ISLX5wDg_WdaMYIX_';
  const $ = id => document.getElementById(id);
  let stores = [];
  function message(text) { $('merchant-message').textContent = text; }
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
    if (!session) { stores = []; return; }
    try {
      const prior = $('merchant-store').value;
      stores = await api('/comercios?select=id,nombre&activo=eq.true&propietario_id=eq.' + encodeURIComponent(session.user.id) + '&order=nombre.asc');
      $('merchant-store').replaceChildren(new Option('Elegí un local', ''));
      stores.forEach(store => $('merchant-store').add(new Option(store.nombre, store.id)));
      if (stores.some(store => store.id === prior)) $('merchant-store').value = prior;
      const products = await api('/productos?select=id,nombre,marca&activo=eq.true&order=nombre.asc');
      $('merchant-product').replaceChildren(new Option('Nuevo producto', ''));
      products.forEach(product => $('merchant-product').add(new Option(product.nombre + (product.marca ? ' · ' + product.marca : ''), product.id)));
      message(stores.length ? 'Elegí tu local para cargar un precio.' : 'Registrá tu local para comenzar.');
    } catch (error) { message(error.message); }
  }
  $('merchant-store-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = $('merchant-store-save'); button.disabled = true;
    try {
      const session = await window.PrecioCercaAuth.getSession();
      if (!session) throw new Error('Ingresá a tu cuenta primero.');
      const whatsapp = $('merchant-whatsapp').value.replace(/\D/g, '');
      if (whatsapp && (whatsapp.length < 8 || whatsapp.length > 15)) throw new Error('Escribí WhatsApp con código de país y solo números.');
      const delivery = $('merchant-delivery').checked;
      const result = await api('/comercios', { method: 'POST', body: {
        propietario_id: session.user.id,
        nombre: $('merchant-store-name').value.trim(),
        direccion: $('merchant-address').value.trim(),
        whatsapp: whatsapp || null,
        hace_delivery: delivery,
        costo_delivery: delivery ? Number($('merchant-delivery-cost').value || 0) : 0
      } });
      $('merchant-store-form').reset();
      await refresh();
      $('merchant-store').value = result[0].id;
      message('Local registrado. Ya podés cargar productos.');
    } catch (error) { message(error.message); }
    finally { button.disabled = false; }
  });
  $('merchant-price-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = $('merchant-price-save'); button.disabled = true;
    try {
      const storeId = $('merchant-store').value;
      if (!stores.some(store => store.id === storeId)) throw new Error('Elegí tu local primero.');
      let productId = $('merchant-product').value;
      if (!productId) {
        const nombre = $('merchant-product-name').value.trim();
        if (!nombre) throw new Error('Elegí un producto existente o escribí el nombre de uno nuevo.');
        const created = await api('/productos', { method: 'POST', body: {
          nombre, marca: $('merchant-brand').value.trim() || null,
          imagen: $('merchant-image').value.trim() || null
        } });
        productId = created[0].id;
      }
      await api('/precios?on_conflict=producto_id,comercio_id', { method: 'POST', upsert: true, body: {
        producto_id: productId, comercio_id: storeId,
        precio: Number($('merchant-price').value),
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
