/**
 * Tipos de dominio y helpers de la lógica de licitaciones.
 * Reexporta los tipos base de la BD y agrega utilidades de ponderación/presentación.
 */
import type {
  Database,
  Portal,
  EstadoLicitacion,
  Prioridad,
  ResultadoOrganismo,
} from "@/types/database";

export type { Portal, EstadoLicitacion, Prioridad, ResultadoOrganismo };

export type Licitacion = Database["public"]["Tables"]["licitaciones"]["Row"];
export type Seguimiento = Database["public"]["Tables"]["seguimientos"]["Row"];
export type OrganismoPrevio = Database["public"]["Tables"]["organismos_previos"]["Row"];
export type Configuracion = Database["public"]["Tables"]["configuracion"]["Row"];
export type HistorialEstado = Database["public"]["Tables"]["historial_estado"]["Row"];

/** Etiquetas legibles para la UI. */
export const PORTAL_LABEL: Record<Portal, string> = {
  nacional: "ComprAR (Nacional)",
  caba: "Buenos Aires Compras (CABA)",
  pba: "PBAC (Provincia)",
};

export const ESTADO_LABEL: Record<EstadoLicitacion, string> = {
  nueva: "Nueva",
  seguimiento: "En seguimiento",
  presentada: "Presentada",
  descartada: "Descartada",
};

export const RUBROS = [
  { id: "informatica", label: "Informática y tecnología" },
  { id: "ferreteria", label: "Ferretería y herramientas" },
  { id: "indumentaria", label: "Indumentaria y calzado" },
  { id: "epp", label: "EPP (Protección Personal)" },
  { id: "bazar", label: "Bazar y vajilla" },
  { id: "mantenimiento", label: "Mantenimiento y servicios" },
  { id: "sin_clasificar", label: "Sin clasificar" },
] as const;

/**
 * Deriva la prioridad a partir del score (mismos cortes que el spec).
 *  🟢 alta: 70–100 · 🟡 media: 40–69 · 🔴 baja: 0–39
 */
export function prioridadDesdeScore(score: number): Prioridad {
  if (score >= 70) return "alta";
  if (score >= 40) return "media";
  return "baja";
}

/** Clases de color (Tailwind / shadcn badge) por prioridad. */
export const PRIORIDAD_BADGE: Record<Prioridad, string> = {
  alta: "bg-green-100 text-green-800 border-green-200",
  media: "bg-yellow-100 text-yellow-800 border-yellow-200",
  baja: "bg-red-100 text-red-800 border-red-200",
};
