import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import {
  BrainCircuit, FileText, ClipboardList, Stethoscope, StickyNote,
  Save, MoreHorizontal, Loader2, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

const db = supabase as any;

export type TreatmentSection =
  | 'behavior_intelligence'
  | 'skill_program_progress'
  | 'replacement_behavior_bip'
  | 'caregiver_training'
  | 'clinical_recommendations'
  | 'goal_suggestions'
  | 'report_reassessment_prep';

interface Props {
  studentId: string;
  section: TreatmentSection;
  sourceObjectId?: string;
  contextText: string;
  title?: string;
  compact?: boolean;
}

interface ActionDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  rpc: string;
  sections: TreatmentSection[];
}

const ACTIONS: ActionDef[] = [
  { key: 'nova_ai', label: 'Ask Nova AI', icon: <BrainCircuit className="w-3.5 h-3.5" />, rpc: 'launch_nova_ai_from_treatment_intelligence', sections: ['behavior_intelligence', 'skill_program_progress', 'replacement_behavior_bip', 'caregiver_training', 'clinical_recommendations', 'goal_suggestions', 'report_reassessment_prep'] },
  { key: 'fba', label: 'Send to FBA', icon: <FileText className="w-3.5 h-3.5" />, rpc: 'export_treatment_recommendation_to_fba', sections: ['behavior_intelligence', 'clinical_recommendations'] },
  { key: 'bip', label: 'Send to BIP', icon: <Stethoscope className="w-3.5 h-3.5" />, rpc: 'export_treatment_recommendation_to_bip', sections: ['behavior_intelligence', 'replacement_behavior_bip', 'clinical_recommendations'] },
  { key: 'reassessment', label: 'Send to Reassessment', icon: <ClipboardList className="w-3.5 h-3.5" />, rpc: 'export_treatment_goal_draft_to_reassessment', sections: ['skill_program_progress', 'caregiver_training', 'clinical_recommendations', 'goal_suggestions', 'report_reassessment_prep'] },
  { key: 'session_note', label: 'Add to Session Note', icon: <StickyNote className="w-3.5 h-3.5" />, rpc: 'export_treatment_recommendation_to_session_note', sections: ['behavior_intelligence', 'clinical_recommendations'] },
  { key: 'clinical_draft', label: 'Save to Clinical Drafts', icon: <Save className="w-3.5 h-3.5" />, rpc: 'export_treatment_recommendation_to_clinical_draft', sections: ['behavior_intelligence', 'skill_program_progress', 'replacement_behavior_bip', 'caregiver_training', 'clinical_recommendations', 'goal_suggestions', 'report_reassessment_prep'] },
];

export function TreatmentIntelligenceActions({ studentId, section, sourceObjectId, contextText, title, compact }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [exported, setExported] = useState<Set<string>>(new Set());

  const availableActions = ACTIONS.filter(a => a.sections.includes(section));

  const handleAction = async (action: ActionDef) => {
    if (!user) return;
    setSaving(true);
    try {
      if (action.key === 'nova_ai') {
        // Log and navigate
        await db.rpc('launch_nova_ai_from_treatment_intelligence', {
          p_student_id: studentId,
          p_source_section: section,
          p_source_object_id: sourceObjectId || null,
          p_prompt_text: contextText,
          p_created_by: user.id,
        });
        const prompt = `${title ? `Context: ${title}\n\n` : ''}${contextText}`;
        navigate(`/nova-ai?prompt=${encodeURIComponent(prompt)}&context=treatment_intelligence`);
        return;
      }

      const rpcParams: any = {
        p_student_id: studentId,
        p_source_section: section,
        p_source_object_id: sourceObjectId || null,
        p_text: contextText,
        p_created_by: user.id,
      };

      const { error } = await db.rpc(action.rpc, rpcParams);
      if (error) throw error;
      setExported(prev => new Set([...prev, action.key]));
      toast.success(`Sent to ${action.label.replace('Send to ', '').replace('Add to ', '').replace('Save to ', '')}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Action failed');
    } finally {
      setSaving(false);
    }
  };

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MoreHorizontal className="w-3.5 h-3.5" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-[10px] text-muted-foreground">Intelligence Actions</DropdownMenuLabel>
          {availableActions.map(action => (
            <DropdownMenuItem key={action.key} onClick={() => handleAction(action)} disabled={saving}>
              {action.icon}
              <span className="ml-2 text-xs">{action.label}</span>
              {exported.has(action.key) && <CheckCircle2 className="w-3 h-3 ml-auto text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {availableActions.slice(0, 4).map(action => (
        <Button
          key={action.key}
          variant="outline"
          size="sm"
          className="h-6 text-[10px] gap-1"
          onClick={() => handleAction(action)}
          disabled={saving}
        >
          {action.icon}
          {action.label.replace('Send to ', '').replace('Add to ', '').replace('Save to ', '')}
          {exported.has(action.key) && <CheckCircle2 className="w-2.5 h-2.5 text-primary" />}
        </Button>
      ))}
      {availableActions.length > 4 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1">
              <MoreHorizontal className="w-3 h-3" /> More
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableActions.slice(4).map(action => (
              <DropdownMenuItem key={action.key} onClick={() => handleAction(action)} disabled={saving}>
                {action.icon}
                <span className="ml-2 text-xs">{action.label}</span>
                {exported.has(action.key) && <CheckCircle2 className="w-3 h-3 ml-auto text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
