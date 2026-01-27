import { ClipboardList } from 'lucide-react';
import { StudentSelector } from '@/components/StudentSelector';
import { BehaviorManager } from '@/components/BehaviorManager';
import { StudentDataCard } from '@/components/StudentDataCard';
import { SessionTimer } from '@/components/SessionTimer';
import { DataSummary } from '@/components/DataSummary';
import { useDataStore } from '@/store/dataStore';

const Index = () => {
  const { students, selectedStudentIds } = useDataStore();
  const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Behavior Data Collector</h1>
                <p className="text-sm text-muted-foreground">ABC, Frequency, Duration & Interval Tracking</p>
              </div>
            </div>
            <BehaviorManager />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 space-y-6">
        {/* Session Timer & Summary */}
        <div className="grid md:grid-cols-2 gap-4">
          <SessionTimer />
          <DataSummary />
        </div>

        {/* Student Selector */}
        <StudentSelector />

        {/* Data Collection Grid */}
        {selectedStudents.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {selectedStudents.map(student => (
              <StudentDataCard key={student.id} student={student} />
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Students Selected
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Add students above and select them to start collecting behavioral data. 
              Use "Manage Behaviors" to configure what data to track for each student.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
