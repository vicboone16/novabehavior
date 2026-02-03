import { supabase } from '@/integrations/supabase/client';

export type OverrideType = 
  | 'scheduling_availability'
  | 'scheduling_radius'
  | 'roster_assignment'
  | 'supervisor_chain'
  | 'authorization';

export type AffectedObjectType = 
  | 'session'
  | 'appointment'
  | 'assignment'
  | 'authorization';

interface LogOverrideParams {
  overrideType: OverrideType;
  reason: string;
  affectedObjectType: AffectedObjectType;
  affectedObjectIds: string[];
  originalConstraint?: Record<string, any>;
  overrideContext?: Record<string, any>;
}

/**
 * Log an override to the immutable override_logs table.
 * This is required whenever a scheduling or permission constraint is bypassed.
 */
export async function logOverride(params: LogOverrideParams): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('Cannot log override: user not authenticated');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('override_logs')
      .insert({
        override_type: params.overrideType,
        overridden_by: user.id,
        reason: params.reason,
        affected_object_type: params.affectedObjectType,
        affected_object_ids: params.affectedObjectIds,
        original_constraint: params.originalConstraint || null,
        override_context: params.overrideContext || null,
      })
      .select('id')
      .single();

    if (error) throw error;
    
    console.log('Override logged:', data.id);
    return data.id;
  } catch (error) {
    console.error('Failed to log override:', error);
    return null;
  }
}

/**
 * Get override logs for a specific object
 */
export async function getOverrideLogsForObject(
  objectType: AffectedObjectType,
  objectId: string
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('override_logs')
      .select('*')
      .eq('affected_object_type', objectType)
      .contains('affected_object_ids', [objectId])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to fetch override logs:', error);
    return [];
  }
}

/**
 * Get recent overrides by user
 */
export async function getOverridesByUser(
  userId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('override_logs')
      .select('*')
      .eq('overridden_by', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to fetch override logs:', error);
    return [];
  }
}
