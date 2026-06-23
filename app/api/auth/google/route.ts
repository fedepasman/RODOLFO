import { NextResponse, type NextRequest } from "next/server";
import { getAuthUrl } from "@/lib/google/calendar";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const authUrl = await getAuthUrl();
  return NextResponse.redirect(authUrl);
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const adminClient = createAdminClient();

  // Borrar tokens
  await adminClient
    .from("google_tokens")
    .delete()
    .eq("user_id", user.id);

  // Borrar eventos
  await adminClient
    .from("calendar_events")
    .delete()
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
