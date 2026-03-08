/**
 * Utility to build DOCX paragraphs for strategy-based export sections.
 * Used by FBA and BIP export flows. Append-only – never replaces existing content.
 */
import { Paragraph, TextRun, HeadingLevel } from 'docx';
import type { StrategyExportPayload } from '@/components/behavior-strategies/StrategyContentPreview';

export function buildStrategyExportParagraphs(payload: StrategyExportPayload | null): Paragraph[] {
  if (!payload || !payload.includeStrategySections) return [];

  const paragraphs: Paragraph[] = [];
  const hasAnything =
    payload.selectedStrategies.length > 0 ||
    payload.clinicalNarrative ||
    payload.teacherSummary ||
    payload.caregiverSummary;

  if (!hasAnything) return [];

  // Separator
  paragraphs.push(new Paragraph({ text: '', spacing: { before: 400 } }));

  // Selected strategies list
  if (payload.selectedStrategies.length > 0) {
    paragraphs.push(new Paragraph({
      text: 'RECOMMENDED FUNCTION-BASED STRATEGIES',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }));
    payload.selectedStrategies.forEach(s => {
      paragraphs.push(new Paragraph({
        text: `• ${s.name}${s.group ? ` (${s.group.replace(/_/g, ' ')})` : ''}`,
        spacing: { after: 80 },
      }));
    });
  }

  // Clinical narrative
  if (payload.clinicalNarrative) {
    paragraphs.push(new Paragraph({
      text: 'CLINICAL INTERVENTION NARRATIVE',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }));
    // Split by double newline for paragraph breaks
    payload.clinicalNarrative.split(/\n\n+/).forEach(block => {
      paragraphs.push(new Paragraph({
        text: block.trim(),
        spacing: { after: 150 },
      }));
    });
  }

  // Teacher summary
  if (payload.teacherSummary) {
    paragraphs.push(new Paragraph({
      text: 'TEACHER IMPLEMENTATION SUMMARY',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }));
    payload.teacherSummary.split(/\n\n+/).forEach(block => {
      paragraphs.push(new Paragraph({
        text: block.trim(),
        spacing: { after: 150 },
      }));
    });
  }

  // Caregiver summary
  if (payload.caregiverSummary) {
    paragraphs.push(new Paragraph({
      text: 'CAREGIVER / HOME SUPPORT SUMMARY',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }));
    payload.caregiverSummary.split(/\n\n+/).forEach(block => {
      paragraphs.push(new Paragraph({
        text: block.trim(),
        spacing: { after: 150 },
      }));
    });
  }

  return paragraphs;
}
