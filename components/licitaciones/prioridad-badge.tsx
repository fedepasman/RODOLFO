import { cn } from "@/lib/utils";
import type { Prioridad } from "@/types/licitaciones";

const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

const PRIORIDAD_DOT: Record<Prioridad, string> = {
  alta: "bg-green-500",
  media: "bg-yellow-500",
  baja: "bg-red-400",
};

const PRIORIDAD_BADGE: Record<Prioridad, string> = {
  alta: "bg-green-50 text-green-800 border-green-200",
  media: "bg-yellow-50 text-yellow-800 border-yellow-200",
  baja: "bg-red-50 text-red-700 border-red-200",
};

const SCORE_BAR: Record<Prioridad, string> = {
  alta: "bg-green-500",
  media: "bg-yellow-500",
  baja: "bg-red-400",
};

interface Props {
  prioridad: Prioridad;
  score?: number;
  className?: string;
}

export function PrioridadBadge({ prioridad, score, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        PRIORIDAD_BADGE[prioridad],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", PRIORIDAD_DOT[prioridad])} />
      <span>{PRIORIDAD_LABEL[prioridad]}</span>
      {score !== undefined && (
        <span className="relative inline-block w-7 h-1 rounded-full bg-current/15 shrink-0">
          <span
            className={cn("absolute inset-y-0 left-0 rounded-full", SCORE_BAR[prioridad])}
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </span>
      )}
    </span>
  );
}
