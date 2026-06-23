"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/actions/auth";
import type { Licitacion } from "@/types/licitaciones";
import { MOCK_LICITACIONES } from "@/lib/mock/licitaciones";

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function isSupabaseConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// ---------------------------------------------------------------------------
// Queries (usadas desde Server Components directamente)
// ---------------------------------------------------------------------------

export async function getLicitaciones(): Promise<Licitacion[]> {
  if (!isSupabaseConfigured()) return MOCK_LICITACIONES;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("licitaciones")
    .select("*")
    .order("score", { ascending: false });

  if (error) {
    console.error("[licitaciones] Error al obtener listado:", error.message);
    return MOCK_LICITACIONES;
  }

  return data ?? MOCK_LICITACIONES;
}

export async function getLicitacion(id: string): Promise<Licitacion | null> {
  if (!isSupabaseConfigured()) {
    return MOCK_LICITACIONES.find((l) => l.id === id) ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("licitaciones")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[licitaciones] Error al obtener detalle:", error.message);
    return MOCK_LICITACIONES.find((l) => l.id === id) ?? null;
  }

  return data;
}

export async function getLicitacionesByEstado(
  estado: "nueva" | "seguimiento" | "presentada" | "descartada",
): Promise<Licitacion[]> {
  if (!isSupabaseConfigured()) {
    return MOCK_LICITACIONES.filter((l) => l.estado === estado);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("licitaciones")
    .select("*")
    .eq("estado", estado)
    .order("score", { ascending: false });

  if (error) {
    console.error("[licitaciones] Error al filtrar por estado:", error.message);
    return MOCK_LICITACIONES.filter((l) => l.estado === estado);
  }

  return data ?? [];
}

// ---------------------------------------------------------------------------
// Mutations (server actions para formularios / botones)
// ---------------------------------------------------------------------------

const updateEstadoSchema = z.object({
  licitacion_id: z.string().uuid(),
  estado: z.enum(["nueva", "seguimiento", "presentada", "descartada"]),
});

export type ActionResult = { error: string | null };


export async function updateEstadoAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = updateEstadoSchema.safeParse({
    licitacion_id: formData.get("licitacion_id"),
    estado: formData.get("estado"),
  });

  if (!parsed.success) {
    return { error: "Datos inválidos" };
  }

  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from("licitaciones")
    .update({ estado: parsed.data.estado })
    .eq("id", parsed.data.licitacion_id);

  if (updateError) {
    return { error: "No se pudo actualizar el estado" };
  }

  // Registrar en historial
  await supabase.from("historial_estado").insert({
    licitacion_id: parsed.data.licitacion_id,
    user_id: user.id,
    estado_nuevo: parsed.data.estado,
  });

  // Auto-sync a Google Calendar (si el usuario lo tiene conectado)
  try {
    console.log("[Calendar] Auto-sync started for estado:", parsed.data.estado);
    const { syncLicitacion, deleteLicitacionEvent } = await import("@/lib/google/calendar");
    const { createAdminClient } = await import("@/lib/supabase/admin");

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
      const licitacion = await getLicitacion(parsed.data.licitacion_id);

      if (licitacion) {
        if (estadosCalendar.includes(parsed.data.estado)) {
          console.log("[Calendar] Syncing to Google Calendar");
          const result = await syncLicitacion(user.id, licitacion);
          if (result?.error) {
            console.error("[Calendar] Sync failed:", result.error);
          }
        } else {
          console.log("[Calendar] Removing from Google Calendar");
          await deleteLicitacionEvent(user.id, parsed.data.licitacion_id);
        }
      }
    }
  } catch (error) {
    console.error("[Calendar] Auto-sync exception:", error instanceof Error ? error.message : "unknown");
  }

  revalidatePath(`/licitaciones/${parsed.data.licitacion_id}`);
  revalidatePath("/licitaciones");
  revalidatePath("/dashboard");
  revalidatePath("/seguimiento");
  revalidatePath("/presentadas");
  revalidatePath("/metricas");

  return { error: null };
}

const upsertSeguimientoSchema = z.object({
  licitacion_id: z.string().uuid(),
  nota: z.string().max(5000).optional(),
  archivo_drive: z.string().url().optional().or(z.literal("")),
});

export async function upsertSeguimientoAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = upsertSeguimientoSchema.safeParse({
    licitacion_id: formData.get("licitacion_id"),
    nota: formData.get("nota") ?? undefined,
    archivo_drive: formData.get("archivo_drive") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("seguimientos").upsert(
    {
      licitacion_id: parsed.data.licitacion_id,
      user_id: user.id,
      nota: parsed.data.nota ?? null,
      archivo_drive: parsed.data.archivo_drive || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "licitacion_id,user_id" },
  );

  if (error) {
    return { error: "No se pudo guardar la información" };
  }

  revalidatePath(`/licitaciones/${parsed.data.licitacion_id}`);
  return { error: null };
}

export async function getSeguimiento(licitacion_id: string) {
  if (!isSupabaseConfigured()) return null;

  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("seguimientos")
    .select("*")
    .eq("licitacion_id", licitacion_id)
    .eq("user_id", user.id)
    .single();

  return data ?? null;
}

export async function getLicitacionesPorMes(year: number, month: number): Promise<Licitacion[]> {
  const mm = String(month).padStart(2, "0");
  const from = `${year}-${mm}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

  if (!isSupabaseConfigured()) {
    return MOCK_LICITACIONES.filter(
      (l) =>
        l.fecha_cierre &&
        l.fecha_cierre >= from &&
        l.fecha_cierre <= to &&
        l.estado !== "descartada",
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("licitaciones")
    .select("*")
    .gte("fecha_cierre", from)
    .lte("fecha_cierre", to)
    .neq("estado", "descartada")
    .order("fecha_cierre", { ascending: true });

  if (error) {
    console.error("[licitaciones] Error al filtrar por mes:", error.message);
    return [];
  }

  return data ?? [];
}

export async function getLicitacionesPorCierre(fecha: string): Promise<Licitacion[]> {
  if (!isSupabaseConfigured()) {
    return MOCK_LICITACIONES.filter(
      (l) => l.fecha_cierre === fecha && (l.estado === "seguimiento" || l.estado === "presentada"),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("licitaciones")
    .select("*")
    .eq("fecha_cierre", fecha)
    .in("estado", ["seguimiento", "presentada"])
    .order("score", { ascending: false });

  if (error) {
    console.error("[licitaciones] Error al filtrar por cierre:", error.message);
    return [];
  }

  return data ?? [];
}

export async function getLicitacionesPorFecha(fecha: string): Promise<Licitacion[]> {
  if (!isSupabaseConfigured()) {
    return MOCK_LICITACIONES.filter(
      (l) => l.created_at?.startsWith(fecha) ?? false,
    );
  }

  const supabase = await createClient();
  const [year, month, day] = fecha.split("-");
  const nextDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day) + 1)
    .toISOString()
    .split("T")[0];

  const { data, error } = await supabase
    .from("licitaciones")
    .select("*")
    .gte("created_at", `${fecha}T00:00:00Z`)
    .lt("created_at", `${nextDate}T00:00:00Z`)
    .order("score", { ascending: false });

  if (error) {
    console.error("[licitaciones] Error al filtrar por fecha:", error.message);
    return [];
  }

  return data ?? [];
}

export async function getLicitacionesResumenPorFecha(): Promise<Array<{ fecha: string; total: number }>> {
  const allLicitaciones = await getLicitaciones();

  const grouped = new Map<string, number>();
  allLicitaciones.forEach((l) => {
    if (!l.created_at) return;
    // Usa UTC para evitar problemas de zona horaria
    const fecha = l.created_at.split("T")[0];
    grouped.set(fecha, (grouped.get(fecha) ?? 0) + 1);
  });

  return Array.from(grouped.entries())
    .map(([fecha, total]) => ({ fecha, total }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export async function getHistorialEstado(licitacion_id: string) {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from("historial_estado")
    .select("*")
    .eq("licitacion_id", licitacion_id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

const updateResultadoSchema = z.object({
  licitacion_id: z.string().uuid(),
  resultado: z.enum(["ganada", "perdida", "desierta"]).nullable(),
});

export async function updateResultadoAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();

  const raw = formData.get("resultado");
  const parsed = updateResultadoSchema.safeParse({
    licitacion_id: formData.get("licitacion_id"),
    resultado: raw === "" || raw === "pendiente" ? null : raw,
  });

  if (!parsed.success) {
    return { error: "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("licitaciones")
    .update({ resultado: parsed.data.resultado })
    .eq("id", parsed.data.licitacion_id);

  if (error) {
    return { error: "No se pudo actualizar el resultado" };
  }

  revalidatePath("/presentadas");
  revalidatePath("/metricas");

  return { error: null };
}

const marcarRevisadaSchema = z.object({
  id: z.string().uuid(),
  revisada: z.boolean(),
});

export async function marcarRevisadaAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();

  const parsed = marcarRevisadaSchema.safeParse({
    id: formData.get("id"),
    revisada: formData.get("revisada") === "true",
  });

  if (!parsed.success) {
    return { error: "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("licitaciones")
    .update({ revisada: parsed.data.revisada })
    .eq("id", parsed.data.id);

  if (error) {
    return { error: "No se pudo actualizar" };
  }

  revalidatePath("/licitaciones");
  revalidatePath("/dashboard");
  revalidatePath("/presentadas");
  revalidatePath("/seguimiento");

  return { error: null };
}
