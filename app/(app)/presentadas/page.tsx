import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PrioridadBadge } from "@/components/licitaciones/prioridad-badge";
import { ResultadoBtn } from "@/components/licitaciones/resultado-btn";
import { getLicitacionesByEstado } from "@/lib/actions/licitaciones";
import { PORTAL_LABEL, type Portal } from "@/types/licitaciones";

export default async function PresentadasPage() {
  const presentadas = await getLicitacionesByEstado("presentada");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Presentadas</h1>
        <p className="text-sm text-muted-foreground">
          Licitaciones en las que te presentaste · registrá el resultado de cada una
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Presentadas ({presentadas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {presentadas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No hay licitaciones presentadas aún. Cambiá el estado desde el detalle de cada una.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-72">Licitación</TableHead>
                    <TableHead className="hidden lg:table-cell">Portal</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Monto est.</TableHead>
                    <TableHead className="hidden sm:table-cell">Cierre</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {presentadas.map((lic) => (
                    <TableRow key={lic.id} className="group">
                      <TableCell className="whitespace-normal">
                        <div className="flex items-start gap-2">
                          <PrioridadBadge prioridad={lic.prioridad} score={lic.score} />
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <Link
                              href={`/licitaciones/${lic.id}`}
                              className="line-clamp-2 text-sm font-medium hover:underline leading-snug"
                            >
                              {lic.titulo}
                            </Link>
                            <p className="text-xs text-muted-foreground">{lic.numero}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {PORTAL_LABEL[lic.portal as Portal]}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right text-sm tabular-nums">
                        {lic.monto_estimado
                          ? `$${(lic.monto_estimado / 1_000_000).toFixed(1)}M`
                          : "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {lic.fecha_cierre
                          ? format(new Date(lic.fecha_cierre + "T00:00:00"), "dd MMM", { locale: es })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <ResultadoBtn id={lic.id} resultado={lic.resultado} />
                      </TableCell>
                      <TableCell className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/licitaciones/${lic.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ExternalLink className="size-3.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
