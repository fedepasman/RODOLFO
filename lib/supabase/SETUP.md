# Setup de Supabase

Pasos para dejar la base de datos lista.

## 1. Crear el proyecto

1. Crear un proyecto nuevo en [supabase.com](https://supabase.com).
2. Copiar de **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secreta, solo server / n8n)

Pegarlas en `.env.local` (ver `.env.example` en la raíz).

## 2. Aplicar el schema (SQL Editor, en este orden)

1. `lib/supabase/schema.sql` — crea las tablas e índices.
2. `lib/supabase/rls.sql` — habilita RLS y define las políticas.
3. `lib/supabase/seed.sql` — inserta la fila de configuración por defecto.

> Importante: **no saltear `rls.sql`**. Sin esas políticas, las tablas con RLS
> habilitado quedan inaccesibles (deny-by-default) y la app no podrá leer datos.

## 3. Crear los dos usuarios admin

**Authentication → Users → Add user** (x2). Email + contraseña. No hace falta
sistema de invitaciones en Fase 1.

## 4. Regenerar los tipos (opcional pero recomendado)

`types/database.ts` está escrito a mano. Para regenerarlo desde el schema real:

```bash
npx supabase gen types typescript --project-id <PROJECT_ID> > types/database.ts
```

## 5. Conexión desde n8n

El workflow de n8n escribe en `licitaciones` usando el **service_role key**
(bypassa RLS). Configurar esa credencial en n8n, nunca en el frontend.
Ver `SECURITY.md` para el manejo de esta clave.
