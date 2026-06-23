"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateConfiguracionAction, type ConfiguracionData } from "@/lib/actions/configuracion";

const PESO_FIELDS = [
  {
    key: "peso_rubro" as const,
    label: "Rubro",
    description: "Coincidencia con los rubros de interés (el más importante)",
  },
  {
    key: "peso_participacion" as const,
    label: "Participación previa",
    description: "Si ya participamos con ese organismo",
  },
  {
    key: "peso_monto" as const,
    label: "Monto estimado",
    description: "A mayor monto, mayor puntaje",
  },
  {
    key: "peso_dias" as const,
    label: "Días al cierre",
    description: "Más tiempo para preparar la oferta",
  },
] as const;

export function ConfiguracionForm({ initial }: { initial: ConfiguracionData }) {
  const [state, action, pending] = useActionState(updateConfiguracionAction, { error: null });
  const isFirst = useRef(true);

  const [pesos, setPesos] = useState({
    peso_rubro: initial.peso_rubro,
    peso_participacion: initial.peso_participacion,
    peso_monto: initial.peso_monto,
    peso_dias: initial.peso_dias,
  });

  const total = pesos.peso_rubro + pesos.peso_participacion + pesos.peso_monto + pesos.peso_dias;
  const totalOk = total === 100;

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    if (state.error) toast.error(state.error);
    else toast.success("Configuración guardada");
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-6">
      {/* Pesos */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Pesos de ponderación</CardTitle>
              <CardDescription className="mt-1">
                Determinan el score 0–100 de cada licitación. Deben sumar exactamente 100.
              </CardDescription>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-sm font-semibold tabular-nums",
                totalOk
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700",
              )}
            >
              {total}/100
            </span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {PESO_FIELDS.map(({ key, label, description }) => (
            <div key={key} className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <Label htmlFor={key} className="text-sm font-medium">
                  {label}
                </Label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Input
                  id={key}
                  name={key}
                  type="number"
                  min={0}
                  max={100}
                  value={pesos[key]}
                  onChange={(e) =>
                    setPesos((prev) => ({ ...prev, [key]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))
                  }
                  className="w-20 text-right"
                />
                <span className="text-sm text-muted-foreground w-6">pts</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !totalOk}>
          {pending ? "Guardando…" : "Guardar pesos"}
        </Button>
      </div>
    </form>
  );
}
