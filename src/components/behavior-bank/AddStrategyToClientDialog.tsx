import { useState } from 'react';
import { Plus, UserPlus, FileText, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export interface StrategyItem {
  id: string;
  type: 'strategy' | 'goal' | 'replacement' | 'benchmark';
  label: string;
  category?: string; // e.g. antecedent, teaching, reactive
  behaviorKey?: string;
}

interface AddStrategyToClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: StrategyItem[];
  mode: 'single' | 'bulk';
}

export function AddStrategyToClientDialog({
  open,
  onOpenChange,
  items,
  mode,
}: AddStrategyToClientDialogProps) {
  const [activeTab, setActiveTab] = useState<'client' | 'report'>('client');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    new Set(items.map(i => i.id))
  );

  const toggleItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddToClient = () => {
    const count = selectedItems.size;
    toast.success(`${count} item${count !== 1 ? 's' : ''} added to client`, {
      description: 'Strategies linked to client profile, goals, and plans.',
    });
    onOpenChange(false);
  };

  const handleExportToReport = (reportType: string) => {
    const count = selectedItems.size;
    toast.success(`${count} item${count !== 1 ? 's' : ''} exported to ${reportType}`, {
      description: 'Strategies will appear in the selected report section.',
    });
    onOpenChange(false);
  };

  const reportTypes = [
    { key: 'bip', label: 'Behavior Intervention Plan (BIP)' },
    { key: 'fba', label: 'Functional Behavior Assessment (FBA)' },
    { key: 'iep', label: 'IEP Report' },
    { key: 'progress', label: 'Progress Report' },
    { key: 'custom', label: 'Custom Report' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">
            {mode === 'single' ? 'Add Strategy' : `Add ${items.length} Strategies`}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'client' | 'report')}>
          <TabsList className="w-full">
            <TabsTrigger value="client" className="flex-1 gap-1.5 text-xs">
              <UserPlus className="w-3.5 h-3.5" />
              Add to Client
            </TabsTrigger>
            <TabsTrigger value="report" className="flex-1 gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" />
              Export to Report
            </TabsTrigger>
          </TabsList>

          <TabsContent value="client" className="mt-3 space-y-3">
            {items.length > 1 && (
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-1.5">
                  {items.map(item => (
                    <label
                      key={item.id}
                      className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={() => toggleItem(item.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-tight">{item.label}</p>
                        <div className="flex gap-1 mt-0.5">
                          {item.category && (
                            <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                          )}
                          {item.behaviorKey && (
                            <Badge variant="secondary" className="text-[10px]">{item.behaviorKey.replace(/-/g, ' ')}</Badge>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}

            {items.length === 1 && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm font-medium">{items[0].label}</p>
                <div className="flex gap-1 mt-1">
                  {items[0].category && (
                    <Badge variant="outline" className="text-[10px]">{items[0].category}</Badge>
                  )}
                  {items[0].behaviorKey && (
                    <Badge variant="secondary" className="text-[10px]">{items[0].behaviorKey.replace(/-/g, ' ')}</Badge>
                  )}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Selected items will be linked to the client's profile, behavior goals, skill goals, and active plans.
            </p>

            <Button onClick={handleAddToClient} className="w-full gap-1.5" size="sm">
              <UserPlus className="w-3.5 h-3.5" />
              Add to Client ({selectedItems.size})
            </Button>
          </TabsContent>

          <TabsContent value="report" className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground mb-2">
              Export {selectedItems.size} selected item{selectedItems.size !== 1 ? 's' : ''} to a report section.
            </p>
            <div className="space-y-1.5">
              {reportTypes.map(rt => (
                <Button
                  key={rt.key}
                  variant="outline"
                  className="w-full justify-start text-sm h-9"
                  onClick={() => handleExportToReport(rt.label)}
                >
                  <FileText className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  {rt.label}
                </Button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
