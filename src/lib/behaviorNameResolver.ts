import { supabase } from '@/integrations/supabase/client';

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

    const [{ data: behaviorRows }, { data: mapRows }] = await Promise.all([
      supabase
        .from('behavior_session_data')
        .select('behavior_id, behaviors(name)')
        .eq('student_id', studentId)
        .limit(1000),
      supabase
        .from('student_behavior_map')
        .select('behavior_entry_id, behavior_subtype')
        .eq('student_id', studentId)
        .eq('active', true),
    ]);

    (behaviorRows || []).forEach((row: any) => {
      const label = normalizeLabel(row?.behaviors?.name);
      if (row?.behavior_id && label) {
        map.set(row.behavior_id, label);
      }
    });

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
