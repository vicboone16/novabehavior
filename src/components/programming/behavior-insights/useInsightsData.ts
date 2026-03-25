import { useMemo, useEffect, useState } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useShallow } from 'zustand/react/shallow';
import { supabase } from '@/integrations/supabase/client';
import {
  startOfDay, subDays, subWeeks, subMonths, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfQuarter, isWithinInterval, format,
  parseISO, differenceInDays,
} from 'date-fns';
import type { InsightsFilters, BehaviorDayData, BehaviorSummaryRow, InsightBadge } from './types';

function getDateRange(
  preset: InsightsFilters['dateRange'],
  customStart?: string,
  customEnd?: string,
): { start: Date; end: Date } {
  const now = new Date();
  const today = startOfDay(now);

  switch (preset) {
    case 'today': return { start: today, end: now };
    case 'yesterday': { const y = subDays(today, 1); return { start: y, end: today }; }
    case 'this_week': return { start: startOfWeek(today, { weekStartsOn: 1 }), end: now };
    case 'last_week': { const s = subWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1); return { start: s, end: startOfWeek(today, { weekStartsOn: 1 }) }; }
    case 'last_7': return { start: subDays(today, 7), end: now };
    case 'last_14': return { start: subDays(today, 14), end: now };
    case 'last_30': return { start: subDays(today, 30), end: now };
    case 'this_month': return { start: startOfMonth(today), end: now };
    case 'last_month': { const s = startOfMonth(subMonths(today, 1)); return { start: s, end: endOfMonth(subMonths(today, 1)) }; }
    case 'this_quarter': return { start: startOfQuarter(today), end: now };
    case 'school_year': return { start: new Date(now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1, 7, 1), end: now };
    case 'all_time': return { start: new Date(2020, 0, 1), end: now };
    case 'custom': return {
      start: customStart ? parseISO(customStart) : subDays(today, 30),
      end: customEnd ? parseISO(customEnd) : now,
    };
    default: return { start: subDays(today, 30), end: now };
  }
}

/**
 * Fetches behavior_daily_aggregates from Supabase for the student + date range.
 * Falls back to Zustand store data if DB returns nothing.
 */
function useDbAggregates(studentId: string, dateRange: { start: Date; end: Date }) {
  const [dbRows, setDbRows] = useState<BehaviorDayData[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const startStr = format(dateRange.start, 'yyyy-MM-dd');
    const endStr = format(dateRange.end, 'yyyy-MM-dd');

    supabase
      .from('behavior_daily_aggregates')
      .select('behavior_id, behavior_name, service_date, total_count, total_duration_seconds, session_count, rate_per_hour')
      .eq('student_id', studentId)
      .gte('service_date', startStr)
      .lte('service_date', endStr)
      .order('service_date', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data && data.length > 0) {
          setDbRows(
            data.map((r: any) => ({
              date: r.service_date,
              behaviorId: r.behavior_id,
              behaviorName: r.behavior_name || r.behavior_id,
              count: r.total_count || 0,
              duration: r.total_duration_seconds || 0,
              sessions: r.session_count || 1,
              rate: r.rate_per_hour || 0,
            }))
          );
        } else {
          setDbRows([]);
        }
        setLoaded(true);
      });

    return () => { cancelled = true; };
  }, [studentId, dateRange.start.getTime(), dateRange.end.getTime()]);

  return { dbRows, loaded };
}

export function useInsightsData(studentId: string, filters: InsightsFilters) {
  const { students, frequencyEntries, durationEntries, abcEntries, sessions } = useDataStore(useShallow((state) => ({
    students: state.students,
    frequencyEntries: state.frequencyEntries,
    durationEntries: state.durationEntries,
    abcEntries: state.abcEntries,
    sessions: state.sessions,
  })));
  const student = students.find(s => s.id === studentId);

  const dateRange = useMemo(
    () => getDateRange(filters.dateRange, filters.customStart, filters.customEnd),
    [filters.dateRange, filters.customStart, filters.customEnd],
  );

  const behaviors = useMemo(() => student?.behaviors || [], [student]);

  // Fetch from DB aggregates
  const { dbRows, loaded: dbLoaded } = useDbAggregates(studentId, dateRange);

  // Zustand-based daily data (fallback)
  const zustandData = useMemo(() => {
    if (!student) return [];

    const result: BehaviorDayData[] = [];
    const behaviorMap = new Map(behaviors.map(b => [b.id, b.name]));

    const freqByKey = new Map<string, number>();
    frequencyEntries
      .filter(e => e.studentId === studentId)
      .forEach(e => {
        try {
          const ts = new Date(e.timestamp);
          if (isNaN(ts.getTime())) return;
          const d = format(ts, 'yyyy-MM-dd');
          const entryDate = parseISO(d);
          if (!isWithinInterval(entryDate, dateRange)) return;
          const key = `${d}|${e.behaviorId}`;
          freqByKey.set(key, (freqByKey.get(key) || 0) + 1);
        } catch { /* skip invalid timestamps */ }
      });

    const durByKey = new Map<string, number>();
    durationEntries
      .filter(e => e.studentId === studentId)
      .forEach(e => {
        const d = format(new Date(e.startTime), 'yyyy-MM-dd');
        const entryDate = parseISO(d);
        if (!isWithinInterval(entryDate, dateRange)) return;
        const key = `${d}|${e.behaviorId}`;
        durByKey.set(key, (durByKey.get(key) || 0) + (e.duration || 0));
      });

    const abcByKey = new Map<string, number>();
    abcEntries
      .filter(e => e.studentId === studentId)
      .forEach(e => {
        const d = format(new Date(e.timestamp), 'yyyy-MM-dd');
        const entryDate = parseISO(d);
        if (!isWithinInterval(entryDate, dateRange)) return;
        const key = `${d}|${e.behaviorId}`;
        abcByKey.set(key, (abcByKey.get(key) || 0) + 1);
      });

    const sessionsByDay = new Map<string, number>();
    sessions
      .filter(s => s.studentIds?.includes(studentId) && s.date)
      .forEach(s => {
        const d = format(new Date(s.date), 'yyyy-MM-dd');
        sessionsByDay.set(d, (sessionsByDay.get(d) || 0) + 1);
      });

    const allKeys = new Set([...freqByKey.keys(), ...durByKey.keys(), ...abcByKey.keys()]);
    allKeys.forEach(key => {
      const [date, behaviorId] = key.split('|');
      const count = (freqByKey.get(key) || 0) + (abcByKey.get(key) || 0);
      const duration = durByKey.get(key) || 0;
      const daySessions = sessionsByDay.get(date) || 1;
      result.push({
        date,
        behaviorId,
        behaviorName: behaviorMap.get(behaviorId) || behaviorId,
        count,
        duration,
        sessions: daySessions,
        rate: count / daySessions,
      });
    });

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [student, studentId, frequencyEntries, durationEntries, abcEntries, sessions, behaviors, dateRange]);

  // Merge: combine DB aggregates with Zustand data
  // DB rows take priority for matching date+behavior pairs; Zustand fills gaps
  const dailyData = useMemo(() => {
    if (dbRows.length === 0) return zustandData;
    if (zustandData.length === 0) return dbRows;

    // Build a set of date|behaviorId keys present in DB rows
    const dbKeys = new Set(dbRows.map(r => `${r.date}|${r.behaviorId}`));
    // Include all DB rows, plus any Zustand rows that don't overlap
    const merged = [
      ...dbRows,
      ...zustandData.filter(z => !dbKeys.has(`${z.date}|${z.behaviorId}`)),
    ];
    return merged.sort((a, b) => a.date.localeCompare(b.date));
  }, [dbRows, zustandData]);

  // Filter by selected behaviors
  const filteredData = useMemo(() => {
    if (filters.selectedBehaviors.length === 0) return dailyData;
    return dailyData.filter(d => filters.selectedBehaviors.includes(d.behaviorId));
  }, [dailyData, filters.selectedBehaviors]);

  // Summary table rows
  const summaryRows = useMemo((): BehaviorSummaryRow[] => {
    const byBehavior = new Map<string, BehaviorDayData[]>();
    filteredData.forEach(d => {
      const arr = byBehavior.get(d.behaviorId) || [];
      arr.push(d);
      byBehavior.set(d.behaviorId, arr);
    });

    const totalAll = filteredData.reduce((s, d) => s + d.count, 0);
    const dayCount = Math.max(1, differenceInDays(dateRange.end, dateRange.start));

    return Array.from(byBehavior.entries()).map(([behaviorId, data]) => {
      const totalCount = data.reduce((s, d) => s + d.count, 0);
      const totalSessions = data.reduce((s, d) => s + d.sessions, 0);
      const peakEntry = data.reduce((max, d) => d.count > max.count ? d : max, data[0]);

      const mid = Math.floor(data.length / 2);
      const firstHalf = data.slice(0, mid).reduce((s, d) => s + d.count, 0);
      const secondHalf = data.slice(mid).reduce((s, d) => s + d.count, 0);
      const trendDelta = data.length >= 4 ? secondHalf - firstHalf : null;
      const trendPct = firstHalf > 0 && trendDelta !== null ? Math.round((trendDelta / firstHalf) * 100) : null;

      let clinicalFlag: BehaviorSummaryRow['clinicalFlag'] = null;
      if (trendPct !== null) {
        if (trendPct > 50) clinicalFlag = 'spike';
        else if (trendPct > 20) clinicalFlag = 'increasing';
        else if (trendPct < -20) clinicalFlag = 'decreasing';
        else clinicalFlag = 'stable';
      }

      return {
        behaviorId,
        behaviorName: data[0]?.behaviorName || behaviorId,
        totalCount,
        pctOfTotal: totalAll > 0 ? Math.round((totalCount / totalAll) * 100) : 0,
        avgPerDay: Math.round((totalCount / dayCount) * 10) / 10,
        avgPerSession: totalSessions > 0 ? Math.round((totalCount / totalSessions) * 10) / 10 : 0,
        peakDay: peakEntry?.date || '',
        lastOccurrence: data[data.length - 1]?.date || '',
        trendDelta,
        trendPct,
        clinicalFlag,
      };
    }).sort((a, b) => b.totalCount - a.totalCount);
  }, [filteredData, dateRange]);

  // KPI summary cards
  const kpis = useMemo(() => {
    const totalIncidents = summaryRows.reduce((s, r) => s + r.totalCount, 0);
    const topBehavior = summaryRows[0] || null;
    const sorted = [...summaryRows].sort((a, b) => (b.trendPct ?? 0) - (a.trendPct ?? 0));
    const biggestIncrease = sorted.find(r => (r.trendPct ?? 0) > 0) || null;
    const biggestDecrease = [...sorted].reverse().find(r => (r.trendPct ?? 0) < 0) || null;

    const dayTotals = new Map<string, number>();
    filteredData.forEach(d => dayTotals.set(d.date, (dayTotals.get(d.date) || 0) + d.count));
    let peakDay = '';
    let peakCount = 0;
    dayTotals.forEach((count, date) => { if (count > peakCount) { peakCount = count; peakDay = date; } });

    const dayCount = Math.max(1, differenceInDays(dateRange.end, dateRange.start));
    const daysWithData = new Set(filteredData.map(d => d.date)).size;
    const completeness = Math.round((daysWithData / dayCount) * 100);

    return {
      totalIncidents,
      topBehavior,
      biggestIncrease,
      biggestDecrease,
      peakDay,
      peakCount,
      completeness,
      lastRecorded: filteredData[filteredData.length - 1]?.date || null,
      priorityConcern: summaryRows.find(r => r.clinicalFlag === 'spike' || r.clinicalFlag === 'increasing') || null,
    };
  }, [summaryRows, filteredData, dateRange]);

  // Insight badges
  const insights = useMemo((): InsightBadge[] => {
    const badges: InsightBadge[] = [];
    summaryRows.forEach(r => {
      if (r.clinicalFlag === 'spike') badges.push({ type: 'spike', label: `Spike: ${r.behaviorName}`, behaviorId: r.behaviorId });
      if (r.clinicalFlag === 'increasing') badges.push({ type: 'worsening', label: `Worsening: ${r.behaviorName}`, behaviorId: r.behaviorId });
      if (r.clinicalFlag === 'decreasing') badges.push({ type: 'improving', label: `Improving: ${r.behaviorName}`, behaviorId: r.behaviorId });
    });
    if (kpis.completeness < 70) badges.push({ type: 'missing_data', label: 'Missing Data Gaps' });
    return badges;
  }, [summaryRows, kpis]);

  // Chart data grouped by date for overlay
  const chartData = useMemo(() => {
    const byDate = new Map<string, Record<string, any>>();
    filteredData.forEach(d => {
      const existing = byDate.get(d.date) || { date: d.date };
      const valKey = filters.metric === 'duration' ? d.duration : filters.metric === 'rate' ? d.rate : d.count;
      existing[d.behaviorName] = ((existing[d.behaviorName] as number) || 0) + valKey;
      byDate.set(d.date, existing);
    });
    return Array.from(byDate.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [filteredData, filters.metric]);

  const activeBehaviorNames = useMemo(() => {
    const names = new Set<string>();
    filteredData.forEach(d => names.add(d.behaviorName));
    return Array.from(names);
  }, [filteredData]);

  const recommendedView = useMemo(() => {
    const count = activeBehaviorNames.length;
    if (count <= 3) return 'overlay';
    if (count <= 8) return 'compare';
    return 'small_multiples';
  }, [activeBehaviorNames]);

  return {
    behaviors,
    dailyData: filteredData,
    summaryRows,
    kpis,
    insights,
    chartData,
    activeBehaviorNames,
    recommendedView,
    dateRange,
  };
}
