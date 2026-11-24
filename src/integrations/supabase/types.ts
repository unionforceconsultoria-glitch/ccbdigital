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
      documentos_admin: {
        Row: {
          arquivo_url: string
          categoria: string | null
          data_upload: string
          id: string
          nome: string
        }
        Insert: {
          arquivo_url: string
          categoria?: string | null
          data_upload?: string
          id?: string
          nome: string
        }
        Update: {
          arquivo_url?: string
          categoria?: string | null
          data_upload?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      envios: {
        Row: {
          arquivo_nome: string
          arquivo_url: string
          data_envio: string
          id: string
          igreja_id: number
          igreja_nome: string
          mes_referencia: string
          nome_responsavel: string
          protocolo: string
          tipo_formulario: string
        }
        Insert: {
          arquivo_nome: string
          arquivo_url: string
          data_envio?: string
          id?: string
          igreja_id: number
          igreja_nome: string
          mes_referencia: string
          nome_responsavel: string
          protocolo: string
          tipo_formulario: string
        }
        Update: {
          arquivo_nome?: string
          arquivo_url?: string
          data_envio?: string
          id?: string
          igreja_id?: number
          igreja_nome?: string
          mes_referencia?: string
          nome_responsavel?: string
          protocolo?: string
          tipo_formulario?: string
        }
        Relationships: []
      }
      igrejas_custom: {
        Row: {
          created_at: string
          distribuicao: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          distribuicao: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          distribuicao?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      igrejas_overrides: {
        Row: {
          distribuicao: string | null
          hidden: boolean
          id: number
          nome: string | null
          updated_at: string
        }
        Insert: {
          distribuicao?: string | null
          hidden?: boolean
          id: number
          nome?: string | null
          updated_at?: string
        }
        Update: {
          distribuicao?: string | null
          hidden?: boolean
          id?: number
          nome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventario_bens_extras: {
        Row: {
          codigo_patrimonial: string | null
          created_at: string
          descricao: string
          id: string
          inventario_id: string
          localizacao: string | null
          observacoes: string | null
          quantidade: number
        }
        Insert: {
          codigo_patrimonial?: string | null
          created_at?: string
          descricao: string
          id?: string
          inventario_id: string
          localizacao?: string | null
          observacoes?: string | null
          quantidade?: number
        }
        Update: {
          codigo_patrimonial?: string | null
          created_at?: string
          descricao?: string
          id?: string
          inventario_id?: string
          localizacao?: string | null
          observacoes?: string | null
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventario_bens_extras_inventario_id_fkey"
            columns: ["inventario_id"]
            isOneToOne: false
            referencedRelation: "inventarios"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_historico_alteracoes: {
        Row: {
          acao: string
          autor: string | null
          created_at: string
          detalhes: string | null
          id: string
          inventario_id: string
        }
        Insert: {
          acao: string
          autor?: string | null
          created_at?: string
          detalhes?: string | null
          id?: string
          inventario_id: string
        }
        Update: {
          acao?: string
          autor?: string | null
          created_at?: string
          detalhes?: string | null
          id?: string
          inventario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_historico_alteracoes_inventario_id_fkey"
            columns: ["inventario_id"]
            isOneToOne: false
            referencedRelation: "inventarios"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_itens: {
        Row: {
          categoria: string
          codigo_patrimonial: string | null
          conferido_em: string | null
          created_at: string
          descricao: string
          grupo_chave: string
          id: string
          inventario_id: string
          localizacao: string | null
          metodo_conferencia: string | null
          observacoes: string | null
          quantidade_encontrada: number | null
          quantidade_esperada: number
          status_conferencia: string
          status_etiqueta: string
          updated_at: string
        }
        Insert: {
          categoria?: string
          codigo_patrimonial?: string | null
          conferido_em?: string | null
          created_at?: string
          descricao: string
          grupo_chave: string
          id?: string
          inventario_id: string
          localizacao?: string | null
          metodo_conferencia?: string | null
          observacoes?: string | null
          quantidade_encontrada?: number | null
          quantidade_esperada?: number
          status_conferencia?: string
          status_etiqueta?: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          codigo_patrimonial?: string | null
          conferido_em?: string | null
          created_at?: string
          descricao?: string
          grupo_chave?: string
          id?: string
          inventario_id?: string
          localizacao?: string | null
          metodo_conferencia?: string | null
          observacoes?: string | null
          quantidade_encontrada?: number | null
          quantidade_esperada?: number
          status_conferencia?: string
          status_etiqueta?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_itens_inventario_id_fkey"
            columns: ["inventario_id"]
            isOneToOne: false
            referencedRelation: "inventarios"
            referencedColumns: ["id"]
          },
        ]
      }
      inventarios: {
        Row: {
          arquivado_documentos: boolean
          created_at: string
          dados_extraidos_json: Json
          data_inventario: string
          envio_documento_id: string | null
          id: string
          igreja_id: number
          igreja_nome: string
          pdf_original_nome: string | null
          pdf_original_url: string | null
          relatorio_final_url: string | null
          responsavel: string
          resumo_json: Json
          status: string
          tipo_procedimento: string
          updated_at: string
        }
        Insert: {
          arquivado_documentos?: boolean
          created_at?: string
          dados_extraidos_json?: Json
          data_inventario?: string
          envio_documento_id?: string | null
          id?: string
          igreja_id: number
          igreja_nome: string
          pdf_original_nome?: string | null
          pdf_original_url?: string | null
          relatorio_final_url?: string | null
          responsavel: string
          resumo_json?: Json
          status?: string
          tipo_procedimento?: string
          updated_at?: string
        }
        Update: {
          arquivado_documentos?: boolean
          created_at?: string
          dados_extraidos_json?: Json
          data_inventario?: string
          envio_documento_id?: string | null
          id?: string
          igreja_id?: number
          igreja_nome?: string
          pdf_original_nome?: string | null
          pdf_original_url?: string | null
          relatorio_final_url?: string | null
          responsavel?: string
          resumo_json?: Json
          status?: string
          tipo_procedimento?: string
          updated_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    },
  },
} as const
