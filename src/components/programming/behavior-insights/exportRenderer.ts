/**
 * Export-Safe Rendering Pipeline
 * 
 * Each bundle type produces differentiated output using summaryEngine.
 * NEVER export from the visible DOM. Always use this pipeline.
 */

import { supabase } from '@/integrations/supabase/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { BehaviorSummaryRow } from './types';
import { generateFullSummary, type ToneProfile } from './summaryEngine';

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

type BundleProfile = {
  tone: ToneProfile;
  sections: string[];
  title: string;
};

const BUNDLE_PROFILES: Record<string, BundleProfile> = {
  graph: { tone: 'concise', sections: ['graph_snapshot'], title: 'Graph Export' },
  table: { tone: 'concise', sections: ['behavior_percentages'], title: 'Analytics Table' },
  summary: { tone: 'clinical', sections: ['fba_summary', 'behavior_percentages', 'replacement_skills', 'intervention_focus'], title: 'Behavior Summary' },
  full: { tone: 'clinical', sections: ['behavior_percentages', 'fba_summary', 'escalation_chain', 'antecedents', 'consequences', 'replacement_skills', 'intervention_focus', 'staff_response', 'data_quality_note'], title: 'Complete Behavior Packet' },
  teacher: { tone: 'teacher_friendly', sections: ['behavior_percentages', 'fba_summary', 'replacement_skills', 'staff_response'], title: 'Teacher Summary' },
  bcba: { tone: 'clinical', sections: ['behavior_percentages', 'fba_summary', 'escalation_chain', 'antecedents', 'consequences', 'replacement_skills', 'intervention_focus', 'staff_response', 'reinforcement_focus', 'data_quality_note'], title: 'BCBA Clinical Report' },
  fba_bip: { tone: 'detailed', sections: ['behavior_percentages', 'fba_summary', 'escalation_chain', 'antecedents', 'consequences', 'replacement_skills', 'intervention_focus', 'staff_response', 'reinforcement_focus', 'data_quality_note'], title: 'FBA/BIP Appendix' },
  raw: { tone: 'concise', sections: ['behavior_percentages'], title: 'Raw Data Export' },
};

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

async function captureChartAsCanvas(chartElement: HTMLElement): Promise<HTMLCanvasElement> {
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: 800px; height: 400px;
    background: white; padding: 16px;
    font-family: system-ui, -apple-system, sans-serif;
    z-index: -1; overflow: hidden;
  `;
  document.body.appendChild(container);

  const clone = chartElement.cloneNode(true) as HTMLElement;
  clone.style.width = '100%';
  clone.style.height = '100%';
  clone.querySelectorAll('button, [role="button"], .cursor-pointer').forEach(el => {
    (el as HTMLElement).style.display = 'none';
  });
  container.appendChild(clone);

  await new Promise(r => setTimeout(r, 200));

  try {
    return await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      width: 800,
      height: 400,
    });
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

function buildPDFWithSummary(
  pdf: jsPDF,
  payload: ExportPayload,
  profile: BundleProfile,
) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const dateLabel = `${payload.dateRange.start.toLocaleDateString()} — ${payload.dateRange.end.toLocaleDateString()}`;
  const totalDays = Math.max(1, Math.ceil((payload.dateRange.end.getTime() - payload.dateRange.start.getTime()) / 86400000));

  const summary = generateFullSummary({
    rows: payload.summaryRows,
    studentName: payload.studentName,
    tone: profile.tone,
    dateRangeLabel: dateLabel,
    totalDays,
    daysWithData: Math.round(totalDays * 0.7),
  });

  // Header
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(payload.studentName, 14, 20);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100);
  pdf.text(`${dateLabel} • ${profile.title}`, 14, 27);
  pdf.setTextColor(0);

  // Confidence + Function badges
  pdf.setFontSize(8);
  pdf.text(`Confidence: ${summary.confidenceTier} | Pattern: ${summary.functionHypothesis}`, 14, 33);

  let yPos = 40;

  const addSection = (title: string, content: string | string[], isBullets = false) => {
    if (yPos > 250) { pdf.addPage(); yPos = 20; }

    // Section title
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 64, 175);
    pdf.text(title.toUpperCase(), 14, yPos);
    yPos += 2;
    pdf.setDrawColor(229, 231, 235);
    pdf.line(14, yPos, pageWidth - 14, yPos);
    yPos += 5;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0);

    if (typeof content === 'string') {
      const lines = pdf.splitTextToSize(content, pageWidth - 32);
      lines.forEach((line: string) => {
        if (yPos > 270) { pdf.addPage(); yPos = 20; }
        pdf.text(line, 18, yPos);
        yPos += 4;
      });
    } else {
      content.forEach(item => {
        if (yPos > 270) { pdf.addPage(); yPos = 20; }
        const bullet = isBullets ? '• ' : '';
        const lines = pdf.splitTextToSize(`${bullet}${item}`, pageWidth - 36);
        lines.forEach((line: string) => {
          pdf.text(line, 18, yPos);
          yPos += 4;
        });
      });
    }
    yPos += 4;
  };

  // Render sections based on profile
  const sections = profile.sections;

  if (sections.includes('behavior_percentages') && summary.behaviorPercentages.length > 0) {
    addSection('Behavior Breakdown', summary.behaviorPercentages.slice(0, 6).map(
      b => `${b.behaviorName}: ${b.pct}% (${b.count} incidents)`
    ), true);
  }

  if (sections.includes('fba_summary') && summary.fbaSummary) {
    addSection('Data-Informed Summary', summary.fbaSummary);
  }

  if (sections.includes('escalation_chain') && summary.escalationChain) {
    addSection('Escalation Pattern', summary.escalationChain);
  }

  if (sections.includes('antecedents')) {
    addSection('Antecedents', summary.antecedents);
  }

  if (sections.includes('consequences')) {
    addSection('Consequences', summary.consequences);
  }

  if (sections.includes('replacement_skills') && summary.replacementSkills.length > 0) {
    addSection('Priority Replacement Skills', summary.replacementSkills, true);
  }

  if (sections.includes('intervention_focus') && summary.interventionFocus.length > 0) {
    addSection('Intervention Focus', summary.interventionFocus, true);
  }

  if (sections.includes('staff_response')) {
    addSection('Staff Response Focus', [
      `PREVENT: ${summary.staffResponse.prevent}`,
      `TEACH: ${summary.staffResponse.teach}`,
      `RESPOND: ${summary.staffResponse.respond}`,
    ]);
  }

  if (sections.includes('reinforcement_focus') && summary.reinforcementNotes) {
    addSection('Reinforcement Notes', summary.reinforcementNotes);
  }

  if (sections.includes('data_quality_note') && summary.dataCompletenessNote) {
    addSection('Data Quality', summary.dataCompletenessNote);
  }

  // Table (if included)
  if (payload.includeTable && payload.summaryRows.length > 0) {
    if (yPos > 220) { pdf.addPage(); yPos = 20; }
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 64, 175);
    pdf.text('BEHAVIOR ANALYTICS TABLE', 14, yPos);
    yPos += 7;

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0);

    const cols = ['Behavior', 'Count', '%', 'Avg/Day', 'Peak', 'Trend', 'Flag'];
    const colWidths = [45, 18, 15, 18, 25, 18, 25];
    let xPos = 14;
    pdf.setFillColor(240, 240, 240);
    pdf.rect(14, yPos - 3, pageWidth - 28, 6, 'F');
    pdf.setFont('helvetica', 'bold');
    cols.forEach((col, i) => {
      pdf.text(col, xPos, yPos);
      xPos += colWidths[i];
    });
    yPos += 6;
    pdf.setFont('helvetica', 'normal');

    payload.summaryRows.forEach(row => {
      if (yPos > 260) { pdf.addPage(); yPos = 20; }
      xPos = 14;
      const vals = [
        row.behaviorName.substring(0, 20),
        String(row.totalCount),
        `${row.pctOfTotal.toFixed(1)}%`,
        row.avgPerDay.toFixed(1),
        row.peakDay ? row.peakDay.slice(5) : '—',
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

  // Footer
  pdf.setFontSize(7);
  pdf.setTextColor(150);
  pdf.text(
    `Generated ${new Date().toLocaleString()} — NovaTrack Core • Data-informed, not a clinical diagnosis`,
    14, pdf.internal.pageSize.getHeight() - 10,
  );
}

function buildDocHTML(payload: ExportPayload, profile: BundleProfile): string {
  const dateLabel = `${payload.dateRange.start.toLocaleDateString()} — ${payload.dateRange.end.toLocaleDateString()}`;
  const totalDays = Math.max(1, Math.ceil((payload.dateRange.end.getTime() - payload.dateRange.start.getTime()) / 86400000));

  const summary = generateFullSummary({
    rows: payload.summaryRows,
    studentName: payload.studentName,
    tone: profile.tone,
    dateRangeLabel: dateLabel,
    totalDays,
    daysWithData: Math.round(totalDays * 0.7),
  });

  const sections = profile.sections;
  let body = '';

  if (sections.includes('behavior_percentages') && summary.behaviorPercentages.length > 0) {
    body += `<div class="section"><h2>Behavior Breakdown</h2><ul>${summary.behaviorPercentages.slice(0, 6).map(b => `<li><strong>${b.behaviorName}</strong>: ${b.pct}% (${b.count})</li>`).join('')}</ul></div>`;
  }

  if (sections.includes('fba_summary') && summary.fbaSummary) {
    body += `<div class="section"><h2>Data-Informed Summary</h2><p class="summary">${summary.fbaSummary}</p></div>`;
  }

  if (sections.includes('escalation_chain') && summary.escalationChain) {
    body += `<div class="section"><h2>Escalation Pattern</h2><p class="alert">${summary.escalationChain}</p></div>`;
  }

  if (sections.includes('antecedents')) {
    body += `<div class="section"><h2>Antecedents</h2><p>${summary.antecedents}</p></div>`;
  }

  if (sections.includes('consequences')) {
    body += `<div class="section"><h2>Consequences</h2><p>${summary.consequences}</p></div>`;
  }

  if (sections.includes('replacement_skills') && summary.replacementSkills.length > 0) {
    body += `<div class="section"><h2>Priority Replacement Skills</h2><ul>${summary.replacementSkills.map(s => `<li>${s}</li>`).join('')}</ul></div>`;
  }

  if (sections.includes('intervention_focus') && summary.interventionFocus.length > 0) {
    body += `<div class="section"><h2>Intervention Focus</h2><ul>${summary.interventionFocus.map(s => `<li>${s}</li>`).join('')}</ul></div>`;
  }

  if (sections.includes('staff_response')) {
    body += `<div class="section"><h2>Staff Response Focus</h2>
      <div class="staff-grid">
        <div class="staff-card"><div class="staff-label prevent">Prevent</div><p>${summary.staffResponse.prevent}</p></div>
        <div class="staff-card"><div class="staff-label teach">Teach</div><p>${summary.staffResponse.teach}</p></div>
        <div class="staff-card"><div class="staff-label respond">Respond</div><p>${summary.staffResponse.respond}</p></div>
      </div>
    </div>`;
  }

  if (sections.includes('reinforcement_focus') && summary.reinforcementNotes) {
    body += `<div class="section"><h2>Reinforcement Notes</h2><p>${summary.reinforcementNotes}</p></div>`;
  }

  if (sections.includes('data_quality_note') && summary.dataCompletenessNote) {
    body += `<div class="section"><h2>Data Quality</h2><p class="note">${summary.dataCompletenessNote}</p></div>`;
  }

  if (payload.includeTable && payload.summaryRows.length > 0) {
    const sorted = [...payload.summaryRows].sort((a, b) => b.totalCount - a.totalCount);
    body += `<div class="section"><h2>Behavior Analytics</h2>
      <table><tr><th>Behavior</th><th>Count</th><th>%</th><th>Avg/Day</th><th>Peak</th><th>Trend</th><th>Flag</th></tr>
      ${sorted.map(r => `<tr>
        <td>${r.behaviorName}</td><td>${r.totalCount}</td><td>${r.pctOfTotal.toFixed(1)}%</td>
        <td>${r.avgPerDay.toFixed(1)}</td><td>${r.peakDay || '—'}</td>
        <td>${r.trendPct != null ? `${r.trendPct > 0 ? '+' : ''}${r.trendPct.toFixed(0)}%` : '—'}</td>
        <td>${r.clinicalFlag ? `<span class="badge ${r.clinicalFlag}">${r.clinicalFlag}</span>` : '—'}</td>
      </tr>`).join('')}
      </table></div>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 40px; color: #111; line-height: 1.6; }
  h1 { font-size: 20px; margin-bottom: 4px; font-weight: 700; }
  .subtitle { color: #666; font-size: 12px; margin-bottom: 24px; }
  .badges { margin-bottom: 16px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; margin-right: 6px; }
  .badge.increasing { background: #fee2e2; color: #b91c1c; }
  .badge.decreasing { background: #d1fae5; color: #065f46; }
  .badge.stable { background: #e5e7eb; color: #374151; }
  .badge.spike { background: #fef3c7; color: #92400e; }
  .section { margin: 24px 0; page-break-inside: avoid; }
  .section h2 { font-size: 13px; font-weight: 700; color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; font-size: 12px; }
  .alert { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 16px; font-size: 12px; }
  .note { background: #f1f5f9; border-radius: 8px; padding: 12px; font-size: 11px; color: #64748b; font-style: italic; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #e5e7eb; padding: 6px 10px; font-size: 11px; text-align: left; }
  th { background: #f8fafc; font-weight: 600; }
  ul { padding-left: 20px; }
  li { font-size: 12px; margin-bottom: 6px; }
  .staff-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 8px; }
  .staff-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
  .staff-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .staff-label.prevent { color: #2563eb; }
  .staff-label.teach { color: #059669; }
  .staff-label.respond { color: #7c3aed; }
  .staff-card p { font-size: 12px; }
  .footer { margin-top: 36px; border-top: 2px solid #e5e7eb; padding-top: 10px; font-size: 10px; color: #9ca3af; text-align: center; }
</style></head><body>
<h1>${payload.studentName}</h1>
<p class="subtitle">${dateLabel} • ${profile.title}</p>
<div class="badges">
  <span class="badge">${summary.confidenceTier} confidence</span>
  <span class="badge">${summary.functionHypothesis} pattern</span>
</div>
${body}
<p class="footer">Generated ${new Date().toLocaleString()} — NovaTrack Core • Data-informed, not a clinical diagnosis</p>
</body></html>`;
}

export async function executeExport(
  payload: ExportPayload,
  userId: string,
): Promise<{ success: boolean; diagnostics: ExportDiagnostics }> {
  const filename = buildFilename(payload.studentName, payload.format, payload.bundle);
  const profile = BUNDLE_PROFILES[payload.bundle] || BUNDLE_PROFILES.full;
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
    // Log export job
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

    switch (payload.format) {
      case 'csv': {
        diagnostics.mime_type = 'text/csv';
        const csv = buildCSV(payload.summaryRows);
        downloadBlob(new Blob([csv], { type: 'text/csv' }), filename);
        break;
      }

      case 'xlsx': {
        diagnostics.mime_type = 'text/csv';
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

        // Chart image first if requested
        if (payload.includeGraph && payload.chartElement) {
          try {
            const canvas = await captureChartAsCanvas(payload.chartElement);
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pdf.internal.pageSize.getWidth() - 28;
            const imgHeight = (canvas.height / canvas.width) * imgWidth;
            pdf.addImage(imgData, 'PNG', 14, 14, imgWidth, imgHeight);
            pdf.addPage();
          } catch {
            diagnostics.error_stage = 'chart_render';
          }
        }

        buildPDFWithSummary(pdf, payload, profile);
        pdf.save(filename);
        break;
      }

      case 'doc': {
        diagnostics.mime_type = 'text/html';
        const html = buildDocHTML(payload, profile);
        downloadBlob(new Blob([html], { type: 'text/html' }), filename.replace('.doc', '.html'));
        break;
      }
    }

    diagnostics.error_stage = null;
    return { success: true, diagnostics };
  } catch (err: any) {
    diagnostics.error_stage = diagnostics.error_stage || err.message;
    return { success: false, diagnostics };
  }
}
