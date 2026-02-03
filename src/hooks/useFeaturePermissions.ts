import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface FeaturePermissions {
  // Menu/Navigation Access
  menu_staff: boolean;
  menu_client: boolean;
  menu_payer: boolean;
  menu_schedule: boolean;
  menu_billing: boolean;
  menu_payroll: boolean;
  menu_reports: boolean;
  menu_settings: boolean;
  menu_forms: boolean;
  
  // General Access
  billing_financials: boolean;
  payroll_financials: boolean;
  all_staff: boolean;
  all_clients: boolean;
  activity_tracking: boolean;
  notifications: boolean;
  
  // Staff Permissions
  staff_list: boolean;
  staff_info: boolean;
  staff_profile: boolean;
  staff_personal_info: boolean;
  staff_custom_fields: boolean;
  staff_supervisor: boolean;
  staff_qualifications: boolean;
  staff_pay_rates: boolean;
  staff_cabinet: boolean;
  add_new_staff: boolean;
  manage_clinical_teams: boolean;
  
  // Client Permissions
  client_list: boolean;
  client_info: boolean;
  client_profile: boolean;
  client_personal_info: boolean;
  client_custom_fields: boolean;
  client_contacts: boolean;
  client_assignments: boolean;
  client_authorization: boolean;
  client_cabinet: boolean;
  add_new_client: boolean;
  
  // Payer Permissions
  payer_list: boolean;
  payer_info: boolean;
  payer_profile: boolean;
  payer_services: boolean;
  payer_cabinet: boolean;
  add_new_payer: boolean;
  
  // Schedule Permissions
  my_schedule: boolean;
  create_appointment: boolean;
  appointment_info: boolean;
  cancel_appointment: boolean;
  delete_appointment: boolean;
  schedule_verification: boolean;
  schedule_billing: boolean;
  master_availability: boolean;
  schedule_documents: boolean;
  other_schedule: boolean;
  
  // Billing Permissions (Accounts Receivable)
  ar_manager: boolean;
  ar_post_payment: boolean;
  ar_fix_claims: boolean;
  ar_reports: boolean;
  ar_rebill: boolean;
  ar_readiness: boolean;
  
  // Billing Manager
  billing_generate_invoice: boolean;
  billing_provider_identifier: boolean;
  billing_verification_forms: boolean;
  billing_payment_source: boolean;
  billing_billed_files: boolean;
  
  // Reports Permissions
  reports_staff_list: boolean;
  reports_client_list: boolean;
  reports_payer_list: boolean;
  reports_appointment_list: boolean;
  reports_authorization_summary: boolean;
  reports_profit_loss: boolean;
  reports_staff_productivity: boolean;
  reports_user_login_history: boolean;
  reports_expiring_authorization: boolean;
  reports_appointment_billing: boolean;
  reports_payroll: boolean;
  reports_payer_aging: boolean;
  reports_client_aging: boolean;
  reports_billing_ledger: boolean;
  
  // Settings Permissions
  settings_cancellation_types: boolean;
  settings_custom_lists: boolean;
  settings_custom_fields: boolean;
  settings_organization: boolean;
  settings_payroll: boolean;
  settings_qualifications: boolean;
  settings_services: boolean;
  settings_security: boolean;
  settings_system: boolean;
  settings_subscription: boolean;
  settings_text_reminders: boolean;
  
  // Dashboard Widgets
  dashboard_active_staff: boolean;
  dashboard_active_clients: boolean;
  dashboard_active_auths: boolean;
  dashboard_expiring_quals: boolean;
  dashboard_incomplete_appts: boolean;
  dashboard_unbilled_appts: boolean;
  dashboard_staff_summary: boolean;
  dashboard_aging_report: boolean;
  dashboard_billing_summary: boolean;
  dashboard_scheduled_vs_completed: boolean;
  dashboard_daily_appointments: boolean;
  dashboard_cancelled_summary: boolean;
  dashboard_weekly_hours: boolean;
  dashboard_miles_driven: boolean;
  
  loading: boolean;
}

// Default permissions for different roles
const DEFAULT_PERMISSIONS: Record<string, Partial<FeaturePermissions>> = {
  super_admin: {
    menu_staff: true,
    menu_client: true,
    menu_payer: true,
    menu_schedule: true,
    menu_billing: true,
    menu_payroll: true,
    menu_reports: true,
    menu_settings: true,
    menu_forms: true,
    billing_financials: true,
    payroll_financials: true,
    all_staff: true,
    all_clients: true,
    activity_tracking: true,
    notifications: true,
    staff_list: true,
    staff_info: true,
    staff_profile: true,
    staff_personal_info: true,
    staff_custom_fields: true,
    staff_supervisor: true,
    staff_qualifications: true,
    staff_pay_rates: true,
    staff_cabinet: true,
    add_new_staff: true,
    manage_clinical_teams: true,
    client_list: true,
    client_info: true,
    client_profile: true,
    client_personal_info: true,
    client_custom_fields: true,
    client_contacts: true,
    client_assignments: true,
    client_authorization: true,
    client_cabinet: true,
    add_new_client: true,
    payer_list: true,
    payer_info: true,
    payer_profile: true,
    payer_services: true,
    payer_cabinet: true,
    add_new_payer: true,
    my_schedule: true,
    create_appointment: true,
    appointment_info: true,
    cancel_appointment: true,
    delete_appointment: true,
    schedule_verification: true,
    schedule_billing: true,
    master_availability: true,
    schedule_documents: true,
    other_schedule: true,
    ar_manager: true,
    ar_post_payment: true,
    ar_fix_claims: true,
    ar_reports: true,
    ar_rebill: true,
    ar_readiness: true,
    billing_generate_invoice: true,
    billing_provider_identifier: true,
    billing_verification_forms: true,
    billing_payment_source: true,
    billing_billed_files: true,
    reports_staff_list: true,
    reports_client_list: true,
    reports_payer_list: true,
    reports_appointment_list: true,
    reports_authorization_summary: true,
    reports_profit_loss: true,
    reports_staff_productivity: true,
    reports_user_login_history: true,
    reports_expiring_authorization: true,
    reports_appointment_billing: true,
    reports_payroll: true,
    reports_payer_aging: true,
    reports_client_aging: true,
    reports_billing_ledger: true,
    settings_cancellation_types: true,
    settings_custom_lists: true,
    settings_custom_fields: true,
    settings_organization: true,
    settings_payroll: true,
    settings_qualifications: true,
    settings_services: true,
    settings_security: true,
    settings_system: true,
    settings_subscription: true,
    settings_text_reminders: true,
    dashboard_active_staff: true,
    dashboard_active_clients: true,
    dashboard_active_auths: true,
    dashboard_expiring_quals: true,
    dashboard_incomplete_appts: true,
    dashboard_unbilled_appts: true,
    dashboard_staff_summary: true,
    dashboard_aging_report: true,
    dashboard_billing_summary: true,
    dashboard_scheduled_vs_completed: true,
    dashboard_daily_appointments: true,
    dashboard_cancelled_summary: true,
    dashboard_weekly_hours: true,
    dashboard_miles_driven: true,
  },
  admin: {
    menu_staff: true,
    menu_client: true,
    menu_payer: true,
    menu_schedule: true,
    menu_billing: true,
    menu_payroll: false,
    menu_reports: true,
    menu_settings: true,
    menu_forms: true,
    billing_financials: true,
    payroll_financials: false,
    all_staff: true,
    all_clients: true,
    activity_tracking: true,
    notifications: true,
    staff_list: true,
    staff_info: true,
    staff_profile: true,
    staff_personal_info: true,
    staff_custom_fields: true,
    staff_supervisor: true,
    staff_qualifications: true,
    staff_pay_rates: false,
    staff_cabinet: true,
    add_new_staff: true,
    manage_clinical_teams: true,
    client_list: true,
    client_info: true,
    client_profile: true,
    client_personal_info: true,
    client_custom_fields: true,
    client_contacts: true,
    client_assignments: true,
    client_authorization: true,
    client_cabinet: true,
    add_new_client: true,
    payer_list: true,
    payer_info: true,
    payer_profile: true,
    payer_services: true,
    payer_cabinet: true,
    add_new_payer: true,
    my_schedule: true,
    create_appointment: true,
    appointment_info: true,
    cancel_appointment: true,
    delete_appointment: true,
    schedule_verification: true,
    schedule_billing: true,
    master_availability: true,
    schedule_documents: true,
    other_schedule: true,
    ar_manager: true,
    ar_post_payment: true,
    ar_fix_claims: true,
    ar_reports: true,
    ar_rebill: true,
    ar_readiness: true,
    billing_generate_invoice: true,
    billing_provider_identifier: true,
    billing_verification_forms: true,
    billing_payment_source: true,
    billing_billed_files: true,
    reports_staff_list: true,
    reports_client_list: true,
    reports_payer_list: true,
    reports_appointment_list: true,
    reports_authorization_summary: true,
    reports_profit_loss: false,
    reports_staff_productivity: true,
    reports_user_login_history: true,
    reports_expiring_authorization: true,
    reports_appointment_billing: true,
    reports_payroll: false,
    reports_payer_aging: true,
    reports_client_aging: true,
    reports_billing_ledger: true,
    settings_cancellation_types: true,
    settings_custom_lists: true,
    settings_custom_fields: true,
    settings_organization: true,
    settings_payroll: false,
    settings_qualifications: true,
    settings_services: true,
    settings_security: true,
    settings_system: true,
    settings_subscription: false,
    settings_text_reminders: true,
    dashboard_active_staff: true,
    dashboard_active_clients: true,
    dashboard_active_auths: true,
    dashboard_expiring_quals: true,
    dashboard_incomplete_appts: true,
    dashboard_unbilled_appts: true,
    dashboard_staff_summary: true,
    dashboard_aging_report: true,
    dashboard_billing_summary: true,
    dashboard_scheduled_vs_completed: true,
    dashboard_daily_appointments: true,
    dashboard_cancelled_summary: true,
    dashboard_weekly_hours: true,
    dashboard_miles_driven: true,
  },
  staff: {
    menu_staff: false,
    menu_client: true,
    menu_payer: false,
    menu_schedule: true,
    menu_billing: false,
    menu_payroll: false,
    menu_reports: true,
    menu_settings: false,
    menu_forms: true,
    billing_financials: false,
    payroll_financials: false,
    all_staff: false,
    all_clients: false,
    activity_tracking: false,
    notifications: true,
    staff_list: false,
    staff_info: false,
    staff_profile: false,
    staff_personal_info: false,
    staff_custom_fields: false,
    staff_supervisor: false,
    staff_qualifications: false,
    staff_pay_rates: false,
    staff_cabinet: false,
    add_new_staff: false,
    manage_clinical_teams: false,
    client_list: true,
    client_info: true,
    client_profile: true,
    client_personal_info: true,
    client_custom_fields: true,
    client_contacts: true,
    client_assignments: true,
    client_authorization: false,
    client_cabinet: true,
    add_new_client: false,
    payer_list: false,
    payer_info: false,
    payer_profile: false,
    payer_services: false,
    payer_cabinet: false,
    add_new_payer: false,
    my_schedule: true,
    create_appointment: true,
    appointment_info: true,
    cancel_appointment: true,
    delete_appointment: false,
    schedule_verification: false,
    schedule_billing: false,
    master_availability: false,
    schedule_documents: true,
    other_schedule: false,
    ar_manager: false,
    ar_post_payment: false,
    ar_fix_claims: false,
    ar_reports: false,
    ar_rebill: false,
    ar_readiness: false,
    billing_generate_invoice: false,
    billing_provider_identifier: false,
    billing_verification_forms: false,
    billing_payment_source: false,
    billing_billed_files: false,
    reports_staff_list: false,
    reports_client_list: true,
    reports_payer_list: false,
    reports_appointment_list: true,
    reports_authorization_summary: false,
    reports_profit_loss: false,
    reports_staff_productivity: false,
    reports_user_login_history: false,
    reports_expiring_authorization: false,
    reports_appointment_billing: false,
    reports_payroll: false,
    reports_payer_aging: false,
    reports_client_aging: false,
    reports_billing_ledger: false,
    settings_cancellation_types: false,
    settings_custom_lists: false,
    settings_custom_fields: false,
    settings_organization: false,
    settings_payroll: false,
    settings_qualifications: false,
    settings_services: false,
    settings_security: false,
    settings_system: false,
    settings_subscription: false,
    settings_text_reminders: false,
    dashboard_active_staff: false,
    dashboard_active_clients: true,
    dashboard_active_auths: false,
    dashboard_expiring_quals: false,
    dashboard_incomplete_appts: true,
    dashboard_unbilled_appts: false,
    dashboard_staff_summary: false,
    dashboard_aging_report: false,
    dashboard_billing_summary: false,
    dashboard_scheduled_vs_completed: true,
    dashboard_daily_appointments: true,
    dashboard_cancelled_summary: false,
    dashboard_weekly_hours: true,
    dashboard_miles_driven: true,
  },
  viewer: {
    menu_staff: false,
    menu_client: true,
    menu_payer: false,
    menu_schedule: true,
    menu_billing: false,
    menu_payroll: false,
    menu_reports: true,
    menu_settings: false,
    menu_forms: false,
    billing_financials: false,
    payroll_financials: false,
    all_staff: false,
    all_clients: false,
    activity_tracking: false,
    notifications: true,
    staff_list: false,
    staff_info: false,
    staff_profile: false,
    staff_personal_info: false,
    staff_custom_fields: false,
    staff_supervisor: false,
    staff_qualifications: false,
    staff_pay_rates: false,
    staff_cabinet: false,
    add_new_staff: false,
    manage_clinical_teams: false,
    client_list: true,
    client_info: true,
    client_profile: true,
    client_personal_info: false,
    client_custom_fields: false,
    client_contacts: true,
    client_assignments: false,
    client_authorization: false,
    client_cabinet: false,
    add_new_client: false,
    payer_list: false,
    payer_info: false,
    payer_profile: false,
    payer_services: false,
    payer_cabinet: false,
    add_new_payer: false,
    my_schedule: true,
    create_appointment: false,
    appointment_info: true,
    cancel_appointment: false,
    delete_appointment: false,
    schedule_verification: false,
    schedule_billing: false,
    master_availability: false,
    schedule_documents: true,
    other_schedule: false,
    ar_manager: false,
    ar_post_payment: false,
    ar_fix_claims: false,
    ar_reports: false,
    ar_rebill: false,
    ar_readiness: false,
    billing_generate_invoice: false,
    billing_provider_identifier: false,
    billing_verification_forms: false,
    billing_payment_source: false,
    billing_billed_files: false,
    reports_staff_list: false,
    reports_client_list: true,
    reports_payer_list: false,
    reports_appointment_list: true,
    reports_authorization_summary: false,
    reports_profit_loss: false,
    reports_staff_productivity: false,
    reports_user_login_history: false,
    reports_expiring_authorization: false,
    reports_appointment_billing: false,
    reports_payroll: false,
    reports_payer_aging: false,
    reports_client_aging: false,
    reports_billing_ledger: false,
    settings_cancellation_types: false,
    settings_custom_lists: false,
    settings_custom_fields: false,
    settings_organization: false,
    settings_payroll: false,
    settings_qualifications: false,
    settings_services: false,
    settings_security: false,
    settings_system: false,
    settings_subscription: false,
    settings_text_reminders: false,
    dashboard_active_staff: false,
    dashboard_active_clients: true,
    dashboard_active_auths: false,
    dashboard_expiring_quals: false,
    dashboard_incomplete_appts: false,
    dashboard_unbilled_appts: false,
    dashboard_staff_summary: false,
    dashboard_aging_report: false,
    dashboard_billing_summary: false,
    dashboard_scheduled_vs_completed: true,
    dashboard_daily_appointments: true,
    dashboard_cancelled_summary: false,
    dashboard_weekly_hours: true,
    dashboard_miles_driven: true,
  },
};

const defaultPermissions: FeaturePermissions = {
  menu_staff: false,
  menu_client: true,
  menu_payer: false,
  menu_schedule: true,
  menu_billing: false,
  menu_payroll: false,
  menu_reports: true,
  menu_settings: false,
  menu_forms: true,
  billing_financials: false,
  payroll_financials: false,
  all_staff: false,
  all_clients: false,
  activity_tracking: false,
  notifications: true,
  staff_list: false,
  staff_info: false,
  staff_profile: false,
  staff_personal_info: false,
  staff_custom_fields: false,
  staff_supervisor: false,
  staff_qualifications: false,
  staff_pay_rates: false,
  staff_cabinet: false,
  add_new_staff: false,
  manage_clinical_teams: false,
  client_list: true,
  client_info: true,
  client_profile: true,
  client_personal_info: true,
  client_custom_fields: true,
  client_contacts: true,
  client_assignments: true,
  client_authorization: false,
  client_cabinet: true,
  add_new_client: false,
  payer_list: false,
  payer_info: false,
  payer_profile: false,
  payer_services: false,
  payer_cabinet: false,
  add_new_payer: false,
  my_schedule: true,
  create_appointment: true,
  appointment_info: true,
  cancel_appointment: true,
  delete_appointment: false,
  schedule_verification: false,
  schedule_billing: false,
  master_availability: false,
  schedule_documents: true,
  other_schedule: false,
  ar_manager: false,
  ar_post_payment: false,
  ar_fix_claims: false,
  ar_reports: false,
  ar_rebill: false,
  ar_readiness: false,
  billing_generate_invoice: false,
  billing_provider_identifier: false,
  billing_verification_forms: false,
  billing_payment_source: false,
  billing_billed_files: false,
  reports_staff_list: false,
  reports_client_list: true,
  reports_payer_list: false,
  reports_appointment_list: true,
  reports_authorization_summary: false,
  reports_profit_loss: false,
  reports_staff_productivity: false,
  reports_user_login_history: false,
  reports_expiring_authorization: false,
  reports_appointment_billing: false,
  reports_payroll: false,
  reports_payer_aging: false,
  reports_client_aging: false,
  reports_billing_ledger: false,
  settings_cancellation_types: false,
  settings_custom_lists: false,
  settings_custom_fields: false,
  settings_organization: false,
  settings_payroll: false,
  settings_qualifications: false,
  settings_services: false,
  settings_security: false,
  settings_system: false,
  settings_subscription: false,
  settings_text_reminders: false,
  dashboard_active_staff: false,
  dashboard_active_clients: true,
  dashboard_active_auths: false,
  dashboard_expiring_quals: false,
  dashboard_incomplete_appts: true,
  dashboard_unbilled_appts: false,
  dashboard_staff_summary: false,
  dashboard_aging_report: false,
  dashboard_billing_summary: false,
  dashboard_scheduled_vs_completed: true,
  dashboard_daily_appointments: true,
  dashboard_cancelled_summary: false,
  dashboard_weekly_hours: true,
  dashboard_miles_driven: true,
  loading: true,
};

export function useFeaturePermissions(): FeaturePermissions {
  const { user, userRole } = useAuth();
  const [permissions, setPermissions] = useState<FeaturePermissions>(defaultPermissions);

  useEffect(() => {
    if (!user) {
      setPermissions({ ...defaultPermissions, loading: false });
      return;
    }

    const fetchPermissions = async () => {
      try {
        // Try to get user-specific permissions from database
        const { data, error } = await supabase
          .from('feature_permissions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          // User has custom permissions
          const { id, user_id, created_at, updated_at, ...perms } = data as any;
          setPermissions({ ...perms, loading: false });
        } else {
          // Use role-based defaults
          const roleDefaults = DEFAULT_PERMISSIONS[userRole || 'viewer'] || DEFAULT_PERMISSIONS.viewer;
          setPermissions({ ...defaultPermissions, ...roleDefaults, loading: false });
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
        // Fall back to role-based defaults
        const roleDefaults = DEFAULT_PERMISSIONS[userRole || 'viewer'] || DEFAULT_PERMISSIONS.viewer;
        setPermissions({ ...defaultPermissions, ...roleDefaults, loading: false });
      }
    };

    fetchPermissions();
  }, [user, userRole]);

  return permissions;
}

// Hook for checking a single permission
export function useHasPermission(permissionKey: keyof Omit<FeaturePermissions, 'loading'>): boolean {
  const permissions = useFeaturePermissions();
  return permissions[permissionKey] || false;
}

// Utility function for programmatic permission checking
export function getDefaultPermissionsForRole(role: string): Partial<FeaturePermissions> {
  return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.viewer;
}
