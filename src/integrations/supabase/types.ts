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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_data: {
        Row: {
          abc_data: Json | null
          behavior_id: string
          created_at: string
          duration_seconds: number | null
          event_type: string
          id: string
          interval_index: number | null
          session_id: string
          student_id: string
          timestamp: string
          user_id: string
        }
        Insert: {
          abc_data?: Json | null
          behavior_id: string
          created_at?: string
          duration_seconds?: number | null
          event_type: string
          id?: string
          interval_index?: number | null
          session_id: string
          student_id: string
          timestamp?: string
          user_id: string
        }
        Update: {
          abc_data?: Json | null
          behavior_id?: string
          created_at?: string
          duration_seconds?: number | null
          event_type?: string
          id?: string
          interval_index?: number | null
          session_id?: string
          student_id?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_data_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_data_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          interval_length_seconds: number
          name: string
          session_length_minutes: number
          start_time: string
          student_ids: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          interval_length_seconds?: number
          name: string
          session_length_minutes?: number
          start_time: string
          student_ids?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          interval_length_seconds?: number
          name?: string
          session_length_minutes?: number
          start_time?: string
          student_ids?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      student_files: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          student_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          student_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          student_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_files_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          archived_at: string | null
          assessment_mode_enabled: boolean | null
          background_info: Json | null
          behaviors: Json | null
          bip_data: Json | null
          case_types: Json | null
          color: string
          created_at: string
          custom_antecedents: Json | null
          custom_consequences: Json | null
          date_of_birth: string | null
          documents: Json | null
          fba_findings: Json | null
          fba_workflow_progress: Json | null
          goals: Json | null
          grade: string | null
          historical_data: Json | null
          id: string
          indirect_assessments: Json | null
          is_archived: boolean
          name: string
          narrative_notes: Json | null
          school: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          assessment_mode_enabled?: boolean | null
          background_info?: Json | null
          behaviors?: Json | null
          bip_data?: Json | null
          case_types?: Json | null
          color?: string
          created_at?: string
          custom_antecedents?: Json | null
          custom_consequences?: Json | null
          date_of_birth?: string | null
          documents?: Json | null
          fba_findings?: Json | null
          fba_workflow_progress?: Json | null
          goals?: Json | null
          grade?: string | null
          historical_data?: Json | null
          id?: string
          indirect_assessments?: Json | null
          is_archived?: boolean
          name: string
          narrative_notes?: Json | null
          school?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          assessment_mode_enabled?: boolean | null
          background_info?: Json | null
          behaviors?: Json | null
          bip_data?: Json | null
          case_types?: Json | null
          color?: string
          created_at?: string
          custom_antecedents?: Json | null
          custom_consequences?: Json | null
          date_of_birth?: string | null
          documents?: Json | null
          fba_findings?: Json | null
          fba_workflow_progress?: Json | null
          goals?: Json | null
          grade?: string | null
          historical_data?: Json | null
          id?: string
          indirect_assessments?: Json | null
          is_archived?: boolean
          name?: string
          narrative_notes?: Json | null
          school?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
    Enums: {},
  },
} as const
