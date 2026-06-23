import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Proxy (antes "middleware" — renombrado en Next.js 16).
 *
 * Hace dos cosas en cada request:
 *   1. Refresca la sesión de Supabase (re-emite cookies) para que no expire.
 *   2. Protege rutas: sin usuario → redirige a /login; con usuario en /login →
 *      redirige a /dashboard.
 *
 * ⚠️ El proxy NO es la única capa de seguridad. Según los docs de Next 16, un
 * refactor que mueva un Server Action a otra ruta puede dejar de pasar por acá.
 * Por eso CADA server action vuelve a verificar el usuario con getUser().
 * Ver SECURITY.md.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si Supabase todavía no está configurado (.env.local vacío), no rompemos:
  // dejamos pasar para que se pueda ver la UI. Completar credenciales según
  // lib/supabase/SETUP.md para activar la protección de rutas.
  if (!url || !anonKey) {
    console.warn(
      "[proxy] Supabase no configurado: protección de rutas DESACTIVADA. Completá .env.local (ver lib/supabase/SETUP.md).",
    );
    return response;
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() valida el JWT contra el servidor de Supabase (a diferencia de
  // getSession(), que confía en la cookie). No poner código entre createServerClient
  // y getUser() para evitar bugs sutiles de sesión.
  // Server actions (POST + header "next-action") no pueden recibir un redirect 302
  // porque el cliente espera una respuesta RSC — si el proxy redirige, el cliente
  // tira "An unexpected response". Los server actions autentican con requireUser()
  // internamente, así que el proxy los deja pasar sin verificar sesión.
  if (request.method === "POST" && request.headers.get("next-action")) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname === "/login";

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Corre en todas las rutas excepto:
     * - _next/static, _next/image (assets de build)
     * - favicon.ico, robots.txt, sitemap.xml
     * - archivos de imagen estáticos
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
