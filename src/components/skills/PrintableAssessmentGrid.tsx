import { useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import type { StudentAssessment, CurriculumItem, MilestoneScore } from '@/types/curriculum';

interface PrintableAssessmentGridProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: StudentAssessment;
  items: CurriculumItem[];
  studentName: string;
  systemName: string;
}

export function PrintableAssessmentGrid({
  open,
  onOpenChange,
  assessment,
  items,
  studentName,
  systemName,
}: PrintableAssessmentGridProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Group items by domain and level
  const itemsByDomainAndLevel = useMemo(() => {
    const grouped = new Map<string, Map<string, CurriculumItem[]>>();
    
    items.forEach(item => {
      const domainName = item.domain?.name || 'Other';
      const level = item.level || 'Unknown';
      
      if (!grouped.has(domainName)) {
        grouped.set(domainName, new Map());
      }
      
      const domainMap = grouped.get(domainName)!;
      if (!domainMap.has(level)) {
        domainMap.set(level, []);
      }
      
      domainMap.get(level)!.push(item);
    });

    grouped.forEach(domainMap => {
      domainMap.forEach(items => {
        items.sort((a, b) => a.display_order - b.display_order);
      });
    });

    return grouped;
  }, [items]);

  const results = assessment.results_json as Record<string, MilestoneScore>;

  const getScoreDisplay = (itemId: string) => {
    const score = results[itemId]?.score;
    if (score === undefined) return '—';
    if (score === 0) return '0';
    if (score === 0.5) return '½';
    return '1';
  };

  const getScoreClass = (itemId: string) => {
    const score = results[itemId]?.score;
    if (score === undefined) return 'text-muted-foreground';
    if (score === 0) return 'text-red-600 font-bold';
    if (score === 0.5) return 'text-yellow-600 font-bold';
    return 'text-green-600 font-bold';
  };

  // Calculate domain scores
  const domainScores = useMemo(() => {
    const scores: Record<string, { total: number; possible: number; mastered: number }> = {};
    
    items.forEach(item => {
      const domainName = item.domain?.name || 'Other';
      if (!scores[domainName]) {
        scores[domainName] = { total: 0, possible: 0, mastered: 0 };
      }
      
      scores[domainName].possible += 1;
      const score = results[item.id]?.score;
      if (score !== undefined) {
        scores[domainName].total += score;
        if (score === 1) scores[domainName].mastered += 1;
      }
    });

    return scores;
  }, [items, results]);

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${systemName} Assessment - ${studentName}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; }
                .header { margin-bottom: 20px; }
                .score-0 { color: #dc2626; font-weight: bold; }
                .score-half { color: #ca8a04; font-weight: bold; }
                .score-1 { color: #16a34a; font-weight: bold; }
                .domain-header { background-color: #e5e7eb; font-weight: bold; }
                @media print {
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              ${printRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleExportDocx = async () => {
    const children: Paragraph[] = [];

    // Title
    children.push(
      new Paragraph({
        text: `${systemName} ASSESSMENT REPORT`,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      })
    );

    // Metadata
    children.push(new Paragraph({ text: '' }));
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Student: ', bold: true }),
          new TextRun(studentName),
        ],
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Assessment Date: ', bold: true }),
          new TextRun(format(new Date(assessment.date_administered), 'MMMM d, yyyy')),
        ],
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Status: ', bold: true }),
          new TextRun(assessment.status === 'final' ? 'Finalized' : 'Draft'),
        ],
      })
    );
    children.push(new Paragraph({ text: '' }));

    // Domain Summary
    children.push(
      new Paragraph({
        text: 'DOMAIN SUMMARY',
        heading: HeadingLevel.HEADING_2,
      })
    );

    children.push(new Paragraph({ text: '' }));

    Object.entries(domainScores).forEach(([domain, scores]) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${domain}: `, bold: true }),
            new TextRun(`${scores.total.toFixed(1)} / ${scores.possible} (${scores.mastered} mastered)`),
          ],
        })
      );
    });

    children.push(new Paragraph({ text: '' }));

    // Detailed Results by Domain
    children.push(
      new Paragraph({
        text: 'DETAILED RESULTS',
        heading: HeadingLevel.HEADING_2,
      })
    );

    Array.from(itemsByDomainAndLevel.entries()).forEach(([domainName, levelMap]) => {
      children.push(
        new Paragraph({
          text: domainName,
          heading: HeadingLevel.HEADING_3,
        })
      );

      Array.from(levelMap.entries()).forEach(([level, levelItems]) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: level, bold: true })],
          })
        );

        levelItems.forEach(item => {
          const score = results[item.id]?.score;
          const scoreText = score === undefined ? '—' : score === 0.5 ? '½' : score.toString();
          const statusText = score === 1 ? '✓ Mastered' : score === 0.5 ? 'Emerging' : score === 0 ? 'Not Yet' : '';
          
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${item.code || ''} - `, bold: true }),
                new TextRun(item.title),
                new TextRun({ text: ` [${scoreText}] ${statusText}`, italics: true }),
              ],
            })
          );
        });

        children.push(new Paragraph({ text: '' }));
      });
    });

    const doc = new Document({
      sections: [{ children }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${systemName.replace(/\s+/g, '-')}-Assessment-${studentName.replace(/\s+/g, '-')}-${format(new Date(assessment.date_administered), 'yyyy-MM-dd')}.docx`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Printable Assessment Report</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button size="sm" onClick={handleExportDocx}>
                <Download className="w-4 h-4 mr-2" />
                Download Word
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="space-y-6 p-4">
          {/* Header */}
          <div className="text-center border-b pb-4">
            <h1 className="text-2xl font-bold">{systemName} ASSESSMENT REPORT</h1>
            <div className="mt-2 text-sm text-muted-foreground">
              <p><strong>Student:</strong> {studentName}</p>
              <p>
                <strong>Date:</strong> {format(new Date(assessment.date_administered), 'MMMM d, yyyy')}
              </p>
              <p>
                <strong>Status:</strong>{' '}
                <Badge variant={assessment.status === 'final' ? 'default' : 'secondary'}>
                  {assessment.status === 'final' ? 'Finalized' : 'Draft'}
                </Badge>
              </p>
            </div>
          </div>

          {/* Domain Summary */}
          <div>
            <h2 className="font-semibold text-lg mb-3">Domain Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(domainScores).map(([domain, scores]) => (
                <Card key={domain} className="p-3">
                  <div className="text-xs text-muted-foreground">{domain}</div>
                  <div className="text-lg font-bold">
                    {scores.total.toFixed(1)} <span className="text-sm font-normal">/ {scores.possible}</span>
                  </div>
                  <div className="text-xs text-green-600">{scores.mastered} mastered</div>
                </Card>
              ))}
            </div>
          </div>

          {/* Detailed Grid */}
          <div>
            <h2 className="font-semibold text-lg mb-3">Detailed Results</h2>
            {Array.from(itemsByDomainAndLevel.entries()).map(([domainName, levelMap]) => (
              <div key={domainName} className="mb-6">
                <h3 className="font-medium text-base bg-muted p-2 rounded">{domainName}</h3>
                {Array.from(levelMap.entries()).map(([level, levelItems]) => (
                  <div key={level} className="ml-4 mt-2">
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">{level}</h4>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1 w-20">Code</th>
                          <th className="text-left py-1">Skill</th>
                          <th className="text-center py-1 w-16">Score</th>
                          <th className="text-left py-1 w-24">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {levelItems.map(item => {
                          const score = results[item.id]?.score;
                          return (
                            <tr key={item.id} className="border-b">
                              <td className="py-1">{item.code}</td>
                              <td className="py-1">{item.title}</td>
                              <td className={`py-1 text-center ${getScoreClass(item.id)}`}>
                                {getScoreDisplay(item.id)}
                              </td>
                              <td className="py-1">
                                {score === 1 && <Badge className="bg-green-600">Mastered</Badge>}
                                {score === 0.5 && <Badge className="bg-yellow-500">Emerging</Badge>}
                                {score === 0 && <Badge variant="destructive">Not Yet</Badge>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
