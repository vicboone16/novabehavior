import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Brain, Download, FileText, CheckCircle2 } from 'lucide-react';
import { useSdcIntake, type FormInstance, type FormResponse } from '@/hooks/useSdcIntake';
import { toast } from 'sonner';

interface Props {
  formInstances: FormInstance[];
  studentName: string;
  onBack: () => void;
  onGenerateSnapshot: () => void;
}

function resolveDisplayValue(val: any, field: any): string {
  if (val === null || val === undefined || val === '') return '';
  if (!field?.options) {
    if (Array.isArray(val)) return val.join(', ');
    return String(val);
  }
  if (Array.isArray(val)) {
    return val
      .map((v: any) => {
        const opt = field.options.find((o: any) => String(o.value) === String(v));
        return opt ? opt.label : String(v);
      })
      .join(', ');
  }
  const opt = field.options.find((o: any) => String(o.value) === String(val));
  return opt ? opt.label : String(val);
}

export function SdcReviewResponses({ formInstances, studentName, onBack, onGenerateSnapshot }: Props) {
  const intake = useSdcIntake();
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState('structured');

  const completedForms = formInstances.filter(fi => fi.status === 'submitted');
  const selectedForm = formInstances.find(fi => fi.id === selectedFormId);

  useEffect(() => {
    if (completedForms.length > 0 && !selectedFormId) {
      setSelectedFormId(completedForms[0].id);
    }
  }, [completedForms.length]);

  useEffect(() => {
    if (selectedFormId) loadResponse(selectedFormId);
  }, [selectedFormId]);

  const loadResponse = async (id: string) => {
    try {
      const resp = await intake.fetchFormResponse(id);
      setResponseData((resp?.response_json || {}) as Record<string, any>);
    } catch (err: any) {
      toast.error('Failed to load response: ' + err.message);
    }
  };

  const schema = selectedForm?.form_definition?.schema_json;
  const sections: any[] = schema?.sections || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Package
        </Button>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onGenerateSnapshot}>
            <Brain className="w-3.5 h-3.5 mr-1" />
            Generate SDC Snapshot
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Review Responses</CardTitle>
          <p className="text-sm text-muted-foreground">
            Review all completed SDC intake responses for this student. Use these responses to generate and refine the SDC Snapshot.
          </p>
        </CardHeader>
      </Card>

      {completedForms.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">No completed responses yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Form list */}
          <div className="space-y-1">
            {formInstances.map(fi => (
              <button
                key={fi.id}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedFormId === fi.id
                    ? 'bg-primary/5 border-primary/30'
                    : 'bg-card hover:bg-muted/30'
                } ${fi.status !== 'submitted' ? 'opacity-50' : ''}`}
                onClick={() => fi.status === 'submitted' && setSelectedFormId(fi.id)}
                disabled={fi.status !== 'submitted'}
              >
                <p className="text-sm font-medium">{fi.form_definition?.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {fi.status === 'submitted' ? (
                    <Badge className="bg-green-500/15 text-green-700 border-green-200 text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Submitted
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">{fi.status}</Badge>
                  )}
                  {fi.submitted_at && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(fi.submitted_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Right: Response detail */}
          <div className="lg:col-span-2">
            {selectedForm ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{selectedForm.form_definition?.name}</CardTitle>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {selectedForm.respondent_name && <span>Respondent: {selectedForm.respondent_name}</span>}
                    {selectedForm.submitted_at && <span>Submitted: {new Date(selectedForm.submitted_at).toLocaleDateString()}</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="structured" className="text-xs">Structured Response</TabsTrigger>
                      <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
                      <TabsTrigger value="export" className="text-xs">Export</TabsTrigger>
                    </TabsList>

                    <TabsContent value="structured" className="mt-3">
                      <ScrollArea className="max-h-[60vh]">
                        <div className="space-y-4">
                          {sections.map((section: any) => (
                            <div key={section.key}>
                              <h4 className="text-sm font-semibold text-primary mb-2">{section.label}</h4>
                              <div className="space-y-2">
                                {(section.fields || []).map((field: any) => {
                                  if (field.show_if) {
                                    const { field: dep, equals } = field.show_if;
                                    if (responseData[dep] !== equals) return null;
                                  }
                                  const raw = responseData[field.key];
                                  if (raw === undefined || raw === null || raw === '') return null;
                                  if (Array.isArray(raw) && raw.length === 0) return null;
                                  const display = resolveDisplayValue(raw, field);
                                  if (!display) return null;
                                  return (
                                    <div key={field.key} className="py-1">
                                      <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                                      <p className="text-sm">{display}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="summary" className="mt-3">
                      <div className="space-y-3">
                        {sections.map((section: any) => {
                          const filledFields = (section.fields || []).filter((f: any) => {
                            const v = responseData[f.key];
                            return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
                          });
                          if (filledFields.length === 0) return null;
                          return (
                            <div key={section.key}>
                              <p className="text-xs font-semibold text-primary">{section.label}</p>
                              <p className="text-xs text-muted-foreground">{filledFields.length} field(s) completed</p>
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>

                    <TabsContent value="export" className="mt-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Download className="w-3.5 h-3.5 mr-1" />
                          Export PDF
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="w-3.5 h-3.5 mr-1" />
                          Export Word
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Select a completed form to review its responses.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
