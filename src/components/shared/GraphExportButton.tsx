import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Image, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface GraphExportButtonProps {
  containerRef: React.RefObject<HTMLDivElement>;
  filename?: string;
  studentName?: string;
}

async function captureHighQuality(element: HTMLElement): Promise<HTMLCanvasElement> {
  const canvas = await html2canvas(element, {
    scale: 3,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    allowTaint: true,
    removeContainer: true,
  });
  return canvas;
}

export function GraphExportButton({ containerRef, filename = 'chart', studentName }: GraphExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const exportAsPng = async () => {
    if (!containerRef.current) return;
    setExporting(true);
    try {
      const canvas = await captureHighQuality(containerRef.current);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
        toast.success('Graph exported as PNG');
      }, 'image/png');
    } catch (err) {
      toast.error('Failed to export graph');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const exportAsPdf = async () => {
    if (!containerRef.current) return;
    setExporting(true);
    try {
      const canvas = await captureHighQuality(containerRef.current);
      const imgData = canvas.toDataURL('image/png');
      
      const pdfWidth = canvas.width / 3;
      const pdfHeight = canvas.height / 3;
      const headerHeight = 40;
      const footerHeight = 20;
      const margin = 20;
      const totalHeight = pdfHeight + headerHeight + footerHeight + margin * 2;
      const totalWidth = pdfWidth + margin * 2;

      const pdf = new jsPDF({
        orientation: totalWidth > totalHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [totalWidth, totalHeight],
      });

      // Header
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      const title = studentName ? `${studentName} — Behavior Data` : filename;
      pdf.text(title, margin, margin + 14);

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const dateStr = new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      pdf.text(`Exported: ${dateStr}`, margin, margin + 28);

      // Chart image
      pdf.addImage(imgData, 'PNG', margin, margin + headerHeight, pdfWidth, pdfHeight);

      // Footer
      pdf.setFontSize(7);
      pdf.setTextColor(150);
      pdf.text('Nova Behavioral Health', margin, totalHeight - 10);

      pdf.save(`${filename}.pdf`);
      toast.success('Graph exported as PDF');
    } catch (err) {
      toast.error('Failed to export graph');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting} className="gap-1.5">
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAsPng}>
          <Image className="w-4 h-4 mr-2" />
          Export as PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsPdf}>
          <FileText className="w-4 h-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
