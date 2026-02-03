import { useState } from 'react';
import { FileText, Sparkles, Send, Calendar, AlertCircle, CheckCircle, Clock, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PRIOR_AUTH_STATUSES, type PriorAuthRequest, type PriorAuthRequestType } from '@/types/payments';
import { ABA_CPT_CODES } from '@/types/billing';

interface PriorAuthGeneratorProps {
  studentId: string;
  studentName: string;
  payers?: Array<{ id: string; name: string }>;
}

export function PriorAuthGenerator({ studentId, studentName, payers = [] }: PriorAuthGeneratorProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<'form' | 'review' | 'complete'>('form');
  
  // Form state
  const [selectedPayerId, setSelectedPayerId] = useState('');
  const [requestType, setRequestType] = useState<PriorAuthRequestType>('initial');
  const [selectedServiceCodes, setSelectedServiceCodes] = useState<string[]>(['97153']);
  const [unitsRequested, setUnitsRequested] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [diagnosisCodes, setDiagnosisCodes] = useState('F84.0');
  
  // Generated content
  const [generatedAuth, setGeneratedAuth] = useState<PriorAuthRequest | null>(null);
  const [justification, setJustification] = useState<{
    clinicalSummary: string;
    medicalNecessity: string;
    treatmentGoals: string[];
    fullJustification: string;
  } | null>(null);

  const handleToggleServiceCode = (code: string) => {
    setSelectedServiceCodes(prev => 
      prev.includes(code) 
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const handleGenerate = async () => {
    if (!selectedPayerId || !unitsRequested || !startDate || !endDate) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to generate prior authorization",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke('generate-prior-auth', {
        body: {
          studentId,
          payerId: selectedPayerId,
          serviceCodes: selectedServiceCodes,
          unitsRequested: parseInt(unitsRequested),
          serviceStartDate: startDate,
          serviceEndDate: endDate,
          requestType,
          diagnosisCodes: diagnosisCodes.split(',').map(c => c.trim()),
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error);
      }

      setJustification(data.justification);
      setGeneratedAuth({
        id: data.priorAuthId,
        student_id: studentId,
        payer_id: selectedPayerId,
        request_type: requestType,
        service_codes: selectedServiceCodes,
        units_requested: parseInt(unitsRequested),
        service_start_date: startDate,
        service_end_date: endDate,
        status: data.status,
        ai_generated_justification: data.justification.fullJustification,
      } as PriorAuthRequest);

      setStep('review');

      toast({
        title: data.aiGenerated ? "AI Justification Generated" : "Prior Auth Request Created",
        description: data.aiGenerated 
          ? "Review the AI-generated clinical justification below"
          : "Complete the clinical justification manually",
      });

    } catch (error) {
      console.error('Prior auth generation error:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = PRIOR_AUTH_STATUSES.find(s => s.value === status);
    return <Badge className={config?.color}>{config?.label || status}</Badge>;
  };

  if (step === 'review' && generatedAuth) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Prior Authorization Request
                </CardTitle>
                <CardDescription>
                  Review and edit the generated authorization request for {studentName}
                </CardDescription>
              </div>
              {getStatusBadge(generatedAuth.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Request Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Request Type</p>
                <p className="font-medium capitalize">{generatedAuth.request_type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Units Requested</p>
                <p className="font-medium">{generatedAuth.units_requested}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Service Period</p>
                <p className="font-medium">
                  {new Date(generatedAuth.service_start_date).toLocaleDateString()} - {new Date(generatedAuth.service_end_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Service Codes</p>
                <p className="font-medium">{generatedAuth.service_codes.join(', ')}</p>
              </div>
            </div>

            {/* AI Generated Justification */}
            {justification && (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="w-4 h-4" />
                  AI-Generated Clinical Justification
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Clinical Summary</Label>
                    <Textarea
                      value={justification.clinicalSummary}
                      onChange={(e) => setJustification(prev => prev ? {...prev, clinicalSummary: e.target.value} : null)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Medical Necessity Statement</Label>
                    <Textarea
                      value={justification.medicalNecessity}
                      onChange={(e) => setJustification(prev => prev ? {...prev, medicalNecessity: e.target.value} : null)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Treatment Goals</Label>
                    <div className="space-y-2">
                      {justification.treatmentGoals.map((goal, idx) => (
                        <Input
                          key={idx}
                          value={goal}
                          onChange={(e) => {
                            const newGoals = [...justification.treatmentGoals];
                            newGoals[idx] = e.target.value;
                            setJustification(prev => prev ? {...prev, treatmentGoals: newGoals} : null);
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Full Justification</Label>
                    <Textarea
                      value={justification.fullJustification}
                      onChange={(e) => setJustification(prev => prev ? {...prev, fullJustification: e.target.value} : null)}
                      rows={8}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('form')}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Request
              </Button>
              <Button className="flex-1">
                <Send className="w-4 h-4 mr-2" />
                Submit to Payer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Generate Prior Authorization
          </CardTitle>
          <CardDescription>
            AI-powered clinical justification for {studentName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payer Selection */}
          <div className="space-y-2">
            <Label>Insurance Payer *</Label>
            <Select value={selectedPayerId} onValueChange={setSelectedPayerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select payer" />
              </SelectTrigger>
              <SelectContent>
                {payers.length === 0 ? (
                  <SelectItem value="none" disabled>No payers configured</SelectItem>
                ) : (
                  payers.map((payer) => (
                    <SelectItem key={payer.id} value={payer.id}>
                      {payer.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Request Type */}
          <div className="space-y-2">
            <Label>Request Type *</Label>
            <Select value={requestType} onValueChange={(v) => setRequestType(v as PriorAuthRequestType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="initial">Initial Authorization</SelectItem>
                <SelectItem value="continuation">Continuation/Renewal</SelectItem>
                <SelectItem value="modification">Modification</SelectItem>
                <SelectItem value="expedited">Expedited/Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Service Codes */}
          <div className="space-y-2">
            <Label>Service Codes (CPT) *</Label>
            <div className="grid grid-cols-2 gap-2">
              {ABA_CPT_CODES.slice(0, 6).map((code) => (
                <label key={code.code} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-muted">
                  <Checkbox
                    checked={selectedServiceCodes.includes(code.code)}
                    onCheckedChange={() => handleToggleServiceCode(code.code)}
                  />
                  <div>
                    <p className="font-medium text-sm">{code.code}</p>
                    <p className="text-xs text-muted-foreground">{code.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Units and Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Units Requested *</Label>
              <Input
                type="number"
                value={unitsRequested}
                onChange={(e) => setUnitsRequested(e.target.value)}
                placeholder="e.g., 160"
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date *</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Diagnosis Codes */}
          <div className="space-y-2">
            <Label>Diagnosis Codes (ICD-10)</Label>
            <Input
              value={diagnosisCodes}
              onChange={(e) => setDiagnosisCodes(e.target.value)}
              placeholder="F84.0, F84.5"
            />
            <p className="text-xs text-muted-foreground">Separate multiple codes with commas</p>
          </div>

          {/* Generate Button */}
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleGenerate}
            disabled={isGenerating || !selectedPayerId || !unitsRequested || !startDate || !endDate}
          >
            {isGenerating ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                Generating Clinical Justification...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Prior Authorization
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            AI will analyze clinical data, session history, and treatment goals to generate a compliant medical necessity justification.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
