import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LicitacionesTable } from "@/components/licitaciones/licitaciones-table";
import { getLicitaciones } from "@/lib/actions/licitaciones";

export default async function LicitacionesPage() {
  const licitaciones = await getLicitaciones();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Licitaciones</h1>
        <p className="text-sm text-muted-foreground">
          Listado completo · {licitaciones.length} licitaciones
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas las licitaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <LicitacionesTable licitaciones={licitaciones} />
        </CardContent>
      </Card>
    </div>
  );
}
