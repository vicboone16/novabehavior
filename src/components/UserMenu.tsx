import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSync } from '@/contexts/SyncContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, RefreshCw, Cloud, CloudOff, Loader2, Shield, Smartphone, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { SetupPinDialog } from '@/components/PinLogin';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const { isSyncing, isLoading, lastSyncTime, syncNow, syncStatus } = useSync();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const { data } = await supabase.rpc('is_admin', { _user_id: user.id });
        setIsAdmin(!!data);
      }
    };
    checkAdmin();
  }, [user]);

  if (!user) return null;

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Signed out successfully' });
    navigate('/auth');
  };

  const handleSyncNow = async () => {
    await syncNow();
  };

  const getSyncIcon = () => {
    if (isSyncing || isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
    if (syncStatus === 'success') {
      return <Cloud className="h-4 w-4 text-primary" />;
    }
    if (syncStatus === 'error') {
      return <CloudOff className="h-4 w-4 text-destructive" />;
    }
    return <Cloud className="h-4 w-4 text-muted-foreground" />;
  };

  const getSyncText = () => {
    if (isSyncing) return 'Syncing...';
    if (isLoading) return 'Loading...';
    if (lastSyncTime) {
      return `Synced ${formatDistanceToNow(lastSyncTime, { addSuffix: true })}`;
    }
    return 'Not synced';
  };

  return (
    <div className="flex items-center gap-2">
      {/* Sync Status Indicator */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {getSyncIcon()}
        <span className="hidden sm:inline">{getSyncText()}</span>
      </div>

      {/* Sync Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSyncNow}
        disabled={isSyncing || isLoading}
        className="h-8 px-2"
      >
        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
        <span className="ml-1.5 hidden sm:inline">Sync</span>
      </Button>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {getSyncIcon()}
              <span>{getSyncText()}</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSyncNow} disabled={isSyncing || isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync Now
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/behaviors')}>
            <BookOpen className="mr-2 h-4 w-4" />
            Behavior Library
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowPinSetup(true)}>
            <Smartphone className="mr-2 h-4 w-4" />
            Set Up Quick PIN
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/admin')}>
                <Shield className="mr-2 h-4 w-4" />
                Admin Panel
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SetupPinDialog
        open={showPinSetup}
        onOpenChange={setShowPinSetup}
        userId={user.id}
      />
    </div>
  );
}
