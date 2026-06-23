"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Resultado = "ganada" | "perdida" | "desierta" | null;
type SelectValue = "ganada" | "perdida" | "desierta" | "pendiente";

interface Props {
  id: string;
  resultado: Resultado;
}

const TRIGGER_STYLE: Record<SelectValue, string> = {
  pendiente: "text-muted-foreground border-dashed",
  ganada: "border-green-500 text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400",
  perdida: "border-red-400 text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400",
  desierta: "border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
};

export function ResultadoBtn({ id, resultado: initialResultado }: Props) {
  const [resultado, setResultado] = useState<Resultado>(initialResultado);
  const [pending, setPending] = useState(false);

  const current: SelectValue = resultado ?? "pendiente";

  async function handleChange(value: string) {
    const nuevoResultado: Resultado = value === "pendiente" ? null : (value as Resultado);
    const prevResultado = resultado;
    setResultado(nuevoResultado);
    setPending(true);
    try {
      const res = await fetch("/api/licitaciones/resultado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, resultado: nuevoResultado }),
      });
      if (!res.ok) {
        setResultado(prevResultado);
      }
    } catch {
      setResultado(prevResultado);
    } finally {
      setPending(false);
    }
  }

  return (
    <Select value={current} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger
        className={cn(
          "h-7 w-32 text-xs font-medium",
          TRIGGER_STYLE[current],
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pendiente" className="text-xs text-muted-foreground">
          Pendiente
        </SelectItem>
        <SelectItem value="ganada" className="text-xs text-green-700">
          Ganada ✓
        </SelectItem>
        <SelectItem value="perdida" className="text-xs text-red-600">
          Perdida ✗
        </SelectItem>
        <SelectItem value="desierta" className="text-xs text-amber-600">
          Desierta —
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
