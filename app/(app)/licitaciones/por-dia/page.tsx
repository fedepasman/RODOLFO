import { getLicitacionesPorFecha, getLicitacionesResumenPorFecha } from "@/lib/actions/licitaciones";
import { LicitacionesTable } from "@/components/licitaciones/licitaciones-table";
import { PorDiaNav } from "@/components/licitaciones/por-dia-nav";
import { ResumenPorFecha } from "@/components/licitaciones/resumen-por-fecha";

export default async function PorDiaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha } = await searchParams;

  // Default: hoy en UTC (el workflow guarda en UTC y corre a las 14:00 UTC = 11:00 ARG)
  const todayStr = new Date().toISOString().split("T")[0];
  const fechaSeleccionada = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : todayStr;

  const [licitaciones, resumen] = await Promise.all([
    getLicitacionesPorFecha(fechaSeleccionada),
    getLicitacionesResumenPorFecha(),
  ]);

  const totalDelDia = resumen.find((r) => r.fecha === fechaSeleccionada)?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Por día</h1>
        <p className="text-sm text-muted-foreground">
          Licitaciones importadas en cada fecha, ordenadas por score.
        </p>
      </div>

      <ResumenPorFecha fecha={fechaSeleccionada} total={totalDelDia} />

      <PorDiaNav fechaActual={fechaSeleccionada} todayStr={todayStr} />

      {licitaciones.length > 0 ? (
        <LicitacionesTable licitaciones={licitaciones} withEstadoFilter />
      ) : (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No hay licitaciones importadas para este día.
          </p>
        </div>
      )}
    </div>
  );
}
