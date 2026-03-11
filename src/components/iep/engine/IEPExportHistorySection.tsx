import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const db = supabase as any;

interface Props {
  studentId: string;
}

export function IEPExportHistorySection({ studentId }: Props) {
  const [exports, setExports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.from('v_treatment_intelligence_export_history')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }: any) => {
        setExports(data || []);
        setLoading(false);
      });
  }, [studentId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (exports.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          No export history yet. Exports will appear here when recommendations or drafts are sent to FBA, BIP, reassessment, session notes, or clinical drafts.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-muted-foreground" />
          Export History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {exports.map((e: any) => (
            <div key={e.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                    {e.target_name || e.export_target_key?.replace(/_/g, ' ') || 'Export'}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {e.source_type?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {e.created_at ? format(new Date(e.created_at), 'MMM d, h:mm a') : ''}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
