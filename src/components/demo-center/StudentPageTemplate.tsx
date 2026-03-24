/**
 * StudentPageTemplate — Downloadable template card showing
 * the behavior dashboard layout. Users can download as image or PDF.
 */

import { useState } from 'react';
import { Download, FileImage, FileText, Image } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import behaviorDashboardImg from '@/assets/tour/behavior-dashboard-ref.jpg';

export function StudentPageTemplate() {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadImage = () => {
    const link = document.createElement('a');
    link.href = behaviorDashboardImg;
    link.download = 'NovaTrack_Student_Page_Template.jpg';
    link.click();
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1200, 850] });
      
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = behaviorDashboardImg;
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          doc.addImage(img, 'JPEG', 0, 0, 1200, 850);
          doc.save('NovaTrack_Student_Page_Template.pdf');
          resolve();
        };
        img.onerror = reject;
      });
    } catch (err) {
      console.error('PDF generation failed:', err);
      // Fallback to image download
      handleDownloadImage();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileImage className="w-4 h-4 text-primary" />
              Student Page Template
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Download the standard layout for student behavior dashboards
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">Template</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Preview */}
        <div className="relative rounded-xl overflow-hidden border border-border/50 group cursor-pointer" onClick={handleDownloadImage}>
          <img
            src={behaviorDashboardImg}
            alt="Student page template - behavior dashboard layout"
            className="w-full object-cover max-h-[300px] group-hover:opacity-90 transition-opacity"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg">
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Click to download</span>
            </div>
          </div>
        </div>
        
        {/* Download buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl flex-1"
            onClick={handleDownloadImage}
          >
            <Image className="w-3.5 h-3.5" /> Download Image
          </Button>
          <Button
            size="sm"
            className="gap-2 rounded-xl flex-1"
            onClick={handleDownloadPDF}
            disabled={downloading}
          >
            <FileText className="w-3.5 h-3.5" /> {downloading ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
