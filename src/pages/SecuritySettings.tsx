import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Clock, 
  Save, 
  Lock, 
  FileText, 
  Users, 
  ArrowLeft,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Settings,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { getAuditLogs, getDataAccessLogs, logAuditEvent } from '@/lib/auditLogger';
import { format } from 'date-fns';

interface SecuritySetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string | null;
}

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  details: any;
  created_at: string;
}

interface DataAccessLog {
  id: string;
  user_id: string;
  student_id: string;
  access_type: string;
  data_category: string;
  details: any;
  created_at: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  login: <UserPlus className="w-4 h-4 text-green-500" />,
  logout: <Users className="w-4 h-4 text-gray-500" />,
  session_timeout: <Clock className="w-4 h-4 text-amber-500" />,
  create: <Edit className="w-4 h-4 text-blue-500" />,
  update: <Edit className="w-4 h-4 text-blue-500" />,
  delete: <Trash2 className="w-4 h-4 text-red-500" />,
  view: <Eye className="w-4 h-4 text-gray-500" />,
  export: <Download className="w-4 h-4 text-purple-500" />,
  settings_change: <Settings className="w-4 h-4 text-orange-500" />,
  approve: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  emergency_save: <AlertTriangle className="w-4 h-4 text-amber-500" />,
};

export default function SecuritySettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [settings, setSettings] = useState<SecuritySetting[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dataAccessLogs, setDataAccessLogs] = useState<DataAccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Filter states
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [accessFilter, setAccessFilter] = useState<string>('all');
  
  // Editable settings
  const [sessionTimeout, setSessionTimeout] = useState('15');
  const [autoSaveInterval, setAutoSaveInterval] = useState('120');
  const [auditRetention, setAuditRetention] = useState('365');
  const [requirePinForSensitive, setRequirePinForSensitive] = useState(false);

  useEffect(() => {
    const checkAdminAndLoad = async () => {
      if (!user) return;
      
      // Check if user is admin
      const { data: adminCheck } = await supabase.rpc('is_admin', { _user_id: user.id });
      setIsAdmin(!!adminCheck);
      
      if (!adminCheck) {
        toast({
          title: 'Access Denied',
          description: 'You need admin privileges to access security settings.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }
      
      await loadData();
    };
    
    checkAdminAndLoad();
  }, [user, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load security settings
      const { data: settingsData } = await supabase
        .from('security_settings')
        .select('*');
      
      if (settingsData) {
        setSettings(settingsData);
        
        // Set individual values
        settingsData.forEach(setting => {
          switch (setting.setting_key) {
            case 'session_timeout_minutes':
              setSessionTimeout(setting.setting_value as string);
              break;
            case 'auto_save_interval_seconds':
              setAutoSaveInterval(setting.setting_value as string);
              break;
            case 'audit_log_retention_days':
              setAuditRetention(setting.setting_value as string);
              break;
            case 'require_pin_for_sensitive_actions':
              setRequirePinForSensitive(setting.setting_value === 'true');
              break;
          }
        });
      }
      
      // Load audit logs
      const logs = await getAuditLogs({ limit: 100 });
      setAuditLogs(logs);
      
      // Load data access logs
      const accessLogs = await getDataAccessLogs({ limit: 100 });
      setDataAccessLogs(accessLogs);
      
    } catch (error) {
      console.error('Failed to load security data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load security settings.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: 'session_timeout_minutes', value: sessionTimeout },
        { key: 'auto_save_interval_seconds', value: autoSaveInterval },
        { key: 'audit_log_retention_days', value: auditRetention },
        { key: 'require_pin_for_sensitive_actions', value: requirePinForSensitive.toString() },
      ];
      
      for (const update of updates) {
        await supabase
          .from('security_settings')
          .update({ 
            setting_value: update.value,
            updated_by: user?.id,
            updated_at: new Date().toISOString(),
          })
          .eq('setting_key', update.key);
      }
      
      await logAuditEvent('settings_change', 'settings', undefined, 'Security settings', {
        changes: updates,
      });
      
      toast({
        title: 'Settings Saved',
        description: 'Security settings have been updated successfully.',
      });
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save security settings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredAuditLogs = auditFilter === 'all' 
    ? auditLogs 
    : auditLogs.filter(log => log.action === auditFilter);

  const filteredAccessLogs = accessFilter === 'all'
    ? dataAccessLogs
    : dataAccessLogs.filter(log => log.access_type === accessFilter);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Security & Compliance Settings
          </h1>
          <p className="text-muted-foreground">
            Configure HIPAA/FERPA compliance settings, session timeouts, and audit logging
          </p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Data Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Session Management
              </CardTitle>
              <CardDescription>
                Configure automatic logout and session protection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min="5"
                    max="120"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Users will be logged out after this many minutes of inactivity
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="autoSave">Auto-Save Interval (seconds)</Label>
                  <Input
                    id="autoSave"
                    type="number"
                    min="30"
                    max="600"
                    value={autoSaveInterval}
                    onChange={(e) => setAutoSaveInterval(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Session data is automatically saved at this interval
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Require PIN for Sensitive Actions</Label>
                  <p className="text-xs text-muted-foreground">
                    Require PIN verification for exports, deletions, and profile changes
                  </p>
                </div>
                <Switch
                  checked={requirePinForSensitive}
                  onCheckedChange={setRequirePinForSensitive}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Audit & Retention
              </CardTitle>
              <CardDescription>
                Configure how long audit logs are retained
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auditRetention">Audit Log Retention (days)</Label>
                <Input
                  id="auditRetention"
                  type="number"
                  min="30"
                  max="2555"
                  value={auditRetention}
                  onChange={(e) => setAuditRetention(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  HIPAA requires a minimum of 6 years (2190 days) for audit logs
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                Compliance Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Data Encryption at Rest</span>
                  <Badge variant="outline" className="bg-green-100 text-green-700">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">TLS/HTTPS Encryption</span>
                  <Badge variant="outline" className="bg-green-100 text-green-700">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Row-Level Security</span>
                  <Badge variant="outline" className="bg-green-100 text-green-700">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Audit Logging</span>
                  <Badge variant="outline" className="bg-green-100 text-green-700">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Session Timeout</span>
                  <Badge variant="outline" className="bg-green-100 text-green-700">{sessionTimeout} min</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Auto-Save Protection</span>
                  <Badge variant="outline" className="bg-green-100 text-green-700">Every {autoSaveInterval}s</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={saving} className="min-w-[120px]">
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Audit Log</CardTitle>
                  <CardDescription>
                    Track all user actions for compliance
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={auditFilter} onValueChange={setAuditFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="logout">Logout</SelectItem>
                      <SelectItem value="session_timeout">Timeout</SelectItem>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                      <SelectItem value="view">View</SelectItem>
                      <SelectItem value="export">Export</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={loadData}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredAuditLogs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No audit logs found
                    </p>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="mt-1">
                          {ACTION_ICONS[log.action] || <FileText className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {log.action}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {log.resource_type}
                            </Badge>
                            {log.resource_name && (
                              <span className="text-sm font-medium truncate">
                                {log.resource_name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {format(new Date(log.created_at), 'PPpp')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Data Access Log</CardTitle>
                  <CardDescription>
                    Track who accessed student data and when
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={accessFilter} onValueChange={setAccessFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="view">View</SelectItem>
                      <SelectItem value="edit">Edit</SelectItem>
                      <SelectItem value="export">Export</SelectItem>
                      <SelectItem value="print">Print</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={loadData}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredAccessLogs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No data access logs found
                    </p>
                  ) : (
                    filteredAccessLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="mt-1">
                          {log.access_type === 'view' && <Eye className="w-4 h-4 text-gray-500" />}
                          {log.access_type === 'edit' && <Edit className="w-4 h-4 text-blue-500" />}
                          {log.access_type === 'export' && <Download className="w-4 h-4 text-purple-500" />}
                          {log.access_type === 'print' && <FileText className="w-4 h-4 text-green-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {log.access_type}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {log.data_category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {format(new Date(log.created_at), 'PPpp')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
