import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ChevronDown, ChevronUp, Copy, FileText, Loader2, AlertCircle,
  GraduationCap, Zap, Home, ClipboardCheck, BarChart3, Printer, Save,
  Package,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* ── types ── */

interface StrategyData {
  id: string;
  strategy_name: string;
  strategy_group: string | null;
  category: string | null;
  description: string | null;
  teacher_quick_version: string | null;
  family_version: string | null;
  data_to_collect: any;
  fidelity_tips: any;
  staff_scripts: any;
  implementation_notes: string | null;
  evidence_level: string | null;
}

type PacketType = 'teacher' | 'quickguide' | 'caregiver' | 'fidelity' | 'datacollection';

interface InterventionPacketsProps {
  reportId: string;
  reportType?: string;
  studentName?: string;
  studentId?: string;
  /** Directly provide strategies instead of fetching from report_strategy_selections */
  strategies?: StrategyData[];
}

/* ── helpers ── */

function jsonToList(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(v => typeof v === 'string' ? v : JSON.stringify(v));
  if (typeof val === 'object') return Object.values(val).map(v => String(v));
  if (typeof val === 'string') return [val];
  return [];
}

function formatLabel(s: string) {
  return s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  } catch { toast.error('Failed to copy'); }
}

function printContent(title: string, body: string) {
  const win = window.open('', '_blank');
  if (!win) return;
  const sanitizedBody = DOMPurify.sanitize(body, { ALLOWED_TAGS: ['h1','h2','h3','p','ul','ol','li','div','span','table','thead','tbody','tr','th','td','br','strong','em','b','i'], ALLOWED_ATTR: ['class'] });
  win.document.write(`<html><head><title>${DOMPurify.sanitize(title)}</title>
    <style>
      body{font-family:system-ui,sans-serif;padding:32px;line-height:1.6;font-size:13px;max-width:800px;margin:0 auto}
      h1{font-size:18px;border-bottom:2px solid #333;padding-bottom:8px}
      h2{font-size:15px;margin-top:20px}
      h3{font-size:13px;margin-top:16px;color:#555}
      .strategy-block{margin:16px 0;padding:12px;border:1px solid #ddd;border-radius:8px}
      .checklist-item{display:flex;gap:8px;margin:4px 0}
      .checkbox{width:14px;height:14px;border:1.5px solid #333;border-radius:2px;flex-shrink:0;margin-top:3px}
      ul{padding-left:20px}li{margin:2px 0}
      .meta{color:#666;font-size:11px}
      .notes-area{border:1px dashed #ccc;min-height:60px;margin-top:8px;border-radius:4px;padding:8px}
      table{width:100%;border-collapse:collapse;margin:8px 0}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;font-size:12px}
      th{background:#f5f5f5}
    </style>
  </head><body>${sanitizedBody}</body></html>`);
  win.document.close();
  win.print();
}

/* ── packet generators ── */

function generateTeacherSheet(strategies: StrategyData[], studentName?: string): string {
  const lines: string[] = [];
  lines.push(`TEACHER IMPLEMENTATION SHEET`);
  if (studentName) lines.push(`Student: ${studentName}`);
  lines.push(`Date: ${new Date().toLocaleDateString()}`);
  lines.push(`${'═'.repeat(50)}`);
  lines.push('');

  strategies.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.strategy_name}`);
    if (s.strategy_group) lines.push(`   Category: ${formatLabel(s.strategy_group)}`);
    if (s.evidence_level) lines.push(`   Evidence: ${formatLabel(s.evidence_level)}`);
    lines.push('');
    if (s.description) lines.push(`   WHY: ${s.description}`);
    if (s.teacher_quick_version) lines.push(`   WHAT TO DO: ${s.teacher_quick_version}`);
    if (s.implementation_notes) lines.push(`   WHEN: ${s.implementation_notes}`);

    const scripts = jsonToList(s.staff_scripts);
    if (scripts.length) {
      lines.push(`   WHAT TO SAY:`);
      scripts.forEach(sc => lines.push(`     • "${sc}"`));
    }

    const data = jsonToList(s.data_to_collect);
    if (data.length) {
      lines.push(`   DATA TO COLLECT:`);
      data.forEach(d => lines.push(`     • ${d}`));
    }

    const tips = jsonToList(s.fidelity_tips);
    if (tips.length) {
      lines.push(`   COMMON MISTAKES TO AVOID:`);
      tips.forEach(t => lines.push(`     ✗ ${t}`));
    }
    lines.push('');
    lines.push(`${'─'.repeat(50)}`);
    lines.push('');
  });

  return lines.join('\n');
}

function generateQuickGuide(strategies: StrategyData[], studentName?: string): string {
  const lines: string[] = [];
  lines.push('CLASSROOM QUICK GUIDE');
  if (studentName) lines.push(`Student: ${studentName}`);
  lines.push(`Date: ${new Date().toLocaleDateString()}`);
  lines.push('');
  lines.push('Use this guide during the school day for quick reference.');
  lines.push(`${'─'.repeat(40)}`);
  lines.push('');

  strategies.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.strategy_name}`);
    if (s.teacher_quick_version) {
      lines.push(`   → ${s.teacher_quick_version}`);
    } else if (s.description) {
      const short = s.description.length > 120 ? s.description.slice(0, 120) + '…' : s.description;
      lines.push(`   → ${short}`);
    }

    const scripts = jsonToList(s.staff_scripts);
    if (scripts.length > 0) {
      lines.push(`   Say: "${scripts[0]}"`);
    }

    const data = jsonToList(s.data_to_collect);
    if (data.length > 0) {
      lines.push(`   Log: ${data.slice(0, 2).join(', ')}`);
    }
    lines.push('');
  });

  lines.push(`${'─'.repeat(40)}`);
  lines.push('REMINDERS:');
  lines.push('• Stay consistent across all settings');
  lines.push('• Reinforce immediately after desired behavior');
  lines.push('• Log data as close to the event as possible');

  return lines.join('\n');
}

function generateCaregiverHandout(strategies: StrategyData[], studentName?: string): string {
  const lines: string[] = [];
  lines.push('HOME SUPPORT GUIDE');
  if (studentName) lines.push(`For the family of: ${studentName}`);
  lines.push(`Date: ${new Date().toLocaleDateString()}`);
  lines.push('');
  lines.push('Your child\'s team is using these strategies at school. Here\'s how you can help at home to keep things consistent.');
  lines.push('');
  lines.push(`${'─'.repeat(40)}`);
  lines.push('');

  strategies.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.strategy_name}`);
    lines.push('');

    if (s.family_version) {
      lines.push(`   At home: ${s.family_version}`);
    } else if (s.teacher_quick_version) {
      lines.push(`   What we do at school: ${s.teacher_quick_version}`);
      lines.push(`   At home: Try using a similar approach when you notice the same behavior.`);
    } else if (s.description) {
      lines.push(`   About: ${s.description}`);
    }

    lines.push('');
    lines.push('   ✓ DO:');
    lines.push('     • Praise your child when they use the new skill');
    lines.push('     • Stay calm and consistent');
    if (s.family_version) lines.push(`     • ${s.family_version.split('.')[0]}`);

    lines.push('   ✗ AVOID:');
    lines.push('     • Giving in during the difficult moment');
    lines.push('     • Using different rules than school');
    lines.push('');
    lines.push(`${'─'.repeat(40)}`);
    lines.push('');
  });

  lines.push('Questions? Contact your child\'s team for guidance.');
  lines.push('Consistency between home and school is the strongest predictor of success.');

  return lines.join('\n');
}

function generateFidelityChecklist(strategies: StrategyData[], studentName?: string): string {
  const lines: string[] = [];
  lines.push('FIDELITY CHECKLIST');
  if (studentName) lines.push(`Student: ${studentName}`);
  lines.push(`Observer: ________________  Date: ________________`);
  lines.push('');
  lines.push(`${'─'.repeat(50)}`);

  strategies.forEach((s, i) => {
    lines.push('');
    lines.push(`Strategy ${i + 1}: ${s.strategy_name}`);
    lines.push('');

    // Generate checklist items from fidelity tips + implementation
    const items: string[] = [];
    if (s.teacher_quick_version) items.push(`Implements core procedure: ${s.teacher_quick_version.split('.')[0]}`);
    if (s.implementation_notes) items.push(`Follows timing/context: ${s.implementation_notes.split('.')[0]}`);
    
    const tips = jsonToList(s.fidelity_tips);
    tips.forEach(t => items.push(t));

    const scripts = jsonToList(s.staff_scripts);
    if (scripts.length) items.push('Uses appropriate staff scripts/language');

    const data = jsonToList(s.data_to_collect);
    if (data.length) items.push('Collects required data');

    // Always have at least basic items
    if (items.length === 0) {
      items.push('Strategy is implemented as described');
      items.push('Appropriate timing and context');
      items.push('Consistent delivery across opportunities');
    }

    items.forEach(item => {
      lines.push(`  [ ] Observed  [ ] Not Observed  │ ${item}`);
    });

    lines.push('');
    lines.push(`  Notes: ________________________________________________`);
    lines.push(`${'─'.repeat(50)}`);
  });

  lines.push('');
  lines.push('Overall Fidelity Rating:  [ ] High  [ ] Moderate  [ ] Low  [ ] Not Implemented');
  lines.push('');
  lines.push(`Observer Signature: ________________  Date: ________________`);

  return lines.join('\n');
}

function generateDataCollectionSheet(strategies: StrategyData[], studentName?: string): string {
  const lines: string[] = [];
  lines.push('DATA COLLECTION REFERENCE');
  if (studentName) lines.push(`Student: ${studentName}`);
  lines.push(`Date: ${new Date().toLocaleDateString()}`);
  lines.push('');
  lines.push(`${'─'.repeat(50)}`);
  lines.push('');

  const allDataPoints: { strategy: string; metric: string }[] = [];

  strategies.forEach((s, i) => {
    const data = jsonToList(s.data_to_collect);
    if (data.length) {
      data.forEach(d => allDataPoints.push({ strategy: s.strategy_name, metric: d }));
    } else {
      allDataPoints.push({ strategy: s.strategy_name, metric: 'Frequency count or duration as appropriate' });
    }
  });

  lines.push('WHAT TO TRACK:');
  lines.push('');
  allDataPoints.forEach((dp, i) => {
    lines.push(`${i + 1}. ${dp.metric}`);
    lines.push(`   Strategy: ${dp.strategy}`);
    lines.push(`   Where to log: NovaTrack / Beacon data entry`);
    lines.push('');
  });

  lines.push(`${'─'.repeat(50)}`);
  lines.push('');
  lines.push('QUICK LOGGING REMINDERS:');
  lines.push('• Log data as soon as possible after the behavior');
  lines.push('• Include antecedent and consequence when possible');
  lines.push('• Use frequency, duration, or latency as specified above');
  lines.push('• If unsure, note what happened and ask your supervisor');
  lines.push('');
  lines.push(`Additional Notes: ________________________________________________`);

  return lines.join('\n');
}

/* ── print HTML generators ── */

function teacherSheetHTML(strategies: StrategyData[], studentName?: string): string {
  return `<h1>Teacher Implementation Sheet</h1>
    ${studentName ? `<p class="meta">Student: ${studentName} | Date: ${new Date().toLocaleDateString()}</p>` : ''}
    ${strategies.map((s, i) => `
      <div class="strategy-block">
        <h2>${i + 1}. ${s.strategy_name}</h2>
        ${s.strategy_group ? `<span class="meta">${formatLabel(s.strategy_group)}</span>` : ''}
        ${s.description ? `<h3>Why This Strategy</h3><p>${s.description}</p>` : ''}
        ${s.teacher_quick_version ? `<h3>What To Do</h3><p>${s.teacher_quick_version}</p>` : ''}
        ${s.implementation_notes ? `<h3>When To Use</h3><p>${s.implementation_notes}</p>` : ''}
        ${jsonToList(s.staff_scripts).length ? `<h3>What To Say</h3><ul>${jsonToList(s.staff_scripts).map(sc => `<li>"${sc}"</li>`).join('')}</ul>` : ''}
        ${jsonToList(s.data_to_collect).length ? `<h3>Data To Collect</h3><ul>${jsonToList(s.data_to_collect).map(d => `<li>${d}</li>`).join('')}</ul>` : ''}
        ${jsonToList(s.fidelity_tips).length ? `<h3>Watch Out For</h3><ul>${jsonToList(s.fidelity_tips).map(t => `<li>${t}</li>`).join('')}</ul>` : ''}
      </div>
    `).join('')}`;
}

function fidelityHTML(strategies: StrategyData[], studentName?: string): string {
  return `<h1>Fidelity Checklist</h1>
    ${studentName ? `<p class="meta">Student: ${studentName}</p>` : ''}
    <p class="meta">Observer: ______________ Date: ______________</p>
    ${strategies.map((s, i) => {
      const items: string[] = [];
      if (s.teacher_quick_version) items.push(`Implements: ${s.teacher_quick_version.split('.')[0]}`);
      jsonToList(s.fidelity_tips).forEach(t => items.push(t));
      if (jsonToList(s.staff_scripts).length) items.push('Uses appropriate scripts');
      if (jsonToList(s.data_to_collect).length) items.push('Collects data');
      if (!items.length) items.push('Strategy implemented as described', 'Consistent delivery');
      return `<div class="strategy-block">
        <h2>${i + 1}. ${s.strategy_name}</h2>
        ${items.map(item => `<div class="checklist-item"><div class="checkbox"></div><span>${item}</span></div>`).join('')}
        <div class="notes-area"><span class="meta">Notes:</span></div>
      </div>`;
    }).join('')}
    <p><strong>Overall:</strong> [ ] High [ ] Moderate [ ] Low [ ] Not Implemented</p>`;
}

/* ── packet config ── */

const PACKET_CONFIG: Record<PacketType, { label: string; icon: typeof FileText; desc: string }> = {
  teacher: { label: 'Teacher Sheet', icon: GraduationCap, desc: 'Full implementation guide for teachers' },
  quickguide: { label: 'Quick Guide', icon: Zap, desc: 'Short "use tomorrow morning" reference' },
  caregiver: { label: 'Caregiver Handout', icon: Home, desc: 'Home support guide for families' },
  fidelity: { label: 'Fidelity Checklist', icon: ClipboardCheck, desc: 'Strategy implementation verification' },
  datacollection: { label: 'Data Sheet', icon: BarChart3, desc: 'What to track and how' },
};

/* ── main component ── */

export function InterventionPackets({
  reportId,
  reportType,
  studentName,
  studentId,
  strategies: directStrategies,
}: InterventionPacketsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [strategies, setStrategies] = useState<StrategyData[]>([]);
  const [activePacket, setActivePacket] = useState<PacketType>('teacher');

  const fetchStrategies = useCallback(async () => {
    if (directStrategies?.length) {
      setStrategies(directStrategies);
      return;
    }
    if (!reportId) return;
    setLoading(true);
    try {
      // Try view first
      const { data: viewData } = await (supabase.from as any)('v_report_strategy_selections')
        .select('*')
        .eq('report_id', reportId)
        .order('sort_order');

      if (viewData?.length) {
        setStrategies(viewData.map((s: any) => ({
          id: s.strategy_id || s.id,
          strategy_name: s.strategy_name || 'Unknown',
          strategy_group: s.strategy_group,
          category: s.category,
          description: s.description,
          teacher_quick_version: s.teacher_quick_version,
          family_version: s.family_version,
          data_to_collect: s.data_to_collect,
          fidelity_tips: s.fidelity_tips,
          staff_scripts: s.staff_scripts,
          implementation_notes: s.implementation_notes,
          evidence_level: s.evidence_level,
        })));
        return;
      }

      // Fallback: join
      const { data: sels } = await supabase
        .from('report_strategy_selections')
        .select('strategy_id')
        .eq('report_id', reportId);

      if (sels?.length) {
        const ids = sels.map((s: any) => s.strategy_id);
        const { data: strats } = await supabase
          .from('behavior_strategies')
          .select('*')
          .in('id', ids);
        setStrategies((strats || []).map((s: any) => ({
          id: s.id,
          strategy_name: s.strategy_name,
          strategy_group: s.strategy_group,
          category: s.category,
          description: s.description,
          teacher_quick_version: s.teacher_quick_version,
          family_version: s.family_version,
          data_to_collect: s.data_to_collect,
          fidelity_tips: s.fidelity_tips,
          staff_scripts: s.staff_scripts,
          implementation_notes: s.implementation_notes,
          evidence_level: s.evidence_level,
        })));
      } else {
        setStrategies([]);
      }
    } catch (err: any) {
      console.error('Failed to load strategies for packets:', err.message);
      setStrategies([]);
    } finally {
      setLoading(false);
    }
  }, [reportId, directStrategies]);

  useEffect(() => {
    if (isOpen) fetchStrategies();
  }, [isOpen, fetchStrategies]);

  const packetText = useMemo(() => {
    if (!strategies.length) return '';
    switch (activePacket) {
      case 'teacher': return generateTeacherSheet(strategies, studentName);
      case 'quickguide': return generateQuickGuide(strategies, studentName);
      case 'caregiver': return generateCaregiverHandout(strategies, studentName);
      case 'fidelity': return generateFidelityChecklist(strategies, studentName);
      case 'datacollection': return generateDataCollectionSheet(strategies, studentName);
      default: return '';
    }
  }, [strategies, activePacket, studentName]);

  const handlePrint = () => {
    let html: string;
    switch (activePacket) {
      case 'teacher': html = teacherSheetHTML(strategies, studentName); break;
      case 'fidelity': html = fidelityHTML(strategies, studentName); break;
      default: html = `<pre style="white-space:pre-wrap;font-family:system-ui">${packetText}</pre>`; break;
    }
    printContent(PACKET_CONFIG[activePacket].label, html);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-primary/20">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Intervention Packets
                {strategies.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{strategies.length} strategies</Badge>
                )}
              </CardTitle>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            <CardDescription className="text-xs">
              Generate staff-facing implementation sheets, quick guides, caregiver handouts, and fidelity checklists
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : strategies.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">No strategies selected yet.</p>
                <p className="text-xs text-muted-foreground">
                  Select strategies using the Suggested Strategies panel or Behavior Recommendations, then return here to generate packets.
                </p>
              </div>
            ) : (
              <Tabs value={activePacket} onValueChange={(v) => setActivePacket(v as PacketType)}>
                <TabsList className="w-full grid grid-cols-5">
                  {(Object.entries(PACKET_CONFIG) as [PacketType, typeof PACKET_CONFIG[PacketType]][]).map(([key, { label, icon: Icon }]) => (
                    <TabsTrigger key={key} value={key} className="text-[10px] gap-0.5 px-1">
                      <Icon className="h-3 w-3" />
                      <span className="hidden sm:inline">{label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {(Object.keys(PACKET_CONFIG) as PacketType[]).map(key => (
                  <TabsContent key={key} value={key} className="space-y-3 mt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{PACKET_CONFIG[key].label}</p>
                        <p className="text-xs text-muted-foreground">{PACKET_CONFIG[key].desc}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {strategies.length} {strategies.length === 1 ? 'strategy' : 'strategies'}
                      </Badge>
                    </div>

                    <ScrollArea className="h-[280px] border rounded-md p-3 bg-muted/30">
                      <pre className="text-xs whitespace-pre-wrap leading-relaxed font-sans">
                        {packetText}
                      </pre>
                    </ScrollArea>

                    <div className="flex flex-wrap gap-1.5">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => copyText(packetText)}>
                        <Copy className="h-3 w-3 mr-1" /> Copy
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handlePrint}>
                        <Printer className="h-3 w-3 mr-1" /> Print
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                        toast.success('Packet saved (preview)');
                      }}>
                        <Save className="h-3 w-3 mr-1" /> Save
                      </Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
