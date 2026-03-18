/**
 * First-time welcome modal for the Demo Workspace.
 */

import { useState, useEffect } from 'react';
import { FlaskConical, Users, GraduationCap, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'nova-demo-welcomed';

interface Props {
  onAction: (tab: string) => void;
}

export function DemoOnboardingModal({ onAction }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const welcomed = localStorage.getItem(STORAGE_KEY);
    if (!welcomed) {
      setOpen(true);
    }
  }, []);

  const handleAction = (tab: string) => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
    onAction(tab);
  };

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-amber-700" />
            </div>
            <DialogTitle className="text-lg">Welcome to the Demo Workspace</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            This environment shows how the system works with real-world scenarios across clinical, school, and caregiver workflows. All data is simulated — explore freely.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 mt-2">
          <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => handleAction('learners')}>
            <GraduationCap className="w-4 h-4 text-primary" />
            <div className="text-left">
              <p className="text-sm font-medium">Start with a Learner</p>
              <p className="text-xs text-muted-foreground">Explore client profiles and scenarios</p>
            </div>
          </Button>
          <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => handleAction('roles')}>
            <Users className="w-4 h-4 text-primary" />
            <div className="text-left">
              <p className="text-sm font-medium">Explore by Role</p>
              <p className="text-xs text-muted-foreground">See the system through different perspectives</p>
            </div>
          </Button>
          <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => handleAction('walkthroughs')}>
            <Play className="w-4 h-4 text-primary" />
            <div className="text-left">
              <p className="text-sm font-medium">Follow a Guided Walkthrough</p>
              <p className="text-xs text-muted-foreground">Step through key workflows with suggestions</p>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
