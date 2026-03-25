import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Eye, Users, Heart, Brain, 
  TrendingUp, TrendingDown, Minus,
  Star, Gift, Lightbulb, Home,
  Shield, Loader2, Smartphone, Monitor
} from 'lucide-react';
import { ParentPreviewPanel } from './ParentPreviewPanel';
import { TeacherPreviewPanel } from './TeacherPreviewPanel';
import { ClinicalSyncPanel } from './ClinicalSyncPanel';

interface LinkedSystemViewProps {
  agencyId: string | null;
  students: { id: string; name: string }[];
}

export function LinkedSystemView({ agencyId, students }: LinkedSystemViewProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const selectedStudent = students.find(s => s.id === selectedStudentId);

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No students on your caseload to preview.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Linked System View</h3>
          <Badge variant="outline" className="text-xs">Admin Preview</Badge>
        </div>
        <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
          <SelectTrigger className="w-[220px]">
            <Users className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Select student" />
          </SelectTrigger>
          <SelectContent>
            {students.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground">
        Preview what teachers and parents see for <strong>{selectedStudent?.name || 'this student'}</strong>. 
        All views are read-only. Data flows from teacher actions → parent insights → clinical analysis.
      </p>

      {/* Three-panel view */}
      <Tabs defaultValue="parent" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="teacher" className="gap-1.5">
            <Monitor className="w-4 h-4" />
            <span className="hidden sm:inline">Teacher View</span>
            <span className="sm:hidden">Teacher</span>
          </TabsTrigger>
          <TabsTrigger value="parent" className="gap-1.5">
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Parent View</span>
            <span className="sm:hidden">Parent</span>
          </TabsTrigger>
          <TabsTrigger value="clinical" className="gap-1.5">
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">Clinical Sync</span>
            <span className="sm:hidden">Clinical</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teacher">
          <TeacherPreviewPanel studentId={selectedStudentId} studentName={selectedStudent?.name || ''} />
        </TabsContent>

        <TabsContent value="parent">
          <ParentPreviewPanel studentId={selectedStudentId} studentName={selectedStudent?.name || ''} />
        </TabsContent>

        <TabsContent value="clinical">
          <ClinicalSyncPanel studentId={selectedStudentId} studentName={selectedStudent?.name || ''} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
