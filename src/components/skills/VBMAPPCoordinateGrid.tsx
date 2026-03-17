import { useMemo, useState, forwardRef } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { format } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

type FillState = 'EMPTY' | 'HALF' | 'FULL';

interface MilestoneItem {
  item_id: string;
  domain: string;
  level: 1 | 2 | 3;
  code: string;
  label_short: string;
  label_full: string | null;
  sort_order: number;
}

interface ItemResult {
  result_id?: string;
  assessment_id: string;
  item_id: string;
  fill_state: FillState;
  tested_circle: boolean;
  notes_item: string | null;
  updated_in_assessment_id: string | null;
}

export interface AssessmentOverlay {
  assessmentId: string;
  assessmentDate: string;
  color: string;       // hex color
  label: string;       // e.g. "1st", "2nd"
  results: Record<string, ItemResult>; // keyed by item_id
}

interface VBMAPPCoordinateGridProps {
  items: MilestoneItem[];
  currentAssessmentId: string | null;
  currentResults: Record<string, ItemResult>;
  overlays?: AssessmentOverlay[];
  onCellClick: (itemId: string, currentFill: FillState) => void;
}

// ─── Layout Constants ────────────────────────────────────────────────────────

/** Official VB-MAPP domain order – domains that only appear at certain levels are still shown */
const DOMAIN_ORDER = [
  'Mand', 'Tact', 'Listener Responding', 'Visual Perceptual/MTS',
  'Independent Play', 'Social Behavior', 'Motor Imitation', 'Echoic',
  'Spontaneous Vocal Behavior',
  'LRFFC', 'Intraverbal', 'Group & Social', 'Linguistic Structure',
  'Reading', 'Writing', 'Math',
];

const DOMAIN_ABBREV: Record<string, string> = {
  'Mand': 'Mand',
  'Tact': 'Tact',
  'Listener Responding': 'Listener',
  'Visual Perceptual/MTS': 'VP/MTS',
  'Independent Play': 'Play',
  'Social Behavior': 'Social',
  'Motor Imitation': 'Imitation',
  'Echoic': 'Echoic',
  'Spontaneous Vocal Behavior': 'SVB',
  'Reading': 'Reading',
  'Writing': 'Writing',
  'LRFFC': 'LRFFC',
  'Intraverbal': 'IV',
  'Group & Social': 'Group',
  'Linguistic Structure': 'Ling.',
  'Math': 'Math',
};

const LEVEL_CONFIG = [
  {
    level: 3 as const,
    label: 'LEVEL 3',
    milestoneRows: [5, 4, 3, 2, 1], // display top-to-bottom: 5 at top, 1 at bottom
    headerColor: '#4a7fc1',
    labelColor: '#1e4f8f',
    bgLight: '#ddeeff',
    fillHalf: '#aad4f5',
    fillFull: '#4a90d9',
  },
  {
    level: 2 as const,
    label: 'LEVEL 2',
    milestoneRows: [5, 4, 3, 2, 1],
    headerColor: '#4caf50',
    labelColor: '#1b5e20',
    bgLight: '#e8f5e9',
    fillHalf: '#a5d6a7',
    fillFull: '#4caf50',
  },
  {
    level: 1 as const,
    label: 'LEVEL 1',
    milestoneRows: [5, 4, 3, 2, 1],
    headerColor: '#e07b39',
    labelColor: '#7f3b08',
    bgLight: '#fff3e0',
    fillHalf: '#ffe082',
    fillFull: '#f4a261',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract the within-level milestone number (1-5) from sort_order */
function milestonePosition(item: MilestoneItem): number {
  // sort_order pattern: level1 = 10,20,30,40,50 → positions 1-5
  // level2 = 60,70,80,90,100 → positions 1-5
  // level3 = 110,120,130,140,150 → positions 1-5
  const posInLevel = ((item.sort_order - 1) % 50);
  return Math.floor(posInLevel / 10) + 1;
}

function abbrev(domain: string): string {
  return DOMAIN_ABBREV[domain] ?? (domain.length > 8 ? domain.slice(0, 7) + '.' : domain);
}

// ─── Component ───────────────────────────────────────────────────────────────

export const VBMAPPCoordinateGrid = forwardRef<HTMLDivElement, VBMAPPCoordinateGridProps>(function VBMAPPCoordinateGrid({
  items,
  currentAssessmentId,
  currentResults,
  overlays = [],
  onCellClick,
}, ref) {
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  // Build coordinate map: `${domain}__${level}__${position}` → MilestoneItem
  const { domains, coordMap } = useMemo(() => {
    const map = new Map<string, MilestoneItem>();
    const domainSet = new Set<string>();

    items.forEach(item => {
      domainSet.add(item.domain);
      const pos = milestonePosition(item);
      map.set(`${item.domain}__${item.level}__${pos}`, item);
    });

    // Sort domains by DOMAIN_ORDER
    const sorted = DOMAIN_ORDER.filter(d => domainSet.has(d));
    // Add any domains not in DOMAIN_ORDER
    domainSet.forEach(d => {
      if (!sorted.includes(d)) sorted.push(d);
    });

    return { domains: sorted, coordMap: map };
  }, [items]);

  const cellW = 64;
  const cellH = 32;
  const headerH = 28;
  const rowNumW = 22;
  const levelLabelW = 40;

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No milestone items loaded.
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="overflow-x-auto pb-4" ref={ref}>
        <div
          style={{ minWidth: levelLabelW + rowNumW + domains.length * cellW }}
          className="text-[10px] select-none font-mono"
        >
          {LEVEL_CONFIG.map(levelCfg => (
            <div key={levelCfg.level} className="mb-3">
              {/* Level heading */}
              <div className="flex items-center mb-0.5">
                <div
                  style={{ color: levelCfg.labelColor, width: levelLabelW + rowNumW, flexShrink: 0 }}
                  className="text-center font-bold"
                >
                  {levelCfg.label}
                </div>
                <div style={{ flex: 1, height: 2, backgroundColor: levelCfg.headerColor }} />
              </div>

              {/* Domain header */}
              <div className="flex" style={{ marginLeft: levelLabelW + rowNumW }}>
                {domains.map(domain => {
                  const hasItems = levelCfg.milestoneRows.some(
                    pos => coordMap.has(`${domain}__${levelCfg.level}__${pos}`)
                  );
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
                      <span className="text-[9px] font-bold text-white leading-tight">
                        {hasItems ? abbrev(domain) : ''}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Milestone rows (5 at top → 1 at bottom) */}
              {levelCfg.milestoneRows.map(pos => (
                <div key={pos} className="flex">
                  <div style={{ width: levelLabelW, flexShrink: 0 }} />
                  {/* Row number label */}
                  <div
                    style={{ width: rowNumW, height: cellH, flexShrink: 0 }}
                    className="flex items-center justify-end pr-1 text-muted-foreground border-r border-border"
                  >
                    {/* Global milestone number: level determines offset */}
                    {(levelCfg.level - 1) * 5 + pos}
                  </div>

                  {/* Domain cells */}
                  {domains.map(domain => {
                    const coordKey = `${domain}__${levelCfg.level}__${pos}`;
                    const item = coordMap.get(coordKey);

                    if (!item) {
                      return (
                        <div
                          key={domain}
                          style={{ width: cellW, minWidth: cellW, height: cellH, backgroundColor: '#f3f4f6' }}
                          className="border-l border-b border-border/30"
                        />
                      );
                    }

                    const result = currentResults[item.item_id];
                    const fill = result?.fill_state ?? 'EMPTY';
                    const circle = result?.tested_circle ?? false;
                    const isHovered = hoveredItemId === item.item_id;

                    // Determine fill color
                    let fillColor = levelCfg.bgLight;
                    if (fill === 'FULL') fillColor = levelCfg.fillFull;
                    else if (fill === 'HALF') fillColor = levelCfg.fillHalf;

                    // Collect overlay scores for this item
                    const overlayScores = overlays
                      .filter(o => {
                        const r = o.results[item.item_id];
                        return r && r.fill_state !== 'EMPTY';
                      })
                      .map(o => ({
                        fill: o.results[item.item_id].fill_state,
                        color: o.color,
                        date: o.assessmentDate,
                        label: o.label,
                      }));

                    const cell = (
                      <div
                        key={domain}
                        style={{
                          width: cellW,
                          minWidth: cellW,
                          height: cellH,
                          backgroundColor: fillColor,
                          cursor: 'pointer',
                          position: 'relative',
                          outline: isHovered ? `2px solid ${levelCfg.headerColor}` : undefined,
                          outlineOffset: isHovered ? -2 : undefined,
                        }}
                        className="border-l border-b border-border/30 flex flex-col items-center justify-center"
                        onClick={() => onCellClick(item.item_id, fill)}
                        onMouseEnter={() => setHoveredItemId(item.item_id)}
                        onMouseLeave={() => setHoveredItemId(null)}
                      >
                        {/* Item number only */}
                        <span
                          className="leading-none text-center"
                          style={{
                            fontSize: 8,
                            color: fill === 'FULL' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.45)',
                            fontWeight: 600,
                          }}
                        >
                          {item.sort_order}
                        </span>
                        {/* Overlay dots for historical assessments */}
                        {overlayScores.length > 0 && (
                          <div className="absolute bottom-0.5 left-0.5 flex gap-px">
                            {overlayScores.slice(0, 4).map((o, i) => (
                              <div
                                key={i}
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  backgroundColor: o.color,
                                  border: '1px solid rgba(255,255,255,0.6)',
                                }}
                              />
                            ))}
                          </div>
                        )}
                        {/* Score indicator */}
                        {fill === 'HALF' && (
                          <span className="text-[8px] font-bold" style={{ color: '#92400e' }}>½</span>
                        )}
                        {circle && fill === 'EMPTY' && (
                          <span className="text-[8px] font-bold text-destructive">○</span>
                        )}
                      </div>
                    );

                    return (
                      <Tooltip key={domain}>
                        <TooltipTrigger asChild>{cell}</TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs z-50">
                          <div className="space-y-1">
                            <div className="font-bold text-xs">{item.code} — {item.label_short}</div>
                            {item.label_full && (
                              <div className="text-xs text-muted-foreground">{item.label_full}</div>
                            )}
                            <div className="text-xs">
                              <span className="font-medium">Domain:</span> {item.domain} · Level {item.level} · Milestone {pos}
                            </div>
                            <div className="text-xs">
                              <span className="font-medium">Status:</span>{' '}
                              <span className="font-semibold">
                                {fill === 'FULL' ? 'Mastered (●)' : fill === 'HALF' ? 'Emerging (◑)' : circle ? 'Tested – not met (○)' : 'Not tested'}
                              </span>
                            </div>
                            {overlayScores.map((o, i) => (
                              <div key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                                <span
                                  style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    backgroundColor: o.color, display: 'inline-block', flexShrink: 0,
                                  }}
                                />
                                {o.label} ({format(new Date(o.date), 'M/d/yy')}): {o.fill === 'FULL' ? '●' : '◑'}
                              </div>
                            ))}
                            <div className="text-[10px] text-muted-foreground italic mt-1">
                              Click to cycle: Empty → ◑ → ● → Empty
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}

              {/* Bottom summary dots */}
              <div className="flex" style={{ marginLeft: levelLabelW + rowNumW }}>
                {domains.map(domain => {
                  const levelItems = levelCfg.milestoneRows
                    .map(pos => coordMap.get(`${domain}__${levelCfg.level}__${pos}`))
                    .filter((x): x is MilestoneItem => !!x);

                  return (
                    <div
                      key={domain}
                      style={{ width: cellW, minWidth: cellW }}
                      className="flex items-center justify-center gap-0.5 py-1 border-l border-border/30"
                    >
                      {levelItems.map(item => {
                        const r = currentResults[item.item_id];
                        const fill = r?.fill_state ?? 'EMPTY';
                        const circle = r?.tested_circle ?? false;
                        return (
                          <div
                            key={item.item_id}
                            style={{
                              width: 6, height: 6, borderRadius: '50%',
                              backgroundColor:
                                fill === 'FULL' ? levelCfg.headerColor :
                                fill === 'HALF' ? '#ffe082' :
                                circle ? '#ef4444' :
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
              { label: 'Mastered (●)', fill: 'FULL' as const, color: '#f4a261' },
              { label: 'Emerging (◑)', fill: 'HALF' as const, color: '#ffe082' },
              { label: 'Tested – not met (○)', fill: 'CIRCLE' as const, color: '', symbol: '○' },
              { label: 'Not tested', fill: 'EMPTY' as const, color: '#e8f5e9', border: true },
            ].map(({ label, color, border, symbol }) => (
              <div key={label} className="flex items-center gap-1">
                <div
                  style={{
                    width: 14, height: 14,
                    backgroundColor: color || undefined,
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
            {overlays.map((o, i) => (
              <div key={i} className="flex items-center gap-1">
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: o.color }} />
                <span>{o.label} ({format(new Date(o.assessmentDate), 'M/d/yy')})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
});
