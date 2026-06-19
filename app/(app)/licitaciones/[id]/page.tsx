import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, ExternalLink, Calendar, Building2, DollarSign, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PrioridadBadge } from "@/components/licitaciones/prioridad-badge";
import { CambioEstado } from "@/components/licitaciones/cambio-estado";
import { SeguimientoForm } from "@/components/licitaciones/seguimiento-form";
import {
  getLicitacion,
  getSeguimiento,
  getHistorialEstado,
} from "@/lib/actions/licitaciones";
import { PORTAL_LABEL, ESTADO_LABEL, RUBROS } from "@/types/licitaciones";

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

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PrioridadBadge prioridad={lic.prioridad} score={lic.score} />
          <span className="text-xs text-muted-foreground">{lic.numero}</span>
        </div>
        <h1 className="text-2xl font-semibold leading-snug">{lic.titulo}</h1>
        <a
          href={lic.url ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline w-fit"
        >
          Ver en {PORTAL_LABEL[lic.portal]}
          <ExternalLink className="size-3.5" />
        </a>
      </div>

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
          <SeguimientoForm
            licitacionId={lic.id}
            notaInicial={seguimiento?.nota ?? ""}
            archivoInicial={seguimiento?.archivo_drive ?? ""}
          />
        </div>
      </div>

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
    </div>
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
