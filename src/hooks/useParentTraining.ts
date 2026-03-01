import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type {
  ParentTrainingModule,
  ParentTrainingModuleVersion,
  ParentTrainingLibraryItem,
  ParentTrainingAssignment,
  ParentTrainingProgress,
} from '@/types/parentTraining';

// Tables not yet in generated types — use untyped .from()
const db = supabase as any;

export function useParentTraining(agencyId?: string | null) {
  const { user } = useAuth();
  const [modules, setModules] = useState<ParentTrainingModule[]>([]);
  const [versions, setVersions] = useState<ParentTrainingModuleVersion[]>([]);
  const [libraryItems, setLibraryItems] = useState<ParentTrainingLibraryItem[]>([]);
  const [assignments, setAssignments] = useState<ParentTrainingAssignment[]>([]);
  const [progress, setProgress] = useState<ParentTrainingProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ── Modules ──
  const fetchModules = useCallback(async () => {
    setIsLoading(true);
    try {
      let q = db.from('parent_training_modules').select('*').order('title');
      if (agencyId) q = q.or(`agency_id.eq.${agencyId},scope.eq.system`);
      const { data, error } = await q;
      if (error) throw error;
      setModules(data || []);
    } catch (e: any) {
      toast.error('Failed to load modules: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  }, [agencyId]);

  const createModule = useCallback(async (mod: Partial<ParentTrainingModule>) => {
    if (!user) return null;
    const { data, error } = await db
      .from('parent_training_modules')
      .insert({ ...mod, created_by: user.id, agency_id: agencyId || mod.agency_id })
      .select()
      .single();
    if (error) throw error;
    toast.success('Module created');
    return data as ParentTrainingModule;
  }, [user, agencyId]);

  const updateModule = useCallback(async (id: string, updates: Partial<ParentTrainingModule>) => {
    const { error } = await db
      .from('parent_training_modules')
      .update(updates)
      .eq('module_id', id);
    if (error) throw error;
    toast.success('Module updated');
  }, []);

  // ── Versions ──
  const fetchVersions = useCallback(async (moduleId: string) => {
    const { data, error } = await db
      .from('parent_training_module_versions')
      .select('*')
      .eq('module_id', moduleId)
      .order('version_num', { ascending: false });
    if (error) throw error;
    setVersions(data || []);
  }, []);

  const createVersion = useCallback(async (moduleId: string, content: Record<string, unknown>, changeNotes?: string) => {
    if (!user) return null;
    const { data: existing } = await db
      .from('parent_training_module_versions')
      .select('version_num')
      .eq('module_id', moduleId)
      .order('version_num', { ascending: false })
      .limit(1);
    const nextNum = (existing?.[0]?.version_num || 0) + 1;

    const { data, error } = await db
      .from('parent_training_module_versions')
      .insert({
        module_id: moduleId,
        version_num: nextNum,
        content,
        change_notes: changeNotes || null,
        created_by: user.id,
        status: 'draft',
      })
      .select()
      .single();
    if (error) throw error;
    toast.success(`Version ${nextNum} created`);
    return data as ParentTrainingModuleVersion;
  }, [user]);

  const publishVersion = useCallback(async (versionId: string) => {
    const { error } = await db
      .from('parent_training_module_versions')
      .update({ status: 'published' })
      .eq('module_version_id', versionId);
    if (error) throw error;
    toast.success('Version published');
  }, []);

  // ── Library ──
  const fetchLibrary = useCallback(async () => {
    setIsLoading(true);
    try {
      let q = db.from('parent_training_library').select('*').order('title');
      if (agencyId) q = q.or(`agency_id.eq.${agencyId},scope.eq.system`);
      const { data, error } = await q;
      if (error) throw error;
      setLibraryItems(data || []);
    } catch (e: any) {
      toast.error('Failed to load library: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  }, [agencyId]);

  const createLibraryItem = useCallback(async (item: Partial<ParentTrainingLibraryItem>) => {
    if (!user) return null;
    const { data, error } = await db
      .from('parent_training_library')
      .insert({ ...item, created_by: user.id, agency_id: agencyId || item.agency_id })
      .select()
      .single();
    if (error) throw error;
    toast.success('Library item created');
    return data as ParentTrainingLibraryItem;
  }, [user, agencyId]);

  const updateLibraryItem = useCallback(async (id: string, updates: Partial<ParentTrainingLibraryItem>) => {
    const { error } = await db
      .from('parent_training_library')
      .update(updates)
      .eq('item_id', id);
    if (error) throw error;
    toast.success('Library item updated');
  }, []);

  // ── Assignments ──
  const fetchAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      let q = db
        .from('parent_training_assignments')
        .select('*, parent_training_modules(title)')
        .order('created_at', { ascending: false });
      if (agencyId) q = q.eq('agency_id', agencyId);
      const { data, error } = await q;
      if (error) throw error;
      const mapped = (data || []).map((d: any) => ({
        ...d,
        module_title: d.parent_training_modules?.title,
      }));
      setAssignments(mapped);
    } catch (e: any) {
      toast.error('Failed to load assignments: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  }, [agencyId]);

  const createAssignment = useCallback(async (assignment: Partial<ParentTrainingAssignment>) => {
    if (!user) return null;
    const { data, error } = await db
      .from('parent_training_assignments')
      .insert({ ...assignment, created_by: user.id, agency_id: agencyId || assignment.agency_id })
      .select()
      .single();
    if (error) throw error;
    toast.success('Module assigned');
    return data;
  }, [user, agencyId]);

  const updateAssignment = useCallback(async (id: string, updates: Partial<ParentTrainingAssignment>) => {
    const { error } = await db
      .from('parent_training_assignments')
      .update(updates)
      .eq('assignment_id', id);
    if (error) throw error;
    toast.success('Assignment updated');
  }, []);

  // ── Progress / Analytics ──
  const fetchProgress = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await db
        .from('parent_training_progress')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProgress(data || []);
    } catch (e: any) {
      toast.error('Failed to load progress: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    modules, versions, libraryItems, assignments, progress, isLoading,
    fetchModules, createModule, updateModule,
    fetchVersions, createVersion, publishVersion,
    fetchLibrary, createLibraryItem, updateLibraryItem,
    fetchAssignments, createAssignment, updateAssignment,
    fetchProgress,
  };
}
