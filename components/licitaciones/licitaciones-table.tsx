"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PrioridadBadge } from "@/components/licitaciones/prioridad-badge";
import { Input } from "@/components/ui/input";
import {
  PORTAL_LABEL,
  ESTADO_LABEL,
  RUBROS,
  type Licitacion,
  type Portal,
  type EstadoLicitacion,
  type Prioridad,
} from "@/types/licitaciones";

interface Props {
  licitaciones: Licitacion[];
  withEstadoFilter?: boolean;
}

const TODOS = "todos";

export function LicitacionesTable({ licitaciones, withEstadoFilter = true }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [portalFiltro, setPortalFiltro] = useState(TODOS);
  const [prioridadFiltro, setPrioridadFiltro] = useState(TODOS);
  const [rubroFiltro, setRubroFiltro] = useState(TODOS);
  const [estadoFiltro, setEstadoFiltro] = useState(TODOS);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return licitaciones
      .filter((l) => {
        if (!q) return true;
        return (
          l.titulo.toLowerCase().includes(q) ||
          (l.organismo ?? "").toLowerCase().includes(q) ||
          l.numero.toLowerCase().includes(q)
        );
      })
      .filter((l) => portalFiltro === TODOS || l.portal === portalFiltro)
      .filter((l) => prioridadFiltro === TODOS || l.prioridad === prioridadFiltro)
      .filter((l) => rubroFiltro === TODOS || l.rubro === rubroFiltro)
      .filter((l) => estadoFiltro === TODOS || l.estado === estadoFiltro)
      .sort((a, b) => b.score - a.score);
  }, [licitaciones, busqueda, portalFiltro, prioridadFiltro, rubroFiltro, estadoFiltro]);

  const hayFiltros =
    busqueda !== "" ||
    portalFiltro !== TODOS ||
    prioridadFiltro !== TODOS ||
    rubroFiltro !== TODOS ||
    (withEstadoFilter && estadoFiltro !== TODOS);

  function limpiarFiltros() {
    setBusqueda("");
    setPortalFiltro(TODOS);
    setPrioridadFiltro(TODOS);
    setRubroFiltro(TODOS);
    if (withEstadoFilter) setEstadoFiltro(TODOS);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Búsqueda + Filtros */}
      <div className="flex flex-col gap-3">
      <Input
        placeholder="Buscar por título, organismo o número…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="h-8 text-sm"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Select value={portalFiltro} onValueChange={setPortalFiltro}>
          <SelectTrigger className="h-8 w-48 text-xs">
            <SelectValue placeholder="Portal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los portales</SelectItem>
            {(Object.entries(PORTAL_LABEL) as [Portal, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={prioridadFiltro} onValueChange={setPrioridadFiltro}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas las prioridades</SelectItem>
            <SelectItem value="alta">🟢 Alta</SelectItem>
            <SelectItem value="media">🟡 Media</SelectItem>
            <SelectItem value="baja">🔴 Baja</SelectItem>
          </SelectContent>
        </Select>

        <Select value={rubroFiltro} onValueChange={setRubroFiltro}>
          <SelectTrigger className="h-8 w-48 text-xs">
            <SelectValue placeholder="Rubro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los rubros</SelectItem>
            {RUBROS.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {withEstadoFilter && (
          <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los estados</SelectItem>
              {(Object.entries(ESTADO_LABEL) as [EstadoLicitacion, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hayFiltros && (
          <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="h-8 text-xs">
            Limpiar filtros
          </Button>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {filtradas.length} de {licitaciones.length} licitaciones
        </span>
      </div>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Prioridad</TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="hidden md:table-cell">Organismo</TableHead>
              <TableHead className="hidden lg:table-cell">Portal</TableHead>
              <TableHead className="hidden lg:table-cell">Rubro</TableHead>
              <TableHead className="hidden md:table-cell text-right">Monto est.</TableHead>
              <TableHead className="hidden sm:table-cell">Cierre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  No hay licitaciones con los filtros seleccionados.
                </TableCell>
              </TableRow>
            ) : (
              filtradas.map((lic) => (
                <TableRow
                  key={lic.id}
                  className={cn(
                    "group border-l-2",
                    lic.prioridad === "alta"
                      ? "border-l-green-500"
                      : lic.prioridad === "media"
                      ? "border-l-yellow-400"
                      : "border-l-red-400",
                  )}
                >
                  <TableCell>
                    <PrioridadBadge prioridad={lic.prioridad} score={lic.score} />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/licitaciones/${lic.id}`}
                      className="line-clamp-2 hover:underline"
                    >
                      {lic.titulo}
                    </Link>
                    <p className="text-xs text-muted-foreground">{lic.numero}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-48">
                    <span className="line-clamp-2 text-sm">{lic.organismo ?? "—"}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {PORTAL_LABEL[lic.portal]}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm capitalize">
                    {lic.rubro ?? "—"}
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
                    <EstadoBadge estado={lic.estado} />
                  </TableCell>
                  <TableCell>
                    <Link href={`/licitaciones/${lic.id}`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="size-3.5" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: EstadoLicitacion }) {
  const styles: Record<EstadoLicitacion, string> = {
    nueva: "bg-blue-100 text-blue-800 border-blue-200",
    seguimiento: "bg-purple-100 text-purple-800 border-purple-200",
    presentada: "bg-green-100 text-green-800 border-green-200",
    descartada: "bg-zinc-100 text-zinc-500 border-zinc-200",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${styles[estado]}`}
    >
      {ESTADO_LABEL[estado]}
    </span>
  );
}
