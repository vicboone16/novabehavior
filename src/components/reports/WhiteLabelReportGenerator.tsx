import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useReportBranding, useGeneratedReports } from '@/hooks/useReportBranding';
import { REPORT_TYPE_LABELS, ReportType, ReportContent } from '@/types/reportBranding';
import { Student } from '@/types/behavior';
import { Loader2, FileText, Palette, Download } from 'lucide-react';
import { generateGenericDocxReport } from '@/lib/insuranceReportExport';
import { toast } from 'sonner';

interface WhiteLabelReportGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student;
}

const TIME_RANGES = [
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '60', label: 'Last 60 Days' },
  { value: '90', label: 'Last 90 Days' },
  { value: 'custom', label: 'Custom Range' },
];

const INCLUDE_OPTIONS = [
  { id: 'charts', label: 'Include Charts & Graphs' },
  { id: 'narrative', label: 'Include Narrative Summary' },
  { id: 'recommendations', label: 'Include Recommendations' },
  { id: 'teacher_input', label: 'Include Teacher Input' },
  { id: 'baseline', label: 'Show Baseline Comparison' },
];

export function WhiteLabelReportGenerator({
  open,
  onOpenChange,
  student,
}: WhiteLabelReportGeneratorProps) {
  const { brandings, getDefaultBranding } = useReportBranding();
  const { createReport } = useGeneratedReports(student.id);
  const [isGenerating, setIsGenerating] = useState(false);

  const [formData, setFormData] = useState({
    report_type: 'progress' as ReportType,
    branding_id: getDefaultBranding()?.id || '',
    time_range: '30',
    custom_start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    custom_end: format(new Date(), 'yyyy-MM-dd'),
    include_charts: true,
    include_narrative: true,
    include_recommendations: true,
    include_teacher_input: false,
    include_baseline: true,
  });

  const selectedBranding = brandings.find(b => b.id === formData.branding_id);

  const handleGenerate = async () => {
    setIsGenerating(true);

    const dateRangeStart = formData.time_range === 'custom'
      ? formData.custom_start
      : format(subDays(new Date(), parseInt(formData.time_range)), 'yyyy-MM-dd');
    const dateRangeEnd = formData.time_range === 'custom'
      ? formData.custom_end
      : format(new Date(), 'yyyy-MM-dd');

    const content: ReportContent = {
      title: `${REPORT_TYPE_LABELS[formData.report_type].label} for ${student.displayName || student.name}`,
      sections: [
        {
          id: '1',
          title: 'Student Information',
          type: 'text',
          content: { name: student.name, behaviors: student.behaviors.length },
        },
        {
          id: '2',
          title: 'Data Summary',
          type: 'summary',
          content: {
            dateRange: { start: dateRangeStart, end: dateRangeEnd },
            includeCharts: formData.include_charts,
            includeNarrative: formData.include_narrative,
          },
        },
      ],
      generatedAt: new Date().toISOString(),
    };

    await createReport({
      student_id: student.id,
      report_type: formData.report_type,
      branding_id: formData.branding_id || undefined,
      date_range_start: dateRangeStart,
      date_range_end: dateRangeEnd,
      content,
    });

    // Generate and download the .docx file
    try {
      const sections: Array<{ heading: string; content: string }> = [];
      sections.push({
        heading: 'Student Information',
        content: `Name: ${student.displayName || student.name}\nBehaviors Tracked: ${student.behaviors.length}\nDate Range: ${dateRangeStart} – ${dateRangeEnd}`,
      });
      if (formData.include_narrative) {
        sections.push({
          heading: 'Narrative Summary',
          content: `${student.displayName || student.name} was monitored during the period ${dateRangeStart} to ${dateRangeEnd}. ${student.behaviors.length} target behaviors were tracked across sessions.`,
        });
      }
      if (formData.include_recommendations) {
        sections.push({ heading: 'Recommendations', content: 'Continue current treatment plan and review goals at next meeting.' });
      }

      await generateGenericDocxReport({
        title: REPORT_TYPE_LABELS[formData.report_type].label,
        subtitle: student.name,
        sections,
        fileName: `${formData.report_type}_${student.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.docx`,
        brandingName: selectedBranding?.organization_name,
        footerText: selectedBranding?.footer_text || undefined,
      });
      toast.success('Report downloaded');
    } catch {
      toast.error('Download failed');
    }

    setIsGenerating(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Generate White-Label Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Student Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: student.color }}
                >
                  {student.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{student.displayName || student.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {student.behaviors.length} behaviors tracked
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Type */}
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select
              value={formData.report_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, report_type: value as ReportType }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REPORT_TYPE_LABELS).map(([value, { label, description }]) => (
                  <SelectItem key={value} value={value}>
                    <div>
                      <p>{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Branding */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Report Branding
            </Label>
            <Select
              value={formData.branding_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, branding_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select branding (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No branding</SelectItem>
                {brandings.map(branding => (
                  <SelectItem key={branding.id} value={branding.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: branding.primary_color }}
                      />
                      {branding.organization_name}
                      {branding.is_default && (
                        <span className="text-xs text-muted-foreground">(default)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBranding && (
              <div
                className="border rounded-lg p-3 flex items-center gap-3"
                style={{ borderColor: selectedBranding.primary_color }}
              >
                {selectedBranding.logo_url && (
                  <img
                    src={selectedBranding.logo_url}
                    alt="Logo"
                    className="h-6 object-contain"
                  />
                )}
                <span style={{ color: selectedBranding.primary_color }}>
                  {selectedBranding.organization_name}
                </span>
              </div>
            )}
          </div>

          {/* Time Range */}
          <div className="space-y-2">
            <Label>Time Range</Label>
            <Select
              value={formData.time_range}
              onValueChange={(value) => setFormData(prev => ({ ...prev, time_range: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {formData.time_range === 'custom' && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={formData.custom_start}
                    onChange={(e) => setFormData(prev => ({ ...prev, custom_start: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={formData.custom_end}
                    onChange={(e) => setFormData(prev => ({ ...prev, custom_end: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Include Options */}
          <div className="space-y-2">
            <Label>Include in Report</Label>
            <div className="space-y-2">
              {INCLUDE_OPTIONS.map(option => {
                const key = `include_${option.id}` as keyof typeof formData;
                return (
                  <div key={option.id} className="flex items-center gap-2">
                    <Checkbox
                      id={option.id}
                      checked={formData[key] as boolean}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({ ...prev, [key]: checked === true }))
                      }
                    />
                    <Label htmlFor={option.id} className="text-sm cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Generate Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
