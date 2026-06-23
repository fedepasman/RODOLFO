import "server-only";
import { google } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Licitacion } from "@/types/licitaciones";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`
  );
}

export async function getAuthUrl() {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

export async function exchangeCode(code: string) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token!,
    expires_at: new Date(tokens.expiry_date || 0).toISOString(),
  };
}

export async function getCalendarClient(userId: string) {
  const supabase = createAdminClient();

  // Obtener tokens de Supabase
  const { data: tokenData, error } = await supabase
    .from("google_tokens")
    .select("access_token,refresh_token,expires_at")
    .eq("user_id", userId)
    .single();

  if (error || !tokenData) {
    throw new Error("No Google token found for user");
  }

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
  });

  // Refresca si está vencido
  if (new Date(tokenData.expires_at) < new Date()) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    if (credentials.access_token) {
      // Guardar tokens actualizados
      await supabase
        .from("google_tokens")
        .update({
          access_token: credentials.access_token,
          expires_at: new Date(credentials.expiry_date || 0).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }
    oauth2Client.setCredentials(credentials);
  }

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export function buildCalendarEvent(licitacion: Licitacion) {
  const titulo = licitacion.titulo || `Licitación ${licitacion.numero}`;
  const descripcion = [
    `Portal: ${licitacion.portal}`,
    `Número: ${licitacion.numero}`,
    `Organismo: ${licitacion.organismo}`,
    `Link: ${process.env.NEXT_PUBLIC_SITE_URL}/licitaciones/${licitacion.id}`,
  ].join("\n");

  const fechaCierre = licitacion.fecha_cierre;

  // Extraer hora de cronograma_detalle.apertura si existe
  let dateTime: string | undefined;
  let date: string | undefined;

  if (licitacion.cronograma_detalle?.apertura) {
    const apertura = licitacion.cronograma_detalle.apertura;
    const match = apertura.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);

    if (match) {
      const [, day, month, year, hour, minute] = match;
      dateTime = `${year}-${month}-${day}T${hour}:${minute}:00`;
    } else {
      date = fechaCierre;
    }
  } else {
    date = fechaCierre;
  }

  return {
    summary: titulo,
    description: descripcion,
    ...(dateTime
      ? { start: { dateTime, timeZone: "America/Argentina/Buenos_Aires" }, end: { dateTime, timeZone: "America/Argentina/Buenos_Aires" } }
      : { start: { date }, end: { date } }),
  };
}

export async function syncLicitacion(userId: string, licitacion: Licitacion) {
  try {
    const calendar = await getCalendarClient(userId);
    const supabase = createAdminClient();

    // Buscar si ya existe evento
    const { data: existing } = await supabase
      .from("calendar_events")
      .select("event_id")
      .eq("licitacion_id", licitacion.id)
      .eq("user_id", userId)
      .single();

    const event = buildCalendarEvent(licitacion);

    if (existing) {
      // Actualizar evento existente
      await calendar.events.update({
        calendarId: "primary",
        eventId: existing.event_id,
        requestBody: event,
      });
    } else {
      // Crear nuevo evento
      const created = await calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
      });

      if (created.data.id) {
        // Guardar event_id en BD
        await supabase.from("calendar_events").insert({
          licitacion_id: licitacion.id,
          user_id: userId,
          event_id: created.data.id,
        });
      }
    }

    return { ok: true };
  } catch (error) {
    console.error("[Calendar] Sync error:", error instanceof Error ? error.message : "unknown");
    return { ok: false, error: error instanceof Error ? error.message : "unknown" };
  }
}

export async function deleteLicitacionEvent(userId: string, licitacionId: string) {
  try {
    const calendar = await getCalendarClient(userId);
    const supabase = createAdminClient();

    // Obtener event_id
    const { data: calendarEvent } = await supabase
      .from("calendar_events")
      .select("event_id")
      .eq("licitacion_id", licitacionId)
      .eq("user_id", userId)
      .single();

    if (calendarEvent?.event_id) {
      await calendar.events.delete({
        calendarId: "primary",
        eventId: calendarEvent.event_id,
      });

      // Remover de BD
      await supabase
        .from("calendar_events")
        .delete()
        .eq("licitacion_id", licitacionId)
        .eq("user_id", userId);
    }

    return { ok: true };
  } catch (error) {
    console.error("[Calendar] Delete error:", error instanceof Error ? error.message : "unknown");
    return { ok: false, error: error instanceof Error ? error.message : "unknown" };
  }
}
