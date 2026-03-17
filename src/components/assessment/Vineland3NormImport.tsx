import { useState, useCallback, useRef } from 'react';
import {
  Upload, FileSpreadsheet, AlertTriangle, CheckCircle2,
  Loader2, X, Download, RefreshCw, Trash2, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Valid keys for validation
const VALID_FORM_KEYS = ['comprehensive_interview', 'parent_caregiver', 'teacher', 'maladaptive_optional'];
const VALID_DOMAIN_KEYS = ['communication', 'daily_living_skills', 'socialization', 'motor_skills', 'maladaptive_behavior'];
const VALID_SUBDOMAIN_KEYS = [
  'receptive', 'expressive', 'written',
  'personal', 'domestic', 'community',
  'interpersonal_relationships', 'play_and_leisure', 'coping_skills',
  'gross_motor', 'fine_motor',
  'internalizing', 'externalizing', 'critical_items',
];
const DOMAIN_SUBDOMAIN_MAP: Record<string, string[]> = {
  communication: ['receptive', 'expressive', 'written'],
  daily_living_skills: ['personal', 'domestic', 'community'],
  socialization: ['interpersonal_relationships', 'play_and_leisure', 'coping_skills'],
  motor_skills: ['gross_motor', 'fine_motor'],
  maladaptive_behavior: ['internalizing', 'externalizing', 'critical_items'],
};

type ImportType = 'subdomain' | 'domain' | 'composite';
type ConflictMode = 'skip' | 'overwrite' | 'version';

interface ParsedRow {
  rowNum: number;
  data: Record<string, string>;
  errors: string[];
  valid: boolean;
}

interface ImportState {
  file: File | null;
  importType: ImportType;
  conflictMode: ConflictMode;
  parsedRows: ParsedRow[];
  totalValid: number;
  totalErrors: number;
  importing: boolean;
  imported: boolean;
  importedCount: number;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}

function validateSubdomainRow(row: Record<string, string>, rowNum: number): ParsedRow {
  const errors: string[] = [];
  if (!VALID_FORM_KEYS.includes(row.form_key)) errors.push(`Invalid form_key: "${row.form_key}"`);
  if (!row.age_band_key) errors.push('Missing age_band_key');
  if (!VALID_DOMAIN_KEYS.includes(row.domain_key)) errors.push(`Invalid domain_key: "${row.domain_key}"`);
  if (!VALID_SUBDOMAIN_KEYS.includes(row.subdomain_key)) errors.push(`Invalid subdomain_key: "${row.subdomain_key}"`);
  if (row.domain_key && row.subdomain_key && DOMAIN_SUBDOMAIN_MAP[row.domain_key] && !DOMAIN_SUBDOMAIN_MAP[row.domain_key].includes(row.subdomain_key)) {
    errors.push(`subdomain "${row.subdomain_key}" does not belong to domain "${row.domain_key}"`);
  }
  if (!row.raw_score || isNaN(Number(row.raw_score))) errors.push('raw_score must be numeric');
  if (row.v_scale_score && isNaN(Number(row.v_scale_score))) errors.push('v_scale_score must be numeric');
  if (!row.source_version) errors.push('Missing source_version');
  return { rowNum, data: row, errors, valid: errors.length === 0 };
}

function validateDomainRow(row: Record<string, string>, rowNum: number): ParsedRow {
  const errors: string[] = [];
  if (!VALID_FORM_KEYS.includes(row.form_key)) errors.push(`Invalid form_key: "${row.form_key}"`);
  if (!row.age_band_key) errors.push('Missing age_band_key');
  if (!VALID_DOMAIN_KEYS.includes(row.domain_key)) errors.push(`Invalid domain_key: "${row.domain_key}"`);
  const sumKey = row.vscale_sum_or_lookup_key || row.vscale_sum;
  if (!sumKey || isNaN(Number(sumKey))) errors.push('vscale_sum must be numeric');
  if (!row.standard_score || isNaN(Number(row.standard_score))) errors.push('standard_score must be numeric');
  if (!row.percentile || isNaN(Number(row.percentile))) errors.push('percentile must be numeric');
  if (!row.adaptive_level) errors.push('Missing adaptive_level');
  if (!row.source_version) errors.push('Missing source_version');
  return { rowNum, data: { ...row, vscale_sum: sumKey || '' }, errors, valid: errors.length === 0 };
}

function validateCompositeRow(row: Record<string, string>, rowNum: number): ParsedRow {
  const errors: string[] = [];
  if (!VALID_FORM_KEYS.includes(row.form_key)) errors.push(`Invalid form_key: "${row.form_key}"`);
  if (!row.age_band_key) errors.push('Missing age_band_key');
  if (!row.composite_key) errors.push('Missing composite_key');
  if (!row.lookup_key || isNaN(Number(row.lookup_key))) errors.push('lookup_key must be numeric');
  if (!row.standard_score || isNaN(Number(row.standard_score))) errors.push('standard_score must be numeric');
  if (!row.percentile || isNaN(Number(row.percentile))) errors.push('percentile must be numeric');
  if (!row.source_version) errors.push('Missing source_version');
  return { rowNum, data: row, errors, valid: errors.length === 0 };
}

const IMPORT_TYPE_LABELS: Record<ImportType, string> = {
  subdomain: 'Subdomain Norms (raw→v-scale/AE/GSV)',
  domain: 'Domain Norms (v-scale sum→standard score)',
  composite: 'Composite Norms (lookup→standard score)',
};

const REQUIRED_COLUMNS: Record<ImportType, string[]> = {
  subdomain: ['form_key', 'age_band_key', 'domain_key', 'subdomain_key', 'raw_score', 'v_scale_score', 'source_version'],
  domain: ['form_key', 'age_band_key', 'domain_key', 'standard_score', 'percentile', 'adaptive_level', 'source_version'],
  composite: ['form_key', 'age_band_key', 'composite_key', 'lookup_key', 'standard_score', 'percentile', 'source_version'],
};

export function Vineland3NormImport() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ImportState>({
    file: null,
    importType: 'subdomain',
    conflictMode: 'skip',
    parsedRows: [],
    totalValid: 0,
    totalErrors: 0,
    importing: false,
    imported: false,
    importedCount: 0,
  });
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from('vineland3_norm_import_history')
      .select('*')
      .order('imported_at', { ascending: false })
      .limit(50);
    setImportHistory((data || []) as any[]);
    setHistoryLoaded(true);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);

      // Check required columns
      if (rows.length > 0) {
        const cols = Object.keys(rows[0]);
        const missing = REQUIRED_COLUMNS[state.importType].filter(c => !cols.includes(c) && !cols.includes(c.replace('vscale_sum_or_lookup_key', 'vscale_sum')));
        if (missing.length > 0) {
          toast.error(`Missing columns: ${missing.join(', ')}`);
          return;
        }
      }

      const validator = state.importType === 'subdomain' ? validateSubdomainRow
        : state.importType === 'domain' ? validateDomainRow
        : validateCompositeRow;

      const parsed = rows.map((r, i) => validator(r, i + 2));
      const totalValid = parsed.filter(p => p.valid).length;
      const totalErrors = parsed.filter(p => !p.valid).length;

      setState(prev => ({
        ...prev,
        file,
        parsedRows: parsed,
        totalValid,
        totalErrors,
        imported: false,
        importedCount: 0,
      }));
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setConfirmOpen(false);
    setState(prev => ({ ...prev, importing: true }));

    const validRows = state.parsedRows.filter(r => r.valid);
    let importedCount = 0;

    try {
      if (state.importType === 'subdomain') {
        const rows = validRows.map(r => ({
          form_key: r.data.form_key,
          age_band_key: r.data.age_band_key,
          subdomain_key: r.data.subdomain_key,
          raw_score: parseInt(r.data.raw_score),
          v_scale_score: r.data.v_scale_score ? parseInt(r.data.v_scale_score) : null,
          age_equivalent: r.data.age_equivalent || null,
          gsv: r.data.gsv ? parseInt(r.data.gsv) : null,
          adaptive_level: r.data.adaptive_level_optional || r.data.adaptive_level || null,
          source_version: r.data.source_version,
          is_active: r.data.is_active !== 'false',
        }));

        // Batch insert in chunks of 100
        for (let i = 0; i < rows.length; i += 100) {
          const chunk = rows.slice(i, i + 100);
          const { error } = await supabase.from('vineland3_norm_lookup_subdomains').insert(chunk as any);
          if (error) {
            if (state.conflictMode === 'skip') {
              // Try one by one
              for (const row of chunk) {
                const { error: e2 } = await supabase.from('vineland3_norm_lookup_subdomains').insert(row as any);
                if (!e2) importedCount++;
              }
            } else {
              throw error;
            }
          } else {
            importedCount += chunk.length;
          }
        }
      } else if (state.importType === 'domain') {
        const rows = validRows.map(r => ({
          form_key: r.data.form_key,
          age_band_key: r.data.age_band_key,
          domain_key: r.data.domain_key,
          vscale_sum: parseInt(r.data.vscale_sum || r.data.vscale_sum_or_lookup_key),
          standard_score: parseInt(r.data.standard_score),
          percentile: parseInt(r.data.percentile),
          adaptive_level: r.data.adaptive_level || null,
          source_version: r.data.source_version,
          is_active: r.data.is_active !== 'false',
        }));

        for (let i = 0; i < rows.length; i += 100) {
          const chunk = rows.slice(i, i + 100);
          const { error } = await supabase.from('vineland3_norm_lookup_domains').insert(chunk as any);
          if (error) {
            if (state.conflictMode === 'skip') {
              for (const row of chunk) {
                const { error: e2 } = await supabase.from('vineland3_norm_lookup_domains').insert(row as any);
                if (!e2) importedCount++;
              }
            } else throw error;
          } else importedCount += chunk.length;
        }
      } else {
        const rows = validRows.map(r => ({
          form_key: r.data.form_key,
          age_band_key: r.data.age_band_key,
          composite_key: r.data.composite_key,
          lookup_key: parseInt(r.data.lookup_key),
          standard_score: parseInt(r.data.standard_score),
          percentile: parseInt(r.data.percentile),
          adaptive_level: r.data.adaptive_level || null,
          source_version: r.data.source_version,
          is_active: r.data.is_active !== 'false',
        }));

        for (let i = 0; i < rows.length; i += 100) {
          const chunk = rows.slice(i, i + 100);
          const { error } = await supabase.from('vineland3_norm_lookup_composites').insert(chunk as any);
          if (error) {
            if (state.conflictMode === 'skip') {
              for (const row of chunk) {
                const { error: e2 } = await supabase.from('vineland3_norm_lookup_composites').insert(row as any);
                if (!e2) importedCount++;
              }
            } else throw error;
          } else importedCount += chunk.length;
        }
      }

      // Log import history
      const sourceVersion = validRows[0]?.data.source_version || 'unknown';
      await supabase.from('vineland3_norm_import_history').insert({
        import_type: state.importType,
        source_version: sourceVersion,
        row_count: importedCount,
        status: 'completed',
        imported_by: user?.id,
      } as any);

      setState(prev => ({ ...prev, imported: true, importedCount }));
      toast.success(`Imported ${importedCount} rows`);
      loadHistory();
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setState(prev => ({ ...prev, importing: false }));
    }
  };

  const resetForm = () => {
    setState({
      file: null,
      importType: state.importType,
      conflictMode: 'skip',
      parsedRows: [],
      totalValid: 0,
      totalErrors: 0,
      importing: false,
      imported: false,
      importedCount: 0,
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  const errorRows = state.parsedRows.filter(r => !r.valid);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Vineland-3 Norm Import</h3>
        <Badge variant="outline" className="text-xs">Admin Only</Badge>
      </div>

      <Card className="bg-accent/30 border-accent">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Import norm lookup CSV files to enable derived scoring. Each CSV must match the expected column schema. 
              Rows are validated before import. Use source versioning to track data provenance.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="import" onValueChange={(v) => { if (v === 'history' && !historyLoaded) loadHistory(); }}>
        <TabsList>
          <TabsTrigger value="import" className="text-xs gap-1">
            <Upload className="w-3 h-3" /> Import
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1">
            <RefreshCw className="w-3 h-3" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Import Type</Label>
              <Select
                value={state.importType}
                onValueChange={(v: ImportType) => { setState(prev => ({ ...prev, importType: v })); resetForm(); }}
              >
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(IMPORT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Conflict Handling</Label>
              <Select
                value={state.conflictMode}
                onValueChange={(v: ConflictMode) => setState(prev => ({ ...prev, conflictMode: v }))}
              >
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip" className="text-xs">Skip duplicates</SelectItem>
                  <SelectItem value="overwrite" className="text-xs">Overwrite existing</SelectItem>
                  <SelectItem value="version" className="text-xs">Import as new version</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">CSV File</Label>
              <Input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="text-xs"
              />
            </div>
          </div>

          {/* Required columns hint */}
          <div className="text-xs text-muted-foreground">
            Required columns: <code className="bg-muted px-1 py-0.5 rounded">{REQUIRED_COLUMNS[state.importType].join(', ')}</code>
          </div>

          {/* Validation Summary */}
          {state.parsedRows.length > 0 && (
            <Card>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{state.totalValid} valid</span>
                    </div>
                    {state.totalErrors > 0 && (
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <span className="text-sm font-medium text-destructive">{state.totalErrors} errors</span>
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {state.parsedRows.length} total rows from {state.file?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={resetForm} className="text-xs">
                      <X className="w-3 h-3 mr-1" /> Clear
                    </Button>
                    {state.totalValid > 0 && !state.imported && (
                      <Button
                        size="sm"
                        onClick={() => setConfirmOpen(true)}
                        disabled={state.importing}
                        className="text-xs"
                      >
                        {state.importing ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Importing...</>
                        ) : (
                          <><Upload className="w-3 h-3 mr-1" /> Import {state.totalValid} Rows</>
                        )}
                      </Button>
                    )}
                    {state.imported && (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> {state.importedCount} imported
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Detail */}
          {errorRows.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader className="py-2 px-4">
                <CardTitle className="text-xs text-destructive">Validation Errors</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-1">
                    {errorRows.slice(0, 50).map(r => (
                      <div key={r.rowNum} className="text-xs flex gap-2 py-0.5 border-b border-border/50">
                        <span className="text-muted-foreground font-mono shrink-0">Row {r.rowNum}</span>
                        <span className="text-destructive">{r.errors.join('; ')}</span>
                      </div>
                    ))}
                    {errorRows.length > 50 && (
                      <p className="text-xs text-muted-foreground pt-1">
                        ...and {errorRows.length - 50} more errors
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Preview Table */}
          {state.parsedRows.length > 0 && (
            <Card>
              <CardHeader className="py-2 px-4">
                <CardTitle className="text-xs">Preview (first 20 valid rows)</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <ScrollArea className="max-h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-12">#</TableHead>
                        {REQUIRED_COLUMNS[state.importType].map(col => (
                          <TableHead key={col} className="text-xs">{col}</TableHead>
                        ))}
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {state.parsedRows.filter(r => r.valid).slice(0, 20).map(r => (
                        <TableRow key={r.rowNum}>
                          <TableCell className="text-xs font-mono">{r.rowNum}</TableCell>
                          {REQUIRED_COLUMNS[state.importType].map(col => (
                            <TableCell key={col} className="text-xs">{r.data[col] || '—'}</TableCell>
                          ))}
                          <TableCell>
                            <CheckCircle2 className="w-3 h-3 text-primary" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {importHistory.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <RefreshCw className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No import history yet.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-3">
                <ScrollArea className="max-h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Version</TableHead>
                        <TableHead className="text-xs">Rows</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importHistory.map((h: any) => (
                        <TableRow key={h.id}>
                          <TableCell className="text-xs">{h.import_type}</TableCell>
                          <TableCell className="text-xs font-mono">{h.source_version}</TableCell>
                          <TableCell className="text-xs">{h.row_count}</TableCell>
                          <TableCell>
                            <Badge variant="default" className="text-xs">{h.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {new Date(h.imported_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Import</AlertDialogTitle>
            <AlertDialogDescription>
              Import <strong>{state.totalValid}</strong> valid {state.importType} norm rows?
              {state.totalErrors > 0 && ` (${state.totalErrors} invalid rows will be skipped.)`}
              {state.conflictMode === 'overwrite' && ' Existing matching records will be overwritten.'}
              {state.conflictMode === 'skip' && ' Duplicate records will be skipped.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport}>Import</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
