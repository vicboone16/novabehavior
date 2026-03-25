import { useState, useRef } from 'react';
import { Printer, X, FileText, Users, Stethoscope, Heart, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import type { BehaviorSummaryRow } from './types';

type PrintMode = 'teacher' | 'team_meeting' | 'bcba' | 'parent' | 'fba_bip';

const PRINT_MODES: { value: PrintMode; label: string; icon: React.ElementType }[] = [
  { value: 'teacher', label: 'Teacher Summary', icon: FileText },
  { value: 'team_meeting', label: 'Team Meeting', icon: Users },
  { value: 'bcba', label: 'BCBA Clinical', icon: Stethoscope },
  { value: 'parent', label: 'Parent-Friendly', icon: Heart },
  { value: 'fba_bip', label: 'FBA/BIP Appendix', icon: BookOpen },
];

interface TeacherPrintPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  dateRange: { start: Date; end: Date };
  rows: BehaviorSummaryRow[];
}

export function TeacherPrintPreview({ open, onOpenChange, studentName, dateRange, rows }: TeacherPrintPreviewProps) {
  const [mode, setMode] = useState<PrintMode>('teacher');
  const printRef = useRef<HTMLDivElement>(null);

  const topBehaviors = rows.slice(0, 5);
  const increasing = rows.filter(r => r.clinicalFlag === 'increasing' || r.clinicalFlag === 'spike');
  const decreasing = rows.filter(r => r.clinicalFlag === 'decreasing');

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`
          <html><head><title>${studentName} - ${mode} Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 40px; color: #111; line-height: 1.5; }
            .report-header { border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
            .report-title { font-size: 20px; font-weight: 700; color: #111; }
            .report-subtitle { font-size: 12px; color: #666; margin-top: 4px; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 14px; font-weight: 700; color: #1e40af; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px; }
            .behavior-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
            .bar-container { width: 100px; height: 8px; background: #e5e7eb; border-radius: 4px; display: inline-block; margin-left: 8px; }
            .bar-fill { height: 100%; background: #2563eb; border-radius: 4px; }
            .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; margin: 2px; }
            .badge-red { background: #fee2e2; color: #991b1b; }
            .badge-green { background: #dcfce7; color: #166534; }
            .summary-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 12px; }
            ul { padding-left: 20px; }
            li { font-size: 12px; margin-bottom: 4px; }
            .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 8px; font-size: 10px; color: #999; text-align: center; }
            @media print { body { padding: 20px; } }
          </style></head><body>${printContent}</body></html>
        `);
        w.document.close();
        w.print();
      }
    }
  };

  const renderReplacementSkills = () => {
    const skills: string[] = [];
    if (rows.some(r => /escape|refusal|noncompliance/i.test(r.behaviorName))) {
      skills.push('Request break', 'Request help', 'Task tolerance');
    }
    if (rows.some(r => /aggress|tantrum/i.test(r.behaviorName))) {
      skills.push('Self-regulation', 'Identify emotion', 'Use calm-down strategy');
    }
    if (skills.length === 0) skills.push('Functional communication', 'Self-monitoring', 'Coping strategy use');
    return skills;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-base">
              <Printer className="w-4 h-4" /> Print Preview
            </span>
            <div className="flex items-center gap-2">
              <Select value={mode} onValueChange={v => setMode(v as PrintMode)}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRINT_MODES.map(m => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">
                      <span className="flex items-center gap-1.5">
                        <m.icon className="w-3.5 h-3.5" /> {m.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handlePrint} className="gap-1 text-xs">
                <Printer className="w-3.5 h-3.5" /> Print
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Printable Content */}
        <div ref={printRef} className="bg-white text-foreground p-6 rounded-lg border space-y-5">
          {/* Header */}
          <div className="report-header" style={{ borderBottom: '3px solid hsl(var(--primary))', paddingBottom: 12 }}>
            <div className="report-title text-lg font-bold">{studentName}</div>
            <div className="report-subtitle text-xs text-muted-foreground">
              {format(dateRange.start, 'MMM d, yyyy')} — {format(dateRange.end, 'MMM d, yyyy')} • {PRINT_MODES.find(m => m.value === mode)?.label}
            </div>
          </div>

          {/* Behavior Breakdown */}
          <div className="section">
            <h3 className="text-sm font-bold text-primary border-b pb-1 mb-2">Behavior Breakdown</h3>
            <div className="space-y-1.5">
              {topBehaviors.map(b => (
                <div key={b.behaviorId} className="flex items-center justify-between text-xs">
                  <span className="font-medium">{b.behaviorName}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(b.pctOfTotal, 100)}%` }} />
                    </div>
                    <span className="w-10 text-right font-semibold">{b.pctOfTotal}%</span>
                    <span className="w-12 text-right text-muted-foreground">{b.totalCount} total</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Concerns */}
          {increasing.length > 0 && (
            <div className="section">
              <h3 className="text-sm font-bold text-destructive border-b pb-1 mb-2">Top Concerns</h3>
              <div className="flex flex-wrap gap-1.5">
                {increasing.map(b => (
                  <Badge key={b.behaviorId} variant="destructive" className="text-[10px]">
                    {b.behaviorName} (+{b.trendPct ?? 0}%)
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="section">
            <h3 className="text-sm font-bold text-primary border-b pb-1 mb-2">
              {mode === 'parent' ? 'Summary' : 'Data-Informed Summary'}
            </h3>
            <div className="bg-muted/30 border rounded-lg p-3 text-xs leading-relaxed">
              {topBehaviors.length > 0
                ? `Behavior distribution suggests that ${topBehaviors[0].behaviorName} (${topBehaviors[0].pctOfTotal}%) is the primary area of focus. ${increasing.length > 0 ? `Increasing patterns noted in ${increasing.map(r => r.behaviorName).join(', ')}.` : ''} ${decreasing.length > 0 ? `Improvements observed in ${decreasing.map(r => r.behaviorName).join(', ')}.` : ''}`
                : 'No data available for summary.'}
            </div>
          </div>

          {/* Replacement Skills */}
          <div className="section">
            <h3 className="text-sm font-bold text-primary border-b pb-1 mb-2">Replacement Skills</h3>
            <ul className="list-disc pl-5 space-y-0.5">
              {renderReplacementSkills().map((s, i) => (
                <li key={i} className="text-xs">{s}</li>
              ))}
            </ul>
          </div>

          {/* Staff Response (teacher/team modes) */}
          {(mode === 'teacher' || mode === 'team_meeting') && (
            <div className="section">
              <h3 className="text-sm font-bold text-primary border-b pb-1 mb-2">Staff Response Focus</h3>
              <ul className="list-disc pl-5 space-y-0.5 text-xs">
                <li>Reinforce replacement behaviors immediately when observed</li>
                <li>Reduce task aversiveness during high-frequency periods</li>
                <li>Monitor for early escalation signals</li>
                <li>Maintain consistent consequence delivery</li>
              </ul>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-[10px] text-muted-foreground border-t pt-2 mt-4">
            Generated by NovaTrack • {format(new Date(), 'MMM d, yyyy h:mm a')} • Data-informed — not a clinical diagnosis
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
