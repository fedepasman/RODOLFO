// Tipos generados manualmente a partir de lib/supabase/schema.sql
// Para regenerar con el CLI: npx supabase gen types typescript --project-id azwplnjlkfcszbrfaehv > types/database.ts
// (requiere: export SUPABASE_ACCESS_TOKEN=<token personal de supabase.com/dashboard/account/tokens>)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      licitaciones: {
        Row: {
          id: string;
          portal: "nacional" | "caba" | "pba";
          numero: string;
          titulo: string;
          organismo: string | null;
          rubro: string | null;
          monto_estimado: number | null;
          fecha_publicacion: string | null;
          fecha_cierre: string | null;
          url: string | null;
          estado: "nueva" | "seguimiento" | "presentada" | "descartada";
          score: number;
          prioridad: "alta" | "media" | "baja";
          participacion_previa: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          portal: "nacional" | "caba" | "pba";
          numero: string;
          titulo: string;
          organismo?: string | null;
          rubro?: string | null;
          monto_estimado?: number | null;
          fecha_publicacion?: string | null;
          fecha_cierre?: string | null;
          url?: string | null;
          estado?: "nueva" | "seguimiento" | "presentada" | "descartada";
          score?: number;
          prioridad?: "alta" | "media" | "baja";
          participacion_previa?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          portal?: "nacional" | "caba" | "pba";
          numero?: string;
          titulo?: string;
          organismo?: string | null;
          rubro?: string | null;
          monto_estimado?: number | null;
          fecha_publicacion?: string | null;
          fecha_cierre?: string | null;
          url?: string | null;
          estado?: "nueva" | "seguimiento" | "presentada" | "descartada";
          score?: number;
          prioridad?: "alta" | "media" | "baja";
          participacion_previa?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      seguimientos: {
        Row: {
          id: string;
          licitacion_id: string;
          user_id: string;
          nota: string | null;
          archivo_drive: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          licitacion_id: string;
          user_id: string;
          nota?: string | null;
          archivo_drive?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          licitacion_id?: string;
          user_id?: string;
          nota?: string | null;
          archivo_drive?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seguimientos_licitacion_id_fkey";
            columns: ["licitacion_id"];
            referencedRelation: "licitaciones";
            referencedColumns: ["id"];
          },
        ];
      };
      organismos_previos: {
        Row: {
          id: string;
          nombre: string;
          cuit_organismo: string | null;
          participamos: boolean;
          resultado: "ganada" | "perdida" | "desierta" | null;
        };
        Insert: {
          id?: string;
          nombre: string;
          cuit_organismo?: string | null;
          participamos?: boolean;
          resultado?: "ganada" | "perdida" | "desierta" | null;
        };
        Update: {
          id?: string;
          nombre?: string;
          cuit_organismo?: string | null;
          participamos?: boolean;
          resultado?: "ganada" | "perdida" | "desierta" | null;
        };
        Relationships: [];
      };
      configuracion: {
        Row: {
          id: string;
          peso_rubro: number;
          peso_participacion: number;
          peso_monto: number;
          peso_dias: number;
          rubros_activos: string[];
          updated_at: string;
        };
        Insert: {
          id?: string;
          peso_rubro?: number;
          peso_participacion?: number;
          peso_monto?: number;
          peso_dias?: number;
          rubros_activos?: string[];
          updated_at?: string;
        };
        Update: {
          id?: string;
          peso_rubro?: number;
          peso_participacion?: number;
          peso_monto?: number;
          peso_dias?: number;
          rubros_activos?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      historial_estado: {
        Row: {
          id: string;
          licitacion_id: string;
          user_id: string | null;
          estado_anterior: string | null;
          estado_nuevo: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          licitacion_id: string;
          user_id?: string | null;
          estado_anterior?: string | null;
          estado_nuevo: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          licitacion_id?: string;
          user_id?: string | null;
          estado_anterior?: string | null;
          estado_nuevo?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "historial_estado_licitacion_id_fkey";
            columns: ["licitacion_id"];
            referencedRelation: "licitaciones";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

export type Portal = "nacional" | "caba" | "pba";
export type EstadoLicitacion = "nueva" | "seguimiento" | "presentada" | "descartada";
export type Prioridad = "alta" | "media" | "baja";
export type ResultadoOrganismo = "ganada" | "perdida" | "desierta";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
