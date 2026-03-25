import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Heart, Sparkles, Star, TrendingDown, TrendingUp, Minus,
  Lightbulb, Home, CheckCircle2, Gift, MessageSquare,
  Send, Loader2, BarChart3, Calendar, Users, Clock
} from 'lucide-react';

const db = supabase as any;

export default function ParentPortal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  // Load linked students
  useEffect(() => {
    if (!user) return;
    db.from('student_parent_links')
      .select('student_id, relationship_label, students:student_id(id, first_name, last_name)')
      .eq('parent_user_id', user.id)
      .eq('is_active', true)
      .then(({ data }: any) => {
        const students = (data || []).map((l: any) => ({
          id: l.student_id,
          name: `${l.students?.first_name || ''} ${l.students?.last_name || ''}`.trim(),
          relationship: l.relationship_label,
        }));
        setLinkedStudents(students);
        if (students.length > 0 && !selectedStudentId) {
          setSelectedStudentId(students[0].id);
        }
        setLoading(false);
      });
  }, [user]);

  // Load insights for selected student
  useEffect(() => {
    if (!selectedStudentId) return;
    db.from('parent_insights')
      .select('*')
      .eq('student_id', selectedStudentId)
      .in('status', ['published', 'reviewed'])
      .order('insight_date', { ascending: false })
      .limit(30)
      .then(({ data }: any) => setInsights(data || []));
  }, [selectedStudentId]);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!selectedStudentId) return;
    const { data } = await db
      .from('parent_messages')
      .select('*')
      .eq('student_id', selectedStudentId)
      .order('created_at', { ascending: false })
      .limit(50);
    setMessages((data || []).reverse());
  }, [selectedStudentId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  async function sendReply() {
    if (!replyText.trim() || !selectedStudentId || !user || sending) return;
    setSending(true);
    const student = linkedStudents.find(s => s.id === selectedStudentId);
    const { error } = await db.from('parent_messages').insert({
      student_id: selectedStudentId,
      agency_id: null, // will need to resolve
      sender_type: 'parent',
      sender_name: user.email?.split('@')[0] || 'Parent',
      sender_user_id: user.id,
      message_text: replyText.trim(),
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sent!' });
      setReplyText('');
      loadMessages();
    }
    setSending(false);
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (linkedStudents.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <Users className="w-10 h-10 text-muted-foreground mx-auto" />
            <h2 className="font-bold text-lg">No Students Linked</h2>
            <p className="text-sm text-muted-foreground">
              Your account isn't linked to any students yet. Contact your child's school to get connected.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedStudent = linkedStudents.find(s => s.id === selectedStudentId);
  const latestInsight = insights[0];
  const firstName = selectedStudent?.name?.split(' ')[0] || 'Your child';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Parent Portal</span>
            </div>
            <h1 className="text-xl font-bold">{firstName}'s Progress</h1>
          </div>
          {linkedStudents.length > 1 && (
            <select
              value={selectedStudentId || ''}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-1.5 text-sm"
            >
              {linkedStudents.map(s => (
                <option key={s.id} value={s.id} className="text-foreground">{s.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Tabs defaultValue="insights">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="insights" className="gap-1">
              <Sparkles className="w-4 h-4" /> Insights
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1">
              <MessageSquare className="w-4 h-4" /> Messages
              {messages.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{messages.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1">
              <Calendar className="w-4 h-4" /> History
            </TabsTrigger>
          </TabsList>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-3 mt-3">
            {latestInsight ? (
              <>
                <Card className="shadow-md border-0">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <h3 className="font-bold text-foreground">Latest Update</h3>
                      <Badge variant="outline" className="text-[10px] ml-auto">{latestInsight.insight_date}</Badge>
                    </div>
                    <p className="text-base font-semibold text-foreground mb-2">{latestInsight.headline}</p>
                    {latestInsight.points_earned > 0 && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>Earned <strong className="text-foreground">{latestInsight.points_earned} points</strong></span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {(latestInsight.behavior_summary || []).length > 0 && (
                  <Card className="shadow-sm border-0">
                    <CardHeader className="py-3 px-5">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-amber-500" /> How Things Are Going
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 pb-4 px-5 space-y-2">
                      {latestInsight.behavior_summary.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span>{item.label || item.behavior}</span>
                          <span className={`flex items-center gap-1 text-xs ${
                            item.trend === 'improving' ? 'text-emerald-600' :
                            item.trend === 'worsening' ? 'text-orange-600' : 'text-muted-foreground'
                          }`}>
                            {item.trend === 'improving' ? <TrendingDown className="w-3.5 h-3.5" /> :
                             item.trend === 'worsening' ? <TrendingUp className="w-3.5 h-3.5" /> :
                             <Minus className="w-3.5 h-3.5" />}
                            {item.trend === 'improving' ? 'Improving' :
                             item.trend === 'worsening' ? 'Needs support' : 'Stable'}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {latestInsight.what_this_means && (
                  <Card className="shadow-sm border-0 border-l-4 border-l-blue-400">
                    <CardContent className="py-4 px-5">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="font-semibold text-sm mb-1">What This Means</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">{latestInsight.what_this_means}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {(latestInsight.what_you_can_do || []).length > 0 && (
                  <Card className="shadow-sm border-0 border-l-4 border-l-emerald-400">
                    <CardContent className="py-4 px-5">
                      <div className="flex items-start gap-3">
                        <Home className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-2">What You Can Do at Home</h4>
                          <ul className="space-y-1.5">
                            {latestInsight.what_you_can_do.map((tip: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="shadow-sm border-0">
                <CardContent className="py-8 text-center">
                  <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No insights available yet. Check back soon!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-3 mt-3">
            <Card className="shadow-sm border-0">
              <CardContent className="py-4 px-5 space-y-3">
                {/* Message thread */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No messages yet. Send a note to your child's teacher!
                    </p>
                  ) : (
                    messages.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`text-sm rounded-lg p-3 ${
                          msg.sender_type === 'parent'
                            ? 'bg-amber-50 ml-8'
                            : 'bg-muted mr-8'
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-0.5 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {msg.sender_type === 'parent' ? 'You' : 'Teacher'}
                          </span>
                          · {new Date(msg.created_at).toLocaleDateString()}
                        </div>
                        <p>{msg.message_text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Reply box */}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Textarea
                    placeholder="Type a message..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="min-h-[60px] text-sm resize-none"
                    maxLength={500}
                  />
                  <Button
                    size="icon"
                    disabled={!replyText.trim() || sending}
                    onClick={sendReply}
                    className="shrink-0 self-end"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-3 mt-3">
            {insights.length === 0 ? (
              <Card className="shadow-sm border-0">
                <CardContent className="py-8 text-center">
                  <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No history yet.</p>
                </CardContent>
              </Card>
            ) : (
              insights.map((ins: any) => (
                <Card key={ins.id} className="shadow-sm border-0">
                  <CardContent className="py-3 px-5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{ins.insight_date}</span>
                      <Badge variant="outline" className="text-[10px]">{ins.insight_type}</Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground">{ins.headline}</p>
                    {ins.points_earned > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Star className="w-3 h-3 text-yellow-500" />
                        {ins.points_earned} points earned
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
