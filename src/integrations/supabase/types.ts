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
      admin_permissions: {
        Row: {
          can_assign_admin: boolean | null
          can_manage_roles: boolean | null
          can_manage_students: boolean | null
          can_manage_tags: boolean | null
          can_manage_users: boolean | null
          can_view_all_users: boolean | null
          created_at: string
          id: string
          scope_tag_ids: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_assign_admin?: boolean | null
          can_manage_roles?: boolean | null
          can_manage_students?: boolean | null
          can_manage_tags?: boolean | null
          can_manage_users?: boolean | null
          can_view_all_users?: boolean | null
          created_at?: string
          id?: string
          scope_tag_ids?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_assign_admin?: boolean | null
          can_manage_roles?: boolean | null
          can_manage_students?: boolean | null
          can_manage_tags?: boolean | null
          can_manage_users?: boolean | null
          can_view_all_users?: boolean | null
          created_at?: string
          id?: string
          scope_tag_ids?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_type: string
          color: string | null
          created_at: string
          created_by: string
          duration_minutes: number
          end_time: string
          id: string
          is_recurring: boolean | null
          linked_session_id: string | null
          notes: string | null
          recurrence_rule: Json | null
          staff_user_id: string | null
          staff_user_ids: string[] | null
          start_time: string
          status: string
          student_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          appointment_type?: string
          color?: string | null
          created_at?: string
          created_by: string
          duration_minutes?: number
          end_time: string
          id?: string
          is_recurring?: boolean | null
          linked_session_id?: string | null
          notes?: string | null
          recurrence_rule?: Json | null
          staff_user_id?: string | null
          staff_user_ids?: string[] | null
          start_time: string
          status?: string
          student_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          appointment_type?: string
          color?: string | null
          created_at?: string
          created_by?: string
          duration_minutes?: number
          end_time?: string
          id?: string
          is_recurring?: boolean | null
          linked_session_id?: string | null
          notes?: string | null
          recurrence_rule?: Json | null
          staff_user_id?: string | null
          staff_user_ids?: string[] | null
          start_time?: string
          status?: string
          student_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_linked_session_id_fkey"
            columns: ["linked_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_summaries: {
        Row: {
          comments: string | null
          created_at: string
          day_rating: string | null
          id: string
          student_id: string
          summary_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          day_rating?: string | null
          id?: string
          student_id: string
          summary_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          day_rating?: string | null
          id?: string
          student_id?: string
          summary_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_summaries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      data_access_logs: {
        Row: {
          access_type: string
          created_at: string
          data_category: string
          details: Json | null
          id: string
          ip_address: string | null
          student_id: string
          user_id: string
        }
        Insert: {
          access_type: string
          created_at?: string
          data_category: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          student_id: string
          user_id: string
        }
        Update: {
          access_type?: string
          created_at?: string
          data_category?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          student_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_access_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      enhanced_session_notes: {
        Row: {
          author_role: string
          author_user_id: string
          auto_pull_enabled: boolean | null
          billable: boolean | null
          clinician_signature_name: string | null
          created_at: string | null
          credential: string | null
          duration_minutes: number | null
          end_time: string | null
          id: string
          location_detail: string | null
          locked_at: string | null
          locked_by: string | null
          note_content: Json | null
          note_type: string
          pulled_data_snapshot: Json | null
          service_setting: string | null
          session_id: string | null
          signed_at: string | null
          start_time: string
          status: string
          student_id: string
          submitted_at: string | null
          subtype: string | null
          updated_at: string | null
        }
        Insert: {
          author_role?: string
          author_user_id: string
          auto_pull_enabled?: boolean | null
          billable?: boolean | null
          clinician_signature_name?: string | null
          created_at?: string | null
          credential?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          location_detail?: string | null
          locked_at?: string | null
          locked_by?: string | null
          note_content?: Json | null
          note_type?: string
          pulled_data_snapshot?: Json | null
          service_setting?: string | null
          session_id?: string | null
          signed_at?: string | null
          start_time?: string
          status?: string
          student_id: string
          submitted_at?: string | null
          subtype?: string | null
          updated_at?: string | null
        }
        Update: {
          author_role?: string
          author_user_id?: string
          auto_pull_enabled?: boolean | null
          billable?: boolean | null
          clinician_signature_name?: string | null
          created_at?: string | null
          credential?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          location_detail?: string | null
          locked_at?: string | null
          locked_by?: string | null
          note_content?: Json | null
          note_type?: string
          pulled_data_snapshot?: Json | null
          service_setting?: string | null
          session_id?: string | null
          signed_at?: string | null
          start_time?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          subtype?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enhanced_session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enhanced_session_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      note_requirements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes_required: boolean
          role: string | null
          setting: string | null
          student_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes_required?: boolean
          role?: string | null
          setting?: string | null
          student_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes_required?: boolean
          role?: string | null
          setting?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_requirements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      note_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          note_type: string
          template_fields: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          note_type: string
          template_fields?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          note_type?: string
          template_fields?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      note_versions: {
        Row: {
          changes_summary: string | null
          edit_reason: string | null
          edited_at: string | null
          edited_by: string
          id: string
          note_id: string
          previous_content: Json
          previous_status: string | null
          version_number: number
        }
        Insert: {
          changes_summary?: string | null
          edit_reason?: string | null
          edited_at?: string | null
          edited_by: string
          id?: string
          note_id: string
          previous_content: Json
          previous_status?: string | null
          version_number?: number
        }
        Update: {
          changes_summary?: string | null
          edit_reason?: string | null
          edited_at?: string | null
          edited_by?: string
          id?: string
          note_id?: string
          previous_content?: Json
          previous_status?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "note_versions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "enhanced_session_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pin_auth_attempts: {
        Row: {
          attempted_at: string
          email: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          attempted_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_id?: string | null
        }
        Update: {
          attempted_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          display_name: string | null
          email: string | null
          first_name: string | null
          id: string
          is_approved: boolean | null
          last_name: string | null
          phone: string | null
          pin_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_approved?: boolean | null
          last_name?: string | null
          phone?: string | null
          pin_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_approved?: boolean | null
          last_name?: string | null
          phone?: string | null
          pin_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questionnaire_invitations: {
        Row: {
          access_token: string
          completed_at: string | null
          created_at: string
          created_by: string
          expires_at: string
          id: string
          recipient_email: string
          recipient_name: string
          recipient_type: string
          sent_at: string | null
          status: string
          student_id: string
          template_id: string
        }
        Insert: {
          access_token?: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          recipient_email: string
          recipient_name: string
          recipient_type: string
          sent_at?: string | null
          status?: string
          student_id: string
          template_id: string
        }
        Update: {
          access_token?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          recipient_email?: string
          recipient_name?: string
          recipient_type?: string
          sent_at?: string | null
          status?: string
          student_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_invitations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_invitations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_responses: {
        Row: {
          id: string
          invitation_id: string
          respondent_info: Json | null
          responses: Json
          student_id: string
          submitted_at: string
        }
        Insert: {
          id?: string
          invitation_id: string
          respondent_info?: Json | null
          responses?: Json
          student_id: string
          submitted_at?: string
        }
        Update: {
          id?: string
          invitation_id?: string
          respondent_info?: Json | null
          responses?: Json
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_responses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_archived: boolean
          name: string
          questions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name: string
          questions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          questions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
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
      session_notes: {
        Row: {
          content: Json
          created_at: string
          fidelity_met: boolean | null
          id: string
          last_edited_at: string | null
          last_edited_by: string | null
          note_type: string
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_comments: string | null
          session_id: string
          status: string
          student_id: string
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          fidelity_met?: boolean | null
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          note_type: string
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_comments?: string | null
          session_id: string
          status?: string
          student_id: string
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          fidelity_met?: boolean | null
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          note_type?: string
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_comments?: string | null
          session_id?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_student_id_fkey"
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
          status: string | null
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
          status?: string | null
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
          status?: string | null
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
      student_session_status: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          notes_submitted: boolean | null
          paused_at: string | null
          session_id: string
          started_at: string
          status: string
          student_id: string
          total_active_duration_seconds: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          notes_submitted?: boolean | null
          paused_at?: string | null
          session_id: string
          started_at?: string
          status?: string
          student_id: string
          total_active_duration_seconds?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          notes_submitted?: boolean | null
          paused_at?: string | null
          session_id?: string
          started_at?: string
          status?: string
          student_id?: string
          total_active_duration_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_session_status_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_session_status_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_tags: {
        Row: {
          created_at: string
          id: string
          student_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          student_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          student_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_tags_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
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
          contact_email: string | null
          contact_phone: string | null
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
          notes_required: boolean | null
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
          contact_email?: string | null
          contact_phone?: string | null
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
          notes_required?: boolean | null
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
          contact_email?: string | null
          contact_phone?: string | null
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
          notes_required?: boolean | null
          school?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supervisor_reviews: {
        Row: {
          action_completed: boolean | null
          action_completed_at: string | null
          action_notes: string | null
          author_user_id: string
          comments: string | null
          created_at: string | null
          id: string
          note_id: string
          required_action: string | null
          review_date: string | null
          review_outcome: string
          reviewer_user_id: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          action_completed?: boolean | null
          action_completed_at?: string | null
          action_notes?: string | null
          author_user_id: string
          comments?: string | null
          created_at?: string | null
          id?: string
          note_id: string
          required_action?: string | null
          review_date?: string | null
          review_outcome?: string
          reviewer_user_id: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          action_completed?: boolean | null
          action_completed_at?: string | null
          action_notes?: string | null
          author_user_id?: string
          comments?: string | null
          created_at?: string | null
          id?: string
          note_id?: string
          required_action?: string | null
          review_date?: string | null
          review_outcome?: string
          reviewer_user_id?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_reviews_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "enhanced_session_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          tag_type: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          tag_type: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          tag_type?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_student_access: {
        Row: {
          can_collect_data: boolean | null
          can_edit_profile: boolean | null
          can_generate_reports: boolean | null
          can_view_documents: boolean | null
          can_view_notes: boolean | null
          created_at: string
          granted_by: string | null
          id: string
          permission_level: string
          student_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_collect_data?: boolean | null
          can_edit_profile?: boolean | null
          can_generate_reports?: boolean | null
          can_view_documents?: boolean | null
          can_view_notes?: boolean | null
          created_at?: string
          granted_by?: string | null
          id?: string
          permission_level: string
          student_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_collect_data?: boolean | null
          can_edit_profile?: boolean | null
          can_generate_reports?: boolean | null
          can_view_documents?: boolean | null
          can_view_notes?: boolean | null
          created_at?: string
          granted_by?: string | null
          id?: string
          permission_level?: string
          student_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_student_access_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tags: {
        Row: {
          created_at: string
          id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tag_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_user:
        | { Args: { _user_id: string }; Returns: boolean }
        | { Args: { _approved_by: string; _user_id: string }; Returns: boolean }
      check_pin_rate_limit: {
        Args: { _email: string; _ip_address: string }
        Returns: boolean
      }
      cleanup_old_pin_attempts: { Args: never; Returns: undefined }
      get_pending_approval_count: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_student_access: {
        Args: { _student_id: string; _user_id: string }
        Returns: boolean
      }
      has_tag_based_access: {
        Args: { _student_id: string; _user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_student_owner: {
        Args: { _student_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          _action: string
          _details?: Json
          _resource_id?: string
          _resource_name?: string
          _resource_type: string
        }
        Returns: string
      }
      log_data_access: {
        Args: {
          _access_type: string
          _data_category: string
          _details?: Json
          _student_id: string
        }
        Returns: string
      }
      record_pin_attempt: {
        Args: {
          _email: string
          _ip_address: string
          _success: boolean
          _user_id: string
        }
        Returns: undefined
      }
      revoke_user_access: { Args: { _user_id: string }; Returns: boolean }
      set_user_pin: {
        Args: { _pin: string; _user_id: string }
        Returns: boolean
      }
      user_has_pin: { Args: { _user_id: string }; Returns: boolean }
      verify_pin: { Args: { _pin: string; _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "staff" | "viewer"
      note_subtype: "clinical_only" | "parent_training_only" | "combined"
      service_setting: "school" | "home" | "telehealth" | "clinic" | "community"
      session_note_type:
        | "therapist"
        | "assessment"
        | "clinical"
        | "parent_training"
        | "supervision_revision"
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
      app_role: ["super_admin", "admin", "staff", "viewer"],
      note_subtype: ["clinical_only", "parent_training_only", "combined"],
      service_setting: ["school", "home", "telehealth", "clinic", "community"],
      session_note_type: [
        "therapist",
        "assessment",
        "clinical",
        "parent_training",
        "supervision_revision",
      ],
    },
  },
} as const
