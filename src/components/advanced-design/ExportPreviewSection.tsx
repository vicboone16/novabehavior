import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Copy, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';

export function ExportPreviewSection() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Download className="w-4 h-4" /> Export & Preview
        </CardTitle>
        <CardDescription className="text-xs">
          Preview, copy, and save analysis outputs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" className="gap-2 h-20 flex-col" onClick={() => toast.info('Graph preview coming soon')}>
            <Eye className="w-5 h-5" />
            <span className="text-xs">Preview Graph</span>
          </Button>
          <Button variant="outline" className="gap-2 h-20 flex-col" onClick={() => toast.info('Copy coming soon')}>
            <Copy className="w-5 h-5" />
            <span className="text-xs">Copy Summary</span>
          </Button>
          <Button variant="outline" className="gap-2 h-20 flex-col" onClick={() => toast.info('Save coming soon')}>
            <Save className="w-5 h-5" />
            <span className="text-xs">Save State</span>
          </Button>
          <Button variant="outline" className="gap-2 h-20 flex-col" onClick={() => toast.info('Export coming soon')}>
            <Download className="w-5 h-5" />
            <span className="text-xs">Export Data</span>
          </Button>
        </div>
        <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
          <p className="text-sm">Export workflows will be available here once analysis data is loaded in the workspace</p>
        </div>
      </CardContent>
    </Card>
  );
}
