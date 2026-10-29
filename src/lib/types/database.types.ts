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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          color: string | null
          created_at: string
          currency: string
          icon: string
          id: string
          is_archived: boolean
          is_primary: boolean
          kind: Database["public"]["Enums"]["account_kind"]
          name: string
          opening_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          currency?: string
          icon?: string
          id?: string
          is_archived?: boolean
          is_primary?: boolean
          kind?: Database["public"]["Enums"]["account_kind"]
          name: string
          opening_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          currency?: string
          icon?: string
          id?: string
          is_archived?: boolean
          is_primary?: boolean
          kind?: Database["public"]["Enums"]["account_kind"]
          name?: string
          opening_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          id: string
          period_month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          id?: string
          period_month: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          id?: string
          period_month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_archived: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_archived?: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_archived?: boolean
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      category_templates: {
        Row: {
          color: string
          icon: string
          id: number
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          sort_order: number
        }
        Insert: {
          color: string
          icon: string
          id?: number
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          sort_order?: number
        }
        Update: {
          color?: string
          icon?: string
          id?: number
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      debt_payments: {
        Row: {
          amount: number
          created_at: string
          debt_id: string
          id: string
          installment_number: number | null
          is_extra: boolean
          note: string | null
          occurred_at: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          debt_id: string
          id?: string
          installment_number?: number | null
          is_extra?: boolean
          note?: string | null
          occurred_at?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          debt_id?: string
          id?: string
          installment_number?: number | null
          is_extra?: boolean
          note?: string | null
          occurred_at?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debt_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          account_id: string | null
          alert_days_before: number
          created_at: string
          creditor: string | null
          due_day: number
          first_due_date: string
          icon: string
          id: string
          initial_amount: number
          interest_kind: Database["public"]["Enums"]["interest_kind"]
          interest_rate: number
          is_active: boolean
          kind: Database["public"]["Enums"]["debt_kind"]
          monthly_payment: number
          name: string
          notes: string | null
          payment_frequency: Database["public"]["Enums"]["debt_frequency"]
          principal_amount: number
          started_at: string
          total_installments: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          alert_days_before?: number
          created_at?: string
          creditor?: string | null
          due_day?: number
          first_due_date: string
          icon?: string
          id?: string
          initial_amount?: number
          interest_kind?: Database["public"]["Enums"]["interest_kind"]
          interest_rate?: number
          is_active?: boolean
          kind?: Database["public"]["Enums"]["debt_kind"]
          monthly_payment: number
          name: string
          notes?: string | null
          payment_frequency?: Database["public"]["Enums"]["debt_frequency"]
          principal_amount: number
          started_at?: string
          total_installments?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          alert_days_before?: number
          created_at?: string
          creditor?: string | null
          due_day?: number
          first_due_date?: string
          icon?: string
          id?: string
          initial_amount?: number
          interest_kind?: Database["public"]["Enums"]["interest_kind"]
          interest_rate?: number
          is_active?: boolean
          kind?: Database["public"]["Enums"]["debt_kind"]
          monthly_payment?: number
          name?: string
          notes?: string | null
          payment_frequency?: Database["public"]["Enums"]["debt_frequency"]
          principal_amount?: number
          started_at?: string
          total_installments?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_contributions: {
        Row: {
          amount: number
          created_at: string
          goal_id: string
          id: string
          note: string | null
          occurred_at: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          goal_id: string
          id?: string
          note?: string | null
          occurred_at?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          goal_id?: string
          id?: string
          note?: string | null
          occurred_at?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          account_id: string | null
          category: string
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          initial_amount: number
          monthly_contribution: number | null
          name: string
          reminder_day: number
          reminder_enabled: boolean
          status: Database["public"]["Enums"]["goal_status"]
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          initial_amount?: number
          monthly_contribution?: number | null
          name: string
          reminder_day?: number
          reminder_enabled?: boolean
          status?: Database["public"]["Enums"]["goal_status"]
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          initial_amount?: number
          monthly_contribution?: number | null
          name?: string
          reminder_day?: number
          reminder_enabled?: boolean
          status?: Database["public"]["Enums"]["goal_status"]
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          id: number
          kind: string
          local_date: string
          ref_id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: never
          kind: string
          local_date: string
          ref_id: string
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: never
          kind?: string
          local_date?: string
          ref_id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          currency: string
          full_name: string
          id: string
          monthly_budget: number
          push_enabled: boolean
          push_time: string
          tz_offset: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          full_name?: string
          id: string
          monthly_budget?: number
          push_enabled?: boolean
          push_time?: string
          tz_offset?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          full_name?: string
          id?: string
          monthly_budget?: number
          push_enabled?: boolean
          push_time?: string
          tz_offset?: number
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          failure_count: number
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          failure_count?: number
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          failure_count?: number
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      transaction_tags: {
        Row: {
          tag_id: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          tag_id: string
          transaction_id: string
          user_id: string
        }
        Update: {
          tag_id?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          attachment_name: string | null
          attachment_path: string | null
          category_id: string | null
          concept: string
          counter_account_id: string | null
          created_at: string
          currency: string
          id: string
          notes: string | null
          occurred_at: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          attachment_name?: string | null
          attachment_path?: string | null
          category_id?: string | null
          concept?: string
          counter_account_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          occurred_at?: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          attachment_name?: string | null
          attachment_path?: string | null
          category_id?: string | null
          concept?: string
          counter_account_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          occurred_at?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_counter_account_id_fkey"
            columns: ["counter_account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_counter_account_id_fkey"
            columns: ["counter_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      account_balances: {
        Row: {
          balance: number | null
          color: string | null
          created_at: string | null
          currency: string | null
          icon: string | null
          id: string | null
          is_archived: boolean | null
          is_primary: boolean | null
          kind: Database["public"]["Enums"]["account_kind"] | null
          name: string | null
          opening_balance: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      debt_progress: {
        Row: {
          account_id: string | null
          alert_days_before: number | null
          created_at: string | null
          creditor: string | null
          due_day: number | null
          first_due_date: string | null
          icon: string | null
          id: string | null
          initial_amount: number | null
          installments_left: number | null
          installments_paid: number | null
          interest_kind: Database["public"]["Enums"]["interest_kind"] | null
          interest_rate: number | null
          is_active: boolean | null
          kind: Database["public"]["Enums"]["debt_kind"] | null
          last_payment_at: string | null
          monthly_payment: number | null
          name: string | null
          next_due_date: string | null
          notes: string | null
          paid_amount: number | null
          payment_frequency:
            | Database["public"]["Enums"]["debt_frequency"]
            | null
          principal_amount: number | null
          progress_percent: number | null
          remaining_amount: number | null
          started_at: string | null
          total_installments: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_progress: {
        Row: {
          account_id: string | null
          category: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string | null
          image_path: string | null
          initial_amount: number | null
          last_contribution_at: string | null
          monthly_contribution: number | null
          name: string | null
          progress_percent: number | null
          remaining_amount: number | null
          reminder_day: number | null
          reminder_enabled: boolean | null
          saved_amount: number | null
          status: Database["public"]["Enums"]["goal_status"] | null
          target_amount: number | null
          target_date: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions_detailed: {
        Row: {
          account_icon: string | null
          account_id: string | null
          account_kind: Database["public"]["Enums"]["account_kind"] | null
          account_name: string | null
          amount: number | null
          attachment_name: string | null
          attachment_path: string | null
          category_color: string | null
          category_icon: string | null
          category_id: string | null
          category_kind: Database["public"]["Enums"]["category_kind"] | null
          category_name: string | null
          concept: string | null
          counter_account_id: string | null
          counter_account_name: string | null
          created_at: string | null
          currency: string | null
          id: string | null
          notes: string | null
          occurred_at: string | null
          tag_names: string[] | null
          type: Database["public"]["Enums"]["transaction_type"] | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_counter_account_id_fkey"
            columns: ["counter_account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_counter_account_id_fkey"
            columns: ["counter_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      claim_due_notifications: {
        Args: { p_now?: string }
        Returns: {
          user_id: string
          kind: string
          ref_id: string
          label: string
          amount: number
          currency: string
          due_date: string
          days_left: number
          target_url: string
        }[]
      }
      get_analytics: {
        Args: {
          p_from: string
          p_offset_minutes?: number
          p_prev_from: string
          p_prev_to: string
          p_to: string
        }
        Returns: Json
      }
      pay_installment: {
        Args: {
          p_account_id?: string
          p_amount?: number
          p_debt_id: string
          p_occurred_at?: string
        }
        Returns: string
      }
      register_push_subscription: {
        Args: {
          p_auth: string
          p_endpoint: string
          p_p256dh: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      register_transfer: {
        Args: {
          p_amount: number
          p_concept?: string
          p_from_account: string
          p_occurred_at?: string
          p_to_account: string
        }
        Returns: string
      }
      sync_debt_status: { Args: never; Returns: undefined }
    }
    Enums: {
      account_kind: "checking" | "savings" | "pocket" | "cash" | "credit"
      category_kind: "expense" | "income"
      debt_frequency: "weekly" | "biweekly" | "monthly"
      debt_kind: "credit_card" | "personal" | "family" | "mortgage" | "other"
      goal_status: "active" | "completed" | "paused"
      interest_kind: "msi" | "fixed" | "variable"
      transaction_type: "income" | "expense" | "transfer"
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
      account_kind: ["checking", "savings", "pocket", "cash", "credit"],
      category_kind: ["expense", "income"],
      debt_frequency: ["weekly", "biweekly", "monthly"],
      debt_kind: ["credit_card", "personal", "family", "mortgage", "other"],
      goal_status: ["active", "completed", "paused"],
      interest_kind: ["msi", "fixed", "variable"],
      transaction_type: ["income", "expense", "transfer"],
    },
  },
} as const
