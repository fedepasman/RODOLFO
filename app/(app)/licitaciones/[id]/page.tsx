import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  Building2,
  DollarSign,
  Tag,
  Package,
  Users,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PrioridadBadge } from "@/components/licitaciones/prioridad-badge";
import { CambioEstado } from "@/components/licitaciones/cambio-estado";
import { ResultadoBtn } from "@/components/licitaciones/resultado-btn";
import { SeguimientoForm } from "@/components/licitaciones/seguimiento-form";
import {
  getLicitacion,
  getSeguimiento,
  getHistorialEstado,
} from "@/lib/actions/licitaciones";
import { PORTAL_LABEL, ESTADO_LABEL, RUBROS, type Portal } from "@/types/licitaciones";
import { NumeroCopiable } from "@/components/licitaciones/numero-copiable";
import type { Json } from "@/types/database";

// ─── tipos de dominio para los campos JSONB ───────────────────────────────────

type Renglon = {
  nro?: string | null;
  descripcion?: string | null;
  cantidad?: string | null;
  unidad?: string | null;
  codigo?: string | null;
};

type Proveedor = {
  razon_social?: string | null;
  cuit?: string | null;
};

type Cronograma = {
  publicacion?: string | null;
  inicio_consultas?: string | null;
  fin_consultas?: string | null;
  apertura?: string | null;
};

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function LicitacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [lic, seguimiento, historial] = await Promise.all([
    getLicitacion(id),
    getSeguimiento(id),
    getHistorialEstado(id),
  ]);

  if (!lic) notFound();

  const rubroLabel = RUBROS.find((r) => r.id === lic.rubro)?.label ?? lic.rubro ?? "—";

  const diasHastaElCierre = lic.fecha_cierre
    ? Math.ceil(
        (new Date(lic.fecha_cierre + "T00:00:00").getTime() - Date.now()) / 86400000,
      )
    : null;

  const renglones = lic.renglones as Renglon[] | null;
  const proveedores = lic.proveedores_invitados as Proveedor[] | null;
  const cronograma = lic.cronograma_detalle as Cronograma | null;
  const tieneDetalle =
    lic.tipo_procedimiento || lic.modalidad || renglones?.length || proveedores?.length;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/licitaciones">
            <ArrowLeft className="size-4" />
            Volver
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PrioridadBadge prioridad={lic.prioridad} score={lic.score} />
          <NumeroCopiable numero={lic.numero} />
          {lic.numero_expediente && (
            <span className="text-xs text-muted-foreground">
              Expediente: {lic.numero_expediente}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-semibold leading-snug">{lic.titulo}</h1>
        <PortalLink url={lic.url_detalle} portal={lic.portal} />
      </div>

      {/* Info + Acciones */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <InfoRow icon={<Building2 className="size-4 text-muted-foreground" />} label="Organismo">
              {lic.organismo ?? "—"}
            </InfoRow>
            <InfoRow icon={<Tag className="size-4 text-muted-foreground" />} label="Rubro">
              {rubroLabel}
            </InfoRow>
            {lic.tipo_procedimiento && (
              <InfoRow label="Procedimiento">{lic.tipo_procedimiento}</InfoRow>
            )}
            {lic.modalidad && (
              <InfoRow label="Modalidad">{lic.modalidad}</InfoRow>
            )}
            <InfoRow icon={<DollarSign className="size-4 text-muted-foreground" />} label="Monto estimado">
              {lic.monto_estimado
                ? `$${lic.monto_estimado.toLocaleString("es-AR")}`
                : "Sin dato"}
            </InfoRow>
            <InfoRow icon={<Calendar className="size-4 text-muted-foreground" />} label="Publicación">
              {lic.fecha_publicacion
                ? format(new Date(lic.fecha_publicacion + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: es })
                : "—"}
            </InfoRow>
            <InfoRow icon={<Calendar className="size-4 text-muted-foreground" />} label="Cierre">
              <span>
                {lic.fecha_cierre
                  ? format(new Date(lic.fecha_cierre + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: es })
                  : "—"}
                {diasHastaElCierre !== null && (
                  <span
                    className={`ml-2 text-xs ${
                      diasHastaElCierre <= 5
                        ? "text-red-600 font-semibold"
                        : diasHastaElCierre <= 10
                          ? "text-yellow-600"
                          : "text-muted-foreground"
                    }`}
                  >
                    ({diasHastaElCierre > 0 ? `en ${diasHastaElCierre} días` : "vencida"})
                  </span>
                )}
              </span>
            </InfoRow>
            <InfoRow label="Participación previa">
              {lic.participacion_previa ? "✅ Sí" : "❌ No"}
            </InfoRow>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <CambioEstado licitacionId={lic.id} estadoActual={lic.estado} />
          {lic.estado === "presentada" && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="text-sm font-medium text-gray-600 mb-2">Resultado</div>
              <ResultadoBtn id={lic.id} resultado={lic.resultado} />
            </div>
          )}
          <SeguimientoForm
            licitacionId={lic.id}
            notaInicial={seguimiento?.nota ?? ""}
            archivoInicial={seguimiento?.archivo_drive ?? ""}
          />
        </div>
      </div>

      {/* Cronograma detallado */}
      {cronograma && Object.values(cronograma).some(Boolean) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-4" />
              Cronograma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {cronograma.publicacion && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Publicación</span>
                  <span className="font-medium">{cronograma.publicacion}</span>
                </div>
              )}
              {cronograma.inicio_consultas && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Inicio consultas</span>
                  <span className="font-medium">{cronograma.inicio_consultas}</span>
                </div>
              )}
              {cronograma.fin_consultas && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Fin consultas</span>
                  <span className="font-medium">{cronograma.fin_consultas}</span>
                </div>
              )}
              {cronograma.apertura && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Apertura</span>
                  <span className="font-medium font-semibold text-foreground">{cronograma.apertura}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Renglones */}
      {renglones && renglones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="size-4" />
              Productos / Servicios licitados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left text-xs text-muted-foreground font-medium w-10">#</th>
                    <th className="px-4 py-2 text-left text-xs text-muted-foreground font-medium">Descripción</th>
                    <th className="px-4 py-2 text-right text-xs text-muted-foreground font-medium">Cantidad</th>
                    <th className="px-4 py-2 text-left text-xs text-muted-foreground font-medium">Unidad</th>
                    <th className="px-4 py-2 text-left text-xs text-muted-foreground font-medium hidden sm:table-cell">Código</th>
                  </tr>
                </thead>
                <tbody>
                  {renglones.map((r, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.nro ?? i + 1}</td>
                      <td className="px-4 py-2.5 font-medium">{r.descripcion ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{r.cantidad ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.unidad ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">{r.codigo ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proveedores invitados */}
      {proveedores && proveedores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4" />
              Proveedores convocados
              <Badge variant="secondary" className="ml-1">{proveedores.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left text-xs text-muted-foreground font-medium">Razón social</th>
                    <th className="px-4 py-2 text-left text-xs text-muted-foreground font-medium">CUIT</th>
                  </tr>
                </thead>
                <tbody>
                  {proveedores.map((p, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{p.razon_social ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground tabular-nums text-xs">{p.cuit ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de estado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de cambios de estado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {historial.length > 0 ? (
              historial.map((h) => (
                <HistorialItem
                  key={h.id}
                  fecha={h.created_at}
                  descripcion={
                    h.estado_anterior
                      ? `Estado cambiado a "${ESTADO_LABEL[h.estado_nuevo as keyof typeof ESTADO_LABEL] ?? h.estado_nuevo}"`
                      : `Importada con estado "${ESTADO_LABEL[h.estado_nuevo as keyof typeof ESTADO_LABEL] ?? h.estado_nuevo}"`
                  }
                />
              ))
            ) : (
              <HistorialItem
                fecha={lic.created_at}
                descripcion={`Licitación importada con estado "${ESTADO_LABEL[lic.estado]}"`}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Aviso si el detalle no está disponible aún */}
      {!tieneDetalle && (
        <p className="text-xs text-muted-foreground text-center pb-2">
          El detalle completo (renglones, proveedores, cronograma) se carga automáticamente en la próxima importación diaria.
        </p>
      )}
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const PORTAL_HOME: Record<Portal, string> = {
  nacional: "https://comprar.gob.ar",
  caba: "https://buenosairescompras.gob.ar",
  pba: "https://pbac.cgp.gba.gov.ar",
};

function PortalLink({ url, portal }: { url: string | null; portal: Portal }) {
  const href = url ?? PORTAL_HOME[portal];
  const label = url ? `Ver en ${PORTAL_LABEL[portal]}` : `Buscar en ${PORTAL_LABEL[portal]}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-primary hover:underline w-fit"
    >
      {label}
      <ExternalLink className="size-3.5" />
    </a>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-medium">{children}</span>
      </div>
    </div>
  );
}

function HistorialItem({ fecha, descripcion }: { fecha: string; descripcion: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="mt-1.5 size-2 shrink-0 rounded-full bg-muted-foreground/40" />
      <div className="flex flex-col gap-0.5">
        <span>{descripcion}</span>
        <span className="text-xs text-muted-foreground">
          {format(new Date(fecha), "dd/MM/yyyy HH:mm", { locale: es })}
        </span>
      </div>
    </div>
  );
}
