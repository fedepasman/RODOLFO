"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ESTADO_LABEL, type EstadoLicitacion } from "@/types/licitaciones";

interface Props {
  licitacionId: string;
  estadoActual: EstadoLicitacion;
}

const FLUJO: EstadoLicitacion[] = ["nueva", "seguimiento", "presentada", "descartada"];

export function CambioEstado({ licitacionId, estadoActual }: Props) {
  const [estado, setEstado] = useState<EstadoLicitacion>(estadoActual);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/licitaciones/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: licitacionId, estado }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al guardar");
      } else {
        router.refresh();
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Estado</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <Select
            value={estado}
            onValueChange={(v) => setEstado(v as EstadoLicitacion)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FLUJO.map((e) => (
                <SelectItem key={e} value={e}>
                  {ESTADO_LABEL[e]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Guardando…" : "Guardar estado"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
