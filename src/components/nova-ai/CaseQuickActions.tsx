import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Brain, Activity, TrendingUp, Users2, FileText, RefreshCw,
  Zap, ClipboardList, BookOpen
} from 'lucide-react';

const db = supabase as any;

interface QuickAction {
  id: string;
  action_key: string;
  action_title: string;
  action_description: string | null;
  default_reasoning_mode: string;
  default_prompt_text: string | null;
  domain_group: string;
}

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  full_case: <Brain className="w-4 h-4" />,
  behavior: <Activity className="w-4 h-4" />,
  skill: <TrendingUp className="w-4 h-4" />,
  caregiver: <Users2 className="w-4 h-4" />,
  report: <FileText className="w-4 h-4" />,
};

const DOMAIN_LABELS: Record<string, string> = {
  full_case: 'Case Overview',
  behavior: 'Behavior',
  skill: 'Skill',
  caregiver: 'Caregiver',
  report: 'Report Writing',
};

interface CaseQuickActionsProps {
  actions: QuickAction[];
  onLaunch: (action: QuickAction) => void;
  isLoading: boolean;
}

export function CaseQuickActions({ actions, onLaunch, isLoading }: CaseQuickActionsProps) {
  // Group by domain
  const grouped = actions.reduce((acc, a) => {
    const g = a.domain_group || 'other';
    if (!acc[g]) acc[g] = [];
    acc[g].push(a);
    return acc;
  }, {} as Record<string, QuickAction[]>);

  const domainOrder = ['full_case', 'behavior', 'skill', 'caregiver', 'report'];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
        <span className="text-xs text-muted-foreground">One-click clinical reasoning</span>
      </div>
      {domainOrder.map(domain => {
        const items = grouped[domain];
        if (!items?.length) return null;
        return (
          <div key={domain} className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{DOMAIN_ICONS[domain]}</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {DOMAIN_LABELS[domain] || domain}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {items.map(action => (
                <Card
                  key={action.id}
                  className="cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group"
                  onClick={() => !isLoading && onLaunch(action)}
                >
                  <CardContent className="p-3 flex items-start gap-2.5">
                    <Zap className="w-3.5 h-3.5 text-primary mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{action.action_title}</p>
                      {action.action_description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{action.action_description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type { QuickAction };
