"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/auth";

export type ActionResult = { error: string | null };

/**
 * Inicia sesión con email + contraseña.
 * Patrón: validar con Zod → llamar Supabase Auth → retornar { error }.
 */
export async function loginAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Mensaje genérico: no revelar si el email existe o no (anti-enumeración).
    return { error: "Email o contraseña incorrectos" };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Cierra sesión y vuelve al login.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Helper para usar en server actions/components: devuelve el usuario o redirige
 * a /login. CADA server action que toque datos debe llamar a esto (no confiar
 * solo en el proxy). Ver SECURITY.md.
 *
 * Cuando Supabase no está configurado (.env.local vacío), devuelve un usuario
 * mock para no romper el dev server antes de que se configure la BD.
 */
export async function requireUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn("[auth] Supabase no configurado: auth desactivada en dev.");
    return { id: "dev-user", email: "dev@mock.local" } as const;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}
