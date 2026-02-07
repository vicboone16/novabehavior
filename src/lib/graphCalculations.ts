/**
 * ABA-specific graph calculations:
 * - Split-middle trend line
 * - Least-squares regression
 * - Celeration line (standard celeration chart)
 * - Aim line projection
 */

export interface DataPoint {
  x: number;
  y: number;
}

export interface TrendLineResult {
  slope: number;
  intercept: number;
  points: DataPoint[];
  method: 'split-middle' | 'least-squares';
}

/**
 * Least-squares linear regression
 */
export function leastSquaresRegression(data: DataPoint[]): TrendLineResult {
  if (data.length < 2) return { slope: 0, intercept: 0, points: [], method: 'least-squares' };

  const n = data.length;
  const sumX = data.reduce((s, p) => s + p.x, 0);
  const sumY = data.reduce((s, p) => s + p.y, 0);
  const sumXY = data.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = data.reduce((s, p) => s + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const points = data.map(p => ({ x: p.x, y: slope * p.x + intercept }));

  return { slope, intercept, points, method: 'least-squares' };
}

/**
 * Split-middle trend line (ABA standard)
 * 1. Split data in half
 * 2. Find median X and Y for each half
 * 3. Draw line through the two median points
 * 4. Adjust so equal data points are above and below
 */
export function splitMiddleTrendLine(data: DataPoint[]): TrendLineResult {
  if (data.length < 4) return leastSquaresRegression(data);

  const sorted = [...data].sort((a, b) => a.x - b.x);
  const mid = Math.floor(sorted.length / 2);

  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const medianX1 = median(firstHalf.map(p => p.x));
  const medianY1 = median(firstHalf.map(p => p.y));
  const medianX2 = median(secondHalf.map(p => p.x));
  const medianY2 = median(secondHalf.map(p => p.y));

  if (medianX2 === medianX1) {
    return { slope: 0, intercept: medianY1, points: data.map(p => ({ x: p.x, y: medianY1 })), method: 'split-middle' };
  }

  const slope = (medianY2 - medianY1) / (medianX2 - medianX1);
  const intercept = medianY1 - slope * medianX1;

  const points = sorted.map(p => ({ x: p.x, y: slope * p.x + intercept }));

  return { slope, intercept, points, method: 'split-middle' };
}

/**
 * Calculate celeration value (multiply factor per week)
 * Used in Standard Celeration Charts
 */
export function calculateCeleration(data: DataPoint[]): number {
  if (data.length < 2) return 1;

  // Use geometric mean of ratios between consecutive points
  const ratios: number[] = [];
  const sorted = [...data].sort((a, b) => a.x - b.x);

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].y > 0 && sorted[i].y > 0) {
      const dayDiff = sorted[i].x - sorted[i - 1].x;
      if (dayDiff > 0) {
        const ratio = sorted[i].y / sorted[i - 1].y;
        // Normalize to per-week rate
        ratios.push(Math.pow(ratio, 7 / dayDiff));
      }
    }
  }

  if (ratios.length === 0) return 1;

  // Geometric mean
  const product = ratios.reduce((p, r) => p * r, 1);
  return Math.pow(product, 1 / ratios.length);
}

/**
 * Generate aim line from start point to target by deadline
 */
export function generateAimLine(
  startDate: number,
  startValue: number,
  endDate: number,
  targetValue: number
): DataPoint[] {
  return [
    { x: startDate, y: startValue },
    { x: endDate, y: targetValue },
  ];
}

/**
 * Calculate phase change statistics
 */
export function phaseStatistics(data: DataPoint[]): {
  mean: number;
  median: number;
  range: { min: number; max: number };
  trend: 'increasing' | 'decreasing' | 'stable';
  variability: number;
} {
  if (data.length === 0) {
    return { mean: 0, median: 0, range: { min: 0, max: 0 }, trend: 'stable', variability: 0 };
  }

  const values = data.map(p => p.y);
  const meanVal = values.reduce((s, v) => s + v, 0) / values.length;
  const medianVal = median(values);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  // Standard deviation for variability
  const variance = values.reduce((s, v) => s + Math.pow(v - meanVal, 2), 0) / values.length;
  const variability = Math.sqrt(variance);

  // Trend direction using split-middle
  const trendResult = splitMiddleTrendLine(data);
  const trend = trendResult.slope > 0.1 ? 'increasing' : trendResult.slope < -0.1 ? 'decreasing' : 'stable';

  return {
    mean: meanVal,
    median: medianVal,
    range: { min: minVal, max: maxVal },
    trend,
    variability,
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
