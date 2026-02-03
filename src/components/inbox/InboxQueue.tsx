import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Mail, 
  Phone, 
  Upload, 
  Clock, 
  User,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Archive
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

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

interface InboxQueueProps {
  documents: InboxDocument[];
  loading: boolean;
  selectedId?: string;
  onSelect: (doc: InboxDocument) => void;
  onRefresh: () => void;
}

export function InboxQueue({ documents, loading, selectedId, onSelect, onRefresh }: InboxQueueProps) {
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'fax': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      default: return <Upload className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unprocessed':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Unprocessed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Processing</Badge>;
      case 'matched':
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Matched</Badge>;
      case 'filed':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Filed</Badge>;
      case 'archived':
        return <Badge variant="secondary">Archived</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getConfidenceBadge = (score?: number) => {
    if (!score) return null;
    const percentage = Math.round(score * 100);
    if (percentage >= 80) {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{percentage}% match</Badge>;
    } else if (percentage >= 50) {
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{percentage}% match</Badge>;
    }
    return <Badge variant="outline">{percentage}% match</Badge>;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium mb-2">No Documents</h3>
          <p className="text-muted-foreground">
            Documents will appear here when received via fax, email, or upload
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <ScrollArea className="h-[600px]">
        <div className="divide-y">
          {documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => onSelect(doc)}
              className={cn(
                "p-4 cursor-pointer transition-colors hover:bg-muted/50",
                selectedId === doc.id && "bg-primary/5 border-l-2 border-l-primary"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  doc.source_type === 'fax' && "bg-blue-100 text-blue-700",
                  doc.source_type === 'email' && "bg-purple-100 text-purple-700",
                  doc.source_type === 'manual_upload' && "bg-muted text-muted-foreground"
                )}>
                  {getSourceIcon(doc.source_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">
                      {doc.subject_line || doc.file_name || 'Untitled Document'}
                    </span>
                    {getStatusBadge(doc.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {doc.sender_info && (
                      <span className="truncate">{doc.sender_info}</span>
                    )}
                    {doc.file_size && (
                      <>
                        <span>•</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(doc.received_at), { addSuffix: true })}
                    </span>
                    {doc.ai_confidence_score && getConfidenceBadge(doc.ai_confidence_score)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
