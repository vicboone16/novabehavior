import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDataStore } from '@/store/dataStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logAuditEvent } from '@/lib/auditLogger';

interface SessionTimeoutConfig {
  timeoutMinutes: number;
  warningMinutes: number; // Show warning X minutes before timeout
  autoSaveIntervalSeconds: number;
}

const DEFAULT_CONFIG: SessionTimeoutConfig = {
  timeoutMinutes: 15,
  warningMinutes: 2,
  autoSaveIntervalSeconds: 120,
};

export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  const { saveSession, hasUnsavedChanges, currentSessionId } = useDataStore();
  
  const [config, setConfig] = useState<SessionTimeoutConfig>(DEFAULT_CONFIG);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);
  
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  // Load security settings from database
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      
      try {
        const { data: settings } = await supabase
          .from('security_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['session_timeout_minutes', 'auto_save_interval_seconds']);
        
        if (settings) {
          const newConfig = { ...DEFAULT_CONFIG };
          settings.forEach(setting => {
            if (setting.setting_key === 'session_timeout_minutes') {
              newConfig.timeoutMinutes = parseInt(setting.setting_value as string) || 15;
            }
            if (setting.setting_key === 'auto_save_interval_seconds') {
              newConfig.autoSaveIntervalSeconds = parseInt(setting.setting_value as string) || 120;
            }
          });
          setConfig(newConfig);
        }
      } catch (error) {
        console.error('Failed to load security settings:', error);
      }
    };
    
    loadSettings();
  }, [user]);

  // Perform emergency save before timeout
  const performEmergencySave = useCallback(async () => {
    if (currentSessionId && hasUnsavedChanges()) {
      try {
        const result = saveSession();
        if (result.saved) {
          console.log('Emergency save completed before timeout');
          await logAuditEvent('emergency_save', 'session', currentSessionId, 'Emergency save before timeout');
        }
      } catch (error) {
        console.error('Emergency save failed:', error);
        // Store in localStorage as backup
        try {
          const backupKey = `session_backup_${currentSessionId}_${Date.now()}`;
          localStorage.setItem(backupKey, JSON.stringify({
            timestamp: new Date().toISOString(),
            sessionId: currentSessionId,
            reason: 'timeout_emergency_save_failed',
          }));
        } catch (e) {
          console.error('Backup to localStorage also failed:', e);
        }
      }
    }
  }, [currentSessionId, hasUnsavedChanges, saveSession]);

  // Handle timeout - save then logout
  const handleTimeout = useCallback(async () => {
    setShowWarning(false);
    
    // Perform final save
    await performEmergencySave();
    
    // Log the timeout
    await logAuditEvent('session_timeout', 'auth', undefined, 'Session timed out due to inactivity');
    
    toast({
      title: 'Session Timed Out',
      description: 'You have been logged out due to inactivity. Your data has been saved.',
      variant: 'default',
    });
    
    // Sign out
    await signOut();
  }, [performEmergencySave, signOut]);

  // Reset activity timer
  const resetActivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setIsActive(true);
    
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    
    if (!user) return;
    
    const timeoutMs = config.timeoutMinutes * 60 * 1000;
    const warningMs = (config.timeoutMinutes - config.warningMinutes) * 60 * 1000;
    
    // Set warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemainingSeconds(config.warningMinutes * 60);
      
      // Start countdown
      countdownRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningMs);
    
    // Set timeout timer
    timeoutRef.current = setTimeout(handleTimeout, timeoutMs);
  }, [user, config, handleTimeout]);

  // Activity detection
  useEffect(() => {
    if (!user) return;
    
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      const now = Date.now();
      // Only reset if more than 1 second since last activity (debounce)
      if (now - lastActivityRef.current > 1000) {
        resetActivityTimer();
      }
    };
    
    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
    
    // Initial timer setup
    resetActivityTimer();
    
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [user, resetActivityTimer]);

  // Auto-save interval
  useEffect(() => {
    if (!user || !currentSessionId) {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      return;
    }
    
    autoSaveRef.current = setInterval(() => {
      if (hasUnsavedChanges()) {
        const result = saveSession();
        if (result.saved) {
          console.log('Auto-save completed');
        }
      }
    }, config.autoSaveIntervalSeconds * 1000);
    
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [user, currentSessionId, config.autoSaveIntervalSeconds, hasUnsavedChanges, saveSession]);

  // Extend session (called when user clicks "Stay Logged In")
  const extendSession = useCallback(() => {
    resetActivityTimer();
    logAuditEvent('session_extended', 'auth', undefined, 'User extended session before timeout');
    toast({
      title: 'Session Extended',
      description: `Your session has been extended for ${config.timeoutMinutes} more minutes.`,
    });
  }, [resetActivityTimer, config.timeoutMinutes]);

  // Force save now
  const forceSave = useCallback(async () => {
    if (currentSessionId) {
      const result = saveSession();
      if (result.saved) {
        toast({
          title: 'Data Saved',
          description: 'Your session data has been saved successfully.',
        });
        await logAuditEvent('manual_save', 'session', currentSessionId, 'Manual save triggered');
      }
    }
  }, [currentSessionId, saveSession]);

  return {
    showWarning,
    remainingSeconds,
    isActive,
    config,
    extendSession,
    forceSave,
    performEmergencySave,
  };
}
