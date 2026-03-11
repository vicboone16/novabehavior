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
import { Badge } from '@/components/ui/badge';
import { LogOut, RefreshCw, Cloud, CloudOff, Loader2, Shield, ShieldCheck, BookOpen, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { AdminPinRedemption } from '@/components/AdminPinRedemption';

export function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const { isSyncing, isLoading, lastSyncTime, syncNow, reloadFromCloud, syncStatus } = useSync();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const checkAdminAndPending = async () => {
      if (user) {
        const { data } = await supabase.rpc('is_admin', { _user_id: user.id });
        setIsAdmin(!!data);
        
        if (data) {
          const { data: count } = await supabase.rpc('get_pending_approval_count');
          setPendingCount(count || 0);
        }
      }
    };
    checkAdminAndPending();
  }, [user]);

  if (!user) return null;

  // Use profile.display_name from the database as the source of truth
  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: 'Signed out successfully' });
      navigate('/auth');
    } catch (e: any) {
      toast({ title: 'Sign out failed', description: e?.message ?? 'Please try again', variant: 'destructive' });
    }
  };

  const handleSyncNow = async () => {
    await syncNow();
  };

  const handleForceRefresh = async () => {
    toast({ title: 'Refreshing…', description: 'Reloading students from cloud' });
    await reloadFromCloud();
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
            {/* Pending approvals badge */}
            {isAdmin && pendingCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {pendingCount > 9 ? '9+' : pendingCount}
              </Badge>
            )}
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
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleSyncNow();
            }}
            disabled={isSyncing || isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync Now
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleForceRefresh();
            }}
          >
            <CloudOff className="mr-2 h-4 w-4" />
            Force Refresh (Clear Cache)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              navigate('/profile');
            }}
          >
            <User className="mr-2 h-4 w-4" />
            My Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              navigate('/lms');
            }}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            LMS / Training
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  navigate('/admin');
                }}
              >
                <Shield className="mr-2 h-4 w-4" />
                Admin Panel
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {pendingCount} pending
                  </Badge>
                )}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setShowAdminPin(true);
            }}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Redeem Admin PIN
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleSignOut();
            }}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AdminPinRedemption
        open={showAdminPin}
        onOpenChange={setShowAdminPin}
      />
    </div>
  );
}