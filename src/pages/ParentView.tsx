import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles, Star, TrendingDown, TrendingUp, Minus,
  Lightbulb, Home, Heart, CheckCircle2, Gift,
  MessageSquare, Send, Loader2, ThumbsUp, HelpCircle,
  Eye, ShieldCheck, BarChart3
} from 'lucide-react';

interface ParentData {
  student: { first_name: string; id: string };
  insight: any;
  rewards: { balance: number };
  messages: any[];
  parent_name: string | null;
}

const QUICK_REPLIES = [
  { key: 'thanks', label: "Thanks, we'll reinforce this at home", icon: ThumbsUp },
  { key: 'noticed', label: "We noticed this too", icon: Eye },
  { key: 'tell_more', label: "Can you tell me more?", icon: HelpCircle },
];

export default function ParentView() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { toast } = useToast();

  const [data, setData] = useState<ParentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

  const resolve = useCallback(async () => {
    if (!token) { setError('No access token provided.'); setLoading(false); return; }
    try {
      const { data: res, error: err } = await supabase.functions.invoke('parent-link-gateway', {
        body: { action: 'resolve', token },
      });
      if (err) throw err;
      if (res?.error) throw new Error(res.error);
      setData(res);
    } catch (e: any) {
      setError(e.message || 'Unable to load. This link may have expired.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { resolve(); }, [resolve]);

  async function sendMessage(text: string, isQuick = false, quickKey?: string) {
    if (!token || sending) return;
    setSending(true);
    try {
      const { data: res, error: err } = await supabase.functions.invoke('parent-link-gateway', {
        body: {
          action: 'send_message',
          token,
          message_text: text,
          is_quick_reply: isQuick,
          quick_reply_key: quickKey,
        },
      });
      if (err) throw err;
      if (res?.error) throw new Error(res.error);
      toast({ title: 'Message sent!', description: 'Your teacher will see this.' });
      setReplyText('');
      resolve(); // refresh messages
    } catch (e: any) {
      toast({ title: 'Couldn\'t send', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }

  async function handlePraise() {
    if (!token || sending) return;
    setSending(true);
    try {
      const { error: err } = await supabase.functions.invoke('parent-link-gateway', {
        body: { action: 'praise', token },
      });
      if (err) throw err;
      toast({ title: '🌟 Praise sent!', description: 'Your child\'s teacher will see this.' });
      resolve();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <ShieldCheck className="w-10 h-10 text-muted-foreground mx-auto" />
            <h2 className="font-bold text-lg">Link Unavailable</h2>
            <p className="text-sm text-muted-foreground">{error || 'This link is no longer valid.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { student, insight, rewards, messages } = data;
  const firstName = student.first_name;
  const behaviorSummary = insight?.behavior_summary || [];
  const whatThisMeans = insight?.what_this_means;
  const whatYouCanDo = insight?.what_you_can_do || [];
  const headline = insight?.headline || `${firstName} is doing great!`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-5 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">Progress Update</span>
          </div>
          <h1 className="text-xl font-bold">{firstName}'s Day</h1>
          {data.parent_name && (
            <p className="text-sm opacity-80 mt-0.5">Hello, {data.parent_name}!</p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 pb-8 space-y-3">
        {/* Today's Progress */}
        <Card className="shadow-md border-0">
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-foreground">Today's Highlights</h3>
            </div>
            <p className="text-base font-semibold text-foreground mb-2">{headline}</p>
            {rewards.balance > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Star className="w-4 h-4 text-yellow-500" />
                <span>{firstName} has <strong className="text-foreground">{rewards.balance} points</strong> saved up</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Behavior Summary */}
        {behaviorSummary.length > 0 && (
          <Card className="shadow-sm border-0">
            <CardHeader className="py-3 px-5">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                How Things Are Going
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-4 px-5 space-y-2">
              {behaviorSummary.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{item.label || item.behavior}</span>
                  <div className="flex items-center gap-1">
                    {item.trend === 'improving' ? (
                      <><TrendingDown className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-600 text-xs">Improving</span></>
                    ) : item.trend === 'worsening' ? (
                      <><TrendingUp className="w-3.5 h-3.5 text-orange-500" /><span className="text-orange-600 text-xs">Needs support</span></>
                    ) : (
                      <><Minus className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-muted-foreground text-xs">Stable</span></>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* What This Means */}
        {whatThisMeans && (
          <Card className="shadow-sm border-0 border-l-4 border-l-blue-400">
            <CardContent className="py-4 px-5">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm text-foreground mb-1">What This Means</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{whatThisMeans}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* What You Can Do */}
        {whatYouCanDo.length > 0 && (
          <Card className="shadow-sm border-0 border-l-4 border-l-emerald-400">
            <CardContent className="py-4 px-5">
              <div className="flex items-start gap-3">
                <Home className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-foreground mb-2">What You Can Do at Home</h4>
                  <ul className="space-y-1.5">
                    {whatYouCanDo.map((tip: string, i: number) => (
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

        {/* Praise Button */}
        <Button
          onClick={handlePraise}
          disabled={sending}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md h-12 text-base gap-2"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-5 h-5" />}
          Praise at Home 🌟
        </Button>

        {/* Messages Section */}
        <Card className="shadow-sm border-0">
          <CardHeader className="py-3 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-500" />
                Questions or Updates?
              </CardTitle>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowMessages(!showMessages)}>
                  {showMessages ? 'Hide' : `${messages.length} message${messages.length !== 1 ? 's' : ''}`}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="py-0 pb-4 px-5 space-y-3">
            {/* Quick replies */}
            <div className="flex flex-wrap gap-2">
              {QUICK_REPLIES.map(qr => (
                <Button
                  key={qr.key}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 gap-1"
                  disabled={sending}
                  onClick={() => sendMessage(qr.label, true, qr.key)}
                >
                  <qr.icon className="w-3 h-3" />
                  {qr.label}
                </Button>
              ))}
            </div>

            {/* Free text */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Type a message to the teacher..."
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                className="min-h-[60px] text-sm resize-none"
                maxLength={500}
              />
              <Button
                size="icon"
                disabled={!replyText.trim() || sending}
                onClick={() => sendMessage(replyText.trim())}
                className="shrink-0 self-end"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>

            {/* Message history */}
            {showMessages && messages.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border max-h-[300px] overflow-y-auto">
                {messages.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`text-xs rounded-lg p-2.5 ${
                      msg.sender_type === 'parent'
                        ? 'bg-amber-50 ml-8 text-foreground'
                        : 'bg-muted mr-8 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="font-medium">
                        {msg.sender_type === 'parent' ? (msg.sender_name || 'You') : 'Teacher'}
                      </span>
                      <span className="text-muted-foreground">
                        · {new Date(msg.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p>{msg.message_text}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CTA: Upgrade to parent app */}
        <Card className="shadow-sm border-0 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="py-4 px-5 text-center space-y-2">
            <Gift className="w-6 h-6 text-primary mx-auto" />
            <h4 className="font-semibold text-sm text-foreground">Want more updates like this?</h4>
            <p className="text-xs text-muted-foreground">
              Get full insight history, deeper progress tracking, and reward visibility in the parent app.
            </p>
            <Button variant="outline" size="sm" className="mt-1">
              Continue in Parent App →
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground pt-2">
          This is a secure, student-specific update. No login required.
        </p>
      </div>
    </div>
  );
}
