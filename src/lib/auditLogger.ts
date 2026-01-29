import { supabase } from '@/integrations/supabase/client';

export type AuditAction = 
  | 'login'
  | 'logout'
  | 'session_timeout'
  | 'session_extended'
  | 'manual_save'
  | 'emergency_save'
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'export'
  | 'print'
  | 'share'
  | 'unshare'
  | 'approve'
  | 'reject'
  | 'archive'
  | 'unarchive'
  | 'role_change'
  | 'permission_change'
  | 'settings_change';

export type ResourceType = 
  | 'auth'
  | 'session'
  | 'student'
  | 'behavior'
  | 'abc_entry'
  | 'frequency_entry'
  | 'duration_entry'
  | 'interval_entry'
  | 'note'
  | 'file'
  | 'report'
  | 'user'
  | 'role'
  | 'settings'
  | 'access';

export type DataCategory = 
  | 'profile'
  | 'behaviors'
  | 'sessions'
  | 'notes'
  | 'files'
  | 'reports'
  | 'assessments'
  | 'goals';

interface AuditLogEntry {
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  resourceName?: string;
  details?: Record<string, any>;
}

interface DataAccessLogEntry {
  studentId: string;
  accessType: 'view' | 'edit' | 'export' | 'print';
  dataCategory: DataCategory;
  details?: Record<string, any>;
}

// Queue for batch processing
let auditQueue: AuditLogEntry[] = [];
let dataAccessQueue: DataAccessLogEntry[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

const FLUSH_DELAY = 2000; // 2 seconds

// Flush queued logs to database
async function flushLogs() {
  if (auditQueue.length === 0 && dataAccessQueue.length === 0) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const auditToFlush = [...auditQueue];
  const accessToFlush = [...dataAccessQueue];
  
  auditQueue = [];
  dataAccessQueue = [];

  try {
    // Insert audit logs
    if (auditToFlush.length > 0) {
      const auditRecords = auditToFlush.map(entry => ({
        user_id: user.id,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId || null,
        resource_name: entry.resourceName || null,
        details: entry.details || {},
      }));

      const { error } = await supabase
        .from('audit_logs')
        .insert(auditRecords);

      if (error) {
        console.error('Failed to insert audit logs:', error);
        // Re-queue failed logs
        auditQueue.push(...auditToFlush);
      }
    }

    // Insert data access logs
    if (accessToFlush.length > 0) {
      const accessRecords = accessToFlush.map(entry => ({
        user_id: user.id,
        student_id: entry.studentId,
        access_type: entry.accessType,
        data_category: entry.dataCategory,
        details: entry.details || {},
      }));

      const { error } = await supabase
        .from('data_access_logs')
        .insert(accessRecords);

      if (error) {
        console.error('Failed to insert data access logs:', error);
        // Re-queue failed logs
        dataAccessQueue.push(...accessToFlush);
      }
    }
  } catch (error) {
    console.error('Failed to flush logs:', error);
    // Re-queue on error
    auditQueue.push(...auditToFlush);
    dataAccessQueue.push(...accessToFlush);
  }
}

function scheduleFlush() {
  if (flushTimeout) clearTimeout(flushTimeout);
  flushTimeout = setTimeout(flushLogs, FLUSH_DELAY);
}

/**
 * Log an audit event for compliance tracking
 */
export async function logAuditEvent(
  action: AuditAction,
  resourceType: ResourceType,
  resourceId?: string,
  resourceName?: string,
  details?: Record<string, any>
): Promise<void> {
  auditQueue.push({
    action,
    resourceType,
    resourceId,
    resourceName,
    details,
  });
  scheduleFlush();
}

/**
 * Log when a user accesses student data
 */
export async function logDataAccess(
  studentId: string,
  accessType: 'view' | 'edit' | 'export' | 'print',
  dataCategory: DataCategory,
  details?: Record<string, any>
): Promise<void> {
  dataAccessQueue.push({
    studentId,
    accessType,
    dataCategory,
    details,
  });
  scheduleFlush();
}

/**
 * Immediately flush all pending logs (call before logout/timeout)
 */
export async function flushPendingLogs(): Promise<void> {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  await flushLogs();
}

/**
 * Get audit logs (admin only)
 */
export async function getAuditLogs(options: {
  limit?: number;
  offset?: number;
  userId?: string;
  resourceType?: ResourceType;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
} = {}) {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (options.userId) {
    query = query.eq('user_id', options.userId);
  }
  if (options.resourceType) {
    query = query.eq('resource_type', options.resourceType);
  }
  if (options.action) {
    query = query.eq('action', options.action);
  }
  if (options.startDate) {
    query = query.gte('created_at', options.startDate.toISOString());
  }
  if (options.endDate) {
    query = query.lte('created_at', options.endDate.toISOString());
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get data access logs for a specific student (admin only)
 */
export async function getDataAccessLogs(options: {
  studentId?: string;
  userId?: string;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
} = {}) {
  let query = supabase
    .from('data_access_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (options.studentId) {
    query = query.eq('student_id', options.studentId);
  }
  if (options.userId) {
    query = query.eq('user_id', options.userId);
  }
  if (options.startDate) {
    query = query.gte('created_at', options.startDate.toISOString());
  }
  if (options.endDate) {
    query = query.lte('created_at', options.endDate.toISOString());
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Failed to fetch data access logs:', error);
    return [];
  }
  
  return data || [];
}
