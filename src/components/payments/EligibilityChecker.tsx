import { useState } from 'react';
import { Shield, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { EligibilityCheck } from '@/types/payments';

interface EligibilityCheckerProps {
  studentId: string;
  studentName: string;
  clientPayers?: Array<{
    id: string;
    payer_id: string;
    member_id: string;
    payer?: { name: string };
  }>;
}

export function EligibilityChecker({ studentId, studentName, clientPayers = [] }: EligibilityCheckerProps) {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [selectedPayerId, setSelectedPayerId] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [configurationError, setConfigurationError] = useState<string | null>(null);
  const [latestCheck, setLatestCheck] = useState<EligibilityCheck | null>(null);
  const [eligibilityResult, setEligibilityResult] = useState<any>(null);

  const handleCheckEligibility = async () => {
    if (!selectedPayerId) {
      toast({
        title: "Select a payer",
        description: "Please select an insurance payer to check eligibility",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);
    setConfigurationError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to check eligibility",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke('check-eligibility', {
        body: {
          studentId,
          clientPayerId: selectedPayerId,
          serviceDate,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (data.configurationRequired) {
        setConfigurationError(data.message);
        setEligibilityResult(data.mockData);
        toast({
          title: "pVerify Not Configured",
          description: "Real-time eligibility checking requires pVerify API credentials",
          variant: "destructive",
        });
        return;
      }

      if (!data.success) {
        throw new Error(data.error);
      }

      setEligibilityResult(data.eligibility);
      setLatestCheck({
        id: data.checkId,
        student_id: studentId,
        is_eligible: data.eligibility.isEligible,
        eligibility_status: data.eligibility.status,
        plan_name: data.eligibility.planName,
        copay_amount: data.eligibility.copay,
        coinsurance_percent: data.eligibility.coinsurance,
        aba_covered: data.eligibility.abaBenefits?.covered,
        aba_auth_required: data.eligibility.abaBenefits?.authRequired,
      } as EligibilityCheck);

      toast({
        title: "Eligibility Check Complete",
        description: data.eligibility.isEligible ? "Patient is eligible for services" : "Eligibility issue detected",
        variant: data.eligibility.isEligible ? "default" : "destructive",
      });

    } catch (error) {
      console.error('Eligibility check error:', error);
      toast({
        title: "Eligibility check failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getEligibilityIcon = (isEligible: boolean | null | undefined) => {
    if (isEligible === true) return <CheckCircle className="w-6 h-6 text-green-500" />;
    if (isEligible === false) return <XCircle className="w-6 h-6 text-red-500" />;
    return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Configuration Warning */}
      {configurationError && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Eligibility Verification Not Configured</p>
                <p className="text-sm text-amber-700 mt-1">{configurationError}</p>
                <p className="text-sm text-amber-600 mt-2">
                  To enable real-time eligibility checks, add your pVerify API credentials (PVERIFY_CLIENT_ID and PVERIFY_CLIENT_SECRET) in the secrets configuration.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Check Eligibility Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Check Insurance Eligibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Insurance Payer</Label>
              <Select value={selectedPayerId} onValueChange={setSelectedPayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payer" />
                </SelectTrigger>
                <SelectContent>
                  {clientPayers.length === 0 ? (
                    <SelectItem value="none" disabled>No payers configured</SelectItem>
                  ) : (
                    clientPayers.map((cp) => (
                      <SelectItem key={cp.id} value={cp.id}>
                        {cp.payer?.name || 'Unknown Payer'} ({cp.member_id})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Service Date</Label>
              <Input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
              />
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handleCheckEligibility}
            disabled={isChecking || !selectedPayerId}
          >
            {isChecking ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Checking Eligibility...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Check Eligibility
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Eligibility Results */}
      {eligibilityResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getEligibilityIcon(eligibilityResult.isEligible)}
              Eligibility Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Status Banner */}
              <div className={`p-4 rounded-lg ${
                eligibilityResult.isEligible 
                  ? 'bg-green-50 border border-green-200' 
                  : eligibilityResult.isEligible === false 
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <p className={`font-medium ${
                  eligibilityResult.isEligible 
                    ? 'text-green-800' 
                    : eligibilityResult.isEligible === false 
                      ? 'text-red-800'
                      : 'text-yellow-800'
                }`}>
                  {eligibilityResult.isEligible 
                    ? `${studentName} is eligible for services`
                    : eligibilityResult.isEligible === false
                      ? 'Eligibility could not be verified'
                      : 'Eligibility status unknown - manual verification required'}
                </p>
                {eligibilityResult.status && (
                  <p className="text-sm mt-1 opacity-80">
                    Plan Status: {eligibilityResult.status}
                  </p>
                )}
              </div>

              {/* Plan Details */}
              {eligibilityResult.planName && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Plan Name</p>
                    <p className="font-medium">{eligibilityResult.planName}</p>
                  </div>
                  {eligibilityResult.groupNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground">Group Number</p>
                      <p className="font-medium">{eligibilityResult.groupNumber}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Cost Sharing */}
              <div className="grid grid-cols-3 gap-4">
                {eligibilityResult.copay && (
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Copay</p>
                    <p className="text-xl font-bold">${eligibilityResult.copay}</p>
                  </div>
                )}
                {eligibilityResult.coinsurance && (
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Coinsurance</p>
                    <p className="text-xl font-bold">{eligibilityResult.coinsurance}%</p>
                  </div>
                )}
                {eligibilityResult.deductible && (
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Deductible Remaining</p>
                    <p className="text-xl font-bold">${eligibilityResult.deductible.remaining || 0}</p>
                  </div>
                )}
              </div>

              {/* ABA-Specific Benefits */}
              {eligibilityResult.abaBenefits && (
                <div className="border-t pt-4">
                  <p className="font-medium mb-3">ABA Therapy Benefits</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={eligibilityResult.abaBenefits.covered ? 'default' : 'destructive'}>
                      {eligibilityResult.abaBenefits.covered ? 'ABA Covered' : 'ABA Not Covered'}
                    </Badge>
                    {eligibilityResult.abaBenefits.authRequired && (
                      <Badge variant="secondary">Prior Auth Required</Badge>
                    )}
                    {eligibilityResult.abaBenefits.visitLimit && (
                      <Badge variant="outline">
                        {eligibilityResult.abaBenefits.visitsUsed || 0} / {eligibilityResult.abaBenefits.visitLimit} visits used
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Last Checked */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Checked just now
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
