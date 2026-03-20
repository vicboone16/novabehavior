import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Upload, Search, FolderOpen, FileText, Image, Video, Music, File, 
  Trash2, Pin, PinOff, Download, Grid, List, Tag, Filter, Plus,
  FolderPlus, Pencil, Globe, Lock, ChevronRight, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  folder_id: string | null;
  visibility: string;
  created_at: string;
  updated_at: string;
}

interface LibraryFolder {
  id: string;
  agency_id: string | null;
  name: string;
  parent_folder_id: string | null;
  visibility: string;
  created_by: string;
  created_at: string;
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

export default function SharedLibrary() {
  const { user } = useAuth();
  const { currentAgency } = useAgencyContext();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<LibraryFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderVisibility, setNewFolderVisibility] = useState('private');

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadCategory, setUploadCategory] = useState('general');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadVisibility, setUploadVisibility] = useState('private');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    const [itemsRes, foldersRes] = await Promise.all([
      supabase
        .from('shared_library_items')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('shared_library_folders')
        .select('*')
        .order('name'),
    ]);
    setItems((itemsRes.data as LibraryItem[]) || []);
    setFolders((foldersRes.data as LibraryFolder[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleUpload = async () => {
    if (!uploadFile || !user || !uploadTitle.trim()) return;
    setUploading(true);

    try {
      const ext = uploadFile.name.split('.').pop();
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
        folder_id: currentFolderId,
        visibility: uploadVisibility,
      });
      if (dbError) throw dbError;

      toast({ title: 'File uploaded', description: `"${uploadTitle}" added to shared library` });
      setUploadOpen(false);
      resetUploadForm();
      fetchItems();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadTitle('');
    setUploadDesc('');
    setUploadCategory('general');
    setUploadTags('');
    setUploadVisibility('private');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (item: LibraryItem) => {
    if (item.uploaded_by !== user?.id) return;
    await supabase.storage.from('shared-library').remove([item.storage_path]);
    await supabase.from('shared_library_items').delete().eq('id', item.id);
    setItems(prev => prev.filter(i => i.id !== item.id));
    toast({ title: 'Deleted', description: `"${item.title}" removed` });
  };

  const handleTogglePin = async (item: LibraryItem) => {
    const newPinned = !item.is_pinned;
    await supabase.from('shared_library_items').update({ is_pinned: newPinned }).eq('id', item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_pinned: newPinned } : i));
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('shared-library').getPublicUrl(path);
    return data.publicUrl;
  };

  // Folder management
  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return;
    try {
      const { error } = await supabase.from('shared_library_folders').insert({
        agency_id: currentAgency?.id || null,
        name: newFolderName.trim(),
        parent_folder_id: currentFolderId,
        visibility: newFolderVisibility,
        created_by: user.id,
      });
      if (error) throw error;
      toast({ title: 'Folder created' });
      setFolderDialogOpen(false);
      setNewFolderName('');
      setEditingFolder(null);
      fetchItems();
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleRenameFolder = async () => {
    if (!editingFolder || !newFolderName.trim()) return;
    try {
      const { error } = await supabase
        .from('shared_library_folders')
        .update({ name: newFolderName.trim(), visibility: newFolderVisibility })
        .eq('id', editingFolder.id);
      if (error) throw error;
      toast({ title: 'Folder updated' });
      setFolderDialogOpen(false);
      setEditingFolder(null);
      setNewFolderName('');
      fetchItems();
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteFolder = async (folder: LibraryFolder) => {
    if (folder.created_by !== user?.id) return;
    if (!confirm(`Delete folder "${folder.name}" and move its files to root?`)) return;
    // Move items to root
    await supabase.from('shared_library_items').update({ folder_id: null }).eq('folder_id', folder.id);
    await supabase.from('shared_library_folders').delete().eq('id', folder.id);
    setFolders(prev => prev.filter(f => f.id !== folder.id));
    if (currentFolderId === folder.id) setCurrentFolderId(null);
    toast({ title: 'Folder deleted' });
    fetchItems();
  };

  const openEditFolder = (folder: LibraryFolder) => {
    setEditingFolder(folder);
    setNewFolderName(folder.name);
    setNewFolderVisibility(folder.visibility);
    setFolderDialogOpen(true);
  };

  const openCreateFolder = () => {
    setEditingFolder(null);
    setNewFolderName('');
    setNewFolderVisibility('private');
    setFolderDialogOpen(true);
  };

  // Filter items by current folder
  const currentFolders = folders.filter(f => f.parent_folder_id === currentFolderId);
  const currentFolder = folders.find(f => f.id === currentFolderId);

  const filtered = items.filter(item => {
    const inFolder = item.folder_id === currentFolderId;
    const matchesSearch = !search || 
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return (search ? matchesSearch && matchesCategory : inFolder && matchesSearch && matchesCategory);
  });

  // Breadcrumb
  const getBreadcrumb = () => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'Root' }];
    if (currentFolderId) {
      let f = folders.find(x => x.id === currentFolderId);
      const chain: LibraryFolder[] = [];
      while (f) {
        chain.unshift(f);
        f = f.parent_folder_id ? folders.find(x => x.id === f!.parent_folder_id) : undefined;
      }
      chain.forEach(c => crumbs.push({ id: c.id, name: c.name }));
    }
    return crumbs;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary" />
            Shared Library
          </h1>
          <p className="text-sm text-muted-foreground">
            Documents, media, and resources shared between staff
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openCreateFolder} className="gap-2">
            <FolderPlus className="w-4 h-4" />
            New Folder
          </Button>
          <Button onClick={() => setUploadOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            Upload File
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm">
        {getBreadcrumb().map((crumb, i, arr) => (
          <span key={crumb.id ?? 'root'} className="flex items-center gap-1">
            <button
              className={cn(
                "hover:text-primary transition-colors",
                i === arr.length - 1 ? "font-medium text-foreground" : "text-muted-foreground"
              )}
              onClick={() => setCurrentFolderId(crumb.id)}
            >
              {crumb.name}
            </button>
            {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
          </span>
        ))}
      </div>

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

      {/* Folders */}
      {currentFolders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {currentFolders.map(folder => (
            <Card
              key={folder.id}
              className="cursor-pointer hover:border-primary/30 transition-colors group"
              onClick={() => setCurrentFolderId(folder.id)}
            >
              <CardContent className="p-3 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{folder.name}</p>
                  <div className="flex items-center gap-1">
                    {folder.visibility === 'public' ? (
                      <Badge variant="outline" className="text-[10px] gap-0.5"><Globe className="w-2.5 h-2.5" /> Public</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] gap-0.5"><Lock className="w-2.5 h-2.5" /> Private</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditFolder(folder)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  {folder.created_by === user?.id && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteFolder(folder)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Items */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading library...</p>
      ) : filtered.length === 0 && currentFolders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No files yet</h3>
            <p className="text-sm text-muted-foreground">Upload documents, visual supports, templates and more to share with your team.</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(item => (
            <Card key={item.id} className="group hover:border-primary/30 transition-colors">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start gap-2">
                  {getFileIcon(item.file_type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.file_name}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.is_pinned && <Pin className="w-3.5 h-3.5 text-primary" />}
                    {item.visibility === 'public' ? (
                      <Globe className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                  </Badge>
                  {item.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {formatFileSize(item.file_size)} · {format(new Date(item.created_at), 'MMM d')}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleTogglePin(item)}>
                      {item.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                      <a href={getPublicUrl(item.storage_path)} target="_blank" rel="noopener noreferrer" download>
                        <Download className="w-3 h-3" />
                      </a>
                    </Button>
                    {item.uploaded_by === user?.id && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(item)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-md border hover:border-primary/30 group transition-colors">
              {getFileIcon(item.file_type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  {item.is_pinned && <Pin className="w-3 h-3 text-primary" />}
                  {item.visibility === 'public' ? (
                    <Globe className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{item.file_name} · {formatFileSize(item.file_size)}</p>
              </div>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {CATEGORIES.find(c => c.value === item.category)?.label || item.category}
              </Badge>
              <span className="text-xs text-muted-foreground shrink-0">
                {format(new Date(item.created_at), 'MMM d')}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTogglePin(item)}>
                  {item.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <a href={getPublicUrl(item.storage_path)} target="_blank" rel="noopener noreferrer" download>
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </Button>
                {item.uploaded_by === user?.id && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(item)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={(o) => { setUploadOpen(o); if (!o) resetUploadForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Upload to Shared Library
            </DialogTitle>
            <DialogDescription>
              {currentFolder ? `Uploading to: ${currentFolder.name}` : 'Uploading to root'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
            <div className="grid grid-cols-2 gap-3">
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
                <Label>Visibility</Label>
                <Select value={uploadVisibility} onValueChange={setUploadVisibility}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tags (comma separated)</Label>
              <Input value={uploadTags} onChange={(e) => setUploadTags(e.target.value)} placeholder="e.g. DTT, token board, social story" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading || !uploadFile || !uploadTitle.trim()}>
              <Upload className="w-4 h-4 mr-1" />
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Folder Create/Edit Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingFolder ? 'Edit Folder' : 'New Folder'}</DialogTitle>
            <DialogDescription>
              {editingFolder ? 'Rename or change visibility' : 'Create a folder to organize your files'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Folder Name</Label>
              <Input
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="e.g., Parent Resources"
              />
            </div>
            <div>
              <Label>Visibility</Label>
              <Select value={newFolderVisibility} onValueChange={setNewFolderVisibility}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">
                    <span className="flex items-center gap-1.5"><Lock className="w-3 h-3" /> Private (staff only)</span>
                  </SelectItem>
                  <SelectItem value="public">
                    <span className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> Public (visible to all)</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!newFolderName.trim()}
              onClick={editingFolder ? handleRenameFolder : handleCreateFolder}
            >
              {editingFolder ? 'Save Changes' : 'Create Folder'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
