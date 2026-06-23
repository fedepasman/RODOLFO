import { getLicitacionesPorMes } from "@/lib/actions/licitaciones";
import { CalendarioView } from "@/components/calendario/calendario-view";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const today = new Date();
  const [year, month] =
    mes && /^\d{4}-\d{2}$/.test(mes)
      ? mes.split("-").map(Number)
      : [today.getFullYear(), today.getMonth() + 1];

  const licitaciones = await getLicitacionesPorMes(year, month);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Calendario</h1>
        <p className="text-sm text-muted-foreground">Vencimientos de licitaciones por día.</p>
      </div>
      <CalendarioView licitaciones={licitaciones} year={year} month={month} />
    </div>
  );
}
