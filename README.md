# ⛽ GasolinApp — Colombia

Mapa colaborativo de precios de combustible en Colombia. Los usuarios reportan y verifican precios de Corriente, Extra y Diésel en tiempo real.

🚀 **Probar Demo: [gasolinapp.oiramu.com](https://gasolinapp.oiramu.com)**

---

## 🏗️ Stack Tecnológico

| Capa         | Tecnología                     | Por qué                                   |
| ------------ | ------------------------------ | ----------------------------------------- |
| **Frontend** | React 18 + Vite                | Rápido, moderno, HMR                      |
| **UI**       | shadcn/ui + Tailwind CSS       | Componentes accesibles y customizables    |
| **Iconos**   | Lucide React (shadcn.io/icons) | Consistentes, livianos, tree-shakeable    |
| **Mapa**     | React-Leaflet + Leaflet.js     | Open-source, sin costo de tiles, flexible |
| **Estado**   | Zustand                        | Liviano, sin boilerplate, ideal para POC  |
| **Backend**  | **Supabase** ⭐                | Ver sección abajo                         |

---

## ⭐ Por qué Supabase como Backend

Supabase es un **Firebase open-source** construido sobre PostgreSQL. Es la mejor opción para este producto porque:

### Técnico

- **PostGIS nativo** → queries geoespaciales (`ST_Distance`, `ST_Within`) para clustering real sin biblioteca extra
- **Realtime** → WebSocket integrado: los precios se actualizan en el mapa sin refrescar
- **Row Level Security** → seguridad granular directamente en la DB
- **Edge Functions** → lógica de backend cuando escales (validación de precios, anti-spam)
- **Auth incluido** → usuarios anónimos → cuentas reales sin reescribir nada

### Costo / Escalabilidad

```
Free tier:     500 MB DB  · 2 proyectos  · 50K rows  · 50K MAU — suficiente para POC
Pro ($25/mes): 8 GB DB    · ilimitados   · realtime ilimitado — para MVP
Team ($599/mo): SLA, backups, soporte priority — producción
```

### Alternativas consideradas y descartadas

| Opción             | Problema                                               |
| ------------------ | ------------------------------------------------------ |
| Firebase           | NoSQL = sin PostGIS, precio escala mal, vendor lock-in |
| PocketBase         | Self-hosted, tú manejas infraestructura                |
| Appwrite           | Menos maduro, ecosistema más pequeño                   |
| Railway + Postgres | Flexibilidad máxima pero tú configuras todo            |

---

## 🚀 Setup en 5 pasos

### 1. Clonar e instalar

```bash
git clone <repo>
cd gasolinapp
npm install
```

### 2. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → New Project
2. Nombre: `gasolinapp`, región: la más cercana a tus usuarios
3. Guardar la contraseña de la DB

### 3. Crear el schema con las migraciones

El schema vive en `supabase/migrations/`, en archivos numerados por timestamp. `database/_legacy/` es solo histórico.

```bash
npx supabase login
npx supabase link --project-ref <ref>   # el ref sale de la URL del proyecto
npx supabase db push                    # aplica las migraciones pendientes
```

En local, con Docker:

```bash
npx supabase start      # Postgres + API locales
npx supabase db reset   # recrea la base desde cero con todas las migraciones
```

**Crear una migración nueva:**

1. Genera el archivo: `npx supabase migration new <nombre_en_snake_case>`.
2. Escríbela idempotente: `IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP ... IF EXISTS` y `ON CONFLICT`.
3. Pruébala en local con `npx supabase db reset`.
4. Aplícala en producción con `npx supabase db push`, o con `apply_migration` del MCP de Supabase si ya la revisaste.

Nunca edites una migración que ya está aplicada: escribe una nueva.

**Regenerar los tipos de TypeScript** después de cada cambio de schema:

```bash
npm run db:types   # desde la base local (supabase start + db reset), o sea, desde las migraciones
```

### 4. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con los valores de **Project Settings > API**:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000BB   # captcha del alta anónima (ver abajo)
```

**Captcha del alta anónima (Cloudflare Turnstile, modo invisible).** Cada dispositivo nuevo pasa un captcha invisible antes de crear su sesión anónima; los que ya tienen sesión no lo vuelven a ver. Sin `VITE_TURNSTILE_SITE_KEY` no se pide captcha (sirve mientras esté apagado en Supabase). En local, `supabase/config.toml` activa el captcha con la clave secreta de prueba de Cloudflare y `.env.example` trae la clave de sitio de prueba (`1x00000000000000000000BB`): las dos siempre pasan. En producción:

1. Cloudflare → Turnstile → crear el sitio en modo **Invisible**, con los dominios de producción, de los previews de Vercel y `localhost`.
2. Vercel → Environment Variables → `VITE_TURNSTILE_SITE_KEY` con la clave del sitio (es pública) y redeploy.
3. Con ese deploy en producción: Supabase → Authentication → Bot and Abuse Protection → CAPTCHA → Turnstile con la **clave secreta** (solo ahí; nunca en el repo ni en Vercel). Activarlo antes del deploy bloquearía las altas nuevas.
4. Supabase → Authentication → Rate Limits → altas anónimas por IP. Con el captcha activo no hace falta bajarlo mucho: en Colombia muchos celulares salen por la misma IP del operador.

### 5. Correr en dev

```bash
npm run dev
# → http://localhost:5173
```

> **Sin Supabase configurado**, la app funciona con datos mock (`VITE_USE_MOCK_DATA=true` en `.env`).

---

## ✅ Calidad: tests, tipos y lint

| Comando | Qué hace |
| --- | --- |
| `npm test` | Tests de vitest (jsdom, Testing Library, MSW) |
| `npm run test:watch` | Tests en modo watch |
| `npm run test:coverage` | Tests con cobertura; falla si `src/shared/domain/` baja del 100% o si `src/` baja del piso global de `vite.config.ts` |
| `npm run typecheck` | `tsc` strict (`noUncheckedIndexedAccess`) para la app y para `vite.config.ts` |
| `npm run lint` | ESLint sin warnings permitidos: complejidad, profundidad, tamaño de archivos y funciones, y prohibido importar Supabase desde `features/*/ui` y `app/` |
| `npm run test:db` | Tests pgTAP de `supabase/tests/` contra la base local (requiere `npx supabase start`) |
| `npm run check` | lint + typecheck + cobertura + build. Es lo que debe pasar antes de dar una tarea por terminada |
| `npm run db:types` | Regenera `src/shared/api/database.types.ts` desde la base local (las migraciones) |
| `npm run security:check` | Prueba de ataque con la anon key contra el proyecto de `.env` (ver abajo) |

- **Tests de la app:** van junto al código (`*.test.ts(x)`). MSW está activo en todos los tests, y cualquier petición sin handler hace fallar el test, así que nunca se toca la red real.
- **Tests de SQL:** van en `supabase/tests/database/*.test.sql`. Toda RPC necesita uno con el caso feliz y al menos un caso de abuso que falle.
- **Reglas compartidas TS ↔ SQL:** los rangos de precio, las unidades y el largo del comentario viven en `src/shared/domain`. `sharedRules.db.test.ts` genera el pgTAP `003_reglas_compartidas.test.sql`, que verifica que la base aplique los mismos valores. Si cambias una regla: `npx vitest -u` y una migración nueva.
- **Transición a TypeScript:** `allowJs` sigue activo mientras dure la migración (tareas 0.3–0.6). Los `.js`/`.jsx` legados solo pasan las reglas base de ESLint; las reglas estrictas aplican a `.ts`/`.tsx`. La cobertura exige 100% en `src/shared/domain/` y un piso global en `vite.config.ts` que sube a medida que se migra.

### Precios oficiales de referencia (cada mes)

La CREG publica a fin de mes los precios de referencia de gasolina corriente y ACPM para 13 ciudades, en https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/. La app los muestra cuando una estación no tiene un precio comunitario fresco o reciente. La carga es manual a propósito: los valores se validan contra la fuente antes de aplicarlos.

1. Copia la tabla "Precios vigentes a partir del 1 de …" en `data/reference-prices/AAAA-MM.csv`, con el encabezado `city,fuel_type,price`. Usa `corriente` para gasolina y `diesel` para ACPM. El precio puede ir con punto de miles (`15.964`).
2. Genera el SQL:
   ```bash
   npm run reference-prices:import -- data/reference-prices/2026-12.csv --valid-from 2026-12-01 \
     --source https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/ --out data/reference-prices/2026-12.sql
   ```
   El script rechaza combustibles desconocidos, precios fuera de rango (`shared/domain/fuel.ts`), filas repetidas y fechas o fuentes inválidas.
3. Revisa el `.sql` y córrelo en el SQL Editor de Supabase. Es idempotente: si te equivocas, corrige el CSV y vuelve a correrlo.

Si el día 2 del mes no hay precios cargados, el job `check_reference_prices` deja una alerta en `ops_alerts`.

### Vista previa al compartir (Open Graph)

Los enlaces que se comparten por WhatsApp (botón "Compartir" del panel y de "Mejor precio", con enlace directo `?estacion=<id>&combustible=<tipo>`) se ven con `public/og-image.png` (1200×630, PNG: WhatsApp no muestra SVG). Las etiquetas `og:*` y `twitter:*` están en `index.html`. La imagen sale de la plantilla `scripts/og-image.html`, que usa los colores y tipografías de la app y no lleva cifras (es estática y los precios cambian cada mes): para cambiarla, editar la plantilla, abrirla en el navegador a 1200×630 y guardar la captura como `public/og-image.png` (menos de 300 KB). WhatsApp guarda la vista previa en caché: un cambio puede tardar en verse en enlaces ya compartidos.

### Instalable como PWA

- `public/manifest.webmanifest` (nombre, íconos de 192 y 512 px más uno maskable, `theme_color` #111318) y, en `index.html`, el enlace al manifest, `theme-color` y el ícono de iOS (`public/apple-touch-icon.png`). Los íconos salen de `scripts/pwa-icon.html` (capturar a 192, 512 y 180 px; `?maskable=1` deja el dibujo en la zona segura).
- `public/sw.js` es conservador a propósito: solo atiende la navegación (red primero y, sin conexión, `public/offline.html`). No guarda en caché el JavaScript ni las respuestas de Supabase, así un deploy nuevo nunca queda tapado por una versión vieja. Si cambia `offline.html`, subir `CACHE_VERSION`. Se registra solo en el build (`src/app/serviceWorker.ts`), no con `npm run dev`.
- El aviso "Instalar" (`features/install`) sale desde la segunda visita, cuando Chrome lo permite (`beforeinstallprompt`: Android y escritorio; iOS no lo tiene), y al cerrarlo no vuelve en 30 días.
- Para probarlo en local: `npm run build && npm run preview`, abrir en Chrome y revisar DevTools → Application → Manifest (sin errores de instalabilidad).

### Prueba de seguridad (`npm run security:check`)

Ataca el proyecto como lo haría cualquiera con la anon key: intenta crear una sesión anónima sin captcha y, con su propia sesión, cambiar precios y votos con UPDATE, insertar directo en `fuel_prices`, `reports`, `votes` y `service_suggestions`, editar una estación, votar dos veces, reportar un precio fuera de rango y pasarse del límite de `report_price`. Imprime PASS/FAIL por caso y sale con código 1 si algún ataque pasa.

```bash
npm run security:check                                        # usa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY de .env
SUPABASE_URL=... SUPABASE_ANON_KEY=... npm run security:check # contra otro proyecto (p. ej. el local)
```

- Solo usa la URL y la anon key; nunca la service key.
- Escribe únicamente en las tres estaciones de prueba (`is_test = true`, ocultas en la app) y al final borra lo suyo con la RPC `clear_my_test_data`, que solo puede borrar lo que escribió la misma sesión en estaciones de prueba.
- **Sesión reutilizable (S0.1).** Con el captcha activo no puede crear una sesión en cada corrida: reutiliza siempre la misma mediante su refresh token, que rota en cada uso y se guarda en `~/.config/gasolinapp/security-check-session.json` (fuera del repo, permisos 600; otra ruta con `SECURITY_CHECK_SESSION_FILE`). No hace `signOut`: revocaría esa sesión.
- **Primera vez o sesión perdida.** Contra Supabase local la crea sola, con el token de prueba. Contra producción, lo más simple es correr `security:check` una vez **antes** de activar el captcha. Si después se pierde la sesión, hace falta un token real: con `npm run dev` abierto, ir a `http://localhost:5173/scripts/security-check/token.html?sitekey=<clave del sitio>`, copiar el token y correr `SECURITY_CHECK_CAPTCHA_TOKEN=<token> npm run security:check` (vence a los 5 minutos y es de un solo uso).

---

## 📁 Estructura del Proyecto

```
gasolinapp/
├── src/
│   ├── components/
│   │   ├── map/
│   │   │   ├── MapView.jsx          # react-leaflet, zoom switching
│   │   │   └── markers.jsx          # Iconos SVG para pins de gasolinera y zona
│   │   ├── panels/
│   │   │   └── StationPanel.jsx     # Side panel: precios + reportes + votos
│   │   ├── modals/
│   │   │   └── ReportPriceModal.jsx # Modal para reportar precios
│   │   ├── TopBar.jsx
│   │   ├── MapLegend.jsx
│   │   └── Toast.jsx
│   ├── hooks/
│   │   ├── useStationsData.js       # Fetch + realtime de estaciones
│   │   └── useZonesData.js          # Fetch de zonas
│   ├── lib/
│   │   ├── supabase.js              # Cliente de Supabase
│   │   ├── fuel.js                  # Constantes y helpers de combustible
│   │   ├── mockData.js              # Datos para desarrollo sin Supabase
│   │   └── utils.js                 # cn() helper
│   ├── store/
│   │   └── appStore.js              # Estado global (Zustand)
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── supabase/
│   └── migrations/                  # Fuente de verdad del schema (numeradas)
├── database/
│   └── _legacy/                     # Scripts históricos, no usar
├── .env.example
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## 🗺️ Lógica de Zoom

```
Zoom < 12  → Marcadores de zona con precio promedio (RPC: get_zone_averages)
Zoom ≥ 12  → Marcadores individuales por gasolinera
              • Verde + precio  = datos verificados por usuarios
              • Gris + precio~  = estimado del promedio de zona
```

---

## 🔥 Features del POC

- [x] Mapa dark con tiles de CartoDB
- [x] Zoom switching entre vistas de zona (promedios) e individuales
- [x] Panel lateral con precios por tipo de combustible (Corriente, Extra, Diésel)
- [x] Estaciones sin datos muestran promedio de zona + banner de advertencia
- [x] Modal para reportar precios con validación
- [x] Sistema de votos en reportes (Verificar / Incorrecto)
- [x] Realtime via Supabase WebSocket
- [x] Mobile responsive & PWA ready

---

## 🛣️ Roadmap hacia MVP

### Fase 1 (1-2 semanas)

- [ ] Auth con Supabase (anonimo → cuenta con email)
- [ ] Gamificación básica: puntos por reportes verificados
- [ ] Búsqueda de gasolineras por nombre

### Fase 2 (3-4 semanas)

- [ ] Geolocalización del usuario + "gasolineras cerca de mí"
- [ ] Filtro por tipo de combustible
- [ ] Historico de precios + gráfica de tendencia
- [ ] Notificaciones push cuando baja el precio de tu zona

### Fase 3 (Producto)

- [ ] App nativa con React Native + mismo backend
- [ ] API pública para que otras apps consuman los precios
- [ ] Panel de administración para gasolineras verificadas
- [ ] Integración con APIs gubernamentales de precios oficiales

---

## 🚢 Deploy

El proyecto está desplegado en: **[gasolinapp.oiramu.com](https://gasolinapp.oiramu.com)**

Para desplegar tu propia instancia:

```bash
# Build
npm run build

# Deploy en Vercel (recomendado)
npx vercel deploy --prod
```

Asegúrate de configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en las variables de entorno de tu plataforma de deploy.
