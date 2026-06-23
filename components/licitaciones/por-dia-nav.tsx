"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { format, addDays, subDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface Props {
  fechaActual: string;
  todayStr: string;
}

export function PorDiaNav({ fechaActual, todayStr }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const fecha = parseISO(fechaActual);
  const esHoy = fechaActual >= todayStr;

  function navegar(nuevaFecha: Date) {
    const iso = format(nuevaFecha, "yyyy-MM-dd");
    router.push(`/licitaciones/por-dia?fecha=${iso}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => navegar(subDays(fecha, 1))}
        title="Día anterior"
      >
        <ChevronLeft className="size-4" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-60 justify-start">
            <CalendarDays className="size-4 mr-2 shrink-0" />
            <span className="capitalize">
              {format(fecha, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={fecha}
            onSelect={(day) => {
              if (day) {
                navegar(day);
                setOpen(false);
              }
            }}
            disabled={(day) => day > new Date()}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        onClick={() => navegar(addDays(fecha, 1))}
        disabled={esHoy}
        title="Día siguiente"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
