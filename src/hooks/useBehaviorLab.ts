import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import type { BehaviorLabGame, BehaviorLabAttempt, GameContent } from '@/types/behaviorLab';
import { normalizeGameContent } from '@/utils/normalizeGameContent';
import { toast } from 'sonner';

export function useBehaviorLab() {
  const { user } = useAuth();
  const { currentAgency } = useAgencyContext();
  const [games, setGames] = useState<BehaviorLabGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentAttempts, setRecentAttempts] = useState<BehaviorLabAttempt[]>([]);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('behavior_lab_games')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      setGames((data || []).map(g => ({
        ...g,
        content: g.content as unknown as GameContent,
      })) as BehaviorLabGame[]);
    } catch (err: any) {
      console.error('Error fetching games:', err);
      toast.error('Failed to load games');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllGames = useCallback(async () => {
    // Admin view - all statuses
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('behavior_lab_games')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setGames((data || []).map(g => ({
        ...g,
        content: g.content as unknown as GameContent,
      })) as BehaviorLabGame[]);
    } catch (err: any) {
      console.error('Error fetching games:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecentAttempts = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('behavior_lab_attempts')
        .select('*')
        .eq('coach_user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentAttempts((data || []) as unknown as BehaviorLabAttempt[]);
    } catch (err: any) {
      console.error('Error fetching attempts:', err);
    }
  }, [user]);

  const saveAttempt = useCallback(async (attempt: Omit<BehaviorLabAttempt, 'attempt_id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('behavior_lab_attempts')
        .insert({
          game_id: attempt.game_id,
          coach_user_id: attempt.coach_user_id,
          agency_id: attempt.agency_id,
          learner_id: attempt.learner_id,
          difficulty: attempt.difficulty,
          score_percent: attempt.score_percent,
          xp_earned: attempt.xp_earned,
          streak_count: attempt.streak_count,
          skill_tags: attempt.skill_tags,
          mistakes_summary: attempt.mistakes_summary,
          started_at: attempt.started_at,
          completed_at: attempt.completed_at,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error saving attempt:', err);
      toast.error('Failed to save attempt');
      return null;
    }
  }, []);

  const getGameById = useCallback(async (gameId: string): Promise<BehaviorLabGame | null> => {
    try {
      const { data, error } = await supabase
        .from('behavior_lab_games')
        .select('*')
        .eq('game_id', gameId)
        .single();

      if (error) throw error;
      return {
        ...data,
        content: data.content as unknown as GameContent,
      } as BehaviorLabGame;
    } catch (err: any) {
      console.error('Error fetching game:', err);
      return null;
    }
  }, []);

  const createGame = useCallback(async (game: Partial<BehaviorLabGame>) => {
    try {
      const { data, error } = await supabase
        .from('behavior_lab_games')
        .insert({
          title: game.title || 'Untitled Game',
          description: game.description || null,
          difficulty: game.difficulty || 'beginner',
          stage: game.stage || 'identify',
          skill_tags: game.skill_tags || [],
          est_seconds: game.est_seconds || 120,
          scope: game.scope || 'system',
          agency_id: game.agency_id || null,
          status: game.status || 'draft',
          content: game.content as any || { scenarios: [], questions: [] },
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Game created');
      return data;
    } catch (err: any) {
      console.error('Error creating game:', err);
      toast.error('Failed to create game');
      return null;
    }
  }, [user]);

  const updateGame = useCallback(async (gameId: string, updates: Partial<BehaviorLabGame>) => {
    try {
      const { error } = await supabase
        .from('behavior_lab_games')
        .update({
          ...(updates.title && { title: updates.title }),
          ...(updates.description !== undefined && { description: updates.description }),
          ...(updates.difficulty && { difficulty: updates.difficulty }),
          ...(updates.stage && { stage: updates.stage }),
          ...(updates.skill_tags && { skill_tags: updates.skill_tags }),
          ...(updates.est_seconds && { est_seconds: updates.est_seconds }),
          ...(updates.status && { status: updates.status }),
          ...(updates.content && { content: updates.content as any }),
          ...(updates.scope && { scope: updates.scope }),
          ...(updates.agency_id !== undefined && { agency_id: updates.agency_id }),
        })
        .eq('game_id', gameId);

      if (error) throw error;
      toast.success('Game updated');
    } catch (err: any) {
      console.error('Error updating game:', err);
      toast.error('Failed to update game');
    }
  }, []);

  const duplicateGame = useCallback(async (gameId: string, agencyId?: string) => {
    try {
      const original = await getGameById(gameId);
      if (!original) throw new Error('Game not found');

      const { data, error } = await supabase
        .from('behavior_lab_games')
        .insert({
          title: `${original.title} (Copy)`,
          description: original.description,
          difficulty: original.difficulty,
          stage: original.stage,
          skill_tags: original.skill_tags,
          est_seconds: original.est_seconds,
          scope: agencyId ? 'agency' : original.scope,
          agency_id: agencyId || null,
          canonical_key: original.canonical_key,
          status: 'draft',
          content: original.content as any,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Game duplicated');
      return data;
    } catch (err: any) {
      console.error('Error duplicating game:', err);
      toast.error('Failed to duplicate game');
      return null;
    }
  }, [getGameById, user]);

  // Compute weak areas from recent attempts
  const getWeakAreas = useCallback(() => {
    const tagScores: Record<string, { total: number; count: number }> = {};
    for (const a of recentAttempts) {
      for (const tag of a.skill_tags) {
        if (!tagScores[tag]) tagScores[tag] = { total: 0, count: 0 };
        tagScores[tag].total += a.score_percent;
        tagScores[tag].count += 1;
      }
    }
    return Object.entries(tagScores)
      .map(([tag, s]) => ({ tag, avgScore: s.total / s.count }))
      .sort((a, b) => a.avgScore - b.avgScore);
  }, [recentAttempts]);

  useEffect(() => {
    fetchGames();
    fetchRecentAttempts();
  }, [fetchGames, fetchRecentAttempts]);

  return {
    games,
    loading,
    recentAttempts,
    fetchGames,
    fetchAllGames,
    fetchRecentAttempts,
    saveAttempt,
    getGameById,
    createGame,
    updateGame,
    duplicateGame,
    getWeakAreas,
  };
}
