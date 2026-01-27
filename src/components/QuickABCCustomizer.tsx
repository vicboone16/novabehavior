import { useState } from 'react';
import { Plus, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useDataStore } from '@/store/dataStore';
import { ANTECEDENT_OPTIONS, CONSEQUENCE_OPTIONS } from '@/types/behavior';

export function QuickABCCustomizer() {
  const { 
    students, 
    selectedStudentIds,
    addCustomAntecedent,
    addCustomConsequence,
    getStudentAntecedents,
    getStudentConsequences,
  } = useDataStore();

  const [open, setOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [newAntecedent, setNewAntecedent] = useState('');
  const [newConsequence, setNewConsequence] = useState('');
  const [activeTab, setActiveTab] = useState<'antecedent' | 'consequence'>('antecedent');

  const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));
  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const handleAddAntecedent = () => {
    if (!newAntecedent.trim() || !selectedStudentId) return;
    addCustomAntecedent(selectedStudentId, newAntecedent.trim());
    setNewAntecedent('');
  };

  const handleAddConsequence = () => {
    if (!newConsequence.trim() || !selectedStudentId) return;
    addCustomConsequence(selectedStudentId, newConsequence.trim());
    setNewConsequence('');
  };

  const handleAddToAll = (type: 'antecedent' | 'consequence') => {
    const value = type === 'antecedent' ? newAntecedent : newConsequence;
    if (!value.trim()) return;
    
    selectedStudentIds.forEach(id => {
      if (type === 'antecedent') {
        addCustomAntecedent(id, value.trim());
      } else {
        addCustomConsequence(id, value.trim());
      }
    });
    
    if (type === 'antecedent') {
      setNewAntecedent('');
    } else {
      setNewConsequence('');
    }
  };

  const customAntecedents = selectedStudentId ? getStudentAntecedents(selectedStudentId) : [];
  const customConsequences = selectedStudentId ? getStudentConsequences(selectedStudentId) : [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="w-4 h-4" />
          ABC Options
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Quick ABC Customization</h4>
          </div>

          {/* Student Selection */}
          <div className="space-y-1">
            <Label className="text-xs">Select Student</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Choose student..." />
              </SelectTrigger>
              <SelectContent>
                {selectedStudents.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'antecedent' | 'consequence')}>
            <TabsList className="grid grid-cols-2 w-full h-8">
              <TabsTrigger value="antecedent" className="text-xs">Antecedents</TabsTrigger>
              <TabsTrigger value="consequence" className="text-xs">Consequences</TabsTrigger>
            </TabsList>

            <TabsContent value="antecedent" className="space-y-2 mt-2">
              <div className="flex gap-1">
                <Input
                  placeholder="New antecedent..."
                  value={newAntecedent}
                  onChange={(e) => setNewAntecedent(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAntecedent()}
                />
                <Button 
                  size="sm" 
                  className="h-8 px-2"
                  onClick={handleAddAntecedent}
                  disabled={!newAntecedent.trim() || !selectedStudentId}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              {selectedStudentIds.length > 1 && newAntecedent.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={() => handleAddToAll('antecedent')}
                >
                  Add to all {selectedStudentIds.length} students
                </Button>
              )}
              
              {selectedStudentId && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {selectedStudent?.name}'s custom antecedents:
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {customAntecedents.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">None added yet</span>
                    ) : (
                      customAntecedents.map(a => (
                        <Badge key={a} variant="secondary" className="text-xs">
                          {a} ★
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="consequence" className="space-y-2 mt-2">
              <div className="flex gap-1">
                <Input
                  placeholder="New consequence..."
                  value={newConsequence}
                  onChange={(e) => setNewConsequence(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddConsequence()}
                />
                <Button 
                  size="sm" 
                  className="h-8 px-2"
                  onClick={handleAddConsequence}
                  disabled={!newConsequence.trim() || !selectedStudentId}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              {selectedStudentIds.length > 1 && newConsequence.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={() => handleAddToAll('consequence')}
                >
                  Add to all {selectedStudentIds.length} students
                </Button>
              )}
              
              {selectedStudentId && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {selectedStudent?.name}'s custom consequences:
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {customConsequences.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">None added yet</span>
                    ) : (
                      customConsequences.map(c => (
                        <Badge key={c} variant="secondary" className="text-xs">
                          {c} ★
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground">
            Custom options (★) will appear in ABC recording for the selected student.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
