# ⛽ GasolinApp — POC

Mapa colaborativo de precios de combustible. Los usuarios reportan y verifican precios al estilo Waze/Booking.com.

---

## 🏗️ Stack Tecnológico

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| **Frontend** | React 18 + Vite | Rápido, moderno, HMR |
| **UI** | shadcn/ui + Tailwind CSS | Componentes accesibles y customizables |
| **Iconos** | Lucide React (shadcn.io/icons) | Consistentes, livianos, tree-shakeable |
| **Mapa** | React-Leaflet + Leaflet.js | Open-source, sin costo de tiles, flexible |
| **Estado** | Zustand | Liviano, sin boilerplate, ideal para POC |
| **Backend** | **Supabase** ⭐ | Ver sección abajo |

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
| Opción | Problema |
|--------|---------|
| Firebase | NoSQL = sin PostGIS, precio escala mal, vendor lock-in |
| PocketBase | Self-hosted, tú manejas infraestructura |
| Appwrite | Menos maduro, ecosistema más pequeño |
| Railway + Postgres | Flexibilidad máxima pero tú configuras todo |

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

### 3. Ejecutar el schema
1. En Supabase Dashboard → **SQL Editor**
2. Pegar el contenido de `database/schema.sql`
3. Ejecutar → crea tablas, índices, RLS, seed data

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
│   │   └── useStations.js           # Fetch + realtime + submit helpers
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
├── database/
│   └── schema.sql                   # Schema Supabase completo con seed
├── .env.example
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## 🗺️ Lógica de Zoom

```
Zoom < 13  → Marcadores de zona con precio promedio (RPC: get_zone_averages)
Zoom ≥ 13  → Marcadores individuales por gasolinera
              • Verde + precio  = datos verificados por usuarios
              • Gris + precio~  = estimado del promedio de zona
```

---

## 🔥 Features del POC

- [x] Mapa dark con tiles de CartoDB
- [x] Zoom-in/out switcha entre vistas de zona e individuales
- [x] Panel lateral con precios por tipo de combustible
- [x] Estaciones sin datos muestran promedio de zona + banner de advertencia
- [x] Modal para reportar precios (Extra, Corriente, Diésel, AdBlue/Urea)
- [x] Sistema de votos en reportes (confirmar / incorrecto)
- [x] Realtime via Supabase WebSocket
- [x] Iconos Lucide (shadcn.io/icons)
- [x] Mobile responsive

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

```bash
# Build
npm run build

# Deploy en Vercel (recomendado, gratis)
npx vercel deploy --prod

# O en Netlify
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

Agregar las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el dashboard de Vercel/Netlify.
