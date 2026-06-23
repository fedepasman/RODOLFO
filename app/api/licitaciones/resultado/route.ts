import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  id: z.string().uuid(),
  resultado: z.enum(["ganada", "perdida", "desierta"]).nullable(),
});

export async function POST(request: Request) {
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

  revalidatePath("/presentadas");
  revalidatePath("/metricas");

  return NextResponse.json({ ok: true });
}
