import { useState } from 'react';
import { Download, FileText, Image, Table2, FileSpreadsheet, Package, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { executeExport } from './exportRenderer';
import type { BehaviorSummaryRow } from './types';

interface ExportCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summaryRows: BehaviorSummaryRow[];
  studentName: string;
  studentId: string;
  dateRange: { start: Date; end: Date };
  chartRef?: React.RefObject<HTMLDivElement>;
}

type ExportFormat = 'png' | 'pdf' | 'xlsx' | 'csv' | 'doc';
type ExportBundle = 'graph' | 'table' | 'summary' | 'full' | 'teacher' | 'bcba' | 'fba_bip' | 'bip_packet' | 'raw';

const FORMAT_OPTIONS: { value: ExportFormat; label: string; icon: React.ElementType }[] = [
  { value: 'png', label: 'PNG Image', icon: Image },
  { value: 'pdf', label: 'PDF Report', icon: FileText },
  { value: 'xlsx', label: 'Excel Workbook', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV Data', icon: Table2 },
  { value: 'doc', label: 'Document Report', icon: FileText },
];

const BUNDLE_OPTIONS: { value: ExportBundle; label: string; desc: string }[] = [
  { value: 'graph', label: 'Graph Only', desc: 'Chart image for presentations' },
  { value: 'table', label: 'Table Only', desc: 'Analytics table data' },
  { value: 'summary', label: 'Summary Only', desc: 'Behavior breakdown narrative' },
  { value: 'full', label: 'Graph + Table + Summary', desc: 'Complete behavior packet' },
  { value: 'teacher', label: 'Teacher-Friendly Packet', desc: 'Clean, jargon-free teacher handout' },
  { value: 'bcba', label: 'BCBA Clinical Packet', desc: 'Full clinical interpretation' },
  { value: 'fba_bip', label: 'FBA/BIP Appendix', desc: 'Assessment data appendix' },
  { value: 'bip_packet', label: 'BIP-Style Intervention Packet', desc: 'Full intervention packet with strategies and staff guides' },
  { value: 'raw', label: 'Raw Data Workbook', desc: 'Full data export for analysis' },
];

export function ExportCenter({ open, onOpenChange, summaryRows, studentName, studentId, dateRange, chartRef }: ExportCenterProps) {
  const { user } = useAuth();
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [bundle, setBundle] = useState<ExportBundle>('full');
  const [includeGraph, setIncludeGraph] = useState(true);
  const [includeTable, setIncludeTable] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    setLastResult(null);

    try {
      const result = await executeExport({
        studentName,
        studentId,
        dateRange,
        summaryRows,
        format,
        bundle,
        includeGraph,
        includeTable,
        includeSummary,
        chartElement: chartRef?.current ?? null,
      }, user.id);

      setLastResult({ success: result.success, error: result.diagnostics.error_stage ?? undefined });

      if (result.success) {
        toast.success(`${format.toUpperCase()} export downloaded`);
        onOpenChange(false);
      } else {
        toast.error(`Export failed: ${result.diagnostics.error_stage}`);
      }
    } catch (err: any) {
      toast.error('Export failed');
      setLastResult({ success: false, error: err.message });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Download className="w-4 h-4" /> Export Center
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format */}
          <div>
            <Label className="text-xs font-medium">Export Format</Label>
            <div className="grid grid-cols-5 gap-1.5 mt-1.5">
              {FORMAT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFormat(opt.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] transition-colors ${
                    format === opt.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/40 text-muted-foreground'
                  }`}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Bundle */}
          <div>
            <Label className="text-xs font-medium">Export Bundle</Label>
            <Select value={bundle} onValueChange={v => setBundle(v as ExportBundle)}>
              <SelectTrigger className="h-9 text-xs mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUNDLE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    <div>
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Include options */}
          <div className="space-y-2 border rounded-lg p-3">
            <Label className="text-xs font-medium">Include in Export</Label>
            <div className="grid grid-cols-3 gap-3 mt-1">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={includeGraph} onCheckedChange={v => setIncludeGraph(!!v)} />
                Graph
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={includeTable} onCheckedChange={v => setIncludeTable(!!v)} />
                Table
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={includeSummary} onCheckedChange={v => setIncludeSummary(!!v)} />
                Summary
              </label>
            </div>
          </div>

          {/* Pipeline status */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
            <Package className="w-3.5 h-3.5" />
            <span>Export uses dedicated rendering pipeline — charts are rendered off-screen for accuracy</span>
          </div>

          {/* Last result feedback */}
          {lastResult && (
            <div className={`flex items-center gap-2 text-xs p-2 rounded-md ${
              lastResult.success ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'
            }`}>
              {lastResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {lastResult.success ? 'Export completed successfully' : `Error: ${lastResult.error}`}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5">
            {exporting ? (
              <>Rendering...</>
            ) : (
              <><Download className="w-3.5 h-3.5" /> Export {format.toUpperCase()}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
