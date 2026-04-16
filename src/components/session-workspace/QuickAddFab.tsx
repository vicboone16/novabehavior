import { useState } from 'react';
import { Plus, StickyNote, Activity, Mic, ListPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useDataStore } from '@/store/dataStore';
import { toast } from 'sonner';
import { MobileAddBehaviorSheet } from '@/components/mobile/MobileAddBehaviorSheet';
import { VoiceNoteRecorder } from '@/components/mobile/VoiceNoteRecorder';
import { EnhancedABCPopup } from '@/components/EnhancedABCPopup';

interface QuickAddFabProps {
  /** Active student id, or null when on the "All" overview */
  studentId: string | null;
}

type Sheet = null | 'menu' | 'note' | 'voice' | 'addBehavior' | 'abc';

export function QuickAddFab({ studentId }: QuickAddFabProps) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [noteText, setNoteText] = useState('');
  const addNarrativeNote = useDataStore((s) => s.addNarrativeNote);

  const requireStudent = (): boolean => {
    if (!studentId) {
      toast.info('Choose a client first to log this entry.');
      return false;
    }
    return true;
  };

  const handleSaveNote = () => {
    if (!studentId) return;
    const trimmed = noteText.trim();
    if (!trimmed) {
      toast.info('Type a note first.');
      return;
    }
    addNarrativeNote(studentId, {
      studentId,
      content: trimmed,
      timestamp: new Date(),
    } as any);
    toast.success('Note saved');
    setNoteText('');
    setSheet(null);
  };

  return (
    <>
      {/* Floating launcher (only the menu when closed) */}
      <div className="fixed bottom-20 right-4 z-30 flex flex-col items-end gap-2">
        {sheet === 'menu' && (
          <div className="flex flex-col gap-2 items-end animate-in fade-in slide-in-from-bottom-2">
            <FabAction
              icon={StickyNote}
              label="Note"
              onClick={() => requireStudent() && setSheet('note')}
            />
            <FabAction
              icon={Activity}
              label="ABC entry"
              onClick={() => requireStudent() && setSheet('abc')}
            />
            <FabAction
              icon={ListPlus}
              label="Add behavior"
              onClick={() => requireStudent() && setSheet('addBehavior')}
            />
            <FabAction
              icon={Mic}
              label="Voice note"
              onClick={() => requireStudent() && setSheet('voice')}
            />
          </div>
        )}
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setSheet((s) => (s === 'menu' ? null : 'menu'))}
          aria-label="Quick add"
        >
          {sheet === 'menu' ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </Button>
      </div>

      {/* Note dialog */}
      <Dialog open={sheet === 'note'} onOpenChange={(o) => !o && setSheet(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick note</DialogTitle>
          </DialogHeader>
          <Textarea
            autoFocus
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="What did you observe?"
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSheet(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveNote}>
              Save note
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ABC entry — reuses existing EnhancedABCPopup which manages its own trigger.
          We render it hidden but auto-open by passing onClose via key reset. */}
      {sheet === 'abc' && (
        <Dialog open onOpenChange={(o) => !o && setSheet(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>ABC entry</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground mb-2">
              Use the embedded ABC builder to log antecedent · behavior · consequence.
            </div>
            <EnhancedABCPopup />
          </DialogContent>
        </Dialog>
      )}

      {/* Add behavior on the fly */}
      {sheet === 'addBehavior' && studentId && (
        <MobileAddBehaviorSheet
          open
          onClose={() => setSheet(null)}
          studentId={studentId}
          onBehaviorAdded={() => setSheet(null)}
        />
      )}

      {/* Voice note */}
      {sheet === 'voice' && studentId && (
        <Dialog open onOpenChange={(o) => !o && setSheet(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Voice note</DialogTitle>
            </DialogHeader>
            <VoiceNoteRecorder
              studentId={studentId}
              onClose={() => setSheet(null)}
              onSave={(text) => {
                addNarrativeNote(studentId, {
                  studentId,
                  content: text,
                  timestamp: new Date(),
                } as any);
                toast.success('Voice note saved');
                setSheet(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function FabAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-card border shadow-sm hover:bg-muted transition-colors"
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
