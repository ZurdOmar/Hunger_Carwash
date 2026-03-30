export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      cajones: {
        Row: {
          default_lavador_id: string | null
          id: number
          label: string
        }
        Insert: {
          default_lavador_id?: string | null
          id?: number
          label: string
        }
        Update: {
          default_lavador_id?: string | null
          id?: number
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "cajones_default_lavador_id_fkey"
            columns: ["default_lavador_id"]
            isOneToOne: false
            referencedRelation: "lavadores"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          meta: Json | null
          nombre: string
          telefono: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          meta?: Json | null
          nombre: string
          telefono?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          meta?: Json | null
          nombre?: string
          telefono?: string | null
        }
        Relationships: []
      }
      lavadores: {
        Row: {
          activo: boolean | null
          created_at: string | null
          deactivated_at: string | null
          id: string
          nombre_completo: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          deactivated_at?: string | null
          id?: string
          nombre_completo: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          deactivated_at?: string | null
          id?: string
          nombre_completo?: string
        }
        Relationships: []
      }
      membresias: {
        Row: {
          cliente_id: string | null
          estado: Database["public"]["Enums"]["estado_membresia"]
          fecha_inicio: string | null
          fecha_proxima_renovacion: string | null
          id: string
          tipo: Database["public"]["Enums"]["tipo_membresia"]
        }
        Insert: {
          cliente_id?: string | null
          estado?: Database["public"]["Enums"]["estado_membresia"]
          fecha_inicio?: string | null
          fecha_proxima_renovacion?: string | null
          id?: string
          tipo: Database["public"]["Enums"]["tipo_membresia"]
        }
        Update: {
          cliente_id?: string | null
          estado?: Database["public"]["Enums"]["estado_membresia"]
          fecha_inicio?: string | null
          fecha_proxima_renovacion?: string | null
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_membresia"]
        }
        Relationships: [
          {
            foreignKeyName: "membresias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_servicio: {
        Row: {
          codigo_qr: string | null
          created_at: string | null
          es_premium: boolean | null
          estado: Database["public"]["Enums"]["estado_orden"]
          folio: number
          id: string
          metodo_pago: Database["public"]["Enums"]["metodo_pago"] | null
          premium_extra_cost: number | null
          servicios: Json
          sucursal_id: string | null
          total: number
          turno_id: string | null
          vehiculo_id: string | null
        }
        Insert: {
          codigo_qr?: string | null
          created_at?: string | null
          es_premium?: boolean | null
          estado?: Database["public"]["Enums"]["estado_orden"]
          folio?: number
          id?: string
          metodo_pago?: Database["public"]["Enums"]["metodo_pago"] | null
          premium_extra_cost?: number | null
          servicios?: Json
          sucursal_id?: string | null
          total: number
          turno_id?: string | null
          vehiculo_id?: string | null
        }
        Update: {
          codigo_qr?: string | null
          created_at?: string | null
          es_premium?: boolean | null
          estado?: Database["public"]["Enums"]["estado_orden"]
          folio?: number
          id?: string
          metodo_pago?: Database["public"]["Enums"]["metodo_pago"] | null
          premium_extra_cost?: number | null
          servicios?: Json
          sucursal_id?: string | null
          total?: number
          turno_id?: string | null
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_servicio_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_servicio_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_servicio_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      precios_base: {
        Row: {
          id: number
          precio: number
          tamano: Database["public"]["Enums"]["tamano_vehiculo"]
        }
        Insert: {
          id?: number
          precio: number
          tamano: Database["public"]["Enums"]["tamano_vehiculo"]
        }
        Update: {
          id?: number
          precio?: number
          tamano?: Database["public"]["Enums"]["tamano_vehiculo"]
        }
        Relationships: []
      }
      reglas_promocion: {
        Row: {
          activo: boolean | null
          beneficio: string
          id: string
          nombre: string
          porcentaje_descuento: number | null
          visitas_requeridas: number
        }
        Insert: {
          activo?: boolean | null
          beneficio: string
          id: string
          nombre: string
          porcentaje_descuento?: number | null
          visitas_requeridas: number
        }
        Update: {
          activo?: boolean | null
          beneficio?: string
          id?: string
          nombre?: string
          porcentaje_descuento?: number | null
          visitas_requeridas?: number
        }
        Relationships: []
      }
      servicios: {
        Row: {
          created_at: string | null
          descripcion: string | null
          id: string
          is_hidden: boolean | null
          nombre: string
          precio_base: number
          sucursal_id: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          is_hidden?: boolean | null
          nombre: string
          precio_base: number
          sucursal_id?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          is_hidden?: boolean | null
          nombre?: string
          precio_base?: number
          sucursal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servicios_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      sucursales: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion: string | null
          direccion: string | null
          es_matriz: boolean | null
          id: string
          nombre: string
          telefono: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          direccion?: string | null
          es_matriz?: boolean | null
          id?: string
          nombre: string
          telefono?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          direccion?: string | null
          es_matriz?: boolean | null
          id?: string
          nombre?: string
          telefono?: string | null
        }
        Relationships: []
      }
      turnos: {
        Row: {
          diferencia: number | null
          fecha_apertura: string | null
          id: string
          monto_declarado: number | null
          monto_inicial: number
          monto_sistema: number | null
          sucursal_id: string | null
          usuario_id: string | null
        }
        Insert: {
          diferencia?: number | null
          fecha_apertura?: string | null
          id?: string
          monto_declarado?: number | null
          monto_inicial?: number
          monto_sistema?: number | null
          sucursal_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          diferencia?: number | null
          fecha_apertura?: string | null
          id?: string
          monto_declarado?: number | null
          monto_inicial?: number
          monto_sistema?: number | null
          sucursal_id?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turnos_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      vehiculos: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          id: string
          marca: string | null
          modelo: string | null
          placa: string
          tamano: Database["public"]["Enums"]["tamano_vehiculo"]
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          placa: string
          tamano: Database["public"]["Enums"]["tamano_vehiculo"]
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          placa?: string
          tamano?: Database["public"]["Enums"]["tamano_vehiculo"]
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      estado_membresia: "Activa" | "Cancelada" | "Vencida"
      estado_orden: "Recepción" | "Lavado" | "Secado" | "Listo" | "Entregado"
      metodo_pago: "Efectivo" | "Tarjeta" | "Membresía"
      tamano_vehiculo:
        | "Carro Chico"
        | "Carro Mediano"
        | "Camioneta Mediana"
        | "Camioneta Grande"
        | "Van"
      tipo_membresia: "Bronce" | "Plata" | "Oro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_membresia: ["Activa", "Cancelada", "Vencida"],
      estado_orden: ["Recepción", "Lavado", "Secado", "Listo", "Entregado"],
      metodo_pago: ["Efectivo", "Tarjeta", "Membresía"],
      tamano_vehiculo: [
        "Carro Chico",
        "Carro Mediano",
        "Camioneta Mediana",
        "Camioneta Grande",
        "Van",
      ],
      tipo_membresia: ["Bronce", "Plata", "Oro"],
    },
  },
} as const
