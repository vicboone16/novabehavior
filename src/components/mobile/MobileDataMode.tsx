import { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/store/dataStore';
import { MobileFrequencyTally } from './MobileFrequencyTally';
import { MobileDurationTracker } from './MobileDurationTracker';
import { MobileLatencyTracker } from './MobileLatencyTracker';
import { MobileIntervalTracker } from './MobileIntervalTracker';
import { MobileABCEntry } from './MobileABCEntry';
import { MobileBehaviorSelector } from './MobileBehaviorSelector';
import { MobileDataToolbar, MobileDataMode as DataMode } from './MobileDataToolbar';
import { MobileAddBehaviorSheet } from './MobileAddBehaviorSheet';
import { MobileSettingsSheet } from './MobileSettingsSheet';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';
import { OfflineIndicator } from './OfflineIndicator';
import { toast } from 'sonner';

interface MobileDataModeProps {
  onClose: () => void;
}

export function MobileDataMode({ onClose }: MobileDataModeProps) {
  const { students, selectedStudentIds } = useDataStore();
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [currentBehaviorIndex, setCurrentBehaviorIndex] = useState(0);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showAddBehavior, setShowAddBehavior] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showABCEntry, setShowABCEntry] = useState(false);
  const [dataMode, setDataMode] = useState<DataMode>('frequency');

  const activeStudents = students.filter(s => selectedStudentIds.includes(s.id));
  const currentStudent = activeStudents[currentStudentIndex];
  
  // Get all active behaviors (not just frequency)
  const behaviors = useMemo(() => {
    if (!currentStudent) return [];
    return currentStudent.behaviors.filter(b => !b.isArchived && !b.isMastered);
  }, [currentStudent]);
  
  const currentBehavior = behaviors[currentBehaviorIndex];

  // Check if current behavior supports the selected data mode
  const behaviorSupportsMode = useMemo(() => {
    if (!currentBehavior) return false;
    const methodMap: Record<DataMode, string> = {
      frequency: 'frequency',
      duration: 'duration',
      latency: 'latency',
      interval: 'interval',
      abc: 'abc',
    };
    return currentBehavior.methods.includes(methodMap[dataMode] as any);
  }, [currentBehavior, dataMode]);

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

  const handleModeChange = (mode: DataMode) => {
    if (mode === 'abc') {
      // ABC opens as a sheet, not inline
      setShowABCEntry(true);
    } else {
      setDataMode(mode);
      // Check if current behavior supports this mode
      if (currentBehavior && !currentBehavior.methods.includes(mode as any)) {
        toast.info(`"${currentBehavior.name}" doesn't track ${mode}. Switch behaviors or add this method.`);
      }
    }
  };

  const handleBehaviorAdded = (behaviorId: string) => {
    // Find and select the newly added behavior
    const updatedBehaviors = currentStudent?.behaviors.filter(b => !b.isArchived && !b.isMastered) || [];
    const newIndex = updatedBehaviors.findIndex(b => b.id === behaviorId);
    if (newIndex !== -1) {
      setCurrentBehaviorIndex(newIndex);
    }
  };

  if (activeStudents.length === 0) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">No students selected for data collection.</p>
        <Button onClick={onClose}>Go Back</Button>
      </div>
    );
  }

  const renderTracker = () => {
    if (!currentBehavior || !currentStudent) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">No behaviors for this student</p>
        </div>
      );
    }

    if (!behaviorSupportsMode) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-muted-foreground mb-2">
            "{currentBehavior.name}" doesn't track {dataMode}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Switch to a different behavior or add this data method
          </p>
          <Button variant="outline" onClick={() => setShowAddBehavior(true)}>
            Add New Behavior
          </Button>
        </div>
      );
    }

    switch (dataMode) {
      case 'frequency':
        return (
          <MobileFrequencyTally
            studentId={currentStudent.id}
            behavior={currentBehavior}
            studentColor={currentStudent.color}
          />
        );
      case 'duration':
        return (
          <MobileDurationTracker
            studentId={currentStudent.id}
            behavior={currentBehavior}
            studentColor={currentStudent.color}
          />
        );
      case 'latency':
        return (
          <MobileLatencyTracker
            studentId={currentStudent.id}
            behavior={currentBehavior}
            studentColor={currentStudent.color}
          />
        );
      case 'interval':
        return (
          <MobileIntervalTracker
            studentId={currentStudent.id}
            behavior={currentBehavior}
            studentColor={currentStudent.color}
          />
        );
      default:
        return null;
    }
  };

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
            {currentBehavior?.name || 'No behaviors'}
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

      {/* Main Tracker Area */}
      {renderTracker()}

      {/* Data Type Toolbar */}
      <MobileDataToolbar
        currentMode={dataMode}
        onModeChange={handleModeChange}
        onAddBehavior={() => setShowAddBehavior(true)}
        onOpenSettings={() => setShowSettings(true)}
        availableModes={currentBehavior?.methods}
      />

      {/* Voice Note Recorder */}
      {showVoiceRecorder && (
        <VoiceNoteRecorder
          studentId={currentStudent?.id}
          onClose={() => setShowVoiceRecorder(false)}
        />
      )}

      {/* Add Behavior Sheet */}
      {currentStudent && (
        <MobileAddBehaviorSheet
          open={showAddBehavior}
          onClose={() => setShowAddBehavior(false)}
          studentId={currentStudent.id}
          onBehaviorAdded={handleBehaviorAdded}
        />
      )}

      {/* Settings Sheet */}
      <MobileSettingsSheet
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* ABC Entry Sheet */}
      {currentStudent && currentBehavior && (
        <MobileABCEntry
          open={showABCEntry}
          onClose={() => setShowABCEntry(false)}
          student={currentStudent}
          currentBehavior={currentBehavior}
        />
      )}
    </div>
  );
}
