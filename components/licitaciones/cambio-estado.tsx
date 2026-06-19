"use client";

import { useActionState } from "react";
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
import { updateEstadoAction, type ActionResult } from "@/lib/actions/licitaciones";

interface Props {
  licitacionId: string;
  estadoActual: EstadoLicitacion;
}

const FLUJO: EstadoLicitacion[] = ["nueva", "seguimiento", "presentada", "descartada"];
const initialState: ActionResult = { error: null };

export function CambioEstado({ licitacionId, estadoActual }: Props) {
  const [state, formAction, pending] = useActionState(updateEstadoAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Estado</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="licitacion_id" value={licitacionId} />
          <Select name="estado" defaultValue={estadoActual}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FLUJO.map((estado) => (
                <SelectItem key={estado} value={estado}>
                  {ESTADO_LABEL[estado]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.error && (
            <p className="text-xs text-destructive">{state.error}</p>
          )}
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Guardando…" : "Guardar estado"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
