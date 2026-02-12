import { useState } from 'react';
import {
  FileDown, Sparkles, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type {
  ClientInfo, ProviderInfo, NarrativeSections, DomainScoreRow, ReportData,
} from '@/lib/assessmentReportExport';
import { downloadAssessmentReport } from '@/lib/assessmentReportExport';

interface AssessmentReportExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentType: 'vbmapp' | 'ablls-r' | 'afls';
  aflsModule?: string;
  studentName: string;
  studentAge?: string;
  studentDob?: string;
  domainScores: DomainScoreRow[];
  overallMastery: number;
  strengths: string[];
  priorities: string[];
  dateAdministered: string;
}

const defaultNarratives: NarrativeSections = {
  reasonForReferral: '',
  background: '',
  parentInterview: '',
  clientInterview: '',
  teacherInterview: '',
  behavioralObservations: '',
};

export function AssessmentReportExport({
  open, onOpenChange, assessmentType, aflsModule,
  studentName, studentAge, studentDob,
  domainScores, overallMastery, strengths, priorities,
  dateAdministered,
}: AssessmentReportExportProps) {
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    clientName: studentName,
    parents: '',
    dob: studentDob || '',
    address: '',
    age: studentAge || '',
    grade: '',
    phone: '',
    diagnosisCode: '',
    evaluator: '',
    primaryLanguage: 'English',
    dateOfReport: dateAdministered,
  });

  const [providerInfo, setProviderInfo] = useState<ProviderInfo>({
    agencyName: '',
    phone: '',
    taxId: '',
    email: '',
    address: '',
    npi: '',
  });

  const [narratives, setNarratives] = useState<NarrativeSections>(defaultNarratives);
  const [domainNarratives, setDomainNarratives] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState('');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [bcbaName, setBcbaName] = useState('');
  const [bcbaNpi, setBcbaNpi] = useState('');
  const [bcbaCertNumber, setBcbaCertNumber] = useState('');
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('client');

  // Section toggles
  const [includeSections, setIncludeSections] = useState({
    reasonForReferral: true,
    background: true,
    parentInterview: true,
    clientInterview: true,
    teacherInterview: true,
    behavioralObservations: true,
  });

  const handleGenerateAI = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-assessment-report', {
        body: {
          assessmentType,
          aflsModule,
          studentName,
          studentAge: clientInfo.age || studentAge || 'Unknown',
          domainScores: domainScores.map(d => ({
            domain: d.domain,
            raw: d.raw,
            max: d.max,
            percent: d.percent,
            status: d.percent >= 80 ? 'mastered' : d.percent >= 50 ? 'emerging' : 'deficit',
          })),
          overallMastery,
          strengths,
          priorities,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.domainNarratives) setDomainNarratives(data.domainNarratives);
      if (data.summary) setSummary(data.summary);
      if (data.recommendations) setRecommendations(data.recommendations);

      toast.success('AI narratives generated! Review and edit before exporting.');
      setActiveTab('narratives');
    } catch (err: any) {
      console.error('AI generation error:', err);
      toast.error(err?.message || 'Failed to generate AI narratives');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    try {
      const filteredNarratives = { ...narratives };
      Object.entries(includeSections).forEach(([key, include]) => {
        if (!include) filteredNarratives[key as keyof NarrativeSections] = '';
      });

      const reportData: ReportData = {
        assessmentType,
        aflsModule,
        clientInfo,
        providerInfo,
        narrativeSections: filteredNarratives,
        domainScores,
        domainNarratives,
        summary,
        recommendations,
        bcbaName,
        bcbaNpi,
        bcbaCertNumber,
      };

      await downloadAssessmentReport(reportData);
      toast.success('Report downloaded');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to generate report');
    }
  };

  const updateClient = (field: keyof ClientInfo, value: string) =>
    setClientInfo(prev => ({ ...prev, [field]: value }));
  const updateProvider = (field: keyof ProviderInfo, value: string) =>
    setProviderInfo(prev => ({ ...prev, [field]: value }));
  const updateNarrative = (field: keyof NarrativeSections, value: string) =>
    setNarratives(prev => ({ ...prev, [field]: value }));

  const assessmentLabel = assessmentType === 'vbmapp' ? 'VB-MAPP'
    : assessmentType === 'ablls-r' ? 'ABLLS-R'
    : `AFLS – ${aflsModule || 'Module'}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{assessmentLabel} Report Generator</DialogTitle>
          <DialogDescription>
            Fill in details and generate AI narratives, then download your .docx report.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-2">
          <Button
            variant="outline"
            onClick={handleGenerateAI}
            disabled={generating}
          >
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {generating ? 'Generating…' : 'Generate AI Narratives'}
          </Button>
          <Button onClick={handleDownload}>
            <FileDown className="w-4 h-4 mr-2" />Download .docx
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="client">Client Info</TabsTrigger>
            <TabsTrigger value="provider">Provider</TabsTrigger>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="narratives">AI Narratives</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-2">
            {/* Client Info Tab */}
            <TabsContent value="client" className="space-y-3 pr-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Client Name</Label>
                  <Input value={clientInfo.clientName} onChange={e => updateClient('clientName', e.target.value)} />
                </div>
                <div>
                  <Label>Parent(s)</Label>
                  <Input value={clientInfo.parents} onChange={e => updateClient('parents', e.target.value)} />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input value={clientInfo.dob} onChange={e => updateClient('dob', e.target.value)} />
                </div>
                <div>
                  <Label>Chronological Age</Label>
                  <Input value={clientInfo.age} onChange={e => updateClient('age', e.target.value)} />
                </div>
                <div>
                  <Label>Current Grade</Label>
                  <Input value={clientInfo.grade} onChange={e => updateClient('grade', e.target.value)} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={clientInfo.phone} onChange={e => updateClient('phone', e.target.value)} />
                </div>
                <div>
                  <Label>Home Address</Label>
                  <Input value={clientInfo.address} onChange={e => updateClient('address', e.target.value)} />
                </div>
                <div>
                  <Label>Diagnosis Code</Label>
                  <Input value={clientInfo.diagnosisCode} onChange={e => updateClient('diagnosisCode', e.target.value)} />
                </div>
                <div>
                  <Label>Evaluator</Label>
                  <Input value={clientInfo.evaluator} onChange={e => updateClient('evaluator', e.target.value)} />
                </div>
                <div>
                  <Label>Primary Language</Label>
                  <Input value={clientInfo.primaryLanguage} onChange={e => updateClient('primaryLanguage', e.target.value)} />
                </div>
                <div>
                  <Label>Date of Report</Label>
                  <Input value={clientInfo.dateOfReport} onChange={e => updateClient('dateOfReport', e.target.value)} />
                </div>
              </div>
            </TabsContent>

            {/* Provider Info Tab */}
            <TabsContent value="provider" className="space-y-3 pr-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Agency/Provider Name</Label>
                  <Input value={providerInfo.agencyName} onChange={e => updateProvider('agencyName', e.target.value)} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={providerInfo.phone} onChange={e => updateProvider('phone', e.target.value)} />
                </div>
                <div>
                  <Label>Tax ID#</Label>
                  <Input value={providerInfo.taxId} onChange={e => updateProvider('taxId', e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={providerInfo.email} onChange={e => updateProvider('email', e.target.value)} />
                </div>
                <div>
                  <Label>Provider Address</Label>
                  <Input value={providerInfo.address} onChange={e => updateProvider('address', e.target.value)} />
                </div>
                <div>
                  <Label>NPI#</Label>
                  <Input value={providerInfo.npi} onChange={e => updateProvider('npi', e.target.value)} />
                </div>
              </div>

              <div className="border-t pt-3 mt-4 space-y-3">
                <h4 className="font-medium text-sm">Signature Block</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>BCBA Name</Label>
                    <Input value={bcbaName} onChange={e => setBcbaName(e.target.value)} />
                  </div>
                  <div>
                    <Label>BCBA NPI#</Label>
                    <Input value={bcbaNpi} onChange={e => setBcbaNpi(e.target.value)} />
                  </div>
                  <div>
                    <Label>BCBA Certification #</Label>
                    <Input value={bcbaCertNumber} onChange={e => setBcbaCertNumber(e.target.value)} />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Narrative Sections Tab */}
            <TabsContent value="sections" className="space-y-3 pr-2">
              {([
                ['reasonForReferral', 'Reason for Referral'],
                ['background', 'Background'],
                ['parentInterview', 'Parent/Guardian/Caregiver Interview'],
                ['clientInterview', 'Client Interview'],
                ['teacherInterview', 'Teacher Interview'],
                ['behavioralObservations', 'Behavioral Observations During Assessment'],
              ] as [keyof NarrativeSections, string][]).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label>{label}</Label>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Include</Label>
                      <Switch
                        checked={includeSections[key as keyof typeof includeSections]}
                        onCheckedChange={v =>
                          setIncludeSections(prev => ({ ...prev, [key]: v }))
                        }
                      />
                    </div>
                  </div>
                  <Textarea
                    rows={3}
                    value={narratives[key]}
                    onChange={e => updateNarrative(key, e.target.value)}
                    placeholder={`Enter ${label.toLowerCase()}…`}
                    disabled={!includeSections[key as keyof typeof includeSections]}
                  />
                </div>
              ))}
            </TabsContent>

            {/* AI Narratives Tab */}
            <TabsContent value="narratives" className="space-y-4 pr-2">
              {Object.keys(domainNarratives).length === 0 && !summary ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Click "Generate AI Narratives" to create domain-by-domain clinical narratives, summary, and recommendations.</p>
                </div>
              ) : (
                <>
                  <Accordion type="multiple" defaultValue={['summary', 'recommendations']}>
                    <AccordionItem value="summary">
                      <AccordionTrigger className="text-sm font-medium">Summary</AccordionTrigger>
                      <AccordionContent>
                        <Textarea
                          rows={4}
                          value={summary}
                          onChange={e => setSummary(e.target.value)}
                        />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="recommendations">
                      <AccordionTrigger className="text-sm font-medium">
                        Recommendations ({recommendations.length})
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2">
                        {recommendations.map((rec, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="text-sm font-medium mt-2 shrink-0">{i + 1}.</span>
                            <Textarea
                              rows={2}
                              value={rec}
                              onChange={e => {
                                const next = [...recommendations];
                                next[i] = e.target.value;
                                setRecommendations(next);
                              }}
                            />
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRecommendations(prev => [...prev, ''])}
                        >
                          + Add Recommendation
                        </Button>
                      </AccordionContent>
                    </AccordionItem>

                    {domainScores.map(ds => (
                      <AccordionItem key={ds.domain} value={ds.domain}>
                        <AccordionTrigger className="text-sm">
                          {ds.domain}
                          <span className="ml-2 text-muted-foreground text-xs">
                            ({ds.raw}/{ds.max} — {ds.percent}%)
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Textarea
                            rows={3}
                            value={domainNarratives[ds.domain] || ''}
                            onChange={e =>
                              setDomainNarratives(prev => ({
                                ...prev,
                                [ds.domain]: e.target.value,
                              }))
                            }
                            placeholder="AI-generated narrative will appear here…"
                          />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
