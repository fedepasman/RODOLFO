import { getConfiguracion } from "@/lib/actions/configuracion";
import { getRubros } from "@/lib/actions/rubros";
import { ConfiguracionForm } from "@/components/licitaciones/configuracion-form";
import { RubrosGestion } from "@/components/licitaciones/rubros-gestion";
import { GoogleCalendarCard } from "@/components/configuracion/google-calendar-card";

export default async function ConfiguracionPage() {
  const [config, rubros] = await Promise.all([getConfiguracion(), getRubros()]);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Pesos de ponderación y rubros que el workflow importa.
        </p>
      </div>
      <ConfiguracionForm initial={config} />
      <RubrosGestion rubros={rubros} />
      <GoogleCalendarCard />
    </div>
  );
}
