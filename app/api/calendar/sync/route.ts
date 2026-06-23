import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncLicitacion } from "@/lib/google/calendar";
import { getLicitacionesByEstado } from "@/lib/actions/licitaciones";
import { rateLimiters, checkRateLimit } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Rate limiting: 5 requests per hour per user (heavier operation)
  const allowed = await checkRateLimit(rateLimiters.calendarSync, user.id);
  if (!allowed) {
    return NextResponse.json({ error: "Demasiadas sincronizaciones. Intenta más tarde." }, { status: 429 });
  }

  // Verificar que tiene token de Google
  const adminClient = createAdminClient();
  const { data: token } = await adminClient
    .from("google_tokens")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  if (!token) {
    return NextResponse.json(
      { error: "Google Calendar no conectado" },
      { status: 400 }
    );
  }

  try {
    // Obtener licitaciones en seguimiento y presentada
    const [seguimiento, presentada] = await Promise.all([
      getLicitacionesByEstado("seguimiento"),
      getLicitacionesByEstado("presentada"),
    ]);

    const licitaciones = [...seguimiento, ...presentada];
    const resultados = [];
    let sincronizadas = 0;

    // Sincronizar cada una
    for (const lic of licitaciones) {
      const result = await syncLicitacion(user.id, lic);
      if (result.ok) {
        sincronizadas++;
      }
      resultados.push({ id: lic.id, ...result });
    }

    return NextResponse.json({
      ok: true,
      sincronizadas,
      total: licitaciones.length,
      resultados,
    });
  } catch (error) {
    console.error("[Calendar Sync] Error:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "No se pudo sincronizar el calendario" },
      { status: 500 }
    );
  }
}
