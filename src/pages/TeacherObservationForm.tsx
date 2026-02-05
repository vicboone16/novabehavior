import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePublicObservationRequest } from '@/hooks/useObservationRequests';
import { ObservationEntry, ObservationResponseData } from '@/types/observationRequest';
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  ClipboardList
} from 'lucide-react';
import { ANTECEDENT_OPTIONS, CONSEQUENCE_OPTIONS } from '@/types/behavior';

export default function TeacherObservationForm() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { request, isLoading, error, submitResponse } = usePublicObservationRequest(token || '');

  const [observations, setObservations] = useState<ObservationEntry[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const addObservation = (type: 'frequency' | 'duration' | 'abc') => {
    const newEntry: ObservationEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      count: type === 'frequency' ? 1 : undefined,
      durationMinutes: type === 'duration' ? 0 : undefined,
    };
    setObservations(prev => [...prev, newEntry]);
  };

  const updateObservation = (id: string, updates: Partial<ObservationEntry>) => {
    setObservations(prev =>
      prev.map(obs => (obs.id === id ? { ...obs, ...updates } : obs))
    );
  };

  const removeObservation = (id: string) => {
    setObservations(prev => prev.filter(obs => obs.id !== id));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    const responseData: ObservationResponseData = {
      observations,
      notes: notes.trim() || undefined,
      submittedAt: new Date().toISOString(),
    };

    const success = await submitResponse(responseData);
    
    if (success) {
      setSubmitted(true);
    }
    
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Form</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Thank You!</h2>
            <p className="text-muted-foreground">
              Your observation has been submitted successfully. The clinician will review your input.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!request) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Behavior Observation Form</CardTitle>
                <CardDescription>
                  Please record your observations below
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {request.instructions && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium mb-1">Instructions:</p>
                <p className="text-sm text-muted-foreground">{request.instructions}</p>
              </div>
            )}
            
            <div className="text-sm text-muted-foreground">
              <p>Expires: {request.expires_at ? format(new Date(request.expires_at), 'MMMM d, yyyy') : 'No expiration'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Add Observation Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Observation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => addObservation('frequency')}>
                <Plus className="w-4 h-4 mr-2" />
                Frequency Count
              </Button>
              <Button variant="outline" onClick={() => addObservation('duration')}>
                <Plus className="w-4 h-4 mr-2" />
                Duration
              </Button>
              <Button variant="outline" onClick={() => addObservation('abc')}>
                <Plus className="w-4 h-4 mr-2" />
                ABC Entry
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Observation Entries */}
        {observations.length > 0 && (
          <div className="space-y-3">
            {observations.map((obs, index) => (
              <Card key={obs.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">#{index + 1}</Badge>
                      <Badge variant="outline">{obs.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(obs.timestamp), 'h:mm a')}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeObservation(obs.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Behavior Name</Label>
                      <Input
                        value={obs.behaviorName || ''}
                        onChange={(e) => updateObservation(obs.id, { behaviorName: e.target.value })}
                        placeholder="e.g., Hitting, Elopement, Task Refusal"
                      />
                    </div>

                    {obs.type === 'frequency' && (
                      <div className="space-y-2">
                        <Label>Count</Label>
                        <Input
                          type="number"
                          min="1"
                          value={obs.count || 1}
                          onChange={(e) => updateObservation(obs.id, { count: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    )}

                    {obs.type === 'duration' && (
                      <div className="space-y-2">
                        <Label>Duration (minutes)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={obs.durationMinutes || 0}
                          onChange={(e) => updateObservation(obs.id, { durationMinutes: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    )}

                    {obs.type === 'abc' && (
                      <>
                        <div className="space-y-2">
                          <Label>What happened before? (Antecedent)</Label>
                          <Select
                            value={obs.antecedent || ''}
                            onValueChange={(value) => updateObservation(obs.id, { antecedent: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select or describe..." />
                            </SelectTrigger>
                            <SelectContent>
                              {ANTECEDENT_OPTIONS.map(option => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>What happened after? (Consequence)</Label>
                          <Select
                            value={obs.consequence || ''}
                            onValueChange={(value) => updateObservation(obs.id, { consequence: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select or describe..." />
                            </SelectTrigger>
                            <SelectContent>
                              {CONSEQUENCE_OPTIONS.map(option => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        value={obs.notes || ''}
                        onChange={(e) => updateObservation(obs.id, { notes: e.target.value })}
                        placeholder="Any additional context..."
                        rows={2}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Overall Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any general observations, patterns noticed, or context to share..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          className="w-full h-12 text-lg"
          onClick={handleSubmit}
          disabled={isSubmitting || observations.length === 0}
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Send className="w-5 h-5 mr-2" />
          )}
          Submit Observation
        </Button>
      </div>
    </div>
  );
}
