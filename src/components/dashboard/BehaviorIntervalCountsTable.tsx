import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type IntervalType =
  | "frequency"
  | "duration"
  | "partial_interval"
  | "whole_interval"
  | "momentary_time_sample";

export interface BehaviorIntervalEvent {
  studentId: string;
  studentName?: string;
  intervalType: IntervalType;
  count: number;
}

interface Props {
  title: string;
  events: BehaviorIntervalEvent[];
  selectedStudentIds: string[];
  intervalTypes: IntervalType[];
}

/**
 * Presentational table + per-student cards used by the Intelligence and
 * Operations dashboard tabs to render scoped behavior counts for every
 * (student × intervalType) pair.
 *
 * Cells expose `data-testid="cell-<studentId>-<intervalType>"` so UI tests
 * can assert exact rendered counts against seeded fixtures.
 */
export function BehaviorIntervalCountsTable({
  title,
  events,
  selectedStudentIds,
  intervalTypes,
}: Props) {
  const selected = new Set(selectedStudentIds);
  const totals = new Map<string, number>();
  const names = new Map<string, string>();
  for (const e of events) {
    if (!selected.has(e.studentId)) continue;
    const key = `${e.studentId}|${e.intervalType}`;
    totals.set(key, (totals.get(key) || 0) + e.count);
    if (e.studentName) names.set(e.studentId, e.studentName);
  }

  return (
    <div className="space-y-4" data-testid={`counts-${title.toLowerCase()}`}>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Student</th>
            {intervalTypes.map(t => (
              <th key={t} className="text-right">
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {selectedStudentIds.map(sid => (
            <tr key={sid} data-testid={`row-${sid}`}>
              <td>{names.get(sid) || sid}</td>
              {intervalTypes.map(t => (
                <td
                  key={t}
                  className="text-right"
                  data-testid={`cell-${sid}-${t}`}
                >
                  {totals.get(`${sid}|${t}`) ?? 0}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {selectedStudentIds.map(sid => {
          const studentTotal = intervalTypes.reduce(
            (sum, t) => sum + (totals.get(`${sid}|${t}`) ?? 0),
            0
          );
          return (
            <Card key={sid} data-testid={`card-${sid}`}>
              <CardHeader>
                <CardTitle className="text-base">
                  {names.get(sid) || sid}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div data-testid={`card-total-${sid}`}>{studentTotal}</div>
                <ul>
                  {intervalTypes.map(t => (
                    <li
                      key={t}
                      data-testid={`card-${sid}-${t}`}
                    >
                      {t}: {totals.get(`${sid}|${t}`) ?? 0}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
