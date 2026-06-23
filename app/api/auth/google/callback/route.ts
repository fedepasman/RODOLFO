import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/google/calendar";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    console.error("[Google OAuth] Error from provider:", error);
    return NextResponse.redirect(
      new URL("/configuracion?google=error", request.url)
    );
  }

  if (!code) {
    console.error("[Google OAuth] Missing authorization code");
    return NextResponse.redirect(
      new URL("/configuracion?google=error", request.url)
    );
  }

  // Verificar sesión del usuario
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // Canjear code por tokens
    const { access_token, refresh_token, expires_at } = await exchangeCode(code);

    // Guardar en Supabase (admin client para no depender de sesión)
    const adminClient = createAdminClient();
    await adminClient.from("google_tokens").upsert(
      {
        user_id: user.id,
        access_token,
        refresh_token,
        expires_at,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    return NextResponse.redirect(new URL("/configuracion?google=conectado", request.url));
  } catch (error) {
    console.error("[Google OAuth] Token exchange failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.redirect(
      new URL("/configuracion?google=error", request.url)
    );
  }
}
