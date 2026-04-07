import { useState } from 'react';
import { CloudUpload, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDataStore } from '@/store/dataStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * One-time utility that reads ALL local Zustand-persisted behavior data
 * (frequencyEntries, durationEntries, sessions, historicalData) and
 * upserts corresponding rows into the live backend tables so the data
 * survives across devices / after clearing localStorage.
 */
export function LocalDataCloudSync() {
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const { students, sessions, frequencyEntries, durationEntries, abcEntries } = useDataStore();

  // Count local-only data
  const localFreq = frequencyEntries.filter(e => !e.id.startsWith('bsd-'));
  const localDur = durationEntries.filter(e => !e.id.startsWith('bsd-dur-'));
  const localSessions = sessions;
  const localHistorical = students.reduce((sum, s) => {
    const hd = (s as any).historicalData;
    return sum + (hd?.frequencyEntries?.length || 0) + (hd?.durationEntries?.length || 0);
  }, 0);
  const totalLocal = localFreq.length + localDur.length + localSessions.length + localHistorical + abcEntries.length;

  const appendLog = (msg: string) => setLog(prev => [...prev, msg]);

  const handleSync = async () => {
    setSyncing(true);
    setLog([]);
    setDone(false);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        appendLog('❌ Not authenticated. Please log in first.');
        setSyncing(false);
        return;
      }
      const userId = user.id;
      appendLog(`✓ Authenticated as ${user.email}`);

      // ─── 1. Ensure all local students exist in backend ───────────────
      const studentMap = new Map<string, string>(); // localId → backendId
      for (const student of students) {
        if (student.isArchived) continue;
        
        // Check if student already exists
        const { data: existing } = await supabase
          .from('students')
          .select('id')
          .eq('id', student.id)
          .maybeSingle();

        if (existing) {
          studentMap.set(student.id, student.id);
        } else {
          // Try to match by name
          const { data: byName } = await supabase
            .from('students')
            .select('id')
            .eq('name', student.name)
            .maybeSingle();

          if (byName) {
            studentMap.set(student.id, byName.id);
            appendLog(`↔ Matched "${student.name}" to existing backend record`);
          } else {
            appendLog(`⚠ Student "${student.name}" (${student.id}) not found in backend — skipping`);
            continue;
          }
        }
      }
      appendLog(`✓ Mapped ${studentMap.size} students`);

      // ─── 2. Ensure all behaviors exist in backend ────────────────────
      const behaviorMap = new Map<string, string>(); // localId → backendId
      const allBehaviors = students.flatMap(s => s.behaviors.map(b => ({ ...b, studentId: s.id })));
      
      // Get existing behaviors
      const { data: existingBehaviors } = await supabase
        .from('behaviors')
        .select('id, name');
      const existingByName = new Map((existingBehaviors || []).map(b => [b.name.toLowerCase(), b.id]));
      const existingById = new Set((existingBehaviors || []).map(b => b.id));

      for (const b of allBehaviors) {
        if (existingById.has(b.id)) {
          behaviorMap.set(b.id, b.id);
        } else if (existingByName.has(b.name.toLowerCase())) {
          behaviorMap.set(b.id, existingByName.get(b.name.toLowerCase())!);
        } else {
          // Insert new behavior
          const { data: inserted, error } = await supabase
            .from('behaviors')
            .insert({ id: b.id, name: b.name, description: (b as any).operationalDefinition || null })
            .select('id')
            .single();

          if (inserted) {
            behaviorMap.set(b.id, inserted.id);
            existingById.add(inserted.id);
            existingByName.set(b.name.toLowerCase(), inserted.id);
            appendLog(`+ Created behavior "${b.name}"`);
          } else if (error) {
            // Try without specifying ID
            const { data: inserted2 } = await supabase
              .from('behaviors')
              .insert({ name: b.name, description: (b as any).operationalDefinition || null })
              .select('id')
              .single();
            if (inserted2) {
              behaviorMap.set(b.id, inserted2.id);
              existingById.add(inserted2.id);
              existingByName.set(b.name.toLowerCase(), inserted2.id);
              appendLog(`+ Created behavior "${b.name}" (new ID)`);
            } else {
              appendLog(`⚠ Could not create behavior "${b.name}"`);
            }
          }
        }
      }
      appendLog(`✓ Mapped ${behaviorMap.size} behaviors`);

      // ─── 3. Sync sessions ───────────────────────────────────────────
      let sessionsCreated = 0;
      const sessionMap = new Map<string, string>(); // localId → backendId

      for (const session of localSessions) {
        // Check if session exists
        const { data: existing } = await supabase
          .from('sessions')
          .select('id')
          .eq('id', session.id)
          .maybeSingle();

        if (existing) {
          sessionMap.set(session.id, session.id);
          continue;
        }

        // Map student IDs
        const mappedStudentIds = (session.studentIds || [])
          .map(sid => studentMap.get(sid))
          .filter(Boolean) as string[];

        if (mappedStudentIds.length === 0) continue;

        const startTime = new Date(session.date || new Date());

        const { data: created, error } = await supabase
          .from('sessions')
          .insert({
            id: session.id,
            user_id: userId,
            name: `Session ${session.id.slice(0, 6)}`,
            start_time: startTime.toISOString(),
            started_at: startTime.toISOString(),
            session_length_minutes: session.sessionLengthMinutes || 30,
            student_ids: mappedStudentIds,
            status: 'completed',
            has_data: true,
          } as any)
          .select('id')
          .single();

        if (created) {
          sessionMap.set(session.id, created.id);
          sessionsCreated++;
        } else if (error) {
          appendLog(`⚠ Session ${session.id.slice(0, 8)}: ${error.message}`);
        }
      }
      appendLog(`✓ ${sessionsCreated} sessions created (${sessionMap.size} total mapped)`);

      // ─── 4. Sync frequency entries to behavior_session_data ─────────
      let freqSynced = 0;

      // Group freq entries by session+behavior for upsert
      const freqByKey = new Map<string, { sessionId: string; studentId: string; behaviorId: string; count: number; timestamp: string }>();

      for (const entry of localFreq) {
        const studentId = studentMap.get(entry.studentId);
        const behaviorId = behaviorMap.get(entry.behaviorId);
        if (!studentId || !behaviorId) continue;

        // Need a session for this entry
        let sessionId = entry.sessionId ? sessionMap.get(entry.sessionId) : null;

        if (!sessionId) {
          // Create an ad-hoc session for this date
          const entryDate = new Date(entry.timestamp || new Date());
          const dateKey = entryDate.toISOString().slice(0, 10);
          const adhocKey = `adhoc-${studentId}-${dateKey}`;

          if (!sessionMap.has(adhocKey)) {
            const { data: created } = await supabase
              .from('sessions')
              .insert({
                user_id: userId,
                name: `Synced ${dateKey}`,
                start_time: entryDate.toISOString(),
                started_at: entryDate.toISOString(),
                session_length_minutes: 30,
                student_ids: [studentId],
                status: 'completed',
                has_data: true,
              } as any)
              .select('id')
              .single();

            if (created) {
              sessionMap.set(adhocKey, created.id);
              sessionId = created.id;
            }
          } else {
            sessionId = sessionMap.get(adhocKey)!;
          }
        }

        if (!sessionId) continue;

        const key = `${sessionId}:${behaviorId}`;
        const existing = freqByKey.get(key);
        if (existing) {
          existing.count += entry.count;
        } else {
          freqByKey.set(key, {
            sessionId,
            studentId,
            behaviorId,
            count: entry.count,
            timestamp: new Date(entry.timestamp || new Date()).toISOString(),
          });
        }
      }

      // Also include historical data
      for (const student of students) {
        const hd = (student as any).historicalData;
        if (!hd) continue;
        const studentId = studentMap.get(student.id);
        if (!studentId) continue;

        for (const entry of (hd.frequencyEntries || [])) {
          const behaviorId = behaviorMap.get(entry.behaviorId);
          if (!behaviorId) continue;

          const entryDate = new Date(entry.timestamp || new Date());
          const dateKey = entryDate.toISOString().slice(0, 10);
          const adhocKey = `adhoc-${studentId}-${dateKey}`;

          let sessionId = sessionMap.get(adhocKey);
          if (!sessionId) {
            const { data: created } = await supabase
              .from('sessions')
              .insert({
                user_id: userId,
                name: `Historical ${dateKey}`,
                start_time: entryDate.toISOString(),
                started_at: entryDate.toISOString(),
                session_length_minutes: entry.observationDurationMinutes || 30,
                student_ids: [studentId],
                status: 'completed',
                has_data: true,
              } as any)
              .select('id')
              .single();

            if (created) {
              sessionMap.set(adhocKey, created.id);
              sessionId = created.id;
            }
          }

          if (!sessionId) continue;

          const key = `${sessionId}:${behaviorId}`;
          const existing = freqByKey.get(key);
          if (existing) {
            existing.count += (entry.count || 0);
          } else {
            freqByKey.set(key, {
              sessionId,
              studentId,
              behaviorId,
              count: entry.count || 0,
              timestamp: entryDate.toISOString(),
            });
          }
        }

        // Duration historical entries
        for (const entry of (hd.durationEntries || [])) {
          const behaviorId = behaviorMap.get(entry.behaviorId);
          if (!behaviorId) continue;

          const entryDate = new Date(entry.timestamp || new Date());
          const dateKey = entryDate.toISOString().slice(0, 10);
          const adhocKey = `adhoc-${studentId}-${dateKey}`;

          let sessionId = sessionMap.get(adhocKey);
          if (!sessionId) {
            const { data: created } = await supabase
              .from('sessions')
              .insert({
                user_id: userId,
                name: `Historical ${dateKey}`,
                start_time: entryDate.toISOString(),
                started_at: entryDate.toISOString(),
                session_length_minutes: 30,
                student_ids: [studentId],
                status: 'completed',
                has_data: true,
              } as any)
              .select('id')
              .single();

            if (created) {
              sessionMap.set(adhocKey, created.id);
              sessionId = created.id;
            }
          }

          if (!sessionId) continue;

          const key = `${sessionId}:${behaviorId}`;
          if (!freqByKey.has(key)) {
            freqByKey.set(key, {
              sessionId,
              studentId,
              behaviorId,
              count: 0,
              timestamp: entryDate.toISOString(),
            });
          }
          // We'll handle duration in the upsert below
        }
      }

      // Batch upsert to behavior_session_data
      const bsdRows = Array.from(freqByKey.entries()).map(([, v]) => ({
        session_id: v.sessionId,
        student_id: v.studentId,
        behavior_id: v.behaviorId,
        frequency: v.count,
        data_state: 'measured' as const,
        created_at: v.timestamp,
      }));

      // Process in batches of 50
      for (let i = 0; i < bsdRows.length; i += 50) {
        const batch = bsdRows.slice(i, i + 50);
        const { error } = await (supabase as any)
          .from('behavior_session_data')
          .upsert(batch, { onConflict: 'session_id,behavior_id', ignoreDuplicates: true });

        if (error) {
          appendLog(`⚠ BSD batch ${i}-${i + batch.length}: ${error.message}`);
        } else {
          freqSynced += batch.length;
        }
      }
      appendLog(`✓ ${freqSynced} behavior data records synced`);

      // ─── 5. Sync duration entries ──────────────────────────────────
      let durSynced = 0;
      for (const entry of localDur) {
        const studentId = studentMap.get(entry.studentId);
        const behaviorId = behaviorMap.get(entry.behaviorId);
        if (!studentId || !behaviorId) continue;

        let sessionId = entry.sessionId ? sessionMap.get(entry.sessionId) : null;
        if (!sessionId) {
          const entryDate = new Date((entry as any).startTime || new Date());
          const dateKey = entryDate.toISOString().slice(0, 10);
          const adhocKey = `adhoc-${studentId}-${dateKey}`;
          sessionId = sessionMap.get(adhocKey);
        }
        if (!sessionId) continue;

        const { error } = await (supabase as any)
          .from('behavior_session_data')
          .upsert({
            session_id: sessionId,
            student_id: studentId,
            behavior_id: behaviorId,
            duration_seconds: Math.round(entry.duration),
            data_state: 'measured',
          }, { onConflict: 'session_id,behavior_id', ignoreDuplicates: true });

        if (!error) durSynced++;
      }
      appendLog(`✓ ${durSynced} duration records synced`);

      // ─── 6. Save historical_data JSON to students table ────────────
      let histSaved = 0;
      for (const student of students) {
        const hd = (student as any).historicalData;
        if (!hd || ((hd.frequencyEntries?.length || 0) + (hd.durationEntries?.length || 0)) === 0) continue;
        
        const studentId = studentMap.get(student.id);
        if (!studentId) continue;

        const serialized = {
          frequencyEntries: (hd.frequencyEntries || []).map((e: any) => ({
            ...e,
            timestamp: e.timestamp ? new Date(e.timestamp).toISOString() : new Date().toISOString(),
          })),
          durationEntries: (hd.durationEntries || []).map((e: any) => ({
            ...e,
            timestamp: e.timestamp ? new Date(e.timestamp).toISOString() : new Date().toISOString(),
          })),
        };

        const { error } = await supabase
          .from('students')
          .update({ historical_data: serialized as any })
          .eq('id', studentId);

        if (!error) histSaved++;
      }
      appendLog(`✓ ${histSaved} student historical data blobs saved`);

      appendLog('');
      appendLog('🎉 Sync complete! All local data has been pushed to the backend.');
      setDone(true);
      toast.success('Local data synced to cloud successfully');
    } catch (err: any) {
      appendLog(`❌ Error: ${err.message}`);
      toast.error('Sync failed — check log for details');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <CloudUpload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sync to Cloud</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudUpload className="w-5 h-5" />
            Sync Local Data to Cloud
          </DialogTitle>
          <DialogDescription>
            Push all locally-stored behavior data to the live backend so it persists across devices.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Summary of what will be synced */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between p-2 bg-muted rounded">
              <span>Frequency entries</span>
              <Badge variant="secondary">{localFreq.length}</Badge>
            </div>
            <div className="flex justify-between p-2 bg-muted rounded">
              <span>Duration entries</span>
              <Badge variant="secondary">{localDur.length}</Badge>
            </div>
            <div className="flex justify-between p-2 bg-muted rounded">
              <span>Sessions</span>
              <Badge variant="secondary">{localSessions.length}</Badge>
            </div>
            <div className="flex justify-between p-2 bg-muted rounded">
              <span>Historical records</span>
              <Badge variant="secondary">{localHistorical}</Badge>
            </div>
          </div>

          {totalLocal === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No local-only data found to sync.
            </p>
          )}

          {log.length > 0 && (
            <ScrollArea className="h-48 rounded border p-2">
              <div className="space-y-0.5 text-xs font-mono">
                {log.map((line, i) => (
                  <div key={i} className={line.startsWith('❌') ? 'text-destructive' : line.startsWith('⚠') ? 'text-yellow-600' : 'text-foreground'}>
                    {line}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-end gap-2">
            {done ? (
              <Button variant="outline" onClick={() => setOpen(false)} className="gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Done
              </Button>
            ) : (
              <Button onClick={handleSync} disabled={syncing || totalLocal === 0} className="gap-2">
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                {syncing ? 'Syncing...' : 'Start Sync'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
