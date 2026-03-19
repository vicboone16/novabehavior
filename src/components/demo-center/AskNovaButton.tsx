/**
 * AskNovaButton — persistent floating button for the Ask Nova assistant.
 */

import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useDemoMode } from '@/contexts/DemoModeContext';

export function AskNovaButton() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemoMode();

  if (!isDemoMode) return null;

  return (
    <Button
      className="fixed bottom-6 right-6 z-40 shadow-lg gap-2 rounded-full px-5 h-12 bg-demo-accent hover:bg-demo-accent/90 text-demo-foreground"
      onClick={() => navigate('/ask-nova')}
    >
      <MessageCircle className="w-5 h-5" />
      <span className="hidden sm:inline">Ask Nova</span>
    </Button>
  );
}
