import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { useDataStore } from '@/store/dataStore';
import { DataCollectionMethod } from '@/types/behavior';
import { toast } from 'sonner';

interface MobileAddBehaviorSheetProps {
  open: boolean;
  onClose: () => void;
  studentId: string;
  onBehaviorAdded?: (behaviorId: string) => void;
}

const DATA_METHODS: { id: DataCollectionMethod; label: string; description: string }[] = [
  { id: 'frequency', label: 'Frequency', description: 'Count occurrences' },
  { id: 'duration', label: 'Duration', description: 'Time how long' },
  { id: 'latency', label: 'Latency', description: 'Response time' },
  { id: 'interval', label: 'Interval', description: 'Time sampling' },
  { id: 'abc', label: 'ABC', description: 'Antecedent-Behavior-Consequence' },
];

export function MobileAddBehaviorSheet({ open, onClose, studentId, onBehaviorAdded }: MobileAddBehaviorSheetProps) {
  const { addBehaviorWithMethods, students } = useDataStore();
  
  const [name, setName] = useState('');
  const [methods, setMethods] = useState<DataCollectionMethod[]>(['frequency']);
  const [operationalDefinition, setOperationalDefinition] = useState('');

  const student = students.find(s => s.id === studentId);

  const handleToggleMethod = (method: DataCollectionMethod) => {
    setMethods(prev => 
      prev.includes(method) 
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a behavior name');
      return;
    }

    if (methods.length === 0) {
      toast.error('Please select at least one data collection method');
      return;
    }

    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    // Check if behavior already exists
    const existingBehavior = student?.behaviors.find(
      b => b.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (existingBehavior) {
      toast.error('A behavior with this name already exists');
      return;
    }

    addBehaviorWithMethods(studentId, name.trim(), methods, {
      operationalDefinition: operationalDefinition.trim() || undefined,
    });

    toast.success(`Added "${name.trim()}" to ${student?.name}`);

    // Get the newly added behavior ID
    const updatedStudent = useDataStore.getState().students.find(s => s.id === studentId);
    const newBehavior = updatedStudent?.behaviors.find(b => b.name === name.trim());
    
    if (newBehavior && onBehaviorAdded) {
      onBehaviorAdded(newBehavior.id);
    }

    // Reset form
    setName('');
    setMethods(['frequency']);
    setOperationalDefinition('');
    
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle>Add New Behavior</DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon">
              <X className="w-5 h-5" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-6">
          {/* Behavior Name */}
          <div className="space-y-2">
            <Label htmlFor="behavior-name" className="text-base font-semibold">
              Behavior Name *
            </Label>
            <Input
              id="behavior-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Verbal aggression"
              className="h-12 text-lg"
              autoFocus
            />
          </div>

          {/* Data Collection Methods */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Track with (select at least one)
            </Label>
            <div className="grid grid-cols-1 gap-3">
              {DATA_METHODS.map(({ id, label, description }) => (
                <label
                  key={id}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={methods.includes(id)}
                    onCheckedChange={() => handleToggleMethod(id)}
                  />
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Operational Definition (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="definition" className="text-base font-semibold">
              Operational Definition (optional)
            </Label>
            <Textarea
              id="definition"
              value={operationalDefinition}
              onChange={(e) => setOperationalDefinition(e.target.value)}
              placeholder="Describe what counts as this behavior..."
              rows={3}
            />
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            className="w-full h-12 text-lg font-semibold"
            disabled={!name.trim() || methods.length === 0}
          >
            Add Behavior
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
