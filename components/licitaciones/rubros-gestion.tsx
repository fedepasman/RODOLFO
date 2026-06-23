"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createRubroAction,
  updateRubroAction,
  toggleRubroAction,
  deleteRubroAction,
  type Rubro,
  type ActionResult,
} from "@/lib/actions/rubros";

// ─── Item individual ──────────────────────────────────────────────────────────

function RubroItem({ rubro }: { rubro: Rubro }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const boundUpdate = updateRubroAction.bind(null, rubro.id);
  const [updateState, updateAction, updatePending] = useActionState(boundUpdate, {
    error: null,
  } as ActionResult);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    if (updateState.error) toast.error(updateState.error);
    else { toast.success("Rubro actualizado"); setEditing(false); }
  }, [updateState]);

  function handleToggle() {
    startTransition(async () => {
      const res = await toggleRubroAction(rubro.id, !rubro.activo);
      if (res.error) toast.error(res.error);
    });
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar el rubro "${rubro.label}"?\nLas licitaciones importadas con este rubro no se verán afectadas.`)) return;
    startTransition(async () => {
      const res = await deleteRubroAction(rubro.id);
      if (res.error) toast.error(res.error);
    });
  }

  return (
    <div className={cn("rounded-lg border bg-card transition-colors", !rubro.activo && "opacity-60")}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className={cn(
            "h-5 w-5 shrink-0 rounded-full border-2 transition-colors",
            rubro.activo
              ? "border-primary bg-primary"
              : "border-muted-foreground/40 bg-transparent",
          )}
          title={rubro.activo ? "Desactivar" : "Activar"}
        >
          {rubro.activo && <Check className="h-3 w-3 text-primary-foreground mx-auto" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{rubro.label}</p>
          <p className="text-xs text-muted-foreground font-mono">{rubro.nombre}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted-foreground tabular-nums">
            {rubro.keywords.length} keywords
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setEditing((v) => !v)}
            title="Editar"
          >
            {editing ? <ChevronUp className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={isPending}
            title="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Keywords preview (collapsed) */}
      {!editing && (
        <div className="border-t px-3 py-2 flex flex-wrap gap-1">
          {rubro.keywords.slice(0, 8).map((kw) => (
            <span key={kw} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {kw}
            </span>
          ))}
          {rubro.keywords.length > 8 && (
            <span className="text-xs text-muted-foreground">+{rubro.keywords.length - 8} más</span>
          )}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <form action={updateAction} className="border-t p-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`label-${rubro.id}`} className="text-xs">Nombre visible</Label>
            <Input
              id={`label-${rubro.id}`}
              name="label"
              defaultValue={rubro.label}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`kw-${rubro.id}`} className="text-xs">
              Palabras clave{" "}
              <span className="text-muted-foreground">(separadas por coma)</span>
            </Label>
            <Textarea
              id={`kw-${rubro.id}`}
              name="keywords"
              defaultValue={rubro.keywords.join(", ")}
              rows={3}
              className="text-sm font-mono resize-none"
              placeholder="palabra1, palabra2, palabra3"
            />
            <p className="text-xs text-muted-foreground">
              La búsqueda es parcial: "ferr" detecta "ferretería", "ferrería", etc.
            </p>
          </div>
          {updateState.error && (
            <p className="text-xs text-destructive">{updateState.error}</p>
          )}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={updatePending}>
              {updatePending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Formulario nuevo rubro ───────────────────────────────────────────────────

function NuevoRubroForm({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState(createRubroAction, { error: null } as ActionResult);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    if (state.error) toast.error(state.error);
    else { toast.success("Rubro creado"); onClose(); }
  }, [state, onClose]);

  return (
    <form action={action} className="rounded-lg border border-dashed p-4 flex flex-col gap-3">
      <p className="text-sm font-medium">Nuevo rubro</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="nombre-nuevo" className="text-xs">
            ID interno <span className="text-muted-foreground">(sin espacios, minúsculas)</span>
          </Label>
          <Input
            id="nombre-nuevo"
            name="nombre"
            placeholder="mis_productos"
            className="h-8 text-sm font-mono"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="label-nuevo" className="text-xs">Nombre visible</Label>
          <Input
            id="label-nuevo"
            name="label"
            placeholder="Mis Productos"
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="kw-nuevo" className="text-xs">
          Palabras clave <span className="text-muted-foreground">(separadas por coma)</span>
        </Label>
        <Textarea
          id="kw-nuevo"
          name="keywords"
          rows={2}
          className="text-sm font-mono resize-none"
          placeholder="palabra1, palabra2, parcial_ok"
        />
        <p className="text-xs text-muted-foreground">
          El sistema busca estas palabras (parcialmente) en el título de cada licitación.
        </p>
      </div>

      {state.error && <p className="text-xs text-destructive">{state.error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Creando…" : "Crear rubro"}
        </Button>
      </div>
    </form>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function RubrosGestion({ rubros }: { rubros: Rubro[] }) {
  const [showForm, setShowForm] = useState(false);
  const activos = rubros.filter((r) => r.activo).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Rubros</CardTitle>
            <CardDescription className="mt-1">
              El workflow importa solo licitaciones que coincidan con los rubros activos.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm((v) => !v)}
            className="shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground mb-1">
          {activos} de {rubros.length} rubros activos
        </p>

        {showForm && (
          <NuevoRubroForm onClose={() => setShowForm(false)} />
        )}

        {rubros.map((rubro) => (
          <RubroItem key={rubro.id} rubro={rubro} />
        ))}

        {rubros.length === 0 && !showForm && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay rubros. Agregá uno para empezar.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
