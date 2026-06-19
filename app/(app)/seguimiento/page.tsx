import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LicitacionesTable } from "@/components/licitaciones/licitaciones-table";
import { getLicitacionesByEstado } from "@/lib/actions/licitaciones";

export default async function SeguimientoPage() {
  const enSeguimiento = await getLicitacionesByEstado("seguimiento");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Seguimiento</h1>
        <p className="text-sm text-muted-foreground">
          Licitaciones marcadas para seguir de cerca
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>En seguimiento ({enSeguimiento.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {enSeguimiento.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No hay licitaciones en seguimiento. Marcalas desde el detalle de cada una.
            </p>
          ) : (
            <LicitacionesTable licitaciones={enSeguimiento} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
