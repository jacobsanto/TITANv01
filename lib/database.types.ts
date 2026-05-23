export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          org_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          org_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          org_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_docs: {
        Row: {
          amount: number | null
          company_id: string | null
          created_at: string
          currency: string | null
          description: string | null
          drive_url: string | null
          id: string
          invoice_id: string | null
          needs_review: boolean
          net_amount: number | null
          org_id: string
          original_filename: string | null
          payment_method: string | null
          setup_id: string | null
          status: string
          tx_type: string | null
          vat_amount: number | null
        }
        Insert: {
          amount?: number | null
          company_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          drive_url?: string | null
          id?: string
          invoice_id?: string | null
          needs_review?: boolean
          net_amount?: number | null
          org_id: string
          original_filename?: string | null
          payment_method?: string | null
          setup_id?: string | null
          status?: string
          tx_type?: string | null
          vat_amount?: number | null
        }
        Update: {
          amount?: number | null
          company_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          drive_url?: string | null
          id?: string
          invoice_id?: string | null
          needs_review?: boolean
          net_amount?: number | null
          org_id?: string
          original_filename?: string | null
          payment_method?: string | null
          setup_id?: string | null
          status?: string
          tx_type?: string | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_docs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_docs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_docs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_docs_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "config_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_rules: {
        Row: {
          account_last8: string | null
          account_type: string | null
          bank_name: string | null
          created_at: string
          iban: string | null
          id: string
          org_id: string
          rule_type: string
          setup_id: string
        }
        Insert: {
          account_last8?: string | null
          account_type?: string | null
          bank_name?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          org_id: string
          rule_type?: string
          setup_id: string
        }
        Update: {
          account_last8?: string | null
          account_type?: string | null
          bank_name?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          org_id?: string
          rule_type?: string
          setup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_rules_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "config_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          afm: string | null
          created_at: string
          drive_folder_id: string | null
          id: string
          is_active: boolean | null
          name: string
          org_id: string
          setup_id: string | null
          user_id: string | null
        }
        Insert: {
          afm?: string | null
          created_at?: string
          drive_folder_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          org_id: string
          setup_id?: string | null
          user_id?: string | null
        }
        Update: {
          afm?: string | null
          created_at?: string
          drive_folder_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string
          setup_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "config_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      config_snapshots: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          org_id: string
          snapshot: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          org_id: string
          snapshot?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          org_id?: string
          snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "config_snapshots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_prompts: {
        Row: {
          created_at: string
          id: string
          org_id: string
          prompt_text: string
          prompt_type: string
          setup_id: string
          superseded_by: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          prompt_text: string
          prompt_type: string
          setup_id: string
          superseded_by?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          prompt_text?: string
          prompt_type?: string
          setup_id?: string
          superseded_by?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extraction_prompts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extraction_prompts_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "config_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extraction_prompts_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "extraction_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      filing_flows: {
        Row: {
          conditions: Json | null
          created_at: string
          flow_type: string
          id: string
          org_id: string
          path_template: string
          setup_id: string
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          flow_type: string
          id?: string
          org_id: string
          path_template: string
          setup_id: string
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          flow_type?: string
          id?: string
          org_id?: string
          path_template?: string
          setup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "filing_flows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_flows_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "config_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string | null
          org_id: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          org_id: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          org_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          company_id: string | null
          confidence: number | null
          created_at: string
          currency: string | null
          document_type: string | null
          drive_url: string | null
          filing_path: string | null
          id: string
          invoice_number: string | null
          issuer: string | null
          mark_number: string | null
          needs_review: boolean
          net_amount: number | null
          new_filename: string | null
          org_id: string
          original_filename: string | null
          payment_method: string | null
          recipient: string | null
          reviewed_by: string | null
          setup_id: string | null
          source: string | null
          status: string
          total_amount: number | null
          updated_at: string
          vat_amount: number | null
          withheld_tax: number | null
        }
        Insert: {
          company_id?: string | null
          confidence?: number | null
          created_at?: string
          currency?: string | null
          document_type?: string | null
          drive_url?: string | null
          filing_path?: string | null
          id?: string
          invoice_number?: string | null
          issuer?: string | null
          mark_number?: string | null
          needs_review?: boolean
          net_amount?: number | null
          new_filename?: string | null
          org_id: string
          original_filename?: string | null
          payment_method?: string | null
          recipient?: string | null
          reviewed_by?: string | null
          setup_id?: string | null
          source?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
          vat_amount?: number | null
          withheld_tax?: number | null
        }
        Update: {
          company_id?: string | null
          confidence?: number | null
          created_at?: string
          currency?: string | null
          document_type?: string | null
          drive_url?: string | null
          filing_path?: string | null
          id?: string
          invoice_number?: string | null
          issuer?: string | null
          mark_number?: string | null
          needs_review?: boolean
          net_amount?: number | null
          new_filename?: string | null
          org_id?: string
          original_filename?: string | null
          payment_method?: string | null
          recipient?: string | null
          reviewed_by?: string | null
          setup_id?: string | null
          source?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
          vat_amount?: number | null
          withheld_tax?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "config_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      job_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          job_type: string
          metadata: Json | null
          org_id: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type: string
          metadata?: Json | null
          org_id: string
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type?: string
          metadata?: Json | null
          org_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      naming_rules: {
        Row: {
          created_at: string
          id: string
          org_id: string
          pattern_template: string
          prefix: string | null
          rule_type: string
          setup_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          pattern_template: string
          prefix?: string | null
          rule_type: string
          setup_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          pattern_template?: string
          prefix?: string | null
          rule_type?: string
          setup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "naming_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "naming_rules_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "config_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          joined_at: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          docs_used_this_month: number
          id: string
          name: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          subscription_tier: string
        }
        Insert: {
          created_at?: string
          docs_used_this_month?: number
          id?: string
          name: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string
        }
        Update: {
          created_at?: string
          docs_used_this_month?: number
          id?: string
          name?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string
        }
        Relationships: []
      }
      processing_queue: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          error_message: string | null
          id: string
          org_id: string
          priority: number
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          error_message?: string | null
          id?: string
          org_id: string
          priority?: number
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          id?: string
          org_id?: string
          priority?: number
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "processing_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          locale: string | null
          theme: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          locale?: string | null
          theme?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          locale?: string | null
          theme?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rules_engine: {
        Row: {
          action: string
          active: boolean
          conditions: Json | null
          created_at: string
          id: string
          name: string
          org_id: string
          priority: number
          rule_type: string
          setup_id: string
        }
        Insert: {
          action: string
          active?: boolean
          conditions?: Json | null
          created_at?: string
          id?: string
          name: string
          org_id: string
          priority?: number
          rule_type: string
          setup_id: string
        }
        Update: {
          action?: string
          active?: boolean
          conditions?: Json | null
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          priority?: number
          rule_type?: string
          setup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rules_engine_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rules_engine_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "config_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      skipped_docs: {
        Row: {
          company_id: string | null
          created_at: string
          drive_url: string | null
          id: string
          org_id: string
          original_filename: string | null
          reason: string | null
          setup_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          drive_url?: string | null
          id?: string
          org_id: string
          original_filename?: string | null
          reason?: string | null
          setup_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          drive_url?: string | null
          id?: string
          org_id?: string
          original_filename?: string | null
          reason?: string | null
          setup_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skipped_docs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skipped_docs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skipped_docs_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "config_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_aliases: {
        Row: {
          afm: string | null
          alias_name: string
          canonical_name: string
          created_at: string
          id: string
          org_id: string
          setup_id: string
        }
        Insert: {
          afm?: string | null
          alias_name: string
          canonical_name: string
          created_at?: string
          id?: string
          org_id: string
          setup_id: string
        }
        Update: {
          afm?: string | null
          alias_name?: string
          canonical_name?: string
          created_at?: string
          id?: string
          org_id?: string
          setup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_aliases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_aliases_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "config_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      system_flags: {
        Row: {
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          flag_type: string
          id: string
          message: string
          org_id: string
          resolved: boolean
          severity: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          flag_type: string
          id?: string
          message: string
          org_id: string
          resolved?: boolean
          severity?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          flag_type?: string
          id?: string
          message?: string
          org_id?: string
          resolved?: boolean
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_flags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          org_id: string
          setting_key: string
          setting_value: string | null
          setup_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          org_id: string
          setting_key: string
          setting_value?: string | null
          setup_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          org_id?: string
          setting_key?: string
          setting_value?: string | null
          setup_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "config_snapshots"
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof Database
}
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
