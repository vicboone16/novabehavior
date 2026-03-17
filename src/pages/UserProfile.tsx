import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { User, Phone, Lock, Smartphone, ArrowLeft, Loader2, Info, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { SetupPinDialog } from '@/components/PinLogin';
import { NotificationPreferences } from '@/components/settings/NotificationPreferences';
import { AdminDebugPanel } from '@/components/settings/AdminDebugPanel';

interface ProfileData {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  has_pin: boolean;
}

export default function UserProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  
  // Form state
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Display name editing
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  
  // PIN dialog
  const [showPinSetup, setShowPinSetup] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, first_name, last_name, phone, email')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Check if user has PIN set using secure server-side function
      // This prevents exposing pin_hash column to clients
      const { data: hasPin } = await supabase.rpc('user_has_pin', { _user_id: user.id });
      
      setProfile({ ...data, has_pin: !!hasPin });
      setPhone(data.phone || '');
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({ title: 'Error loading profile', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDisplayName = async () => {
    if (!user || !displayNameInput.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayNameInput.trim() })
        .eq('user_id', user.id);
      if (error) throw error;
      toast({ title: 'Display name updated' });
      setEditingDisplayName(false);
      await loadProfile();
    } catch (error: any) {
      toast({ title: 'Error updating display name', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePhone = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone: phone.trim() || null })
        .eq('user_id', user.id);
      if (error) throw error;
      toast({ title: 'Phone number updated' });
      await loadProfile();
    } catch (error: any) {
      toast({ title: 'Error updating phone', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({ title: 'Error updating password', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <User className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">My Profile</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your account settings
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 space-y-6 max-w-2xl">
        {/* Display Name (Read Only) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Display Name
            </CardTitle>
            <CardDescription>
              Your name as it appears throughout the app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingDisplayName ? (
              <div className="space-y-2">
                <Label>Display Name</Label>
                <div className="flex gap-2">
                  <Input
                    value={displayNameInput}
                    onChange={e => setDisplayNameInput(e.target.value)}
                    placeholder="e.g. Victoria B."
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdateDisplayName(); if (e.key === 'Escape') setEditingDisplayName(false); }}
                  />
                  <Button size="icon" variant="default" onClick={handleUpdateDisplayName} disabled={saving || !displayNameInput.trim()}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditingDisplayName(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">This is how your name appears throughout the app.</p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs text-muted-foreground">Current Display Name</Label>
                  <p className="font-semibold text-lg">{profile?.display_name || 'Not set'}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDisplayNameInput(profile?.display_name || '');
                    setEditingDisplayName(true);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </Button>
              </div>
            )}
          </CardContent>
        </Card>


        {/* Phone Number */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Phone Number
            </CardTitle>
            <CardDescription>
              Your contact phone number
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 555-5555"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleUpdatePhone} 
              disabled={saving || phone === (profile?.phone || '')}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Update Phone
            </Button>
          </CardContent>
        </Card>

        {/* Email (Read Only) */}
        <Card>
          <CardHeader>
            <CardTitle>Email Address</CardTitle>
            <CardDescription>
              Your login email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                value={profile?.email || user?.email || ''} 
                disabled 
                className="bg-muted"
              />
            </div>
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                Email addresses can only be changed by an administrator.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={saving || !newPassword || !confirmPassword}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Section */}
        <div className="pt-2">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5" />
            Security
          </h2>
        </div>

        {/* PIN Setup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Quick PIN Login
            </CardTitle>
            <CardDescription>
              Set up a 6-digit PIN for faster mobile login
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {profile?.has_pin ? 'PIN is set' : 'No PIN configured'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {profile?.has_pin 
                    ? 'You can log in using your 6-digit PIN' 
                    : 'Set up a PIN for quick access'}
                </p>
              </div>
              <Button onClick={() => setShowPinSetup(true)}>
                {profile?.has_pin ? 'Change PIN' : 'Set Up PIN'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <NotificationPreferences />

        {/* Admin Debug */}
        <AdminDebugPanel />
      </main>

      {user && (
        <SetupPinDialog
          open={showPinSetup}
          onOpenChange={setShowPinSetup}
          userId={user.id}
        />
      )}
    </div>
  );
}
