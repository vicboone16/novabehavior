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
      abas3_assessments: {
        Row: {
          administered_by: string | null
          completed_at: string | null
          composite_scores: Json | null
          created_at: string
          date_administered: string
          domain_raw_scores: Json | null
          domain_scaled_scores: Json | null
          form_template_id: string | null
          id: string
          invitation_id: string | null
          notes: string | null
          raw_responses: Json | null
          recommendations: Json | null
          respondent_name: string | null
          respondent_relationship: string | null
          scored_at: string | null
          scored_by: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          administered_by?: string | null
          completed_at?: string | null
          composite_scores?: Json | null
          created_at?: string
          date_administered?: string
          domain_raw_scores?: Json | null
          domain_scaled_scores?: Json | null
          form_template_id?: string | null
          id?: string
          invitation_id?: string | null
          notes?: string | null
          raw_responses?: Json | null
          recommendations?: Json | null
          respondent_name?: string | null
          respondent_relationship?: string | null
          scored_at?: string | null
          scored_by?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          administered_by?: string | null
          completed_at?: string | null
          composite_scores?: Json | null
          created_at?: string
          date_administered?: string
          domain_raw_scores?: Json | null
          domain_scaled_scores?: Json | null
          form_template_id?: string | null
          id?: string
          invitation_id?: string | null
          notes?: string | null
          raw_responses?: Json | null
          recommendations?: Json | null
          respondent_name?: string | null
          respondent_relationship?: string | null
          scored_at?: string | null
          scored_by?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "abas3_assessments_form_template_id_fkey"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "abas3_form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abas3_assessments_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abas3_assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      abas3_form_templates: {
        Row: {
          age_range: string
          created_at: string
          domains: Json
          form_code: string
          form_name: string
          id: string
          language: string
          questions: Json
          respondent_type: string
          scoring_info: Json | null
          updated_at: string
        }
        Insert: {
          age_range: string
          created_at?: string
          domains?: Json
          form_code: string
          form_name: string
          id?: string
          language?: string
          questions?: Json
          respondent_type: string
          scoring_info?: Json | null
          updated_at?: string
        }
        Update: {
          age_range?: string
          created_at?: string
          domains?: Json
          form_code?: string
          form_name?: string
          id?: string
          language?: string
          questions?: Json
          respondent_type?: string
          scoring_info?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
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
      agencies: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          billing_address_city: string | null
          billing_address_line1: string | null
          billing_address_state: string | null
          billing_address_zip: string | null
          city: string | null
          country: string | null
          coverage_mode: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          legal_name: string | null
          logo_url: string | null
          name: string
          npi: string | null
          phone: string | null
          primary_color: string | null
          primary_entity_label: string
          settings: Json | null
          slug: string | null
          state: string | null
          status: string
          tax_id: string | null
          timezone: string | null
          updated_at: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          billing_address_city?: string | null
          billing_address_line1?: string | null
          billing_address_state?: string | null
          billing_address_zip?: string | null
          city?: string | null
          country?: string | null
          coverage_mode?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          name: string
          npi?: string | null
          phone?: string | null
          primary_color?: string | null
          primary_entity_label?: string
          settings?: Json | null
          slug?: string | null
          state?: string | null
          status?: string
          tax_id?: string | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          billing_address_city?: string | null
          billing_address_line1?: string | null
          billing_address_state?: string | null
          billing_address_zip?: string | null
          city?: string | null
          country?: string | null
          coverage_mode?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          npi?: string | null
          phone?: string | null
          primary_color?: string | null
          primary_entity_label?: string
          settings?: Json | null
          slug?: string | null
          state?: string | null
          status?: string
          tax_id?: string | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      agency_data_sources: {
        Row: {
          agency_id: string
          config_json: Json
          created_at: string
          display_name: string
          id: string
          source_type: string
          status: string
        }
        Insert: {
          agency_id: string
          config_json?: Json
          created_at?: string
          display_name: string
          id?: string
          source_type?: string
          status?: string
        }
        Update: {
          agency_id?: string
          config_json?: Json
          created_at?: string
          display_name?: string
          id?: string
          source_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_data_sources_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_feature_flags: {
        Row: {
          agency_id: string
          auto_narratives_default: boolean
          cid_enabled_default: boolean
          intervention_engine_default: boolean
          updated_at: string
        }
        Insert: {
          agency_id: string
          auto_narratives_default?: boolean
          cid_enabled_default?: boolean
          intervention_engine_default?: boolean
          updated_at?: string
        }
        Update: {
          agency_id?: string
          auto_narratives_default?: boolean
          cid_enabled_default?: boolean
          intervention_engine_default?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_feature_flags_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_locations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          agency_id: string
          city: string | null
          created_at: string
          geocode_lat: number | null
          geocode_lng: number | null
          geocode_status: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          location_type: string | null
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          agency_id: string
          city?: string | null
          created_at?: string
          geocode_lat?: number | null
          geocode_lng?: number | null
          geocode_status?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          location_type?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          agency_id?: string
          city?: string | null
          created_at?: string
          geocode_lat?: number | null
          geocode_lng?: number | null
          geocode_status?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          location_type?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_locations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_memberships: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_primary: boolean | null
          joined_at: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_primary?: boolean | null
          joined_at?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_primary?: boolean | null
          joined_at?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_memberships_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      app_handshake: {
        Row: {
          app_slug: string
          environment_name: string
          id: number
          updated_at: string | null
        }
        Insert: {
          app_slug: string
          environment_name: string
          id?: number
          updated_at?: string | null
        }
        Update: {
          app_slug?: string
          environment_name?: string
          id?: number
          updated_at?: string | null
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
          is_telehealth: boolean
          linked_session_id: string | null
          location_detail: string | null
          meeting_link: string | null
          notes: string | null
          recurrence_rule: Json | null
          service_setting: string | null
          service_type: string | null
          shared_session_id: string | null
          staff_user_id: string | null
          staff_user_ids: string[] | null
          start_time: string
          status: string
          student_id: string | null
          telehealth_provider: string | null
          title: string | null
          updated_at: string
          verification_required: boolean | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
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
          is_telehealth?: boolean
          linked_session_id?: string | null
          location_detail?: string | null
          meeting_link?: string | null
          notes?: string | null
          recurrence_rule?: Json | null
          service_setting?: string | null
          service_type?: string | null
          shared_session_id?: string | null
          staff_user_id?: string | null
          staff_user_ids?: string[] | null
          start_time: string
          status?: string
          student_id?: string | null
          telehealth_provider?: string | null
          title?: string | null
          updated_at?: string
          verification_required?: boolean | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
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
          is_telehealth?: boolean
          linked_session_id?: string | null
          location_detail?: string | null
          meeting_link?: string | null
          notes?: string | null
          recurrence_rule?: Json | null
          service_setting?: string | null
          service_type?: string | null
          shared_session_id?: string | null
          staff_user_id?: string | null
          staff_user_ids?: string[] | null
          start_time?: string
          status?: string
          student_id?: string | null
          telehealth_provider?: string | null
          title?: string | null
          updated_at?: string
          verification_required?: boolean | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
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
      attendance_logs: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          date: string
          follow_up_completed: boolean | null
          follow_up_completed_at: string | null
          follow_up_date: string | null
          follow_up_needed: boolean | null
          follow_up_notes: string | null
          id: string
          marked_at: string | null
          marked_by_user_id: string
          outcome: string
          reason_code: string | null
          reason_detail: string | null
          session_id: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          date?: string
          follow_up_completed?: boolean | null
          follow_up_completed_at?: string | null
          follow_up_date?: string | null
          follow_up_needed?: boolean | null
          follow_up_notes?: string | null
          id?: string
          marked_at?: string | null
          marked_by_user_id: string
          outcome?: string
          reason_code?: string | null
          reason_detail?: string | null
          session_id?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          date?: string
          follow_up_completed?: boolean | null
          follow_up_completed_at?: string | null
          follow_up_date?: string | null
          follow_up_needed?: boolean | null
          follow_up_notes?: string | null
          id?: string
          marked_at?: string | null
          marked_by_user_id?: string
          outcome?: string
          reason_code?: string | null
          reason_detail?: string | null
          session_id?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_student_id_fkey"
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
      authorizations: {
        Row: {
          alert_exhausted: boolean | null
          alert_expiring_30_days: boolean | null
          alert_low_units_20: boolean | null
          alert_no_match: boolean | null
          auth_number: string
          created_at: string
          end_date: string
          id: string
          is_default: boolean | null
          matching_rule: string | null
          notes: string | null
          payer_id: string
          service_codes: string[] | null
          start_date: string
          status: string | null
          student_id: string
          unit_type: string | null
          units_approved: number
          units_remaining: number | null
          units_used: number
          updated_at: string
          warning_behavior: string | null
        }
        Insert: {
          alert_exhausted?: boolean | null
          alert_expiring_30_days?: boolean | null
          alert_low_units_20?: boolean | null
          alert_no_match?: boolean | null
          auth_number: string
          created_at?: string
          end_date: string
          id?: string
          is_default?: boolean | null
          matching_rule?: string | null
          notes?: string | null
          payer_id: string
          service_codes?: string[] | null
          start_date: string
          status?: string | null
          student_id: string
          unit_type?: string | null
          units_approved?: number
          units_remaining?: number | null
          units_used?: number
          updated_at?: string
          warning_behavior?: string | null
        }
        Update: {
          alert_exhausted?: boolean | null
          alert_expiring_30_days?: boolean | null
          alert_low_units_20?: boolean | null
          alert_no_match?: boolean | null
          auth_number?: string
          created_at?: string
          end_date?: string
          id?: string
          is_default?: boolean | null
          matching_rule?: string | null
          notes?: string | null
          payer_id?: string
          service_codes?: string[] | null
          start_date?: string
          status?: string | null
          student_id?: string
          unit_type?: string | null
          units_approved?: number
          units_remaining?: number | null
          units_used?: number
          updated_at?: string
          warning_behavior?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "authorizations_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authorizations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      authorized_services: {
        Row: {
          authorization_id: string
          cpt_code: string | null
          created_at: string
          id: string
          is_active: boolean | null
          modifier: string | null
          place_of_service: string | null
          rate: number | null
          service_name: string
          student_id: string
          unit_type: string
          units_approved: number
          units_remaining: number | null
          units_used: number
          updated_at: string
        }
        Insert: {
          authorization_id: string
          cpt_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          modifier?: string | null
          place_of_service?: string | null
          rate?: number | null
          service_name: string
          student_id: string
          unit_type?: string
          units_approved?: number
          units_remaining?: number | null
          units_used?: number
          updated_at?: string
        }
        Update: {
          authorization_id?: string
          cpt_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          modifier?: string | null
          place_of_service?: string | null
          rate?: number | null
          service_name?: string
          student_id?: string
          unit_type?: string
          units_approved?: number
          units_remaining?: number | null
          units_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "authorized_services_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "authorizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authorized_services_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_settings: {
        Row: {
          advance_mode: string
          auto_advance_enabled: boolean
          auto_open_next_target: boolean
          created_at: string
          id: string
          next_target_rule: Json | null
          require_confirmation: boolean
          scope: string
          scope_id: string | null
          updated_at: string
        }
        Insert: {
          advance_mode?: string
          auto_advance_enabled?: boolean
          auto_open_next_target?: boolean
          created_at?: string
          id?: string
          next_target_rule?: Json | null
          require_confirmation?: boolean
          scope: string
          scope_id?: string | null
          updated_at?: string
        }
        Update: {
          advance_mode?: string
          auto_advance_enabled?: boolean
          auto_open_next_target?: boolean
          created_at?: string
          id?: string
          next_target_rule?: Json | null
          require_confirmation?: boolean
          scope?: string
          scope_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      behavior_bank_entries: {
        Row: {
          agency_id: string | null
          behavior_id: string
          category: string | null
          created_at: string
          created_by: string
          entry_type: string
          id: string
          is_global: boolean
          name: string | null
          operational_definition: string | null
          promoted_at: string | null
          promoted_from_student_id: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          behavior_id: string
          category?: string | null
          created_at?: string
          created_by: string
          entry_type: string
          id?: string
          is_global?: boolean
          name?: string | null
          operational_definition?: string | null
          promoted_at?: string | null
          promoted_from_student_id?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          behavior_id?: string
          category?: string | null
          created_at?: string
          created_by?: string
          entry_type?: string
          id?: string
          is_global?: boolean
          name?: string | null
          operational_definition?: string | null
          promoted_at?: string | null
          promoted_from_student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_bank_entries_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_bank_entries_promoted_from_student_id_fkey"
            columns: ["promoted_from_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_claims: {
        Row: {
          adjustment_amount: number | null
          adjustment_codes: Json | null
          appeal_deadline: string | null
          appeal_submitted_date: string | null
          authorization_id: string | null
          claim_number: string
          created_at: string
          created_by: string
          denial_code: string | null
          denial_reason: string | null
          diagnosis_codes: Json | null
          id: string
          notes: string | null
          paid_amount: number | null
          paid_date: string | null
          payer_id: string
          place_of_service: string
          service_date_from: string
          service_date_to: string
          status: string
          student_id: string
          submitted_date: string | null
          total_charges: number
          updated_at: string
        }
        Insert: {
          adjustment_amount?: number | null
          adjustment_codes?: Json | null
          appeal_deadline?: string | null
          appeal_submitted_date?: string | null
          authorization_id?: string | null
          claim_number: string
          created_at?: string
          created_by: string
          denial_code?: string | null
          denial_reason?: string | null
          diagnosis_codes?: Json | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payer_id: string
          place_of_service?: string
          service_date_from: string
          service_date_to: string
          status?: string
          student_id: string
          submitted_date?: string | null
          total_charges?: number
          updated_at?: string
        }
        Update: {
          adjustment_amount?: number | null
          adjustment_codes?: Json | null
          appeal_deadline?: string | null
          appeal_submitted_date?: string | null
          authorization_id?: string | null
          claim_number?: string
          created_at?: string
          created_by?: string
          denial_code?: string | null
          denial_reason?: string | null
          diagnosis_codes?: Json | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payer_id?: string
          place_of_service?: string
          service_date_from?: string
          service_date_to?: string
          status?: string
          student_id?: string
          submitted_date?: string | null
          total_charges?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_claims_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "authorizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_claims_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_claims_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_payments: {
        Row: {
          amount: number
          claim_id: string | null
          created_at: string
          created_by: string
          description: string | null
          failure_reason: string | null
          id: string
          payer_id: string | null
          payment_method: string | null
          payment_type: string
          processed_at: string | null
          receipt_url: string | null
          reference_number: string | null
          refund_amount: number | null
          refund_reason: string | null
          service_date_from: string | null
          service_date_to: string | null
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_method_id: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          claim_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          failure_reason?: string | null
          id?: string
          payer_id?: string | null
          payment_method?: string | null
          payment_type: string
          processed_at?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          service_date_from?: string | null
          service_date_to?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          claim_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          failure_reason?: string | null
          id?: string
          payer_id?: string | null
          payment_method?: string | null
          payment_type?: string
          processed_at?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          service_date_from?: string | null
          service_date_to?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_payments_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "billing_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      bx_behavior_checklist_items: {
        Row: {
          active: boolean | null
          behavior_number: number
          checklist_id: string
          checklist_item_id: string
          created_at: string
          domain: string
          id: string
          label: string
          linked_problem_id: string | null
          topics: string[] | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          behavior_number: number
          checklist_id?: string
          checklist_item_id: string
          created_at?: string
          domain: string
          id?: string
          label: string
          linked_problem_id?: string | null
          topics?: string[] | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          behavior_number?: number
          checklist_id?: string
          checklist_item_id?: string
          created_at?: string
          domain?: string
          id?: string
          label?: string
          linked_problem_id?: string | null
          topics?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      bx_goal_objective_links: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          objective_id: string
          priority: number | null
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          objective_id: string
          priority?: number | null
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          objective_id?: string
          priority?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bx_goal_objective_links_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "bx_replacement_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bx_goal_objective_links_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "bx_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      bx_objective_strategy_links: {
        Row: {
          created_at: string
          id: string
          objective_id: string
          phase: string | null
          priority: number | null
          strategy_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          objective_id: string
          phase?: string | null
          priority?: number | null
          strategy_id: string
        }
        Update: {
          created_at?: string
          id?: string
          objective_id?: string
          phase?: string | null
          priority?: number | null
          strategy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bx_objective_strategy_links_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "bx_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bx_objective_strategy_links_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "bx_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      bx_objectives: {
        Row: {
          agency_id: string | null
          created_at: string
          created_by: string | null
          id: string
          mastery_criteria: string | null
          measurement_recommendations: string[] | null
          objective_code: string
          objective_title: string
          operational_definition: string | null
          prerequisites: string[] | null
          replacement_skill_tags: string[] | null
          status: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mastery_criteria?: string | null
          measurement_recommendations?: string[] | null
          objective_code: string
          objective_title: string
          operational_definition?: string | null
          prerequisites?: string[] | null
          replacement_skill_tags?: string[] | null
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mastery_criteria?: string | null
          measurement_recommendations?: string[] | null
          objective_code?: string
          objective_title?: string
          operational_definition?: string | null
          prerequisites?: string[] | null
          replacement_skill_tags?: string[] | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bx_objectives_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      bx_presenting_problems: {
        Row: {
          agency_id: string | null
          contraindications: string[] | null
          created_at: string
          created_by: string | null
          definition: string | null
          domain: string
          examples: string[] | null
          function_tags: string[] | null
          id: string
          problem_code: string
          risk_level: string
          source_origin: string
          source_page: number | null
          source_problem_number: string | null
          source_section: string | null
          source_title: string | null
          status: string
          title: string
          topics: string[] | null
          trigger_tags: string[] | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          contraindications?: string[] | null
          created_at?: string
          created_by?: string | null
          definition?: string | null
          domain: string
          examples?: string[] | null
          function_tags?: string[] | null
          id?: string
          problem_code: string
          risk_level?: string
          source_origin?: string
          source_page?: number | null
          source_problem_number?: string | null
          source_section?: string | null
          source_title?: string | null
          status?: string
          title: string
          topics?: string[] | null
          trigger_tags?: string[] | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          contraindications?: string[] | null
          created_at?: string
          created_by?: string | null
          definition?: string | null
          domain?: string
          examples?: string[] | null
          function_tags?: string[] | null
          id?: string
          problem_code?: string
          risk_level?: string
          source_origin?: string
          source_page?: number | null
          source_problem_number?: string | null
          source_section?: string | null
          source_title?: string | null
          status?: string
          title?: string
          topics?: string[] | null
          trigger_tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bx_presenting_problems_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      bx_problem_goal_links: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          priority: number | null
          problem_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          priority?: number | null
          problem_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          priority?: number | null
          problem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bx_problem_goal_links_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "bx_replacement_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bx_problem_goal_links_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "bx_presenting_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      bx_problem_objective_links: {
        Row: {
          created_at: string
          id: string
          objective_id: string
          priority: number | null
          problem_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          objective_id: string
          priority?: number | null
          problem_id: string
        }
        Update: {
          created_at?: string
          id?: string
          objective_id?: string
          priority?: number | null
          problem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bx_problem_objective_links_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "bx_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bx_problem_objective_links_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "bx_presenting_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      bx_recommendation_settings: {
        Row: {
          agency_id: string | null
          created_at: string
          guardrail_block_contraindicated: boolean | null
          guardrail_exclude_existing: boolean | null
          guardrail_exclude_rejected: boolean | null
          guardrail_school_reduce_high_risk: boolean | null
          id: string
          max_objectives: number | null
          max_strategies_per_objective: number | null
          threshold_high_confidence: number | null
          threshold_medium_confidence: number | null
          tuning_profile: string | null
          updated_at: string
          weight_bcba_penalty_school: number | null
          weight_contraindication: number | null
          weight_domain_match: number | null
          weight_function_match: number | null
          weight_problem_title_match: number | null
          weight_rejected_penalty: number | null
          weight_risk_crisis_penalty: number | null
          weight_risk_high_penalty: number | null
          weight_risk_safe_bonus: number | null
          weight_topic_overlap: number | null
          weight_trigger_match: number | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          guardrail_block_contraindicated?: boolean | null
          guardrail_exclude_existing?: boolean | null
          guardrail_exclude_rejected?: boolean | null
          guardrail_school_reduce_high_risk?: boolean | null
          id?: string
          max_objectives?: number | null
          max_strategies_per_objective?: number | null
          threshold_high_confidence?: number | null
          threshold_medium_confidence?: number | null
          tuning_profile?: string | null
          updated_at?: string
          weight_bcba_penalty_school?: number | null
          weight_contraindication?: number | null
          weight_domain_match?: number | null
          weight_function_match?: number | null
          weight_problem_title_match?: number | null
          weight_rejected_penalty?: number | null
          weight_risk_crisis_penalty?: number | null
          weight_risk_high_penalty?: number | null
          weight_risk_safe_bonus?: number | null
          weight_topic_overlap?: number | null
          weight_trigger_match?: number | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          guardrail_block_contraindicated?: boolean | null
          guardrail_exclude_existing?: boolean | null
          guardrail_exclude_rejected?: boolean | null
          guardrail_school_reduce_high_risk?: boolean | null
          id?: string
          max_objectives?: number | null
          max_strategies_per_objective?: number | null
          threshold_high_confidence?: number | null
          threshold_medium_confidence?: number | null
          tuning_profile?: string | null
          updated_at?: string
          weight_bcba_penalty_school?: number | null
          weight_contraindication?: number | null
          weight_domain_match?: number | null
          weight_function_match?: number | null
          weight_problem_title_match?: number | null
          weight_rejected_penalty?: number | null
          weight_risk_crisis_penalty?: number | null
          weight_risk_high_penalty?: number | null
          weight_risk_safe_bonus?: number | null
          weight_topic_overlap?: number | null
          weight_trigger_match?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bx_recommendation_settings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      bx_replacement_goals: {
        Row: {
          agency_id: string | null
          created_at: string
          created_by: string | null
          domain: string
          goal_code: string
          goal_title: string
          id: string
          status: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          domain: string
          goal_code: string
          goal_title: string
          id?: string
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          domain?: string
          goal_code?: string
          goal_title?: string
          id?: string
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bx_replacement_goals_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      bx_strategies: {
        Row: {
          agency_id: string | null
          contraindications: string[] | null
          created_at: string
          created_by: string | null
          data_targets: string[] | null
          fidelity_checklist: string[] | null
          id: string
          implementation_steps: string[] | null
          materials: string[] | null
          requires_bcba: boolean | null
          risk_level: string
          staff_script: string | null
          status: string
          strategy_code: string
          strategy_name: string
          strategy_type: string[] | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          contraindications?: string[] | null
          created_at?: string
          created_by?: string | null
          data_targets?: string[] | null
          fidelity_checklist?: string[] | null
          id?: string
          implementation_steps?: string[] | null
          materials?: string[] | null
          requires_bcba?: boolean | null
          risk_level?: string
          staff_script?: string | null
          status?: string
          strategy_code: string
          strategy_name: string
          strategy_type?: string[] | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          contraindications?: string[] | null
          created_at?: string
          created_by?: string | null
          data_targets?: string[] | null
          fidelity_checklist?: string[] | null
          id?: string
          implementation_steps?: string[] | null
          materials?: string[] | null
          requires_bcba?: boolean | null
          risk_level?: string
          staff_script?: string | null
          status?: string
          strategy_code?: string
          strategy_name?: string
          strategy_type?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bx_strategies_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_competency_checks: {
        Row: {
          caregiver_name: string
          check_date: string
          checklist_items: Json | null
          created_at: string
          evaluator_id: string
          id: string
          notes: string | null
          passed: boolean | null
          percent_correct: number | null
          program_id: string | null
          setting: string | null
          student_id: string
        }
        Insert: {
          caregiver_name: string
          check_date?: string
          checklist_items?: Json | null
          created_at?: string
          evaluator_id: string
          id?: string
          notes?: string | null
          passed?: boolean | null
          percent_correct?: number | null
          program_id?: string | null
          setting?: string | null
          student_id: string
        }
        Update: {
          caregiver_name?: string
          check_date?: string
          checklist_items?: Json | null
          created_at?: string
          evaluator_id?: string
          id?: string
          notes?: string | null
          passed?: boolean | null
          percent_correct?: number | null
          program_id?: string | null
          setting?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_competency_checks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "caregiver_training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_generalization_probes: {
        Row: {
          caregiver_name: string
          created_at: string
          fidelity_percentage: number | null
          id: string
          items_observed: Json | null
          notes: string | null
          observer_id: string
          probe_date: string
          program_id: string | null
          setting: string
          student_id: string
        }
        Insert: {
          caregiver_name: string
          created_at?: string
          fidelity_percentage?: number | null
          id?: string
          items_observed?: Json | null
          notes?: string | null
          observer_id: string
          probe_date?: string
          program_id?: string | null
          setting: string
          student_id: string
        }
        Update: {
          caregiver_name?: string
          created_at?: string
          fidelity_percentage?: number | null
          id?: string
          items_observed?: Json | null
          notes?: string | null
          observer_id?: string
          probe_date?: string
          program_id?: string | null
          setting?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_generalization_probes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "caregiver_training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_training_programs: {
        Row: {
          agency_id: string | null
          bst_steps: Json | null
          category: string | null
          competency_criteria: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_duration_hours: number | null
          id: string
          status: string
          target_skills: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          bst_steps?: Json | null
          category?: string | null
          competency_criteria?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_duration_hours?: number | null
          id?: string
          status?: string
          target_skills?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          bst_steps?: Json | null
          category?: string | null
          competency_criteria?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_duration_hours?: number | null
          id?: string
          status?: string
          target_skills?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_training_programs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_training_sessions: {
        Row: {
          bst_phase: string
          caregiver_name: string
          caregiver_relationship: string | null
          competency_rating: number | null
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          program_id: string | null
          session_date: string
          skills_addressed: Json | null
          staff_user_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          bst_phase?: string
          caregiver_name: string
          caregiver_relationship?: string | null
          competency_rating?: number | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          program_id?: string | null
          session_date?: string
          skills_addressed?: Json | null
          staff_user_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          bst_phase?: string
          caregiver_name?: string
          caregiver_relationship?: string | null
          competency_rating?: number | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          program_id?: string | null
          session_date?: string
          skills_addressed?: Json | null
          staff_user_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_training_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "caregiver_training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      ceu_records: {
        Row: {
          activity_type: string
          agency_id: string | null
          bacb_requirement_category: string | null
          certificate_url: string | null
          created_at: string
          credits_earned: number
          date_completed: string
          expiration_date: string | null
          id: string
          notes: string | null
          provider: string | null
          staff_user_id: string
          title: string
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          activity_type?: string
          agency_id?: string | null
          bacb_requirement_category?: string | null
          certificate_url?: string | null
          created_at?: string
          credits_earned?: number
          date_completed: string
          expiration_date?: string | null
          id?: string
          notes?: string | null
          provider?: string | null
          staff_user_id: string
          title: string
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          activity_type?: string
          agency_id?: string | null
          bacb_requirement_category?: string | null
          certificate_url?: string | null
          created_at?: string
          credits_earned?: number
          date_completed?: string
          expiration_date?: string | null
          id?: string
          notes?: string | null
          provider?: string | null
          staff_user_id?: string
          title?: string
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ceu_records_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_alert_thresholds: {
        Row: {
          action_threshold: number
          active: boolean
          behavior_category: string | null
          behavior_function: string | null
          category: string
          comparison_direction: string
          created_at: string
          created_by: string | null
          critical_threshold: number
          data_phase: string | null
          id: string
          scope: string
          scope_id: string | null
          setting: string | null
          updated_at: string
          watch_threshold: number
        }
        Insert: {
          action_threshold: number
          active?: boolean
          behavior_category?: string | null
          behavior_function?: string | null
          category: string
          comparison_direction?: string
          created_at?: string
          created_by?: string | null
          critical_threshold: number
          data_phase?: string | null
          id?: string
          scope: string
          scope_id?: string | null
          setting?: string | null
          updated_at?: string
          watch_threshold: number
        }
        Update: {
          action_threshold?: number
          active?: boolean
          behavior_category?: string | null
          behavior_function?: string | null
          category?: string
          comparison_direction?: string
          created_at?: string
          created_by?: string | null
          critical_threshold?: number
          data_phase?: string | null
          id?: string
          scope?: string
          scope_id?: string | null
          setting?: string | null
          updated_at?: string
          watch_threshold?: number
        }
        Relationships: []
      }
      ci_alert_to_lms_map: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          module_id: string
          role_slug: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          id?: string
          module_id: string
          role_slug: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          module_id?: string
          role_slug?: string
        }
        Relationships: []
      }
      ci_alerts: {
        Row: {
          agency_id: string
          alert_key: string | null
          category: string
          client_id: string | null
          created_at: string
          data_source_id: string | null
          explanation_json: Json | null
          id: string
          message: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
        }
        Insert: {
          agency_id: string
          alert_key?: string | null
          category?: string
          client_id?: string | null
          created_at?: string
          data_source_id?: string | null
          explanation_json?: Json | null
          id?: string
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Update: {
          agency_id?: string
          alert_key?: string | null
          category?: string
          client_id?: string | null
          created_at?: string
          data_source_id?: string | null
          explanation_json?: Json | null
          id?: string
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "ci_alerts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ci_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_client_metrics: {
        Row: {
          agency_id: string
          client_id: string
          data_freshness: number | null
          data_source_id: string | null
          fidelity_score: number | null
          goal_velocity_score: number | null
          id: string
          parent_impl_score: number | null
          risk_score: number | null
          trend_score: number | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          client_id: string
          data_freshness?: number | null
          data_source_id?: string | null
          fidelity_score?: number | null
          goal_velocity_score?: number | null
          id?: string
          parent_impl_score?: number | null
          risk_score?: number | null
          trend_score?: number | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          client_id?: string
          data_freshness?: number | null
          data_source_id?: string | null
          fidelity_score?: number | null
          goal_velocity_score?: number | null
          id?: string
          parent_impl_score?: number | null
          risk_score?: number | null
          trend_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ci_client_metrics_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ci_client_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_compute_runs: {
        Row: {
          agency_id: string | null
          alerts_resolved_count: number | null
          alerts_upserted_count: number | null
          data_source_id: string | null
          duration_ms: number | null
          errors_json: Json | null
          finished_at: string | null
          metrics_upserted_count: number | null
          run_id: string
          started_at: string
          status: string
        }
        Insert: {
          agency_id?: string | null
          alerts_resolved_count?: number | null
          alerts_upserted_count?: number | null
          data_source_id?: string | null
          duration_ms?: number | null
          errors_json?: Json | null
          finished_at?: string | null
          metrics_upserted_count?: number | null
          run_id?: string
          started_at?: string
          status?: string
        }
        Update: {
          agency_id?: string | null
          alerts_resolved_count?: number | null
          alerts_upserted_count?: number | null
          data_source_id?: string | null
          duration_ms?: number | null
          errors_json?: Json | null
          finished_at?: string | null
          metrics_upserted_count?: number | null
          run_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ci_compute_runs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_intervention_recs: {
        Row: {
          agency_id: string
          behavior_id: string | null
          client_id: string
          created_at: string
          data_source_id: string | null
          hypothesis_id: string | null
          id: string
          intervention_id: string | null
          reasons_json: Json | null
          score: number | null
          status: string
        }
        Insert: {
          agency_id: string
          behavior_id?: string | null
          client_id: string
          created_at?: string
          data_source_id?: string | null
          hypothesis_id?: string | null
          id?: string
          intervention_id?: string | null
          reasons_json?: Json | null
          score?: number | null
          status?: string
        }
        Update: {
          agency_id?: string
          behavior_id?: string | null
          client_id?: string
          created_at?: string
          data_source_id?: string | null
          hypothesis_id?: string | null
          id?: string
          intervention_id?: string | null
          reasons_json?: Json | null
          score?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ci_intervention_recs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ci_intervention_recs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_threshold_rules: {
        Row: {
          active: boolean | null
          agency_id: string | null
          behavior_category: string | null
          behavior_id: string | null
          client_id: string | null
          created_at: string | null
          fidelity_action: number | null
          fidelity_critical: number | null
          fidelity_watch: number | null
          freshness_action: number | null
          freshness_critical: number | null
          freshness_watch: number | null
          function: string | null
          goal_vel_action: number | null
          goal_vel_critical: number | null
          goal_vel_watch: number | null
          parent_impl_action: number | null
          parent_impl_critical: number | null
          parent_impl_watch: number | null
          phase: string | null
          priority: number
          risk_action: number | null
          risk_critical: number | null
          risk_watch: number | null
          rule_id: string
          scope: string
          setting: string | null
          target_id: string | null
          trend_action: number | null
          trend_critical: number | null
          trend_watch: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          agency_id?: string | null
          behavior_category?: string | null
          behavior_id?: string | null
          client_id?: string | null
          created_at?: string | null
          fidelity_action?: number | null
          fidelity_critical?: number | null
          fidelity_watch?: number | null
          freshness_action?: number | null
          freshness_critical?: number | null
          freshness_watch?: number | null
          function?: string | null
          goal_vel_action?: number | null
          goal_vel_critical?: number | null
          goal_vel_watch?: number | null
          parent_impl_action?: number | null
          parent_impl_critical?: number | null
          parent_impl_watch?: number | null
          phase?: string | null
          priority?: number
          risk_action?: number | null
          risk_critical?: number | null
          risk_watch?: number | null
          rule_id?: string
          scope: string
          setting?: string | null
          target_id?: string | null
          trend_action?: number | null
          trend_critical?: number | null
          trend_watch?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          agency_id?: string | null
          behavior_category?: string | null
          behavior_id?: string | null
          client_id?: string | null
          created_at?: string | null
          fidelity_action?: number | null
          fidelity_critical?: number | null
          fidelity_watch?: number | null
          freshness_action?: number | null
          freshness_critical?: number | null
          freshness_watch?: number | null
          function?: string | null
          goal_vel_action?: number | null
          goal_vel_critical?: number | null
          goal_vel_watch?: number | null
          parent_impl_action?: number | null
          parent_impl_critical?: number | null
          parent_impl_watch?: number | null
          phase?: string | null
          priority?: number
          risk_action?: number | null
          risk_critical?: number | null
          risk_watch?: number | null
          rule_id?: string
          scope?: string
          setting?: string | null
          target_id?: string | null
          trend_action?: number | null
          trend_critical?: number | null
          trend_watch?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ci_threshold_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_line_items: {
        Row: {
          claim_id: string
          cpt_code: string
          created_at: string
          id: string
          line_number: number
          modifiers: Json | null
          notes: string | null
          rendering_provider_name: string | null
          rendering_provider_npi: string | null
          service_date: string
          session_id: string | null
          total_charge: number
          unit_charge: number
          units: number
        }
        Insert: {
          claim_id: string
          cpt_code: string
          created_at?: string
          id?: string
          line_number: number
          modifiers?: Json | null
          notes?: string | null
          rendering_provider_name?: string | null
          rendering_provider_npi?: string | null
          service_date: string
          session_id?: string | null
          total_charge: number
          unit_charge: number
          units: number
        }
        Update: {
          claim_id?: string
          cpt_code?: string
          created_at?: string
          id?: string
          line_number?: number
          modifiers?: Json | null
          notes?: string | null
          rendering_provider_name?: string | null
          rendering_provider_npi?: string | null
          service_date?: string
          session_id?: string | null
          total_charge?: number
          unit_charge?: number
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "claim_line_items_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "billing_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_line_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_submission_history: {
        Row: {
          claim_id: string
          clearinghouse_claim_id: string | null
          clearinghouse_status: string | null
          created_at: string
          id: string
          rejection_reasons: string[] | null
          response_data: Json | null
          response_date: string | null
          submission_id: string | null
        }
        Insert: {
          claim_id: string
          clearinghouse_claim_id?: string | null
          clearinghouse_status?: string | null
          created_at?: string
          id?: string
          rejection_reasons?: string[] | null
          response_data?: Json | null
          response_date?: string | null
          submission_id?: string | null
        }
        Update: {
          claim_id?: string
          clearinghouse_claim_id?: string | null
          clearinghouse_status?: string | null
          created_at?: string
          id?: string
          rejection_reasons?: string[] | null
          response_data?: Json | null
          response_date?: string | null
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_submission_history_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "clearinghouse_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      clearinghouse_submissions: {
        Row: {
          agency_id: string | null
          batch_number: string
          claim_count: number | null
          clearinghouse: string | null
          created_at: string
          file_url: string | null
          id: string
          notes: string | null
          response_data: Json | null
          status: string
          submission_date: string
          submitted_by: string
          total_charges: number | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          batch_number: string
          claim_count?: number | null
          clearinghouse?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          notes?: string | null
          response_data?: Json | null
          status?: string
          submission_date?: string
          submitted_by: string
          total_charges?: number | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          batch_number?: string
          claim_count?: number | null
          clearinghouse?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          notes?: string | null
          response_data?: Json | null
          status?: string
          submission_date?: string
          submitted_by?: string
          total_charges?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clearinghouse_submissions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_accommodations: {
        Row: {
          category: string
          client_id: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          implementation_notes: string | null
          is_active: boolean
          responsible_staff: string | null
          review_date: string | null
          settings: string[] | null
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          client_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          implementation_notes?: string | null
          is_active?: boolean
          responsible_staff?: string | null
          review_date?: string | null
          settings?: string[] | null
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          client_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          implementation_notes?: string | null
          is_active?: boolean
          responsible_staff?: string | null
          review_date?: string | null
          settings?: string[] | null
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_accommodations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      client_case_attributes: {
        Row: {
          attribute_key: string
          attribute_type: string
          attribute_value: string
          client_id: string
          created_at: string
          id: string
          metadata: Json | null
          updated_at: string
        }
        Insert: {
          attribute_key: string
          attribute_type: string
          attribute_value: string
          client_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          updated_at?: string
        }
        Update: {
          attribute_key?: string
          attribute_type?: string
          attribute_value?: string
          client_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_case_attributes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      client_communication_access: {
        Row: {
          aac_device_type: string | null
          aac_notes: string | null
          client_id: string
          communication_mode: string | null
          created_at: string
          cultural_notes: string | null
          cultural_notes_visibility: string | null
          id: string
          interpreter_language: string | null
          interpreter_required: boolean
          preferred_language_for_caregiver_comms: string
          primary_language: string
          secondary_languages: Json | null
          sensory_preferences: Json | null
          updated_at: string
        }
        Insert: {
          aac_device_type?: string | null
          aac_notes?: string | null
          client_id: string
          communication_mode?: string | null
          created_at?: string
          cultural_notes?: string | null
          cultural_notes_visibility?: string | null
          id?: string
          interpreter_language?: string | null
          interpreter_required?: boolean
          preferred_language_for_caregiver_comms?: string
          primary_language?: string
          secondary_languages?: Json | null
          sensory_preferences?: Json | null
          updated_at?: string
        }
        Update: {
          aac_device_type?: string | null
          aac_notes?: string | null
          client_id?: string
          communication_mode?: string | null
          created_at?: string
          cultural_notes?: string | null
          cultural_notes_visibility?: string | null
          id?: string
          interpreter_language?: string | null
          interpreter_required?: boolean
          preferred_language_for_caregiver_comms?: string
          primary_language?: string
          secondary_languages?: Json | null
          sensory_preferences?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_communication_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      client_communication_log: {
        Row: {
          attachments: Json | null
          client_id: string
          contact_id: string | null
          contact_person: string
          contact_role: string | null
          created_at: string
          date_time: string
          detailed_notes: string | null
          direction: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          follow_up_tasks: Json | null
          id: string
          logged_by: string
          method: string
          summary: string
          topic_tags: Json | null
          updated_at: string
          visibility: string | null
        }
        Insert: {
          attachments?: Json | null
          client_id: string
          contact_id?: string | null
          contact_person: string
          contact_role?: string | null
          created_at?: string
          date_time?: string
          detailed_notes?: string | null
          direction?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          follow_up_tasks?: Json | null
          id?: string
          logged_by: string
          method: string
          summary: string
          topic_tags?: Json | null
          updated_at?: string
          visibility?: string | null
        }
        Update: {
          attachments?: Json | null
          client_id?: string
          contact_id?: string | null
          contact_person?: string
          contact_role?: string | null
          created_at?: string
          date_time?: string
          detailed_notes?: string | null
          direction?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          follow_up_tasks?: Json | null
          id?: string
          logged_by?: string
          method?: string
          summary?: string
          topic_tags?: Json | null
          updated_at?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_communication_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_communication_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          can_make_decisions: boolean | null
          can_pickup: boolean | null
          client_id: string
          created_at: string
          emails: Json | null
          full_name: string
          id: string
          is_emergency_contact: boolean | null
          is_primary_guardian: boolean | null
          is_provider_contact: boolean | null
          is_school_contact: boolean | null
          is_secondary_guardian: boolean | null
          notes: string | null
          phones: Json | null
          preferred_contact_method: string | null
          preferred_language: string | null
          relationship: string
          updated_at: string
          visibility_permission: string | null
        }
        Insert: {
          can_make_decisions?: boolean | null
          can_pickup?: boolean | null
          client_id: string
          created_at?: string
          emails?: Json | null
          full_name: string
          id?: string
          is_emergency_contact?: boolean | null
          is_primary_guardian?: boolean | null
          is_provider_contact?: boolean | null
          is_school_contact?: boolean | null
          is_secondary_guardian?: boolean | null
          notes?: string | null
          phones?: Json | null
          preferred_contact_method?: string | null
          preferred_language?: string | null
          relationship: string
          updated_at?: string
          visibility_permission?: string | null
        }
        Update: {
          can_make_decisions?: boolean | null
          can_pickup?: boolean | null
          client_id?: string
          created_at?: string
          emails?: Json | null
          full_name?: string
          id?: string
          is_emergency_contact?: boolean | null
          is_primary_guardian?: boolean | null
          is_provider_contact?: boolean | null
          is_school_contact?: boolean | null
          is_secondary_guardian?: boolean | null
          notes?: string | null
          phones?: Json | null
          preferred_contact_method?: string | null
          preferred_language?: string | null
          relationship?: string
          updated_at?: string
          visibility_permission?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          doc_type: string
          expiration_date: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_current_version: boolean | null
          legacy_file_id: string | null
          mime_type: string | null
          notes: string | null
          previous_version_id: string | null
          review_required: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          school_year_tag: string | null
          tags: Json | null
          title: string
          updated_at: string
          upload_date: string
          uploaded_by: string | null
          uploaded_by_user_id: string | null
          version_number: number | null
          visibility_permission: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          doc_type: string
          expiration_date?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_current_version?: boolean | null
          legacy_file_id?: string | null
          mime_type?: string | null
          notes?: string | null
          previous_version_id?: string | null
          review_required?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_year_tag?: string | null
          tags?: Json | null
          title: string
          updated_at?: string
          upload_date?: string
          uploaded_by?: string | null
          uploaded_by_user_id?: string | null
          version_number?: number | null
          visibility_permission?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          doc_type?: string
          expiration_date?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_current_version?: boolean | null
          legacy_file_id?: string | null
          mime_type?: string | null
          notes?: string | null
          previous_version_id?: string | null
          review_required?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_year_tag?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string
          upload_date?: string
          uploaded_by?: string | null
          uploaded_by_user_id?: string | null
          version_number?: number | null
          visibility_permission?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "client_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      client_locations: {
        Row: {
          access_instructions: string | null
          address_line1: string
          address_line2: string | null
          allowed_session_types: Json | null
          allowed_staff_roles: Json | null
          city: string
          client_id: string
          country: string | null
          created_at: string
          geocode_lat: number | null
          geocode_lng: number | null
          geocode_status: string | null
          id: string
          is_active: boolean
          is_primary_service_site: boolean | null
          location_name: string
          location_type: string
          onsite_contact_email: string | null
          onsite_contact_name: string | null
          onsite_contact_phone: string | null
          parking_notes: string | null
          safety_notes: string | null
          safety_notes_visibility: string | null
          school_hours: Json | null
          school_hours_only: boolean | null
          state: string
          updated_at: string
          zip_code: string
        }
        Insert: {
          access_instructions?: string | null
          address_line1: string
          address_line2?: string | null
          allowed_session_types?: Json | null
          allowed_staff_roles?: Json | null
          city: string
          client_id: string
          country?: string | null
          created_at?: string
          geocode_lat?: number | null
          geocode_lng?: number | null
          geocode_status?: string | null
          id?: string
          is_active?: boolean
          is_primary_service_site?: boolean | null
          location_name: string
          location_type: string
          onsite_contact_email?: string | null
          onsite_contact_name?: string | null
          onsite_contact_phone?: string | null
          parking_notes?: string | null
          safety_notes?: string | null
          safety_notes_visibility?: string | null
          school_hours?: Json | null
          school_hours_only?: boolean | null
          state: string
          updated_at?: string
          zip_code: string
        }
        Update: {
          access_instructions?: string | null
          address_line1?: string
          address_line2?: string | null
          allowed_session_types?: Json | null
          allowed_staff_roles?: Json | null
          city?: string
          client_id?: string
          country?: string | null
          created_at?: string
          geocode_lat?: number | null
          geocode_lng?: number | null
          geocode_status?: string | null
          id?: string
          is_active?: boolean
          is_primary_service_site?: boolean | null
          location_name?: string
          location_type?: string
          onsite_contact_email?: string | null
          onsite_contact_name?: string | null
          onsite_contact_phone?: string | null
          parking_notes?: string | null
          safety_notes?: string | null
          safety_notes_visibility?: string | null
          school_hours?: Json | null
          school_hours_only?: boolean | null
          state?: string
          updated_at?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_locations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      client_payers: {
        Row: {
          created_at: string
          effective_date: string | null
          group_number: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          member_id: string | null
          payer_id: string
          policy_holder_dob: string | null
          policy_holder_name: string | null
          relationship_to_client: string | null
          student_id: string
          termination_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_date?: string | null
          group_number?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          member_id?: string | null
          payer_id: string
          policy_holder_dob?: string | null
          policy_holder_name?: string | null
          relationship_to_client?: string | null
          student_id: string
          termination_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_date?: string | null
          group_number?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          member_id?: string | null
          payer_id?: string
          policy_holder_dob?: string | null
          policy_holder_name?: string | null
          relationship_to_client?: string | null
          student_id?: string
          termination_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_payers_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_payers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      client_safety_medical: {
        Row: {
          allergies: Json | null
          client_id: string
          created_at: string
          crisis_plan_doc_id: string | null
          deescalation_supports: Json | null
          dietary_restrictions: Json | null
          emergency_protocol_present: boolean
          id: string
          known_triggers: Json | null
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          medical_conditions: Json | null
          medications: Json | null
          mobility_needs: string | null
          other_medical_notes: string | null
          safety_flags: Json | null
          seizure_protocol: string | null
          sensory_considerations: string | null
          updated_at: string
        }
        Insert: {
          allergies?: Json | null
          client_id: string
          created_at?: string
          crisis_plan_doc_id?: string | null
          deescalation_supports?: Json | null
          dietary_restrictions?: Json | null
          emergency_protocol_present?: boolean
          id?: string
          known_triggers?: Json | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          medical_conditions?: Json | null
          medications?: Json | null
          mobility_needs?: string | null
          other_medical_notes?: string | null
          safety_flags?: Json | null
          seizure_protocol?: string | null
          sensory_considerations?: string | null
          updated_at?: string
        }
        Update: {
          allergies?: Json | null
          client_id?: string
          created_at?: string
          crisis_plan_doc_id?: string | null
          deescalation_supports?: Json | null
          dietary_restrictions?: Json | null
          emergency_protocol_present?: boolean
          id?: string
          known_triggers?: Json | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          medical_conditions?: Json | null
          medications?: Json | null
          mobility_needs?: string | null
          other_medical_notes?: string | null
          safety_flags?: Json | null
          seizure_protocol?: string | null
          sensory_considerations?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_safety_medical_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      client_scheduling_preferences: {
        Row: {
          availability_windows: Json
          client_id: string
          created_at: string
          hard_constraints: Json
          id: string
          max_sessions_per_day: number | null
          min_gap_between_sessions: number | null
          notes: string | null
          notes_visibility: string | null
          preferred_cadence: string | null
          preferred_session_length: number | null
          school_schedule: Json | null
          updated_at: string
          vacation_blackouts: Json | null
        }
        Insert: {
          availability_windows?: Json
          client_id: string
          created_at?: string
          hard_constraints?: Json
          id?: string
          max_sessions_per_day?: number | null
          min_gap_between_sessions?: number | null
          notes?: string | null
          notes_visibility?: string | null
          preferred_cadence?: string | null
          preferred_session_length?: number | null
          school_schedule?: Json | null
          updated_at?: string
          vacation_blackouts?: Json | null
        }
        Update: {
          availability_windows?: Json
          client_id?: string
          created_at?: string
          hard_constraints?: Json
          id?: string
          max_sessions_per_day?: number | null
          min_gap_between_sessions?: number | null
          notes?: string | null
          notes_visibility?: string | null
          preferred_cadence?: string | null
          preferred_session_length?: number | null
          school_schedule?: Json | null
          updated_at?: string
          vacation_blackouts?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "client_scheduling_preferences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      client_service_lines: {
        Row: {
          authorization_status: string | null
          authorized_units: number | null
          client_id: string
          coverage_mode_override: string | null
          cpt_code: string | null
          created_at: string
          end_date: string | null
          expiry_alert_days: number | null
          id: string
          is_active: boolean
          notes: string | null
          payer_id: string | null
          remaining_units: number | null
          requires_authorization: boolean | null
          service_type: string
          start_date: string | null
          unit_type: string | null
          updated_at: string
          used_units: number | null
        }
        Insert: {
          authorization_status?: string | null
          authorized_units?: number | null
          client_id: string
          coverage_mode_override?: string | null
          cpt_code?: string | null
          created_at?: string
          end_date?: string | null
          expiry_alert_days?: number | null
          id?: string
          is_active?: boolean
          notes?: string | null
          payer_id?: string | null
          remaining_units?: number | null
          requires_authorization?: boolean | null
          service_type: string
          start_date?: string | null
          unit_type?: string | null
          updated_at?: string
          used_units?: number | null
        }
        Update: {
          authorization_status?: string | null
          authorized_units?: number | null
          client_id?: string
          coverage_mode_override?: string | null
          cpt_code?: string | null
          created_at?: string
          end_date?: string | null
          expiry_alert_days?: number | null
          id?: string
          is_active?: boolean
          notes?: string | null
          payer_id?: string | null
          remaining_units?: number | null
          requires_authorization?: boolean | null
          service_type?: string
          start_date?: string | null
          unit_type?: string | null
          updated_at?: string
          used_units?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_service_lines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_service_lines_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
      client_team_assignments: {
        Row: {
          assigned_by: string | null
          billable_rate: number | null
          client_id: string
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          notes: string | null
          permission_scope: Json | null
          role: string
          staff_user_id: string
          start_date: string
          supervising_staff_id: string | null
          supervision_required: boolean | null
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          billable_rate?: number | null
          client_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          permission_scope?: Json | null
          role: string
          staff_user_id: string
          start_date?: string
          supervising_staff_id?: string | null
          supervision_required?: boolean | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          billable_rate?: number | null
          client_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          permission_scope?: Json | null
          role?: string
          staff_user_id?: string
          start_date?: string
          supervising_staff_id?: string | null
          supervision_required?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_team_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_authorizations: {
        Row: {
          agency_id: string
          authorization_id: string
          client_id: string
          created_at: string | null
          direct_hours_per_week: number | null
          end_date: string
          group_hours_per_week: number | null
          notes: string | null
          parent_training_hours_per_week: number | null
          start_date: string
          status: string | null
          supervision_hours_per_week: number | null
          unit_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          authorization_id?: string
          client_id: string
          created_at?: string | null
          direct_hours_per_week?: number | null
          end_date: string
          group_hours_per_week?: number | null
          notes?: string | null
          parent_training_hours_per_week?: number | null
          start_date: string
          status?: string | null
          supervision_hours_per_week?: number | null
          unit_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          authorization_id?: string
          client_id?: string
          created_at?: string | null
          direct_hours_per_week?: number | null
          end_date?: string
          group_hours_per_week?: number | null
          notes?: string | null
          parent_training_hours_per_week?: number | null
          start_date?: string
          status?: string | null
          supervision_hours_per_week?: number | null
          unit_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_authorizations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_schedule_events: {
        Row: {
          agency_id: string
          authorization_id: string | null
          bucket_key: string
          client_id: string
          created_at: string
          id: string
          outcome: string
          scheduled_date: string
          scheduled_minutes: number
          scheduled_units: number
          staff_user_id: string
        }
        Insert: {
          agency_id: string
          authorization_id?: string | null
          bucket_key?: string
          client_id: string
          created_at?: string
          id?: string
          outcome?: string
          scheduled_date: string
          scheduled_minutes?: number
          scheduled_units?: number
          staff_user_id: string
        }
        Update: {
          agency_id?: string
          authorization_id?: string | null
          bucket_key?: string
          client_id?: string
          created_at?: string
          id?: string
          outcome?: string
          scheduled_date?: string
          scheduled_minutes?: number
          scheduled_units?: number
          staff_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_schedule_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_schedule_events_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "authorizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_service_buckets: {
        Row: {
          agency_id: string
          bucket_key: string
          bucket_label: string
          created_at: string
          id: string
          is_active: boolean
          required_weekly_hours: number | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          bucket_key: string
          bucket_label: string
          created_at?: string
          id?: string
          is_active?: boolean
          required_weekly_hours?: number | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          bucket_key?: string
          bucket_label?: string
          created_at?: string
          id?: string
          is_active?: boolean
          required_weekly_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_service_buckets_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_service_logs: {
        Row: {
          agency_id: string
          authorization_id: string | null
          bucket_key: string
          client_id: string
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          service_date: string
          staff_user_id: string
          status: string
          units_delivered: number
          updated_at: string
        }
        Insert: {
          agency_id: string
          authorization_id?: string | null
          bucket_key: string
          client_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          service_date: string
          staff_user_id: string
          status?: string
          units_delivered?: number
          updated_at?: string
        }
        Update: {
          agency_id?: string
          authorization_id?: string | null
          bucket_key?: string
          client_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          service_date?: string
          staff_user_id?: string
          status?: string
          units_delivered?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_service_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_service_logs_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "authorizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_form_submissions: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          form_data: Json
          id: string
          pdf_url: string | null
          referral_id: string | null
          retention_until: string
          signature_data: string | null
          signature_ip_address: string | null
          signature_user_agent: string | null
          signed_at: string | null
          signer_email: string | null
          signer_name: string
          signer_relationship: string | null
          status: string
          student_id: string | null
          template_id: string
          updated_at: string
        }
        Insert: {
          access_token?: string
          created_at?: string
          expires_at?: string
          form_data?: Json
          id?: string
          pdf_url?: string | null
          referral_id?: string | null
          retention_until?: string
          signature_data?: string | null
          signature_ip_address?: string | null
          signature_user_agent?: string | null
          signed_at?: string | null
          signer_email?: string | null
          signer_name: string
          signer_relationship?: string | null
          status?: string
          student_id?: string | null
          template_id: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          form_data?: Json
          id?: string
          pdf_url?: string | null
          referral_id?: string | null
          retention_until?: string
          signature_data?: string | null
          signature_ip_address?: string | null
          signature_user_agent?: string | null
          signed_at?: string | null
          signer_email?: string | null
          signer_name?: string
          signer_relationship?: string | null
          status?: string
          student_id?: string | null
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_form_submissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_form_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_form_submissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "consent_form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_form_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          fields: Json
          form_type: string
          id: string
          is_active: boolean
          name: string
          signature_zones: Json
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          form_type?: string
          id?: string
          is_active?: boolean
          name: string
          signature_zones?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          form_type?: string
          id?: string
          is_active?: boolean
          name?: string
          signature_zones?: Json
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      context_barriers_events: {
        Row: {
          created_at: string
          created_by_user_id: string
          display_label: string
          duration_minutes: number | null
          end_time: string | null
          event_group: string
          event_type: Database["public"]["Enums"]["toi_event_type"]
          id: string
          is_active: boolean
          location: Database["public"]["Enums"]["toi_location"] | null
          notes: string | null
          start_time: string
          student_id: string
          suspected_contributor:
            | Database["public"]["Enums"]["toi_contributor"]
            | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          display_label: string
          duration_minutes?: number | null
          end_time?: string | null
          event_group?: string
          event_type: Database["public"]["Enums"]["toi_event_type"]
          id?: string
          is_active?: boolean
          location?: Database["public"]["Enums"]["toi_location"] | null
          notes?: string | null
          start_time: string
          student_id: string
          suspected_contributor?:
            | Database["public"]["Enums"]["toi_contributor"]
            | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          display_label?: string
          duration_minutes?: number | null
          end_time?: string | null
          event_group?: string
          event_type?: Database["public"]["Enums"]["toi_event_type"]
          id?: string
          is_active?: boolean
          location?: Database["public"]["Enums"]["toi_location"] | null
          notes?: string | null
          start_time?: string
          student_id?: string
          suspected_contributor?:
            | Database["public"]["Enums"]["toi_contributor"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "context_barriers_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_rates: {
        Row: {
          agency_id: string | null
          billing_frequency: string | null
          contract_end_date: string | null
          contract_number: string | null
          contract_start_date: string
          contract_type: string
          created_at: string | null
          created_by: string | null
          id: string
          invoice_due_days: number | null
          notes: string | null
          organization_id: string | null
          organization_name: string
          requires_signature: boolean | null
          services: Json
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          billing_frequency?: string | null
          contract_end_date?: string | null
          contract_number?: string | null
          contract_start_date: string
          contract_type: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_due_days?: number | null
          notes?: string | null
          organization_id?: string | null
          organization_name: string
          requires_signature?: boolean | null
          services?: Json
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          billing_frequency?: string | null
          contract_end_date?: string | null
          contract_number?: string | null
          contract_start_date?: string
          contract_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_due_days?: number | null
          notes?: string | null
          organization_id?: string | null
          organization_name?: string
          requires_signature?: boolean | null
          services?: Json
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_rates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      coverage_checks: {
        Row: {
          client_id: string
          created_at: string
          details: Json | null
          evidence_link: string | null
          follow_up_tasks_created: Json | null
          id: string
          linked_rules_checked: Json | null
          mode_used: string
          performed_by: string | null
          performed_by_type: string | null
          result_status: string
          session_id: string | null
          summary: string | null
          trigger_reason: string
        }
        Insert: {
          client_id: string
          created_at?: string
          details?: Json | null
          evidence_link?: string | null
          follow_up_tasks_created?: Json | null
          id?: string
          linked_rules_checked?: Json | null
          mode_used: string
          performed_by?: string | null
          performed_by_type?: string | null
          result_status: string
          session_id?: string | null
          summary?: string | null
          trigger_reason: string
        }
        Update: {
          client_id?: string
          created_at?: string
          details?: Json | null
          evidence_link?: string | null
          follow_up_tasks_created?: Json | null
          id?: string
          linked_rules_checked?: Json | null
          mode_used?: string
          performed_by?: string | null
          performed_by_type?: string | null
          result_status?: string
          session_id?: string | null
          summary?: string | null
          trigger_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "coverage_checks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      coverage_rules_insurance: {
        Row: {
          client_id: string
          coverage_notes: string | null
          coverage_status: string
          cpt_code: string
          created_at: string
          created_by: string | null
          evidence_attachment_url: string | null
          icd10_codes: Json | null
          id: string
          is_active: boolean | null
          last_verified_at: string | null
          modifiers: Json | null
          next_verification_due_at: string | null
          payer_plan_id: string | null
          place_of_service: Json | null
          provider_credential_required: Json | null
          updated_at: string
          verification_source: string | null
        }
        Insert: {
          client_id: string
          coverage_notes?: string | null
          coverage_status?: string
          cpt_code: string
          created_at?: string
          created_by?: string | null
          evidence_attachment_url?: string | null
          icd10_codes?: Json | null
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          modifiers?: Json | null
          next_verification_due_at?: string | null
          payer_plan_id?: string | null
          place_of_service?: Json | null
          provider_credential_required?: Json | null
          updated_at?: string
          verification_source?: string | null
        }
        Update: {
          client_id?: string
          coverage_notes?: string | null
          coverage_status?: string
          cpt_code?: string
          created_at?: string
          created_by?: string | null
          evidence_attachment_url?: string | null
          icd10_codes?: Json | null
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          modifiers?: Json | null
          next_verification_due_at?: string | null
          payer_plan_id?: string | null
          place_of_service?: Json | null
          provider_credential_required?: Json | null
          updated_at?: string
          verification_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coverage_rules_insurance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coverage_rules_insurance_payer_plan_id_fkey"
            columns: ["payer_plan_id"]
            isOneToOne: false
            referencedRelation: "payer_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      coverage_rules_school: {
        Row: {
          allowed_settings: Json | null
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          last_verified_at: string | null
          next_verification_due_at: string | null
          notes: string | null
          provider_roles_allowed: Json | null
          service_line: string
          source: string
          source_document_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          allowed_settings?: Json | null
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          next_verification_due_at?: string | null
          notes?: string | null
          provider_roles_allowed?: Json | null
          service_line: string
          source: string
          source_document_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          allowed_settings?: Json | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          next_verification_due_at?: string | null
          notes?: string | null
          provider_roles_allowed?: Json | null
          service_line?: string
          source?: string
          source_document_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coverage_rules_school_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      coverage_tasks: {
        Row: {
          assigned_to: string | null
          client_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          due_date: string
          id: string
          linked_coverage_rule_id: string | null
          linked_payer_plan_id: string | null
          linked_session_ids: Json | null
          priority: string | null
          reason: string | null
          resolution_notes: string | null
          status: string | null
          task_type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_date: string
          id?: string
          linked_coverage_rule_id?: string | null
          linked_payer_plan_id?: string | null
          linked_session_ids?: Json | null
          priority?: string | null
          reason?: string | null
          resolution_notes?: string | null
          status?: string | null
          task_type: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_date?: string
          id?: string
          linked_coverage_rule_id?: string | null
          linked_payer_plan_id?: string | null
          linked_session_ids?: Json | null
          priority?: string | null
          reason?: string | null
          resolution_notes?: string | null
          status?: string | null
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coverage_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      criteria_evaluations: {
        Row: {
          criteria_type: string
          evaluated_at: string
          evidence: Json | null
          filters_applied: Json | null
          id: string
          met_at: string | null
          met_status: boolean
          metric_value: number | null
          recommended_action: string | null
          target_id: string
          window_used: Json | null
        }
        Insert: {
          criteria_type: string
          evaluated_at?: string
          evidence?: Json | null
          filters_applied?: Json | null
          id?: string
          met_at?: string | null
          met_status?: boolean
          metric_value?: number | null
          recommended_action?: string | null
          target_id: string
          window_used?: Json | null
        }
        Update: {
          criteria_type?: string
          evaluated_at?: string
          evidence?: Json | null
          filters_applied?: Json | null
          id?: string
          met_at?: string | null
          met_status?: boolean
          metric_value?: number | null
          recommended_action?: string | null
          target_id?: string
          window_used?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "criteria_evaluations_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "goal_data"
            referencedColumns: ["target_id"]
          },
          {
            foreignKeyName: "criteria_evaluations_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "skill_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      criteria_templates: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          criteria_type: string
          id: string
          is_default: boolean
          name: string
          rule_json: Json
          scope: string
          scope_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          criteria_type: string
          id?: string
          is_default?: boolean
          name: string
          rule_json?: Json
          scope: string
          scope_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          criteria_type?: string
          id?: string
          is_default?: boolean
          name?: string
          rule_json?: Json
          scope?: string
          scope_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      curriculum_items: {
        Row: {
          active: boolean
          age_band_max: number | null
          age_band_min: number | null
          agency_id: string | null
          code: string | null
          created_at: string
          curriculum_system_id: string
          description: string | null
          display_order: number | null
          domain_id: string | null
          edit_history: Json | null
          forked_from_id: string | null
          id: string
          keywords: string[] | null
          level: string | null
          mastery_criteria: string | null
          modified_at: string | null
          modified_by: string | null
          prerequisites: string[] | null
          source_reference: string | null
          source_tier: string
          status: string
          teaching_notes: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          age_band_max?: number | null
          age_band_min?: number | null
          agency_id?: string | null
          code?: string | null
          created_at?: string
          curriculum_system_id: string
          description?: string | null
          display_order?: number | null
          domain_id?: string | null
          edit_history?: Json | null
          forked_from_id?: string | null
          id?: string
          keywords?: string[] | null
          level?: string | null
          mastery_criteria?: string | null
          modified_at?: string | null
          modified_by?: string | null
          prerequisites?: string[] | null
          source_reference?: string | null
          source_tier?: string
          status?: string
          teaching_notes?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          age_band_max?: number | null
          age_band_min?: number | null
          agency_id?: string | null
          code?: string | null
          created_at?: string
          curriculum_system_id?: string
          description?: string | null
          display_order?: number | null
          domain_id?: string | null
          edit_history?: Json | null
          forked_from_id?: string | null
          id?: string
          keywords?: string[] | null
          level?: string | null
          mastery_criteria?: string | null
          modified_at?: string | null
          modified_by?: string | null
          prerequisites?: string[] | null
          source_reference?: string | null
          source_tier?: string
          status?: string
          teaching_notes?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_items_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_items_curriculum_system_id_fkey"
            columns: ["curriculum_system_id"]
            isOneToOne: false
            referencedRelation: "curriculum_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_items_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_items_forked_from_id_fkey"
            columns: ["forked_from_id"]
            isOneToOne: false
            referencedRelation: "curriculum_items"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_systems: {
        Row: {
          active: boolean
          age_range_max_months: number | null
          age_range_min_months: number | null
          agency_id: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          forked_from_id: string | null
          id: string
          import_format: string | null
          item_count: number | null
          modified_at: string | null
          modified_by: string | null
          name: string
          publisher: string | null
          source_tier: string
          status: string
          tags: string[] | null
          type: string
          updated_at: string
          version: string | null
        }
        Insert: {
          active?: boolean
          age_range_max_months?: number | null
          age_range_min_months?: number | null
          agency_id?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          forked_from_id?: string | null
          id?: string
          import_format?: string | null
          item_count?: number | null
          modified_at?: string | null
          modified_by?: string | null
          name: string
          publisher?: string | null
          source_tier?: string
          status?: string
          tags?: string[] | null
          type?: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          active?: boolean
          age_range_max_months?: number | null
          age_range_min_months?: number | null
          agency_id?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          forked_from_id?: string | null
          id?: string
          import_format?: string | null
          item_count?: number | null
          modified_at?: string | null
          modified_by?: string | null
          name?: string
          publisher?: string | null
          source_tier?: string
          status?: string
          tags?: string[] | null
          type?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_systems_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_systems_forked_from_id_fkey"
            columns: ["forked_from_id"]
            isOneToOne: false
            referencedRelation: "curriculum_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_form_submissions: {
        Row: {
          access_token: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          form_id: string
          id: string
          respondent_email: string | null
          respondent_name: string | null
          respondent_relationship: string | null
          responses: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          sent_at: string | null
          signature_data: string | null
          signed_at: string | null
          status: string
          student_id: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          form_id: string
          id?: string
          respondent_email?: string | null
          respondent_name?: string | null
          respondent_relationship?: string | null
          responses?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sent_at?: string | null
          signature_data?: string | null
          signed_at?: string | null
          status?: string
          student_id?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          form_id?: string
          id?: string
          respondent_email?: string | null
          respondent_name?: string | null
          respondent_relationship?: string | null
          responses?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sent_at?: string | null
          signature_data?: string | null
          signed_at?: string | null
          status?: string
          student_id?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "custom_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_forms: {
        Row: {
          agency_id: string | null
          auto_populate_fields: Json | null
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          form_schema: Json | null
          id: string
          requires_signature: boolean | null
          status: string
          title: string
          updated_at: string
          version: number | null
        }
        Insert: {
          agency_id?: string | null
          auto_populate_fields?: Json | null
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          form_schema?: Json | null
          id?: string
          requires_signature?: boolean | null
          status?: string
          title: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          agency_id?: string | null
          auto_populate_fields?: Json | null
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          form_schema?: Json | null
          id?: string
          requires_signature?: boolean | null
          status?: string
          title?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_forms_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_role_permissions: {
        Row: {
          created_at: string
          custom_role_id: string
          id: string
          permission_key: string
          permission_value: boolean
        }
        Insert: {
          created_at?: string
          custom_role_id: string
          id?: string
          permission_key: string
          permission_value?: boolean
        }
        Update: {
          created_at?: string
          custom_role_id?: string
          id?: string
          permission_key?: string
          permission_value?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "custom_role_permissions_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          agency_id: string | null
          base_role: Database["public"]["Enums"]["app_role"]
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          base_role?: Database["public"]["Enums"]["app_role"]
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          base_role?: Database["public"]["Enums"]["app_role"]
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
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
      delivered_minutes_log: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_billable: boolean | null
          is_makeup: boolean | null
          location_type: string | null
          makeup_for_date: string | null
          minutes_delivered: number
          provider_credential: string | null
          provider_user_id: string
          service_line: string
          session_date: string
          session_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_billable?: boolean | null
          is_makeup?: boolean | null
          location_type?: string | null
          makeup_for_date?: string | null
          minutes_delivered: number
          provider_credential?: string | null
          provider_user_id: string
          service_line: string
          session_date: string
          session_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_billable?: boolean | null
          is_makeup?: boolean | null
          location_type?: string | null
          makeup_for_date?: string | null
          minutes_delivered?: number
          provider_credential?: string | null
          provider_user_id?: string
          service_line?: string
          session_date?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivered_minutes_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      document_inbox: {
        Row: {
          ai_confidence_score: number | null
          ai_suggested_document_type: string | null
          ai_suggested_student_id: string | null
          assigned_referral_id: string | null
          assigned_student_id: string | null
          created_at: string
          document_type: string | null
          extracted_text: string | null
          file_name: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          raw_content_url: string | null
          received_at: string
          retention_until: string
          sender_info: string | null
          source_type: string
          status: string
          subject_line: string | null
          updated_at: string
        }
        Insert: {
          ai_confidence_score?: number | null
          ai_suggested_document_type?: string | null
          ai_suggested_student_id?: string | null
          assigned_referral_id?: string | null
          assigned_student_id?: string | null
          created_at?: string
          document_type?: string | null
          extracted_text?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          raw_content_url?: string | null
          received_at?: string
          retention_until?: string
          sender_info?: string | null
          source_type: string
          status?: string
          subject_line?: string | null
          updated_at?: string
        }
        Update: {
          ai_confidence_score?: number | null
          ai_suggested_document_type?: string | null
          ai_suggested_student_id?: string | null
          assigned_referral_id?: string | null
          assigned_student_id?: string | null
          created_at?: string
          document_type?: string | null
          extracted_text?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          raw_content_url?: string | null
          received_at?: string
          retention_until?: string
          sender_info?: string | null
          source_type?: string
          status?: string
          subject_line?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_inbox_ai_suggested_student_id_fkey"
            columns: ["ai_suggested_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_inbox_assigned_referral_id_fkey"
            columns: ["assigned_referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_inbox_assigned_student_id_fkey"
            columns: ["assigned_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          agency_id: string | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          modified_at: string | null
          modified_by: string | null
          name: string
          source_tier: string
          status: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          modified_at?: string | null
          modified_by?: string | null
          name: string
          source_tier?: string
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          modified_at?: string | null
          modified_by?: string | null
          name?: string
          source_tier?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "domains_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      eligibility_checks: {
        Row: {
          aba_auth_required: boolean | null
          aba_covered: boolean | null
          aba_dollar_limit: number | null
          aba_dollars_used: number | null
          aba_visit_limit: number | null
          aba_visits_used: number | null
          check_type: string
          client_payer_id: string | null
          coinsurance_percent: number | null
          copay_amount: number | null
          created_at: string
          deductible_remaining: number | null
          deductible_total: number | null
          eligibility_status: string | null
          error_message: string | null
          group_number: string | null
          id: string
          is_eligible: boolean | null
          out_of_pocket_max: number | null
          out_of_pocket_remaining: number | null
          payer_id: string | null
          performed_at: string
          performed_by: string
          plan_name: string | null
          plan_number: string | null
          pverify_request_id: string | null
          pverify_response: Json | null
          service_date: string
          status: string
          student_id: string
        }
        Insert: {
          aba_auth_required?: boolean | null
          aba_covered?: boolean | null
          aba_dollar_limit?: number | null
          aba_dollars_used?: number | null
          aba_visit_limit?: number | null
          aba_visits_used?: number | null
          check_type: string
          client_payer_id?: string | null
          coinsurance_percent?: number | null
          copay_amount?: number | null
          created_at?: string
          deductible_remaining?: number | null
          deductible_total?: number | null
          eligibility_status?: string | null
          error_message?: string | null
          group_number?: string | null
          id?: string
          is_eligible?: boolean | null
          out_of_pocket_max?: number | null
          out_of_pocket_remaining?: number | null
          payer_id?: string | null
          performed_at?: string
          performed_by: string
          plan_name?: string | null
          plan_number?: string | null
          pverify_request_id?: string | null
          pverify_response?: Json | null
          service_date?: string
          status?: string
          student_id: string
        }
        Update: {
          aba_auth_required?: boolean | null
          aba_covered?: boolean | null
          aba_dollar_limit?: number | null
          aba_dollars_used?: number | null
          aba_visit_limit?: number | null
          aba_visits_used?: number | null
          check_type?: string
          client_payer_id?: string | null
          coinsurance_percent?: number | null
          copay_amount?: number | null
          created_at?: string
          deductible_remaining?: number | null
          deductible_total?: number | null
          eligibility_status?: string | null
          error_message?: string | null
          group_number?: string | null
          id?: string
          is_eligible?: boolean | null
          out_of_pocket_max?: number | null
          out_of_pocket_remaining?: number | null
          payer_id?: string | null
          performed_at?: string
          performed_by?: string
          plan_name?: string | null
          plan_number?: string | null
          pverify_request_id?: string | null
          pverify_response?: Json | null
          service_date?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eligibility_checks_client_payer_id_fkey"
            columns: ["client_payer_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eligibility_checks_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eligibility_checks_student_id_fkey"
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
      era_imports: {
        Row: {
          agency_id: string | null
          created_at: string
          file_size: number | null
          filename: string
          id: string
          imported_by: string
          matched_count: number | null
          parse_error: string | null
          parse_status: string
          raw_content: string | null
          total_amount: number | null
          total_remittances: number | null
          unmatched_count: number | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          file_size?: number | null
          filename: string
          id?: string
          imported_by: string
          matched_count?: number | null
          parse_error?: string | null
          parse_status?: string
          raw_content?: string | null
          total_amount?: number | null
          total_remittances?: number | null
          unmatched_count?: number | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          file_size?: number | null
          filename?: string
          id?: string
          imported_by?: string
          matched_count?: number | null
          parse_error?: string | null
          parse_status?: string
          raw_content?: string | null
          total_amount?: number | null
          total_remittances?: number | null
          unmatched_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "era_imports_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      era_line_items: {
        Row: {
          adjustment_amounts: number[] | null
          adjustment_reason_codes: string[] | null
          allowed_amount: number | null
          billed_amount: number | null
          claim_id: string | null
          claim_line_item_id: string | null
          claim_number: string | null
          cpt_code: string | null
          created_at: string
          id: string
          match_confidence: number | null
          match_status: string
          modifiers: string[] | null
          paid_amount: number | null
          patient_id: string | null
          patient_name: string | null
          patient_responsibility: number | null
          posted: boolean | null
          posted_at: string | null
          remark_codes: string[] | null
          remittance_id: string
          service_date_from: string | null
          service_date_to: string | null
        }
        Insert: {
          adjustment_amounts?: number[] | null
          adjustment_reason_codes?: string[] | null
          allowed_amount?: number | null
          billed_amount?: number | null
          claim_id?: string | null
          claim_line_item_id?: string | null
          claim_number?: string | null
          cpt_code?: string | null
          created_at?: string
          id?: string
          match_confidence?: number | null
          match_status?: string
          modifiers?: string[] | null
          paid_amount?: number | null
          patient_id?: string | null
          patient_name?: string | null
          patient_responsibility?: number | null
          posted?: boolean | null
          posted_at?: string | null
          remark_codes?: string[] | null
          remittance_id: string
          service_date_from?: string | null
          service_date_to?: string | null
        }
        Update: {
          adjustment_amounts?: number[] | null
          adjustment_reason_codes?: string[] | null
          allowed_amount?: number | null
          billed_amount?: number | null
          claim_id?: string | null
          claim_line_item_id?: string | null
          claim_number?: string | null
          cpt_code?: string | null
          created_at?: string
          id?: string
          match_confidence?: number | null
          match_status?: string
          modifiers?: string[] | null
          paid_amount?: number | null
          patient_id?: string | null
          patient_name?: string | null
          patient_responsibility?: number | null
          posted?: boolean | null
          posted_at?: string | null
          remark_codes?: string[] | null
          remittance_id?: string
          service_date_from?: string | null
          service_date_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "era_line_items_remittance_id_fkey"
            columns: ["remittance_id"]
            isOneToOne: false
            referencedRelation: "era_remittances"
            referencedColumns: ["id"]
          },
        ]
      }
      era_remittances: {
        Row: {
          adjustment_codes: Json | null
          check_number: string | null
          claim_count: number | null
          claim_id: string | null
          created_at: string
          id: string
          import_id: string | null
          paid_amount: number
          payee_name: string | null
          payee_npi: string | null
          payer_claim_number: string | null
          payer_id_code: string | null
          payer_name: string | null
          payment_date: string | null
          payment_method: string | null
          raw_data: Json | null
          remark_codes: Json | null
          remittance_date: string
          status: string | null
          total_adjustments: number | null
          total_patient_responsibility: number | null
        }
        Insert: {
          adjustment_codes?: Json | null
          check_number?: string | null
          claim_count?: number | null
          claim_id?: string | null
          created_at?: string
          id?: string
          import_id?: string | null
          paid_amount: number
          payee_name?: string | null
          payee_npi?: string | null
          payer_claim_number?: string | null
          payer_id_code?: string | null
          payer_name?: string | null
          payment_date?: string | null
          payment_method?: string | null
          raw_data?: Json | null
          remark_codes?: Json | null
          remittance_date: string
          status?: string | null
          total_adjustments?: number | null
          total_patient_responsibility?: number | null
        }
        Update: {
          adjustment_codes?: Json | null
          check_number?: string | null
          claim_count?: number | null
          claim_id?: string | null
          created_at?: string
          id?: string
          import_id?: string | null
          paid_amount?: number
          payee_name?: string | null
          payee_npi?: string | null
          payer_claim_number?: string | null
          payer_id_code?: string | null
          payer_name?: string | null
          payment_date?: string | null
          payment_method?: string | null
          raw_data?: Json | null
          remark_codes?: Json | null
          remittance_date?: string
          status?: string | null
          total_adjustments?: number | null
          total_patient_responsibility?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "era_remittances_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "billing_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      external_id_map: {
        Row: {
          created_at: string
          data_source_id: string
          external_id: string
          external_type: string
          id: string
          internal_uuid: string
        }
        Insert: {
          created_at?: string
          data_source_id: string
          external_id: string
          external_type: string
          id?: string
          internal_uuid: string
        }
        Update: {
          created_at?: string
          data_source_id?: string
          external_id?: string
          external_type?: string
          id?: string
          internal_uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_id_map_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "agency_data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_audit: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          target_agency_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          target_agency_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          target_agency_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      feature_permissions: {
        Row: {
          activity_tracking: boolean | null
          add_new_client: boolean | null
          add_new_payer: boolean | null
          add_new_staff: boolean | null
          all_clients: boolean | null
          all_staff: boolean | null
          appointment_info: boolean | null
          ar_fix_claims: boolean | null
          ar_manager: boolean | null
          ar_post_payment: boolean | null
          ar_readiness: boolean | null
          ar_rebill: boolean | null
          ar_reports: boolean | null
          billing_billed_files: boolean | null
          billing_financials: boolean | null
          billing_generate_invoice: boolean | null
          billing_payment_source: boolean | null
          billing_provider_identifier: boolean | null
          billing_verification_forms: boolean | null
          cancel_appointment: boolean | null
          client_assignments: boolean | null
          client_authorization: boolean | null
          client_cabinet: boolean | null
          client_contacts: boolean | null
          client_custom_fields: boolean | null
          client_info: boolean | null
          client_list: boolean | null
          client_personal_info: boolean | null
          client_profile: boolean | null
          create_appointment: boolean | null
          created_at: string
          dashboard_active_auths: boolean | null
          dashboard_active_clients: boolean | null
          dashboard_active_staff: boolean | null
          dashboard_aging_report: boolean | null
          dashboard_billing_summary: boolean | null
          dashboard_cancelled_summary: boolean | null
          dashboard_daily_appointments: boolean | null
          dashboard_expiring_quals: boolean | null
          dashboard_incomplete_appts: boolean | null
          dashboard_miles_driven: boolean | null
          dashboard_scheduled_vs_completed: boolean | null
          dashboard_staff_summary: boolean | null
          dashboard_unbilled_appts: boolean | null
          dashboard_weekly_hours: boolean | null
          delete_appointment: boolean | null
          id: string
          manage_clinical_teams: boolean | null
          master_availability: boolean | null
          menu_billing: boolean | null
          menu_client: boolean | null
          menu_forms: boolean | null
          menu_payer: boolean | null
          menu_payroll: boolean | null
          menu_reports: boolean | null
          menu_schedule: boolean | null
          menu_settings: boolean | null
          menu_staff: boolean | null
          my_schedule: boolean | null
          notifications: boolean | null
          other_schedule: boolean | null
          payer_cabinet: boolean | null
          payer_info: boolean | null
          payer_list: boolean | null
          payer_profile: boolean | null
          payer_services: boolean | null
          payroll_financials: boolean | null
          reports_appointment_billing: boolean | null
          reports_appointment_list: boolean | null
          reports_authorization_summary: boolean | null
          reports_billing_ledger: boolean | null
          reports_client_aging: boolean | null
          reports_client_list: boolean | null
          reports_expiring_authorization: boolean | null
          reports_payer_aging: boolean | null
          reports_payer_list: boolean | null
          reports_payroll: boolean | null
          reports_profit_loss: boolean | null
          reports_staff_list: boolean | null
          reports_staff_productivity: boolean | null
          reports_user_login_history: boolean | null
          schedule_billing: boolean | null
          schedule_documents: boolean | null
          schedule_verification: boolean | null
          settings_cancellation_types: boolean | null
          settings_custom_fields: boolean | null
          settings_custom_lists: boolean | null
          settings_organization: boolean | null
          settings_payroll: boolean | null
          settings_qualifications: boolean | null
          settings_security: boolean | null
          settings_services: boolean | null
          settings_subscription: boolean | null
          settings_system: boolean | null
          settings_text_reminders: boolean | null
          staff_cabinet: boolean | null
          staff_custom_fields: boolean | null
          staff_info: boolean | null
          staff_list: boolean | null
          staff_pay_rates: boolean | null
          staff_personal_info: boolean | null
          staff_profile: boolean | null
          staff_qualifications: boolean | null
          staff_supervisor: boolean | null
          teacher_mode_access: boolean | null
          teacher_mode_only: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_tracking?: boolean | null
          add_new_client?: boolean | null
          add_new_payer?: boolean | null
          add_new_staff?: boolean | null
          all_clients?: boolean | null
          all_staff?: boolean | null
          appointment_info?: boolean | null
          ar_fix_claims?: boolean | null
          ar_manager?: boolean | null
          ar_post_payment?: boolean | null
          ar_readiness?: boolean | null
          ar_rebill?: boolean | null
          ar_reports?: boolean | null
          billing_billed_files?: boolean | null
          billing_financials?: boolean | null
          billing_generate_invoice?: boolean | null
          billing_payment_source?: boolean | null
          billing_provider_identifier?: boolean | null
          billing_verification_forms?: boolean | null
          cancel_appointment?: boolean | null
          client_assignments?: boolean | null
          client_authorization?: boolean | null
          client_cabinet?: boolean | null
          client_contacts?: boolean | null
          client_custom_fields?: boolean | null
          client_info?: boolean | null
          client_list?: boolean | null
          client_personal_info?: boolean | null
          client_profile?: boolean | null
          create_appointment?: boolean | null
          created_at?: string
          dashboard_active_auths?: boolean | null
          dashboard_active_clients?: boolean | null
          dashboard_active_staff?: boolean | null
          dashboard_aging_report?: boolean | null
          dashboard_billing_summary?: boolean | null
          dashboard_cancelled_summary?: boolean | null
          dashboard_daily_appointments?: boolean | null
          dashboard_expiring_quals?: boolean | null
          dashboard_incomplete_appts?: boolean | null
          dashboard_miles_driven?: boolean | null
          dashboard_scheduled_vs_completed?: boolean | null
          dashboard_staff_summary?: boolean | null
          dashboard_unbilled_appts?: boolean | null
          dashboard_weekly_hours?: boolean | null
          delete_appointment?: boolean | null
          id?: string
          manage_clinical_teams?: boolean | null
          master_availability?: boolean | null
          menu_billing?: boolean | null
          menu_client?: boolean | null
          menu_forms?: boolean | null
          menu_payer?: boolean | null
          menu_payroll?: boolean | null
          menu_reports?: boolean | null
          menu_schedule?: boolean | null
          menu_settings?: boolean | null
          menu_staff?: boolean | null
          my_schedule?: boolean | null
          notifications?: boolean | null
          other_schedule?: boolean | null
          payer_cabinet?: boolean | null
          payer_info?: boolean | null
          payer_list?: boolean | null
          payer_profile?: boolean | null
          payer_services?: boolean | null
          payroll_financials?: boolean | null
          reports_appointment_billing?: boolean | null
          reports_appointment_list?: boolean | null
          reports_authorization_summary?: boolean | null
          reports_billing_ledger?: boolean | null
          reports_client_aging?: boolean | null
          reports_client_list?: boolean | null
          reports_expiring_authorization?: boolean | null
          reports_payer_aging?: boolean | null
          reports_payer_list?: boolean | null
          reports_payroll?: boolean | null
          reports_profit_loss?: boolean | null
          reports_staff_list?: boolean | null
          reports_staff_productivity?: boolean | null
          reports_user_login_history?: boolean | null
          schedule_billing?: boolean | null
          schedule_documents?: boolean | null
          schedule_verification?: boolean | null
          settings_cancellation_types?: boolean | null
          settings_custom_fields?: boolean | null
          settings_custom_lists?: boolean | null
          settings_organization?: boolean | null
          settings_payroll?: boolean | null
          settings_qualifications?: boolean | null
          settings_security?: boolean | null
          settings_services?: boolean | null
          settings_subscription?: boolean | null
          settings_system?: boolean | null
          settings_text_reminders?: boolean | null
          staff_cabinet?: boolean | null
          staff_custom_fields?: boolean | null
          staff_info?: boolean | null
          staff_list?: boolean | null
          staff_pay_rates?: boolean | null
          staff_personal_info?: boolean | null
          staff_profile?: boolean | null
          staff_qualifications?: boolean | null
          staff_supervisor?: boolean | null
          teacher_mode_access?: boolean | null
          teacher_mode_only?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_tracking?: boolean | null
          add_new_client?: boolean | null
          add_new_payer?: boolean | null
          add_new_staff?: boolean | null
          all_clients?: boolean | null
          all_staff?: boolean | null
          appointment_info?: boolean | null
          ar_fix_claims?: boolean | null
          ar_manager?: boolean | null
          ar_post_payment?: boolean | null
          ar_readiness?: boolean | null
          ar_rebill?: boolean | null
          ar_reports?: boolean | null
          billing_billed_files?: boolean | null
          billing_financials?: boolean | null
          billing_generate_invoice?: boolean | null
          billing_payment_source?: boolean | null
          billing_provider_identifier?: boolean | null
          billing_verification_forms?: boolean | null
          cancel_appointment?: boolean | null
          client_assignments?: boolean | null
          client_authorization?: boolean | null
          client_cabinet?: boolean | null
          client_contacts?: boolean | null
          client_custom_fields?: boolean | null
          client_info?: boolean | null
          client_list?: boolean | null
          client_personal_info?: boolean | null
          client_profile?: boolean | null
          create_appointment?: boolean | null
          created_at?: string
          dashboard_active_auths?: boolean | null
          dashboard_active_clients?: boolean | null
          dashboard_active_staff?: boolean | null
          dashboard_aging_report?: boolean | null
          dashboard_billing_summary?: boolean | null
          dashboard_cancelled_summary?: boolean | null
          dashboard_daily_appointments?: boolean | null
          dashboard_expiring_quals?: boolean | null
          dashboard_incomplete_appts?: boolean | null
          dashboard_miles_driven?: boolean | null
          dashboard_scheduled_vs_completed?: boolean | null
          dashboard_staff_summary?: boolean | null
          dashboard_unbilled_appts?: boolean | null
          dashboard_weekly_hours?: boolean | null
          delete_appointment?: boolean | null
          id?: string
          manage_clinical_teams?: boolean | null
          master_availability?: boolean | null
          menu_billing?: boolean | null
          menu_client?: boolean | null
          menu_forms?: boolean | null
          menu_payer?: boolean | null
          menu_payroll?: boolean | null
          menu_reports?: boolean | null
          menu_schedule?: boolean | null
          menu_settings?: boolean | null
          menu_staff?: boolean | null
          my_schedule?: boolean | null
          notifications?: boolean | null
          other_schedule?: boolean | null
          payer_cabinet?: boolean | null
          payer_info?: boolean | null
          payer_list?: boolean | null
          payer_profile?: boolean | null
          payer_services?: boolean | null
          payroll_financials?: boolean | null
          reports_appointment_billing?: boolean | null
          reports_appointment_list?: boolean | null
          reports_authorization_summary?: boolean | null
          reports_billing_ledger?: boolean | null
          reports_client_aging?: boolean | null
          reports_client_list?: boolean | null
          reports_expiring_authorization?: boolean | null
          reports_payer_aging?: boolean | null
          reports_payer_list?: boolean | null
          reports_payroll?: boolean | null
          reports_profit_loss?: boolean | null
          reports_staff_list?: boolean | null
          reports_staff_productivity?: boolean | null
          reports_user_login_history?: boolean | null
          schedule_billing?: boolean | null
          schedule_documents?: boolean | null
          schedule_verification?: boolean | null
          settings_cancellation_types?: boolean | null
          settings_custom_fields?: boolean | null
          settings_custom_lists?: boolean | null
          settings_organization?: boolean | null
          settings_payroll?: boolean | null
          settings_qualifications?: boolean | null
          settings_security?: boolean | null
          settings_services?: boolean | null
          settings_subscription?: boolean | null
          settings_system?: boolean | null
          settings_text_reminders?: boolean | null
          staff_cabinet?: boolean | null
          staff_custom_fields?: boolean | null
          staff_info?: boolean | null
          staff_list?: boolean | null
          staff_pay_rates?: boolean | null
          staff_personal_info?: boolean | null
          staff_profile?: boolean | null
          staff_qualifications?: boolean | null
          staff_supervisor?: boolean | null
          teacher_mode_access?: boolean | null
          teacher_mode_only?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fidelity_check_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          intervention_id: string | null
          is_active: boolean | null
          items: Json
          name: string
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          intervention_id?: string | null
          is_active?: boolean | null
          items?: Json
          name: string
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          intervention_id?: string | null
          is_active?: boolean | null
          items?: Json
          name?: string
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fidelity_check_templates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fieldwork_hours: {
        Row: {
          created_at: string
          experience_type: string
          fieldwork_date: string
          hours: number
          hours_type: string
          id: string
          notes: string | null
          supervisor_user_id: string
          task_list_items: Json | null
          trainee_user_id: string
          updated_at: string
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          experience_type?: string
          fieldwork_date?: string
          hours: number
          hours_type?: string
          id?: string
          notes?: string | null
          supervisor_user_id: string
          task_list_items?: Json | null
          trainee_user_id: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          experience_type?: string
          fieldwork_date?: string
          hours?: number
          hours_type?: string
          id?: string
          notes?: string | null
          supervisor_user_id?: string
          task_list_items?: Json | null
          trainee_user_id?: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: []
      }
      generated_reports: {
        Row: {
          branding_id: string | null
          content: Json | null
          date_range_end: string | null
          date_range_start: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          is_public: boolean | null
          pdf_url: string | null
          public_token: string | null
          report_type: string
          shared_with: Json | null
          student_id: string | null
        }
        Insert: {
          branding_id?: string | null
          content?: Json | null
          date_range_end?: string | null
          date_range_start?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          is_public?: boolean | null
          pdf_url?: string | null
          public_token?: string | null
          report_type: string
          shared_with?: Json | null
          student_id?: string | null
        }
        Update: {
          branding_id?: string | null
          content?: Json | null
          date_range_end?: string | null
          date_range_start?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          is_public?: boolean | null
          pdf_url?: string | null
          public_token?: string | null
          report_type?: string
          shared_with?: Json | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_branding_id_fkey"
            columns: ["branding_id"]
            isOneToOne: false
            referencedRelation: "report_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_links: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          link_notes: string | null
          link_type: string
          linked_object_id: string
          linked_object_table: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          link_notes?: string | null
          link_type: string
          linked_object_id: string
          linked_object_table: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          link_notes?: string | null
          link_type?: string
          linked_object_id?: string
          linked_object_table?: string
          updated_at?: string
        }
        Relationships: []
      }
      graph_annotations: {
        Row: {
          annotation_type: string
          behavior_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          end_value: number | null
          id: string
          label_text: string | null
          position_date: string | null
          position_value: number | null
          student_id: string
          style: Json | null
          target_id: string | null
          updated_at: string
        }
        Insert: {
          annotation_type: string
          behavior_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          end_value?: number | null
          id?: string
          label_text?: string | null
          position_date?: string | null
          position_value?: number | null
          student_id: string
          style?: Json | null
          target_id?: string | null
          updated_at?: string
        }
        Update: {
          annotation_type?: string
          behavior_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          end_value?: number | null
          id?: string
          label_text?: string | null
          position_date?: string | null
          position_value?: number | null
          student_id?: string
          style?: Json | null
          target_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      graph_configurations: {
        Row: {
          annotation_ids: string[] | null
          chart_type: string
          created_at: string
          created_by: string | null
          data_sources: Json | null
          date_range_end: string | null
          date_range_start: string | null
          display_options: Json | null
          id: string
          is_default: boolean | null
          name: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          annotation_ids?: string[] | null
          chart_type?: string
          created_at?: string
          created_by?: string | null
          data_sources?: Json | null
          date_range_end?: string | null
          date_range_start?: string | null
          display_options?: Json | null
          id?: string
          is_default?: boolean | null
          name: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          annotation_ids?: string[] | null
          chart_type?: string
          created_at?: string
          created_by?: string | null
          data_sources?: Json | null
          date_range_end?: string | null
          date_range_start?: string | null
          display_options?: Json | null
          id?: string
          is_default?: boolean | null
          name?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      iep_goals: {
        Row: {
          baseline_summary: string | null
          client_id: string
          created_at: string
          data_completeness_status: string | null
          end_date: string | null
          goal_area: string
          goal_text: string
          id: string
          last_progress_update: string | null
          measurement_type: string
          narrative_summary: string | null
          responsible_provider_role: string | null
          short_description: string | null
          start_date: string | null
          status: string | null
          target_criteria: string | null
          updated_at: string
        }
        Insert: {
          baseline_summary?: string | null
          client_id: string
          created_at?: string
          data_completeness_status?: string | null
          end_date?: string | null
          goal_area: string
          goal_text: string
          id?: string
          last_progress_update?: string | null
          measurement_type: string
          narrative_summary?: string | null
          responsible_provider_role?: string | null
          short_description?: string | null
          start_date?: string | null
          status?: string | null
          target_criteria?: string | null
          updated_at?: string
        }
        Update: {
          baseline_summary?: string | null
          client_id?: string
          created_at?: string
          data_completeness_status?: string | null
          end_date?: string | null
          goal_area?: string
          goal_text?: string
          id?: string
          last_progress_update?: string | null
          measurement_type?: string
          narrative_summary?: string | null
          responsible_provider_role?: string | null
          short_description?: string | null
          start_date?: string | null
          status?: string | null
          target_criteria?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iep_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      iep_library_items: {
        Row: {
          acceptance_rate: number | null
          agency_id: string | null
          contraindications: string[] | null
          created_at: string
          created_by: string | null
          description: string
          disability_tags: string[]
          domains: string[]
          evidence_notes: string | null
          export_language: Json | null
          grade_band: string[]
          id: string
          idea_compliance_level: string | null
          implementation_notes: Json | null
          item_type: string
          setting_tags: string[]
          source_doc: string | null
          source_origin: string | null
          source_page: number | null
          source_reference: string[] | null
          status: string
          title: string
          topics: string[] | null
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          acceptance_rate?: number | null
          agency_id?: string | null
          contraindications?: string[] | null
          created_at?: string
          created_by?: string | null
          description: string
          disability_tags?: string[]
          domains?: string[]
          evidence_notes?: string | null
          export_language?: Json | null
          grade_band?: string[]
          id?: string
          idea_compliance_level?: string | null
          implementation_notes?: Json | null
          item_type: string
          setting_tags?: string[]
          source_doc?: string | null
          source_origin?: string | null
          source_page?: number | null
          source_reference?: string[] | null
          status?: string
          title: string
          topics?: string[] | null
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          acceptance_rate?: number | null
          agency_id?: string | null
          contraindications?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string
          disability_tags?: string[]
          domains?: string[]
          evidence_notes?: string | null
          export_language?: Json | null
          grade_band?: string[]
          id?: string
          idea_compliance_level?: string | null
          implementation_notes?: Json | null
          item_type?: string
          setting_tags?: string[]
          source_doc?: string | null
          source_origin?: string | null
          source_page?: number | null
          source_reference?: string[] | null
          status?: string
          title?: string
          topics?: string[] | null
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "iep_library_items_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      iep_meeting_preps: {
        Row: {
          attendees: Json | null
          created_at: string | null
          created_by: string | null
          data_summary: Json | null
          documents_checklist: Json | null
          generated_report_url: string | null
          goal_progress: Json | null
          id: string
          meeting_date: string
          meeting_type: string
          recommendations: Json | null
          status: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          attendees?: Json | null
          created_at?: string | null
          created_by?: string | null
          data_summary?: Json | null
          documents_checklist?: Json | null
          generated_report_url?: string | null
          goal_progress?: Json | null
          id?: string
          meeting_date: string
          meeting_type?: string
          recommendations?: Json | null
          status?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          attendees?: Json | null
          created_at?: string | null
          created_by?: string | null
          data_summary?: Json | null
          documents_checklist?: Json | null
          generated_report_url?: string | null
          goal_progress?: Json | null
          id?: string
          meeting_date?: string
          meeting_type?: string
          recommendations?: Json | null
          status?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "iep_meeting_preps_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      iep_recommendation_logs: {
        Row: {
          actioned_at: string | null
          actioned_by: string | null
          confidence: number | null
          created_at: string
          id: string
          library_item_id: string
          recommended_reason: string | null
          student_id: string
          student_profile_snapshot: Json | null
          user_action: string | null
        }
        Insert: {
          actioned_at?: string | null
          actioned_by?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          library_item_id: string
          recommended_reason?: string | null
          student_id: string
          student_profile_snapshot?: Json | null
          user_action?: string | null
        }
        Update: {
          actioned_at?: string | null
          actioned_by?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          library_item_id?: string
          recommended_reason?: string | null
          student_id?: string
          student_profile_snapshot?: Json | null
          user_action?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "iep_recommendation_logs_library_item_id_fkey"
            columns: ["library_item_id"]
            isOneToOne: false
            referencedRelation: "iep_library_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iep_recommendation_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_jobs: {
        Row: {
          created_at: string
          data_source_id: string
          ended_at: string | null
          error_json: Json | null
          id: string
          started_at: string | null
          stats_json: Json | null
          status: string
        }
        Insert: {
          created_at?: string
          data_source_id: string
          ended_at?: string | null
          error_json?: Json | null
          id?: string
          started_at?: string | null
          stats_json?: Json | null
          status?: string
        }
        Update: {
          created_at?: string
          data_source_id?: string
          ended_at?: string | null
          error_json?: Json | null
          id?: string
          started_at?: string | null
          stats_json?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_jobs_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "agency_data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_checklist_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          funding_source: string | null
          id: string
          is_active: boolean
          items: Json
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          funding_source?: string | null
          id?: string
          is_active?: boolean
          items?: Json
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          funding_source?: string | null
          id?: string
          is_active?: boolean
          items?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      intake_checklists: {
        Row: {
          checklist_template_id: string | null
          completed_items: Json | null
          created_at: string
          due_date: string | null
          id: string
          items: Json
          referral_id: string
          status: string
          updated_at: string
        }
        Insert: {
          checklist_template_id?: string | null
          completed_items?: Json | null
          created_at?: string
          due_date?: string | null
          id?: string
          items?: Json
          referral_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          checklist_template_id?: string | null
          completed_items?: Json | null
          created_at?: string
          due_date?: string | null
          id?: string
          items?: Json
          referral_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_checklists_checklist_template_id_fkey"
            columns: ["checklist_template_id"]
            isOneToOne: false
            referencedRelation: "intake_checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_checklists_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_documents: {
        Row: {
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          referral_id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          referral_id: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          referral_id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_documents_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applicants: {
        Row: {
          agency_id: string | null
          cover_letter: string | null
          created_at: string
          email: string
          first_name: string
          hire_date: string | null
          id: string
          interview_date: string | null
          job_posting_id: string | null
          last_name: string
          notes: string | null
          offer_date: string | null
          phone: string | null
          pipeline_status: string
          rating: number | null
          resume_url: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          cover_letter?: string | null
          created_at?: string
          email: string
          first_name: string
          hire_date?: string | null
          id?: string
          interview_date?: string | null
          job_posting_id?: string | null
          last_name: string
          notes?: string | null
          offer_date?: string | null
          phone?: string | null
          pipeline_status?: string
          rating?: number | null
          resume_url?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          cover_letter?: string | null
          created_at?: string
          email?: string
          first_name?: string
          hire_date?: string | null
          id?: string
          interview_date?: string | null
          job_posting_id?: string | null
          last_name?: string
          notes?: string | null
          offer_date?: string | null
          phone?: string | null
          pipeline_status?: string
          rating?: number | null
          resume_url?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applicants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applicants_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          agency_id: string | null
          closing_date: string | null
          created_at: string
          created_by: string
          credential_required: string | null
          description: string | null
          employment_type: string | null
          id: string
          location: string | null
          posted_date: string | null
          requirements: string | null
          salary_range_max: number | null
          salary_range_min: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          closing_date?: string | null
          created_at?: string
          created_by: string
          credential_required?: string | null
          description?: string | null
          employment_type?: string | null
          id?: string
          location?: string | null
          posted_date?: string | null
          requirements?: string | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          closing_date?: string | null
          created_at?: string
          created_by?: string
          credential_required?: string | null
          description?: string | null
          employment_type?: string | null
          id?: string
          location?: string | null
          posted_date?: string | null
          requirements?: string | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_assignments: {
        Row: {
          assigned_at: string
          completed_at: string | null
          created_at: string
          id: string
          module_id: string
          related_client_id: string | null
          source_alert_id: string | null
          source_trigger: string | null
          status: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id: string
          related_client_id?: string | null
          source_alert_id?: string | null
          source_trigger?: string | null
          status?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id?: string
          related_client_id?: string | null
          source_alert_id?: string | null
          source_trigger?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_assignments_source_alert_id_fkey"
            columns: ["source_alert_id"]
            isOneToOne: false
            referencedRelation: "ci_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_assignments: {
        Row: {
          agency_id: string | null
          applicant_id: string | null
          created_at: string
          end_date: string | null
          id: string
          mentor_user_id: string
          new_hire_user_id: string | null
          notes: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          applicant_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          mentor_user_id: string
          new_hire_user_id?: string | null
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          applicant_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          mentor_user_id?: string
          new_hire_user_id?: string | null
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_assignments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_assignments_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "job_applicants"
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
      observation_requests: {
        Row: {
          access_token: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          instructions: string | null
          opened_at: string | null
          recipient_email: string
          recipient_name: string
          recipient_role: string | null
          request_type: string
          response_data: Json | null
          sent_at: string | null
          status: string | null
          student_id: string
          target_behaviors: string[] | null
        }
        Insert: {
          access_token?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          instructions?: string | null
          opened_at?: string | null
          recipient_email: string
          recipient_name: string
          recipient_role?: string | null
          request_type?: string
          response_data?: Json | null
          sent_at?: string | null
          status?: string | null
          student_id: string
          target_behaviors?: string[] | null
        }
        Update: {
          access_token?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          instructions?: string | null
          opened_at?: string | null
          recipient_email?: string
          recipient_name?: string
          recipient_role?: string | null
          request_type?: string
          response_data?: Json | null
          sent_at?: string | null
          status?: string | null
          student_id?: string
          target_behaviors?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "observation_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tasks: {
        Row: {
          applicant_id: string | null
          assigned_to: string | null
          category: string
          completed_date: string | null
          created_at: string
          description: string | null
          document_url: string | null
          due_date: string | null
          id: string
          new_hire_user_id: string | null
          status: string
          task_name: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          applicant_id?: string | null
          assigned_to?: string | null
          category?: string
          completed_date?: string | null
          created_at?: string
          description?: string | null
          document_url?: string | null
          due_date?: string | null
          id?: string
          new_hire_user_id?: string | null
          status?: string
          task_name: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          applicant_id?: string | null
          assigned_to?: string | null
          category?: string
          completed_date?: string | null
          created_at?: string
          description?: string | null
          document_url?: string | null
          due_date?: string | null
          id?: string
          new_hire_user_id?: string | null
          status?: string
          task_name?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tasks_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "job_applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          agency_id: string | null
          created_at: string
          created_by: string | null
          estimated_days: number | null
          id: string
          items: Json | null
          name: string
          role_type: string
          status: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          estimated_days?: number | null
          id?: string
          items?: Json | null
          name: string
          role_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          estimated_days?: number | null
          id?: string
          items?: Json | null
          name?: string
          role_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      org_coverage_settings: {
        Row: {
          auto_create_tasks_on_auth_renewal: boolean | null
          auto_create_tasks_on_code_change: boolean | null
          auto_create_tasks_on_intake: boolean | null
          auto_create_tasks_on_plan_renewal: boolean | null
          coverage_mode: string
          created_at: string
          default_verification_cadence_days: number | null
          id: string
          updated_at: string
        }
        Insert: {
          auto_create_tasks_on_auth_renewal?: boolean | null
          auto_create_tasks_on_code_change?: boolean | null
          auto_create_tasks_on_intake?: boolean | null
          auto_create_tasks_on_plan_renewal?: boolean | null
          coverage_mode?: string
          created_at?: string
          default_verification_cadence_days?: number | null
          id?: string
          updated_at?: string
        }
        Update: {
          auto_create_tasks_on_auth_renewal?: boolean | null
          auto_create_tasks_on_code_change?: boolean | null
          auto_create_tasks_on_intake?: boolean | null
          auto_create_tasks_on_plan_renewal?: boolean | null
          coverage_mode?: string
          created_at?: string
          default_verification_cadence_days?: number | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_goal_templates: {
        Row: {
          active: boolean
          agency_id: string | null
          created_at: string
          created_by: string | null
          data_collection_type: string | null
          description: string | null
          domain_id: string | null
          edit_history: Json | null
          forked_from_id: string | null
          generalization_notes: string | null
          id: string
          mastery_criteria: string | null
          modified_at: string | null
          modified_by: string | null
          prompting_notes: string | null
          source_tier: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          data_collection_type?: string | null
          description?: string | null
          domain_id?: string | null
          edit_history?: Json | null
          forked_from_id?: string | null
          generalization_notes?: string | null
          id?: string
          mastery_criteria?: string | null
          modified_at?: string | null
          modified_by?: string | null
          prompting_notes?: string | null
          source_tier?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          data_collection_type?: string | null
          description?: string | null
          domain_id?: string | null
          edit_history?: Json | null
          forked_from_id?: string | null
          generalization_notes?: string | null
          id?: string
          mastery_criteria?: string | null
          modified_at?: string | null
          modified_by?: string | null
          prompting_notes?: string | null
          source_tier?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_goal_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_goal_templates_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_goal_templates_forked_from_id_fkey"
            columns: ["forked_from_id"]
            isOneToOne: false
            referencedRelation: "org_goal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      override_logs: {
        Row: {
          affected_object_ids: Json
          affected_object_type: string
          created_at: string
          id: string
          original_constraint: Json | null
          overridden_by: string
          override_context: Json | null
          override_type: string
          reason: string
        }
        Insert: {
          affected_object_ids?: Json
          affected_object_type: string
          created_at?: string
          id?: string
          original_constraint?: Json | null
          overridden_by: string
          override_context?: Json | null
          override_type: string
          reason: string
        }
        Update: {
          affected_object_ids?: Json
          affected_object_type?: string
          created_at?: string
          id?: string
          original_constraint?: Json | null
          overridden_by?: string
          override_context?: Json | null
          override_type?: string
          reason?: string
        }
        Relationships: []
      }
      payer_auth_rules: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          if_conditions: Json
          payer_id: string
          rule_name: string
          then_actions: Json
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          if_conditions?: Json
          payer_id: string
          rule_name: string
          then_actions?: Json
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          if_conditions?: Json
          payer_id?: string
          rule_name?: string
          then_actions?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payer_auth_rules_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
      payer_directory: {
        Row: {
          active: boolean | null
          aliases: string[] | null
          created_at: string | null
          eligibility_supported: boolean | null
          id: string
          payer_id: string
          payer_name: string
          source: Json
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          aliases?: string[] | null
          created_at?: string | null
          eligibility_supported?: boolean | null
          id?: string
          payer_id: string
          payer_name: string
          source?: Json
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          aliases?: string[] | null
          created_at?: string | null
          eligibility_supported?: boolean | null
          id?: string
          payer_id?: string
          payer_name?: string
          source?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      payer_plans: {
        Row: {
          client_id: string
          created_at: string
          effective_end_date: string | null
          effective_start_date: string
          group_number: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          member_id: string | null
          notes: string | null
          notes_visibility: string | null
          payer_name: string
          plan_name: string | null
          plan_renewal_date: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          effective_end_date?: string | null
          effective_start_date: string
          group_number?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          member_id?: string | null
          notes?: string | null
          notes_visibility?: string | null
          payer_name: string
          plan_name?: string | null
          plan_renewal_date?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          effective_end_date?: string | null
          effective_start_date?: string
          group_number?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          member_id?: string | null
          notes?: string | null
          notes_visibility?: string | null
          payer_name?: string
          plan_name?: string | null
          plan_renewal_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payer_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payer_report_templates: {
        Row: {
          agency_id: string | null
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          payer_ids: string[] | null
          payer_names: string[] | null
          report_type: string
          sections: Json
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          payer_ids?: string[] | null
          payer_names?: string[] | null
          report_type: string
          sections?: Json
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          payer_ids?: string[] | null
          payer_names?: string[] | null
          report_type?: string
          sections?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payer_report_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      payer_services: {
        Row: {
          agency_id: string | null
          auth: Json
          cms1500_defaults: Json
          cpt_hcpcs_code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          modifiers: Json
          payer_id: string
          rate: Json
          service_category: string | null
          service_name: string
          sort_order: number | null
          status: string | null
          units: Json
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          auth?: Json
          cms1500_defaults?: Json
          cpt_hcpcs_code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          modifiers?: Json
          payer_id: string
          rate?: Json
          service_category?: string | null
          service_name: string
          sort_order?: number | null
          status?: string | null
          units?: Json
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          auth?: Json
          cms1500_defaults?: Json
          cpt_hcpcs_code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          modifiers?: Json
          payer_id?: string
          rate?: Json
          service_category?: string | null
          service_name?: string
          sort_order?: number | null
          status?: string | null
          units?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payer_services_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payer_services_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
      payers: {
        Row: {
          address: string | null
          agency_id: string | null
          billing_notes: string | null
          claims_submission_method: string | null
          contact: Json | null
          created_at: string
          directory_link: Json | null
          directory_payer_id: string | null
          eligibility: Json | null
          email: string | null
          fax: string | null
          id: string
          is_active: boolean | null
          name: string
          payer_id: string | null
          payer_type: string | null
          phone: string | null
          timely_filing_days: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          agency_id?: string | null
          billing_notes?: string | null
          claims_submission_method?: string | null
          contact?: Json | null
          created_at?: string
          directory_link?: Json | null
          directory_payer_id?: string | null
          eligibility?: Json | null
          email?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          payer_id?: string | null
          payer_type?: string | null
          phone?: string | null
          timely_filing_days?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          agency_id?: string | null
          billing_notes?: string | null
          claims_submission_method?: string | null
          contact?: Json | null
          created_at?: string
          directory_link?: Json | null
          directory_payer_id?: string | null
          eligibility?: Json | null
          email?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          payer_id?: string | null
          payer_type?: string | null
          phone?: string | null
          timely_filing_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payers_directory_payer_id_fkey"
            columns: ["directory_payer_id"]
            isOneToOne: false
            referencedRelation: "payer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plans: {
        Row: {
          auto_charge: boolean | null
          completed_installments: number | null
          created_at: string
          created_by: string
          frequency: string
          id: string
          installment_amount: number
          next_payment_date: string | null
          notes: string | null
          original_claim_ids: string[] | null
          start_date: string
          status: string
          stored_payment_method_id: string | null
          student_id: string
          total_amount: number
          total_installments: number
          updated_at: string
        }
        Insert: {
          auto_charge?: boolean | null
          completed_installments?: number | null
          created_at?: string
          created_by: string
          frequency: string
          id?: string
          installment_amount: number
          next_payment_date?: string | null
          notes?: string | null
          original_claim_ids?: string[] | null
          start_date: string
          status?: string
          stored_payment_method_id?: string | null
          student_id: string
          total_amount: number
          total_installments: number
          updated_at?: string
        }
        Update: {
          auto_charge?: boolean | null
          completed_installments?: number | null
          created_at?: string
          created_by?: string
          frequency?: string
          id?: string
          installment_amount?: number
          next_payment_date?: string | null
          notes?: string | null
          original_claim_ids?: string[] | null
          start_date?: string
          status?: string
          stored_payment_method_id?: string | null
          student_id?: string
          total_amount?: number
          total_installments?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_plans_stored_payment_method_id_fkey"
            columns: ["stored_payment_method_id"]
            isOneToOne: false
            referencedRelation: "stored_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_exports: {
        Row: {
          agency_id: string | null
          created_at: string
          export_format: string
          exported_by: string
          file_url: string | null
          id: string
          pay_period_end: string
          pay_period_start: string
          staff_count: number | null
          total_amount: number | null
          total_hours: number | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          export_format: string
          exported_by: string
          file_url?: string | null
          id?: string
          pay_period_end: string
          pay_period_start: string
          staff_count?: number | null
          total_amount?: number | null
          total_hours?: number | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          export_format?: string
          exported_by?: string
          file_url?: string | null
          id?: string
          pay_period_end?: string
          pay_period_start?: string
          staff_count?: number | null
          total_amount?: number | null
          total_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_exports_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
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
      prior_auth_requests: {
        Row: {
          ai_generated_justification: string | null
          appeal_deadline: string | null
          approved_units: number | null
          authorization_id: string | null
          clinical_summary: string | null
          created_at: string
          created_by: string
          decision: string | null
          decision_date: string | null
          denial_reason: string | null
          diagnosis_codes: string[] | null
          id: string
          medical_necessity: string | null
          payer_id: string | null
          payer_reference_number: string | null
          request_type: string
          service_codes: string[]
          service_end_date: string
          service_start_date: string
          status: string
          student_id: string
          submission_method: string | null
          submitted_at: string | null
          submitted_by: string | null
          supporting_documentation: Json | null
          treatment_goals: string[] | null
          units_requested: number
          updated_at: string
        }
        Insert: {
          ai_generated_justification?: string | null
          appeal_deadline?: string | null
          approved_units?: number | null
          authorization_id?: string | null
          clinical_summary?: string | null
          created_at?: string
          created_by: string
          decision?: string | null
          decision_date?: string | null
          denial_reason?: string | null
          diagnosis_codes?: string[] | null
          id?: string
          medical_necessity?: string | null
          payer_id?: string | null
          payer_reference_number?: string | null
          request_type: string
          service_codes: string[]
          service_end_date: string
          service_start_date: string
          status?: string
          student_id: string
          submission_method?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          supporting_documentation?: Json | null
          treatment_goals?: string[] | null
          units_requested: number
          updated_at?: string
        }
        Update: {
          ai_generated_justification?: string | null
          appeal_deadline?: string | null
          approved_units?: number | null
          authorization_id?: string | null
          clinical_summary?: string | null
          created_at?: string
          created_by?: string
          decision?: string | null
          decision_date?: string | null
          denial_reason?: string | null
          diagnosis_codes?: string[] | null
          id?: string
          medical_necessity?: string | null
          payer_id?: string | null
          payer_reference_number?: string | null
          request_type?: string
          service_codes?: string[]
          service_end_date?: string
          service_start_date?: string
          status?: string
          student_id?: string
          submission_method?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          supporting_documentation?: Json | null
          treatment_goals?: string[] | null
          units_requested?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prior_auth_requests_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "authorizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prior_auth_requests_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prior_auth_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          allowed_service_types: Json | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string
          credential: string | null
          date_of_birth: string | null
          display_name: string | null
          email: string | null
          employment_status: string | null
          first_name: string | null
          geocode_lat: number | null
          geocode_lng: number | null
          geocode_status: string | null
          hire_date: string | null
          home_base_address: string | null
          home_base_city: string | null
          home_base_state: string | null
          home_base_zip: string | null
          id: string
          is_approved: boolean | null
          languages_spoken: Json | null
          last_name: string | null
          max_travel_radius_miles: number | null
          min_buffer_minutes: number | null
          npi: string | null
          phone: string | null
          pin_hash: string | null
          preferred_regions: Json | null
          primary_agency_id: string | null
          push_enabled: boolean | null
          push_preferences: Json | null
          secondary_email: string | null
          secondary_phone: string | null
          session_length_preferences: Json | null
          settings_willing_to_serve: Json | null
          staff_id: string | null
          staff_notes: string | null
          staff_notes_visibility: string | null
          status: string | null
          supervisor_id: string | null
          timezone: string | null
          title: string | null
          transportation_method: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          allowed_service_types?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          credential?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          employment_status?: string | null
          first_name?: string | null
          geocode_lat?: number | null
          geocode_lng?: number | null
          geocode_status?: string | null
          hire_date?: string | null
          home_base_address?: string | null
          home_base_city?: string | null
          home_base_state?: string | null
          home_base_zip?: string | null
          id?: string
          is_approved?: boolean | null
          languages_spoken?: Json | null
          last_name?: string | null
          max_travel_radius_miles?: number | null
          min_buffer_minutes?: number | null
          npi?: string | null
          phone?: string | null
          pin_hash?: string | null
          preferred_regions?: Json | null
          primary_agency_id?: string | null
          push_enabled?: boolean | null
          push_preferences?: Json | null
          secondary_email?: string | null
          secondary_phone?: string | null
          session_length_preferences?: Json | null
          settings_willing_to_serve?: Json | null
          staff_id?: string | null
          staff_notes?: string | null
          staff_notes_visibility?: string | null
          status?: string | null
          supervisor_id?: string | null
          timezone?: string | null
          title?: string | null
          transportation_method?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          allowed_service_types?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          credential?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          employment_status?: string | null
          first_name?: string | null
          geocode_lat?: number | null
          geocode_lng?: number | null
          geocode_status?: string | null
          hire_date?: string | null
          home_base_address?: string | null
          home_base_city?: string | null
          home_base_state?: string | null
          home_base_zip?: string | null
          id?: string
          is_approved?: boolean | null
          languages_spoken?: Json | null
          last_name?: string | null
          max_travel_radius_miles?: number | null
          min_buffer_minutes?: number | null
          npi?: string | null
          phone?: string | null
          pin_hash?: string | null
          preferred_regions?: Json | null
          primary_agency_id?: string | null
          push_enabled?: boolean | null
          push_preferences?: Json | null
          secondary_email?: string | null
          secondary_phone?: string | null
          session_length_preferences?: Json | null
          settings_willing_to_serve?: Json | null
          staff_id?: string | null
          staff_notes?: string | null
          staff_notes_visibility?: string | null
          status?: string | null
          supervisor_id?: string | null
          timezone?: string | null
          title?: string | null
          transportation_method?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_primary_agency_id_fkey"
            columns: ["primary_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      program_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          effective_date: string
          id: string
          note: string | null
          program_id: string
          status_from: string | null
          status_to: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          effective_date?: string
          id?: string
          note?: string | null
          program_id: string
          status_from?: string | null
          status_to: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          effective_date?: string
          id?: string
          note?: string | null
          program_id?: string
          status_from?: string | null
          status_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_status_history_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "goal_data"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "program_status_history_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "program_status_history_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "skill_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_levels: {
        Row: {
          abbreviation: string
          agency_id: string | null
          counts_as_prompted: boolean
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          prompt_set_id: string | null
          rank: number
        }
        Insert: {
          abbreviation: string
          agency_id?: string | null
          counts_as_prompted?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          prompt_set_id?: string | null
          rank?: number
        }
        Update: {
          abbreviation?: string
          agency_id?: string | null
          counts_as_prompted?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          prompt_set_id?: string | null
          rank?: number
        }
        Relationships: [
          {
            foreignKeyName: "prompt_levels_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_levels_prompt_set_id_fkey"
            columns: ["prompt_set_id"]
            isOneToOne: false
            referencedRelation: "prompt_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_sets: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          name: string
          scope: string
          scope_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name: string
          scope: string
          scope_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name?: string
          scope?: string
          scope_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      protocol_assignments: {
        Row: {
          assigned_by: string | null
          assigned_staff: string[] | null
          created_at: string
          customizations: Json | null
          end_date: string | null
          id: string
          notes: string | null
          protocol_template_id: string
          start_date: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_staff?: string[] | null
          created_at?: string
          customizations?: Json | null
          end_date?: string | null
          id?: string
          notes?: string | null
          protocol_template_id: string
          start_date?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_staff?: string[] | null
          created_at?: string
          customizations?: Json | null
          end_date?: string | null
          id?: string
          notes?: string | null
          protocol_template_id?: string
          start_date?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_assignments_protocol_template_id_fkey"
            columns: ["protocol_template_id"]
            isOneToOne: false
            referencedRelation: "protocol_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_templates: {
        Row: {
          agency_id: string | null
          created_at: string
          created_by: string | null
          curriculum_item_id: string | null
          curriculum_system: string | null
          data_collection_method: string | null
          description: string | null
          domain: string | null
          error_correction_procedure: string | null
          estimated_duration_minutes: number | null
          generalization_guidelines: string | null
          id: string
          is_template: boolean | null
          level: string | null
          mastery_criteria: Json | null
          materials_needed: string[] | null
          prompt_hierarchy: Json | null
          status: string
          steps: Json | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          curriculum_item_id?: string | null
          curriculum_system?: string | null
          data_collection_method?: string | null
          description?: string | null
          domain?: string | null
          error_correction_procedure?: string | null
          estimated_duration_minutes?: number | null
          generalization_guidelines?: string | null
          id?: string
          is_template?: boolean | null
          level?: string | null
          mastery_criteria?: Json | null
          materials_needed?: string[] | null
          prompt_hierarchy?: Json | null
          status?: string
          steps?: Json | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          curriculum_item_id?: string | null
          curriculum_system?: string | null
          data_collection_method?: string | null
          description?: string | null
          domain?: string | null
          error_correction_procedure?: string | null
          estimated_duration_minutes?: number | null
          generalization_guidelines?: string | null
          id?: string
          is_template?: boolean | null
          level?: string | null
          mastery_criteria?: Json | null
          materials_needed?: string[] | null
          prompt_hierarchy?: Json | null
          status?: string
          steps?: Json | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          device_name: string | null
          id: string
          is_active: boolean | null
          subscription: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_name?: string | null
          id?: string
          is_active?: boolean | null
          subscription: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_name?: string | null
          id?: string
          is_active?: boolean | null
          subscription?: Json
          updated_at?: string | null
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
          first_opened_at: string | null
          form_type: string
          id: string
          last_opened_at: string | null
          open_count: number | null
          progress_percent: number | null
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
          first_opened_at?: string | null
          form_type?: string
          id?: string
          last_opened_at?: string | null
          open_count?: number | null
          progress_percent?: number | null
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
          first_opened_at?: string | null
          form_type?: string
          id?: string
          last_opened_at?: string | null
          open_count?: number | null
          progress_percent?: number | null
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
      referrals: {
        Row: {
          assigned_to_user_id: string | null
          client_address: string | null
          client_city: string | null
          client_diagnosis: string | null
          client_dob: string | null
          client_first_name: string
          client_last_name: string
          client_state: string | null
          client_zip: string | null
          converted_student_id: string | null
          created_at: string
          created_by: string
          estimated_start_date: string | null
          funding_source: string | null
          id: string
          insurance_info: Json | null
          notes: string | null
          parent_guardian_email: string | null
          parent_guardian_name: string | null
          parent_guardian_phone: string | null
          priority_level: string
          referral_date: string
          source: string
          source_contact_email: string | null
          source_contact_name: string | null
          source_contact_phone: string | null
          status: string
          updated_at: string
          waitlist_added_date: string | null
          waitlist_position: number | null
        }
        Insert: {
          assigned_to_user_id?: string | null
          client_address?: string | null
          client_city?: string | null
          client_diagnosis?: string | null
          client_dob?: string | null
          client_first_name: string
          client_last_name: string
          client_state?: string | null
          client_zip?: string | null
          converted_student_id?: string | null
          created_at?: string
          created_by: string
          estimated_start_date?: string | null
          funding_source?: string | null
          id?: string
          insurance_info?: Json | null
          notes?: string | null
          parent_guardian_email?: string | null
          parent_guardian_name?: string | null
          parent_guardian_phone?: string | null
          priority_level?: string
          referral_date?: string
          source?: string
          source_contact_email?: string | null
          source_contact_name?: string | null
          source_contact_phone?: string | null
          status?: string
          updated_at?: string
          waitlist_added_date?: string | null
          waitlist_position?: number | null
        }
        Update: {
          assigned_to_user_id?: string | null
          client_address?: string | null
          client_city?: string | null
          client_diagnosis?: string | null
          client_dob?: string | null
          client_first_name?: string
          client_last_name?: string
          client_state?: string | null
          client_zip?: string | null
          converted_student_id?: string | null
          created_at?: string
          created_by?: string
          estimated_start_date?: string | null
          funding_source?: string | null
          id?: string
          insurance_info?: Json | null
          notes?: string | null
          parent_guardian_email?: string | null
          parent_guardian_name?: string | null
          parent_guardian_phone?: string | null
          priority_level?: string
          referral_date?: string
          source?: string
          source_contact_email?: string | null
          source_contact_name?: string | null
          source_contact_phone?: string | null
          status?: string
          updated_at?: string
          waitlist_added_date?: string | null
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_converted_student_id_fkey"
            columns: ["converted_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      report_branding: {
        Row: {
          agency_id: string | null
          contact_info: Json | null
          created_at: string | null
          footer_text: string | null
          id: string
          is_default: boolean | null
          logo_url: string | null
          organization_name: string
          primary_color: string | null
          secondary_color: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          contact_info?: Json | null
          created_at?: string | null
          footer_text?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          organization_name: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          contact_info?: Json | null
          created_at?: string | null
          footer_text?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          organization_name?: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_branding_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      review_queue: {
        Row: {
          created_at: string
          criteria_type: string
          current_phase: string
          evidence: Json | null
          id: string
          program_id: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_id: string
          suggested_phase: string | null
          target_id: string
        }
        Insert: {
          created_at?: string
          criteria_type: string
          current_phase: string
          evidence?: Json | null
          id?: string
          program_id?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id: string
          suggested_phase?: string | null
          target_id: string
        }
        Update: {
          created_at?: string
          criteria_type?: string
          current_phase?: string
          evidence?: Json | null
          id?: string
          program_id?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id?: string
          suggested_phase?: string | null
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_queue_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "goal_data"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "review_queue_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "review_queue_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "skill_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_queue_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_queue_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "goal_data"
            referencedColumns: ["target_id"]
          },
          {
            foreignKeyName: "review_queue_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "skill_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_requests: {
        Row: {
          client_id: string
          constraints: Json | null
          created_at: string
          created_by: string
          duration_minutes: number
          frequency: string | null
          id: string
          location_id: string | null
          notes: string | null
          preferred_staff_ids: Json | null
          requested_day: string | null
          requested_end_time: string | null
          requested_start_time: string | null
          service_type: string
          status: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          constraints?: Json | null
          created_at?: string
          created_by: string
          duration_minutes: number
          frequency?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          preferred_staff_ids?: Json | null
          requested_day?: string | null
          requested_end_time?: string | null
          requested_start_time?: string | null
          service_type: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          constraints?: Json | null
          created_at?: string
          created_by?: string
          duration_minutes?: number
          frequency?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          preferred_staff_ids?: Json | null
          requested_day?: string | null
          requested_end_time?: string | null
          requested_start_time?: string | null
          service_type?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_sessions: {
        Row: {
          appointment_id: string | null
          client_id: string
          computed_distance_miles: number | null
          created_at: string
          end_datetime: string
          id: string
          location_id: string | null
          override_applied: boolean | null
          override_log_id: string | null
          schedule_request_id: string | null
          service_type: string
          session_id: string | null
          staff_user_id: string
          start_datetime: string
          status: string | null
          supervisor_user_id: string | null
          travel_time_estimate_minutes: number | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          computed_distance_miles?: number | null
          created_at?: string
          end_datetime: string
          id?: string
          location_id?: string | null
          override_applied?: boolean | null
          override_log_id?: string | null
          schedule_request_id?: string | null
          service_type: string
          session_id?: string | null
          staff_user_id: string
          start_datetime: string
          status?: string | null
          supervisor_user_id?: string | null
          travel_time_estimate_minutes?: number | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          computed_distance_miles?: number | null
          created_at?: string
          end_datetime?: string
          id?: string
          location_id?: string | null
          override_applied?: boolean | null
          override_log_id?: string | null
          schedule_request_id?: string | null
          service_type?: string
          session_id?: string | null
          staff_user_id?: string
          start_datetime?: string
          status?: string | null
          supervisor_user_id?: string | null
          travel_time_estimate_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
      service_plan_minutes: {
        Row: {
          client_id: string
          created_at: string
          effective_end_date: string | null
          effective_start_date: string
          id: string
          mandated_minutes_per_period: number
          notes: string | null
          period_type: string | null
          service_line: string
          source: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          effective_end_date?: string | null
          effective_start_date: string
          id?: string
          mandated_minutes_per_period: number
          notes?: string | null
          period_type?: string | null
          service_line: string
          source: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          effective_end_date?: string | null
          effective_start_date?: string
          id?: string
          mandated_minutes_per_period?: number
          notes?: string | null
          period_type?: string | null
          service_line?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_plan_minutes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      session_blocking_reasons: {
        Row: {
          blocking_reason_code: string
          created_at: string
          id: string
          message: string
          resolved_at: string | null
          resolved_by: string | null
          session_id: string
        }
        Insert: {
          blocking_reason_code: string
          created_at?: string
          id?: string
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          session_id: string
        }
        Update: {
          blocking_reason_code?: string
          created_at?: string
          id?: string
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string
        }
        Relationships: []
      }
      session_data: {
        Row: {
          abc_data: Json | null
          behavior_id: string
          behavior_name: string | null
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
          behavior_name?: string | null
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
          behavior_name?: string | null
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
      session_participants: {
        Row: {
          collection_intervals: Json | null
          created_at: string
          data_entry_count: number | null
          id: string
          joined_at: string
          left_at: string | null
          note_delegate: boolean
          note_delegate_assigned_at: string | null
          note_delegate_assigned_by: string | null
          role: string
          session_id: string
          student_ids: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          collection_intervals?: Json | null
          created_at?: string
          data_entry_count?: number | null
          id?: string
          joined_at?: string
          left_at?: string | null
          note_delegate?: boolean
          note_delegate_assigned_at?: string | null
          note_delegate_assigned_by?: string | null
          role?: string
          session_id: string
          student_ids?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          collection_intervals?: Json | null
          created_at?: string
          data_entry_count?: number | null
          id?: string
          joined_at?: string
          left_at?: string | null
          note_delegate?: boolean
          note_delegate_assigned_at?: string | null
          note_delegate_assigned_by?: string | null
          role?: string
          session_id?: string
          student_ids?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_staff_notes: {
        Row: {
          approved_at: string | null
          author_name: string | null
          author_user_id: string
          created_at: string
          id: string
          note_format: string
          note_text: string | null
          session_id: string
          soap_assessment: string | null
          soap_objective: string | null
          soap_plan: string | null
          soap_subjective: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          author_name?: string | null
          author_user_id: string
          created_at?: string
          id?: string
          note_format?: string
          note_text?: string | null
          session_id: string
          soap_assessment?: string | null
          soap_objective?: string | null
          soap_plan?: string | null
          soap_subjective?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          author_name?: string | null
          author_user_id?: string
          created_at?: string
          id?: string
          note_format?: string
          note_text?: string | null
          session_id?: string
          soap_assessment?: string | null
          soap_objective?: string | null
          soap_plan?: string | null
          soap_subjective?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          appointment_id: string | null
          attendance_outcome: string | null
          attendance_reason_code: string | null
          attendance_reason_detail: string | null
          authorization_id: string | null
          authorization_status: string | null
          authorized_service_id: string | null
          billing_status: string | null
          coverage_gate_reason_code: string | null
          coverage_gate_status: string | null
          coverage_last_verified_at: string | null
          coverage_rule_match_ids: Json | null
          created_at: string
          end_time: string | null
          funding_mode_snapshot: string | null
          has_data: boolean | null
          id: string
          interval_length_seconds: number
          location_detail: string | null
          name: string
          note_delegate_method: string | null
          note_delegate_user_id: string | null
          provider_id: string | null
          service_setting: string | null
          service_type: string | null
          session_length_minutes: number
          start_time: string
          status: string | null
          student_ids: string[] | null
          user_id: string
          verification_source: string | null
        }
        Insert: {
          appointment_id?: string | null
          attendance_outcome?: string | null
          attendance_reason_code?: string | null
          attendance_reason_detail?: string | null
          authorization_id?: string | null
          authorization_status?: string | null
          authorized_service_id?: string | null
          billing_status?: string | null
          coverage_gate_reason_code?: string | null
          coverage_gate_status?: string | null
          coverage_last_verified_at?: string | null
          coverage_rule_match_ids?: Json | null
          created_at?: string
          end_time?: string | null
          funding_mode_snapshot?: string | null
          has_data?: boolean | null
          id?: string
          interval_length_seconds?: number
          location_detail?: string | null
          name: string
          note_delegate_method?: string | null
          note_delegate_user_id?: string | null
          provider_id?: string | null
          service_setting?: string | null
          service_type?: string | null
          session_length_minutes?: number
          start_time: string
          status?: string | null
          student_ids?: string[] | null
          user_id: string
          verification_source?: string | null
        }
        Update: {
          appointment_id?: string | null
          attendance_outcome?: string | null
          attendance_reason_code?: string | null
          attendance_reason_detail?: string | null
          authorization_id?: string | null
          authorization_status?: string | null
          authorized_service_id?: string | null
          billing_status?: string | null
          coverage_gate_reason_code?: string | null
          coverage_gate_status?: string | null
          coverage_last_verified_at?: string | null
          coverage_rule_match_ids?: Json | null
          created_at?: string
          end_time?: string | null
          funding_mode_snapshot?: string | null
          has_data?: boolean | null
          id?: string
          interval_length_seconds?: number
          location_detail?: string | null
          name?: string
          note_delegate_method?: string | null
          note_delegate_user_id?: string | null
          provider_id?: string | null
          service_setting?: string | null
          service_type?: string | null
          session_length_minutes?: number
          start_time?: string
          status?: string | null
          student_ids?: string[] | null
          user_id?: string
          verification_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "authorizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_authorized_service_id_fkey"
            columns: ["authorized_service_id"]
            isOneToOne: false
            referencedRelation: "authorized_services"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_session_data: {
        Row: {
          behavior_id: string | null
          collected_at: string
          collected_by_display_name: string | null
          collected_by_user_id: string
          created_at: string
          entry_id: string
          entry_type: string
          id: string
          is_deleted: boolean | null
          payload: Json
          session_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          behavior_id?: string | null
          collected_at?: string
          collected_by_display_name?: string | null
          collected_by_user_id: string
          created_at?: string
          entry_id: string
          entry_type: string
          id?: string
          is_deleted?: boolean | null
          payload?: Json
          session_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          behavior_id?: string | null
          collected_at?: string
          collected_by_display_name?: string | null
          collected_by_user_id?: string
          created_at?: string
          entry_id?: string
          entry_type?: string
          id?: string
          is_deleted?: boolean | null
          payload?: Json
          session_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      signature_audit_log: {
        Row: {
          action: string
          id: string
          ip_address: string | null
          performed_at: string
          performed_by: string | null
          submission_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          id?: string
          ip_address?: string | null
          performed_at?: string
          performed_by?: string | null
          submission_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          id?: string
          ip_address?: string | null
          performed_at?: string
          performed_by?: string | null
          submission_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_audit_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "consent_form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_programs: {
        Row: {
          active: boolean
          benchmark_definition: Json | null
          benchmark_enabled: boolean
          created_at: string
          created_by: string | null
          default_mastery_consecutive_sessions: number | null
          default_mastery_criteria: string | null
          default_mastery_percent: number | null
          description: string | null
          domain_id: string | null
          id: string
          method: string
          name: string
          notes: string | null
          phase: string
          prompt_counts_as_correct: boolean | null
          status: string
          status_effective_date: string
          student_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          benchmark_definition?: Json | null
          benchmark_enabled?: boolean
          created_at?: string
          created_by?: string | null
          default_mastery_consecutive_sessions?: number | null
          default_mastery_criteria?: string | null
          default_mastery_percent?: number | null
          description?: string | null
          domain_id?: string | null
          id?: string
          method?: string
          name: string
          notes?: string | null
          phase?: string
          prompt_counts_as_correct?: boolean | null
          status?: string
          status_effective_date?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          benchmark_definition?: Json | null
          benchmark_enabled?: boolean
          created_at?: string
          created_by?: string | null
          default_mastery_consecutive_sessions?: number | null
          default_mastery_criteria?: string | null
          default_mastery_percent?: number | null
          description?: string | null
          domain_id?: string | null
          id?: string
          method?: string
          name?: string
          notes?: string | null
          phase?: string
          prompt_counts_as_correct?: boolean | null
          status?: string
          status_effective_date?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_programs_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_programs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_targets: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          id: string
          mastery_consecutive_sessions: number | null
          mastery_criteria: string | null
          mastery_percent: number | null
          name: string
          notes: string | null
          operational_definition: string | null
          phase: string
          program_id: string
          prompt_counts_as_correct: boolean | null
          status: string
          status_effective_date: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          mastery_consecutive_sessions?: number | null
          mastery_criteria?: string | null
          mastery_percent?: number | null
          name: string
          notes?: string | null
          operational_definition?: string | null
          phase?: string
          program_id: string
          prompt_counts_as_correct?: boolean | null
          status?: string
          status_effective_date?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          mastery_consecutive_sessions?: number | null
          mastery_criteria?: string | null
          mastery_percent?: number | null
          name?: string
          notes?: string | null
          operational_definition?: string | null
          phase?: string
          program_id?: string
          prompt_counts_as_correct?: boolean | null
          status?: string
          status_effective_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_targets_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "goal_data"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "skill_targets_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "skill_targets_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "skill_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      socially_savvy_assessments: {
        Row: {
          administered_by: string | null
          completed_at: string | null
          created_at: string
          date_administered: string
          domain_scores: Json | null
          form_template_id: string | null
          id: string
          invitation_id: string | null
          notes: string | null
          raw_responses: Json | null
          respondent_name: string | null
          respondent_relationship: string | null
          scored_at: string | null
          scored_by: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          administered_by?: string | null
          completed_at?: string | null
          created_at?: string
          date_administered?: string
          domain_scores?: Json | null
          form_template_id?: string | null
          id?: string
          invitation_id?: string | null
          notes?: string | null
          raw_responses?: Json | null
          respondent_name?: string | null
          respondent_relationship?: string | null
          scored_at?: string | null
          scored_by?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          administered_by?: string | null
          completed_at?: string | null
          created_at?: string
          date_administered?: string
          domain_scores?: Json | null
          form_template_id?: string | null
          id?: string
          invitation_id?: string | null
          notes?: string | null
          raw_responses?: Json | null
          respondent_name?: string | null
          respondent_relationship?: string | null
          scored_at?: string | null
          scored_by?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "socially_savvy_assessments_form_template_id_fkey"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "socially_savvy_form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "socially_savvy_assessments_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "socially_savvy_assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      socially_savvy_form_templates: {
        Row: {
          created_at: string
          description: string | null
          domains: Json
          form_code: string
          form_name: string
          id: string
          questions: Json
          scoring_info: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          domains?: Json
          form_code: string
          form_name: string
          id?: string
          questions?: Json
          scoring_info?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          domains?: Json
          form_code?: string
          form_name?: string
          id?: string
          questions?: Json
          scoring_info?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      staff_availability: {
        Row: {
          created_at: string
          day_of_week: string
          effective_from: string | null
          effective_until: string | null
          end_time: string
          id: string
          is_active: boolean | null
          notes: string | null
          staff_user_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: string
          effective_from?: string | null
          effective_until?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          staff_user_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: string
          effective_from?: string | null
          effective_until?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          staff_user_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_caseloads: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assignment_type: string | null
          clinician_user_id: string
          created_at: string
          ended_at: string | null
          id: string
          notes: string | null
          status: string | null
          student_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_type?: string | null
          clinician_user_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          student_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_type?: string | null
          clinician_user_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_caseloads_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "staff_caseloads_clinician_user_id_fkey"
            columns: ["clinician_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "staff_caseloads_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_credentials: {
        Row: {
          created_at: string
          credential_number: string | null
          credential_type: string
          document_path: string | null
          expiration_date: string | null
          id: string
          is_verified: boolean | null
          issue_date: string | null
          issuing_body: string | null
          notes: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          credential_number?: string | null
          credential_type: string
          document_path?: string | null
          expiration_date?: string | null
          id?: string
          is_verified?: boolean | null
          issue_date?: string | null
          issuing_body?: string | null
          notes?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          credential_number?: string | null
          credential_type?: string
          document_path?: string | null
          expiration_date?: string | null
          id?: string
          is_verified?: boolean | null
          issue_date?: string | null
          issuing_body?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      staff_timesheets: {
        Row: {
          agency_id: string | null
          approved_at: string | null
          approved_by: string | null
          billable_hours: number | null
          created_at: string
          drive_time_hours: number | null
          id: string
          non_billable_hours: number | null
          notes: string | null
          pay_period_end: string
          pay_period_start: string
          staff_user_id: string
          status: string
          submitted_at: string | null
          total_hours: number | null
          total_mileage: number | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          billable_hours?: number | null
          created_at?: string
          drive_time_hours?: number | null
          id?: string
          non_billable_hours?: number | null
          notes?: string | null
          pay_period_end: string
          pay_period_start: string
          staff_user_id: string
          status?: string
          submitted_at?: string | null
          total_hours?: number | null
          total_mileage?: number | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          billable_hours?: number | null
          created_at?: string
          drive_time_hours?: number | null
          id?: string
          non_billable_hours?: number | null
          notes?: string | null
          pay_period_end?: string
          pay_period_start?: string
          staff_user_id?: string
          status?: string
          submitted_at?: string | null
          total_hours?: number | null
          total_mileage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_timesheets_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      stored_payment_methods: {
        Row: {
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          nickname: string | null
          stripe_customer_id: string
          stripe_payment_method_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          nickname?: string | null
          stripe_customer_id: string
          stripe_payment_method_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          nickname?: string | null
          stripe_customer_id?: string
          stripe_payment_method_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stored_payment_methods_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_assessments: {
        Row: {
          administered_by: string | null
          created_at: string
          curriculum_system_id: string
          date_administered: string
          domain_scores: Json | null
          id: string
          notes: string | null
          raw_attachment_path: string | null
          results_json: Json | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          administered_by?: string | null
          created_at?: string
          curriculum_system_id: string
          date_administered?: string
          domain_scores?: Json | null
          id?: string
          notes?: string | null
          raw_attachment_path?: string | null
          results_json?: Json | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          administered_by?: string | null
          created_at?: string
          curriculum_system_id?: string
          date_administered?: string
          domain_scores?: Json | null
          id?: string
          notes?: string | null
          raw_attachment_path?: string | null
          results_json?: Json | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_assessments_curriculum_system_id_fkey"
            columns: ["curriculum_system_id"]
            isOneToOne: false
            referencedRelation: "curriculum_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_bx_plan_links: {
        Row: {
          created_at: string
          created_by: string | null
          data_summary: string | null
          function_hypothesis: string[] | null
          id: string
          implementation_owner: string[] | null
          link_status: string
          notes: string | null
          objective_id: string | null
          problem_id: string | null
          recommendation_reason: string | null
          recommended_score: number | null
          review_due: string | null
          setting_notes: string | null
          start_date: string | null
          strategy_id: string | null
          student_id: string
          target_behavior_label: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_summary?: string | null
          function_hypothesis?: string[] | null
          id?: string
          implementation_owner?: string[] | null
          link_status?: string
          notes?: string | null
          objective_id?: string | null
          problem_id?: string | null
          recommendation_reason?: string | null
          recommended_score?: number | null
          review_due?: string | null
          setting_notes?: string | null
          start_date?: string | null
          strategy_id?: string | null
          student_id: string
          target_behavior_label?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_summary?: string | null
          function_hypothesis?: string[] | null
          id?: string
          implementation_owner?: string[] | null
          link_status?: string
          notes?: string | null
          objective_id?: string | null
          problem_id?: string | null
          recommendation_reason?: string | null
          recommended_score?: number | null
          review_due?: string | null
          setting_notes?: string | null
          start_date?: string | null
          strategy_id?: string | null
          student_id?: string
          target_behavior_label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_bx_plan_links_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "bx_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_bx_plan_links_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "bx_presenting_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_bx_plan_links_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "bx_strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_bx_plan_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_contract_assignments: {
        Row: {
          authorized_hours_per_week: number | null
          contract_id: string
          created_at: string | null
          created_by: string | null
          end_date: string | null
          funding_source: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          start_date: string
          student_id: string
        }
        Insert: {
          authorized_hours_per_week?: number | null
          contract_id: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          funding_source?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          start_date: string
          student_id: string
        }
        Update: {
          authorized_hours_per_week?: number | null
          contract_id?: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          funding_source?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          start_date?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_contract_assignments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_contract_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_curriculum_plans: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          current_level: string | null
          curriculum_system_id: string
          date_started: string
          id: string
          notes: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          current_level?: string | null
          curriculum_system_id: string
          date_started?: string
          id?: string
          notes?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          current_level?: string | null
          curriculum_system_id?: string
          date_started?: string
          id?: string
          notes?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_curriculum_plans_curriculum_system_id_fkey"
            columns: ["curriculum_system_id"]
            isOneToOne: false
            referencedRelation: "curriculum_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_curriculum_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
      student_iep_support_audit: {
        Row: {
          action: string
          change_details: Json | null
          changed_by: string | null
          created_at: string
          id: string
          new_status: string | null
          previous_status: string | null
          support_id: string
        }
        Insert: {
          action: string
          change_details?: Json | null
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          previous_status?: string | null
          support_id: string
        }
        Update: {
          action?: string
          change_details?: Json | null
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          previous_status?: string | null
          support_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_iep_support_audit_support_id_fkey"
            columns: ["support_id"]
            isOneToOne: false
            referencedRelation: "student_iep_supports"
            referencedColumns: ["id"]
          },
        ]
      }
      student_iep_support_links: {
        Row: {
          approved_by: string | null
          confirmation_required: boolean | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          date_added: string
          date_updated: string
          evidence: Json | null
          implementation_plan: Json | null
          item_id: string
          link_id: string
          link_status: string
          notes: string | null
          owner: string | null
          rationale_bullets: Json | null
          recommendation_confidence: string | null
          recommendation_score: number | null
          review_due: string | null
          risk_flags: Json | null
          student_id: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          confirmation_required?: boolean | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          date_added?: string
          date_updated?: string
          evidence?: Json | null
          implementation_plan?: Json | null
          item_id: string
          link_id?: string
          link_status?: string
          notes?: string | null
          owner?: string | null
          rationale_bullets?: Json | null
          recommendation_confidence?: string | null
          recommendation_score?: number | null
          review_due?: string | null
          risk_flags?: Json | null
          student_id: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          confirmation_required?: boolean | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          date_added?: string
          date_updated?: string
          evidence?: Json | null
          implementation_plan?: Json | null
          item_id?: string
          link_id?: string
          link_status?: string
          notes?: string | null
          owner?: string | null
          rationale_bullets?: Json | null
          recommendation_confidence?: string | null
          recommendation_score?: number | null
          review_due?: string | null
          risk_flags?: Json | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_iep_support_links_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "iep_library_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_iep_support_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_iep_supports: {
        Row: {
          created_at: string
          created_by: string | null
          custom_description: string | null
          custom_title: string | null
          domains_override: string[] | null
          edit_history: Json | null
          id: string
          is_primary_support: boolean | null
          item_type: string
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          library_item_id: string | null
          linked_goal_ids: string[] | null
          modified_at: string | null
          modified_by: string | null
          notes: string | null
          review_date: string | null
          setting_tags_override: string[] | null
          source: string
          start_date: string | null
          student_id: string
          student_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_description?: string | null
          custom_title?: string | null
          domains_override?: string[] | null
          edit_history?: Json | null
          id?: string
          is_primary_support?: boolean | null
          item_type: string
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          library_item_id?: string | null
          linked_goal_ids?: string[] | null
          modified_at?: string | null
          modified_by?: string | null
          notes?: string | null
          review_date?: string | null
          setting_tags_override?: string[] | null
          source?: string
          start_date?: string | null
          student_id: string
          student_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_description?: string | null
          custom_title?: string | null
          domains_override?: string[] | null
          edit_history?: Json | null
          id?: string
          is_primary_support?: boolean | null
          item_type?: string
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          library_item_id?: string | null
          linked_goal_ids?: string[] | null
          modified_at?: string | null
          modified_by?: string | null
          notes?: string | null
          review_date?: string | null
          setting_tags_override?: string[] | null
          source?: string
          start_date?: string | null
          student_id?: string
          student_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_iep_supports_library_item_id_fkey"
            columns: ["library_item_id"]
            isOneToOne: false
            referencedRelation: "iep_library_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_iep_supports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_payers: {
        Row: {
          billing_order: number
          created_at: string
          created_by: string | null
          effective_date: string | null
          group_number: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          member_id: string | null
          notes: string | null
          payer_id: string
          student_id: string
          subscriber_name: string | null
          subscriber_relationship: string | null
          termination_date: string | null
          updated_at: string
        }
        Insert: {
          billing_order?: number
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          group_number?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          member_id?: string | null
          notes?: string | null
          payer_id: string
          student_id: string
          subscriber_name?: string | null
          subscriber_relationship?: string | null
          termination_date?: string | null
          updated_at?: string
        }
        Update: {
          billing_order?: number
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          group_number?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          member_id?: string | null
          notes?: string | null
          payer_id?: string
          student_id?: string
          subscriber_name?: string | null
          subscriber_relationship?: string | null
          termination_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_payers_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_payers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_prompt_levels: {
        Row: {
          created_at: string
          custom_label: string | null
          display_order: number
          enabled: boolean
          id: string
          prompt_level_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          custom_label?: string | null
          display_order?: number
          enabled?: boolean
          id?: string
          prompt_level_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          custom_label?: string | null
          display_order?: number
          enabled?: boolean
          id?: string
          prompt_level_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_prompt_levels_prompt_level_id_fkey"
            columns: ["prompt_level_id"]
            isOneToOne: false
            referencedRelation: "prompt_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_prompt_levels_student_id_fkey"
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
      student_targets: {
        Row: {
          added_by: string | null
          baseline_data: Json | null
          created_at: string
          current_performance: Json | null
          customized: boolean
          data_collection_type: string | null
          date_added: string
          date_mastered: string | null
          description: string | null
          domain_id: string | null
          id: string
          linked_prerequisite_ids: string[] | null
          mastery_criteria: string | null
          notes_for_staff: string | null
          priority: string | null
          source_id: string | null
          source_type: string
          status: string
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          baseline_data?: Json | null
          created_at?: string
          current_performance?: Json | null
          customized?: boolean
          data_collection_type?: string | null
          date_added?: string
          date_mastered?: string | null
          description?: string | null
          domain_id?: string | null
          id?: string
          linked_prerequisite_ids?: string[] | null
          mastery_criteria?: string | null
          notes_for_staff?: string | null
          priority?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          baseline_data?: Json | null
          created_at?: string
          current_performance?: Json | null
          customized?: boolean
          data_collection_type?: string | null
          date_added?: string
          date_mastered?: string | null
          description?: string | null
          domain_id?: string | null
          id?: string
          linked_prerequisite_ids?: string[] | null
          mastery_criteria?: string | null
          notes_for_staff?: string | null
          priority?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_targets_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_targets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          activation_status: string | null
          agency_id: string | null
          archived_at: string | null
          assessment_mode_enabled: boolean | null
          background_info: Json | null
          behaviors: Json | null
          bip_data: Json | null
          bip_date: string | null
          brief_record_review: Json | null
          brief_teacher_inputs: Json | null
          case_closed_date: string | null
          case_opened_date: string | null
          case_types: Json | null
          color: string
          contact_email: string | null
          contact_phone: string | null
          coverage_mode_override: string | null
          created_at: string
          custom_antecedents: Json | null
          custom_consequences: Json | null
          data_collection_start_date: string | null
          date_of_birth: string | null
          diagnoses: Json | null
          discharge_reason: string | null
          display_name: string | null
          district_name: string | null
          dob: string | null
          documents: Json | null
          fba_date: string | null
          fba_findings: Json | null
          fba_workflow_progress: Json | null
          first_name: string | null
          funding_mode: string | null
          goals: Json | null
          grade: string | null
          historical_data: Json | null
          id: string
          iep_date: string | null
          iep_end_date: string | null
          indirect_assessments: Json | null
          insurance_alerts_background: boolean | null
          insurance_tracking_state: string | null
          is_archived: boolean
          last_name: string | null
          legal_first_name: string | null
          legal_last_name: string | null
          name: string
          narrative_notes: Json | null
          next_iep_review_date: string | null
          notes_required: boolean | null
          preferred_name: string | null
          primary_setting: string | null
          primary_supervisor_staff_id: string | null
          profile_completeness_status: string | null
          prompt_counts_as_correct: boolean | null
          pronouns: string | null
          school: string | null
          school_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activation_status?: string | null
          agency_id?: string | null
          archived_at?: string | null
          assessment_mode_enabled?: boolean | null
          background_info?: Json | null
          behaviors?: Json | null
          bip_data?: Json | null
          bip_date?: string | null
          brief_record_review?: Json | null
          brief_teacher_inputs?: Json | null
          case_closed_date?: string | null
          case_opened_date?: string | null
          case_types?: Json | null
          color?: string
          contact_email?: string | null
          contact_phone?: string | null
          coverage_mode_override?: string | null
          created_at?: string
          custom_antecedents?: Json | null
          custom_consequences?: Json | null
          data_collection_start_date?: string | null
          date_of_birth?: string | null
          diagnoses?: Json | null
          discharge_reason?: string | null
          display_name?: string | null
          district_name?: string | null
          dob?: string | null
          documents?: Json | null
          fba_date?: string | null
          fba_findings?: Json | null
          fba_workflow_progress?: Json | null
          first_name?: string | null
          funding_mode?: string | null
          goals?: Json | null
          grade?: string | null
          historical_data?: Json | null
          id?: string
          iep_date?: string | null
          iep_end_date?: string | null
          indirect_assessments?: Json | null
          insurance_alerts_background?: boolean | null
          insurance_tracking_state?: string | null
          is_archived?: boolean
          last_name?: string | null
          legal_first_name?: string | null
          legal_last_name?: string | null
          name: string
          narrative_notes?: Json | null
          next_iep_review_date?: string | null
          notes_required?: boolean | null
          preferred_name?: string | null
          primary_setting?: string | null
          primary_supervisor_staff_id?: string | null
          profile_completeness_status?: string | null
          prompt_counts_as_correct?: boolean | null
          pronouns?: string | null
          school?: string | null
          school_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activation_status?: string | null
          agency_id?: string | null
          archived_at?: string | null
          assessment_mode_enabled?: boolean | null
          background_info?: Json | null
          behaviors?: Json | null
          bip_data?: Json | null
          bip_date?: string | null
          brief_record_review?: Json | null
          brief_teacher_inputs?: Json | null
          case_closed_date?: string | null
          case_opened_date?: string | null
          case_types?: Json | null
          color?: string
          contact_email?: string | null
          contact_phone?: string | null
          coverage_mode_override?: string | null
          created_at?: string
          custom_antecedents?: Json | null
          custom_consequences?: Json | null
          data_collection_start_date?: string | null
          date_of_birth?: string | null
          diagnoses?: Json | null
          discharge_reason?: string | null
          display_name?: string | null
          district_name?: string | null
          dob?: string | null
          documents?: Json | null
          fba_date?: string | null
          fba_findings?: Json | null
          fba_workflow_progress?: Json | null
          first_name?: string | null
          funding_mode?: string | null
          goals?: Json | null
          grade?: string | null
          historical_data?: Json | null
          id?: string
          iep_date?: string | null
          iep_end_date?: string | null
          indirect_assessments?: Json | null
          insurance_alerts_background?: boolean | null
          insurance_tracking_state?: string | null
          is_archived?: boolean
          last_name?: string | null
          legal_first_name?: string | null
          legal_last_name?: string | null
          name?: string
          narrative_notes?: Json | null
          next_iep_review_date?: string | null
          notes_required?: boolean | null
          preferred_name?: string | null
          primary_setting?: string | null
          primary_supervisor_staff_id?: string | null
          profile_completeness_status?: string | null
          prompt_counts_as_correct?: boolean | null
          pronouns?: string | null
          school?: string | null
          school_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      supervision_chain_violations: {
        Row: {
          created_at: string | null
          created_by: string | null
          detected_at: string | null
          id: string
          resolution_notes: string | null
          resolved_at: string | null
          staff_user_id: string
          violation_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          detected_at?: string | null
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          staff_user_id: string
          violation_type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          detected_at?: string | null
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          staff_user_id?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervision_chain_violations_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      supervision_logs: {
        Row: {
          activities: Json | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          duration_minutes: number
          end_time: string
          id: string
          notes: string | null
          session_id: string | null
          start_time: string
          status: string
          student_id: string | null
          supervisee_user_id: string
          supervision_date: string
          supervision_type: string
          supervisor_user_id: string
          updated_at: string
        }
        Insert: {
          activities?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          duration_minutes: number
          end_time: string
          id?: string
          notes?: string | null
          session_id?: string | null
          start_time: string
          status?: string
          student_id?: string | null
          supervisee_user_id: string
          supervision_date?: string
          supervision_type?: string
          supervisor_user_id: string
          updated_at?: string
        }
        Update: {
          activities?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          duration_minutes?: number
          end_time?: string
          id?: string
          notes?: string | null
          session_id?: string | null
          start_time?: string
          status?: string
          student_id?: string | null
          supervisee_user_id?: string
          supervision_date?: string
          supervision_type?: string
          supervisor_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervision_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervision_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      supervision_requirements: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          created_at: string
          id: string
          is_active: boolean
          requirement_type: string
          supervisee_user_id: string
          supervisor_user_id: string
          target_percentage: number
          updated_at: string
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          id?: string
          is_active?: boolean
          requirement_type?: string
          supervisee_user_id: string
          supervisor_user_id: string
          target_percentage?: number
          updated_at?: string
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          id?: string
          is_active?: boolean
          requirement_type?: string
          supervisee_user_id?: string
          supervisor_user_id?: string
          target_percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      supervisor_links: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          notes: string | null
          start_date: string
          status: string
          supervisee_staff_id: string
          supervision_type: string | null
          supervisor_staff_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string
          status?: string
          supervisee_staff_id: string
          supervision_type?: string | null
          supervisor_staff_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string
          status?: string
          supervisee_staff_id?: string
          supervision_type?: string | null
          supervisor_staff_id?: string
          updated_at?: string
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
      target_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          effective_date: string
          id: string
          note: string | null
          status_from: string | null
          status_to: string
          target_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          effective_date?: string
          id?: string
          note?: string | null
          status_from?: string | null
          status_to: string
          target_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          effective_date?: string
          id?: string
          note?: string | null
          status_from?: string | null
          status_to?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "target_status_history_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "goal_data"
            referencedColumns: ["target_id"]
          },
          {
            foreignKeyName: "target_status_history_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "skill_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      target_trials: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          outcome: string
          prompt_level_id: string | null
          prompt_success: boolean | null
          recorded_at: string
          recorded_by: string | null
          session_id: string | null
          session_type: string
          target_id: string
          trial_index: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          outcome?: string
          prompt_level_id?: string | null
          prompt_success?: boolean | null
          recorded_at?: string
          recorded_by?: string | null
          session_id?: string | null
          session_type?: string
          target_id: string
          trial_index?: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          outcome?: string
          prompt_level_id?: string | null
          prompt_success?: boolean | null
          recorded_at?: string
          recorded_by?: string | null
          session_id?: string | null
          session_type?: string
          target_id?: string
          trial_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "target_trials_prompt_level_id_fkey"
            columns: ["prompt_level_id"]
            isOneToOne: false
            referencedRelation: "prompt_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_trials_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_trials_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "goal_data"
            referencedColumns: ["target_id"]
          },
          {
            foreignKeyName: "target_trials_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "skill_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      task_analysis_step_data: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          outcome: string
          prompt_level_id: string | null
          recorded_at: string
          recorded_by: string | null
          session_id: string | null
          session_type: string
          step_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          outcome?: string
          prompt_level_id?: string | null
          recorded_at?: string
          recorded_by?: string | null
          session_id?: string | null
          session_type?: string
          step_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          outcome?: string
          prompt_level_id?: string | null
          recorded_at?: string
          recorded_by?: string | null
          session_id?: string | null
          session_type?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_analysis_step_data_prompt_level_id_fkey"
            columns: ["prompt_level_id"]
            isOneToOne: false
            referencedRelation: "prompt_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_analysis_step_data_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_analysis_step_data_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "task_analysis_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      task_analysis_steps: {
        Row: {
          created_at: string
          default_prompt_level: string | null
          id: string
          mastered_at: string | null
          step_label: string
          step_notes: string | null
          step_number: number
          step_status: string
          target_id: string
        }
        Insert: {
          created_at?: string
          default_prompt_level?: string | null
          id?: string
          mastered_at?: string | null
          step_label: string
          step_notes?: string | null
          step_number: number
          step_status?: string
          target_id: string
        }
        Update: {
          created_at?: string
          default_prompt_level?: string | null
          id?: string
          mastered_at?: string | null
          step_label?: string
          step_notes?: string | null
          step_number?: number
          step_status?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_analysis_steps_default_prompt_level_fkey"
            columns: ["default_prompt_level"]
            isOneToOne: false
            referencedRelation: "prompt_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_analysis_steps_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "goal_data"
            referencedColumns: ["target_id"]
          },
          {
            foreignKeyName: "task_analysis_steps_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "skill_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_entries: {
        Row: {
          appointment_id: string | null
          clock_in: string | null
          clock_out: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          entry_date: string
          entry_type: string
          id: string
          is_billable: boolean | null
          mileage: number | null
          pay_rate: number | null
          student_id: string | null
          timesheet_id: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          entry_date: string
          entry_type?: string
          id?: string
          is_billable?: boolean | null
          mileage?: number | null
          pay_rate?: number | null
          student_id?: string | null
          timesheet_id: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          entry_date?: string
          entry_type?: string
          id?: string
          is_billable?: boolean | null
          mileage?: number | null
          pay_rate?: number | null
          student_id?: string | null
          timesheet_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_entries_timesheet_id_fkey"
            columns: ["timesheet_id"]
            isOneToOne: false
            referencedRelation: "staff_timesheets"
            referencedColumns: ["id"]
          },
        ]
      }
      toi_daily_logs: {
        Row: {
          created_at: string
          created_by_user_id: string
          id: string
          log_date: string
          notes: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          id?: string
          log_date: string
          notes?: string | null
          status: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          id?: string
          log_date?: string
          notes?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "toi_daily_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      training_assignments: {
        Row: {
          assigned_by: string | null
          assigned_date: string | null
          attempts: number | null
          completed_date: string | null
          created_at: string
          due_date: string | null
          id: string
          module_id: string
          notes: string | null
          score: number | null
          staff_user_id: string
          status: string
          time_spent_minutes: number | null
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_date?: string | null
          attempts?: number | null
          completed_date?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          module_id: string
          notes?: string | null
          score?: number | null
          staff_user_id: string
          status?: string
          time_spent_minutes?: number | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_date?: string | null
          attempts?: number | null
          completed_date?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          module_id?: string
          notes?: string | null
          score?: number | null
          staff_user_id?: string
          status?: string
          time_spent_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          agency_id: string | null
          category: string | null
          ceu_credits: number | null
          content_data: Json | null
          content_type: string
          content_url: string | null
          created_at: string
          created_by: string
          description: string | null
          duration_estimate_minutes: number | null
          id: string
          pass_criteria: Json | null
          required_roles: string[] | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          category?: string | null
          ceu_credits?: number | null
          content_data?: Json | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duration_estimate_minutes?: number | null
          id?: string
          pass_criteria?: Json | null
          required_roles?: string[] | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          category?: string | null
          ceu_credits?: number | null
          content_data?: Json | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration_estimate_minutes?: number | null
          id?: string
          pass_criteria?: Json | null
          required_roles?: string[] | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_modules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_fidelity_checks: {
        Row: {
          check_date: string
          created_at: string | null
          duration_minutes: number | null
          fidelity_percentage: number | null
          id: string
          implementer_user_id: string | null
          intervention_id: string | null
          items: Json
          items_implemented: number
          items_total: number
          notes: string | null
          observer_user_id: string
          session_id: string | null
          setting: string | null
          student_id: string
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          check_date?: string
          created_at?: string | null
          duration_minutes?: number | null
          fidelity_percentage?: number | null
          id?: string
          implementer_user_id?: string | null
          intervention_id?: string | null
          items?: Json
          items_implemented?: number
          items_total?: number
          notes?: string | null
          observer_user_id: string
          session_id?: string | null
          setting?: string | null
          student_id: string
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          check_date?: string
          created_at?: string | null
          duration_minutes?: number | null
          fidelity_percentage?: number | null
          id?: string
          implementer_user_id?: string | null
          intervention_id?: string | null
          items?: Json
          items_implemented?: number
          items_total?: number
          notes?: string | null
          observer_user_id?: string
          session_id?: string | null
          setting?: string | null
          student_id?: string
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_fidelity_checks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_fidelity_checks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_fidelity_checks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "fidelity_check_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_deduction_ledger: {
        Row: {
          authorization_id: string
          authorized_service_id: string | null
          created_at: string
          deduction_reason: string
          id: string
          notes: string | null
          performed_by: string | null
          session_id: string | null
          student_id: string
          units_deducted: number
        }
        Insert: {
          authorization_id: string
          authorized_service_id?: string | null
          created_at?: string
          deduction_reason?: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          session_id?: string | null
          student_id: string
          units_deducted: number
        }
        Update: {
          authorization_id?: string
          authorized_service_id?: string | null
          created_at?: string
          deduction_reason?: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          session_id?: string | null
          student_id?: string
          units_deducted?: number
        }
        Relationships: [
          {
            foreignKeyName: "unit_deduction_ledger_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "authorizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_deduction_ledger_authorized_service_id_fkey"
            columns: ["authorized_service_id"]
            isOneToOne: false
            referencedRelation: "authorized_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_deduction_ledger_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_deduction_ledger_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      user_agency_context: {
        Row: {
          created_at: string
          current_agency_id: string | null
          id: string
          last_switched_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_agency_id?: string | null
          id?: string
          last_switched_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_agency_id?: string | null
          id?: string
          last_switched_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_agency_context_current_agency_id_fkey"
            columns: ["current_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_custom_roles: {
        Row: {
          agency_id: string | null
          assigned_at: string
          assigned_by: string | null
          custom_role_id: string
          id: string
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          assigned_at?: string
          assigned_by?: string | null
          custom_role_id: string
          id?: string
          user_id: string
        }
        Update: {
          agency_id?: string | null
          assigned_at?: string
          assigned_by?: string | null
          custom_role_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_custom_roles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_custom_roles_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feature_flags: {
        Row: {
          auto_narratives_enabled: boolean | null
          cid_enabled: boolean | null
          cross_agency_analytics: boolean
          intervention_engine_access: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_narratives_enabled?: boolean | null
          cid_enabled?: boolean | null
          cross_agency_analytics?: boolean
          intervention_engine_access?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_narratives_enabled?: boolean | null
          cid_enabled?: boolean | null
          cross_agency_analytics?: boolean
          intervention_engine_access?: boolean | null
          updated_at?: string
          user_id?: string
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
      vb_mapp_assessment_results: {
        Row: {
          assessment_id: string
          fill_state: Database["public"]["Enums"]["vb_mapp_fill_state"]
          item_id: string
          notes_item: string | null
          result_id: string
          tested_circle: boolean
          updated_at: string
          updated_in_assessment_id: string | null
        }
        Insert: {
          assessment_id: string
          fill_state?: Database["public"]["Enums"]["vb_mapp_fill_state"]
          item_id: string
          notes_item?: string | null
          result_id?: string
          tested_circle?: boolean
          updated_at?: string
          updated_in_assessment_id?: string | null
        }
        Update: {
          assessment_id?: string
          fill_state?: Database["public"]["Enums"]["vb_mapp_fill_state"]
          item_id?: string
          notes_item?: string | null
          result_id?: string
          tested_circle?: boolean
          updated_at?: string
          updated_in_assessment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vb_mapp_assessment_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "vb_mapp_assessments"
            referencedColumns: ["assessment_id"]
          },
          {
            foreignKeyName: "vb_mapp_assessment_results_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "vb_mapp_milestones_items"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "vb_mapp_assessment_results_updated_in_assessment_id_fkey"
            columns: ["updated_in_assessment_id"]
            isOneToOne: false
            referencedRelation: "vb_mapp_assessments"
            referencedColumns: ["assessment_id"]
          },
        ]
      }
      vb_mapp_assessments: {
        Row: {
          assessment_date: string
          assessment_id: string
          created_at: string
          created_by: string | null
          examiner: string | null
          learner_id: string
          notes_global: string | null
          updated_at: string
        }
        Insert: {
          assessment_date?: string
          assessment_id?: string
          created_at?: string
          created_by?: string | null
          examiner?: string | null
          learner_id: string
          notes_global?: string | null
          updated_at?: string
        }
        Update: {
          assessment_date?: string
          assessment_id?: string
          created_at?: string
          created_by?: string | null
          examiner?: string | null
          learner_id?: string
          notes_global?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vb_mapp_assessments_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      vb_mapp_milestones_items: {
        Row: {
          code: string
          created_at: string
          domain: string
          item_id: string
          label_full: string | null
          label_short: string
          level: number
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          domain: string
          item_id?: string
          label_full?: string | null
          label_short: string
          level: number
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          domain?: string
          item_id?: string
          label_full?: string | null
          label_short?: string
          level?: number
          sort_order?: number
        }
        Relationships: []
      }
      vbmapp_assessments: {
        Row: {
          administered_by: string | null
          barrier_scores: Json | null
          completed_at: string | null
          created_at: string
          date_administered: string
          domain_scores: Json | null
          form_template_id: string | null
          id: string
          invitation_id: string | null
          milestone_scores: Json | null
          notes: string | null
          raw_responses: Json | null
          respondent_name: string | null
          respondent_relationship: string | null
          scored_at: string | null
          scored_by: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          administered_by?: string | null
          barrier_scores?: Json | null
          completed_at?: string | null
          created_at?: string
          date_administered?: string
          domain_scores?: Json | null
          form_template_id?: string | null
          id?: string
          invitation_id?: string | null
          milestone_scores?: Json | null
          notes?: string | null
          raw_responses?: Json | null
          respondent_name?: string | null
          respondent_relationship?: string | null
          scored_at?: string | null
          scored_by?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          administered_by?: string | null
          barrier_scores?: Json | null
          completed_at?: string | null
          created_at?: string
          date_administered?: string
          domain_scores?: Json | null
          form_template_id?: string | null
          id?: string
          invitation_id?: string | null
          milestone_scores?: Json | null
          notes?: string | null
          raw_responses?: Json | null
          respondent_name?: string | null
          respondent_relationship?: string | null
          scored_at?: string | null
          scored_by?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vbmapp_assessments_form_template_id_fkey"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "vbmapp_form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vbmapp_assessments_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vbmapp_assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      vbmapp_form_templates: {
        Row: {
          age_range: string | null
          created_at: string
          description: string | null
          domains: Json
          form_code: string
          form_name: string
          form_type: string
          id: string
          level: string | null
          questions: Json
          scoring_info: Json | null
          updated_at: string
        }
        Insert: {
          age_range?: string | null
          created_at?: string
          description?: string | null
          domains?: Json
          form_code: string
          form_name: string
          form_type: string
          id?: string
          level?: string | null
          questions?: Json
          scoring_info?: Json | null
          updated_at?: string
        }
        Update: {
          age_range?: string | null
          created_at?: string
          description?: string | null
          domains?: Json
          form_code?: string
          form_name?: string
          form_type?: string
          id?: string
          level?: string | null
          questions?: Json
          scoring_info?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      behavior_events: {
        Row: {
          abc_data: Json | null
          behavior_id: string | null
          behavior_name: string | null
          client_id: string | null
          created_at: string | null
          duration_seconds: number | null
          event_id: string | null
          event_type: string | null
          intensity: number | null
          is_problem: boolean | null
          occurred_at: string | null
          session_id: string | null
        }
        Insert: {
          abc_data?: Json | null
          behavior_id?: string | null
          behavior_name?: string | null
          client_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          event_id?: string | null
          event_type?: string | null
          intensity?: never
          is_problem?: never
          occurred_at?: string | null
          session_id?: string | null
        }
        Update: {
          abc_data?: Json | null
          behavior_id?: string | null
          behavior_name?: string | null
          client_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          event_id?: string | null
          event_type?: string | null
          intensity?: never
          is_problem?: never
          occurred_at?: string | null
          session_id?: string | null
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
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fidelity_checks: {
        Row: {
          client_id: string | null
          created_at: string | null
          fidelity_score: number | null
          id: string | null
        }
        Relationships: []
      }
      goal_data: {
        Row: {
          correct: boolean | null
          created_at: string | null
          data_id: string | null
          goal_id: string | null
          outcome: string | null
          prompt_level_id: string | null
          recorded_at: string | null
          target_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "target_trials_prompt_level_id_fkey"
            columns: ["prompt_level_id"]
            isOneToOne: false
            referencedRelation: "prompt_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          active: boolean | null
          client_id: string | null
          created_at: string | null
          goal_id: string | null
          goal_name: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          client_id?: string | null
          created_at?: string | null
          goal_id?: string | null
          goal_name?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          client_id?: string | null
          created_at?: string | null
          goal_id?: string | null
          goal_name?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_programs_student_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_implementation_logs: {
        Row: {
          client_id: string | null
          consistency_rating: number | null
          created_at: string | null
          id: string | null
        }
        Relationships: []
      }
      v_ci_agency_comparison: {
        Row: {
          agency_id: string | null
          agency_name: string | null
          alerts_per_10_clients: number | null
          avg_risk: number | null
          client_count: number | null
          pct_low_fidelity: number | null
          pct_stale: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ci_client_metrics_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_clinical_schedule_events_norm: {
        Row: {
          agency_id: string | null
          authorization_id: string | null
          bucket: string | null
          client_id: string | null
          created_at: string | null
          end_time: string | null
          schedule_event_id: string | null
          scheduled_date: string | null
          scheduled_hours: number | null
          staff_user_id: string | null
          start_time: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_schedule_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_schedule_events_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "authorizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_clinical_service_logs_norm: {
        Row: {
          agency_id: string | null
          authorization_id: string | null
          bucket: string | null
          client_id: string | null
          created_at: string | null
          hours: number | null
          notes: string | null
          occurred_at: string | null
          service_date: string | null
          service_log_id: string | null
          staff_user_id: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_service_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_service_logs_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "authorizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_user:
        | { Args: { _user_id: string }; Returns: boolean }
        | { Args: { _approved_by: string; _user_id: string }; Returns: boolean }
      can_schedule_rbt: {
        Args: { _session_date: string; _staff_user_id: string }
        Returns: {
          allowed: boolean
          reason: string
        }[]
      }
      check_pin_rate_limit: {
        Args: { _email: string; _ip_address: string }
        Returns: boolean
      }
      ci_classify_severity: {
        Args: {
          _action: number
          _critical: number
          _direction: string
          _value: number
          _watch: number
        }
        Returns: string
      }
      ci_data_freshness: { Args: { days_since_last: number }; Returns: number }
      ci_parent_impl: {
        Args: { avg_consistency: number; modules_completed: number }
        Returns: number
      }
      ci_refresh_alerts: {
        Args: { p_agency_id?: string; p_data_source_id?: string }
        Returns: undefined
      }
      ci_refresh_all: {
        Args: { _agency_id?: string; _data_source_id?: string }
        Returns: string
      }
      ci_refresh_metrics: {
        Args: { p_agency_id?: string; p_data_source_id?: string }
        Returns: undefined
      }
      ci_risk_score: {
        Args: {
          avg_intensity: number
          data_freshness: number
          fidelity_score: number
          parent_impl_score: number
          severity_level: string
          trend_score: number
        }
        Returns: number
      }
      ci_trend_score: {
        Args: { prior_rate: number; recent_rate: number }
        Returns: number
      }
      cleanup_old_pin_attempts: { Args: never; Returns: undefined }
      compute_distance_miles: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      effective_cid_access: { Args: { _user_id: string }; Returns: boolean }
      effective_cross_agency_access: {
        Args: { _user_id: string }
        Returns: boolean
      }
      estimate_travel_time_minutes: {
        Args: { distance_miles: number }
        Returns: number
      }
      fork_curriculum_item: {
        Args: { _agency_id: string; _item_id: string }
        Returns: string
      }
      fork_curriculum_system: {
        Args: { _agency_id: string; _system_id: string }
        Returns: string
      }
      generate_agency_slug: { Args: { _name: string }; Returns: string }
      generate_claim_number: { Args: never; Returns: string }
      get_client_coverage_mode: {
        Args: { _client_id: string }
        Returns: string
      }
      get_clinician_patient_count: {
        Args: { _user_id: string }
        Returns: number
      }
      get_current_agency_id: { Args: { _user_id: string }; Returns: string }
      get_pending_approval_count: { Args: never; Returns: number }
      get_staff_supervisor: {
        Args: { _staff_user_id: string }
        Returns: string
      }
      get_supervisor_clinician_count: {
        Args: { _user_id: string }
        Returns: number
      }
      get_user_feature_permissions: {
        Args: { _user_id: string }
        Returns: {
          activity_tracking: boolean | null
          add_new_client: boolean | null
          add_new_payer: boolean | null
          add_new_staff: boolean | null
          all_clients: boolean | null
          all_staff: boolean | null
          appointment_info: boolean | null
          ar_fix_claims: boolean | null
          ar_manager: boolean | null
          ar_post_payment: boolean | null
          ar_readiness: boolean | null
          ar_rebill: boolean | null
          ar_reports: boolean | null
          billing_billed_files: boolean | null
          billing_financials: boolean | null
          billing_generate_invoice: boolean | null
          billing_payment_source: boolean | null
          billing_provider_identifier: boolean | null
          billing_verification_forms: boolean | null
          cancel_appointment: boolean | null
          client_assignments: boolean | null
          client_authorization: boolean | null
          client_cabinet: boolean | null
          client_contacts: boolean | null
          client_custom_fields: boolean | null
          client_info: boolean | null
          client_list: boolean | null
          client_personal_info: boolean | null
          client_profile: boolean | null
          create_appointment: boolean | null
          created_at: string
          dashboard_active_auths: boolean | null
          dashboard_active_clients: boolean | null
          dashboard_active_staff: boolean | null
          dashboard_aging_report: boolean | null
          dashboard_billing_summary: boolean | null
          dashboard_cancelled_summary: boolean | null
          dashboard_daily_appointments: boolean | null
          dashboard_expiring_quals: boolean | null
          dashboard_incomplete_appts: boolean | null
          dashboard_miles_driven: boolean | null
          dashboard_scheduled_vs_completed: boolean | null
          dashboard_staff_summary: boolean | null
          dashboard_unbilled_appts: boolean | null
          dashboard_weekly_hours: boolean | null
          delete_appointment: boolean | null
          id: string
          manage_clinical_teams: boolean | null
          master_availability: boolean | null
          menu_billing: boolean | null
          menu_client: boolean | null
          menu_forms: boolean | null
          menu_payer: boolean | null
          menu_payroll: boolean | null
          menu_reports: boolean | null
          menu_schedule: boolean | null
          menu_settings: boolean | null
          menu_staff: boolean | null
          my_schedule: boolean | null
          notifications: boolean | null
          other_schedule: boolean | null
          payer_cabinet: boolean | null
          payer_info: boolean | null
          payer_list: boolean | null
          payer_profile: boolean | null
          payer_services: boolean | null
          payroll_financials: boolean | null
          reports_appointment_billing: boolean | null
          reports_appointment_list: boolean | null
          reports_authorization_summary: boolean | null
          reports_billing_ledger: boolean | null
          reports_client_aging: boolean | null
          reports_client_list: boolean | null
          reports_expiring_authorization: boolean | null
          reports_payer_aging: boolean | null
          reports_payer_list: boolean | null
          reports_payroll: boolean | null
          reports_profit_loss: boolean | null
          reports_staff_list: boolean | null
          reports_staff_productivity: boolean | null
          reports_user_login_history: boolean | null
          schedule_billing: boolean | null
          schedule_documents: boolean | null
          schedule_verification: boolean | null
          settings_cancellation_types: boolean | null
          settings_custom_fields: boolean | null
          settings_custom_lists: boolean | null
          settings_organization: boolean | null
          settings_payroll: boolean | null
          settings_qualifications: boolean | null
          settings_security: boolean | null
          settings_services: boolean | null
          settings_subscription: boolean | null
          settings_system: boolean | null
          settings_text_reminders: boolean | null
          staff_cabinet: boolean | null
          staff_custom_fields: boolean | null
          staff_info: boolean | null
          staff_list: boolean | null
          staff_pay_rates: boolean | null
          staff_personal_info: boolean | null
          staff_profile: boolean | null
          staff_qualifications: boolean | null
          staff_supervisor: boolean | null
          teacher_mode_access: boolean | null
          teacher_mode_only: boolean | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "feature_permissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_active_supervisor: {
        Args: { _staff_user_id: string }
        Returns: boolean
      }
      has_agency_access: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
      has_agency_student_access: {
        Args: { _student_id: string; _user_id: string }
        Returns: boolean
      }
      has_billing_access: { Args: { check_user_id: string }; Returns: boolean }
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
      has_supervision_access: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      has_tag_based_access: {
        Args: { _student_id: string; _user_id: string }
        Returns: boolean
      }
      insert_audit_log: {
        Args: {
          _action: string
          _details?: Json
          _resource_id?: string
          _resource_name?: string
          _resource_type: string
        }
        Returns: string
      }
      insert_data_access_log: {
        Args: {
          _access_type: string
          _data_category: string
          _details?: Json
          _student_id: string
        }
        Returns: string
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_agency_admin: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
      is_coverage_verification_due: {
        Args: { _client_id: string }
        Returns: boolean
      }
      is_intake_coordinator: {
        Args: { check_user_id: string }
        Returns: boolean
      }
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
      resolve_alert_threshold: {
        Args: {
          _agency_id?: string
          _behavior_category?: string
          _behavior_function?: string
          _behavior_id?: string
          _category: string
          _client_id?: string
          _phase?: string
          _setting?: string
        }
        Returns: {
          action_threshold: number
          comparison_direction: string
          critical_threshold: number
          resolved_id: string
          resolved_scope: string
          watch_threshold: number
        }[]
      }
      resolve_criteria: {
        Args: { _criteria_type: string; _target_id: string }
        Returns: string
      }
      revoke_user_access: { Args: { _user_id: string }; Returns: boolean }
      set_user_pin: {
        Args: { _pin: string; _user_id: string }
        Returns: boolean
      }
      skill_program_student_id: {
        Args: { p_program_id: string }
        Returns: string
      }
      skill_target_student_id: {
        Args: { p_target_id: string }
        Returns: string
      }
      switch_agency: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_pin: { Args: { _user_id: string }; Returns: boolean }
      user_session_ids: { Args: { p_user_id: string }; Returns: string[] }
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
      toi_contributor:
        | "medication_change"
        | "missed_dose"
        | "illness"
        | "poor_sleep_night"
        | "unknown"
        | "other"
      toi_event_type:
        | "TOI_SLEEPING"
        | "TOI_NURSE_OFFICE"
        | "TOI_HEALTH_ROOM_REST"
        | "TOI_MED_SIDE_EFFECT_FATIGUE"
        | "TOI_ILLNESS_LETHARGY"
        | "TOI_DECOMPRESSION_BREAK"
        | "TOI_WAITING_PICKUP"
        | "TOI_OTHER"
      toi_location:
        | "classroom"
        | "nurse"
        | "office"
        | "sensory_room"
        | "outside"
        | "other"
      vb_mapp_fill_state: "EMPTY" | "HALF" | "FULL"
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
      toi_contributor: [
        "medication_change",
        "missed_dose",
        "illness",
        "poor_sleep_night",
        "unknown",
        "other",
      ],
      toi_event_type: [
        "TOI_SLEEPING",
        "TOI_NURSE_OFFICE",
        "TOI_HEALTH_ROOM_REST",
        "TOI_MED_SIDE_EFFECT_FATIGUE",
        "TOI_ILLNESS_LETHARGY",
        "TOI_DECOMPRESSION_BREAK",
        "TOI_WAITING_PICKUP",
        "TOI_OTHER",
      ],
      toi_location: [
        "classroom",
        "nurse",
        "office",
        "sensory_room",
        "outside",
        "other",
      ],
      vb_mapp_fill_state: ["EMPTY", "HALF", "FULL"],
    },
  },
} as const
