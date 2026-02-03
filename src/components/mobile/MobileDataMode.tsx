import { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/store/dataStore';
import { OneHandTally } from './OneHandTally';
import { MobileBehaviorSelector } from './MobileBehaviorSelector';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';
import { OfflineIndicator } from './OfflineIndicator';

interface MobileDataModeProps {
  onClose: () => void;
}

export function MobileDataMode({ onClose }: MobileDataModeProps) {
  const { students, selectedStudentIds } = useDataStore();
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [currentBehaviorIndex, setCurrentBehaviorIndex] = useState(0);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  const activeStudents = students.filter(s => selectedStudentIds.includes(s.id));
  const currentStudent = activeStudents[currentStudentIndex];
  
  // Get frequency behaviors from the student's behaviors array
  const behaviors = useMemo(() => {
    if (!currentStudent) return [];
    return currentStudent.behaviors.filter(b => 
      b.methods.includes('frequency') && !b.isArchived && !b.isMastered
    );
  }, [currentStudent]);
  
  const currentBehavior = behaviors[currentBehaviorIndex];

  const handlePrevStudent = () => {
    setCurrentStudentIndex(prev => 
      prev > 0 ? prev - 1 : activeStudents.length - 1
    );
    setCurrentBehaviorIndex(0);
  };

  const handleNextStudent = () => {
    setCurrentStudentIndex(prev => 
      prev < activeStudents.length - 1 ? prev + 1 : 0
    );
    setCurrentBehaviorIndex(0);
  };

  const handlePrevBehavior = () => {
    setCurrentBehaviorIndex(prev => 
      prev > 0 ? prev - 1 : behaviors.length - 1
    );
  };

  const handleNextBehavior = () => {
    setCurrentBehaviorIndex(prev => 
      prev < behaviors.length - 1 ? prev + 1 : 0
    );
  };

  if (activeStudents.length === 0) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">No students selected for data collection.</p>
        <Button onClick={onClose}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Header - Minimal */}
      <header className="flex items-center justify-between p-3 border-b">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <p className="font-medium">{currentStudent?.name}</p>
          <p className="text-xs text-muted-foreground">
            {currentBehavior?.name || 'No frequency behaviors'}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setShowVoiceRecorder(true)}
        >
          <Mic className="w-5 h-5" />
        </Button>
      </header>

      {/* Student Selector */}
      {activeStudents.length > 1 && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
          <Button variant="ghost" size="icon" onClick={handlePrevStudent}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex gap-1">
            {activeStudents.map((s, i) => (
              <div
                key={s.id}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentStudentIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextStudent}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Behavior Selector */}
      {behaviors.length > 1 && (
        <MobileBehaviorSelector
          behaviors={behaviors}
          currentIndex={currentBehaviorIndex}
          onPrev={handlePrevBehavior}
          onNext={handleNextBehavior}
          onSelect={setCurrentBehaviorIndex}
        />
      )}

      {/* Main Tally Area */}
      {currentBehavior && currentStudent ? (
        <OneHandTally
          studentId={currentStudent.id}
          behavior={currentBehavior}
          studentColor={currentStudent.color}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">No frequency behaviors for this student</p>
        </div>
      )}

      {/* Voice Note Recorder */}
      {showVoiceRecorder && (
        <VoiceNoteRecorder
          studentId={currentStudent?.id}
          onClose={() => setShowVoiceRecorder(false)}
        />
      )}
    </div>
  );
}
