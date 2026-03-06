import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, FileText, Lock, BookOpen } from 'lucide-react';
import type { SDCResource } from '@/hooks/useSDCTraining';

interface Props {
  resources: SDCResource[];
  isAdmin: boolean;
  moduleNames: Record<string, string>;
}

const typeIcons: Record<string, string> = {
  handout: '📄',
  worksheet: '📝',
  guide: '📖',
  reference: '📋',
  template: '📑',
};

export function DownloadsTab({ resources, isAdmin, moduleNames }: Props) {
  // Filter out instructor-only for non-admins
  const visible = isAdmin ? resources : resources.filter(r => !r.is_instructor_only);

  // Group by module
  const grouped = visible.reduce<Record<string, SDCResource[]>>((acc, r) => {
    const key = r.module_id || 'general';
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

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

      {Object.entries(grouped).map(([moduleId, items]) => (
        <div key={moduleId}>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent" />
            {moduleId === 'general' ? 'General Resources' : (moduleNames[moduleId] || 'Unknown Module')}
          </h3>
          <div className="grid gap-2">
            {items.map((res) => (
              <Card key={res.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{typeIcons[res.resource_type] || '📄'}</span>
                    <div>
                      <p className="font-medium text-sm text-foreground flex items-center gap-2">
                        {res.title}
                        {res.is_instructor_only && (
                          <Badge variant="outline" className="text-xs"><Lock className="w-3 h-3 mr-1" />Instructor Only</Badge>
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
