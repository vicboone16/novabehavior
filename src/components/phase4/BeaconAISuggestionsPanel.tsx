import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { BrainCircuit, ThumbsUp, ThumbsDown, MessageSquare, Check, X, RefreshCw, Lightbulb, AlertTriangle } from 'lucide-react';
import { useBeaconAI } from '@/hooks/usePhase4Data';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props {
  scopeType?: string;
  scopeId?: string;
}

const PRIORITY_MAP: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
  high: { variant: 'destructive', label: 'High' },
  medium: { variant: 'default', label: 'Medium' },
  low: { variant: 'secondary', label: 'Low' },
};

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  open: { color: 'bg-blue-500', label: 'Open' },
  accepted: { color: 'bg-green-500', label: 'Accepted' },
  dismissed: { color: 'bg-muted-foreground', label: 'Dismissed' },
  implemented: { color: 'bg-primary', label: 'Implemented' },
};

export function BeaconAISuggestionsPanel({ scopeType, scopeId }: Props) {
  const ai = useBeaconAI();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackModal, setFeedbackModal] = useState<{ open: boolean; suggestionId: string; type: string }>({ open: false, suggestionId: '', type: '' });
  const [feedbackText, setFeedbackText] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await ai.fetchSuggestions({ scopeType, scopeId });
      setSuggestions(data);
    } catch { toast.error('Failed to load AI suggestions'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [scopeType, scopeId]);

  const handleReview = async (id: string, status: string) => {
    try {
      await ai.reviewSuggestion(id, status);
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status, reviewed_at: new Date().toISOString() } : s));
      toast.success(`Suggestion ${status}`);
    } catch { toast.error('Failed to update suggestion'); }
  };

  const handleFeedback = async () => {
    try {
      await ai.submitFeedback(feedbackModal.suggestionId, feedbackModal.type, feedbackText);
      toast.success('Feedback submitted');
      setFeedbackModal({ open: false, suggestionId: '', type: '' });
      setFeedbackText('');
    } catch { toast.error('Failed to submit feedback'); }
  };

  const openSuggestions = suggestions.filter(s => s.status === 'open');
  const reviewedSuggestions = suggestions.filter(s => s.status !== 'open');

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">AI Recommendations</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              {openSuggestions.length > 0 && (
                <Badge variant="default" className="text-[10px] h-5">{openSuggestions.length} new</Badge>
              )}
              <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="w-3 h-3" /></Button>
            </div>
          </div>
          <CardDescription className="text-xs">
            Nova AI insights based on recent behavior data and session patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No AI suggestions available.</p>
          ) : (
            <>
              {/* Open suggestions */}
              {openSuggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Action Items</p>
                  {openSuggestions.map((s: any) => {
                    const priority = PRIORITY_MAP[s.priority] || PRIORITY_MAP.medium;
                    return (
                      <div key={s.id} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <Lightbulb className="w-3.5 h-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium">{s.title}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{s.suggestion_text}</p>
                            </div>
                          </div>
                          <Badge variant={priority.variant} className="text-[10px] h-5 flex-shrink-0">{priority.label}</Badge>
                        </div>
                        <div className="flex items-center gap-1 pt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] gap-1 text-green-600 hover:text-green-700"
                            onClick={() => handleReview(s.id, 'accepted')}
                          >
                            <Check className="w-3 h-3" /> Accept
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] gap-1"
                            onClick={() => handleReview(s.id, 'dismissed')}
                          >
                            <X className="w-3 h-3" /> Dismiss
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] gap-1"
                            onClick={() => setFeedbackModal({ open: true, suggestionId: s.id, type: 'comment' })}
                          >
                            <MessageSquare className="w-3 h-3" /> Comment
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reviewed suggestions */}
              {reviewedSuggestions.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reviewed</p>
                    {reviewedSuggestions.slice(0, 5).map((s: any) => {
                      const status = STATUS_MAP[s.status] || STATUS_MAP.open;
                      return (
                        <div key={s.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
                            <span className="text-xs">{s.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] h-5">{status.label}</Badge>
                            {s.reviewed_at && (
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(s.reviewed_at), 'MMM d')}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Feedback Dialog */}
      <Dialog open={feedbackModal.open} onOpenChange={(o) => !o && setFeedbackModal({ open: false, suggestionId: '', type: '' })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Feedback</DialogTitle>
          </DialogHeader>
          <Textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Share your feedback on this suggestion..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setFeedbackModal({ open: false, suggestionId: '', type: '' })}>Cancel</Button>
            <Button size="sm" onClick={handleFeedback} disabled={!feedbackText.trim()}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
