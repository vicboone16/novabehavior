import { useEffect, useRef, useState, useCallback } from 'react';
import { useDataStore } from '@/store/dataStore';
import { toast } from '@/hooks/use-toast';

const AUTO_SAVE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export function useAutoSave() {
  const { saveSession, hasUnsavedChanges } = useDataStore();
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const performAutoSave = useCallback(() => {
    if (!hasUnsavedChanges()) {
      return;
    }

    setIsAutoSaving(true);
    const result = saveSession();
    
    if (result.saved) {
      setLastAutoSave(new Date());
      toast({
        title: "Auto-saved",
        description: "Your session data was automatically saved.",
        duration: 3000,
      });
    }
    
    setIsAutoSaving(false);
  }, [saveSession, hasUnsavedChanges]);

  // Set up the auto-save interval
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      performAutoSave();
    }, AUTO_SAVE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [performAutoSave]);

  // Also save when the page is about to unload (if there are unsaved changes)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        // Save before leaving
        saveSession();
        // Show browser warning
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, saveSession]);

  return {
    lastAutoSave,
    isAutoSaving,
    triggerAutoSave: performAutoSave,
  };
}
