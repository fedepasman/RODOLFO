"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/actions/auth";

export type ConfiguracionData = {
  peso_rubro: number;
  peso_participacion: number;
  peso_monto: number;
  peso_dias: number;
  rubros_activos: string[];
};

export type ActionResult = { error: string | null; savedAt?: string };

const DEFAULTS: ConfiguracionData = {
  peso_rubro: 50,
  peso_participacion: 20,
  peso_monto: 15,
  peso_dias: 15,
  rubros_activos: ["informatica", "ferreteria", "indumentaria", "epp", "bazar", "mantenimiento"],
};

export async function getConfiguracion(): Promise<ConfiguracionData> {
  const supabase = await createClient();
  const { data } = await supabase.from("configuracion").select("*").limit(1);
  const row = data?.[0];
  if (!row) return DEFAULTS;
  return {
    peso_rubro: row.peso_rubro,
    peso_participacion: row.peso_participacion,
    peso_monto: row.peso_monto,
    peso_dias: row.peso_dias,
    rubros_activos: row.rubros_activos,
  };
}

const schema = z
  .object({
    peso_rubro: z.coerce.number().int().min(0).max(100),
    peso_participacion: z.coerce.number().int().min(0).max(100),
    peso_monto: z.coerce.number().int().min(0).max(100),
    peso_dias: z.coerce.number().int().min(0).max(100),
    rubros_activos: z.array(z.string()).min(1, "Seleccioná al menos un rubro"),
  })
  .refine(
    (d) => d.peso_rubro + d.peso_participacion + d.peso_monto + d.peso_dias === 100,
    { message: "Los pesos deben sumar exactamente 100" },
  );

export async function updateConfiguracionAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();

  const parsed = schema.safeParse({
    peso_rubro: formData.get("peso_rubro"),
    peso_participacion: formData.get("peso_participacion"),
    peso_monto: formData.get("peso_monto"),
    peso_dias: formData.get("peso_dias"),
    rubros_activos: formData.getAll("rubros_activos"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase.from("configuracion").select("id").limit(1);
  const id = existing?.[0]?.id;

  const payload = { ...parsed.data, updated_at: new Date().toISOString() };

  const { error } = id
    ? await supabase.from("configuracion").update(payload).eq("id", id)
    : await supabase.from("configuracion").insert(parsed.data);

  if (error) return { error: "No se pudo guardar la configuración" };

  revalidatePath("/configuracion");
  return { error: null, savedAt: new Date().toISOString() };
}
