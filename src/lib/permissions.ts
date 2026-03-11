// Permissions Matrix for ABA Practice Platform

export type AppRole = 'super_admin' | 'admin' | 'staff' | 'viewer';

export interface PermissionContext {
  userRole: AppRole | null;
  userId: string | null;
  isOwner?: boolean;
  isAssignedStaff?: boolean;
  isSupervisor?: boolean;
}

// Permission definitions
export const PERMISSIONS = {
  // Client Profile
  CLIENT_VIEW: 'client:view',
  CLIENT_EDIT_BASIC: 'client:edit:basic',
  CLIENT_EDIT_CLINICAL: 'client:edit:clinical',
  CLIENT_EDIT_SAFETY: 'client:edit:safety',
  CLIENT_EDIT_PLANS: 'client:edit:plans',
  CLIENT_MANAGE_TEAM: 'client:manage:team',
  
  // Sessions
  SESSION_VIEW: 'session:view',
  SESSION_CREATE: 'session:create',
  SESSION_EDIT_OWN: 'session:edit:own',
  SESSION_DATA_ENTRY: 'session:data_entry',
  
  // Notes
  NOTE_VIEW: 'note:view',
  NOTE_CREATE_DRAFT: 'note:create:draft',
  NOTE_SUBMIT: 'note:submit',
  NOTE_APPROVE: 'note:approve',
  NOTE_REJECT: 'note:reject',
  
  // Scheduling
  SCHEDULE_VIEW: 'schedule:view',
  SCHEDULE_CREATE: 'schedule:create',
  SCHEDULE_OVERRIDE: 'schedule:override',
  
  // Authorization & Billing
  AUTH_VIEW: 'authorization:view',
  AUTH_MANAGE: 'authorization:manage',
  BILLING_VIEW: 'billing:view',
  BILLING_MANAGE: 'billing:manage',
  
  // Documents
  DOC_VIEW_INTERNAL: 'document:view:internal',
  DOC_VIEW_CLINICAL: 'document:view:clinical',
  DOC_VIEW_SCHOOL: 'document:view:school',
  DOC_VIEW_PARENT: 'document:view:parent',
  DOC_MANAGE: 'document:manage',
  
  // Staff
  STAFF_VIEW: 'staff:view',
  STAFF_MANAGE: 'staff:manage',
  STAFF_MANAGE_CREDENTIALS: 'staff:manage:credentials',
  
  // Admin
  ADMIN_VIEW_ALL: 'admin:view:all',
  ADMIN_MANAGE_USERS: 'admin:manage:users',
  ADMIN_MANAGE_ROLES: 'admin:manage:roles',
  
  // IEP/Reports
  IEP_VIEW: 'iep:view',
  IEP_MANAGE: 'iep:manage',
  REPORTS_VIEW: 'reports:view',
  REPORTS_DISTRICT: 'reports:district',

  // Resource Hub
  RESOURCE_HUB_VIEW: 'resource_hub:view',
  RESOURCE_HUB_UPLOAD: 'resource_hub:upload',
  RESOURCE_HUB_DELETE_TEAM: 'resource_hub:delete:team',
  RESOURCE_HUB_MANAGE: 'resource_hub:manage',

  // Operations
  OPERATIONS_VIEW: 'operations:view',
  OPERATIONS_REFERRALS: 'operations:referrals',
  OPERATIONS_BILLING: 'operations:billing',
  OPERATIONS_AUTHORIZATIONS: 'operations:authorizations',
  OPERATIONS_INSURANCE: 'operations:insurance',
  OPERATIONS_SERVICE_REQUESTS: 'operations:service_requests',

  // Clinical Library
  CLINICAL_LIB_VIEW: 'clinical_lib:view',
  CLINICAL_LIB_CREATE_PERSONAL: 'clinical_lib:create:personal',
  CLINICAL_LIB_SUBMIT_FOR_REVIEW: 'clinical_lib:submit:review',
  CLINICAL_LIB_APPROVE: 'clinical_lib:approve',
  CLINICAL_LIB_PUBLISH_ORG: 'clinical_lib:publish:org',
} as const;

type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role-based permission matrix
const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  super_admin: Object.values(PERMISSIONS), // All permissions
  
  admin: [
    PERMISSIONS.CLIENT_VIEW,
    PERMISSIONS.CLIENT_EDIT_BASIC,
    PERMISSIONS.CLIENT_EDIT_CLINICAL,
    PERMISSIONS.CLIENT_EDIT_SAFETY,
    PERMISSIONS.CLIENT_EDIT_PLANS,
    PERMISSIONS.CLIENT_MANAGE_TEAM,
    PERMISSIONS.SESSION_VIEW,
    PERMISSIONS.SESSION_CREATE,
    PERMISSIONS.SESSION_EDIT_OWN,
    PERMISSIONS.SESSION_DATA_ENTRY,
    PERMISSIONS.NOTE_VIEW,
    PERMISSIONS.NOTE_CREATE_DRAFT,
    PERMISSIONS.NOTE_SUBMIT,
    PERMISSIONS.NOTE_APPROVE,
    PERMISSIONS.NOTE_REJECT,
    PERMISSIONS.SCHEDULE_VIEW,
    PERMISSIONS.SCHEDULE_CREATE,
    PERMISSIONS.SCHEDULE_OVERRIDE,
    PERMISSIONS.AUTH_VIEW,
    PERMISSIONS.AUTH_MANAGE,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_MANAGE,
    PERMISSIONS.DOC_VIEW_INTERNAL,
    PERMISSIONS.DOC_VIEW_CLINICAL,
    PERMISSIONS.DOC_VIEW_SCHOOL,
    PERMISSIONS.DOC_VIEW_PARENT,
    PERMISSIONS.DOC_MANAGE,
    PERMISSIONS.STAFF_VIEW,
    PERMISSIONS.STAFF_MANAGE,
    PERMISSIONS.STAFF_MANAGE_CREDENTIALS,
    PERMISSIONS.ADMIN_VIEW_ALL,
    PERMISSIONS.ADMIN_MANAGE_USERS,
    PERMISSIONS.IEP_VIEW,
    PERMISSIONS.IEP_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_DISTRICT,
    // Resource Hub
    PERMISSIONS.RESOURCE_HUB_VIEW,
    PERMISSIONS.RESOURCE_HUB_UPLOAD,
    PERMISSIONS.RESOURCE_HUB_DELETE_TEAM,
    PERMISSIONS.RESOURCE_HUB_MANAGE,
    // Operations
    PERMISSIONS.OPERATIONS_VIEW,
    PERMISSIONS.OPERATIONS_REFERRALS,
    PERMISSIONS.OPERATIONS_BILLING,
    PERMISSIONS.OPERATIONS_AUTHORIZATIONS,
    PERMISSIONS.OPERATIONS_INSURANCE,
    PERMISSIONS.OPERATIONS_SERVICE_REQUESTS,
    // Clinical Library
    PERMISSIONS.CLINICAL_LIB_VIEW,
    PERMISSIONS.CLINICAL_LIB_CREATE_PERSONAL,
    PERMISSIONS.CLINICAL_LIB_SUBMIT_FOR_REVIEW,
    PERMISSIONS.CLINICAL_LIB_APPROVE,
    PERMISSIONS.CLINICAL_LIB_PUBLISH_ORG,
  ],
  
  staff: [
    PERMISSIONS.CLIENT_VIEW,
    PERMISSIONS.CLIENT_EDIT_BASIC,
    PERMISSIONS.SESSION_VIEW,
    PERMISSIONS.SESSION_CREATE,
    PERMISSIONS.SESSION_EDIT_OWN,
    PERMISSIONS.SESSION_DATA_ENTRY,
    PERMISSIONS.NOTE_VIEW,
    PERMISSIONS.NOTE_CREATE_DRAFT,
    PERMISSIONS.NOTE_SUBMIT,
    PERMISSIONS.SCHEDULE_VIEW,
    PERMISSIONS.AUTH_VIEW,
    PERMISSIONS.DOC_VIEW_CLINICAL,
    PERMISSIONS.DOC_VIEW_PARENT,
    PERMISSIONS.STAFF_VIEW,
    PERMISSIONS.IEP_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    // Resource Hub
    PERMISSIONS.RESOURCE_HUB_VIEW,
    PERMISSIONS.RESOURCE_HUB_UPLOAD,
    // Operations (limited)
    PERMISSIONS.OPERATIONS_VIEW,
    PERMISSIONS.OPERATIONS_SERVICE_REQUESTS,
    // Clinical Library
    PERMISSIONS.CLINICAL_LIB_VIEW,
    PERMISSIONS.CLINICAL_LIB_CREATE_PERSONAL,
    PERMISSIONS.CLINICAL_LIB_SUBMIT_FOR_REVIEW,
  ],
  
  viewer: [
    PERMISSIONS.CLIENT_VIEW,
    PERMISSIONS.SESSION_VIEW,
    PERMISSIONS.NOTE_VIEW,
    PERMISSIONS.SCHEDULE_VIEW,
    PERMISSIONS.DOC_VIEW_PARENT,
    PERMISSIONS.REPORTS_VIEW,
    // Resource Hub (view only)
    PERMISSIONS.RESOURCE_HUB_VIEW,
    // Clinical Library (view only)
    PERMISSIONS.CLINICAL_LIB_VIEW,
  ],
};

// Check if user has a specific permission
export function hasPermission(
  context: PermissionContext,
  permission: Permission
): boolean {
  if (!context.userRole) return false;
  
  const rolePermissions = ROLE_PERMISSIONS[context.userRole] || [];
  return rolePermissions.includes(permission);
}

// Check if user can approve notes (BCBA/Supervisor only)
export function canApproveNotes(context: PermissionContext): boolean {
  return hasPermission(context, PERMISSIONS.NOTE_APPROVE);
}

// Check if user can manage authorizations
export function canManageAuthorizations(context: PermissionContext): boolean {
  return hasPermission(context, PERMISSIONS.AUTH_MANAGE);
}

// Check if user can override scheduling constraints
export function canOverrideScheduling(context: PermissionContext): boolean {
  return hasPermission(context, PERMISSIONS.SCHEDULE_OVERRIDE);
}

// Check if user can view internal documents
export function canViewInternalDocs(context: PermissionContext): boolean {
  return hasPermission(context, PERMISSIONS.DOC_VIEW_INTERNAL);
}

// Check if user can manage client team
export function canManageClientTeam(context: PermissionContext): boolean {
  return hasPermission(context, PERMISSIONS.CLIENT_MANAGE_TEAM);
}

// Check if user can edit clinical fields
export function canEditClinical(context: PermissionContext): boolean {
  return hasPermission(context, PERMISSIONS.CLIENT_EDIT_CLINICAL);
}

// Check if user can view district-level reports
export function canViewDistrictReports(context: PermissionContext): boolean {
  return hasPermission(context, PERMISSIONS.REPORTS_DISTRICT);
}

// Check if user can access Operations
export function canViewOperations(context: PermissionContext): boolean {
  return hasPermission(context, PERMISSIONS.OPERATIONS_VIEW);
}

// Check if user can publish to org clinical library
export function canPublishOrgClinicalLib(context: PermissionContext): boolean {
  return hasPermission(context, PERMISSIONS.CLINICAL_LIB_PUBLISH_ORG);
}

// Get all permissions for a role
export function getPermissionsForRole(role: AppRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

// Check multiple permissions at once
export function hasAnyPermission(
  context: PermissionContext,
  permissions: Permission[]
): boolean {
  return permissions.some(p => hasPermission(context, p));
}

export function hasAllPermissions(
  context: PermissionContext,
  permissions: Permission[]
): boolean {
  return permissions.every(p => hasPermission(context, p));
}
