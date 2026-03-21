import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStudentSyncControls, useUpdateSyncControl } from '@/hooks/useBopsData';
import { Loader2 } from 'lucide-react';

export function BopsSyncPanel({ studentId }: { studentId: string }) {
  const { data: controls, isLoading } = useStudentSyncControls(studentId);
  const updateMut = useUpdateSyncControl();

  if (isLoading) return <Loader2 className="animate-spin mx-auto mt-8" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Beacon Sync Controls</CardTitle>
      </CardHeader>
      <CardContent>
        {(!controls || controls.length === 0) ? (
          <p className="text-center text-muted-foreground py-8">No sync controls configured.</p>
        ) : (
          <div className="space-y-3">
            {controls.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">{c.item_name}</p>
                  <Badge variant="outline" className="text-xs">{c.item_type}</Badge>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs">
                    <Switch
                      checked={c.shared_to_beacon || false}
                      onCheckedChange={v => updateMut.mutate({ id: c.id, updates: { shared_to_beacon: v } })}
                    />
                    Shared
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <Switch
                      checked={c.beacon_tracking_allowed || false}
                      onCheckedChange={v => updateMut.mutate({ id: c.id, updates: { beacon_tracking_allowed: v } })}
                    />
                    Trackable
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <Switch
                      checked={c.beacon_teacher_edit_allowed || false}
                      onCheckedChange={v => updateMut.mutate({ id: c.id, updates: { beacon_teacher_edit_allowed: v } })}
                    />
                    Editable
                  </label>
                  <Select
                    value={c.return_to_nova_mode || 'none'}
                    onValueChange={v => updateMut.mutate({ id: c.id, updates: { return_to_nova_mode: v } })}
                  >
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="daily_summary">Daily Summary</SelectItem>
                      <SelectItem value="weekly_summary">Weekly Summary</SelectItem>
                      <SelectItem value="manual_import_eligible">Manual Import</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
