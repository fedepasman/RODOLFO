import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LicitacionesTable } from "@/components/licitaciones/licitaciones-table";
import { getLicitaciones } from "@/lib/actions/licitaciones";

export default async function DashboardPage() {
  const licitaciones = await getLicitaciones();

  const total = licitaciones.length;
  const altaPrioridad = licitaciones.filter((l) => l.prioridad === "alta").length;
  const enSeguimiento = licitaciones.filter((l) => l.estado === "seguimiento").length;
  const presentadas = licitaciones.filter((l) => l.estado === "presentada").length;

  const kpis = [
    { label: "Licitaciones activas", value: total },
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <Card>
        <CardHeader>
          <CardTitle>Licitaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <LicitacionesTable licitaciones={licitaciones} />
        </CardContent>
      </Card>
    </div>
  );
}
