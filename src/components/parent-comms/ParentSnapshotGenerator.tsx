import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, FileText, Calendar, Loader2, CheckCircle2, Send } from 'lucide-react';
import { useParentSnapshotGeneration } from '@/hooks/useBeaconCoreData';
import { toast } from 'sonner';

interface ParentSnapshotGeneratorProps {
  studentId: string;
  studentName: string;
}

export function ParentSnapshotGenerator({ studentId, studentName }: ParentSnapshotGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'weekly'>('daily');
  const { generateDailySnapshot, generateWeeklyReport } = useParentSnapshotGeneration();

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      if (reportType === 'daily') {
        await generateDailySnapshot(studentId);
        toast.success('Daily snapshot created');
      } else {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        await generateWeeklyReport(studentId, weekStart.toISOString().split('T')[0]);
        toast.success('Weekly report created');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          Parent Snapshot Generator
        </CardTitle>
        <CardDescription className="text-xs">
          Generate configurable daily or weekly parent outputs based on report profiles and rules.
        </CardDescription>
      </CardHeader>
      <CardContent className="py-0 pb-4 px-4 space-y-3">
        <div className="flex items-center gap-3">
          <Select value={reportType} onValueChange={(v) => setReportType(v as 'daily' | 'weekly')}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">
                <div className="flex items-center gap-2">
                  <Camera className="w-3 h-3" />
                  Daily Snapshot
                </div>
              </SelectItem>
              <SelectItem value="weekly">
                <div className="flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  Weekly Report
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            Generate {reportType === 'daily' ? 'Snapshot' : 'Report'}
          </Button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>
            {reportType === 'daily'
              ? 'Creates a parent-friendly daily behavior snapshot using today\'s data'
              : 'Compiles a weekly summary of behavior trends, points, and progress'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
