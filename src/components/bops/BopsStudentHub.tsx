import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentBopsProfile } from '@/hooks/useBopsData';
import { BopsProfileCard } from './BopsProfileCard';
import { BopsProgramBank } from './BopsProgramBank';
import { BopsDailyAdjustment } from './BopsDailyAdjustment';
import { BopsSyncPanel } from './BopsSyncPanel';
import { BopsAssessment } from './BopsAssessment';
import { BopsResults } from './BopsResults';
import { BopsWorkflowPanel } from './BopsWorkflowPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

export function BopsStudentHub() {
  const [studentId, setStudentId] = useState<string>('');
  const [tab, setTab] = useState('profile');

  const { data: students, isLoading: sLoading } = useQuery({
    queryKey: ['students-list-bops'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .order('last_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: profile, isLoading: pLoading } = useStudentBopsProfile(studentId || undefined);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Student</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Choose a student..." />
            </SelectTrigger>
            <SelectContent>
              {sLoading ? (
                <div className="p-2"><Loader2 className="animate-spin mx-auto w-4 h-4" /></div>
              ) : (
                students?.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {studentId && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="assessment">Assessment</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="programs">Programs</TabsTrigger>
            <TabsTrigger value="daily">Daily Plan</TabsTrigger>
            <TabsTrigger value="sync">Sync Controls</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            {pLoading ? <Loader2 className="animate-spin mx-auto" /> : (
              <BopsProfileCard studentId={studentId} profile={profile} />
            )}
          </TabsContent>
          <TabsContent value="assessment">
            <BopsAssessment studentId={studentId} />
          </TabsContent>
          <TabsContent value="results">
            <BopsResults studentId={studentId} />
          </TabsContent>
          <TabsContent value="programs">
            <BopsProgramBank studentId={studentId} />
          </TabsContent>
          <TabsContent value="daily">
            <BopsDailyAdjustment studentId={studentId} />
          </TabsContent>
          <TabsContent value="sync">
            <BopsSyncPanel studentId={studentId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
