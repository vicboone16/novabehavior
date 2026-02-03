import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileJson, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BxImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BxImportDialog({ open, onOpenChange, onSuccess }: BxImportDialogProps) {
  const [importType, setImportType] = useState<'json' | 'csv'>('json');
  const [content, setContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);
  const { toast } = useToast();

  const handleImport = async () => {
    setImporting(true);
    setResults(null);

    try {
      let data: any[];
      
      if (importType === 'json') {
        data = JSON.parse(content);
        if (!Array.isArray(data)) {
          data = [data];
        }
      } else {
        // Simple CSV parsing
        const lines = content.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
        data = lines.slice(1).map(line => {
          const values = line.split(',');
          const obj: any = {};
          headers.forEach((h, i) => {
            obj[h] = values[i]?.trim() || '';
          });
          return obj;
        });
      }

      const { data: { user } } = await supabase.auth.getUser();
      const errors: string[] = [];
      let successCount = 0;

      for (const item of data) {
        // Generate problem code if not provided
        const problemCode = item.problem_code || `bx-${Date.now().toString().slice(-4)}`;
        
        const { error } = await supabase.from('bx_presenting_problems').insert({
          problem_code: problemCode,
          domain: item.domain || 'behavior_compliance_self_management',
          title: item.title || item.name,
          definition: item.definition || item.description,
          examples: item.examples ? (Array.isArray(item.examples) ? item.examples : [item.examples]) : [],
          risk_level: item.risk_level || 'medium',
          function_tags: item.function_tags ? (Array.isArray(item.function_tags) ? item.function_tags : item.function_tags.split(';')) : [],
          trigger_tags: item.trigger_tags ? (Array.isArray(item.trigger_tags) ? item.trigger_tags : item.trigger_tags.split(';')) : [],
          topics: item.topics ? (Array.isArray(item.topics) ? item.topics : item.topics.split(';')) : [],
          contraindications: item.contraindications ? (Array.isArray(item.contraindications) ? item.contraindications : [item.contraindications]) : [],
          source_origin: 'uploaded',
          source_title: item.source_title,
          created_by: user?.id,
        });

        if (error) {
          errors.push(`${item.title || item.name}: ${error.message}`);
        } else {
          successCount++;
        }
      }

      setResults({ success: successCount, errors });
      
      if (successCount > 0) {
        toast({ title: `Imported ${successCount} presenting problems` });
        onSuccess();
      }
    } catch (error: any) {
      setResults({ success: 0, errors: [error.message] });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setContent('');
    setResults(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Presenting Problems</DialogTitle>
          <DialogDescription>
            Import behavior data from JSON or CSV format
          </DialogDescription>
        </DialogHeader>

        <Tabs value={importType} onValueChange={(v) => setImportType(v as 'json' | 'csv')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="json" className="flex items-center gap-2">
              <FileJson className="w-4 h-4" />
              JSON
            </TabsTrigger>
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              CSV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="json" className="space-y-4">
            <div>
              <Label>JSON Data</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`[
  {
    "problem_code": "bx-001",
    "domain": "behavior_compliance_self_management",
    "title": "Noncompliance",
    "definition": "Failure to follow instructions...",
    "risk_level": "medium",
    "function_tags": ["escape", "attention"],
    "examples": ["Ignoring teacher requests"]
  }
]`}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          </TabsContent>

          <TabsContent value="csv" className="space-y-4">
            <div>
              <Label>CSV Data</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`problem_code,domain,title,definition,risk_level,function_tags
bx-001,behavior_compliance_self_management,Noncompliance,Failure to follow...,medium,escape;attention`}
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use semicolons (;) to separate multiple values in array fields
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {results && (
          <Alert variant={results.errors.length > 0 ? "destructive" : "default"}>
            {results.errors.length > 0 ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <AlertDescription>
              <p>Imported {results.success} items successfully.</p>
              {results.errors.length > 0 && (
                <ul className="mt-2 text-sm list-disc list-inside">
                  {results.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {results.errors.length > 5 && (
                    <li>...and {results.errors.length - 5} more errors</li>
                  )}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!content.trim() || importing}>
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
