import { Download, Image, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface GraphExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chartRef?: React.RefObject<HTMLDivElement>;
  title?: string;
}

export function GraphExportDialog({ open, onOpenChange, chartRef, title = 'chart' }: GraphExportDialogProps) {
  const exportAs = (format: 'png' | 'svg') => {
    if (!chartRef?.current) {
      toast.error('No chart element found');
      return;
    }

    const svg = chartRef.current.querySelector('svg');
    if (!svg) {
      toast.error('No SVG chart found');
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svg);

    if (format === 'svg') {
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_')}.svg`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported as SVG');
    } else {
      const canvas = document.createElement('canvas');
      const img = new window.Image();
      img.onload = () => {
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.scale(2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const link = document.createElement('a');
        link.download = `${title.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('Exported as high-res PNG');
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" /> Export Graph
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => exportAs('png')}>
            <Image className="w-8 h-8" />
            <span>High-Res PNG</span>
            <span className="text-xs text-muted-foreground">2x resolution</span>
          </Button>
          <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => exportAs('svg')}>
            <FileText className="w-8 h-8" />
            <span>SVG Vector</span>
            <span className="text-xs text-muted-foreground">Scalable format</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
