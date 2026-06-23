import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimiters, checkRateLimit } from "@/lib/ratelimit";

const schema = z.object({
  id: z.string().uuid(),
  estado: z.enum(["nueva", "seguimiento", "presentada", "descartada"]),
});

export async function POST(request: NextRequest) {
  // Rate limiting: 10 requests per hour per IP
  const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
  const allowed = await checkRateLimit(rateLimiters.mutations, ip);
  if (!allowed) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Intenta más tarde." }, { status: 429 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { id, estado } = parsed.data;

  const { error } = await supabase
    .from("licitaciones")
    .update({ estado })
    .eq("id", id);

  if (error) {
    console.error("[Estado] DB update failed:", error);
    return NextResponse.json({ error: "No se pudo actualizar el estado" }, { status: 500 });
  }

  await supabase.from("historial_estado").insert({
    licitacion_id: id,
    user_id: user.id,
    estado_nuevo: estado,
  });

  // Auto-sync a Google Calendar (si el usuario lo tiene conectado)
  try {
    console.log("[Calendar] Auto-sync started for estado:", estado);
    const { syncLicitacion, deleteLicitacionEvent } = await import("@/lib/google/calendar");

    const adminClient = createAdminClient();
    const { data: tokenExists, error: tokenError } = await adminClient
      .from("google_tokens")
      .select("user_id")
      .eq("user_id", user.id)
      .single();

    if (tokenError && tokenError.code !== 'PGRST116') {
      console.error("[Calendar] Unexpected error checking tokens:", tokenError.code);
    }

    if (tokenExists) {
      const estadosCalendar = ["seguimiento", "presentada"];
      const { data: licitacion } = await supabase
        .from("licitaciones")
        .select("*")
        .eq("id", id)
        .single();

      if (licitacion) {
        if (estadosCalendar.includes(estado)) {
          console.log("[Calendar] Syncing to Google Calendar");
          const result = await syncLicitacion(user.id, licitacion);
          if (result?.error) {
            console.error("[Calendar] Sync failed:", result.error);
          }
        } else {
          console.log("[Calendar] Removing from Google Calendar");
          await deleteLicitacionEvent(user.id, id);
        }
      }
    }
  } catch (error) {
    console.error("[Calendar] Auto-sync exception:", error instanceof Error ? error.message : "unknown");
  }

  revalidatePath("/seguimiento");
  revalidatePath("/presentadas");
  revalidatePath("/metricas");

  return NextResponse.json({ ok: true });
}
