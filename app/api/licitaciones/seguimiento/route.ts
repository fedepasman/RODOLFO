import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimiters, checkRateLimit } from "@/lib/ratelimit";

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

  let id: string;
  try {
    const body = await request.json();
    id = body.id;
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const { error } = await supabase
    .from("licitaciones")
    .update({ estado: "seguimiento" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Auto-sync a Google Calendar (si el usuario lo tiene conectado)
  try {
    console.log("[Calendar] Auto-sync started for seguimiento");
    const { syncLicitacion } = await import("@/lib/google/calendar");

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
      const { data: licitacion } = await supabase
        .from("licitaciones")
        .select("*")
        .eq("id", id)
        .single();

      if (licitacion) {
        console.log("[Calendar] Syncing to Google Calendar");
        const result = await syncLicitacion(user.id, licitacion);
        if (result?.error) {
          console.error("[Calendar] Sync failed:", result.error);
        }
      }
    }
  } catch (error) {
    console.error("[Calendar] Auto-sync exception:", error instanceof Error ? error.message : "unknown");
  }

  revalidatePath("/seguimiento");
  revalidatePath("/licitaciones");
  revalidatePath("/dashboard");

  return NextResponse.json({ ok: true });
}
