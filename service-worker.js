// Service worker de CrediYa — Sistema de Préstamos.
// Cachea el "app shell" (los archivos que hacen que la app abra y
// funcione) para que la app cargue sin conexión después de la primera
// visita. Los datos de clientes/créditos/abonos NO viven acá: esos
// siguen guardados en localStorage dentro de la propia app.

// IMPORTANTE: cuando subas una nueva versión de index.html al
// repositorio, sube también la versión del número de acá abajo
// (ej. 'crediya-v3', 'crediya-v4'...). Eso obliga a los teléfonos
// que ya instalaron la app a bajar los archivos nuevos en vez de
// seguir usando la copia vieja guardada en caché.
// CAMBIO: v1 -> v2 — se subió acá porque index.html tuvo bastantes
// cambios (colores de marca, tarjetas de Inicio, Simulador, etc.) y las
// fuentes Inter/Baloo 2 dejaron de cargarse desde Google Fonts para
// quedar autoalojadas en ./fonts (ver ARCHIVOS_APP_SHELL más abajo).
// CAMBIO: v7 -> v8 — index.html cambió (el modal de compartir al
// guardar un préstamo ahora se abre centrado, no pegado abajo).
// CAMBIO: v8 -> v9 — index.html cambió (se rediseñó la tarjeta de
// préstamo: encabezado con nombre del cliente, insignia en mayúsculas
// con punto, monto más grande, fila "Total a pagar", colores de
// "Total abonado"/"Saldo pendiente" y porcentaje de progreso).
// CAMBIO: v9 -> v10 — index.html cambió (en el comprobante de un
// recargo por mora, la fila de monto ya no dice "Valor abonado": ahora
// dice "Recargo pagado", y se agregó la fila "Estado: Recargo
// registrado" — antes esa fila no existía para un recargo).
// CAMBIO: v10 -> v11 — index.html cambió (el comprobante de recargo y
// el de un abono parcial ahora muestran "Cuota: X de Y" con el conteo de
// cuotas pagadas en su totalidad, no el número de la cuota en curso).
// CAMBIO: v11 -> v12 — index.html cambió (borde más remarcado en la
// tarjeta del crédito).
// CAMBIO: v12 -> v13 — index.html cambió (rediseño completo de la
// pantalla "Nuevo Préstamo").
const CACHE_NAME = 'crediya-v13';

const ARCHIVOS_APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-192-maskable.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './fonts/inter-400.woff2',
  './fonts/inter-500.woff2',
  './fonts/inter-600.woff2',
  './fonts/inter-700.woff2',
  './fonts/inter-800.woff2',
  './fonts/baloo2-500.woff2',
  './fonts/baloo2-600.woff2',
  './fonts/baloo2-700.woff2',
  './fonts/baloo2-800.woff2'
];

// ---- Instalación: descarga y guarda el app shell en caché ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ARCHIVOS_APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ---- Activación: borra cachés de versiones anteriores ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((nombre) => nombre !== CACHE_NAME)
          .map((nombre) => caches.delete(nombre))
      )
    ).then(() => self.clients.claim())
  );
});

// ---- Peticiones: primero caché, si no existe va a la red ----
// Si la red falla (sin conexión) y el archivo ya estaba en caché,
// la app sigue abriendo con esa copia guardada.
self.addEventListener('fetch', (event) => {
  // Solo maneja peticiones GET del propio origen (deja pasar cualquier
  // otra petición externa normalmente, sin intentar cachearla).
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((respuestaCache) => {
      if (respuestaCache) return respuestaCache;

      return fetch(event.request)
        .then((respuestaRed) => {
          // Guarda en caché una copia de los archivos propios (mismo
          // origen) para que la próxima vez también funcionen offline.
          const esMismoOrigen = event.request.url.startsWith(self.location.origin);
          if (esMismoOrigen && respuestaRed && respuestaRed.status === 200) {
            const copia = respuestaRed.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
          }
          return respuestaRed;
        })
        .catch(() => {
          // Sin conexión y sin copia en caché: si pedían una página,
          // devuelve al menos el index como último recurso.
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
