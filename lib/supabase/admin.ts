import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * ⚠️ CLIENTE ADMIN — SOLO SERVIDOR ⚠️
 *
 * Usa el SERVICE ROLE KEY, que **bypassa RLS** y tiene acceso total a la base.
 * El import de "server-only" hace que el build FALLE si este archivo se importa
 * desde un Client Component, evitando que la clave llegue al navegador.
 *
 * Reglas:
 *   - Nunca importar desde componentes cliente ni exponer la clave con prefijo
 *     NEXT_PUBLIC_.
 *   - Usar solo para tareas administrativas puntuales del lado del servidor.
 *   - La ingesta masiva de licitaciones la hace n8n con su propia credencial
 *     service_role, no esta app.
 *
 * Ver SECURITY.md (sección "Gestión de secretos").
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
