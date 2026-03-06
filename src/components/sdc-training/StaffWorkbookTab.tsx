import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Clock, Printer, PenTool, HelpCircle, CheckSquare, FileText } from 'lucide-react';
import type { TrainingModuleContent, TrainingWorkbookItem } from '@/hooks/useSDCTraining';

interface Props {
  modules: TrainingModuleContent[];
  workbookItems: TrainingWorkbookItem[];
}

const typeIcons: Record<string, typeof PenTool> = {
  reflection: PenTool,
  scenario: HelpCircle,
  worksheet: FileText,
  practice: CheckSquare,
};

const typeLabels: Record<string, string> = {
  reflection: 'Reflection',
  scenario: 'Scenario',
  worksheet: 'Worksheet',
  practice: 'Practice',
};

export function StaffWorkbookTab({ modules, workbookItems }: Props) {
  const [filterKey, setFilterKey] = useState<string>('all');
  const handlePrint = () => window.print();

  const filtered = filterKey === 'all'
    ? workbookItems
    : workbookItems.filter(w => w.module_key === filterKey);

  // Group by module
  const grouped = filtered.reduce<Record<string, TrainingWorkbookItem[]>>((acc, item) => {
    if (!acc[item.module_key]) acc[item.module_key] = [];
    acc[item.module_key].push(item);
    return acc;
  }, {});

  const getModuleTitle = (key: string) => modules.find(m => m.module_key === key)?.title || key;

  if (workbookItems.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No Workbook Content Yet</h3>
        <p className="text-muted-foreground mt-1">Staff workbook items will appear here once created.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Staff Workbook</h2>
          <p className="text-sm text-muted-foreground">Learner-facing reading, reflection, and practice activities</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Select value={filterKey} onValueChange={setFilterKey}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filter by module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {modules.map(m => (
                <SelectItem key={m.module_key} value={m.module_key}>{m.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([moduleKey, items]) => (
        <div key={moduleKey} className="space-y-2">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent" />
            {getModuleTitle(moduleKey)}
          </h3>
          {items.sort((a, b) => a.sort_order - b.sort_order).map(item => {
            const Icon = typeIcons[item.item_type] || FileText;
            return (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-accent" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-foreground">{item.title}</p>
                        <Badge variant="secondary" className="text-xs">{typeLabels[item.item_type] || item.item_type}</Badge>
                      </div>
                      {item.instructions && (
                        <p className="text-sm text-muted-foreground">{item.instructions}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}
