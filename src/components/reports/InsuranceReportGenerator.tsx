import { useState, useMemo, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDataStore } from '@/store/dataStore';
import { supabase } from '@/integrations/supabase/client';
import { generateInsuranceReport } from '@/lib/insuranceReportExport';
import type { PayerReportTemplate, TemplateSection, ReportGenerationData } from '@/types/reportTemplates';
import { FileText, Download, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export function InsuranceReportGenerator() {
  const { students } = useDataStore();
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<PayerReportTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Form state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [reportType, setReportType] = useState<'initial_assessment' | 'progress_report'>('initial_assessment');
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 90), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [enabledSections, setEnabledSections] = useState<string[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const activeStudents = useMemo(() => students.filter(s => !s.isArchived), [students]);
  const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

  // Filter templates by report type
  const filteredTemplates = useMemo(
    () => templates.filter(t => t.report_type === reportType),
    [templates, reportType]
  );

  const selectedTemplate = useMemo(
    () => filteredTemplates.find(t => t.id === selectedTemplateId),
    [filteredTemplates, selectedTemplateId]
  );

  // Load templates
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('payer_report_templates')
        .select('*')
        .order('is_default', { ascending: false });
      if (!error && data) {
        const parsed = data.map(d => ({
          ...d,
          sections: (d.sections as unknown as TemplateSection[]) || [],
        })) as PayerReportTemplate[];
        setTemplates(parsed);
      }
      setLoading(false);
    })();
  }, [isOpen]);

  // Auto-select default template when report type changes
  useEffect(() => {
    const defaultTpl = filteredTemplates.find(t => t.is_default) || filteredTemplates[0];
    if (defaultTpl) {
      setSelectedTemplateId(defaultTpl.id);
      setEnabledSections(defaultTpl.sections.filter(s => s.enabled).map(s => s.key));
    }
  }, [filteredTemplates]);

  // Auto-populate fields when student/template changes
  useEffect(() => {
    if (!selectedStudent || !selectedTemplate) return;
    const newValues: Record<string, string> = { ...fieldValues };
    for (const section of selectedTemplate.sections) {
      for (const field of section.fields) {
        const key = `${section.key}.${field.key}`;
        if (field.prefill && !newValues[key]) {
          newValues[key] = field.prefill;
        }
        if (field.auto_populate === 'student_name') {
          newValues[key] = selectedStudent.name;
        }
        if (field.auto_populate === 'student_dob' && (selectedStudent as any).dateOfBirth) {
          newValues[key] = (selectedStudent as any).dateOfBirth;
        }
        if (field.auto_populate === 'diagnosis' && (selectedStudent as any).backgroundInfo?.diagnoses) {
          newValues[key] = (selectedStudent as any).backgroundInfo.diagnoses;
        }
      }
    }
    setFieldValues(newValues);
  }, [selectedStudent, selectedTemplate]);

  const toggleSection = (key: string) => {
    setEnabledSections(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const updateField = (key: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || !selectedStudent) return;
    setGenerating(true);
    try {
      await generateInsuranceReport({
        template: selectedTemplate,
        data: {
          studentName: selectedStudent.name,
          dateRangeStart: dateFrom,
          dateRangeEnd: dateTo,
          fieldValues,
          enabledSections,
        },
      });
      toast.success('Report downloaded successfully');
      setIsOpen(false);
    } catch (err) {
      toast.error('Failed to generate report');
    }
    setGenerating(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Building2 className="w-4 h-4" />
          Insurance Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Insurance Report Generator
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-5 py-4">
            {/* Student */}
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {activeStudents.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Report Type */}
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial_assessment">Initial Assessment</SelectItem>
                  <SelectItem value="progress_report">Progress Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Template */}
            <div className="space-y-2">
              <Label>Template</Label>
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading templates...
                </div>
              ) : (
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                  <SelectContent>
                    {filteredTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.is_default && '(Default)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedTemplate && (
                <div className="flex flex-wrap gap-1">
                  {selectedTemplate.payer_names.map((name, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{name}</Badge>
                  ))}
                  {selectedTemplate.is_default && (
                    <Badge variant="outline" className="text-xs">Default fallback</Badge>
                  )}
                </div>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>

            <Separator />

            {/* Section Toggles */}
            {selectedTemplate && (
              <div className="space-y-3">
                <Label>Sections to Include</Label>
                <div className="space-y-2">
                  {selectedTemplate.sections.map(section => (
                    <div key={section.key} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`section-${section.key}`}
                          checked={enabledSections.includes(section.key)}
                          onCheckedChange={() => toggleSection(section.key)}
                        />
                        <Label htmlFor={`section-${section.key}`} className="text-sm font-medium cursor-pointer">
                          {section.title}
                        </Label>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {section.fields.length} fields
                        </Badge>
                      </div>

                      {/* Inline field editing when section is enabled */}
                      {enabledSections.includes(section.key) && (
                        <div className="ml-6 space-y-2 border-l-2 border-muted pl-3">
                          {section.fields.map(field => {
                            const fieldKey = `${section.key}.${field.key}`;
                            const value = fieldValues[fieldKey] || '';
                            return (
                              <div key={field.key} className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  {field.label}
                                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                                  {field.auto_populate && (
                                    <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">auto</Badge>
                                  )}
                                </Label>
                                {field.type === 'textarea' ? (
                                  <Textarea
                                    value={value}
                                    onChange={e => updateField(fieldKey, e.target.value)}
                                    placeholder={field.prefill || `Enter ${field.label.toLowerCase()}`}
                                    rows={2}
                                    className="text-sm"
                                  />
                                ) : (
                                  <Input
                                    type={field.type === 'date' ? 'date' : 'text'}
                                    value={value}
                                    onChange={e => updateField(fieldKey, e.target.value)}
                                    placeholder={field.prefill || `Enter ${field.label.toLowerCase()}`}
                                    className="text-sm h-8"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button
            onClick={handleGenerate}
            disabled={!selectedStudentId || !selectedTemplateId || generating}
          >
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Generate .docx
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
