"use client";

import { useState } from "react";
import { CheckCircle, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  id: string;
  revisada: boolean;
}

export function MarcarRevisadaBtn({ id, revisada: initialRevisada }: Props) {
  const [revisada, setRevisada] = useState(initialRevisada);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    const nuevoEstado = !revisada;
    setPending(true);
    setRevisada(nuevoEstado);
    try {
      const res = await fetch("/api/licitaciones/revisada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, revisada: nuevoEstado }),
      });
      if (!res.ok) {
        setRevisada(!nuevoEstado);
      }
    } catch {
      setRevisada(!nuevoEstado);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      disabled={pending}
      onClick={handleClick}
      title={revisada ? "Marcar como no revisada" : "Marcar como revisada"}
    >
      {revisada ? (
        <CheckCircle className="size-3.5 text-green-600" />
      ) : (
        <Circle className="size-3.5 text-muted-foreground" />
      )}
    </Button>
  );
}
