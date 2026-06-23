import { getLicitacionesByEstado } from "@/lib/actions/licitaciones";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PORTAL_LABEL, RUBROS, type Portal } from "@/types/licitaciones";
import { cn } from "@/lib/utils";

type Resultado = "ganada" | "perdida" | "desierta" | null;

function pct(num: number, den: number) {
  if (den === 0) return 0;
  return Math.round((num / den) * 100);
}

function BarraResultado({
  ganadas,
  perdidas,
  desierta,
  total,
}: {
  ganadas: number;
  perdidas: number;
  desierta: number;
  total: number;
}) {
  if (total === 0) return <span className="text-xs text-muted-foreground">Sin datos</span>;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-muted">
        {ganadas > 0 && (
          <div
            className="h-full bg-green-500"
            style={{ width: `${pct(ganadas, total)}%` }}
            title={`Ganadas: ${ganadas}`}
          />
        )}
        {perdidas > 0 && (
          <div
            className="h-full bg-red-400"
            style={{ width: `${pct(perdidas, total)}%` }}
            title={`Perdidas: ${perdidas}`}
          />
        )}
        {desierta > 0 && (
          <div
            className="h-full bg-amber-300"
            style={{ width: `${pct(desierta, total)}%` }}
            title={`Desierta: ${desierta}`}
          />
        )}
      </div>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground w-8 text-right">
        {total}
      </span>
    </div>
  );
}

export default async function MetricasPage() {
  const presentadas = await getLicitacionesByEstado("presentada");

  const ganadas = presentadas.filter((l) => l.resultado === "ganada").length;
  const perdidas = presentadas.filter((l) => l.resultado === "perdida").length;
  const desierta = presentadas.filter((l) => l.resultado === "desierta").length;
  const pendientes = presentadas.filter((l) => l.resultado === null).length;
  const total = presentadas.length;
  const conResultado = ganadas + perdidas;
  const tasaConversion = pct(ganadas, conResultado);

  // Por rubro
  const rubroIds = [...new Set(presentadas.map((l) => l.rubro).filter(Boolean))] as string[];
  const porRubro = rubroIds.map((rubro) => {
    const lics = presentadas.filter((l) => l.rubro === rubro);
    return {
      rubro,
      label: RUBROS.find((r) => r.id === rubro)?.label ?? rubro,
      ganadas: lics.filter((l) => l.resultado === "ganada").length,
      perdidas: lics.filter((l) => l.resultado === "perdida").length,
      desierta: lics.filter((l) => l.resultado === "desierta").length,
      total: lics.length,
    };
  }).sort((a, b) => b.total - a.total);

  // Por portal
  const portales = (["nacional", "caba", "pba"] as Portal[]).map((portal) => {
    const lics = presentadas.filter((l) => l.portal === portal);
    return {
      portal,
      label: PORTAL_LABEL[portal],
      ganadas: lics.filter((l) => l.resultado === "ganada").length,
      perdidas: lics.filter((l) => l.resultado === "perdida").length,
      desierta: lics.filter((l) => l.resultado === "desierta").length,
      total: lics.length,
    };
  }).filter((p) => p.total > 0);

  const kpis = [
    { label: "Total presentadas", value: total, className: "" },
    { label: "Ganadas", value: ganadas, className: "text-green-600" },
    { label: "Perdidas", value: perdidas, className: "text-red-500" },
    { label: "Desierta", value: desierta, className: "text-amber-500" },
    { label: "Pendientes", value: pendientes, className: "text-muted-foreground" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Métricas</h1>
        <p className="text-sm text-muted-foreground">
          Eficacia en presentaciones · basado en {total} licitación{total !== 1 ? "es" : ""} presentada{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className={cn("text-3xl font-bold", k.className)}>{k.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tasa de conversión */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tasa de conversión</CardTitle>
        </CardHeader>
        <CardContent>
          {conResultado === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay resultados cargados. Andá a{" "}
              <a href="/presentadas" className="underline underline-offset-2">Presentadas</a>{" "}
              y registrá ganadas/perdidas.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold text-green-600">{tasaConversion}%</span>
                <span className="mb-1 text-sm text-muted-foreground">
                  {ganadas} ganada{ganadas !== 1 ? "s" : ""} de {conResultado} con resultado definido
                </span>
              </div>
              <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${tasaConversion}%` }}
                />
                <div
                  className="h-full bg-red-400 transition-all"
                  style={{ width: `${pct(perdidas, conResultado)}%` }}
                />
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2.5 rounded-full bg-green-500" /> Ganadas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2.5 rounded-full bg-red-400" /> Perdidas
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Por rubro */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Por rubro</CardTitle>
          </CardHeader>
          <CardContent>
            {porRubro.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos</p>
            ) : (
              <div className="flex flex-col gap-3">
                {porRubro.map((r) => (
                  <div key={r.rubro} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate text-sm">{r.label}</span>
                    <BarraResultado
                      ganadas={r.ganadas}
                      perdidas={r.perdidas}
                      desierta={r.desierta}
                      total={r.total}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Por portal */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Por portal</CardTitle>
          </CardHeader>
          <CardContent>
            {portales.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos</p>
            ) : (
              <div className="flex flex-col gap-3">
                {portales.map((p) => (
                  <div key={p.portal} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate text-sm">{p.label}</span>
                    <BarraResultado
                      ganadas={p.ganadas}
                      perdidas={p.perdidas}
                      desierta={p.desierta}
                      total={p.total}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-green-500" /> Ganadas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-red-400" /> Perdidas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-amber-300" /> Desierta
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-muted-foreground/30" /> Pendiente
        </span>
      </div>
    </div>
  );
}
