import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDataStore } from '@/store/dataStore';
import { useAuth } from '@/contexts/AuthContext';
import { GlobalBankBehavior } from '@/types/behaviorBank';

/**
 * Syncs behavior bank data (custom behaviors, overrides, archives) with the database.
 * Call this hook once at the app level or behavior bank page level.
 */
export function useBehaviorBankSync() {
  const { user } = useAuth();
  const {
    globalBehaviorBank,
    behaviorDefinitionOverrides,
    archivedBuiltInBehaviors,
  } = useDataStore();

  // ── LOAD from DB on mount ─────────────────────────────────────────────────
  const loadFromDB = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('behavior_bank_entries')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[BehaviorBankSync] Failed to load:', error);
      return;
    }

    if (!data || data.length === 0) return;

    const newCustomBehaviors: GlobalBankBehavior[] = [];
    const newOverrides: Record<string, { operationalDefinition?: string; category?: string; updatedAt: string }> = {};
    const newArchived: string[] = [];

    for (const row of data) {
      if (row.entry_type === 'custom') {
        newCustomBehaviors.push({
          id: row.behavior_id,
          name: row.name || '',
          operationalDefinition: row.operational_definition || '',
          category: row.category || 'Other',
          isGlobal: row.is_global,
          promotedAt: row.promoted_at ? new Date(row.promoted_at) : new Date(row.created_at),
          promotedFromStudentId: row.promoted_from_student_id ?? undefined,
        });
      } else if (row.entry_type === 'override') {
        newOverrides[row.behavior_id] = {
          operationalDefinition: row.operational_definition ?? undefined,
          category: row.category ?? undefined,
          updatedAt: row.updated_at as string,
        };
      } else if (row.entry_type === 'archive') {
        newArchived.push(row.behavior_id);
      }
    }

    // Merge DB data into store (DB is source of truth)
    useDataStore.setState((state) => ({
      globalBehaviorBank: newCustomBehaviors.length > 0 ? newCustomBehaviors : state.globalBehaviorBank,
      behaviorDefinitionOverrides: Object.keys(newOverrides).length > 0 ? newOverrides : state.behaviorDefinitionOverrides,
      archivedBuiltInBehaviors: newArchived.length > 0 ? newArchived : state.archivedBuiltInBehaviors,
    }));
  }, [user?.id]);

  useEffect(() => {
    loadFromDB();
  }, [loadFromDB]);

  return { reload: loadFromDB };
}

// ── Individual sync helpers (called from store actions) ───────────────────

export async function syncCustomBehaviorToDB(behavior: GlobalBankBehavior, userId: string) {
  const { error } = await supabase
    .from('behavior_bank_entries')
    .upsert({
      entry_type: 'custom',
      behavior_id: behavior.id,
      name: behavior.name,
      operational_definition: behavior.operationalDefinition,
      category: behavior.category,
      is_global: behavior.isGlobal ?? true,
      promoted_from_student_id: behavior.promotedFromStudentId ?? null,
      promoted_at: behavior.promotedAt instanceof Date ? behavior.promotedAt.toISOString() : behavior.promotedAt,
      created_by: userId,
    }, { onConflict: 'agency_id,entry_type,behavior_id', ignoreDuplicates: false });

  if (error) console.error('[BehaviorBankSync] Failed to sync custom behavior:', error);
}

export async function removeCustomBehaviorFromDB(behaviorId: string) {
  const { error } = await supabase
    .from('behavior_bank_entries')
    .delete()
    .eq('entry_type', 'custom')
    .eq('behavior_id', behaviorId);

  if (error) console.error('[BehaviorBankSync] Failed to remove custom behavior:', error);
}

export async function syncOverrideToDB(behaviorId: string, operationalDefinition: string, category: string | undefined, userId: string) {
  const { error } = await supabase
    .from('behavior_bank_entries')
    .upsert({
      entry_type: 'override',
      behavior_id: behaviorId,
      operational_definition: operationalDefinition,
      category: category ?? null,
      is_global: true,
      created_by: userId,
    }, { onConflict: 'agency_id,entry_type,behavior_id', ignoreDuplicates: false });

  if (error) console.error('[BehaviorBankSync] Failed to sync override:', error);
}

export async function removeOverrideFromDB(behaviorId: string) {
  const { error } = await supabase
    .from('behavior_bank_entries')
    .delete()
    .eq('entry_type', 'override')
    .eq('behavior_id', behaviorId);

  if (error) console.error('[BehaviorBankSync] Failed to remove override:', error);
}

export async function archiveBehaviorToDB(behaviorId: string, userId: string) {
  const { error } = await supabase
    .from('behavior_bank_entries')
    .upsert({
      entry_type: 'archive',
      behavior_id: behaviorId,
      is_global: true,
      created_by: userId,
    }, { onConflict: 'agency_id,entry_type,behavior_id', ignoreDuplicates: false });

  if (error) console.error('[BehaviorBankSync] Failed to archive behavior:', error);
}

export async function unarchiveBehaviorFromDB(behaviorId: string) {
  const { error } = await supabase
    .from('behavior_bank_entries')
    .delete()
    .eq('entry_type', 'archive')
    .eq('behavior_id', behaviorId);

  if (error) console.error('[BehaviorBankSync] Failed to unarchive behavior:', error);
}
