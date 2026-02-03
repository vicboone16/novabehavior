import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, ArrowLeft, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIEPLibrarySearch } from '@/hooks/useIEPLibrarySearch';
import { IEPFilterPanel } from '@/components/iep-supports/IEPFilterPanel';
import { IEPResultCard } from '@/components/iep-supports/IEPResultCard';
import { AddFromIEPLibraryDialog } from '@/components/iep-supports/AddFromIEPLibraryDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { LinkStatus } from '@/types/iepSupports';

export default function IEPLibrary() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    query,
    searchResults,
    isLoading,
    setSearchText,
    toggleFilter,
    clearFilters,
    hasActiveFilters
  } = useIEPLibrarySearch();

  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [existingLinks, setExistingLinks] = useState<string[]>([]);

  // Load students for the dropdown
  useEffect(() => {
    const loadStudents = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('students')
        .select('id, name')
        .eq('is_archived', false)
        .order('name');
      setStudents(data || []);
    };
    loadStudents();
  }, [user]);

  // Load existing IEP support links when a student is selected
  useEffect(() => {
    const loadExistingLinks = async () => {
      if (!selectedStudent) {
        setExistingLinks([]);
        return;
      }
      const { data } = await supabase
        .from('student_iep_support_links')
        .select('item_id')
        .eq('student_id', selectedStudent.id);
      setExistingLinks(data?.map(d => d.item_id) || []);
    };
    loadExistingLinks();
  }, [selectedStudent]);

  const handleAddToStudent = (student: { id: string; name: string }) => {
    setSelectedStudent(student);
    setShowAddDialog(true);
  };

  const handleAddItem = async (itemId: string, status: LinkStatus) => {
    if (!selectedStudent || !user) return;
    
    try {
      const { error } = await supabase
        .from('student_iep_support_links')
        .insert({
          student_id: selectedStudent.id,
          item_id: itemId,
          link_status: status,
          created_by: user.id,
        });

      if (error) throw error;
      
      setExistingLinks(prev => [...prev, itemId]);
      toast.success(`Support added to ${selectedStudent.name}`);
    } catch (error: any) {
      toast.error('Failed to add support: ' + error.message);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              IEP / 504 Supports Library
            </h1>
            <p className="text-muted-foreground">
              Searchable library of accommodations and modifications
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <UserPlus className="w-4 h-4 mr-2" />
                Add to Student
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
              {students.length === 0 ? (
                <DropdownMenuItem disabled>No students found</DropdownMenuItem>
              ) : (
                students.map(student => (
                  <DropdownMenuItem 
                    key={student.id} 
                    onClick={() => handleAddToStudent(student)}
                  >
                    {student.name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add New Item
          </Button>
        </div>
      </div>

      <IEPFilterPanel
        query={query}
        facets={searchResults.facets}
        onSearchChange={setSearchText}
        onToggleFilter={toggleFilter}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <div className="text-sm text-muted-foreground">
        {searchResults.total} items found
      </div>

      <ScrollArea className="h-[600px]">
        <div className="grid gap-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : searchResults.items.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No items found matching your criteria.
              </CardContent>
            </Card>
          ) : (
            searchResults.items.map(item => (
              <IEPResultCard
                key={item.id}
                item={item}
                showActions={false}
                onAction={() => {}}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {selectedStudent && (
        <AddFromIEPLibraryDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          studentId={selectedStudent.id}
          excludeItemIds={existingLinks}
          onAddItem={handleAddItem}
        />
      )}
    </div>
  );
}
