import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, File, FileText, Image, Trash2, Download, Plus, X } from 'lucide-react';
import { format } from 'date-fns';

interface StudentFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  description: string | null;
  created_at: string;
}

interface StudentFileManagerProps {
  studentId: string;
  studentName: string;
}

export function StudentFileManager({ studentId, studentName }: StudentFileManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<StudentFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState('');

  useEffect(() => {
    if (user) {
      loadFiles();
    }
  }, [user, studentId]);

  const loadFiles = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('student_files')
      .select('*')
      .eq('student_id', studentId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading files:', error);
      toast({ title: 'Failed to load files', variant: 'destructive' });
    } else {
      setFiles(data || []);
    }
    setIsLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Maximum file size is 10MB', variant: 'destructive' });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    
    try {
      // Upload to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${studentId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('student-files')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Save metadata
      const { error: dbError } = await supabase
        .from('student_files')
        .insert({
          user_id: user.id,
          student_id: studentId,
          file_name: selectedFile.name,
          file_path: filePath,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          description: fileDescription || null,
        });

      if (dbError) throw dbError;

      toast({ title: 'File uploaded successfully' });
      setShowUploadDialog(false);
      setSelectedFile(null);
      setFileDescription('');
      loadFiles();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    }
    
    setIsUploading(false);
  };

  const handleDelete = async (file: StudentFile) => {
    if (!user) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('student-files')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Delete metadata
      const { error: dbError } = await supabase
        .from('student_files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast({ title: 'File deleted' });
      loadFiles();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({ title: 'Failed to delete file', variant: 'destructive' });
    }
  };

  const handleDownload = async (file: StudentFile) => {
    try {
      // Try student-files bucket first
      let { data, error } = await supabase.storage
        .from('student-files')
        .download(file.file_path);

      // If not found in student-files, try student-documents bucket (for assessment docs)
      if (error) {
        const result = await supabase.storage
          .from('student-documents')
          .download(file.file_path);
        
        if (result.error) {
          throw result.error;
        }
        data = result.data;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Download error:', error);
      toast({ title: 'Failed to download file', variant: 'destructive' });
    }
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="w-5 h-5" />;
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5 text-primary" />;
    if (fileType.includes('pdf') || fileType.includes('document')) return <FileText className="w-5 h-5 text-destructive" />;
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Files & Documents</h3>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Upload File
        </Button>
      </div>

      {files.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No files uploaded yet.</p>
            <p className="text-sm">Upload documents, IEPs, or other files for {studentName}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {files.map((file) => (
            <Card key={file.id}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  {getFileIcon(file.file_type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.file_name}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>•</span>
                      <span>{format(new Date(file.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    {file.description && (
                      <p className="text-sm text-muted-foreground mt-1">{file.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(file)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(file)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File for {studentName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Select File</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {getFileIcon(selectedFile.type)}
                  <span>{selectedFile.name}</span>
                  <span>({formatFileSize(selectedFile.size)})</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Add a description for this file..."
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
                disabled={isUploading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
              {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
