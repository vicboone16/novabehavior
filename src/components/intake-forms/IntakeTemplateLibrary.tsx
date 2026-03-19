import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Users, Bot, PenTool, Eye } from 'lucide-react';
import type { FormTemplate } from '@/hooks/useIntakeFormsEngine';

interface Props {
  templates: FormTemplate[];
  searchQuery: string;
  isLoading: boolean;
}

export function IntakeTemplateLibrary({ templates, searchQuery, isLoading }: Props) {
  const filtered = templates.filter(t =>
    !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {searchQuery ? 'No templates match your search' : 'No form templates configured yet'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by category
  const grouped = filtered.reduce<Record<string, FormTemplate[]>>((acc, t) => {
    const cat = t.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, temps]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {category}
          </h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {temps.map(template => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <Badge variant="outline" className="text-xs shrink-0">
                      v{template.version}
                    </Badge>
                  </div>
                  {template.description && (
                    <CardDescription className="text-xs line-clamp-2">
                      {template.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {template.allow_parent_completion && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Users className="h-3 w-3" /> Parent
                      </Badge>
                    )}
                    {template.allow_internal_completion && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <FileText className="h-3 w-3" /> Internal
                      </Badge>
                    )}
                    {template.allow_ai_prefill && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Bot className="h-3 w-3" /> AI
                      </Badge>
                    )}
                    {(template.require_signature_parent || template.require_signature_staff) && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <PenTool className="h-3 w-3" /> Signature
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Preview
                    </Button>
                    <Button size="sm" className="flex-1">
                      Assign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
