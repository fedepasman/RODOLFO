"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Licitacion, Prioridad } from "@/types/licitaciones";

interface Props {
  licitaciones: Licitacion[];
  year: number;
  month: number;
}

const CHIP: Record<Prioridad, string> = {
  alta: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  media: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  baja: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MAX_VISIBLE = 3;

export function CalendarioView({ licitaciones, year, month }: Props) {
  const router = useRouter();
  const currentMonth = new Date(year, month - 1);

  const porDia = useMemo(
    () =>
      licitaciones.reduce<Record<string, Licitacion[]>>((acc, l) => {
        if (!l.fecha_cierre || l.estado !== "seguimiento") return acc;
        acc[l.fecha_cierre] = [...(acc[l.fecha_cierre] ?? []), l];
        return acc;
      }, {}),
    [licitaciones],
  );

  const weeks = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const gridEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) result.push(days.slice(i, i + 7));
    return result;
  }, [year, month]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = (dir: -1 | 1) => {
    const next = dir === 1 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1);
    router.push(`/calendario?mes=${format(next, "yyyy-MM")}`);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="rounded-lg border overflow-hidden">
        {/* Month header */}
        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2.5">
          <h2 className="text-sm font-semibold capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </h2>
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="size-7" onClick={() => navigate(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-7" onClick={() => navigate(1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* Day-of-week labels */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }} className="border-b">
          {DAY_LABELS.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
          {weeks.map((week, wi) =>
            week.map((day, di) => {
              const key = format(day, "yyyy-MM-dd");
              const items = porDia[key] ?? [];
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const visible = items.slice(0, MAX_VISIBLE);
              const overflow = items.length - MAX_VISIBLE;
              const isLastRow = wi === weeks.length - 1;
              const isLastCol = di === 6;

              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-[6rem] p-1.5 flex flex-col gap-0.5",
                    !isLastRow && "border-b",
                    !isLastCol && "border-r",
                    !inMonth && "bg-muted/20",
                  )}
                >
                  <div className="flex justify-center mb-0.5">
                    <Link
                      href={`/calendario/${key}`}
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-xs transition-colors hover:bg-muted",
                        today
                          ? "bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                          : inMonth
                            ? "text-foreground"
                            : "text-muted-foreground",
                      )}
                    >
                      {format(day, "d")}
                    </Link>
                  </div>

                  {visible.map((l) => (
                    <Tooltip key={l.id}>
                      <TooltipTrigger asChild>
                        <Link
                          href={`/licitaciones/${l.id}`}
                          className={cn(
                            "block truncate rounded px-1 py-px text-[10px] leading-tight font-medium transition-opacity hover:opacity-75",
                            CHIP[l.prioridad],
                          )}
                        >
                          {l.titulo}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-72">
                        <p className="font-medium">{l.titulo}</p>
                        {l.organismo && (
                          <p className="mt-0.5 text-muted-foreground">{l.organismo}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ))}

                  {overflow > 0 && (
                    <span className="px-1 text-[10px] text-muted-foreground">
                      +{overflow} más
                    </span>
                  )}
                </div>
              );
            }),
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
