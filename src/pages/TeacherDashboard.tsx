import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ClipboardList, LogOut, ArrowLeft, User, Calendar,
  ArrowRight, Loader2, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TeacherFriendlyView } from '@/components/TeacherFriendlyView';
import { GlobalSearch } from '@/components/GlobalSearch';
import { TeacherModeTOI } from '@/components/toi/TeacherModeTOI';
import { Student, Behavior } from '@/types/behavior';

interface StudentWithAccess extends Student {
  ownerId?: string;
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithAccess | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [accessibleStudents, setAccessibleStudents] = useState<StudentWithAccess[]>([]);

  // Load accessible students directly from Supabase
  useEffect(() => {
    if (!user) return;

    const loadAccessibleStudents = async () => {
      setIsLoading(true);
      try {
        // Load students that user owns or has access to
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('*')
          .eq('is_archived', false)
          .order('name');

        if (studentsError) {
          throw studentsError;
        }

        // Get students the user can collect data for via user_student_access
        const { data: accessData } = await supabase
          .from('user_student_access')
          .select('student_id')
          .eq('user_id', user.id)
          .eq('can_collect_data', true);

        const accessIds = new Set(accessData?.map(a => a.student_id) || []);

        // Filter students - owner or has access
        const filtered = (studentsData || [])
          .filter(s => s.user_id === user.id || accessIds.has(s.id))
          .map(s => ({
            id: s.id,
            name: s.name,
            color: s.color,
            behaviors: (s.behaviors as unknown as Behavior[]) || [],
            customAntecedents: (s.custom_antecedents as unknown as string[]) || [],
            customConsequences: (s.custom_consequences as unknown as string[]) || [],
            isArchived: s.is_archived,
            grade: s.grade || undefined,
            school: s.school || undefined,
            ownerId: s.user_id,
          }));

        setAccessibleStudents(filtered);
      } catch (error) {
        console.error('Error loading accessible students:', error);
        toast({
          title: 'Error loading students',
          description: 'Please try again',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAccessibleStudents();
  }, [user, toast]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleExitToMain = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-2 md:py-3 px-3 md:px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <ClipboardList className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm md:text-lg font-bold text-foreground leading-tight">Teacher Mode</h1>
                <p className="text-[10px] md:text-xs text-muted-foreground">Quick Data Collection</p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2 shrink-0">
              <GlobalSearch />
              <Button variant="outline" size="sm" className="h-8 text-xs md:text-sm" onClick={handleExitToMain}>
                <ArrowRight className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Exit</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs md:text-sm" onClick={handleLogout}>
                <LogOut className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Date Display & Selector */}
      <div className="bg-muted/50 border-b border-border overflow-x-auto scrollbar-hide">
        <div className="container py-2 px-3 md:px-4">
          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground whitespace-nowrap w-max min-w-full">
            <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span>Recording for:</span>
            <Input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                const d = new Date(e.target.value + 'T12:00:00');
                if (!isNaN(d.getTime())) setSelectedDate(d);
              }}
              className="w-auto h-7 text-xs md:text-sm px-2 bg-background"
            />
            {format(selectedDate, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd') && (
              <Badge variant="outline" className="text-[10px] md:text-xs text-warning border-warning/40">
                Historical
              </Badge>
            )}
            <span className="mx-1">•</span>
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span>{format(new Date(), 'h:mm a')}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container py-6">
        {selectedStudent ? (
          <div className="space-y-4">
            {/* Back Button */}
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => setSelectedStudent(null)}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Students
            </Button>

            {/* Selected Student View */}
            <TeacherFriendlyView 
              student={selectedStudent} 
              isTeacherMode={true}
              onClose={() => setSelectedStudent(null)}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* TOI Quick Entry Section */}
            <TeacherModeTOI 
              students={accessibleStudents.map(s => ({
                id: s.id,
                name: s.name,
                color: s.color,
              }))} 
            />

            <h2 className="text-lg font-semibold">Your Students</h2>
            
            {accessibleStudents.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">No Students Assigned</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You don't have any students assigned to you yet.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Contact an administrator to get student access.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {accessibleStudents.map((student) => (
                  <Card
                    key={student.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedStudent(student)}
                  >
                    <CardContent className="pt-4 text-center">
                      <div
                        className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
                        style={{ backgroundColor: `${student.color}20` }}
                      >
                        <User className="w-7 h-7" style={{ color: student.color }} />
                      </div>
                      <h3 className="font-medium text-sm truncate">{student.name}</h3>
                      {student.grade && (
                        <p className="text-xs text-muted-foreground">
                          Grade {student.grade}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {student.behaviors.length} behavior{student.behaviors.length !== 1 ? 's' : ''}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
