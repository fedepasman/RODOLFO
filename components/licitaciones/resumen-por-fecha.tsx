interface ResumenPorFechaProps {
  fecha: string;
  total: number;
}

export function ResumenPorFecha({ fecha, total }: ResumenPorFechaProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-600">Licitaciones del día</div>
      <div className="mt-2 text-2xl font-bold">{total}</div>
    </div>
  );
}
