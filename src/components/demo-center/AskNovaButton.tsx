/**
 * AskNovaButton — persistent floating assistant with quick response panel.
 */

import { useState } from 'react';
import { MessageCircle, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useDemoMode } from '@/contexts/DemoModeContext';

const CANNED_RESPONSES = [
  {
    prompt: 'Where do I start?',
    response: 'You can start by opening a learner profile or exploring a workflow. Would you like me to guide you through a quick walkthrough?',
    action: { label: 'Open Demo Center', path: '/demo' },
  },
  {
    prompt: 'What is this page?',
    response: 'This page shows information related to the learner, including notes, data, assessments, and billing. Each section provides a different view of the learner\'s progress and needs.',
    action: null,
  },
  {
    prompt: 'What should I do next?',
    response: 'You might want to review recent notes, check for alerts, or explore assessment results. I can guide you based on what you\'re working on.',
    action: { label: 'View Learners', path: '/demo/learners' },
  },
  {
    prompt: 'Explain assessments',
    response: 'Assessments are sent to teachers and caregivers, then reviewed by clinical staff. The dashboard tracks pending, completed, and reviewed statuses across all learners.',
    action: { label: 'Open Help Center', path: '/demo/help' },
  },
  {
    prompt: 'Help with billing',
    response: 'The platform supports insurance, regional center, private pay, and school contracts. Each payer type has a distinct workflow for authorizations, claims, and invoicing.',
    action: { label: 'View Training', path: '/demo/training' },
  },
];

export function AskNovaButton() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemoMode();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<typeof CANNED_RESPONSES[0] | null>(null);

  if (!isDemoMode) return null;

  return (
    <>
      {/* Panel */}
      {isOpen && (
        <Card className="fixed bottom-20 right-6 z-50 w-80 shadow-xl rounded-2xl border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Ask Nova</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setIsOpen(false); setSelectedResponse(null); }}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            {selectedResponse ? (
              <div className="space-y-3">
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">You asked:</p>
                  <p className="text-sm font-medium">{selectedResponse.prompt}</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedResponse.response}</p>
                <div className="flex gap-2">
                  {selectedResponse.action && (
                    <Button
                      size="sm"
                      className="gap-1 rounded-xl text-xs"
                      onClick={() => {
                        navigate(selectedResponse.action!.path);
                        setIsOpen(false);
                        setSelectedResponse(null);
                      }}
                    >
                      {selectedResponse.action.label} <ArrowRight className="w-3 h-3" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedResponse(null)}>
                    Ask something else
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">What would you like help with?</p>
                {CANNED_RESPONSES.map(cr => (
                  <button
                    key={cr.prompt}
                    onClick={() => setSelectedResponse(cr)}
                    className="w-full text-left text-sm px-3 py-2 rounded-xl border hover:bg-muted/50 transition-colors"
                  >
                    {cr.prompt}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Floating Button */}
      <Button
        className="fixed bottom-6 right-6 z-40 shadow-lg gap-2 rounded-full px-5 h-12 bg-demo-accent hover:bg-demo-accent/90 text-demo-foreground"
        onClick={() => setIsOpen(!isOpen)}
      >
        <MessageCircle className="w-5 h-5" />
        <span className="hidden sm:inline">Ask Nova</span>
      </Button>
    </>
  );
}
