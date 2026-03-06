import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, BookOpen, FileText } from 'lucide-react';
import type { TrainingDownload, TrainingModuleContent } from '@/hooks/useSDCTraining';

interface Props {
  downloads: TrainingDownload[];
  modules: TrainingModuleContent[];
  isAdmin: boolean;
}

const typeEmoji: Record<string, string> = {
  pdf: '📄',
  doc: '📝',
  xlsx: '📊',
  pptx: '📑',
};

export function DownloadsTab({ downloads, modules, isAdmin }: Props) {
  // Filter by audience if not admin
  const visible = isAdmin ? downloads : downloads.filter(d => d.audience !== 'instructor');

  // Group by module_key
  const grouped = visible.reduce<Record<string, TrainingDownload[]>>((acc, d) => {
    const key = d.module_key || 'general';
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  const getModuleTitle = (key: string) =>
    key === 'general' ? 'General Resources' : modules.find(m => m.module_key === key)?.title || key;

  if (visible.length === 0) {
    return (
      <div className="text-center py-16">
        <Download className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No Downloads Available</h3>
        <p className="text-muted-foreground mt-1">Printable resources will appear here once uploaded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Downloads & Resources</h2>
        <p className="text-sm text-muted-foreground">Printable handouts, worksheets, and reference guides</p>
      </div>

      {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([moduleKey, items]) => (
        <div key={moduleKey}>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent" />
            {getModuleTitle(moduleKey)}
          </h3>
          <div className="grid gap-2">
            {items.sort((a, b) => a.sort_order - b.sort_order).map(res => (
              <Card key={res.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{typeEmoji[res.file_type || ''] || '📄'}</span>
                    <div>
                      <p className="font-medium text-sm text-foreground flex items-center gap-2">
                        {res.title}
                        {res.audience === 'instructor' && (
                          <Badge variant="outline" className="text-xs">Instructor Only</Badge>
                        )}
                      </p>
                      {res.description && <p className="text-xs text-muted-foreground">{res.description}</p>}
                    </div>
                  </div>
                  {res.file_url ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={res.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-3 h-3 mr-2" /> Download
                      </a>
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
