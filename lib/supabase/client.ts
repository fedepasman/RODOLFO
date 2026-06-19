import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Cliente de Supabase para componentes del NAVEGADOR (Client Components).
 * Usa la `anon key`, que es pública por diseño: toda la seguridad real la
 * imponen las políticas RLS en la base de datos. Ver SECURITY.md.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
