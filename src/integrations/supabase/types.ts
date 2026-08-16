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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      accounting_periods: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          closing_note: string | null
          created_at: string
          end_date: string | null
          id: string
          name: string
          start_date: string
          status: Database["public"]["Enums"]["period_status"]
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          closing_note?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          start_date?: string
          status?: Database["public"]["Enums"]["period_status"]
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          closing_note?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string
          status?: Database["public"]["Enums"]["period_status"]
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      captains: {
        Row: {
          created_at: string
          current_commission_percentage: number
          id: string
          is_active: boolean
          name: string
          phone: string | null
          vehicle_number: string | null
        }
        Insert: {
          created_at?: string
          current_commission_percentage?: number
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          vehicle_number?: string | null
        }
        Update: {
          created_at?: string
          current_commission_percentage?: number
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          vehicle_number?: string | null
        }
        Relationships: []
      }
      commission_settlements: {
        Row: {
          amount: number | null
          captain_id: string
          created_at: string
          id: string
          is_paid: boolean
          note: string | null
          paid_at: string | null
          paid_by: string | null
          period_id: string
        }
        Insert: {
          amount?: number | null
          captain_id: string
          created_at?: string
          id?: string
          is_paid?: boolean
          note?: string | null
          paid_at?: string | null
          paid_by?: string | null
          period_id: string
        }
        Update: {
          amount?: number | null
          captain_id?: string
          created_at?: string
          id?: string
          is_paid?: boolean
          note?: string | null
          paid_at?: string | null
          paid_by?: string | null
          period_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_settlements_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "captains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_settlements_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          captain_id: string
          commission_amount: number
          commission_percentage_snapshot: number
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          destination: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          period_id: string
          pickup_location: string | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          captain_id: string
          commission_amount?: number
          commission_percentage_snapshot?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          destination?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          period_id?: string
          pickup_location?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          captain_id?: string
          commission_amount?: number
          commission_percentage_snapshot?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          destination?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          period_id?: string
          pickup_location?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "captains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          last_login_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          captain_id: string | null
          captain_name: string
          commission_amount: number
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          orders_count: number
          period_id: string | null
          period_name: string
          phone: string | null
          sent_by: string | null
          status: string
        }
        Insert: {
          captain_id?: string | null
          captain_name?: string
          commission_amount?: number
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          orders_count?: number
          period_id?: string | null
          period_name?: string
          phone?: string | null
          sent_by?: string | null
          status?: string
        }
        Update: {
          captain_id?: string | null
          captain_name?: string
          commission_amount?: number
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          orders_count?: number
          period_id?: string | null
          period_name?: string
          phone?: string | null
          sent_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "captains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_logs_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_audit: {
        Args: { p_action?: string; p_limit?: number; p_offset?: number }
        Returns: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          new_data: Json
          old_data: Json
          total_count: number
          user_name: string
        }[]
      }
      admin_captains: {
        Args: {
          p_active?: boolean
          p_period?: string
          p_search?: string
          p_sort?: string
        }
        Returns: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          orders_count: number
          pct: number
          phone: string
          total_amount: number
          total_commission: number
          vehicle_number: string
        }[]
      }
      admin_close_period: {
        Args: { p_new_name: string; p_new_start?: string; p_note: string }
        Returns: string
      }
      admin_daily_orders: {
        Args: { p_period?: string }
        Returns: {
          day: string
          orders_count: number
          total_amount: number
          total_commission: number
        }[]
      }
      admin_delete_captain: { Args: { p_id: string }; Returns: undefined }
      admin_delete_period: { Args: { p_id: string }; Returns: undefined }
      admin_delete_user_data: { Args: { p_id: string }; Returns: undefined }
      admin_orders: {
        Args: {
          p_captain?: string
          p_deleted?: boolean
          p_from?: string
          p_limit?: number
          p_max?: number
          p_max_comm?: number
          p_min?: number
          p_min_comm?: number
          p_offset?: number
          p_period?: string
          p_search?: string
          p_sort?: string
          p_status?: string
          p_to?: string
          p_user?: string
        }
        Returns: {
          amount: number
          captain_id: string
          captain_name: string
          commission_amount: number
          commission_percentage_snapshot: number
          created_at: string
          deleted_at: string
          deletion_reason: string
          id: string
          order_date: string
          order_number: string
          period_name: string
          status: string
          total_count: number
          updated_at: string
          user_id: string
          user_name: string
        }[]
      }
      admin_period_report: { Args: { p_id: string }; Returns: Json }
      admin_periods: {
        Args: never
        Returns: {
          archived_at: string
          archived_by_name: string
          closing_note: string
          end_date: string
          id: string
          name: string
          orders_count: number
          start_date: string
          status: string
          total_amount: number
          total_commission: number
        }[]
      }
      admin_save_captain: {
        Args: {
          p_active: boolean
          p_id: string
          p_name: string
          p_pct: number
          p_phone: string
          p_vehicle: string
        }
        Returns: string
      }
      admin_set_commission_paid: {
        Args: {
          p_amount?: number
          p_captain: string
          p_paid: boolean
          p_period?: string
        }
        Returns: undefined
      }
      admin_set_user_active: {
        Args: { p_active: boolean; p_id: string }
        Returns: undefined
      }
      admin_settlements: {
        Args: { p_period?: string }
        Returns: {
          amount: number
          captain_id: string
          is_paid: boolean
          paid_at: string
        }[]
      }
      admin_stats: { Args: never; Returns: Json }
      admin_update_period: {
        Args: {
          p_end: string
          p_id: string
          p_name: string
          p_note: string
          p_start: string
        }
        Returns: undefined
      }
      admin_users: {
        Args: { p_period?: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string
          orders_count: number
          role: string
        }[]
      }
      current_period_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      log_action: {
        Args: {
          _action: string
          _entity_id: string
          _entity_type: string
          _new: Json
          _old: Json
        }
        Returns: undefined
      }
      my_order_count: { Args: never; Returns: number }
      touch_last_login: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
      order_status: "active" | "edited" | "deleted" | "archived"
      period_status: "open" | "archived"
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
      app_role: ["admin", "user"],
      order_status: ["active", "edited", "deleted", "archived"],
      period_status: ["open", "archived"],
    },
  },
} as const
