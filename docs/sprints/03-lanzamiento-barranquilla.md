# Sprint 03 — Lanzamiento en Barranquilla

**Ventana:** del 16 al 29 de noviembre de 2026 (hora de Bogotá). Son dos semanas: la primera para construir y la segunda para lanzar y medir.
**Objetivo:** que gente real use GasolinApp en Barranquilla y que la app se difunda sola por WhatsApp.
**Punto de partida (15 nov):** métrica norte en 0,0 % (0 de 162 estaciones) y 1 usuario activo real.
**Meta al 29 nov:**
- ≥ 20 % de estaciones de Barranquilla con precio comunitario confirmado en ≤ 7 días (unas 33 de 162).
- ≥ 20 usuarios activos reales en la semana.

**Fuera de alcance:** `feature/busqueda-inteligente` (congelada hasta ver uso real), 0.5, 0.6a–e, 2.3 pg_cron y cualquier feature que no esté en este archivo.

Siguen vigentes las reglas de CLAUDE.md y de los sprints anteriores: plan antes de código, expandir y luego contraer, GRANT explícito más pgTAP, y a producción solo con el OK de Mario **después** de que vea el SQL o la configuración.

---

## S0 — Antes de invitar a nadie

### [ ] S0.1 Turnstile en el alta anónima
**Por qué:** los límites de tasa y la regla de "2 usuarios distintos" de los servicios son por uid. Hoy cualquiera puede crear uids sin límite abriendo sesiones nuevas, y así un script se salta todo. De paso se acaban las sesiones de bots.

Orden de despliegue (expandir y luego contraer):
1. **Código:** widget de Cloudflare Turnstile (modo managed/invisible) que obtiene un token antes de `signInAnonymously({ options: { captchaToken } })`. Las sesiones existentes no se tocan; solo se pide el token en el alta. Va en `features/auth`, inyectable y con un mock que devuelve un token fijo. Tests con MSW: token correcto, token fallido con reintento, y widget que no carga (mensaje claro, sin pantalla rota).
2. **Local:** claves de prueba de Turnstile en `.env.example` y en `config.toml`. El modo mock no necesita captcha.
3. **`security:check`:** propón cómo sigue funcionando contra producción con el captcha activo (por ejemplo, reutilizar una sesión guardada en `.env` local mediante su refresh token, con rotación). Documéntalo en el README.
4. **Deploy del frontend** (el token se ignora mientras el captcha esté apagado) y verificación de que el alta sigue funcionando.
5. **Mario:** crea el sitio en Cloudflare Turnstile, activa Auth → Bot and Abuse Protection → CAPTCHA con el secret, y revisa en Auth → Rate Limits el límite de altas anónimas por IP (que quede bajo).
6. **Verificar:** alta en celular y escritorio; un alta sin token tiene que fallar (agrégalo como caso de `security:check`); `security:check` todo PASS.

**Listo cuando:** en producción no se puede crear una sesión anónima sin captcha y los usuarios reales no notan nada.

**Estado (2026-11-16):** pasos 1 a 3 hechos en la rama; faltan el deploy (4), la configuración de Mario (5) y la verificación en producción (6).
- Código: puerto `CaptchaProvider` (`features/auth/api/captcha.ts`), Turnstile invisible (`turnstileCaptcha.ts`: el script se descarga solo cuando el dispositivo no tiene sesión, espera máxima de 15 s) y `createSupabaseAuthRepository(client, captcha)`, que manda el token y, si Supabase responde `captcha_failed`, reintenta una vez con uno nuevo. Sin `VITE_TURNSTILE_SITE_KEY` no se pide captcha. Si el alta falla, `SessionNotice` avisa ("Si usas un bloqueador de anuncios…") con "Reintentar"; el mapa sigue usable.
- Local: `config.toml` activa el captcha con la clave secreta de prueba de Cloudflare y `.env.example` trae la clave de sitio de prueba invisible.
- `security:check`: reutiliza una sesión con refresh token rotativo guardado en `~/.config/gasolinapp/security-check-session.json` (ya no hace `signOut`) y suma el caso "Alta anónima sin captcha". Página `scripts/security-check/token.html` para sacar un token real si se pierde la sesión. README actualizado.
- Verificado en local (Supabase con captcha): `security:check` todo PASS más 1 KNOWN en corridas seguidas con la misma sesión (1 solo usuario anónimo creado); la app con el widget real de Cloudflare (clave de prueba) crea la sesión al cargar y no vuelve a pedir captcha al recargar; con Turnstile bloqueado aparece el aviso, el mapa sigue usable y "Reintentar" crea la sesión.
- Para el paso 4 hace falta que el código llegue a `main`: merge de la rama del sprint a mitad de camino.

### [x] S0.2 La leyenda no queda tapada
- Con la leyenda abierta, la tarjeta "Mejor precio" no la tapa en el celular (360 a 430 px de ancho). Test de layout o captura con Playwright **solo contra local**.

**Estado (2026-11-16):** hecha en la rama.
- Causa: la tarjeta adivinaba la altura de la leyenda con `bottom-[80px]` / `bottom-[240px]`; la leyenda cambió de alto y la tapaba.
- Arreglo de layout: en el celular, tarjeta y leyenda van apiladas en una sola columna anclada abajo (`map-dock`, tarjeta arriba y leyenda abajo), así la altura de una empuja a la otra. `right-16` deja libre la columna de zoom y ubicación del mapa, que también tapaba la tarjeta. En escritorio (`sm:contents`) cada una sigue en su lugar. La tarjeta ya no depende de `legendOpen`, y su fila de acciones puede pasar a dos líneas (a 360 px se cortaba "Ver").
- Verificado con Playwright contra local (mock): 360×640, 390×844 y 430×844 con la leyenda cerrada y abierta, más escritorio 1280×800, sin solapamientos entre tarjeta, leyenda y botones de zoom, todo dentro de la pantalla y sin errores. Test de regresión en `App.map.test.tsx`.

---

## [x] 3.2 — Enlaces directos por estación
- `?estacion=<id>&combustible=<tipo>`: al cargar, centra el mapa, abre el panel y selecciona el combustible. Un id inválido abre el mapa normal, sin errores.
- Abrir o cerrar el panel actualiza la URL con `history.replaceState`, sin ensuciar el historial.
- `track('station_open', { source: 'link' | 'map' | 'search' })` para medir de dónde llega la gente.

**Estado (2026-11-16):** hecha en la rama.
- `src/app/stationLink.ts` (leer y escribir el enlace conservando los demás parámetros; un combustible desconocido se ignora) y `useStationLink` (abre la estación cuando cargan las estaciones y desde ahí mantiene la URL con `replaceState`).
- Store: `focusMap(center, zoom)` para centrar a zoom de manejo (`MAP_DRIVING_ZOOM`, ahora en `config/map.js`) y `selectionSource` en `setSelectedStation(station, source)`: búsqueda → `search`, enlace → `link`, pines y "Mejor precio" → `map`. El panel lo manda en `station_open`.
- El primer GPS ya no le quita el centro a una estación abierta por enlace.
- El combustible del enlace queda como el combustible elegido (igual que elegirlo en la app, se guarda como preferencia).
- Verificado en la app (mock, 375 px): el enlace abre la estación con su combustible; cerrar limpia la URL; tocar otro pin la actualiza; un id inválido deja el mapa normal; el historial no crece; sin errores. Tests: `src/app/stationLink.test.ts` y `App.map.test.tsx`.

## [ ] 3.3 — Compartir por WhatsApp
- Botón "Compartir" en el panel de la estación y en "Mejor precio". Usa la Web Share API y, si no está disponible, `https://wa.me/?text=`.
- Texto: `⛽ Corriente a $15.900 en Terpel El Recreo (confirmado hoy). Míralo en GasolinApp: <enlace ?estacion=>`. Si el precio es el oficial de referencia, el texto lo dice.
- Open Graph y Twitter Card estáticos (título, descripción e imagen de 1200×630 en `public/`) para que el enlace se vea bien en WhatsApp.
- `track('share', { via: 'native' | 'whatsapp', station_id })`.
- **Opcional, solo si sobra tiempo:** una imagen Open Graph dinámica por estación con el precio, generada con una función de Vercel.

## [ ] 4.1 — Limpieza de estaciones de Barranquilla (una sesión, sin más)
- `supabase/queries/barranquilla-calidad.sql`: estaciones a menos de 60 m entre sí con la misma marca, sin marca o sin dirección.
- Migración que corrige solo los duplicados obvios: desactiva el duplicado con `is_active = false`, sin borrarlo. Lo demás va a un CSV para que Mario lo revise a mano.

## [ ] 4.2 — Instalable como PWA
- Manifest completo (nombre, íconos de 192 y 512 px, `theme_color`) y service worker que cumpla los requisitos de instalación de Chrome en Android.
- Mensaje discreto de "Instalar" desde la segunda visita, que se puede cerrar y no vuelve a salir en 30 días.
- Lighthouse en móvil corrido solo contra local o un preview: el objetivo es quedar instalable. Lo demás que salga se anota y no bloquea el sprint.

---

## Lanzamiento (Mario, sin Claude Code)

**Semana 1 (16 al 22 nov), en paralelo con el código:**
- [ ] Reportar o confirmar al menos 30 estaciones de Barranquilla en tus recorridos.
- [ ] Hacer la lista de los 10 primeros usuarios con nombre propio: amigos con carro, gente del karting y de eventos de carros, y 2 o 3 domiciliarios o taxistas a gas.
- [ ] Hablar con 5 personas que tanquean a diario. Preguntas: ¿dónde tanqueas y por qué ahí?, ¿te fijas en el precio?, ¿cómo te enteras hoy?, ¿confirmarías un precio con un toque?, ¿qué te haría volver a abrir la app? Anota las respuestas en `docs/entrevistas.md`.

**Semana 2 (23 al 29 nov), con 3.2 y 3.3 en producción:**
- [ ] Mandar el enlace a los 10 de la lista, uno por uno, con un mensaje personal.
- [ ] Publicarlo en 3 a 5 grupos (moteros, domiciliarios, carros o barrio) con un enlace directo a una estación conocida.
- [ ] Revisar `metricas.sql` el lunes y el jueves: métrica norte, usuarios activos de la semana, origen de las visitas (`station_open.source`), compartidos y conversión de abrir una estación a confirmar o reportar.

## Fecha fija
- **1 de diciembre:** cargar los precios oficiales de diciembre con `npm run reference-prices:import`, validar contra la CREG y aplicar la migración con OK. El job alerta el día 2 si falta.

## Definición de "sprint terminado"
- [ ] El alta anónima exige captcha en producción y `security:check` sale todo PASS, incluido el caso del alta sin token.
- [ ] 3.2 y 3.3 están en producción: un enlace compartido por WhatsApp se ve con su vista previa y abre la estación.
- [ ] Barranquilla quedó sin duplicados obvios y la app se puede instalar en Android.
- [ ] Se lanzó: 10 invitaciones personales y al menos 3 grupos.
- [ ] Hay 5 entrevistas en `docs/entrevistas.md`.
- [ ] Hay una lectura de métricas del 29 nov contra la meta. Si no se llegó, se anota la hipótesis de por qué (producto o canal) y eso define el Sprint 04.
