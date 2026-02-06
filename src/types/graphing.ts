export type AnnotationType = 'phase_change' | 'condition_label' | 'note' | 'aim_line' | 'trend_line';
export type ChartType = 'line' | 'bar' | 'multi_element' | 'cumulative' | 'celeration';

export interface GraphAnnotation {
  id: string;
  student_id: string;
  behavior_id?: string | null;
  target_id?: string | null;
  annotation_type: AnnotationType;
  position_date?: string | null;
  position_value?: number | null;
  end_date?: string | null;
  end_value?: number | null;
  label_text?: string | null;
  description?: string | null;
  style: {
    color?: string;
    lineStyle?: 'solid' | 'dashed' | 'dotted';
    lineWidth?: number;
    fontSize?: number;
  };
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GraphConfiguration {
  id: string;
  student_id?: string | null;
  name: string;
  chart_type: ChartType;
  data_sources: {
    type: 'behavior' | 'target';
    id: string;
    name: string;
    color?: string;
  }[];
  display_options: {
    showGrid?: boolean;
    showLegend?: boolean;
    showDataPoints?: boolean;
    showTrendLine?: boolean;
    trendLineMethod?: 'split-middle' | 'least-squares';
    showAimLine?: boolean;
    yAxisLabel?: string;
    xAxisLabel?: string;
  };
  date_range_start?: string | null;
  date_range_end?: string | null;
  annotation_ids: string[];
  is_default: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrendLineData {
  slope: number;
  intercept: number;
  points: { x: number; y: number }[];
  method: 'split-middle' | 'least-squares';
}

export interface AimLineData {
  startDate: string;
  startValue: number;
  endDate: string;
  endValue: number;
}
