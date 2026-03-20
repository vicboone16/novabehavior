import { useState } from 'react';
import { Download, FileText, Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/store/dataStore';
import { toast } from 'sonner';

export function IEPAutoWorkbook() {
  const { students } = useDataStore();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const handleGenerate = async () => {
    if (!selectedStudentId) {
      toast.error('Please select a student');
      return;
    }
    setIsGenerating(true);
    // TODO: Implement IEP workbook generation
    setTimeout(() => {
      setIsGenerating(false);
      toast.success('IEP workbook generated — export coming soon');
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Auto IEP Workbook Generator
          </CardTitle>
          <CardDescription>
            Generate an auto-populated IEP workbook that pulls student data, goals, assessments, and service records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Student</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a student..." />
              </SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStudent && (
            <Card className="bg-muted/50 border-muted">
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-2">Data that will be included:</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-xs">Student Info</Badge>
                  <Badge variant="secondary" className="text-xs">IEP Goals</Badge>
                  <Badge variant="secondary" className="text-xs">Behavior Data</Badge>
                  <Badge variant="secondary" className="text-xs">Assessment Results</Badge>
                  <Badge variant="secondary" className="text-xs">Service Minutes</Badge>
                  <Badge variant="secondary" className="text-xs">Accommodations</Badge>
                  <Badge variant="secondary" className="text-xs">Progress Notes</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={handleGenerate}
            disabled={!selectedStudentId || isGenerating}
            className="w-full gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Generate IEP Workbook
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
