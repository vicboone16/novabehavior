import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, X, Tag, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface TagType {
  id: string;
  name: string;
  tag_type: 'school' | 'site' | 'team' | 'custom';
  color: string;
}

interface StudentWithTags {
  id: string;
  name: string;
  color: string;
  tags: TagType[];
}

interface StudentTagManagerProps {
  availableTags: TagType[];
  onTagsChange?: () => void;
}

export function StudentTagManager({ availableTags, onTagsChange }: StudentTagManagerProps) {
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editStudent, setEditStudent] = useState<StudentWithTags | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);

  useEffect(() => {
    loadStudentsWithTags();
  }, [availableTags]);

  const loadStudentsWithTags = async () => {
    try {
      // Load all students
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, name, color')
        .eq('is_archived', false)
        .order('name');

      // Load all student_tags
      const { data: studentTags } = await supabase
        .from('student_tags')
        .select('student_id, tag_id');

      if (studentsData) {
        const studentsWithTags: StudentWithTags[] = studentsData.map(student => {
          const tagIds = studentTags
            ?.filter(st => st.student_id === student.id)
            .map(st => st.tag_id) || [];
          return {
            ...student,
            tags: availableTags.filter(t => tagIds.includes(t.id)),
          };
        });
        setStudents(studentsWithTags);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (student: StudentWithTags) => {
    setEditStudent(student);
    setEditTags(student.tags.map(t => t.id));
  };

  const toggleTag = (tagId: string) => {
    setEditTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const saveTags = async () => {
    if (!editStudent) return;

    try {
      // Delete existing tags for this student
      await supabase
        .from('student_tags')
        .delete()
        .eq('student_id', editStudent.id);

      // Insert new tags
      if (editTags.length > 0) {
        const { error } = await supabase
          .from('student_tags')
          .insert(
            editTags.map(tagId => ({
              student_id: editStudent.id,
              tag_id: tagId,
            }))
          );
        
        if (error) throw error;
      }

      toast({ title: 'Tags updated successfully' });
      setEditStudent(null);
      loadStudentsWithTags();
      onTagsChange?.();
    } catch (error: any) {
      toast({ 
        title: 'Failed to update tags', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group tags by type
  const tagsByType = availableTags.reduce((acc, tag) => {
    if (!acc[tag.tag_type]) acc[tag.tag_type] = [];
    acc[tag.tag_type].push(tag);
    return acc;
  }, {} as Record<string, TagType[]>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Student Tags</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Assign tags to students to control access by school, site, or team
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredStudents.map((student) => (
                <div 
                  key={student.id} 
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${student.color}20` }}
                    >
                      <span style={{ color: student.color }} className="text-xs font-bold">
                        {student.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{student.displayName || student.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {student.tags.length === 0 && (
                          <span className="text-xs text-muted-foreground">No tags assigned</span>
                        )}
                        {student.tags.map((tag) => (
                          <Badge 
                            key={tag.id} 
                            variant="outline" 
                            className="text-xs"
                            style={{ borderColor: tag.color, backgroundColor: `${tag.color}10` }}
                          >
                            <span style={{ color: tag.color }} className="mr-1">●</span>
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEditDialog(student)}
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    Edit Tags
                  </Button>
                </div>
              ))}
              {filteredStudents.length === 0 && !loading && (
                <p className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No students match your search' : 'No students found'}
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>

      {/* Edit Tags Dialog */}
      <Dialog open={!!editStudent} onOpenChange={(open) => !open && setEditStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tags for {editStudent?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select which tags apply to this student. Users with matching tags will be able to access this student's data.
            </p>
            <ScrollArea className="h-[250px]">
              <div className="space-y-4">
                {Object.entries(tagsByType).map(([type, typeTags]) => (
                  <div key={type} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">{type}s</p>
                    <div className="space-y-2">
                      {typeTags.map((tag) => (
                        <div key={tag.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`student-tag-${tag.id}`}
                            checked={editTags.includes(tag.id)}
                            onCheckedChange={() => toggleTag(tag.id)}
                          />
                          <Label 
                            htmlFor={`student-tag-${tag.id}`} 
                            className="text-sm flex items-center gap-2 cursor-pointer"
                          >
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: tag.color }} 
                            />
                            {tag.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {availableTags.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tags created yet. Create tags first to assign them to students.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStudent(null)}>Cancel</Button>
            <Button onClick={saveTags}>Save Tags</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
