import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LicitacionesTable } from "@/components/licitaciones/licitaciones-table";
import { getLicitaciones } from "@/lib/actions/licitaciones";
import type { EstadoLicitacion } from "@/types/licitaciones";

const TABS: { value: EstadoLicitacion | "todas"; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "nueva", label: "Nuevas" },
  { value: "seguimiento", label: "En seguimiento" },
  { value: "presentada", label: "Presentadas" },
  { value: "descartada", label: "Descartadas" },
];

export default async function LicitacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const licitaciones = await getLicitaciones();

  const counts: Record<string, number> = {
    todas: licitaciones.length,
  };
  for (const l of licitaciones) {
    counts[l.estado] = (counts[l.estado] ?? 0) + 1;
  }

  function forTab(estado: EstadoLicitacion | "todas") {
    if (estado === "todas") return licitaciones;
    return licitaciones.filter((l) => l.estado === estado);
  }

  const activeTab = TABS.find((t) => t.value === tab)?.value ?? "todas";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Licitaciones</h1>
        <p className="text-sm text-muted-foreground">
          {licitaciones.length} licitaciones en total
        </p>
      </div>

      <Tabs defaultValue={activeTab}>
        <TabsList className="mb-2">
          {TABS.map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5">
              {label}
              {(counts[value] ?? 0) > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                  {counts[value]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(({ value }) => (
          <TabsContent key={value} value={value}>
            <LicitacionesTable
              licitaciones={forTab(value)}
              withEstadoFilter={value === "todas"}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
