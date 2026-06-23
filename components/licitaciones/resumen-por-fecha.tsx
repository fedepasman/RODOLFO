"use client";

import { useMemo } from "react";
import type { Licitacion } from "@/types/licitaciones";

interface ResumenPorFechaProps {
  licitaciones: Licitacion[];
  fechaSeleccionada: string;
}

export function ResumenPorFecha({ licitaciones, fechaSeleccionada }: ResumenPorFechaProps) {
  const total = useMemo(() => {
    if (!licitaciones) return 0;
    return licitaciones.filter((l) => l.created_at?.startsWith(fechaSeleccionada)).length;
  }, [licitaciones, fechaSeleccionada]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-600">Licitaciones del día</div>
      <div className="mt-2 text-2xl font-bold">{total}</div>
    </div>
  );
}
