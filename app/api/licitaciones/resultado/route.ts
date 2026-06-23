import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimiters, checkRateLimit } from "@/lib/ratelimit";

const schema = z.object({
  id: z.string().uuid(),
  resultado: z.enum(["ganada", "perdida", "desierta"]).nullable(),
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

  const { id, resultado } = parsed.data;

  const { error } = await supabase
    .from("licitaciones")
    .update({ resultado })
    .eq("id", id);

  if (error) {
    console.error("[Resultado] DB update failed:", error);
    return NextResponse.json({ error: "No se pudo actualizar el resultado" }, { status: 500 });
  }

  revalidatePath("/seguimiento");
  revalidatePath("/presentadas");
  revalidatePath("/metricas");
  revalidatePath("/licitaciones");

  return NextResponse.json({ ok: true });
}
