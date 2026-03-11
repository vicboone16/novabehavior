import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, BookOpen, Target, Download, CheckCircle2, Circle, ArrowLeft, ShieldCheck, FileText, PenTool, HelpCircle, CheckSquare, Lightbulb, Play, AlertTriangle, MessageSquare } from 'lucide-react';
import type { TrainingModuleContent, TrainingDownload, TrainingWorkbookItem, TrainingCertReq, TrainingCertProgress } from '@/hooks/useSDCTraining';

interface Props {
  modules: TrainingModuleContent[];
  downloads: TrainingDownload[];
  workbookItems: TrainingWorkbookItem[];
  certRequirements: TrainingCertReq[];
  certProgress: TrainingCertProgress[];
}

const statusColor: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  published: 'bg-success/10 text-success',
  active: 'bg-success/10 text-success',
  archived: 'bg-destructive/10 text-destructive',
};

function JsonList({ items }: { items: any }) {
  const arr = Array.isArray(items) ? items : [];
  if (arr.length === 0) return null;
  return (
    <ul className="space-y-1">
      {arr.map((item, i) => (
        <li key={i} className="text-sm flex items-start gap-2">
          <span className="text-primary mt-0.5">•</span>
          <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
        </li>
      ))}
    </ul>
  );
}

export function ModulesTab({ modules, downloads, workbookItems, certRequirements, certProgress }: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = modules.find(m => m.module_key === selectedKey);

  if (modules.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No SDC Modules Yet</h3>
        <p className="text-muted-foreground mt-1">Training modules will appear here once created.</p>
      </div>
    );
  }

  // Detail view
  if (selected) {
    const modDownloads = downloads.filter(d => d.module_key === selected.module_key);
    const modWorkbook = workbookItems.filter(w => w.module_key === selected.module_key).sort((a, b) => a.sort_order - b.sort_order);
    const modCertReqs = certRequirements.filter(r => r.module_key === selected.module_key);
    const modIdx = modules.indexOf(selected);

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedKey(null)} className="print:hidden">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Modules
        </Button>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                  {modIdx + 1}
                </div>
                <h2 className="text-xl font-bold text-foreground">{selected.title}</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{selected.estimated_minutes} min</span>
                <Badge className={statusColor[selected.status] || statusColor.draft}>{selected.status}</Badge>
              </div>
            </div>

            {selected.overview && (
              <section>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground"><Target className="w-4 h-4 text-accent" /> Overview</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{selected.overview}</p>
              </section>
            )}

            <section>
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground"><CheckCircle2 className="w-4 h-4 text-success" /> Learning Objectives</h4>
              <JsonList items={selected.learning_objectives} />
            </section>

            <section>
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground"><Lightbulb className="w-4 h-4 text-warning" /> Key Takeaways</h4>
              <JsonList items={selected.key_takeaways} />
            </section>

            {/* Workbook Items */}
            {modWorkbook.length > 0 && (
              <section>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground"><PenTool className="w-4 h-4 text-accent" /> Workbook Activities</h4>
                <div className="space-y-2">
                  {modWorkbook.map(item => (
                    <div key={item.id} className="p-3 rounded-lg border flex items-start gap-3">
                      <Badge variant="secondary" className="text-xs mt-0.5">{item.item_type}</Badge>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        {item.instructions && <p className="text-xs text-muted-foreground">{item.instructions}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Downloads */}
            {modDownloads.length > 0 && (
              <section>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground"><Download className="w-4 h-4 text-accent" /> Downloads</h4>
                <div className="space-y-2">
                  {modDownloads.map(d => (
                    <div key={d.id} className="p-3 rounded-lg border flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{d.title}</p>
                        {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
                      </div>
                      {d.file_url ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="w-3 h-3 mr-1" /> Get
                          </a>
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Cert Requirements */}
            {modCertReqs.length > 0 && (
              <section>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground"><ShieldCheck className="w-4 h-4 text-accent" /> Certification Requirements</h4>
                <div className="space-y-2">
                  {modCertReqs.map(req => {
                    const done = certProgress.some(p => p.module_key === req.module_key && p.requirement_type === req.requirement_type && ['completed', 'approved'].includes(p.status));
                    return (
                      <div key={req.id} className="p-3 rounded-lg border flex items-center gap-3">
                        {done ? <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                        <div>
                          <p className="text-sm font-medium text-foreground">{req.title}</p>
                          <Badge variant="secondary" className="text-xs">{req.requirement_type}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Grid view
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Training Modules</h2>
        <p className="text-sm text-muted-foreground">Click a module for full details</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod, idx) => {
          const wbCount = workbookItems.filter(w => w.module_key === mod.module_key).length;
          const dlCount = downloads.filter(d => d.module_key === mod.module_key).length;
          return (
            <Card
              key={mod.module_key}
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
              onClick={() => setSelectedKey(mod.module_key)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                    {idx + 1}
                  </div>
                  <Badge className={statusColor[mod.status] || statusColor.draft}>{mod.status}</Badge>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{mod.title}</h3>
                {mod.overview && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{mod.overview}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{mod.estimated_minutes} min</span>
                  {wbCount > 0 && <span className="flex items-center gap-1"><PenTool className="w-3 h-3" />{wbCount} activities</span>}
                  {dlCount > 0 && <span className="flex items-center gap-1"><Download className="w-3 h-3" />{dlCount} files</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
