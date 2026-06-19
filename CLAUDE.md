<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

Este proyecto usa **Next.js 16**, que tiene breaking changes respecto de versiones
anteriores (APIs, convenciones y estructura de archivos pueden diferir de tu training
data). Antes de escribir código de Next, leé la guía relevante en
`node_modules/next/dist/docs/`. Prestá atención a los deprecation notices.

Cambios de Next 16 que ya impactan este repo:
- `middleware.ts` se renombró a **`proxy.ts`** (función `proxy`, no `middleware`).
- `params` y `searchParams` de páginas/layouts son **asíncronos** (`await params`).
- `cookies()` y `headers()` son asíncronos.
<!-- END:nextjs-agent-rules -->

---

# Sistema de Seguimiento de Licitaciones

Webapp para búsqueda, ponderación y seguimiento de licitaciones públicas (ComprAR
Nacional, Buenos Aires Compras CABA, PBAC Provincia). Automatización con n8n,
almacenamiento en Supabase, frontend en Next.js, deploy en Vercel.

**Spec completo:** [docs/INSTRUCCIONES_PROYECTO.md](docs/INSTRUCCIONES_PROYECTO.md)
**Seguridad (lectura obligatoria antes de tocar auth/datos/secretos):** [SECURITY.md](SECURITY.md)

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui (estilo radix-nova) + Lucide |
| Datos/Auth | Supabase (`@supabase/ssr`) |
| Validación | Zod v4 + react-hook-form |
| Automatización | n8n (self-hosted) |
| Deploy | Vercel |

## Comandos

```bash
npm run dev          # desarrollo (http://localhost:3000)
npm run build        # build de producción
npm run start        # servir el build
npx shadcn@latest add <componente>   # agregar componente de UI

# Regenerar tipos de Supabase tras cambiar el schema:
npx supabase gen types typescript --project-id <PROJECT_ID> > types/database.ts
```

## Estructura

```
app/
  (auth)/login/        → login (client component + server action)
  (app)/               → app autenticada (layout con sidebar + check de usuario)
    dashboard/ licitaciones/[id]/ seguimiento/ configuracion/
  layout.tsx           → root (fuentes, Toaster)
  page.tsx             → redirect a /dashboard
components/
  ui/                  → shadcn/ui (generado, no editar a mano salvo necesidad)
  layout/ shared/ licitaciones/
lib/
  supabase/            → client.ts (browser) · server.ts (SSR) · admin.ts (service role)
                         + schema.sql · rls.sql · seed.sql · SETUP.md
  actions/             → server actions ("use server")
  validations/         → Zod schemas
  utils.ts             → cn()
types/                 → database.ts (tipos Supabase) · licitaciones.ts (dominio)
proxy.ts               → refresh de sesión + protección de rutas (ex middleware)
n8n/workflows/         → JSON exportados de n8n
```

## Convenciones

- **Clientes Supabase** — usar el correcto según el contexto:
  - `lib/supabase/client.ts` → Client Components (navegador).
  - `lib/supabase/server.ts` → Server Components / Server Actions / Route Handlers.
  - `lib/supabase/admin.ts` → SOLO server, operaciones privilegiadas que saltan RLS.
    Marcado con `server-only`; nunca importarlo en cliente.
- **Server actions** — patrón: `"use server"` → validar input con Zod → operar →
  retornar `{ error: string | null }` (o `{ error, data }`). Ver `lib/actions/auth.ts`.
- **Auth en profundidad** — el `proxy.ts` protege rutas, pero **cada server action que
  toque datos debe re-verificar el usuario** con `requireUser()` / `getUser()` (los
  Server Actions pueden eludir el proxy según los docs de Next 16).
- **RLS-first** — toda tabla nueva en Supabase va con RLS habilitado y políticas en
  `lib/supabase/rls.sql`. Nunca exponer datos confiando solo en checks de cliente.
- **Idioma** — dominio y UI en español (licitaciones, seguimiento, organismo…).

## n8n (self-hosted)

- Workflow diario, cron `0 8 * * 1-5` (días hábiles 08:00, UTC-3).
- Escribe en Supabase con el **service_role key** (bypassa RLS), configurado como
  credencial en n8n — no en esta webapp.
- JSON de workflows versionados en `n8n/workflows/`.
- **Skills de n8n-mcp instaladas**: al construir/editar workflows, usar el router
  `using-n8n-mcp-skills` y las skills específicas (`n8n-self-hosting`, etc.).

## Lógica de ponderación (referencia rápida)

Score 1–100: rubro (50) + participación previa (20) + monto (15) + días al cierre (15).
Prioridad: 🟢 alta 70–100 · 🟡 media 40–69 · 🔴 baja 0–39. Helper:
`prioridadDesdeScore()` en `types/licitaciones.ts`. Los pesos son configurables (Fase 2).
