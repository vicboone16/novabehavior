import { format } from 'date-fns';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType,
  BorderStyle,
  AlignmentType,
} from 'docx';
import { saveAs } from 'file-saver';
import {
  EnhancedSessionNote,
  NOTE_TYPE_LABELS,
  SERVICE_SETTING_LABELS,
} from '@/types/sessionNotes';

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

export async function exportNoteToDocx(note: EnhancedSessionNote): Promise<void> {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      text: `SESSION NOTE - ${NOTE_TYPE_LABELS[note.note_type]}`,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    })
  );

  children.push(new Paragraph({ text: '' }));

  // Header info
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Date: ', bold: true }),
        new TextRun(format(new Date(note.start_time), 'MMMM d, yyyy')),
      ],
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Time: ', bold: true }),
        new TextRun(
          `${format(new Date(note.start_time), 'h:mm a')}${note.end_time ? ` - ${format(new Date(note.end_time), 'h:mm a')}` : ''}`
        ),
      ],
    })
  );

  if (note.duration_minutes) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Duration: ', bold: true }),
          new TextRun(`${note.duration_minutes} minutes`),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Setting: ', bold: true }),
        new TextRun(SERVICE_SETTING_LABELS[note.service_setting]),
      ],
    })
  );

  if (note.location_detail) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Location: ', bold: true }),
          new TextRun(note.location_detail),
        ],
      })
    );
  }

  children.push(new Paragraph({ text: '' }));

  // Session Data Summary
  if (note.pulled_data_snapshot) {
    children.push(
      new Paragraph({
        text: 'SESSION DATA SUMMARY',
        heading: HeadingLevel.HEADING_2,
      })
    );
    children.push(new Paragraph({ text: '' }));

    if (note.pulled_data_snapshot.behaviors?.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Behavior Data:', bold: true })],
        })
      );

      note.pulled_data_snapshot.behaviors.forEach((b) => {
        const parts: string[] = [];
        if (b.frequencyCount > 0) parts.push(`${b.frequencyCount} occurrences`);
        if (b.durationSeconds > 0) parts.push(`${formatDuration(b.durationSeconds)} total`);
        if (b.intervalPercentage > 0) parts.push(`${b.intervalPercentage}% of intervals`);
        if (b.abcCount > 0) parts.push(`${b.abcCount} ABC records`);

        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `  • ${b.behaviorName}: ` }),
              new TextRun(parts.join(', ')),
            ],
          })
        );
      });
      children.push(new Paragraph({ text: '' }));
    }

    if (note.pulled_data_snapshot.skills?.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Skill Acquisition:', bold: true })],
        })
      );

      note.pulled_data_snapshot.skills.forEach((s) => {
        children.push(
          new Paragraph({
            text: `  • ${s.targetName}: ${s.trialsCompleted} trials, ${s.percentCorrect}% correct`,
          })
        );
      });
      children.push(new Paragraph({ text: '' }));
    }
  }

  // Note Content
  if (note.note_content && Object.keys(note.note_content).length > 0) {
    children.push(
      new Paragraph({
        text: 'NOTE CONTENT',
        heading: HeadingLevel.HEADING_2,
      })
    );
    children.push(new Paragraph({ text: '' }));

    Object.entries(note.note_content).forEach(([key, value]) => {
      if (value) {
        const label = key
          .replace(/_/g, ' ')
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase());

        children.push(
          new Paragraph({
            children: [new TextRun({ text: `${label}:`, bold: true })],
          })
        );

        if (Array.isArray(value)) {
          children.push(new Paragraph({ text: value.join(', ') }));
        } else {
          children.push(new Paragraph({ text: String(value) }));
        }
        children.push(new Paragraph({ text: '' }));
      }
    });
  }

  // Signature
  children.push(new Paragraph({ text: '' }));
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: '─'.repeat(50) }),
      ],
    })
  );

  if (note.clinician_signature_name) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Clinician: ', bold: true }),
          new TextRun(note.clinician_signature_name),
        ],
      })
    );
  }

  if (note.credential) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Credential: ', bold: true }),
          new TextRun(note.credential),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Status: ', bold: true }),
        new TextRun(note.status.toUpperCase()),
      ],
    })
  );

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  // Generate and save
  const blob = await Packer.toBlob(doc);
  const filename = `session-note-${note.student_name?.replace(/\s+/g, '-') || 'unknown'}-${format(new Date(note.start_time), 'yyyy-MM-dd')}.docx`;
  saveAs(blob, filename);
}

export function generateNoteText(note: EnhancedSessionNote): string {
  const lines: string[] = [];
  
  // Header
  lines.push(`SESSION NOTE - ${NOTE_TYPE_LABELS[note.note_type]}`);
  lines.push(`Date: ${format(new Date(note.start_time), 'MMMM d, yyyy')}`);
  lines.push(`Time: ${format(new Date(note.start_time), 'h:mm a')}${note.end_time ? ` - ${format(new Date(note.end_time), 'h:mm a')}` : ''}`);
  if (note.duration_minutes) {
    lines.push(`Duration: ${note.duration_minutes} minutes`);
  }
  lines.push(`Setting: ${SERVICE_SETTING_LABELS[note.service_setting]}`);
  if (note.location_detail) {
    lines.push(`Location: ${note.location_detail}`);
  }
  lines.push('');

  // Session Data Summary
  if (note.pulled_data_snapshot) {
    lines.push('--- SESSION DATA SUMMARY ---');
    
    if (note.pulled_data_snapshot.behaviors?.length > 0) {
      lines.push('');
      lines.push('Behavior Data:');
      note.pulled_data_snapshot.behaviors.forEach(b => {
        const parts: string[] = [];
        if (b.frequencyCount > 0) parts.push(`${b.frequencyCount} occurrences`);
        if (b.durationSeconds > 0) parts.push(`${formatDuration(b.durationSeconds)} total`);
        if (b.intervalPercentage > 0) parts.push(`${b.intervalPercentage}% of intervals`);
        if (b.abcCount > 0) parts.push(`${b.abcCount} ABC records`);
        lines.push(`  • ${b.behaviorName}: ${parts.join(', ')}`);
      });
    }

    if (note.pulled_data_snapshot.skills?.length > 0) {
      lines.push('');
      lines.push('Skill Acquisition:');
      note.pulled_data_snapshot.skills.forEach(s => {
        lines.push(`  • ${s.targetName}: ${s.trialsCompleted} trials, ${s.percentCorrect}% correct`);
      });
    }
    lines.push('');
  }

  // Note Content
  if (note.note_content && Object.keys(note.note_content).length > 0) {
    lines.push('--- NOTE CONTENT ---');
    lines.push('');
    
    Object.entries(note.note_content).forEach(([key, value]) => {
      if (value) {
        const label = key
          .replace(/_/g, ' ')
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase());
        
        if (Array.isArray(value)) {
          lines.push(`${label}: ${value.join(', ')}`);
        } else {
          lines.push(`${label}:`);
          lines.push(String(value));
        }
        lines.push('');
      }
    });
  }

  // Signature
  lines.push('---');
  if (note.clinician_signature_name) {
    lines.push(`Clinician: ${note.clinician_signature_name}`);
  }
  if (note.credential) {
    lines.push(`Credential: ${note.credential}`);
  }
  lines.push(`Status: ${note.status.toUpperCase()}`);

  return lines.join('\n');
}
