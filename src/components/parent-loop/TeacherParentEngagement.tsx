import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Eye, HelpCircle, Home, Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const db = supabase as any;

const ACTION_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  praise: { icon: Heart, label: 'Praised at home', color: 'text-pink-500' },
  home_followup: { icon: Eye, label: 'Noticed at home too', color: 'text-blue-500' },
  question: { icon: HelpCircle, label: 'Asked a question', color: 'text-amber-500' },
};

interface Props {
  studentId: string;
}

export function TeacherParentEngagement({ studentId }: Props) {
  const [actions, setActions] = useState<any[]>([]);
  const [reinforcements, setReinforcements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    Promise.all([
      db.from('parent_actions').select('*').eq('student_id', studentId).order('created_at', { ascending: false }).limit(20),
      db.from('home_reinforcement_log').select('*').eq('student_id', studentId).order('created_at', { ascending: false }).limit(10),
    ]).then(([actRes, reinRes]: any[]) => {
      setActions(actRes.data || []);
      setReinforcements(reinRes.data || []);
      setLoading(false);
    });
  }, [studentId]);

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>;
  }

  const totalActions = actions.length;
  const totalReinforcements = reinforcements.length;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Parent Engagement
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Summary badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1 text-xs">
            <Heart className="w-3 h-3 text-pink-500" />
            {totalActions} action{totalActions !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs">
            <Home className="w-3 h-3 text-emerald-500" />
            {totalReinforcements} home reinforcement{totalReinforcements !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Recent actions */}
        {actions.length === 0 && reinforcements.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">No parent engagement recorded yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {actions.map((a: any) => {
              const cfg = ACTION_CONFIG[a.action_type] || ACTION_CONFIG.praise;
              const Icon = cfg.icon;
              return (
                <div key={a.id} className="flex items-start gap-2 text-xs bg-muted/40 rounded px-2.5 py-2">
                  <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-foreground">{cfg.label}</span>
                    {a.message && <p className="text-muted-foreground mt-0.5 italic">"{a.message}"</p>}
                  </div>
                  <span className="text-muted-foreground shrink-0">
                    {format(new Date(a.created_at), 'MMM d')}
                  </span>
                </div>
              );
            })}
            {reinforcements.map((r: any) => (
              <div key={r.id} className="flex items-center gap-2 text-xs bg-emerald-500/5 rounded px-2.5 py-2">
                <Home className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="flex-1 text-foreground">{r.reinforcement}</span>
                <span className="text-muted-foreground shrink-0">{format(new Date(r.created_at), 'MMM d')}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
