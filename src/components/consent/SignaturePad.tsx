import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Eraser, Pen, Type, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignaturePadProps {
  onSignatureChange: (signatureData: string | null) => void;
  signerName?: string;
  disabled?: boolean;
  className?: string;
}

export function SignaturePad({ 
  onSignatureChange, 
  signerName = '',
  disabled = false,
  className 
}: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState(signerName);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
    setHasDrawnSignature(false);
    setTypedName('');
    onSignatureChange(null);
  };

  const handleDrawEnd = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      setHasDrawnSignature(true);
      const dataUrl = sigCanvas.current.toDataURL('image/png');
      onSignatureChange(dataUrl);
    }
  };

  const handleTypedSignature = (name: string) => {
    setTypedName(name);
    if (name.trim()) {
      // Create a canvas to render the typed signature
      const canvas = document.createElement('canvas');
      canvas.width = 500;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'italic 48px "Dancing Script", cursive, serif';
        ctx.fillStyle = '#1a1a2e';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, canvas.width / 2, canvas.height / 2);
        onSignatureChange(canvas.toDataURL('image/png'));
      }
    } else {
      onSignatureChange(null);
    }
  };

  const handleModeChange = (mode: string) => {
    setSignatureMode(mode as 'draw' | 'type');
    clearSignature();
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="pt-4">
        <Tabs value={signatureMode} onValueChange={handleModeChange}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="draw" disabled={disabled} className="gap-2">
              <Pen className="h-4 w-4" />
              Draw Signature
            </TabsTrigger>
            <TabsTrigger value="type" disabled={disabled} className="gap-2">
              <Type className="h-4 w-4" />
              Type Signature
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="mt-0">
            <div className="space-y-3">
              <div 
                className={cn(
                  "border-2 border-dashed rounded-lg bg-white relative overflow-hidden",
                  disabled ? "opacity-50 cursor-not-allowed" : "cursor-crosshair",
                  hasDrawnSignature ? "border-primary" : "border-muted-foreground/30"
                )}
              >
                <SignatureCanvas
                  ref={sigCanvas}
                  canvasProps={{
                    width: 500,
                    height: 150,
                    className: 'w-full h-[150px]',
                    style: { touchAction: 'none' }
                  }}
                  onEnd={handleDrawEnd}
                  penColor="#1a1a2e"
                  backgroundColor="white"
                />
                {!hasDrawnSignature && !disabled && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/50">
                    Sign here
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Use your mouse or finger to draw your signature
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                  disabled={disabled || !hasDrawnSignature}
                  className="gap-1"
                >
                  <Eraser className="h-3 w-3" />
                  Clear
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="type" className="mt-0">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="typed-signature">Type your full legal name</Label>
                <Input
                  id="typed-signature"
                  value={typedName}
                  onChange={(e) => handleTypedSignature(e.target.value)}
                  placeholder="Your Full Name"
                  disabled={disabled}
                  className="text-lg"
                />
              </div>
              {typedName && (
                <div className="border-2 border-dashed border-primary rounded-lg bg-white p-6 flex items-center justify-center min-h-[100px]">
                  <span 
                    className="text-4xl text-primary"
                    style={{ fontFamily: '"Dancing Script", cursive, serif', fontStyle: 'italic' }}
                  >
                    {typedName}
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                By typing your name, you agree this constitutes your legal signature
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {(hasDrawnSignature || typedName) && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">Signature captured</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
