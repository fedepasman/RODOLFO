"use client";

import { useActionState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertSeguimientoAction, type ActionResult } from "@/lib/actions/licitaciones";

interface Props {
  licitacionId: string;
  notaInicial: string;
  archivoInicial: string;
}

const initialState: ActionResult = { error: null };

export function SeguimientoForm({ licitacionId, notaInicial, archivoInicial }: Props) {
  const [state, formAction, pending] = useActionState(upsertSeguimientoAction, initialState);
  const savedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!pending && state.error === null && savedAt.current === null) {
      savedAt.current = 0;
    } else if (!pending && state.error === null) {
      savedAt.current = Date.now();
    }
  }, [pending, state.error]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="licitacion_id" value={licitacionId} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notas de seguimiento</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Label htmlFor="nota" className="sr-only">Notas</Label>
          <Textarea
            id="nota"
            name="nota"
            className="min-h-28 resize-y"
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
          <Label htmlFor="archivo_drive" className="sr-only">Link Google Drive</Label>
          <Input
            id="archivo_drive"
            type="url"
            name="archivo_drive"
            placeholder="https://drive.google.com/…"
            defaultValue={archivoInicial}
          />
        </CardContent>
      </Card>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : savedAt.current !== null && savedAt.current > 0 ? (
        <p className="text-xs text-muted-foreground">Guardado correctamente.</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar notas y archivos"}
      </Button>
    </form>
  );
}
