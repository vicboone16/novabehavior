import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

const behaviorNameCache = new Map<string, Map<string, string>>();
const inflightRequests = new Map<string, Promise<Map<string, string>>>();

function normalizeLabel(value?: string | null) {
  return (value || '').trim();
}

export async function getStudentBehaviorNameMap(studentId: string): Promise<Map<string, string>> {
  if (!studentId) return new Map();
  const cached = behaviorNameCache.get(studentId);
  if (cached) return cached;

  const inflight = inflightRequests.get(studentId);
  if (inflight) return inflight;

  const request = (async () => {
    const map = new Map<string, string>();

    // 1) Get distinct behavior_ids from session data for this student
    const { data: sessionRows } = await db
      .from('behavior_session_data')
      .select('behavior_id')
      .eq('student_id', studentId)
      .limit(1000);

    const behaviorIds = [...new Set((sessionRows || []).map((r: any) => r.behavior_id).filter(Boolean))] as string[];

    // 2) Fetch names from behaviors table directly (no FK needed)
    if (behaviorIds.length > 0) {
      const { data: behaviorDefs } = await db
        .from('behaviors')
        .select('id, name')
        .in('id', behaviorIds);

      (behaviorDefs || []).forEach((row: any) => {
        const label = normalizeLabel(row?.name);
        if (row?.id && label) {
          map.set(row.id, label);
        }
      });
    }

    // 3) Fallback: student_behavior_map subtype labels
    const { data: mapRows } = await db
      .from('student_behavior_map')
      .select('behavior_entry_id, behavior_subtype')
      .eq('student_id', studentId)
      .eq('active', true);

    (mapRows || []).forEach((row: any) => {
      const label = normalizeLabel(row?.behavior_subtype);
      if (row?.behavior_entry_id && label && !map.has(row.behavior_entry_id)) {
        map.set(row.behavior_entry_id, label);
      }
    });

    behaviorNameCache.set(studentId, map);
    inflightRequests.delete(studentId);
    return map;
  })();

  inflightRequests.set(studentId, request);
  return request;
}

export function getCachedStudentBehaviorName(studentId: string, behaviorId: string) {
  return behaviorNameCache.get(studentId)?.get(behaviorId);
}

export function primeStudentBehaviorNameMap(studentId: string, names: Array<{ id: string; name: string }>) {
  if (!studentId || names.length === 0) return;
  const current = behaviorNameCache.get(studentId) || new Map<string, string>();
  names.forEach(({ id, name }) => {
    if (id && normalizeLabel(name)) current.set(id, name);
  });
  behaviorNameCache.set(studentId, current);
}

export function clearStudentBehaviorNameMap(studentId?: string) {
  if (studentId) {
    behaviorNameCache.delete(studentId);
    inflightRequests.delete(studentId);
    return;
  }
  behaviorNameCache.clear();
  inflightRequests.clear();
}
