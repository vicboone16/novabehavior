import { useState, useRef, useMemo } from 'react';
import { Printer, FileText, Users, Stethoscope, Heart, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import type { BehaviorSummaryRow } from './types';
import { generateFullSummary, type ToneProfile } from './summaryEngine';

type PrintMode = 'teacher' | 'team_meeting' | 'bcba' | 'parent' | 'fba_bip' | 'bip_packet';

const PRINT_MODES: { value: PrintMode; label: string; icon: React.ElementType; tone: ToneProfile }[] = [
  { value: 'teacher', label: 'Teacher Summary', icon: FileText, tone: 'teacher_friendly' },
  { value: 'team_meeting', label: 'Team Meeting', icon: Users, tone: 'clinical' },
  { value: 'bcba', label: 'BCBA Clinical', icon: Stethoscope, tone: 'clinical' },
  { value: 'parent', label: 'Parent-Friendly', icon: Heart, tone: 'parent_friendly' },
  { value: 'fba_bip', label: 'FBA/BIP Appendix', icon: BookOpen, tone: 'detailed' },
  { value: 'bip_packet', label: 'BIP Intervention Packet', icon: BookOpen, tone: 'teacher_friendly' },
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

  const modeConfig = PRINT_MODES.find(m => m.value === mode)!;
  const dateRangeLabel = `${format(dateRange.start, 'MMM d, yyyy')} — ${format(dateRange.end, 'MMM d, yyyy')}`;
  const totalDays = Math.max(1, Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / 86400000));

  const summary = useMemo(() => {
    if (rows.length === 0) return null;
    return generateFullSummary({
      rows,
      studentName,
      tone: modeConfig.tone,
      dateRangeLabel,
      totalDays,
      daysWithData: Math.round(totalDays * 0.7),
    });
  }, [rows, studentName, modeConfig.tone, dateRangeLabel, totalDays]);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>${studentName} - ${modeConfig.label}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
        .report-header { border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
        .report-title { font-size: 22px; font-weight: 700; color: #111; letter-spacing: -0.3px; }
        .report-subtitle { font-size: 12px; color: #666; margin-top: 4px; }
        .section { margin-bottom: 24px; page-break-inside: avoid; }
        .section-title { font-size: 13px; font-weight: 700; color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        .section-title.alert { color: #dc2626; border-color: #fecaca; }
        .behavior-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
        .behavior-name { font-weight: 600; min-width: 120px; }
        .bar-track { width: 120px; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
        .bar-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #2563eb); border-radius: 4px; }
        .pct { width: 40px; text-align: right; font-weight: 700; font-size: 12px; }
        .count-label { width: 60px; text-align: right; color: #6b7280; font-size: 11px; }
        .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; margin: 2px 4px 2px 0; }
        .badge-red { background: #fee2e2; color: #991b1b; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-blue { background: #dbeafe; color: #1e40af; }
        .summary-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; font-size: 12px; line-height: 1.7; }
        .escalation-block { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 16px; font-size: 12px; }
        .staff-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .staff-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
        .staff-card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .staff-card-title.prevent { color: #2563eb; }
        .staff-card-title.teach { color: #059669; }
        .staff-card-title.respond { color: #7c3aed; }
        .staff-card p { font-size: 12px; color: #374151; }
        ul { padding-left: 20px; }
        li { font-size: 12px; margin-bottom: 6px; color: #374151; }
        .trend-item { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; font-size: 12px; }
        .trend-icon { flex-shrink: 0; font-size: 11px; margin-top: 2px; }
        .trend-icon.up { color: #dc2626; }
        .trend-icon.down { color: #059669; }
        .trend-icon.stable { color: #6b7280; }
        .data-note { background: #f1f5f9; border-radius: 8px; padding: 10px; font-size: 11px; color: #64748b; font-style: italic; }
        .footer { margin-top: 36px; border-top: 2px solid #e5e7eb; padding-top: 10px; font-size: 10px; color: #9ca3af; text-align: center; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media print { 
          body { padding: 24px; } 
          .section { page-break-inside: avoid; }
        }
      </style></head><body>${printContent}</body></html>
    `);
    w.document.close();
    w.print();
  };

  const isDetailed = mode === 'bcba' || mode === 'fba_bip' || mode === 'team_meeting';

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
          <div className="report-header" style={{ borderBottom: '3px solid hsl(var(--primary))', paddingBottom: 16 }}>
            <div className="text-lg font-bold text-foreground">{studentName}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {dateRangeLabel} • {modeConfig.label}
            </div>
          </div>

          {!summary ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No behavior data available for this range.
            </div>
          ) : (
            <>
              {/* Behavior Breakdown with visual bars */}
              <div className="section">
                <h3 className="text-sm font-bold text-primary border-b-2 border-border pb-1.5 mb-3 uppercase tracking-wider">
                  Behavior Breakdown
                </h3>
                <div className="space-y-2">
                  {summary.behaviorPercentages.slice(0, 6).map(b => (
                    <div key={b.behaviorId} className="flex items-center justify-between text-xs gap-2">
                      <span className="font-semibold min-w-[100px] truncate">{b.behaviorName}</span>
                      <div className="flex-1 max-w-[140px] h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(b.pct, 100)}%`,
                            background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))',
                          }}
                        />
                      </div>
                      <span className="w-10 text-right font-bold">{b.pct}%</span>
                      <span className="w-14 text-right text-muted-foreground">{b.count} total</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trend badges */}
              {summary.trendSummaries.length > 0 && (
                <div className="section">
                  <h3 className="text-sm font-bold text-primary border-b-2 border-border pb-1.5 mb-3 uppercase tracking-wider">
                    Key Trends
                  </h3>
                  <div className="space-y-1.5">
                    {summary.trendSummaries.map((t, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className={`mt-0.5 text-[10px] ${t.type === 'increase' ? 'text-destructive' : t.type === 'decrease' ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {t.type === 'increase' ? '▲' : t.type === 'decrease' ? '▼' : '●'}
                        </span>
                        <span className="text-foreground leading-relaxed">{t.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Escalation */}
              {summary.escalationChain && (
                <div className="section">
                  <h3 className="text-sm font-bold text-destructive border-b-2 border-destructive/30 pb-1.5 mb-3 uppercase tracking-wider">
                    Escalation Pattern
                  </h3>
                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                    <p className="text-xs text-foreground leading-relaxed">{summary.escalationChain}</p>
                  </div>
                </div>
              )}

              {/* Data-Informed Summary */}
              <div className="section">
                <h3 className="text-sm font-bold text-primary border-b-2 border-border pb-1.5 mb-3 uppercase tracking-wider">
                  {mode === 'parent' ? 'Summary' : 'Data-Informed Summary'}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px]">
                    {summary.confidenceTier.charAt(0).toUpperCase() + summary.confidenceTier.slice(1)} Confidence
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {summary.functionHypothesis === 'escape' ? 'Escape Pattern' :
                     summary.functionHypothesis === 'attention' ? 'Attention Pattern' :
                     summary.functionHypothesis === 'mixed' ? 'Mixed Pattern' :
                     summary.functionHypothesis === 'automatic' ? 'Possible Automatic' : 'Undetermined'}
                  </Badge>
                </div>
                <div className="bg-muted/30 border rounded-lg p-3 text-xs leading-relaxed text-foreground">
                  {summary.fbaSummary}
                </div>
              </div>

              {/* Antecedents & Consequences (detailed modes) */}
              {isDetailed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="section">
                    <h3 className="text-sm font-bold text-primary border-b-2 border-border pb-1.5 mb-3 uppercase tracking-wider">
                      Antecedents
                    </h3>
                    <p className="text-xs text-foreground leading-relaxed">{summary.antecedents}</p>
                  </div>
                  <div className="section">
                    <h3 className="text-sm font-bold text-primary border-b-2 border-border pb-1.5 mb-3 uppercase tracking-wider">
                      Consequences
                    </h3>
                    <p className="text-xs text-foreground leading-relaxed">{summary.consequences}</p>
                  </div>
                </div>
              )}

              {/* Replacement Skills */}
              <div className="section">
                <h3 className="text-sm font-bold text-primary border-b-2 border-border pb-1.5 mb-3 uppercase tracking-wider">
                  Priority Replacement Skills
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {summary.replacementSkills.map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>
                  ))}
                </div>
              </div>

              {/* Intervention Focus */}
              <div className="section">
                <h3 className="text-sm font-bold text-primary border-b-2 border-border pb-1.5 mb-3 uppercase tracking-wider">
                  Intervention Focus
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  {summary.interventionFocus.map((s, i) => (
                    <li key={i} className="text-xs text-foreground">{s}</li>
                  ))}
                </ul>
              </div>

              {/* Staff Response — 3-card grid */}
              {(mode === 'teacher' || mode === 'team_meeting' || mode === 'fba_bip') && (
                <div className="section">
                  <h3 className="text-sm font-bold text-primary border-b-2 border-border pb-1.5 mb-3 uppercase tracking-wider">
                    Staff Response Focus
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Prevent</p>
                      <p className="text-xs text-foreground">{summary.staffResponse.prevent}</p>
                    </div>
                    <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                      <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">Teach</p>
                      <p className="text-xs text-foreground">{summary.staffResponse.teach}</p>
                    </div>
                    <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-3">
                      <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wider mb-1">Respond</p>
                      <p className="text-xs text-foreground">{summary.staffResponse.respond}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Reinforcement Notes (detailed) */}
              {isDetailed && summary.reinforcementNotes && (
                <div className="section">
                  <h3 className="text-sm font-bold text-primary border-b-2 border-border pb-1.5 mb-3 uppercase tracking-wider">
                    Reinforcement Notes
                  </h3>
                  <p className="text-xs text-foreground leading-relaxed">{summary.reinforcementNotes}</p>
                </div>
              )}

              {/* Data Quality Note */}
              {summary.dataCompletenessNote && (
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-[10px] text-muted-foreground italic">{summary.dataCompletenessNote}</p>
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-[10px] text-muted-foreground border-t-2 border-border pt-3 mt-6">
                Generated by NovaTrack • {format(new Date(), 'MMM d, yyyy h:mm a')} • Data-informed — not a clinical diagnosis
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
