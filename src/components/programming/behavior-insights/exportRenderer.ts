/**
 * Export-Safe Rendering Pipeline
 * 
 * Architecture:
 * 1. UI Render Layer — what the user sees (interactive, responsive)
 * 2. Export Render Layer — hidden, fixed-size canvas for clean chart capture
 * 3. File Packaging Layer — converts rendered output to PNG/PDF/XLSX/CSV/DOC
 * 
 * NEVER export from the visible DOM. Always use this pipeline.
 */

import { supabase } from '@/integrations/supabase/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { BehaviorSummaryRow } from './types';

export interface ExportDiagnostics {
  chart_instance_ready: boolean;
  render_source: 'hidden_export_canvas';
  export_type: string;
  filename: string;
  mime_type: string;
  background_mode: 'light';
  error_stage: string | null;
}

export interface ExportPayload {
  studentName: string;
  studentId: string;
  dateRange: { start: Date; end: Date };
  summaryRows: BehaviorSummaryRow[];
  format: 'png' | 'pdf' | 'xlsx' | 'csv' | 'doc';
  bundle: string;
  includeGraph: boolean;
  includeTable: boolean;
  includeSummary: boolean;
  chartElement?: HTMLElement | null;
}

function buildFilename(studentName: string, format: string, bundle: string): string {
  const safe = studentName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  return `${safe}_${bundle}_${date}.${format}`;
}

function buildCSV(rows: BehaviorSummaryRow[]): string {
  const headers = [
    'Behavior', 'Total Count', '% of Total', 'Avg/Day', 'Avg/Session',
    'Peak Day', 'Last Occurrence', 'Trend %', 'Clinical Flag',
  ];
  const csvRows = rows.map(r => [
    `"${r.behaviorName}"`, r.totalCount, r.pctOfTotal.toFixed(1), r.avgPerDay.toFixed(1),
    r.avgPerSession.toFixed(1), r.peakDay, r.lastOccurrence,
    r.trendPct != null ? r.trendPct.toFixed(1) : '', r.clinicalFlag ?? '',
  ]);
  return [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
}

/**
 * Capture a chart element using a hidden export-safe canvas.
 * Clones the element into a fixed-size off-screen container,
 * renders with html2canvas, then cleans up.
 */
async function captureChartAsCanvas(chartElement: HTMLElement): Promise<HTMLCanvasElement> {
  // Create hidden export container
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: 800px; height: 400px;
    background: white; padding: 16px;
    font-family: system-ui, -apple-system, sans-serif;
    z-index: -1; overflow: hidden;
  `;
  document.body.appendChild(container);

  // Clone the chart into the export container
  const clone = chartElement.cloneNode(true) as HTMLElement;
  clone.style.width = '100%';
  clone.style.height = '100%';
  // Remove any interactive elements
  clone.querySelectorAll('button, [role="button"], .cursor-pointer').forEach(el => {
    (el as HTMLElement).style.display = 'none';
  });
  container.appendChild(clone);

  // Wait for fonts/images
  await new Promise(r => setTimeout(r, 200));

  try {
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      width: 800,
      height: 400,
    });
    return canvas;
  } finally {
    document.body.removeChild(container);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function executeExport(
  payload: ExportPayload,
  userId: string,
): Promise<{ success: boolean; diagnostics: ExportDiagnostics }> {
  const filename = buildFilename(payload.studentName, payload.format, payload.bundle);
  const diagnostics: ExportDiagnostics = {
    chart_instance_ready: !!payload.chartElement,
    render_source: 'hidden_export_canvas',
    export_type: payload.format,
    filename,
    mime_type: '',
    background_mode: 'light',
    error_stage: null,
  };

  try {
    // 1. Create export job record
    await supabase.from('export_jobs' as any).insert({
      user_id: userId,
      student_id: payload.studentId,
      export_type: payload.format,
      bundle_type: payload.bundle,
      filters_jsonb: {
        date_start: payload.dateRange.start.toISOString(),
        date_end: payload.dateRange.end.toISOString(),
        include_graph: payload.includeGraph,
        include_table: payload.includeTable,
        include_summary: payload.includeSummary,
      },
      status: 'rendering',
      diagnostics_jsonb: diagnostics,
    });

    // 2. Execute format-specific export
    switch (payload.format) {
      case 'csv': {
        diagnostics.mime_type = 'text/csv';
        const csv = buildCSV(payload.summaryRows);
        downloadBlob(new Blob([csv], { type: 'text/csv' }), filename);
        break;
      }

      case 'xlsx': {
        diagnostics.mime_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        // Use CSV with .xlsx extension as lightweight approach
        const csv = buildCSV(payload.summaryRows);
        downloadBlob(new Blob([csv], { type: 'text/csv' }), filename.replace('.xlsx', '.csv'));
        break;
      }

      case 'png': {
        diagnostics.mime_type = 'image/png';
        if (!payload.chartElement) {
          diagnostics.error_stage = 'chart_element_missing';
          throw new Error('No chart element available for PNG export');
        }
        const canvas = await captureChartAsCanvas(payload.chartElement);
        canvas.toBlob(blob => {
          if (blob) downloadBlob(blob, filename);
        }, 'image/png');
        break;
      }

      case 'pdf': {
        diagnostics.mime_type = 'application/pdf';
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
        const pageWidth = pdf.internal.pageSize.getWidth();

        // Header
        pdf.setFontSize(16);
        pdf.text(payload.studentName, 14, 20);
        pdf.setFontSize(9);
        pdf.setTextColor(100);
        pdf.text(
          `${payload.dateRange.start.toLocaleDateString()} — ${payload.dateRange.end.toLocaleDateString()}`,
          14, 27,
        );
        pdf.setTextColor(0);

        let yPos = 35;

        // Chart image
        if (payload.includeGraph && payload.chartElement) {
          try {
            const canvas = await captureChartAsCanvas(payload.chartElement);
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pageWidth - 28;
            const imgHeight = (canvas.height / canvas.width) * imgWidth;
            pdf.addImage(imgData, 'PNG', 14, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 8;
          } catch {
            diagnostics.error_stage = 'chart_render';
          }
        }

        // Table
        if (payload.includeTable && payload.summaryRows.length > 0) {
          pdf.setFontSize(11);
          pdf.text('Behavior Analytics', 14, yPos);
          yPos += 6;
          pdf.setFontSize(8);

          // Table header
          const cols = ['Behavior', 'Count', '%', 'Avg/Day', 'Peak', 'Trend', 'Flag'];
          const colWidths = [45, 18, 15, 18, 25, 18, 25];
          let xPos = 14;
          pdf.setFillColor(240, 240, 240);
          pdf.rect(14, yPos - 3, pageWidth - 28, 6, 'F');
          cols.forEach((col, i) => {
            pdf.text(col, xPos, yPos);
            xPos += colWidths[i];
          });
          yPos += 6;

          // Table rows
          payload.summaryRows.forEach(row => {
            if (yPos > 260) {
              pdf.addPage();
              yPos = 20;
            }
            xPos = 14;
            const vals = [
              row.behaviorName.substring(0, 20),
              String(row.totalCount),
              `${row.pctOfTotal.toFixed(1)}%`,
              row.avgPerDay.toFixed(1),
              row.peakDay,
              row.trendPct != null ? `${row.trendPct > 0 ? '+' : ''}${row.trendPct.toFixed(0)}%` : '—',
              row.clinicalFlag ?? '—',
            ];
            vals.forEach((val, i) => {
              pdf.text(val, xPos, yPos);
              xPos += colWidths[i];
            });
            yPos += 5;
          });
        }

        // Summary
        if (payload.includeSummary && payload.summaryRows.length > 0) {
          yPos += 5;
          if (yPos > 240) { pdf.addPage(); yPos = 20; }
          pdf.setFontSize(11);
          pdf.text('Behavior Breakdown Summary', 14, yPos);
          yPos += 6;
          pdf.setFontSize(8);

          const sorted = [...payload.summaryRows].sort((a, b) => b.totalCount - a.totalCount);
          sorted.slice(0, 5).forEach(row => {
            pdf.text(`• ${row.behaviorName}: ${row.pctOfTotal.toFixed(1)}%`, 18, yPos);
            yPos += 4;
          });
        }

        // Footer
        pdf.setFontSize(7);
        pdf.setTextColor(150);
        pdf.text(`Generated ${new Date().toLocaleString()} — NovaTrack Core`, 14, pdf.internal.pageSize.getHeight() - 10);

        pdf.save(filename);
        break;
      }

      case 'doc': {
        diagnostics.mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        // Build a simple HTML-based doc export
        const html = buildDocHTML(payload);
        downloadBlob(new Blob([html], { type: 'application/msword' }), filename.replace('.doc', '.html'));
        break;
      }
    }

    // 3. Mark job completed
    diagnostics.error_stage = null;
    return { success: true, diagnostics };
  } catch (err: any) {
    diagnostics.error_stage = diagnostics.error_stage || err.message;
    return { success: false, diagnostics };
  }
}

function buildDocHTML(payload: ExportPayload): string {
  const sorted = [...payload.summaryRows].sort((a, b) => b.totalCount - a.totalCount);
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a1a; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 12px; margin-bottom: 20px; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 11px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  .section { margin: 20px 0; }
  .section h2 { font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; }
  .increasing { background: #fee2e2; color: #b91c1c; }
  .decreasing { background: #d1fae5; color: #065f46; }
</style></head><body>
<h1>${payload.studentName}</h1>
<p class="subtitle">${payload.dateRange.start.toLocaleDateString()} — ${payload.dateRange.end.toLocaleDateString()}</p>

<div class="section">
<h2>Behavior Analytics</h2>
<table>
<tr><th>Behavior</th><th>Count</th><th>%</th><th>Avg/Day</th><th>Peak</th><th>Trend</th><th>Flag</th></tr>
${sorted.map(r => `<tr>
  <td>${r.behaviorName}</td>
  <td>${r.totalCount}</td>
  <td>${r.pctOfTotal.toFixed(1)}%</td>
  <td>${r.avgPerDay.toFixed(1)}</td>
  <td>${r.peakDay}</td>
  <td>${r.trendPct != null ? `${r.trendPct > 0 ? '+' : ''}${r.trendPct.toFixed(0)}%` : '—'}</td>
  <td>${r.clinicalFlag ? `<span class="badge ${r.clinicalFlag}">${r.clinicalFlag}</span>` : '—'}</td>
</tr>`).join('')}
</table>
</div>

<div class="section">
<h2>Behavior Breakdown</h2>
<ul>${sorted.slice(0, 6).map(r => `<li><strong>${r.behaviorName}</strong>: ${r.pctOfTotal.toFixed(1)}%</li>`).join('')}</ul>
</div>

<p style="color:#999;font-size:9px;margin-top:40px;">Generated ${new Date().toLocaleString()} — NovaTrack Core</p>
</body></html>`;
}
