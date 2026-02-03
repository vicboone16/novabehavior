import { useState } from 'react';
import { CreditCard, DollarSign, Calendar, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PAYMENT_TYPES, PAYMENT_STATUSES, type PaymentType, type BillingPayment, type StoredPaymentMethod, type PaymentPlan } from '@/types/payments';

interface PatientPaymentPortalProps {
  studentId: string;
  studentName: string;
}

export function PatientPaymentPortal({ studentId, studentName }: PatientPaymentPortalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('make-payment');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [configurationError, setConfigurationError] = useState<string | null>(null);
  
  // Payment form state
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('copay');
  const [description, setDescription] = useState('');

  // Mock data - would come from database
  const [payments] = useState<BillingPayment[]>([]);
  const [storedMethods] = useState<StoredPaymentMethod[]>([]);
  const [paymentPlans] = useState<PaymentPlan[]>([]);
  const [balanceDue] = useState(0);

  const handleMakePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setConfigurationError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to make a payment",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke('process-payment', {
        body: {
          studentId,
          amount: parseFloat(amount),
          paymentType,
          description: description || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (data.configurationRequired) {
        setConfigurationError(data.message);
        toast({
          title: "Payment System Not Configured",
          description: "Please configure Stripe API key to enable payments",
          variant: "destructive",
        });
        return;
      }

      if (!data.success) {
        throw new Error(data.error);
      }

      // In a real implementation, you would use Stripe Elements here
      // For now, show success for the payment intent creation
      toast({
        title: "Payment Initiated",
        description: "Redirecting to secure payment form...",
      });

      // Would integrate with Stripe Elements/Checkout here
      setShowPaymentDialog(true);

    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = PAYMENT_STATUSES.find(s => s.value === status);
    return (
      <Badge className={statusConfig?.color || 'bg-gray-100 text-gray-800'}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Balance Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Balance for {studentName}</p>
              <p className="text-3xl font-bold">${balanceDue.toFixed(2)}</p>
            </div>
            {balanceDue > 0 && (
              <Button onClick={() => {
                setAmount(balanceDue.toString());
                setPaymentType('balance');
              }}>
                Pay Full Balance
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Warning */}
      {configurationError && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Payment Processing Not Configured</p>
                <p className="text-sm text-amber-700 mt-1">{configurationError}</p>
                <p className="text-sm text-amber-600 mt-2">
                  To enable payments, add your Stripe API key in the secrets configuration.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="make-payment" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Make Payment
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="w-4 h-4" />
            Payment History
          </TabsTrigger>
          <TabsTrigger value="payment-plans" className="gap-2">
            <Calendar className="w-4 h-4" />
            Payment Plans
          </TabsTrigger>
          <TabsTrigger value="saved-methods" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Saved Cards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="make-payment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Make a Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Payment Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-7"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-type">Payment Type</Label>
                  <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., January copay, Session balance"
                />
              </div>

              {storedMethods.length > 0 && (
                <div className="space-y-2">
                  <Label>Saved Payment Method</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a saved card or enter new" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Enter new card</SelectItem>
                      {storedMethods.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.card_brand} •••• {method.card_last4}
                          {method.is_default && ' (Default)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button 
                className="w-full" 
                size="lg"
                onClick={handleMakePayment}
                disabled={isProcessing || !amount}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay ${amount || '0.00'}
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Payments are securely processed through Stripe. Your card information is never stored on our servers.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No payment history yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">${payment.amount.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.created_at).toLocaleDateString()} • {payment.payment_type}
                        </p>
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-plans" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Plans</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentPlans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No active payment plans</p>
                  <Button variant="outline" className="mt-4">
                    Set Up Payment Plan
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentPlans.map((plan) => (
                    <div key={plan.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">
                          ${plan.installment_amount.toFixed(2)} / {plan.frequency}
                        </p>
                        <Badge>{plan.status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Total: ${plan.total_amount.toFixed(2)}</p>
                        <p>Progress: {plan.completed_installments} of {plan.total_installments} payments</p>
                        {plan.next_payment_date && (
                          <p>Next payment: {new Date(plan.next_payment_date).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saved-methods" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Saved Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              {storedMethods.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No saved payment methods</p>
                  <p className="text-sm mt-1">Save a card during your next payment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {storedMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {method.card_brand} •••• {method.card_last4}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Expires {method.card_exp_month}/{method.card_exp_year}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {method.is_default && <Badge variant="secondary">Default</Badge>}
                        <Button variant="ghost" size="sm">Remove</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog - Would integrate with Stripe Elements */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Secure Payment</DialogTitle>
            <DialogDescription>
              Complete your payment of ${amount}
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <p className="text-lg font-medium">Payment Intent Created</p>
            <p className="text-sm text-muted-foreground mt-2">
              In production, Stripe Elements would render here for secure card entry.
            </p>
            <Button className="mt-6" onClick={() => setShowPaymentDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
