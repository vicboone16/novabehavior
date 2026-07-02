import { useCallback, useEffect, useState } from 'react';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { supabase } from '@/integrations/supabase/client';
import type { MasteryCriteriaType } from '@/types/behavior';

export interface AgencyDataCollectionSettings {
  ioaThresholdPercent: number;
  fidelityThresholdPercent: number;
  defaultSessionLengthMinutes: number;
  requireSessionType: boolean;
  defaultMasteryType: MasteryCriteriaType;
  defaultMasteryPercent: number;
  defaultMasteryConsecutiveSessions: number;
  defaultMasteryMinTrials: number;
}

export const DEFAULT_DATA_COLLECTION_SETTINGS: AgencyDataCollectionSettings = {
  ioaThresholdPercent: 80,
  fidelityThresholdPercent: 80,
  defaultSessionLengthMinutes: 30,
  requireSessionType: false,
  defaultMasteryType: 'percent_correct',
  defaultMasteryPercent: 80,
  defaultMasteryConsecutiveSessions: 3,
  defaultMasteryMinTrials: 10,
};

export function useAgencyDataCollectionSettings() {
  const { currentAgency, isAgencyAdmin } = useAgencyContext();
  const [settings, setSettings] = useState<AgencyDataCollectionSettings>(DEFAULT_DATA_COLLECTION_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!currentAgency) {
      setSettings(DEFAULT_DATA_COLLECTION_SETTINGS);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agency_data_collection_settings')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .maybeSingle();

      if (error) throw error;

      setSettings(
        data
          ? {
              ioaThresholdPercent: data.ioa_threshold_percent,
              fidelityThresholdPercent: data.fidelity_threshold_percent,
              defaultSessionLengthMinutes: data.default_session_length_minutes,
              requireSessionType: data.require_session_type,
              defaultMasteryType: data.default_mastery_type as MasteryCriteriaType,
              defaultMasteryPercent: data.default_mastery_percent,
              defaultMasteryConsecutiveSessions: data.default_mastery_consecutive_sessions,
              defaultMasteryMinTrials: data.default_mastery_min_trials,
            }
          : DEFAULT_DATA_COLLECTION_SETTINGS
      );
    } catch (error) {
      console.error('Error fetching agency data collection settings:', error);
      setSettings(DEFAULT_DATA_COLLECTION_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, [currentAgency]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (next: AgencyDataCollectionSettings): Promise<boolean> => {
    if (!currentAgency || !isAgencyAdmin) return false;

    try {
      const { error } = await supabase
        .from('agency_data_collection_settings')
        .upsert(
          {
            agency_id: currentAgency.id,
            ioa_threshold_percent: next.ioaThresholdPercent,
            fidelity_threshold_percent: next.fidelityThresholdPercent,
            default_session_length_minutes: next.defaultSessionLengthMinutes,
            require_session_type: next.requireSessionType,
            default_mastery_type: next.defaultMasteryType,
            default_mastery_percent: next.defaultMasteryPercent,
            default_mastery_consecutive_sessions: next.defaultMasteryConsecutiveSessions,
            default_mastery_min_trials: next.defaultMasteryMinTrials,
          },
          { onConflict: 'agency_id' }
        );

      if (error) throw error;

      setSettings(next);
      return true;
    } catch (error) {
      console.error('Error saving agency data collection settings:', error);
      return false;
    }
  };

  return { settings, loading, saveSettings, refreshSettings: fetchSettings, canEdit: isAgencyAdmin };
}
