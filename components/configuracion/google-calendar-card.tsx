import { createAdminClient } from "@/lib/supabase/admin";
import { GoogleCalendarButton } from "./google-calendar-button";

export async function GoogleCalendarCard() {
  const supabase = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: token } = await supabase
    .from("google_tokens")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  const isConnected = !!token;

  return (
    <div className="rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Google Calendar</h3>
          <p className="mt-1 text-sm text-gray-600">
            Sincroniza automáticamente tus licitaciones con Google Calendar
          </p>
        </div>
        <div>
          {isConnected ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
              ✓ Conectado
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
              Desconectado
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <GoogleCalendarButton isConnected={isConnected} />
      </div>
    </div>
  );
}
