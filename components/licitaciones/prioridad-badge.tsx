import { cn } from "@/lib/utils";
import type { Prioridad } from "@/types/licitaciones";
import { PRIORIDAD_BADGE } from "@/types/licitaciones";

const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

const PRIORIDAD_EMOJI: Record<Prioridad, string> = {
  alta: "🟢",
  media: "🟡",
  baja: "🔴",
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
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        PRIORIDAD_BADGE[prioridad],
        className,
      )}
    >
      <span>{PRIORIDAD_EMOJI[prioridad]}</span>
      <span>{PRIORIDAD_LABEL[prioridad]}</span>
      {score !== undefined && (
        <span className="opacity-70">({score})</span>
      )}
    </span>
  );
}
