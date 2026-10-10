// Cliente del backend (Google Apps Script). La IA y la base de datos viven allí; aquí no hay claves.
(function () {
  const API = {
    token: '',
    onUsage: null,
    async call(action, body) {
      const url = (window.BIP_CONFIG || {}).API_URL;
      if (!url) throw Object.assign(new Error('Falta configurar API_URL en js/config.js (ver DESPLIEGUE.md).'), { code: 'config' });
      let res;
      try {
        // Sin cabecera content-type a propósito: evita el preflight CORS, que Apps Script no soporta.
        res = await fetch(url, { method: 'POST', body: JSON.stringify({ action, token: API.token, ...body }) });
      } catch (e) { throw Object.assign(new Error('No se pudo conectar con el servidor. Revisa tu internet.'), { code: 'network' }); }
      let d;
      try { d = await res.json(); } catch (e) { throw Object.assign(new Error('El servidor respondió algo inesperado. Revisa que la Web App esté desplegada para "Cualquier persona".'), { code: 'bad_response' }); }
      if (d.usage && API.onUsage) API.onUsage(d.usage);
      if (!d.ok) throw Object.assign(new Error(d.error || 'Error del servidor'), { code: d.code || 'error' });
      return d;
    }
  };
  window.API = API;
})();
