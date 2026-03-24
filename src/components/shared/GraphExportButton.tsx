import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Image, FileText } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface GraphExportButtonProps {
  /** The CSS selector or ref for the chart container to capture */
  containerRef: React.RefObject<HTMLDivElement>;
  filename?: string;
}

async function captureToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  // Find the SVG inside the recharts container
  const svg = element.querySelector('svg.recharts-surface') || element.querySelector('svg');
  if (!svg) throw new Error('No chart SVG found');

  const svgEl = svg as SVGSVGElement;
  const bbox = svgEl.getBoundingClientRect();
  const width = bbox.width || 800;
  const height = bbox.height || 400;

  // Clone the SVG and inline computed styles
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // Inline styles from the original
  const allOriginal = svgEl.querySelectorAll('*');
  const allCloned = clone.querySelectorAll('*');
  allOriginal.forEach((origEl, i) => {
    const clonedEl = allCloned[i];
    if (clonedEl && origEl instanceof Element) {
      const computed = window.getComputedStyle(origEl);
      (clonedEl as HTMLElement).style.cssText = computed.cssText;
    }
  });

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2; // retina
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(scale, scale);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function GraphExportButton({ containerRef, filename = 'chart' }: GraphExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const exportAsPng = async () => {
    if (!containerRef.current) return;
    setExporting(true);
    try {
      const canvas = await captureToCanvas(containerRef.current);
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
      const canvas = await captureToCanvas(containerRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
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
          <Download className="w-3.5 h-3.5" />
          Export Graph
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
