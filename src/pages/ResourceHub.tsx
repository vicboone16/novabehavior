import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Upload, Search, FolderOpen, FileText, Image, Video, Music, File, 
  Trash2, Pin, PinOff, Download, Grid, List, Tag, Filter, Plus, 
  Lock, Users as UsersIcon, FolderPlus, HardDrive, Cloud,
  ClipboardList, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ServiceRequestsPanel } from '@/components/service-requests/ServiceRequestsPanel';
import { ProgramTemplatesPanel } from '@/components/templates/ProgramTemplatesPanel';

interface LibraryItem {
  id: string;
  agency_id: string | null;
  uploaded_by: string;
  title: string;
  description: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  category: string;
  tags: string[];
  is_pinned: boolean;
  folder: string | null;
  created_at: string;
  updated_at: string;
}

interface PersonalFile {
  id: string;
  user_id: string;
  title: string;
  description: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  category: string;
  tags: string[];
  folder: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'protocols', label: 'Protocols & Guides' },
  { value: 'templates', label: 'Templates' },
  { value: 'training', label: 'Training Materials' },
  { value: 'visual-supports', label: 'Visual Supports' },
  { value: 'data-sheets', label: 'Data Sheets' },
  { value: 'parent-resources', label: 'Parent Resources' },
  { value: 'assessments', label: 'Assessments' },
  { value: 'media', label: 'Media & Videos' },
];

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
  if (fileType.startsWith('video/')) return <Video className="w-5 h-5 text-purple-500" />;
  if (fileType.startsWith('audio/')) return <Music className="w-5 h-5 text-amber-500" />;
  if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-destructive" />;
  if (fileType.includes('document') || fileType.includes('word')) return <FileText className="w-5 h-5 text-blue-600" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResourceHub() {
  const { user, userRole } = useAuth();
  const { currentAgency, isAgencyAdmin } = useAgencyContext();
  const isAdmin = isAgencyAdmin || userRole === 'admin' || userRole === 'super_admin';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'team';

  const [activeTab, setActiveTab] = useState<'team' | 'personal' | 'upload' | 'requests' | 'templates'>(initialTab as any);
  const [teamItems, setTeamItems] = useState<LibraryItem[]>([]);
  const [personalItems, setPersonalItems] = useState<PersonalFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Upload state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadCategory, setUploadCategory] = useState('general');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadDestination, setUploadDestination] = useState<'team' | 'personal' | null>(null);
  const [uploadFolder, setUploadFolder] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch team files
  const fetchTeamItems = useCallback(async () => {
    const { data } = await supabase
      .from('shared_library_items')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    setTeamItems((data as LibraryItem[]) || []);
  }, []);

  // Fetch personal files
  const fetchPersonalItems = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('personal_files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setPersonalItems((data as PersonalFile[]) || []);
  }, [user]);

  useEffect(() => {
    Promise.all([fetchTeamItems(), fetchPersonalItems()]).then(() => setLoading(false));
  }, [fetchTeamItems, fetchPersonalItems]);

  // Open upload tab triggers the upload dialog
  useEffect(() => {
    if (activeTab === 'upload') {
      setUploadOpen(true);
      setActiveTab('team'); // reset tab so it doesn't stay on "upload"
    }
  }, [activeTab]);

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadTitle('');
    setUploadDesc('');
    setUploadCategory('general');
    setUploadTags('');
    setUploadDestination(null);
    setUploadFolder('');
    setNewFolderName('');
    setShowNewFolder(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadConfirm = async () => {
    if (!uploadFile || !user || !uploadTitle.trim() || !uploadDestination) return;
    setUploading(true);
    setConfirmOpen(false);

    try {
      const ext = uploadFile.name.split('.').pop();
      const folder = showNewFolder && newFolderName.trim() ? newFolderName.trim() : uploadFolder || null;

      if (uploadDestination === 'team') {
        const path = `${currentAgency?.id || 'shared'}/${crypto.randomUUID()}.${ext}`;
        const { error: storageError } = await supabase.storage
          .from('shared-library')
          .upload(path, uploadFile);
        if (storageError) throw storageError;

        const tags = uploadTags.split(',').map(t => t.trim()).filter(Boolean);
        const { error: dbError } = await supabase.from('shared_library_items').insert({
          agency_id: currentAgency?.id || null,
          uploaded_by: user.id,
          title: uploadTitle.trim(),
          description: uploadDesc.trim(),
          file_name: uploadFile.name,
          file_type: uploadFile.type,
          file_size: uploadFile.size,
          storage_path: path,
          category: uploadCategory,
          tags,
          folder,
        });
        if (dbError) throw dbError;

        toast({ title: 'File uploaded', description: `"${uploadTitle}" added to Team Files` });
        fetchTeamItems();
      } else {
        // Personal files
        const path = `personal/${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: storageError } = await supabase.storage
          .from('shared-library')
          .upload(path, uploadFile);
        if (storageError) throw storageError;

        const tags = uploadTags.split(',').map(t => t.trim()).filter(Boolean);
        const { error: dbError } = await supabase.from('personal_files').insert({
          user_id: user.id,
          title: uploadTitle.trim(),
          description: uploadDesc.trim(),
          file_name: uploadFile.name,
          file_type: uploadFile.type,
          file_size: uploadFile.size,
          storage_path: path,
          category: uploadCategory,
          tags,
          folder,
        });
        if (dbError) throw dbError;

        toast({ title: 'File uploaded', description: `"${uploadTitle}" added to Personal Files` });
        fetchPersonalItems();
      }

      setUploadOpen(false);
      resetUploadForm();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTeam = async (item: LibraryItem) => {
    if (!isAdmin) {
      toast({ title: 'Permission denied', description: 'Only admins can delete Team Files.', variant: 'destructive' });
      return;
    }
    await supabase.storage.from('shared-library').remove([item.storage_path]);
    await supabase.from('shared_library_items').delete().eq('id', item.id);
    setTeamItems(prev => prev.filter(i => i.id !== item.id));
    toast({ title: 'Deleted', description: `"${item.title}" removed from Team Files` });
  };

  const handleDeletePersonal = async (item: PersonalFile) => {
    await supabase.storage.from('shared-library').remove([item.storage_path]);
    await supabase.from('personal_files').delete().eq('id', item.id);
    setPersonalItems(prev => prev.filter(i => i.id !== item.id));
    toast({ title: 'Deleted', description: `"${item.title}" removed from Personal Files` });
  };

  const handleTogglePin = async (item: LibraryItem) => {
    const newPinned = !item.is_pinned;
    await supabase.from('shared_library_items').update({ is_pinned: newPinned }).eq('id', item.id);
    setTeamItems(prev => prev.map(i => i.id === item.id ? { ...i, is_pinned: newPinned } : i));
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('shared-library').getPublicUrl(path);
    return data.publicUrl;
  };

  const existingFolders = [...new Set(teamItems.map(i => i.folder).filter(Boolean))] as string[];

  const currentItems = activeTab === 'team' ? teamItems : personalItems;
  const filtered = currentItems.filter(item => {
    const matchesSearch = !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      (item.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const renderFileCard = (item: any, isTeam: boolean) => (
    <Card key={item.id} className="group hover:border-primary/30 transition-colors">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          {getFileIcon(item.file_type)}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.file_name}</p>
          </div>
          {isTeam && (item as LibraryItem).is_pinned && <Pin className="w-3.5 h-3.5 text-primary shrink-0" />}
          {!isTeam && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        )}
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-[10px]">
            {CATEGORIES.find(c => c.value === item.category)?.label || item.category}
          </Badge>
          {(item.tags || []).slice(0, 2).map((tag: string) => (
            <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
          ))}
          {item.folder && (
            <Badge variant="outline" className="text-[10px]">📁 {item.folder}</Badge>
          )}
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-muted-foreground">
            {formatFileSize(item.file_size)} · {format(new Date(item.created_at), 'MMM d')}
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isTeam && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleTogglePin(item)}>
                {(item as LibraryItem).is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
              <a href={getPublicUrl(item.storage_path)} target="_blank" rel="noopener noreferrer" download>
                <Download className="w-3 h-3" />
              </a>
            </Button>
            {isTeam ? (
              isAdmin && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteTeam(item)}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              )
            ) : (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeletePersonal(item)}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-primary" />
                  Resource Hub
                </h1>
                <p className="text-xs text-muted-foreground">
                  Team files, personal cloud, service requests & templates
                </p>
              </div>
            </div>
            <Button onClick={() => setUploadOpen(true)} className="gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </Button>
          </div>
        </div>
      </header>

      <div className="border-b border-border bg-card/50">
        <div className="container">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="h-11 bg-transparent border-none">
              <TabsTrigger value="team" className="gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <UsersIcon className="w-3.5 h-3.5" />
                Team Files
              </TabsTrigger>
              <TabsTrigger value="personal" className="gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Lock className="w-3.5 h-3.5" />
                Personal Files
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Upload className="w-3.5 h-3.5" />
                Upload
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="container py-6 space-y-4">
        {/* Search & Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search files, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] h-9">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex border rounded-md overflow-hidden">
            <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" className="h-9 rounded-none" onClick={() => setViewMode('grid')}>
              <Grid className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" className="h-9 rounded-none" onClick={() => setViewMode('list')}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Items */}
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading files...</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-1">
                {activeTab === 'team' ? 'No team files yet' : 'No personal files yet'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'team'
                  ? 'Upload documents, visual supports, templates and more to share with your team.'
                  : 'Upload files to your private cloud folder for personal use.'}
              </p>
              <Button className="mt-4" onClick={() => setUploadOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(item => renderFileCard(item, activeTab === 'team'))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={(o) => { setUploadOpen(o); if (!o) resetUploadForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Upload to Resource Hub
            </DialogTitle>
            <DialogDescription>
              Choose a destination and upload your file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Destination Selection */}
            <div className="space-y-1.5">
              <Label>Upload Destination</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={uploadDestination === 'team' ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col gap-1"
                  onClick={() => setUploadDestination('team')}
                >
                  <UsersIcon className="w-5 h-5" />
                  <span className="text-xs font-medium">Team Files</span>
                  <span className="text-[10px] text-muted-foreground">Shared with staff</span>
                </Button>
                <Button
                  variant={uploadDestination === 'personal' ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col gap-1"
                  onClick={() => setUploadDestination('personal')}
                >
                  <Lock className="w-5 h-5" />
                  <span className="text-xs font-medium">Personal Files</span>
                  <span className="text-[10px] text-muted-foreground">Private cloud folder</span>
                </Button>
              </div>
            </div>

            {uploadDestination === 'team' && (
              <div className="space-y-1.5">
                <Label>Folder (optional)</Label>
                {!showNewFolder ? (
                  <div className="flex gap-2">
                    <Select value={uploadFolder} onValueChange={setUploadFolder}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="No folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=" ">No folder</SelectItem>
                        {existingFolders.map(f => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => setShowNewFolder(true)}>
                      <FolderPlus className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      placeholder="New folder name"
                    />
                    <Button variant="ghost" size="sm" onClick={() => setShowNewFolder(false)}>Cancel</Button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>File</Label>
              <Input
                ref={fileInputRef}
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadFile(file);
                    if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^.]+$/, ''));
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="File title" />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} placeholder="Brief description..." className="min-h-[60px] resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tags (comma separated)</Label>
              <Input value={uploadTags} onChange={(e) => setUploadTags(e.target.value)} placeholder="e.g. DTT, token board, social story" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={uploading || !uploadFile || !uploadTitle.trim() || !uploadDestination}
            >
              <Upload className="w-4 h-4 mr-1" />
              {uploading ? 'Uploading...' : 'Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Upload</AlertDialogTitle>
            <AlertDialogDescription>
              {uploadDestination === 'team'
                ? 'You are uploading this file to Team Files in Resource Hub. This file will be visible to authorized staff. Only Admin can delete files from Team Files. Continue?'
                : 'You are uploading this file to Personal Files in Resource Hub. Only you can access this file across your authorized NovaTrack apps. Continue?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUploadConfirm} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
