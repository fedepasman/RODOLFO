"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

interface GoogleCalendarButtonProps {
  isConnected: boolean;
}

export function GoogleCalendarButton({ isConnected }: GoogleCalendarButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("google") === "conectado") {
      toast.success("Google Calendar conectado correctamente");
      router.replace("/configuracion");
    } else if (searchParams.get("google") === "error") {
      toast.error("Error al conectar Google Calendar");
      router.replace("/configuracion");
    }
  }, [searchParams, router]);

  const handleConnect = () => {
    window.location.href = "/api/auth/google";
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/google", { method: "DELETE" });
      if (response.ok) {
        toast.success("Google Calendar desconectado");
        router.refresh();
      } else {
        toast.error("Error al desconectar");
      }
    } catch (error) {
      toast.error("Error al desconectar");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/calendar/sync", { method: "POST" });
      const data = await response.json();
      if (data.ok) {
        toast.success(`${data.sincronizadas} licitaciones sincronizadas`);
      } else {
        toast.error(data.error || "Error al sincronizar");
      }
    } catch (error) {
      toast.error("Error al sincronizar");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        disabled={isLoading}
        className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? "Conectando..." : "Conectar Google Calendar"}
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleSyncAll}
        disabled={isLoading}
        className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
      >
        {isLoading ? "Sincronizando..." : "Sincronizar todo"}
      </button>
      <button
        onClick={handleDisconnect}
        disabled={isLoading}
        className="inline-flex items-center px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
      >
        {isLoading ? "Desconectando..." : "Desconectar"}
      </button>
    </div>
  );
}
