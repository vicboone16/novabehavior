import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Inbox, 
  Search, 
  Filter, 
  Upload, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Archive,
  Loader2,
  RefreshCw,
  Mail,
  Phone,
  User,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { InboxQueue } from '@/components/inbox/InboxQueue';
import { DocumentPreview } from '@/components/inbox/DocumentPreview';
import { InboxSettings } from '@/components/inbox/InboxSettings';
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

export default function DocumentInbox() {
  const { userRole } = useAuth();
  const [documents, setDocuments] = useState<InboxDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<InboxDocument | null>(null);
  const [activeTab, setActiveTab] = useState('queue');
  const [statusFilter, setStatusFilter] = useState<string>('unprocessed');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('document_inbox')
        .select('*')
        .order('received_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (sourceFilter !== 'all') {
        query = query.eq('source_type', sourceFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error loading inbox:', err);
      toast.error('Failed to load document inbox');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      try {
        // Upload to storage
        const fileName = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('inbox-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Create inbox record
        const { error: insertError } = await supabase
          .from('document_inbox')
          .insert({
            source_type: 'manual_upload',
            sender_info: 'Manual Upload',
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            raw_content_url: fileName,
            status: 'unprocessed'
          });

        if (insertError) throw insertError;
        toast.success(`Uploaded: ${file.name}`);
      } catch (err) {
        console.error('Upload error:', err);
        toast.error(`Failed to upload: ${file.name}`);
      }
    }
    loadDocuments();
  };

  const handleFileInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.jpg,.jpeg,.png,.tiff,.doc,.docx';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) handleUpload(files);
    };
    input.click();
  };

  const getStatusCounts = () => {
    const counts = {
      unprocessed: 0,
      processing: 0,
      matched: 0,
      filed: 0,
      archived: 0
    };
    documents.forEach(doc => {
      if (counts.hasOwnProperty(doc.status)) {
        counts[doc.status as keyof typeof counts]++;
      }
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  const filteredDocuments = documents.filter(doc => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      doc.sender_info?.toLowerCase().includes(query) ||
      doc.subject_line?.toLowerCase().includes(query) ||
      doc.file_name?.toLowerCase().includes(query) ||
      doc.extracted_text?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Inbox className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Document Inbox</h1>
                <p className="text-sm text-muted-foreground">
                  Receive and route faxes, emails, and uploads
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadDocuments}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button size="sm" onClick={handleFileInput}>
                <Upload className="h-4 w-4 mr-1" />
                Upload
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-6">
        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card 
            className={`cursor-pointer transition-colors ${statusFilter === 'unprocessed' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter('unprocessed')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{statusCounts.unprocessed}</p>
                  <p className="text-sm text-muted-foreground">Unprocessed</p>
                </div>
                <AlertCircle className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-colors ${statusFilter === 'processing' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter('processing')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{statusCounts.processing}</p>
                  <p className="text-sm text-muted-foreground">Processing</p>
                </div>
                <Loader2 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-colors ${statusFilter === 'matched' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter('matched')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{statusCounts.matched}</p>
                  <p className="text-sm text-muted-foreground">Matched</p>
                </div>
                <User className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-colors ${statusFilter === 'filed' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter('filed')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{statusCounts.filed}</p>
                  <p className="text-sm text-muted-foreground">Filed</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-colors ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{documents.length}</p>
                  <p className="text-sm text-muted-foreground">All</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="queue">Document Queue</TabsTrigger>
              <TabsTrigger value="settings">Inbox Settings</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="fax">Fax</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="manual_upload">Uploads</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="queue" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Document List */}
              <InboxQueue
                documents={filteredDocuments}
                loading={loading}
                selectedId={selectedDocument?.id}
                onSelect={setSelectedDocument}
                onRefresh={loadDocuments}
              />

              {/* Preview Panel */}
              <DocumentPreview
                document={selectedDocument}
                onUpdate={loadDocuments}
                onClose={() => setSelectedDocument(null)}
              />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <InboxSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
