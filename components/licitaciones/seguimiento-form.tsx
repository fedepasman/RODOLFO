"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { upsertSeguimientoAction, type ActionResult } from "@/lib/actions/licitaciones";

interface Props {
  licitacionId: string;
  notaInicial: string;
  archivoInicial: string;
}

const initialState: ActionResult = { error: null };

export function SeguimientoForm({ licitacionId, notaInicial, archivoInicial }: Props) {
  const [state, formAction, pending] = useActionState(upsertSeguimientoAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="licitacion_id" value={licitacionId} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notas de seguimiento</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <textarea
            name="nota"
            className="w-full min-h-24 resize-y rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Documentos recibidos, contactos, decisiones…"
            defaultValue={notaInicial}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Archivos adjuntos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Pegá el link al documento en Google Drive.
          </p>
          <input
            type="url"
            name="archivo_drive"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="https://drive.google.com/…"
            defaultValue={archivoInicial}
          />
        </CardContent>
      </Card>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state.error === null && !pending && notaInicial === "" && archivoInicial === "" ? null : (
        state.error === null && !pending ? (
          <p className="text-xs text-muted-foreground">Guardado correctamente.</p>
        ) : null
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar notas y archivos"}
      </Button>
    </form>
  );
}
