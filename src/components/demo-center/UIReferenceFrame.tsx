/**
 * UIReferenceFrame — Shows a polished reference mockup as an aspirational
 * "what this section looks like" panel inside overview or programming tabs.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface UIReferenceFrameProps {
  image: string;
  alt: string;
  label: string;
  caption?: string;
  className?: string;
}

export function UIReferenceFrame({ image, alt, label, caption, className = '' }: UIReferenceFrameProps) {
  return (
    <Card className={`overflow-hidden rounded-2xl border border-border/50 ${className}`}>
      <CardContent className="p-0">
        <div className="relative">
          {/* Top bar mimicking a window chrome */}
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/60 border-b border-border/40">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive/40" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/50" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/50" />
            </div>
            <Badge variant="secondary" className="text-[10px] gap-1 ml-2">
              <Sparkles className="w-2.5 h-2.5" /> {label}
            </Badge>
          </div>
          <img
            src={image}
            alt={alt}
            className="w-full object-cover max-h-[400px]"
            loading="lazy"
          />
          {caption && (
            <div className="px-4 py-2 bg-muted/40 text-xs text-muted-foreground text-center border-t border-border/30">
              {caption}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
