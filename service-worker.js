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
// CAMBIO: v13 -> v14 — index.html cambió ("Pagos" se cambió por "Pagan Hoy"
// en la barra inferior, y la pantalla Pagan Hoy se rediseñó).
// CAMBIO: v14 -> v15 — index.html cambió (tarjeta de cliente con frecuencia,
// próxima cuota y pestaña lateral de color; cuotas pagadas con "Pagó X días antes/tarde").
// CAMBIO: v15 -> v16 — index.html cambió (fecha de pago de la cuota en
// su propia línea, debajo de "Vence").
// CAMBIO: v16 -> v17 — index.html cambió (bordes y anillo del avatar en
// Clientes, buscador y botón + redondo, círculos de Pagadas más marcados).
// CAMBIO: v17 -> v18 — index.html cambió (anillo del avatar más fino,
// inicial más grande y línea "Cuota" más oscura y grande en Clientes).
// CAMBIO: v18 -> v19 — index.html cambió (nota incrustada y conteo de
// cuotas más oscuro en la tarjeta del crédito).
// CAMBIO: v19 -> v20 — index.html cambió (barra de progreso de la tarjeta
// del crédito dividida en una parte por cuota).
// CAMBIO: v20 -> v21 — index.html cambió (barritas de la barra de progreso
// con número, gris incrustado y globito con valor y fecha al tocarlas).
// CAMBIO: v21 -> v22 — index.html cambió (tocar de nuevo la misma barrita
// esconde el globito).
// CAMBIO: v22 -> v23 — index.html cambió (los modales desenfocan el
// fondo al abrirse).
// CAMBIO: v23 -> v24 — index.html cambió (modales más pequeños y fondo
// congelado mientras hay un modal abierto).
// CAMBIO: v24 -> v25 — index.html cambió (menús centrados con el estilo de
// la imagen de referencia, encabezado en el menú de la cuota, "Cerrar").
// CAMBIO: v25 -> v26 — index.html cambió (cinta de alerta de mora en las
// tarjetas del cliente y del crédito).
// CAMBIO: v26 -> v27 — index.html cambió (en la tarjeta del crédito la
// cinta de alerta va justo debajo del monto otorgado).
// CAMBIO: v27 -> v28 — index.html corregido (barra por cuotas solo se llena
// con cuotas pagadas completas; "Quitar Nota" sí borra la nota; la nota
// también se ve en el Detalle del Préstamo).
// CAMBIO: v28 -> v29 — index.html cambió (barritas de cuotas vencidas en rojo).
const CACHE_NAME = 'crediya-v29';

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
