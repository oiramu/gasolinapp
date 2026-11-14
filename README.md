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
npx supabase gen types typescript --linked > src/shared/api/database.types.ts
```

### 4. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con los valores de **Project Settings > API**:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

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

- **Tests de la app:** van junto al código (`*.test.ts(x)`). MSW está activo en todos los tests, y cualquier petición sin handler hace fallar el test, así que nunca se toca la red real.
- **Tests de SQL:** van en `supabase/tests/database/*.test.sql`. Toda RPC necesita uno con el caso feliz y al menos un caso de abuso que falle.
- **Transición a TypeScript:** `allowJs` sigue activo mientras dure la migración (tareas 0.3–0.6). Los `.js`/`.jsx` legados solo pasan las reglas base de ESLint; las reglas estrictas aplican a `.ts`/`.tsx`. Hasta terminar la 0.6, `npm run check` falla en el paso de cobertura porque el código legado no tiene tests.

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
