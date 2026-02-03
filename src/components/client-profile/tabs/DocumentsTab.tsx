import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, Eye, Download, Trash2, Calendar, Lock, Users, School, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { ClientDocument } from '@/types/clientProfile';
import { DOCUMENT_TYPES } from '@/types/clientProfile';

interface DocumentsTabProps {
  clientId: string;
  documents: ClientDocument[];
  onRefetch: () => void;
}

const VISIBILITY_OPTIONS = [
  { value: 'internal_only', label: 'Internal Only', icon: Lock, description: 'Staff only' },
  { value: 'clinical_team', label: 'Clinical Team', icon: Users, description: 'All clinical staff' },
  { value: 'school_team', label: 'School Team', icon: School, description: 'School contacts can view' },
  { value: 'parent_shareable', label: 'Parent Shareable', icon: Home, description: 'Parents can view' },
];

export function DocumentsTab({ clientId, documents, onRefetch }: DocumentsTabProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    doc_type: '',
    title: '',
    description: '',
    visibility_permission: 'internal_only',
    school_year_tag: '',
    expiration_date: '',
    notes: '',
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.title) {
        setFormData({ ...formData, title: file.name.replace(/\.[^/.]+$/, '') });
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !formData.doc_type || !formData.title) {
      toast.error('File, document type, and title are required');
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${clientId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('client-documents')
        .getPublicUrl(fileName);

      // Create document record
      const { error: insertError } = await supabase.from('client_documents').insert({
        client_id: clientId,
        doc_type: formData.doc_type,
        title: formData.title,
        description: formData.description || null,
        visibility_permission: formData.visibility_permission,
        school_year_tag: formData.school_year_tag || null,
        expiration_date: formData.expiration_date || null,
        notes: formData.notes || null,
        file_url: publicUrl,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        mime_type: selectedFile.type,
        is_current_version: true,
        version_number: 1,
      });

      if (insertError) throw insertError;

      toast.success('Document uploaded');
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      setFormData({
        doc_type: '',
        title: '',
        description: '',
        visibility_permission: 'internal_only',
        school_year_tag: '',
        expiration_date: '',
        notes: '',
      });
      onRefetch();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const getVisibilityBadge = (visibility: string) => {
    const config = VISIBILITY_OPTIONS.find(v => v.value === visibility);
    const Icon = config?.icon || Lock;
    return (
      <Badge variant="outline" className="text-xs">
        <Icon className="h-3 w-3 mr-1" />
        {config?.label || visibility}
      </Badge>
    );
  };

  const getDocTypeIcon = (docType: string) => {
    return <FileText className="h-5 w-5 text-primary" />;
  };

  const groupedDocs = documents.reduce((acc, doc) => {
    const type = doc.doc_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<string, ClientDocument[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Documents</h3>
          <p className="text-sm text-muted-foreground">
            Manage client documents with visibility permissions
          </p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>File *</Label>
                <Input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                />
                {selectedFile && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Document Type *</Label>
                <Select
                  value={formData.doc_type}
                  onValueChange={(value) => setFormData({ ...formData, doc_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
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
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Document title"
                />
              </div>

              <div className="space-y-2">
                <Label>Visibility *</Label>
                <Select
                  value={formData.visibility_permission}
                  onValueChange={(value) => setFormData({ ...formData, visibility_permission: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIBILITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className="h-4 w-4" />
                          <span>{option.label}</span>
                          <span className="text-muted-foreground text-xs">- {option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>School Year</Label>
                  <Input
                    value={formData.school_year_tag}
                    onChange={(e) => setFormData({ ...formData, school_year_tag: e.target.value })}
                    placeholder="e.g., 2024-2025"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiration Date</Label>
                  <Input
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the document..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Document List by Type */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No documents uploaded yet. Click "Upload Document" to add files.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({documents.length})</TabsTrigger>
            {Object.entries(groupedDocs).slice(0, 4).map(([type, docs]) => (
              <TabsTrigger key={type} value={type}>
                {DOCUMENT_TYPES.find(t => t.value === type)?.label || type} ({docs.length})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="space-y-3">
              {documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getDocTypeIcon(doc.doc_type)}
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {DOCUMENT_TYPES.find(t => t.value === doc.doc_type)?.label || doc.doc_type}
                            </Badge>
                            {getVisibilityBadge(doc.visibility_permission)}
                            {doc.school_year_tag && (
                              <span className="text-xs text-muted-foreground">
                                {doc.school_year_tag}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {format(new Date(doc.upload_date), 'MMM d, yyyy')}
                        </span>
                        {doc.file_url && (
                          <>
                            <Button variant="ghost" size="sm" asChild>
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <a href={doc.file_url} download>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {Object.entries(groupedDocs).map(([type, docs]) => (
            <TabsContent key={type} value={type} className="mt-4">
              <div className="space-y-3">
                {docs.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getDocTypeIcon(doc.doc_type)}
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {getVisibilityBadge(doc.visibility_permission)}
                              {doc.description && (
                                <span className="text-xs text-muted-foreground">{doc.description}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(doc.upload_date), 'MMM d, yyyy')}
                          </span>
                          {doc.file_url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
