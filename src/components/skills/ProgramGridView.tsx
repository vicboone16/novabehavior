/**
 * ProgramGridView — Catalyst-style flattened table view for session data entry.
 * Rows represent the active data collection unit (benchmarks if enabled, else targets).
 */

import { useState, useMemo } from 'react';
import {
  Target,
  Play,
  BarChart3,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TargetSparkline } from './TargetSparkline';
import { TargetDataCollectionPanel } from './TargetDataCollectionPanel';
import { TargetGraphView } from './TargetGraphView';
import type { SkillProgram, SkillTarget, TargetBenchmark } from '@/types/skillPrograms';
import {
  PROGRAM_STATUS_LABELS,
  PROGRAM_STATUS_COLORS,
  SKILL_METHOD_LABELS,
  TARGET_STATUS_LABELS,
} from '@/types/skillPrograms';
import { PHASE_LABELS, PHASE_COLORS, type TargetPhase } from '@/types/criteriaEngine';
import type { Domain } from '@/types/curriculum';

interface GridRow {
  id: string;
  domainName: string;
  subdomainName: string;
  programName: string;
  programMethod: string;
  objectiveName: string | null;
  targetName: string;
  benchmarkName: string | null;
  phase: string;
  status: string;
  target: SkillTarget;
  program: SkillProgram;
  benchmark: TargetBenchmark | null;
}

interface ProgramGridViewProps {
  programs: SkillProgram[];
  domains: Domain[];
  studentId: string;
  onRefetch: () => void;
  sparklineKey: number;
}

export function ProgramGridView({ programs, domains, studentId, onRefetch, sparklineKey }: ProgramGridViewProps) {
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState('all');
  const [recordingTarget, setRecordingTarget] = useState<{ target: SkillTarget; program: SkillProgram } | null>(null);
  const [graphTarget, setGraphTarget] = useState<{ target: SkillTarget; program: SkillProgram } | null>(null);

  const rows = useMemo(() => {
    const result: GridRow[] = [];
    for (const program of programs) {
      const domainName = program.top_level_domain?.name || program.domain?.name || 'Unassigned';
      const subdomainName = program.subdomain?.name || '—';
      const targets = program.targets || [];

      for (const target of targets) {
        const objectiveName = program.objectives_enabled
          ? (program.objectives || []).find(o => o.id === target.objective_id)?.name || null
          : null;

        if (program.benchmark_enabled && target.benchmarks && target.benchmarks.length > 0) {
          for (const bm of target.benchmarks) {
            result.push({
              id: `${target.id}-${bm.id}`,
              domainName,
              subdomainName,
              programName: program.name,
              programMethod: program.method,
              objectiveName,
              targetName: target.name,
              benchmarkName: bm.name,
              phase: bm.phase || target.phase,
              status: target.status,
              target,
              program,
              benchmark: bm,
            });
          }
        } else {
          result.push({
            id: target.id,
            domainName,
            subdomainName,
            programName: program.name,
            programMethod: program.method,
            objectiveName,
            targetName: target.name,
            benchmarkName: null,
            phase: target.phase,
            status: target.status,
            target,
            program,
            benchmark: null,
          });
        }
      }
    }
    return result;
  }, [programs]);

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (search) {
        const q = search.toLowerCase();
        if (!r.targetName.toLowerCase().includes(q) &&
            !r.programName.toLowerCase().includes(q) &&
            !(r.benchmarkName || '').toLowerCase().includes(q)) return false;
      }
      if (phaseFilter !== 'all' && r.phase !== phaseFilter) return false;
      if (domainFilter !== 'all' && r.domainName !== domainFilter) return false;
      return true;
    });
  }, [rows, search, phaseFilter, domainFilter]);

  const uniqueDomains = useMemo(() => [...new Set(rows.map(r => r.domainName))].sort(), [rows]);

  if (programs.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search targets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs h-8 text-xs"
        />
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Phase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Phases</SelectItem>
            {Object.entries(PHASE_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue placeholder="Domain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Domains</SelectItem>
            {uniqueDomains.map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs">
          {filteredRows.length} row{filteredRows.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Domain</th>
                <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Program</th>
                <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Target</th>
                <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Benchmark</th>
                <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Phase</th>
                <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Method</th>
                <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Trend</th>
                <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="py-2 px-3">
                    <div className="font-medium">{row.domainName}</div>
                    {row.subdomainName !== '—' && (
                      <div className="text-muted-foreground text-[10px]">{row.subdomainName}</div>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <div className="font-medium">{row.programName}</div>
                    {row.objectiveName && (
                      <div className="text-muted-foreground text-[10px]">↳ {row.objectiveName}</div>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <div className="font-medium flex items-center gap-1">
                      <Target className="w-3 h-3 text-muted-foreground shrink-0" />
                      {row.targetName}
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    {row.benchmarkName ? (
                      <Badge variant="outline" className="text-[10px]">
                        {row.benchmarkName}
                        {row.benchmark?.is_current && <span className="ml-1 text-primary">●</span>}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <Badge className={`${PHASE_COLORS[row.phase as TargetPhase] || 'bg-slate-500'} text-white text-[10px]`}>
                      {PHASE_LABELS[row.phase as TargetPhase] || row.phase}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">
                    {SKILL_METHOD_LABELS[row.programMethod as keyof typeof SKILL_METHOD_LABELS] || row.programMethod}
                  </td>
                  <td className="py-2 px-3">
                    <TargetSparkline key={`${row.target.id}-${sparklineKey}`} targetId={row.target.id} />
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-primary"
                            onClick={() => setRecordingTarget({ target: row.target, program: row.program })}
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">Record Data</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setGraphTarget({ target: row.target, program: row.program })}
                          >
                            <BarChart3 className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">View Graph</p></TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    No targets match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Inline panels */}
      {recordingTarget && (
        <TargetDataCollectionPanel
          target={recordingTarget.target}
          program={recordingTarget.program}
          onClose={() => setRecordingTarget(null)}
          onDataRecorded={onRefetch}
        />
      )}
      {graphTarget && (
        <TargetGraphView
          target={graphTarget.target}
          program={graphTarget.program}
          onClose={() => setGraphTarget(null)}
        />
      )}
    </div>
  );
}
