"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
      <Button onClick={handleConnect} disabled={isLoading} size="sm">
        {isLoading ? "Conectando..." : "Conectar Google Calendar"}
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      <Button onClick={handleSyncAll} disabled={isLoading} size="sm">
        {isLoading ? "Sincronizando..." : "Sincronizar todo"}
      </Button>
      <Button onClick={handleDisconnect} disabled={isLoading} variant="outline" size="sm">
        {isLoading ? "Desconectando..." : "Desconectar"}
      </Button>
    </div>
  );
}
