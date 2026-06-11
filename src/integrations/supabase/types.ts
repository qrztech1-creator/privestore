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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          position: number
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          position?: number
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      event_invites: {
        Row: {
          created_at: string
          event_id: string
          guest_label: string | null
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          guest_label?: string | null
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          guest_label?: string | null
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_products: {
        Row: {
          desired_qty: number
          event_id: string
          id: string
          is_favorite: boolean
          position: number
          product_id: string
          purchased_qty: number
        }
        Insert: {
          desired_qty?: number
          event_id: string
          id?: string
          is_favorite?: boolean
          position?: number
          product_id: string
          purchased_qty?: number
        }
        Update: {
          desired_qty?: number
          event_id?: string
          id?: string
          is_favorite?: boolean
          position?: number
          product_id?: string
          purchased_qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_products_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          archived_at: string | null
          banner_url: string | null
          bride_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          event_date: string | null
          id: string
          manage_token: string | null
          message: string | null
          owner_id: string | null
          palette: Json
          partner_name: string | null
          playlist_url: string | null
          secret_code: string | null
          slug: string
          status: Database["public"]["Enums"]["event_status"]
          thank_you_message: string | null
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string
          visibility: Database["public"]["Enums"]["event_visibility"]
          whatsapp_number: string | null
        }
        Insert: {
          archived_at?: string | null
          banner_url?: string | null
          bride_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          manage_token?: string | null
          message?: string | null
          owner_id?: string | null
          palette?: Json
          partner_name?: string | null
          playlist_url?: string | null
          secret_code?: string | null
          slug: string
          status?: Database["public"]["Enums"]["event_status"]
          thank_you_message?: string | null
          type: Database["public"]["Enums"]["event_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["event_visibility"]
          whatsapp_number?: string | null
        }
        Update: {
          archived_at?: string | null
          banner_url?: string | null
          bride_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          manage_token?: string | null
          message?: string | null
          owner_id?: string | null
          palette?: Json
          partner_name?: string | null
          playlist_url?: string | null
          secret_code?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["event_status"]
          thank_you_message?: string | null
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["event_visibility"]
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          event_product_id: string | null
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          qty: number
          unit_price: number
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          event_product_id?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          qty?: number
          unit_price?: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          event_product_id?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          qty?: number
          unit_price?: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_event_product_id_fkey"
            columns: ["event_product_id"]
            isOneToOne: false
            referencedRelation: "event_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          delivered_at: string | null
          event_id: string
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          message: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_session_id: string | null
          total: number
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          event_id: string
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          message?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_session_id?: string | null
          total?: number
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          event_id?: string
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          message?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_session_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          color_name: string | null
          created_at: string
          id: string
          position: number
          product_id: string
          url: string
        }
        Insert: {
          color_name?: string | null
          created_at?: string
          id?: string
          position?: number
          product_id: string
          url: string
        }
        Update: {
          color_name?: string | null
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_lines: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          position: number
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          position?: number
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          color_hex: string | null
          color_name: string | null
          created_at: string
          id: string
          position: number
          price_override: number | null
          product_id: string
          size: string | null
          sku: string | null
          stock: number | null
        }
        Insert: {
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          position?: number
          price_override?: number | null
          product_id: string
          size?: string | null
          sku?: string | null
          stock?: number | null
        }
        Update: {
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          position?: number
          price_override?: number | null
          product_id?: string
          size?: string | null
          sku?: string | null
          stock?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          line_id: string | null
          name: string
          price: number
        }
        Insert: {
          active?: boolean
          category?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          line_id?: string | null
          name: string
          price?: number
        }
        Update: {
          active?: boolean
          category?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          line_id?: string | null
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "product_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      team_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      event_for_token: { Args: { _token: string }; Returns: string }
      get_event_by_token: {
        Args: { _token: string }
        Returns: {
          archived_at: string | null
          banner_url: string | null
          bride_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          event_date: string | null
          id: string
          manage_token: string | null
          message: string | null
          owner_id: string | null
          palette: Json
          partner_name: string | null
          playlist_url: string | null
          secret_code: string | null
          slug: string
          status: Database["public"]["Enums"]["event_status"]
          thank_you_message: string | null
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string
          visibility: Database["public"]["Enums"]["event_visibility"]
          whatsapp_number: string | null
        }
        SetofOptions: {
          from: "*"
          to: "events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_orders_by_token: {
        Args: { _token: string }
        Returns: {
          created_at: string
          delivered_at: string | null
          event_id: string
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          message: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_session_id: string | null
          total: number
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      remove_event_product_by_token: {
        Args: { _ep_id: string; _token: string }
        Returns: undefined
      }
      update_event_by_token: {
        Args: { _patch: Json; _token: string }
        Returns: {
          archived_at: string | null
          banner_url: string | null
          bride_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          event_date: string | null
          id: string
          manage_token: string | null
          message: string | null
          owner_id: string | null
          palette: Json
          partner_name: string | null
          playlist_url: string | null
          secret_code: string | null
          slug: string
          status: Database["public"]["Enums"]["event_status"]
          thank_you_message: string | null
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string
          visibility: Database["public"]["Enums"]["event_visibility"]
          whatsapp_number: string | null
        }
        SetofOptions: {
          from: "*"
          to: "events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_event_product_by_token: {
        Args: {
          _desired_qty: number
          _is_favorite: boolean
          _position: number
          _product_id: string
          _token: string
        }
        Returns: {
          desired_qty: number
          event_id: string
          id: string
          is_favorite: boolean
          position: number
          product_id: string
          purchased_qty: number
        }
        SetofOptions: {
          from: "*"
          to: "event_products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "bride" | "guest"
      event_status: "active" | "paused" | "closed"
      event_type: "casamento" | "cha_lingerie" | "despedida_solteira"
      event_visibility: "public" | "private" | "secret"
      order_status: "pending" | "paid" | "shipped" | "delivered" | "cancelled"
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
      app_role: ["admin", "bride", "guest"],
      event_status: ["active", "paused", "closed"],
      event_type: ["casamento", "cha_lingerie", "despedida_solteira"],
      event_visibility: ["public", "private", "secret"],
      order_status: ["pending", "paid", "shipped", "delivered", "cancelled"],
    },
  },
} as const
