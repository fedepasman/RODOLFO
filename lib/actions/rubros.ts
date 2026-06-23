"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/actions/auth";

export type Rubro = {
  id: string;
  nombre: string;
  label: string;
  keywords: string[];
  activo: boolean;
  orden: number;
};

export type ActionResult = { error: string | null };

export async function getRubros(): Promise<Rubro[]> {
  const supabase = await createClient();
  const { data } = await // eslint-disable-next-line @typescript-eslint/no-explicit-any
(supabase as any).from("rubros").select("*").order("orden");
  return (data as Rubro[]) ?? [];
}

const createSchema = z.object({
  nombre: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z_]+$/, "Solo letras minúsculas y guiones bajos (ej: mis_productos)"),
  label: z.string().min(1, "El nombre visible es obligatorio").max(100),
  keywords: z.string().min(1, "Ingresá al menos una palabra clave"),
});

export async function createRubroAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();

  const parsed = createSchema.safeParse({
    nombre: formData.get("nombre"),
    label: formData.get("label"),
    keywords: formData.get("keywords"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const keywords = parsed.data.keywords
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { data: maxOrden } = await supabase
    .from("rubros")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1);

  const { error } = await // eslint-disable-next-line @typescript-eslint/no-explicit-any
(supabase as any).from("rubros").insert({
    nombre: parsed.data.nombre,
    label: parsed.data.label,
    keywords,
    activo: true,
    orden: (maxOrden?.[0]?.orden ?? 0) + 1,
  });

  if (error) {
    if (error.message.includes("unique") || error.message.includes("rubros_nombre_key")) {
      return { error: `Ya existe un rubro con el ID "${parsed.data.nombre}"` };
    }
    return { error: "No se pudo crear el rubro" };
  }

  revalidatePath("/configuracion");
  return { error: null };
}

const updateSchema = z.object({
  label: z.string().min(1).max(100),
  keywords: z.string().min(1, "Ingresá al menos una palabra clave"),
});

export async function updateRubroAction(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();

  const parsed = updateSchema.safeParse({
    label: formData.get("label"),
    keywords: formData.get("keywords"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const keywords = parsed.data.keywords
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase
    .from("rubros")
    .update({ label: parsed.data.label, keywords })
    .eq("id", id);

  if (error) return { error: "No se pudo actualizar el rubro" };

  revalidatePath("/configuracion");
  return { error: null };
}

export async function toggleRubroAction(id: string, activo: boolean): Promise<ActionResult> {
  await requireUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("rubros").update({ activo }).eq("id", id);
  if (error) return { error: "No se pudo actualizar el rubro" };
  revalidatePath("/configuracion");
  return { error: null };
}

export async function deleteRubroAction(id: string): Promise<ActionResult> {
  await requireUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("rubros").delete().eq("id", id);
  if (error) return { error: "No se pudo eliminar el rubro" };
  revalidatePath("/configuracion");
  return { error: null };
}
