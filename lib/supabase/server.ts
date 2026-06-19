import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Cliente de Supabase para el SERVIDOR (Server Components, Server Actions,
 * Route Handlers). Lee/escribe la sesión desde las cookies de la request.
 *
 * Usa la `anon key` + la sesión del usuario, por lo que RLS sigue aplicando
 * con la identidad del usuario logueado. Para operaciones privilegiadas que
 * deban saltar RLS, usar `lib/supabase/admin.ts` (con cuidado).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` se llamó desde un Server Component (no puede escribir
            // cookies). El refresh de sesión lo maneja el middleware, así que
            // se puede ignorar de forma segura.
          }
        },
      },
    },
  );
}
