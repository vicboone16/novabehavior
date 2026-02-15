/**
 * Canvas-based chart renderer for FBA report export.
 * Renders bar/pie charts to PNG Uint8Array for embedding in .docx via ImageRun.
 */

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const CHART_WIDTH = 540;
const CHART_HEIGHT = 300;
const PADDING = 50;

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width * 2; // retina
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  return canvas;
}

function getCtx(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  return canvas.getContext('2d')!;
}

async function canvasToUint8Array(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) { resolve(new Uint8Array()); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.readAsArrayBuffer(blob);
    }, 'image/png');
  });
}

/** Horizontal bar chart for function analysis (attention, escape, tangible, sensory) */
export async function renderFunctionBarChart(
  data: Array<{ label: string; value: number; percentage: number }>,
  title: string = 'Hypothesized Function Analysis'
): Promise<{ buffer: Uint8Array; width: number; height: number }> {
  const w = CHART_WIDTH;
  const h = CHART_HEIGHT;
  const canvas = createCanvas(w, h);
  const ctx = getCtx(canvas);

  // Title
  ctx.fillStyle = '#1F2937';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, w / 2, 24);

  if (data.length === 0) {
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText('No data available', w / 2, h / 2);
    return { buffer: await canvasToUint8Array(canvas), width: w, height: h };
  }

  const barAreaTop = 44;
  const barAreaBottom = h - 30;
  const barAreaLeft = 140;
  const barAreaRight = w - PADDING;
  const barHeight = Math.min(36, (barAreaBottom - barAreaTop) / data.length - 8);
  const maxVal = Math.max(...data.map(d => d.percentage), 1);

  data.forEach((d, i) => {
    const y = barAreaTop + i * (barHeight + 8);
    const barWidth = ((d.percentage / maxVal) * (barAreaRight - barAreaLeft));

    // Label
    ctx.fillStyle = '#374151';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(d.label, barAreaLeft - 10, y + barHeight / 2 + 4);

    // Bar
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.beginPath();
    ctx.roundRect(barAreaLeft, y, Math.max(barWidth, 2), barHeight, 3);
    ctx.fill();

    // Value
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${d.percentage}% (n=${d.value})`, barAreaLeft + barWidth + 6, y + barHeight / 2 + 4);
  });

  return { buffer: await canvasToUint8Array(canvas), width: w, height: h };
}

/** Vertical bar chart for ABC antecedent/consequence frequencies */
export async function renderFrequencyBarChart(
  data: Array<{ label: string; count: number; percentage: number }>,
  title: string = 'Antecedent Frequency'
): Promise<{ buffer: Uint8Array; width: number; height: number }> {
  const w = CHART_WIDTH;
  const h = CHART_HEIGHT;
  const canvas = createCanvas(w, h);
  const ctx = getCtx(canvas);

  ctx.fillStyle = '#1F2937';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, w / 2, 24);

  if (data.length === 0) {
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText('No data available', w / 2, h / 2);
    return { buffer: await canvasToUint8Array(canvas), width: w, height: h };
  }

  const chartTop = 44;
  const chartBottom = h - 60;
  const chartLeft = PADDING + 10;
  const chartRight = w - PADDING;
  const chartHeight = chartBottom - chartTop;
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const barWidth = Math.min(50, (chartRight - chartLeft) / data.length - 12);

  // Y axis
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = chartTop + (chartHeight * i) / 4;
    ctx.beginPath();
    ctx.moveTo(chartLeft, y);
    ctx.lineTo(chartRight, y);
    ctx.stroke();

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '10px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(Math.round(maxVal * (4 - i) / 4)), chartLeft - 6, y + 4);
  }

  // Bars
  const totalWidth = data.length * (barWidth + 12);
  const startX = chartLeft + (chartRight - chartLeft - totalWidth) / 2;

  data.forEach((d, i) => {
    const x = startX + i * (barWidth + 12) + 6;
    const barH = (d.count / maxVal) * chartHeight;
    const y = chartBottom - barH;

    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barH, [3, 3, 0, 0]);
    ctx.fill();

    // Count on top
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 10px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(d.count), x + barWidth / 2, y - 4);

    // Label below
    ctx.fillStyle = '#374151';
    ctx.font = '9px Arial, sans-serif';
    ctx.textAlign = 'center';
    const label = d.label.length > 12 ? d.label.slice(0, 11) + '…' : d.label;
    ctx.save();
    ctx.translate(x + barWidth / 2, chartBottom + 8);
    ctx.rotate(-0.4);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  });

  return { buffer: await canvasToUint8Array(canvas), width: w, height: h };
}

/** Bar chart for FAST/MAS/QABF indirect assessment scores */
export async function renderIndirectAssessmentChart(
  scores: { attention: number; escape: number; tangible: number; sensory: number },
  assessmentType: string,
  targetBehavior: string
): Promise<{ buffer: Uint8Array; width: number; height: number }> {
  const w = CHART_WIDTH;
  const h = CHART_HEIGHT;
  const canvas = createCanvas(w, h);
  const ctx = getCtx(canvas);

  const title = `${assessmentType} – ${targetBehavior}`;
  ctx.fillStyle = '#1F2937';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, w / 2, 24);

  const items = [
    { label: 'Attention', value: scores.attention, color: '#3B82F6' },
    { label: 'Escape', value: scores.escape, color: '#10B981' },
    { label: 'Tangible', value: scores.tangible, color: '#F59E0B' },
    { label: 'Sensory/Automatic', value: scores.sensory, color: '#EF4444' },
  ];

  const chartTop = 50;
  const chartBottom = h - 50;
  const chartLeft = 80;
  const chartRight = w - 50;
  const chartHeight = chartBottom - chartTop;
  const maxVal = Math.max(...items.map(i => i.value), 1);
  const barWidth = 60;
  const totalWidth = items.length * (barWidth + 20);
  const startX = chartLeft + (chartRight - chartLeft - totalWidth) / 2;

  // Grid
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = chartTop + (chartHeight * i) / 4;
    ctx.beginPath();
    ctx.moveTo(chartLeft, y);
    ctx.lineTo(chartRight, y);
    ctx.stroke();

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '10px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(Math.round(maxVal * (4 - i) / 4)), chartLeft - 8, y + 4);
  }

  items.forEach((item, i) => {
    const x = startX + i * (barWidth + 20) + 10;
    const barH = (item.value / maxVal) * chartHeight;
    const y = chartBottom - barH;

    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(item.value), x + barWidth / 2, y - 6);

    ctx.fillStyle = '#374151';
    ctx.font = '11px Arial, sans-serif';
    ctx.fillText(item.label, x + barWidth / 2, chartBottom + 16);
  });

  // Highlight primary
  const primary = items.reduce((a, b) => a.value > b.value ? a : b);
  ctx.fillStyle = '#6B7280';
  ctx.font = 'italic 11px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Primary Function: ${primary.label}`, w / 2, h - 10);

  return { buffer: await canvasToUint8Array(canvas), width: w, height: h };
}
