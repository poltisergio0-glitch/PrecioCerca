(() => {
  const API = 'https://kgrnpypzounvgphjdrjg.supabase.co/auth/v1';
  const KEY = 'sb_publishable_3bnREPlK6nB7l5ISLX5wDg_WdaMYIX_';
  const storageKey = 'preciocerca.session';
  const $ = id => document.getElementById(id);
  let session = null;
  const notice = message => { $('auth-message').textContent = message; };
  async function request(path, data, accessToken) {
    const response = await fetch(API + path, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}) },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.msg || result.error_description || result.message || 'No se pudo completar la solicitud.');
    return result;
  }
  function show() {
    const active = Boolean(session?.access_token);
    $('auth-in').hidden = !active;
    $('auth-out').hidden = active;
    $('auth-user').textContent = active ? (session.user?.user_metadata?.nombre || session.user?.email || 'Tu cuenta') : '';
    window.dispatchEvent(new Event('preciocerca:session'));
  }
  function save(result) {
    session = {
      access_token: result.access_token, refresh_token: result.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (result.expires_in || 3600),
      user: result.user
    };
    localStorage.setItem(storageKey, JSON.stringify(session));
    show();
  }
  async function getSession() {
    if (!session?.refresh_token) return null;
    if (session.expires_at <= Math.floor(Date.now() / 1000) + 60) {
      try { save(await request('/token?grant_type=refresh_token', { refresh_token: session.refresh_token })); }
      catch (_) { localStorage.removeItem(storageKey); session = null; show(); return null; }
    }
    return session;
  }
  window.PrecioCercaAuth = { getSession };
  async function restore() {
    try {
      session = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (!session?.refresh_token) { session = null; show(); return; }
      if (session.expires_at <= Math.floor(Date.now() / 1000) + 60)
        save(await request('/token?grant_type=refresh_token', { refresh_token: session.refresh_token }));
      else show();
    } catch (_) {
      localStorage.removeItem(storageKey); session = null; show();
      notice('Tu sesión venció. Ingresá de nuevo.');
    }
  }
  $('auth-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = $('auth-login'); button.disabled = true;
    try {
      const result = await request('/token?grant_type=password', {
        email: $('auth-email').value.trim(), password: $('auth-password').value
      });
      save(result); notice('Ingresaste correctamente.');
    } catch (error) { notice(error.message); }
    finally { button.disabled = false; }
  });
  $('auth-signup').addEventListener('click', async () => {
    if (!$('auth-form').reportValidity()) return;
    const nombre = $('auth-name').value.trim();
    if (!nombre) { notice('Escribí tu nombre para crear la cuenta.'); $('auth-name').focus(); return; }
    if ($('auth-password').value.length < 8) {
      notice('Para crear una cuenta usá una contraseña de al menos 8 caracteres.');
      $('auth-password').focus(); return;
    }
    const button = $('auth-signup'); button.disabled = true;
    try {
      const result = await request('/signup', {
        email: $('auth-email').value.trim(),
        password: $('auth-password').value,
        data: { nombre }
      });
      if (result.access_token) { save(result); notice('Cuenta creada.'); }
      else notice('Revisá tu correo y confirmá la cuenta. Después volvé para ingresar.');
    } catch (error) { notice(error.message); }
    finally { button.disabled = false; }
  });
  $('auth-logout').addEventListener('click', async () => {
    const token = session?.access_token;
    localStorage.removeItem(storageKey); session = null; show();
    notice('Saliste de tu cuenta.');
    if (token) try { await request('/logout', {}, token); }
    catch (error) { console.warn('La sesión local ya se cerró.', error); }
  });
  $('auth-delete').addEventListener('click', async () => {
    const current = await getSession();
    if (!current) { notice('Ingresá para solicitar la eliminación de tu cuenta.'); return; }
    if (!confirm('¿Solicitar la eliminación de tu cuenta, locales, productos publicados y datos asociados? Esta solicitud será irreversible una vez procesada.')) return;
    const button = $('auth-delete'); button.disabled = true;
    try {
      const response = await fetch('https://kgrnpypzounvgphjdrjg.supabase.co/rest/v1/solicitudes_eliminacion', {
        method:'POST', headers:{apikey:KEY, Authorization:'Bearer '+current.access_token,
          'Content-Type':'application/json', Prefer:'resolution=ignore-duplicates,return=minimal'},
        body:JSON.stringify({usuario_id:current.user.id})
      });
      if (!response.ok) throw new Error('No pudimos registrar la solicitud. Intentá de nuevo.');
      notice('Solicitud registrada. Eliminaremos tu cuenta y sus datos asociados; podés cerrar sesión.');
    } catch (error) { notice(error.message); }
    finally { button.disabled = false; }
  });
  restore();
})();
