import { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserPlus, Send, Circle, MessageSquare, 
  Eye, Clock, ChevronDown, ChevronUp, Bell, BellOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Collaborator {
  id: string;
  email: string;
  displayName: string;
  color: string;
  isOnline: boolean;
  lastSeen?: Date;
  currentActivity?: string;
}

interface CollaborationMessage {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'activity' | 'join' | 'leave';
}

interface CollaborationPanelProps {
  studentId: string;
  studentName: string;
}

const COLLABORATOR_COLORS = [
  'hsl(199, 89%, 48%)',
  'hsl(173, 80%, 40%)',
  'hsl(262, 83%, 58%)',
  'hsl(38, 92%, 50%)',
  'hsl(340, 82%, 52%)',
  'hsl(142, 76%, 36%)',
];

export function CollaborationPanel({ studentId, studentName }: CollaborationPanelProps) {
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [messages, setMessages] = useState<CollaborationMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  // Simulated current user as collaborator
  const currentCollaborator = useMemo((): Collaborator | null => {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email || '',
      displayName: user.email?.split('@')[0] || 'You',
      color: COLLABORATOR_COLORS[0],
      isOnline: true,
      currentActivity: 'Viewing student profile',
    };
  }, [user]);

  // Subscribe to real-time presence and messages
  useEffect(() => {
    if (!user || !studentId) return;

    const channelName = `student-collab-${studentId}`;
    
    // Create a presence channel for this student
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Track presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineUsers = Object.values(state).flat() as any[];
        
        setCollaborators(onlineUsers.map((u, index) => ({
          id: u.user_id,
          email: u.email,
          displayName: u.display_name || u.email?.split('@')[0],
          color: COLLABORATOR_COLORS[index % COLLABORATOR_COLORS.length],
          isOnline: true,
          currentActivity: u.activity,
        })));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const joining = newPresences[0] as any;
        if (joining.user_id !== user.id && notificationsEnabled) {
          toast.info(`${joining.display_name || joining.email} joined`);
        }
        
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          userId: joining.user_id,
          userEmail: joining.email,
          userName: joining.display_name || joining.email?.split('@')[0],
          message: 'joined the session',
          timestamp: new Date(),
          type: 'join',
        }]);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        const leaving = leftPresences[0] as any;
        
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          userId: leaving.user_id,
          userEmail: leaving.email,
          userName: leaving.display_name || leaving.email?.split('@')[0],
          message: 'left the session',
          timestamp: new Date(),
          type: 'leave',
        }]);
      })
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            userId: payload.userId,
            userEmail: payload.userEmail,
            userName: payload.userName,
            message: payload.message,
            timestamp: new Date(payload.timestamp),
            type: 'message',
          }]);
          
          if (notificationsEnabled) {
            toast.info(`${payload.userName}: ${payload.message}`);
          }
        }
      })
      .on('broadcast', { event: 'activity' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            userId: payload.userId,
            userEmail: payload.userEmail,
            userName: payload.userName,
            message: payload.activity,
            timestamp: new Date(payload.timestamp),
            type: 'activity',
          }]);
        }
      });

    // Subscribe to channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track our presence
        await channel.track({
          user_id: user.id,
          email: user.email,
          display_name: user.email?.split('@')[0],
          activity: 'Viewing student profile',
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user, studentId, notificationsEnabled]);

  const sendMessage = () => {
    if (!newMessage.trim() || !user) return;

    const channelName = `student-collab-${studentId}`;
    const channel = supabase.channel(channelName);

    channel.send({
      type: 'broadcast',
      event: 'message',
      payload: {
        userId: user.id,
        userEmail: user.email,
        userName: user.email?.split('@')[0],
        message: newMessage,
        timestamp: new Date().toISOString(),
      },
    });

    // Add to local messages
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      userId: user.id,
      userEmail: user.email || '',
      userName: user.email?.split('@')[0] || 'You',
      message: newMessage,
      timestamp: new Date(),
      type: 'message',
    }]);

    setNewMessage('');
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    
    // In production, this would send an actual invite
    toast.success(`Invitation sent to ${inviteEmail}`);
    setInviteEmail('');
    setShowInvite(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <CardTitle className="text-sm">Collaboration</CardTitle>
                {collaborators.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {collaborators.length} online
                  </Badge>
                )}
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Online Collaborators */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Active Collaborators</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={() => setShowInvite(!showInvite)}
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  Invite
                </Button>
              </div>
              
              {/* Invite Input */}
              {showInvite && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="text-xs h-8"
                  />
                  <Button size="sm" className="h-8" onClick={handleInvite}>
                    Send
                  </Button>
                </div>
              )}

              {/* Collaborator Avatars */}
              <div className="flex flex-wrap gap-2">
                {currentCollaborator && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <div className="relative">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback 
                          className="text-xs text-white"
                          style={{ backgroundColor: currentCollaborator.color }}
                        >
                          {getInitials(currentCollaborator.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <Circle className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 fill-green-500 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">You</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[100px]">
                        {currentCollaborator.currentActivity}
                      </p>
                    </div>
                  </div>
                )}
                
                {collaborators.filter(c => c.id !== user?.id).map(collab => (
                  <div key={collab.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <div className="relative">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback 
                          className="text-xs text-white"
                          style={{ backgroundColor: collab.color }}
                        >
                          {getInitials(collab.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      {collab.isOnline && (
                        <Circle className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 fill-green-500 text-green-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{collab.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[100px]">
                        {collab.currentActivity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Activity Feed</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  >
                    {notificationsEnabled ? (
                      <Bell className="w-3 h-3" />
                    ) : (
                      <BellOff className="w-3 h-3 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[150px] border rounded-lg p-2">
                {messages.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No activity yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {messages.map(msg => (
                      <div key={msg.id} className="flex items-start gap-2">
                        <div className="flex-1">
                          {msg.type === 'message' ? (
                            <div className="text-xs">
                              <span className="font-medium">{msg.userName}:</span>{' '}
                              <span>{msg.message}</span>
                            </div>
                          ) : msg.type === 'activity' ? (
                            <div className="text-xs text-muted-foreground italic">
                              <Eye className="w-3 h-3 inline mr-1" />
                              {msg.userName} {msg.message}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground italic">
                              {msg.userName} {msg.message}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Send a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  className="text-xs h-8"
                />
                <Button size="sm" className="h-8" onClick={sendMessage}>
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
