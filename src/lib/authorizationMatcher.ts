import { supabase } from '@/integrations/supabase/client';

export interface AuthorizationMatch {
  authorizationId: string;
  authorizedServiceId: string | null;
  authNumber: string;
  serviceName: string;
  matchReason: 'auto' | 'default' | 'manual' | 'override';
}

export interface MatchResult {
  status: 'matched' | 'needs_review' | 'excluded';
  match: AuthorizationMatch | null;
  warnings: string[];
}

interface Authorization {
  id: string;
  auth_number: string;
  start_date: string;
  end_date: string;
  status: string;
  is_default: boolean;
  matching_rule: string;
  warning_behavior: string;
}

interface AuthorizedService {
  id: string;
  authorization_id: string;
  service_name: string;
  unit_type: string;
  units_remaining: number;
  is_active: boolean;
}

/**
 * Session-Authorization Matching Engine
 * 
 * Matching Order:
 * 1. Service Match (PRIMARY) - Find active auths where date range includes session date 
 *    and has an approved service matching session service
 * 2. Multiple Matches - Use default auth flag, or earliest end date
 * 3. No Match - Follow warning behavior setting
 */
export async function matchSessionToAuthorization(
  studentId: string,
  sessionDate: Date,
  serviceType: string | null,
  fundingMode: 'school_based' | 'insurance'
): Promise<MatchResult> {
  // School-based mode = excluded
  if (fundingMode === 'school_based') {
    return {
      status: 'excluded',
      match: null,
      warnings: [],
    };
  }

  try {
    const dateStr = sessionDate.toISOString().split('T')[0];

    // Fetch active authorizations for this student that cover the session date
    const { data: auths, error: authError } = await supabase
      .from('authorizations')
      .select('id, auth_number, start_date, end_date, status, is_default, matching_rule, warning_behavior')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .lte('start_date', dateStr)
      .gte('end_date', dateStr)
      .order('end_date', { ascending: true });

    if (authError) throw authError;

    if (!auths || auths.length === 0) {
      return {
        status: 'needs_review',
        match: null,
        warnings: ['No active authorization found for this date.'],
      };
    }

    // Fetch authorized services for these authorizations
    const authIds = auths.map(a => a.id);
    const { data: services, error: serviceError } = await supabase
      .from('authorized_services')
      .select('id, authorization_id, service_name, unit_type, units_remaining, is_active')
      .in('authorization_id', authIds)
      .eq('is_active', true);

    if (serviceError) throw serviceError;

    // Step 1: Try to match by service type
    let matchedAuth: Authorization | null = null;
    let matchedService: AuthorizedService | null = null;
    let matchReason: AuthorizationMatch['matchReason'] = 'auto';

    if (serviceType) {
      // Normalize service type for matching
      const normalizedServiceType = normalizeServiceType(serviceType);
      
      const matchingServices = (services || []).filter(s => 
        normalizeServiceType(s.service_name) === normalizedServiceType && 
        s.units_remaining > 0
      );

      if (matchingServices.length > 0) {
        // Found service matches - pick the auth with earliest end date (most urgent)
        const defaultAuth = auths.find(a => a.is_default);
        
        if (defaultAuth && matchingServices.some(s => s.authorization_id === defaultAuth.id)) {
          matchedAuth = defaultAuth;
          matchedService = matchingServices.find(s => s.authorization_id === defaultAuth.id) || null;
          matchReason = 'default';
        } else {
          // Use auth with earliest end date
          for (const auth of auths) {
            const authService = matchingServices.find(s => s.authorization_id === auth.id);
            if (authService) {
              matchedAuth = auth;
              matchedService = authService;
              break;
            }
          }
        }
      }
    }

    // Step 2: If no service match, try default auth
    if (!matchedAuth) {
      const defaultAuth = auths.find(a => a.is_default);
      if (defaultAuth) {
        matchedAuth = defaultAuth;
        matchReason = 'default';
        
        // Try to find any available service
        matchedService = (services || []).find(s => 
          s.authorization_id === defaultAuth.id && s.units_remaining > 0
        ) || null;
      }
    }

    // Step 3: If still no match, use first available auth
    if (!matchedAuth && auths.length > 0) {
      matchedAuth = auths[0];
      matchReason = 'auto';
      
      matchedService = (services || []).find(s => 
        s.authorization_id === matchedAuth!.id && s.units_remaining > 0
      ) || null;
    }

    if (matchedAuth) {
      const warnings: string[] = [];
      
      // Check for low units warning
      if (matchedService && matchedService.units_remaining <= 0) {
        warnings.push('Units exhausted for this service.');
      }

      return {
        status: 'matched',
        match: {
          authorizationId: matchedAuth.id,
          authorizedServiceId: matchedService?.id || null,
          authNumber: matchedAuth.auth_number,
          serviceName: matchedService?.service_name || 'Unknown',
          matchReason,
        },
        warnings,
      };
    }

    return {
      status: 'needs_review',
      match: null,
      warnings: ['No matching authorization found.'],
    };
  } catch (error) {
    console.error('Error matching session to authorization:', error);
    return {
      status: 'needs_review',
      match: null,
      warnings: ['Error during authorization matching.'],
    };
  }
}

/**
 * Deduct units from an authorization
 */
export async function deductUnits(
  sessionId: string,
  authorizationId: string,
  authorizedServiceId: string | null,
  studentId: string,
  unitsToDeduct: number,
  reason: 'auto' | 'manual' | 'default' | 'override',
  performedBy?: string
): Promise<boolean> {
  try {
    // Create ledger entry
    const { error: ledgerError } = await supabase
      .from('unit_deduction_ledger')
      .insert({
        session_id: sessionId,
        authorization_id: authorizationId,
        authorized_service_id: authorizedServiceId,
        student_id: studentId,
        units_deducted: unitsToDeduct,
        deduction_reason: reason,
        performed_by: performedBy,
      });

    if (ledgerError) throw ledgerError;

    // Update authorization units_used
    const { data: auth } = await supabase
      .from('authorizations')
      .select('units_used')
      .eq('id', authorizationId)
      .single();

    if (auth) {
      await supabase
        .from('authorizations')
        .update({ units_used: (auth.units_used || 0) + unitsToDeduct })
        .eq('id', authorizationId);
    }

    // Update authorized_service units_used if applicable
    if (authorizedServiceId) {
      const { data: service } = await supabase
        .from('authorized_services')
        .select('units_used')
        .eq('id', authorizedServiceId)
        .single();

      if (service) {
        await supabase
          .from('authorized_services')
          .update({ units_used: (service.units_used || 0) + unitsToDeduct })
          .eq('id', authorizedServiceId);
      }
    }

    return true;
  } catch (error) {
    console.error('Error deducting units:', error);
    return false;
  }
}

/**
 * Calculate units from session duration
 */
export function calculateUnitsFromDuration(
  durationMinutes: number,
  unitType: string
): number {
  switch (unitType) {
    case 'units_15min':
    case '15min':
      return Math.ceil(durationMinutes / 15);
    case 'units_hourly':
    case '1hr':
      return Math.ceil(durationMinutes / 60);
    case 'flat':
      return 1;
    default:
      return Math.ceil(durationMinutes / 15);
  }
}

/**
 * Normalize service type for matching
 */
function normalizeServiceType(serviceType: string): string {
  return serviceType
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Reverse a unit deduction (for session edits)
 */
export async function reverseUnitDeduction(
  sessionId: string,
  authorizationId: string,
  authorizedServiceId: string | null,
  unitsToReverse: number
): Promise<boolean> {
  try {
    // Get authorization and reduce units_used
    const { data: auth } = await supabase
      .from('authorizations')
      .select('units_used')
      .eq('id', authorizationId)
      .single();

    if (auth) {
      await supabase
        .from('authorizations')
        .update({ units_used: Math.max(0, (auth.units_used || 0) - unitsToReverse) })
        .eq('id', authorizationId);
    }

    // Update authorized_service if applicable
    if (authorizedServiceId) {
      const { data: service } = await supabase
        .from('authorized_services')
        .select('units_used')
        .eq('id', authorizedServiceId)
        .single();

      if (service) {
        await supabase
          .from('authorized_services')
          .update({ units_used: Math.max(0, (service.units_used || 0) - unitsToReverse) })
          .eq('id', authorizedServiceId);
      }
    }

    // Add reversal ledger entry (negative units)
    await supabase
      .from('unit_deduction_ledger')
      .insert({
        session_id: sessionId,
        authorization_id: authorizationId,
        authorized_service_id: authorizedServiceId,
        student_id: '', // Will be filled from session
        units_deducted: -unitsToReverse,
        deduction_reason: 'override',
        notes: 'Reversal due to session edit',
      });

    return true;
  } catch (error) {
    console.error('Error reversing unit deduction:', error);
    return false;
  }
}
