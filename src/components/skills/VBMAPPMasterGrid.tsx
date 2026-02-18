import { useMemo, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import type { CurriculumItem, MilestoneScore, StudentAssessment } from '@/types/curriculum';

export interface HistoricalEntry {
  assessment: StudentAssessment;
  scores: Record<string, MilestoneScore>;
  hexColor: string;
}

interface VBMAPPMasterGridProps {
  items: CurriculumItem[];
  scores: Record<string, MilestoneScore>;
  historicalEntries?: HistoricalEntry[];
  showHistorical?: boolean;
  onCellClick: (itemId: string, currentScore: number | undefined) => void;
}

// Level definitions matching official VB-MAPP Master Scoring Form
const LEVEL_CONFIG = [
  {
    level: 'Level 3',
    rows: [15, 14, 13, 12, 11],
    headerColor: '#4a7fc1',
    labelColor: '#1e4f8f',
    bgLight: '#ddeeff',
    fillMastered: '#4a90d9',
    fillEmerging: '#aad4f5',
  },
  {
    level: 'Level 2',
    rows: [10, 9, 8, 7, 6],
    headerColor: '#4caf50',
    labelColor: '#1b5e20',
    bgLight: '#e8f5e9',
    fillMastered: '#4caf50',
    fillEmerging: '#a5d6a7',
  },
  {
    level: 'Level 1',
    rows: [5, 4, 3, 2, 1],
    headerColor: '#e07b39',
    labelColor: '#7f3b08',
    bgLight: '#fff3e0',
    fillMastered: '#f4a261',
    fillEmerging: '#ffe082',
  },
];

const DOMAIN_ABBREV: Record<string, string> = {
  'Mand': 'Mand',
  'Tact': 'Tact',
  'Listener Responding': 'Listener',
  'Visual Perceptual/MTS': 'VP/MTS',
  'Play': 'Play',
  'Social': 'Social',
  'Imitation': 'Imitation',
  'Echoic': 'Echoic',
  'Reading': 'Reading',
  'Writing': 'Writing',
  'LRFFC': 'LRFFC',
  'Intraverbal': 'IV',
  'Group & Social': 'Group',
  'Linguistic Structure': 'Ling.',
  'Math': 'Math',
  'Spontaneous Vocal Behavior': 'SVB',
};

function abbrev(name: string): string {
  return DOMAIN_ABBREV[name] ?? (name.length > 8 ? name.slice(0, 7) + '.' : name);
}

function parseMilestoneNumber(item: CurriculumItem): number {
  if (item.code) {
    // Try trailing number: "M-1", "Tact-3", "Echoic-5" → last numeric segment
    const trailMatch = item.code.match(/(\d+)(?:\.\d+)?$/);
    if (trailMatch) return parseInt(trailMatch[1], 10);
    const leadMatch = item.code.match(/^(\d+)/);
    if (leadMatch) return parseInt(leadMatch[1], 10);
  }
  return item.display_order;
}

export function VBMAPPMasterGrid({
  items,
  scores,
  historicalEntries = [],
  showHistorical = true,
  onCellClick,
}: VBMAPPMasterGridProps) {
  const [hoveredCellKey, setHoveredCellKey] = useState<string | null>(null);

  // Build lookup: `${domainName}__${milestoneNum}` → CurriculumItem
  const { domains, itemLookup } = useMemo(() => {
    const domainOrder = new Map<string, number>();
    const lookup = new Map<string, CurriculumItem>();

    items.forEach(item => {
      const domainName = item.domain?.name || 'Other';
      const order = item.domain?.display_order ?? 999;
      if (!domainOrder.has(domainName)) domainOrder.set(domainName, order);

      const milestoneNum = parseMilestoneNumber(item);
      if (milestoneNum > 0) {
        lookup.set(`${domainName}__${milestoneNum}`, item);
      }
    });

    const sortedDomains = Array.from(domainOrder.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([name]) => name);

    return { domains: sortedDomains, itemLookup: lookup };
  }, [items]);

  const cellW = 46;
  const cellH = 22;
  const headerH = 28;
  const rowNumW = 20;
  const levelLabelW = 38;

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No milestone items loaded.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div style={{ minWidth: levelLabelW + rowNumW + domains.length * cellW }} className="text-[10px] select-none font-mono">

        {/* Level blocks */}
        {LEVEL_CONFIG.map((levelCfg, levelIdx) => (
          <div key={levelCfg.level} className="mb-3">

            {/* Level heading row */}
            <div className="flex items-center mb-0.5">
              <div
                style={{ color: levelCfg.labelColor, width: levelLabelW + rowNumW, flexShrink: 0 }}
                className="text-center font-bold"
              >
                {levelCfg.level.toUpperCase()}
              </div>
              <div style={{ flex: 1, height: 2, backgroundColor: levelCfg.headerColor }} />
            </div>

            {/* Domain header cells */}
            <div className="flex" style={{ marginLeft: levelLabelW + rowNumW }}>
              {domains.map(domain => {
                const hasItems = LEVEL_CONFIG[levelIdx].rows.some(r => itemLookup.has(`${domain}__${r}`));
                return (
                  <div
                    key={domain}
                    style={{
                      width: cellW,
                      minWidth: cellW,
                      height: headerH,
                      backgroundColor: hasItems ? levelCfg.headerColor : '#e5e7eb',
                    }}
                    className="flex items-center justify-center border-l border-white/30 text-center leading-tight px-0.5"
                  >
                    <span className="text-[9px] font-bold text-white leading-tight">{hasItems ? abbrev(domain) : ''}</span>
                  </div>
                );
              })}
            </div>

            {/* Milestone rows (highest number first = top of block) */}
            {levelCfg.rows.map(milestoneNum => (
              <div key={milestoneNum} className="flex">
                {/* Level label (blank except first row of first level) */}
                <div style={{ width: levelLabelW, flexShrink: 0 }} />
                {/* Row number */}
                <div
                  style={{ width: rowNumW, height: cellH, flexShrink: 0 }}
                  className="flex items-center justify-end pr-1 text-muted-foreground border-r border-border"
                >
                  {milestoneNum}
                </div>

                {/* Domain cells */}
                {domains.map(domain => {
                  const item = itemLookup.get(`${domain}__${milestoneNum}`);
                  const cellKey = item ? item.id : `${domain}__${milestoneNum}`;
                  const score = item ? scores[item.id]?.score : undefined;
                  const isHovered = hoveredCellKey === cellKey;

                  let fillColor = 'transparent';
                  if (item) {
                    if (score === 1) fillColor = levelCfg.fillMastered;
                    else if (score === 0.5) fillColor = levelCfg.fillEmerging;
                    else fillColor = levelCfg.bgLight; // empty cell in active domain
                  }

                  const historical = (item && showHistorical)
                    ? historicalEntries
                        .filter(h => h.scores[item.id]?.score !== undefined && h.scores[item.id]?.score !== null)
                        .map(h => ({ score: h.scores[item.id].score, date: h.assessment.date_administered, hexColor: h.hexColor }))
                    : [];

                  const cell = (
                    <div
                      key={domain}
                      style={{
                        width: cellW,
                        minWidth: cellW,
                        height: cellH,
                        backgroundColor: item ? fillColor : '#f3f4f6',
                        cursor: item ? 'pointer' : 'default',
                        position: 'relative',
                        outline: isHovered && item ? `2px solid ${levelCfg.headerColor}` : undefined,
                        outlineOffset: isHovered && item ? -2 : undefined,
                      }}
                      className="border-l border-b border-border/30 flex items-center justify-center"
                      onClick={() => item && onCellClick(item.id, score)}
                      onMouseEnter={() => setHoveredCellKey(cellKey)}
                      onMouseLeave={() => setHoveredCellKey(null)}
                    >
                      {/* Historical dots */}
                      {historical.length > 0 && (
                        <div className="absolute bottom-0.5 left-0.5 flex gap-px">
                          {historical.slice(0, 3).map((h, i) => (
                            <div
                              key={i}
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                backgroundColor: h.hexColor,
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {/* Score label */}
                      {score === 0.5 && <span className="text-[8px] font-bold" style={{ color: '#92400e' }}>½</span>}
                      {score === 0 && item && <span className="text-[8px] font-bold text-destructive">×</span>}
                    </div>
                  );

                  if (!item) return cell;

                  return (
                    <Tooltip key={domain}>
                      <TooltipTrigger asChild>{cell}</TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs z-50">
                        <div className="space-y-1">
                          <div className="font-bold text-xs">{item.code} – {item.title}</div>
                          {item.description && <div className="text-xs text-muted-foreground">{item.description}</div>}
                          <div className="text-xs">
                            Score:{' '}
                            <span className="font-semibold">
                              {score === undefined || score === null
                                ? 'Not assessed'
                                : score === 0.5 ? 'Emerging (½)' : score === 0 ? 'Not demonstrated (0)' : 'Mastered (1)'}
                            </span>
                          </div>
                          {item.mastery_criteria && (
                            <div className="text-xs text-muted-foreground"><strong>Mastery:</strong> {item.mastery_criteria}</div>
                          )}
                          {historical.map((h, i) => (
                            <div key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: h.hexColor, display: 'inline-block', flexShrink: 0 }} />
                              {format(new Date(h.date), 'M/d/yy')}: {h.score === 0.5 ? '½' : h.score}
                            </div>
                          ))}
                          <div className="text-[10px] text-muted-foreground italic mt-1">Click to cycle score: → ½ → 1 → 0</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}

            {/* Bottom indicator dots row */}
            <div className="flex" style={{ marginLeft: levelLabelW + rowNumW }}>
              {domains.map(domain => {
                const levelItems = levelCfg.rows
                  .map(r => itemLookup.get(`${domain}__${r}`))
                  .filter((x): x is CurriculumItem => !!x);
                return (
                  <div
                    key={domain}
                    style={{ width: cellW, minWidth: cellW }}
                    className="flex items-center justify-center gap-0.5 py-1 border-l border-border/30"
                  >
                    {levelItems.map(item => {
                      const s = scores[item.id]?.score;
                      return (
                        <div
                          key={item.id}
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor:
                              s === 1 ? levelCfg.headerColor :
                              s === 0.5 ? '#ffe082' :
                              s === 0 ? '#ef4444' :
                              '#d1d5db',
                            border: '1px solid rgba(0,0,0,0.12)',
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-[10px] text-muted-foreground flex-wrap">
          <span className="font-semibold text-foreground">Key:</span>
          {[
            { label: 'Mastered (1)', color: '#f4a261' },
            { label: 'Emerging (½)', color: '#ffe082' },
            { label: 'Not demonstrated (0) – click to set', color: '', border: true, symbol: '×' },
            { label: 'Not assessed', color: '#e8f5e9', border: true },
          ].map(({ label, color, border, symbol }) => (
            <div key={label} className="flex items-center gap-1">
              <div
                style={{
                  width: 14, height: 14,
                  backgroundColor: color,
                  border: border ? '1px solid #d1d5db' : 'none',
                  borderRadius: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {symbol && <span style={{ fontSize: 8, color: '#ef4444', fontWeight: 'bold' }}>{symbol}</span>}
              </div>
              <span>{label}</span>
            </div>
          ))}
          {showHistorical && historicalEntries.map((h, i) => (
            <div key={i} className="flex items-center gap-1">
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: h.hexColor }} />
              <span>{format(new Date(h.assessment.date_administered), 'M/d/yy')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
