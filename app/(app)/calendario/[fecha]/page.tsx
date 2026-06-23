import { notFound } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrioridadBadge } from "@/components/licitaciones/prioridad-badge";
import { getLicitacionesPorCierre } from "@/lib/actions/licitaciones";
import { PORTAL_LABEL, ESTADO_LABEL, type Portal, type EstadoLicitacion } from "@/types/licitaciones";
import type { Licitacion } from "@/types/licitaciones";

type Cronograma = { apertura?: string | null };

function parseHoraApertura(lic: Licitacion): number {
  const cron = lic.cronograma_detalle as Cronograma | null;
  if (!cron?.apertura) return Infinity;
  // formato: "DD/MM/YYYY HH:MM Hrs."
  const match = cron.apertura.match(/(\d{2}):(\d{2})/);
  if (!match) return Infinity;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

function horaLabel(lic: Licitacion): string | null {
  const cron = lic.cronograma_detalle as Cronograma | null;
  if (!cron?.apertura) return null;
  const match = cron.apertura.match(/(\d{2}:\d{2})/);
  return match ? match[1] : null;
}

const ESTADO_STYLES: Record<EstadoLicitacion, string> = {
  nueva: "bg-blue-100 text-blue-800 border-blue-200",
  seguimiento: "bg-purple-100 text-purple-800 border-purple-200",
  presentada: "bg-green-100 text-green-800 border-green-200",
  descartada: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

export default async function CalendarioDiaPage({
  params,
}: {
  params: Promise<{ fecha: string }>;
}) {
  const { fecha } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) notFound();

  const licitaciones = await getLicitacionesPorCierre(fecha);
  const ordenadas = [...licitaciones].sort((a, b) => parseHoraApertura(a) - parseHoraApertura(b));

  const fechaDisplay = format(parseISO(fecha), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  // mes para volver al calendario
  const mes = fecha.slice(0, 7);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/calendario?mes=${mes}`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold capitalize">{fechaDisplay}</h1>
          <p className="text-sm text-muted-foreground">
            {ordenadas.length === 0
              ? "Sin vencimientos este día"
              : `${ordenadas.length} licitación${ordenadas.length !== 1 ? "es" : ""} con vencimiento`}
          </p>
        </div>
      </div>

      {ordenadas.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">No hay licitaciones que cierren este día.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ordenadas.map((lic) => {
            const hora = horaLabel(lic);
            return (
              <Link key={lic.id} href={`/licitaciones/${lic.id}`}>
                <Card className="transition-colors hover:bg-muted/40 cursor-pointer">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-start gap-4">
                      {/* Hora */}
                      <div className="flex shrink-0 flex-col items-center justify-center rounded-md border bg-muted/50 w-16 py-2 text-center">
                        {hora ? (
                          <>
                            <Clock className="size-3 text-muted-foreground mb-0.5" />
                            <span className="text-sm font-semibold tabular-nums">{hora}</span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <PrioridadBadge prioridad={lic.prioridad} score={lic.score} />
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${ESTADO_STYLES[lic.estado]}`}
                          >
                            {ESTADO_LABEL[lic.estado]}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {PORTAL_LABEL[lic.portal as Portal]}
                          </span>
                        </div>
                        <p className="text-sm font-medium leading-snug line-clamp-2">{lic.titulo}</p>
                        {lic.organismo && (
                          <p className="text-xs text-muted-foreground">{lic.organismo}</p>
                        )}
                      </div>

                      {/* Monto */}
                      {lic.monto_estimado && (
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums">
                            ${(lic.monto_estimado / 1_000_000).toFixed(1)}M
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
