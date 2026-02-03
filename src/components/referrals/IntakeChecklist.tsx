import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ChecklistItem, ChecklistStatus } from '@/types/referral';

interface IntakeChecklistProps {
  referralId: string;
}

interface ChecklistData {
  id: string;
  items: ChecklistItem[];
  completed_items: string[];
  status: ChecklistStatus;
}

const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: '1', label: 'Referral form received', required: true, category: 'Documents' },
  { id: '2', label: 'Insurance verification completed', required: true, category: 'Insurance' },
  { id: '3', label: 'Prior authorization obtained', required: true, category: 'Insurance' },
  { id: '4', label: 'Consent forms signed', required: true, category: 'Documents' },
  { id: '5', label: 'Medical records received', required: false, category: 'Documents' },
  { id: '6', label: 'Initial assessment scheduled', required: true, category: 'Scheduling' },
  { id: '7', label: 'Intake interview completed', required: true, category: 'Assessment' },
  { id: '8', label: 'Previous assessments reviewed', required: false, category: 'Assessment' },
];

export function IntakeChecklist({ referralId }: IntakeChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrCreateChecklist();
  }, [referralId]);

  const fetchOrCreateChecklist = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('intake_checklists')
        .select('*')
        .eq('referral_id', referralId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setChecklist({
          id: data.id,
          items: (data.items as unknown as ChecklistItem[]) || [],
          completed_items: (data.completed_items as unknown as string[]) || [],
          status: data.status as ChecklistStatus,
        });
      } else {
        const insertData = {
            referral_id: referralId,
            items: JSON.parse(JSON.stringify(DEFAULT_CHECKLIST_ITEMS)),
            completed_items: [],
            status: 'pending',
          };
        const { data: newChecklist, error: createError } = await supabase
          .from('intake_checklists')
          .insert([insertData])
          .select()
          .single();

        if (createError) throw createError;
        if (newChecklist) {
          setChecklist({
            id: newChecklist.id,
            items: (newChecklist.items as unknown as ChecklistItem[]) || [],
            completed_items: (newChecklist.completed_items as unknown as string[]) || [],
            status: newChecklist.status as ChecklistStatus,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = async (itemId: string) => {
    if (!checklist) return;

    const newCompletedItems = checklist.completed_items.includes(itemId)
      ? checklist.completed_items.filter(id => id !== itemId)
      : [...checklist.completed_items, itemId];

    const allRequiredComplete = checklist.items
      .filter(item => item.required)
      .every(item => newCompletedItems.includes(item.id));

    const newStatus: ChecklistStatus = allRequiredComplete ? 'complete' : 'in_progress';

    try {
      const { error } = await supabase
        .from('intake_checklists')
        .update({
          completed_items: newCompletedItems,
          status: newStatus,
        })
        .eq('id', checklist.id);

      if (error) throw error;

      setChecklist({
        ...checklist,
        completed_items: newCompletedItems,
        status: newStatus,
      });
    } catch (error) {
      console.error('Error updating checklist:', error);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading checklist...</div>;
  }

  if (!checklist) {
    return <div className="text-sm text-muted-foreground">Failed to load checklist</div>;
  }

  const completedCount = checklist.completed_items.length;
  const totalCount = checklist.items.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Intake Checklist</h3>
        <Badge variant={checklist.status === 'complete' ? 'default' : 'secondary'}>
          {completedCount}/{totalCount} complete
        </Badge>
      </div>
      
      <div className="space-y-2">
        {checklist.items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <Checkbox
              id={item.id}
              checked={checklist.completed_items.includes(item.id)}
              onCheckedChange={() => toggleItem(item.id)}
            />
            <label 
              htmlFor={item.id} 
              className={`text-sm cursor-pointer flex-1 ${
                checklist.completed_items.includes(item.id) ? 'line-through text-muted-foreground' : ''
              }`}
            >
              {item.label}
              {item.required && <span className="text-destructive ml-1">*</span>}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
