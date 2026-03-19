/**
 * Nova AI Copilot — Real-Time Spotting Client Hook
 * Sends transcript chunks to the spotting engine and accumulates results.
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SpottedItem {
  id: string;
  type: string;
  value: string;
  confidence: 'high' | 'medium' | 'low';
  basis: 'directly_stated' | 'observed' | 'inferred' | 'unclear';
  noteSentence: string;
  status: 'pending' | 'confirmed' | 'dismissed' | 'edited';
}

export interface SpotterFlag {
  type: 'uncertain' | 'missing_info' | 'clarification_needed';
  message: string;
}

export function useCopilotSpotter() {
  const [items, setItems] = useState<SpottedItem[]>([]);
  const [draftLines, setDraftLines] = useState<string[]>([]);
  const [flags, setFlags] = useState<SpotterFlag[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const idCounter = useRef(0);
  const lastAnalyzedRef = useRef('');

  const analyzeChunk = useCallback(async (transcript: string, workflowType: string, noteType: string) => {
    // Skip if transcript hasn't changed meaningfully
    if (transcript.length < 20 || transcript === lastAnalyzedRef.current) return;
    
    // Only send new content (delta)
    const newContent = transcript.slice(lastAnalyzedRef.current.length).trim();
    if (newContent.length < 15) return;

    lastAnalyzedRef.current = transcript;
    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('nova-copilot-spot', {
        body: {
          transcript: newContent,
          workflowType,
          noteType,
          existingItems: items.filter(i => i.status !== 'dismissed'),
        },
      });

      if (error) throw error;

      if (data?.items?.length) {
        const newItems: SpottedItem[] = data.items.map((item: any) => ({
          ...item,
          id: `spot-${++idCounter.current}`,
          status: 'pending' as const,
        }));
        setItems(prev => [...prev, ...newItems]);
      }

      if (data?.draftLines?.length) {
        setDraftLines(prev => [...prev, ...data.draftLines]);
      }

      if (data?.flags?.length) {
        setFlags(prev => [...prev, ...data.flags]);
      }
    } catch (err) {
      console.error('[CopilotSpotter] Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [items]);

  const confirmItem = useCallback((id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'confirmed' } : i));
  }, []);

  const dismissItem = useCallback((id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'dismissed' } : i));
  }, []);

  const editItem = useCallback((id: string, newValue: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, value: newValue, status: 'edited' } : i));
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    setDraftLines([]);
    setFlags([]);
    lastAnalyzedRef.current = '';
    idCounter.current = 0;
  }, []);

  return {
    items,
    draftLines,
    flags,
    isAnalyzing,
    analyzeChunk,
    confirmItem,
    dismissItem,
    editItem,
    clearAll,
  };
}
