/**
 * Contextual coach marks — small helper tips shown once per section.
 */

import { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';

interface CoachMark {
  id: string;
  text: string;
}

const STORAGE_KEY = 'nova-demo-dismissed-coaches';

interface Props {
  markId: string;
  text: string;
  className?: string;
}

export function CoachMark({ markId, text, className = '' }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!dismissed.includes(markId)) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, [markId]);

  const dismiss = () => {
    setVisible(false);
    try {
      const dismissed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      dismissed.push(markId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
    } catch {}
  };

  if (!visible) return null;

  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg border border-primary/20 bg-primary/5 text-sm animate-in fade-in slide-in-from-top-1 ${className}`}>
      <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
      <span className="flex-1 text-xs text-foreground">{text}</span>
      <button onClick={dismiss} className="text-muted-foreground hover:text-foreground shrink-0">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

/** Reset all coach marks — useful in demo mode */
export function resetCoachMarks() {
  localStorage.removeItem(STORAGE_KEY);
}

/** Pre-defined coach mark IDs and text */
export const COACH_MARKS = {
  learnerProfile: { id: 'coach-learner-profile', text: 'Start here — everything connects to the learner.' },
  teacherSummary: { id: 'coach-teacher-summary', text: 'Submitted by a teacher. This helps inform school-based support and assessments.' },
  caregiverSummary: { id: 'coach-caregiver-summary', text: 'Submitted through Behavior Decoded. Often used to guide parent training.' },
  assessmentDashboard: { id: 'coach-assessment-dashboard', text: 'Track what\'s been sent, completed, and reviewed.' },
  fbaSection: { id: 'coach-fba-section', text: 'This is where behavior patterns are analyzed and explained.' },
  billingDashboard: { id: 'coach-billing-dashboard', text: 'Compare payer types and track authorizations here.' },
  alertsPanel: { id: 'coach-alerts-panel', text: 'Focus here to see what needs immediate attention.' },
} as const;
