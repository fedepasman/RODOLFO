"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Bookmark,
  CheckCircle,
  Settings,
  CalendarDays,
  CalendarRange,
  BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/licitaciones", label: "Licitaciones", icon: FileText },
  { href: "/licitaciones/por-dia", label: "Por día", icon: CalendarDays },
  { href: "/calendario", label: "Calendario", icon: CalendarRange },
  { href: "/seguimiento", label: "Seguimiento", icon: Bookmark },
  { href: "/presentadas", label: "Presentadas", icon: CheckCircle },
  { href: "/metricas", label: "Métricas", icon: BarChart2 },
  { href: "/configuracion", label: "Configuración", icon: Settings },
] as const;

function bestMatch(pathname: string) {
  return [...NAV]
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function Sidebar() {
  const pathname = usePathname();
  const activeHref = bestMatch(pathname);

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = activeHref === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
