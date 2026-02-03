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
          location_detail: string | null
          notes: string | null
          recurrence_rule: Json | null
          service_setting: string | null
          service_type: string | null
          staff_user_id: string | null
          staff_user_ids: string[] | null
          start_time: string
          status: string
          student_id: string | null
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
          linked_session_id?: string | null
          location_detail?: string | null
          notes?: string | null
          recurrence_rule?: Json | null
          service_setting?: string | null
          service_type?: string | null
          staff_user_id?: string | null
          staff_user_ids?: string[] | null
          start_time: string
          status?: string
          student_id?: string | null
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
          linked_session_id?: string | null
          location_detail?: string | null
          notes?: string | null
          recurrence_rule?: Json | null
          service_setting?: string | null
          service_type?: string | null
          staff_user_id?: string | null
          staff_user_ids?: string[] | null
          start_time?: string
          status?: string
          student_id?: string | null
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
      curriculum_items: {
        Row: {
          active: boolean
          age_band_max: number | null
          age_band_min: number | null
          code: string | null
          created_at: string
          curriculum_system_id: string
          description: string | null
          display_order: number | null
          domain_id: string | null
          id: string
          keywords: string[] | null
          level: string | null
          mastery_criteria: string | null
          prerequisites: string[] | null
          source_reference: string | null
          teaching_notes: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          age_band_max?: number | null
          age_band_min?: number | null
          code?: string | null
          created_at?: string
          curriculum_system_id: string
          description?: string | null
          display_order?: number | null
          domain_id?: string | null
          id?: string
          keywords?: string[] | null
          level?: string | null
          mastery_criteria?: string | null
          prerequisites?: string[] | null
          source_reference?: string | null
          teaching_notes?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          age_band_max?: number | null
          age_band_min?: number | null
          code?: string | null
          created_at?: string
          curriculum_system_id?: string
          description?: string | null
          display_order?: number | null
          domain_id?: string | null
          id?: string
          keywords?: string[] | null
          level?: string | null
          mastery_criteria?: string | null
          prerequisites?: string[] | null
          source_reference?: string | null
          teaching_notes?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
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
        ]
      }
      curriculum_systems: {
        Row: {
          active: boolean
          age_range_max_months: number | null
          age_range_min_months: number | null
          created_at: string
          description: string | null
          id: string
          name: string
          publisher: string | null
          tags: string[] | null
          type: string
          updated_at: string
          version: string | null
        }
        Insert: {
          active?: boolean
          age_range_max_months?: number | null
          age_range_min_months?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          publisher?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          active?: boolean
          age_range_max_months?: number | null
          age_range_min_months?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          publisher?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          version?: string | null
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
          category: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
      era_remittances: {
        Row: {
          adjustment_codes: Json | null
          check_number: string | null
          claim_id: string | null
          created_at: string
          id: string
          paid_amount: number
          payer_claim_number: string | null
          raw_data: Json | null
          remark_codes: Json | null
          remittance_date: string
        }
        Insert: {
          adjustment_codes?: Json | null
          check_number?: string | null
          claim_id?: string | null
          created_at?: string
          id?: string
          paid_amount: number
          payer_claim_number?: string | null
          raw_data?: Json | null
          remark_codes?: Json | null
          remittance_date: string
        }
        Update: {
          adjustment_codes?: Json | null
          check_number?: string | null
          claim_id?: string | null
          created_at?: string
          id?: string
          paid_amount?: number
          payer_claim_number?: string | null
          raw_data?: Json | null
          remark_codes?: Json | null
          remittance_date?: string
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
      org_goal_templates: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          data_collection_type: string | null
          description: string | null
          domain_id: string | null
          generalization_notes: string | null
          id: string
          mastery_criteria: string | null
          prompting_notes: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          data_collection_type?: string | null
          description?: string | null
          domain_id?: string | null
          generalization_notes?: string | null
          id?: string
          mastery_criteria?: string | null
          prompting_notes?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          data_collection_type?: string | null
          description?: string | null
          domain_id?: string | null
          generalization_notes?: string | null
          id?: string
          mastery_criteria?: string | null
          prompting_notes?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_goal_templates_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
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
      payers: {
        Row: {
          address: string | null
          billing_notes: string | null
          created_at: string
          email: string | null
          fax: string | null
          id: string
          is_active: boolean | null
          name: string
          payer_type: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          billing_notes?: string | null
          created_at?: string
          email?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          payer_type?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          billing_notes?: string | null
          created_at?: string
          email?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          payer_type?: string | null
          phone?: string | null
          updated_at?: string
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
          address: string | null
          allowed_service_types: Json | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string
          credential: string | null
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
            foreignKeyName: "profiles_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
          appointment_id: string | null
          attendance_outcome: string | null
          attendance_reason_code: string | null
          attendance_reason_detail: string | null
          authorization_id: string | null
          authorization_status: string | null
          authorized_service_id: string | null
          billing_status: string | null
          created_at: string
          end_time: string | null
          funding_mode_snapshot: string | null
          has_data: boolean | null
          id: string
          interval_length_seconds: number
          location_detail: string | null
          name: string
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
          created_at?: string
          end_time?: string | null
          funding_mode_snapshot?: string | null
          has_data?: boolean | null
          id?: string
          interval_length_seconds?: number
          location_detail?: string | null
          name: string
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
          created_at?: string
          end_time?: string | null
          funding_mode_snapshot?: string | null
          has_data?: boolean | null
          id?: string
          interval_length_seconds?: number
          location_detail?: string | null
          name?: string
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
          archived_at: string | null
          assessment_mode_enabled: boolean | null
          background_info: Json | null
          behaviors: Json | null
          bip_data: Json | null
          brief_record_review: Json | null
          brief_teacher_inputs: Json | null
          case_closed_date: string | null
          case_opened_date: string | null
          case_types: Json | null
          color: string
          contact_email: string | null
          contact_phone: string | null
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
          fba_findings: Json | null
          fba_workflow_progress: Json | null
          first_name: string | null
          funding_mode: string | null
          goals: Json | null
          grade: string | null
          historical_data: Json | null
          id: string
          indirect_assessments: Json | null
          insurance_alerts_background: boolean | null
          insurance_tracking_state: string | null
          is_archived: boolean
          last_name: string | null
          legal_first_name: string | null
          legal_last_name: string | null
          name: string
          narrative_notes: Json | null
          notes_required: boolean | null
          preferred_name: string | null
          primary_setting: string | null
          primary_supervisor_staff_id: string | null
          profile_completeness_status: string | null
          pronouns: string | null
          school: string | null
          school_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activation_status?: string | null
          archived_at?: string | null
          assessment_mode_enabled?: boolean | null
          background_info?: Json | null
          behaviors?: Json | null
          bip_data?: Json | null
          brief_record_review?: Json | null
          brief_teacher_inputs?: Json | null
          case_closed_date?: string | null
          case_opened_date?: string | null
          case_types?: Json | null
          color?: string
          contact_email?: string | null
          contact_phone?: string | null
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
          fba_findings?: Json | null
          fba_workflow_progress?: Json | null
          first_name?: string | null
          funding_mode?: string | null
          goals?: Json | null
          grade?: string | null
          historical_data?: Json | null
          id?: string
          indirect_assessments?: Json | null
          insurance_alerts_background?: boolean | null
          insurance_tracking_state?: string | null
          is_archived?: boolean
          last_name?: string | null
          legal_first_name?: string | null
          legal_last_name?: string | null
          name: string
          narrative_notes?: Json | null
          notes_required?: boolean | null
          preferred_name?: string | null
          primary_setting?: string | null
          primary_supervisor_staff_id?: string | null
          profile_completeness_status?: string | null
          pronouns?: string | null
          school?: string | null
          school_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activation_status?: string | null
          archived_at?: string | null
          assessment_mode_enabled?: boolean | null
          background_info?: Json | null
          behaviors?: Json | null
          bip_data?: Json | null
          brief_record_review?: Json | null
          brief_teacher_inputs?: Json | null
          case_closed_date?: string | null
          case_opened_date?: string | null
          case_types?: Json | null
          color?: string
          contact_email?: string | null
          contact_phone?: string | null
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
          fba_findings?: Json | null
          fba_workflow_progress?: Json | null
          first_name?: string | null
          funding_mode?: string | null
          goals?: Json | null
          grade?: string | null
          historical_data?: Json | null
          id?: string
          indirect_assessments?: Json | null
          insurance_alerts_background?: boolean | null
          insurance_tracking_state?: string | null
          is_archived?: boolean
          last_name?: string | null
          legal_first_name?: string | null
          legal_last_name?: string | null
          name?: string
          narrative_notes?: Json | null
          notes_required?: boolean | null
          preferred_name?: string | null
          primary_setting?: string | null
          primary_supervisor_staff_id?: string | null
          profile_completeness_status?: string | null
          pronouns?: string | null
          school?: string | null
          school_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      compute_distance_miles: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      estimate_travel_time_minutes: {
        Args: { distance_miles: number }
        Returns: number
      }
      generate_claim_number: { Args: never; Returns: string }
      get_clinician_patient_count: {
        Args: { _user_id: string }
        Returns: number
      }
      get_pending_approval_count: { Args: never; Returns: number }
      get_staff_supervisor: {
        Args: { _staff_user_id: string }
        Returns: string
      }
      get_supervisor_clinician_count: {
        Args: { _user_id: string }
        Returns: number
      }
      has_active_supervisor: {
        Args: { _staff_user_id: string }
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
    },
  },
} as const
