import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LicitacionesTable } from "@/components/licitaciones/licitaciones-table";
import { PrioridadBadge } from "@/components/licitaciones/prioridad-badge";
import { getLicitaciones } from "@/lib/actions/licitaciones";

export default async function DashboardPage() {
  const licitaciones = await getLicitaciones();

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const activas = licitaciones.filter((l) => l.estado !== "descartada");
  const total = activas.length;
  const altaPrioridad = activas.filter((l) => l.prioridad === "alta").length;
  const enSeguimiento = activas.filter((l) => l.estado === "seguimiento").length;
  const presentadas = licitaciones.filter((l) => l.estado === "presentada").length;
  const sinRevisar = activas.filter((l) => !l.revisada).length;

  const urgentes = activas
    .filter((l) => {
      if (l.estado !== "seguimiento") return false;
      if (!l.fecha_cierre) return false;
      const cierre = new Date(l.fecha_cierre + "T00:00:00");
      const dias = Math.ceil((cierre.getTime() - hoy.getTime()) / 86400000);
      return dias >= 0 && dias <= 15;
    })
    .sort((a, b) => {
      const da = new Date(a.fecha_cierre! + "T00:00:00").getTime();
      const db = new Date(b.fecha_cierre! + "T00:00:00").getTime();
      return da - db;
    });

  const kpis = [
    { label: "Activas", value: total },
    { label: "Sin revisar", value: sinRevisar },
    { label: "Alta prioridad", value: altaPrioridad },
    { label: "En seguimiento", value: enSeguimiento },
    { label: "Presentadas", value: presentadas },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Resumen general · {total} licitaciones activas
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold">{kpi.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {urgentes.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-orange-700 dark:text-orange-400">
              <AlertTriangle className="size-4" />
              En seguimiento · vencen en 15 días ({urgentes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col divide-y">
              {urgentes.map((l) => {
                const cierre = new Date(l.fecha_cierre! + "T00:00:00");
                const dias = Math.ceil((cierre.getTime() - hoy.getTime()) / 86400000);
                return (
                  <Link
                    key={l.id}
                    href={`/licitaciones/${l.id}`}
                    className="flex items-start justify-between gap-4 py-3 hover:bg-orange-50/80 dark:hover:bg-orange-950/20 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-sm font-medium line-clamp-1">{l.titulo}</span>
                      <span className="text-xs text-muted-foreground">{l.organismo ?? "—"}</span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <PrioridadBadge prioridad={l.prioridad} score={l.score} />
                      <span className={`flex items-center gap-1 text-xs font-medium ${dias <= 2 ? "text-red-600" : "text-orange-600"}`}>
                        <Clock className="size-3" />
                        {dias === 0
                          ? "Hoy"
                          : dias === 1
                          ? "Mañana"
                          : `${dias} días`}
                        {" · "}
                        {format(cierre, "dd MMM", { locale: es })}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Todas las licitaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <LicitacionesTable licitaciones={activas} />
        </CardContent>
      </Card>
    </div>
  );
}
