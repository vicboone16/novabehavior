import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, X, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurriculumItems, useDomains } from '@/hooks/useCurriculum';
import type { CurriculumItem, MilestoneScore } from '@/types/curriculum';

interface AssessmentUploadMapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curriculumSystemId: string;
  existingScores: Record<string, MilestoneScore>;
  onScoresExtracted: (scores: Record<string, MilestoneScore>) => void;
}

interface ExtractedScore {
  code: string;
  title: string;
  score: number;
  confidence: number;
  matchedItemId?: string;
}

export function AssessmentUploadMapper({
  open,
  onOpenChange,
  curriculumSystemId,
  existingScores,
  onScoresExtracted,
}: AssessmentUploadMapperProps) {
  const { items: curriculumItems } = useCurriculumItems(curriculumSystemId);
  const { domains } = useDomains();

  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [extractedScores, setExtractedScores] = useState<ExtractedScore[]>([]);
  const [step, setStep] = useState<'upload' | 'review' | 'confirm'>('upload');
  const [manualText, setManualText] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf' && 
        !selectedFile.type.includes('image') &&
        !selectedFile.name.endsWith('.txt')) {
      toast.error('Please upload a PDF, image, or text file');
      return;
    }

    setFile(selectedFile);
  };

  const extractFromFile = async () => {
    if (!file) return;

    setProcessing(true);
    try {
      // For text files, read directly
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const text = await file.text();
        setExtractedText(text);
        await parseAndMatchScores(text);
        return;
      }

      // For PDFs/images, use document extraction edge function
      const formData = new FormData();
      formData.append('file', file);

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-document`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to extract document');
      }

      const result = await response.json();
      setExtractedText(result.text || '');
      await parseAndMatchScores(result.text || '');
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error('Failed to extract document. Try manual entry.');
      // Allow manual entry fallback
      setStep('review');
    } finally {
      setProcessing(false);
    }
  };

  const parseAndMatchScores = async (text: string) => {
    const scores: ExtractedScore[] = [];

    // Pattern matching for common VB-MAPP formats
    // e.g., "M-1: 1", "Mand 1 - Score: 0.5", "TACT-5: ½"
    const patterns = [
      /([A-Z]{1,4})-?(\d{1,2})[\s:]+(\d\.?\d?|½)/gi,
      /([A-Za-z]+)\s*(\d{1,2})\s*[-:]\s*(?:Score:?\s*)?(\d\.?\d?|½)/gi,
      /([A-Z]{1,4})\s*(\d{1,2})\s*=\s*(\d\.?\d?|½)/gi,
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const [, prefix, num, scoreStr] = match;
        const code = `${prefix.toUpperCase()}-${num}`;
        let score = scoreStr === '½' ? 0.5 : parseFloat(scoreStr);
        
        // Clamp score to valid range
        if (score > 1) score = 1;
        if (score < 0) score = 0;

        // Try to match to curriculum item
        const matchedItem = curriculumItems.find(item => 
          item.code?.toUpperCase() === code ||
          item.code?.toUpperCase().includes(prefix.toUpperCase()) && 
          item.code?.includes(num)
        );

        scores.push({
          code,
          title: matchedItem?.title || 'Unknown',
          score,
          confidence: matchedItem ? 0.9 : 0.5,
          matchedItemId: matchedItem?.id,
        });
      }
    });

    // Deduplicate by code
    const unique = scores.reduce((acc, curr) => {
      const existing = acc.find(s => s.code === curr.code);
      if (!existing || curr.confidence > existing.confidence) {
        return [...acc.filter(s => s.code !== curr.code), curr];
      }
      return acc;
    }, [] as ExtractedScore[]);

    setExtractedScores(unique);
    setStep('review');
  };

  const processManualText = async () => {
    if (!manualText.trim()) {
      toast.error('Please enter some text to process');
      return;
    }
    setProcessing(true);
    await parseAndMatchScores(manualText);
    setProcessing(false);
  };

  const updateExtractedScore = (index: number, updates: Partial<ExtractedScore>) => {
    setExtractedScores(prev => 
      prev.map((s, i) => i === index ? { ...s, ...updates } : s)
    );
  };

  const removeExtractedScore = (index: number) => {
    setExtractedScores(prev => prev.filter((_, i) => i !== index));
  };

  const matchToItem = (index: number, itemId: string) => {
    const item = curriculumItems.find(i => i.id === itemId);
    if (item) {
      updateExtractedScore(index, {
        matchedItemId: itemId,
        title: item.title,
        code: item.code || '',
        confidence: 1,
      });
    }
  };

  const confirmAndApply = () => {
    const newScores: Record<string, MilestoneScore> = { ...existingScores };

    extractedScores.forEach(es => {
      if (es.matchedItemId) {
        newScores[es.matchedItemId] = {
          score: es.score,
          date_scored: new Date().toISOString(),
          notes: `Imported from document upload`,
        };
      }
    });

    onScoresExtracted(newScores);
    toast.success(`Applied ${extractedScores.filter(s => s.matchedItemId).length} scores`);
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setExtractedText('');
    setExtractedScores([]);
    setManualText('');
    setStep('upload');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Assessment & Map Scores
          </DialogTitle>
          <DialogDescription>
            Upload a completed assessment form (PDF/image/text) to automatically extract and map scores to curriculum items.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            {/* File Upload */}
            <div className="space-y-3">
              <Label>Upload Assessment Document</Label>
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">{file.name}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, PNG, JPG, or TXT (max 10MB)
                    </p>
                  </>
                )}
              </div>

              {file && (
                <Button onClick={extractFromFile} disabled={processing} className="w-full">
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Extract Scores
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or paste text</span>
              </div>
            </div>

            {/* Manual Text Entry */}
            <div className="space-y-3">
              <Label>Paste Assessment Text</Label>
              <Textarea
                placeholder="Paste assessment scores here, e.g.:&#10;M-1: 1&#10;M-2: 0.5&#10;TACT-1: 0"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                rows={6}
              />
              <Button 
                onClick={processManualText} 
                disabled={processing || !manualText.trim()}
                variant="outline"
                className="w-full"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Parse Text
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            {extractedScores.length === 0 ? (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="py-6 text-center">
                  <AlertCircle className="w-10 h-10 mx-auto text-yellow-600 mb-3" />
                  <h4 className="font-medium">No Scores Detected</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    We couldn't automatically detect scores from the uploaded document.
                    Try pasting the text manually or ensure the document contains standard score formats.
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => setStep('upload')}>
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    {extractedScores.length} scores detected
                  </Badge>
                  <Badge variant="outline" className="text-green-600">
                    {extractedScores.filter(s => s.matchedItemId).length} matched
                  </Badge>
                </div>

                <ScrollArea className="h-[400px] border rounded-lg">
                  <div className="p-3 space-y-2">
                    {extractedScores.map((es, idx) => (
                      <Card key={idx} className={es.matchedItemId ? 'border-green-200' : 'border-yellow-200'}>
                        <CardContent className="py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{es.code}</Badge>
                                <span className="text-sm font-medium truncate">{es.title}</span>
                                {es.matchedItemId ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0" />
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Confidence: {Math.round(es.confidence * 100)}%
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Score selector */}
                              <Select 
                                value={String(es.score)} 
                                onValueChange={(v) => updateExtractedScore(idx, { score: parseFloat(v) })}
                              >
                                <SelectTrigger className="w-[70px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">0</SelectItem>
                                  <SelectItem value="0.5">½</SelectItem>
                                  <SelectItem value="1">1</SelectItem>
                                </SelectContent>
                              </Select>

                              {/* Item matcher */}
                              {!es.matchedItemId && (
                                <Select onValueChange={(v) => matchToItem(idx, v)}>
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Match to item..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {curriculumItems.slice(0, 50).map(item => (
                                      <SelectItem key={item.id} value={item.id}>
                                        {item.code} - {item.title.slice(0, 30)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}

                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => removeExtractedScore(idx)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setStep('upload')}>
                    Back
                  </Button>
                  <Button 
                    onClick={confirmAndApply}
                    disabled={extractedScores.filter(s => s.matchedItemId).length === 0}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Apply {extractedScores.filter(s => s.matchedItemId).length} Scores
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
