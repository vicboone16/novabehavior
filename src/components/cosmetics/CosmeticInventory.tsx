import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Sparkles, Crown, Flame, Award, Palette, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const db = supabase as any;

const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  avatar: { icon: Crown, label: 'Avatars', color: 'text-amber-500' },
  trail: { icon: Flame, label: 'Trails', color: 'text-orange-500' },
  badge: { icon: Award, label: 'Badges', color: 'text-blue-500' },
  theme: { icon: Palette, label: 'Themes', color: 'text-purple-500' },
};

interface Props {
  studentId: string;
}

export function CosmeticInventory({ studentId }: Props) {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [unlocks, setUnlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('avatar');
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      db.from('unlock_catalog').select('*').eq('active', true).order('unlock_type'),
      db.from('student_unlocks').select('*').eq('student_id', studentId),
    ]).then(([catRes, unlRes]: any[]) => {
      setCatalog(catRes.data || []);
      setUnlocks(unlRes.data || []);
      setLoading(false);
    });
  }, [studentId]);

  const unlockedIds = new Set(unlocks.map((u: any) => u.unlock_id));
  const activeIds = new Set(unlocks.filter((u: any) => u.active).map((u: any) => u.unlock_id));

  async function handleEquip(unlockId: string) {
    try {
      // Unequip others of same type
      const item = catalog.find(c => c.id === unlockId);
      if (!item) return;
      const sameType = unlocks.filter((u: any) => {
        const catItem = catalog.find(c => c.id === u.unlock_id);
        return catItem?.unlock_type === item.unlock_type && u.active;
      });
      for (const u of sameType) {
        await db.from('student_unlocks').update({ active: false }).eq('id', u.id);
      }
      // Equip selected
      await db.from('student_unlocks').update({ active: true }).eq('student_id', studentId).eq('unlock_id', unlockId);
      // Refresh
      const { data } = await db.from('student_unlocks').select('*').eq('student_id', studentId);
      setUnlocks(data || []);
      toast({ title: 'Equipped!', description: `${item.name} is now active.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  const types = Object.keys(TYPE_CONFIG);

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Cosmetic Inventory
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-3">
            {types.map(t => {
              const cfg = TYPE_CONFIG[t];
              const Icon = cfg.icon;
              return (
                <TabsTrigger key={t} value={t} className="text-xs gap-1">
                  <Icon className={`w-3 h-3 ${cfg.color}`} />
                  {cfg.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {types.map(t => {
            const items = catalog.filter(c => c.unlock_type === t);
            return (
              <TabsContent key={t} value={t}>
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No {t} items available yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {items.map(item => {
                      const isUnlocked = unlockedIds.has(item.id);
                      const isActive = activeIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          className={`relative rounded-lg border p-3 text-center transition-all ${
                            isActive ? 'border-primary bg-primary/5 ring-1 ring-primary/30' :
                            isUnlocked ? 'border-border bg-card hover:border-primary/50' :
                            'border-border bg-muted/30 opacity-50'
                          }`}
                        >
                          <div className="text-2xl mb-1">{item.config_json?.emoji || '🎁'}</div>
                          <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                          {item.requirement_value > 0 && !isUnlocked && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {item.requirement_type === 'points' ? `${item.requirement_value} pts` : `${item.requirement_value} streak`}
                            </p>
                          )}
                          {isUnlocked && !isActive && (
                            <Button size="sm" variant="ghost" className="mt-1 h-6 text-[10px]" onClick={() => handleEquip(item.id)}>
                              Equip
                            </Button>
                          )}
                          {isActive && (
                            <Badge className="mt-1 text-[10px] gap-0.5 bg-primary/10 text-primary border-0">
                              <Check className="w-2.5 h-2.5" /> Active
                            </Badge>
                          )}
                          {!isUnlocked && (
                            <Badge variant="outline" className="mt-1 text-[10px]">🔒 Locked</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
