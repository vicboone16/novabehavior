import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Tag, Search, Users, CheckSquare, Square, 
  Plus, Minus, Shield, Loader2, Settings2 
} from 'lucide-react';
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

interface BulkStudentManagerProps {
  availableTags: TagType[];
  onDataChange?: () => void;
}

type BulkAction = 'add_tags' | 'remove_tags' | 'set_access';

export function BulkStudentManager({ availableTags, onDataChange }: BulkStudentManagerProps) {
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection state
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  
  // Bulk action dialog
  const [showBulkAction, setShowBulkAction] = useState<BulkAction | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  
  // Access settings for bulk action
  const [bulkAccessSettings, setBulkAccessSettings] = useState({
    can_view_notes: true,
    can_view_documents: true,
    can_collect_data: true,
    can_edit_profile: false,
    can_generate_reports: true,
  });
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [users, setUsers] = useState<{ id: string; display_name: string; email: string }[]>([]);

  useEffect(() => {
    loadData();
  }, [availableTags]);

  const loadData = async () => {
    try {
      // Load students with tags
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, name, color')
        .eq('is_archived', false)
        .order('name');

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

      // Load users for access assignment
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .eq('is_approved', true);

      if (profiles) {
        setUsers(profiles.map(p => ({
          id: p.user_id,
          display_name: p.display_name || p.email || 'Unknown',
          email: p.email || '',
        })));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => 
    students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [students, searchQuery]
  );

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
  };

  const deselectAll = () => {
    setSelectedStudentIds(new Set());
  };

  const toggleTagSelection = (tagId: string) => {
    setSelectedTagIds(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  const handleBulkAddTags = async () => {
    if (selectedStudentIds.size === 0 || selectedTagIds.size === 0) return;
    setProcessing(true);

    try {
      const inserts: { student_id: string; tag_id: string }[] = [];
      
      for (const studentId of selectedStudentIds) {
        for (const tagId of selectedTagIds) {
          // Check if already exists
          const student = students.find(s => s.id === studentId);
          if (!student?.tags.some(t => t.id === tagId)) {
            inserts.push({ student_id: studentId, tag_id: tagId });
          }
        }
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from('student_tags').insert(inserts);
        if (error) throw error;
      }

      toast({ 
        title: 'Tags added', 
        description: `Added ${selectedTagIds.size} tag(s) to ${selectedStudentIds.size} student(s)` 
      });
      setShowBulkAction(null);
      setSelectedTagIds(new Set());
      loadData();
      onDataChange?.();
    } catch (error: any) {
      toast({ title: 'Failed to add tags', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkRemoveTags = async () => {
    if (selectedStudentIds.size === 0 || selectedTagIds.size === 0) return;
    setProcessing(true);

    try {
      for (const studentId of selectedStudentIds) {
        for (const tagId of selectedTagIds) {
          await supabase
            .from('student_tags')
            .delete()
            .eq('student_id', studentId)
            .eq('tag_id', tagId);
        }
      }

      toast({ 
        title: 'Tags removed', 
        description: `Removed ${selectedTagIds.size} tag(s) from ${selectedStudentIds.size} student(s)` 
      });
      setShowBulkAction(null);
      setSelectedTagIds(new Set());
      loadData();
      onDataChange?.();
    } catch (error: any) {
      toast({ title: 'Failed to remove tags', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkSetAccess = async () => {
    if (selectedStudentIds.size === 0 || !targetUserId) return;
    setProcessing(true);

    try {
      for (const studentId of selectedStudentIds) {
        await supabase
          .from('user_student_access')
          .upsert({
            user_id: targetUserId,
            student_id: studentId,
            permission_level: 'full',
            ...bulkAccessSettings,
          }, { onConflict: 'user_id,student_id' });
      }

      toast({ 
        title: 'Access updated', 
        description: `Set access for ${selectedStudentIds.size} student(s)` 
      });
      setShowBulkAction(null);
      loadData();
      onDataChange?.();
    } catch (error: any) {
      toast({ title: 'Failed to set access', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleSetFullAccessPreset = () => {
    setBulkAccessSettings({
      can_view_notes: true,
      can_view_documents: true,
      can_collect_data: true,
      can_edit_profile: true,
      can_generate_reports: true,
    });
  };

  // Group tags by type
  const tagsByType = availableTags.reduce((acc, tag) => {
    if (!acc[tag.tag_type]) acc[tag.tag_type] = [];
    acc[tag.tag_type].push(tag);
    return acc;
  }, {} as Record<string, TagType[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">Bulk Student Management</CardTitle>
              <CardDescription>
                Select multiple students to add/remove tags or set access permissions
              </CardDescription>
            </div>
            {selectedStudentIds.size > 0 && (
              <div className="flex gap-2 flex-wrap">
                <Button 
                  size="sm" 
                  onClick={() => setShowBulkAction('add_tags')}
                  className="gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Tags
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowBulkAction('remove_tags')}
                  className="gap-1"
                >
                  <Minus className="w-3 h-3" />
                  Remove Tags
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => setShowBulkAction('set_access')}
                  className="gap-1"
                >
                  <Shield className="w-3 h-3" />
                  Set Access
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and select controls */}
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm" onClick={selectAll}>
                <CheckSquare className="w-4 h-4 mr-1" />
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                <Square className="w-4 h-4 mr-1" />
                Deselect All
              </Button>
            </div>

            {/* Selection count */}
            {selectedStudentIds.size > 0 && (
              <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {selectedStudentIds.size} student(s) selected
                </span>
              </div>
            )}

            {/* Student list */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredStudents.map((student) => (
                  <div 
                    key={student.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedStudentIds.has(student.id)
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-secondary/30 border-transparent hover:bg-secondary/50'
                    }`}
                    onClick={() => toggleStudentSelection(student.id)}
                  >
                    <Checkbox
                      checked={selectedStudentIds.has(student.id)}
                      onCheckedChange={() => toggleStudentSelection(student.id)}
                    />
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${student.color}20` }}
                    >
                      <span style={{ color: student.color }} className="text-xs font-bold">
                        {student.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{student.displayName || student.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {student.tags.length === 0 && (
                          <span className="text-xs text-muted-foreground">No tags</span>
                        )}
                        {student.tags.map((tag) => (
                          <Badge 
                            key={tag.id} 
                            variant="outline" 
                            className="text-[10px] px-1.5 py-0"
                            style={{ borderColor: tag.color, backgroundColor: `${tag.color}10` }}
                          >
                            <span style={{ color: tag.color }} className="mr-0.5">●</span>
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredStudents.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No students match your search' : 'No students found'}
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Add Tags Dialog */}
      <Dialog open={showBulkAction === 'add_tags'} onOpenChange={(open) => !open && setShowBulkAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Tags to {selectedStudentIds.size} Student(s)
            </DialogTitle>
            <DialogDescription>
              Select tags to add to the selected students
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {Object.entries(tagsByType).map(([type, typeTags]) => (
                  <div key={type} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">{type}s</p>
                    <div className="space-y-2">
                      {typeTags.map((tag) => (
                        <div key={tag.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`add-tag-${tag.id}`}
                            checked={selectedTagIds.has(tag.id)}
                            onCheckedChange={() => toggleTagSelection(tag.id)}
                          />
                          <Label 
                            htmlFor={`add-tag-${tag.id}`} 
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
                    No tags available. Create tags first.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAction(null)}>Cancel</Button>
            <Button 
              onClick={handleBulkAddTags} 
              disabled={selectedTagIds.size === 0 || processing}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Remove Tags Dialog */}
      <Dialog open={showBulkAction === 'remove_tags'} onOpenChange={(open) => !open && setShowBulkAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Minus className="w-5 h-5" />
              Remove Tags from {selectedStudentIds.size} Student(s)
            </DialogTitle>
            <DialogDescription>
              Select tags to remove from the selected students
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {Object.entries(tagsByType).map(([type, typeTags]) => (
                  <div key={type} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">{type}s</p>
                    <div className="space-y-2">
                      {typeTags.map((tag) => (
                        <div key={tag.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`remove-tag-${tag.id}`}
                            checked={selectedTagIds.has(tag.id)}
                            onCheckedChange={() => toggleTagSelection(tag.id)}
                          />
                          <Label 
                            htmlFor={`remove-tag-${tag.id}`} 
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
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAction(null)}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={handleBulkRemoveTags} 
              disabled={selectedTagIds.size === 0 || processing}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Set Access Dialog */}
      <Dialog open={showBulkAction === 'set_access'} onOpenChange={(open) => !open && setShowBulkAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Set Access for {selectedStudentIds.size} Student(s)
            </DialogTitle>
            <DialogDescription>
              Configure access permissions for a user across selected students
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* User selection */}
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={targetUserId} onValueChange={setTargetUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.display_name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick presets */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSetFullAccessPreset}
                className="gap-1"
              >
                <Settings2 className="w-3 h-3" />
                Full Access Preset
              </Button>
            </div>

            {/* Permission toggles */}
            <div className="space-y-3 p-3 bg-secondary/30 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-sm">View Notes</Label>
                <Switch
                  checked={bulkAccessSettings.can_view_notes}
                  onCheckedChange={(checked) => 
                    setBulkAccessSettings(prev => ({ ...prev, can_view_notes: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">View Documents</Label>
                <Switch
                  checked={bulkAccessSettings.can_view_documents}
                  onCheckedChange={(checked) => 
                    setBulkAccessSettings(prev => ({ ...prev, can_view_documents: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Collect Data</Label>
                <Switch
                  checked={bulkAccessSettings.can_collect_data}
                  onCheckedChange={(checked) => 
                    setBulkAccessSettings(prev => ({ ...prev, can_collect_data: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Edit Profile</Label>
                <Switch
                  checked={bulkAccessSettings.can_edit_profile}
                  onCheckedChange={(checked) => 
                    setBulkAccessSettings(prev => ({ ...prev, can_edit_profile: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Generate Reports</Label>
                <Switch
                  checked={bulkAccessSettings.can_generate_reports}
                  onCheckedChange={(checked) => 
                    setBulkAccessSettings(prev => ({ ...prev, can_generate_reports: checked }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAction(null)}>Cancel</Button>
            <Button 
              onClick={handleBulkSetAccess} 
              disabled={!targetUserId || processing}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Apply Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
