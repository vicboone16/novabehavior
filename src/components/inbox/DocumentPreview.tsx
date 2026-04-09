import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  X, 
  Download, 
  User, 
  Search,
  CheckCircle2,
  Archive,
  Trash2,
  ExternalLink,
  Clock,
  Sparkles,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface InboxDocument {
  id: string;
  received_at: string;
  source_type: string;
  sender_info?: string;
  subject_line?: string;
  raw_content_url?: string;
  extracted_text?: string;
  ai_suggested_student_id?: string;
  ai_confidence_score?: number;
  ai_suggested_document_type?: string;
  assigned_student_id?: string;
  assigned_referral_id?: string;
  document_type?: string;
  status: string;
  processed_by?: string;
  processed_at?: string;
  notes?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
}

interface Student {
  id: string;
  name: string;
}

interface DocumentPreviewProps {
  document: InboxDocument | null;
  onUpdate: () => void;
  onClose: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'authorization', label: 'Authorization' },
  { value: 'medical_record', label: 'Medical Record' },
  { value: 'consent', label: 'Consent Form' },
  { value: 'eval', label: 'Evaluation' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'lab_results', label: 'Lab Results' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'other', label: 'Other' }
];

export function DocumentPreview({ document, onUpdate, onClose }: DocumentPreviewProps) {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (document) {
      setSelectedStudentId(document.assigned_student_id || document.ai_suggested_student_id || '');
      setDocumentType(document.document_type || document.ai_suggested_document_type || '');
      setNotes(document.notes || '');
      loadPreview();
    }
  }, [document]);

  const loadStudents = async () => {
    try {
      const { data } = await (supabase as any)
        .from('students')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      if (data) setStudents(data);
    } catch (err) {
      console.error('Error loading students:', err);
    }
  };

  const loadPreview = async () => {
    if (!document?.raw_content_url) return;
    
    try {
      const { data } = await supabase.storage
        .from('inbox-documents')
        .createSignedUrl(document.raw_content_url, 3600);
      
      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl);
      }
    } catch (err) {
      console.error('Error loading preview:', err);
    }
  };

  const handleAssign = async () => {
    if (!document || !selectedStudentId) {
      toast.error('Please select a student');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('document_inbox')
        .update({
          assigned_student_id: selectedStudentId,
          document_type: documentType || null,
          notes: notes || null,
          status: 'matched',
          processed_by: user?.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', document.id);

      if (error) throw error;
      toast.success('Document assigned successfully');
      onUpdate();
    } catch (err) {
      console.error('Error assigning document:', err);
      toast.error('Failed to assign document');
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async () => {
    if (!document) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('document_inbox')
        .update({
          status: 'filed',
          processed_by: user?.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', document.id);

      if (error) throw error;
      toast.success('Document filed');
      onUpdate();
    } catch (err) {
      console.error('Error filing document:', err);
      toast.error('Failed to file document');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!document) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('document_inbox')
        .update({
          status: 'archived',
          processed_by: user?.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', document.id);

      if (error) throw error;
      toast.success('Document archived');
      onUpdate();
    } catch (err) {
      console.error('Error archiving document:', err);
      toast.error('Failed to archive document');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  if (!document) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Select a document to preview</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="flex-row items-center justify-between py-3 border-b">
        <CardTitle className="text-base truncate flex-1">
          {document.subject_line || document.file_name || 'Document Preview'}
        </CardTitle>
        <div className="flex items-center gap-1">
          {previewUrl && (
            <Button variant="ghost" size="icon" asChild>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1">
        <CardContent className="py-4 space-y-6">
          {/* Document Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Source:</span>
              <span className="ml-2 font-medium capitalize">{document.source_type.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Received:</span>
              <span className="ml-2 font-medium">
                {format(new Date(document.received_at), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
            {document.sender_info && (
              <div className="col-span-2">
                <span className="text-muted-foreground">From:</span>
                <span className="ml-2 font-medium">{document.sender_info}</span>
              </div>
            )}
          </div>

          {/* AI Suggestions */}
          {document.ai_confidence_score && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">AI Suggestion</span>
                <Badge variant="outline">
                  {Math.round(document.ai_confidence_score * 100)}% confident
                </Badge>
              </div>
              {document.ai_suggested_document_type && (
                <p className="text-sm text-muted-foreground">
                  Document type: <strong className="text-foreground capitalize">
                    {document.ai_suggested_document_type.replace('_', ' ')}
                  </strong>
                </p>
              )}
            </div>
          )}

          {/* Extracted Text Preview */}
          {document.extracted_text && (
            <div>
              <Label className="text-sm">Extracted Text</Label>
              <div className="mt-1 p-3 rounded-lg bg-muted/50 text-sm max-h-32 overflow-y-auto">
                {document.extracted_text.slice(0, 500)}
                {document.extracted_text.length > 500 && '...'}
              </div>
            </div>
          )}

          {/* Assignment Form */}
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Assign to Student</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {studentSearch && (
                <div className="max-h-32 overflow-y-auto border rounded-lg">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => {
                        setSelectedStudentId(student.id);
                        setStudentSearch(student.name);
                      }}
                      className={`p-2 cursor-pointer hover:bg-muted ${
                        selectedStudentId === student.id ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {student.displayName || student.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this document..."
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </ScrollArea>

      {/* Actions */}
      <div className="p-4 border-t flex gap-2">
        <Button
          onClick={handleAssign}
          disabled={loading || !selectedStudentId}
          className="flex-1"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Assign & Match
        </Button>
        {document.status === 'matched' && (
          <Button variant="outline" onClick={handleFile} disabled={loading}>
            <FileText className="h-4 w-4 mr-2" />
            File
          </Button>
        )}
        <Button variant="outline" onClick={handleArchive} disabled={loading}>
          <Archive className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
