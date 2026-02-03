import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SignaturePad } from './SignaturePad';
import { Progress } from '@/components/ui/progress';
import { FileText, Clock, Shield, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'textarea' | 'checkbox' | 'select' | 'signature';
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  description?: string;
}

interface SignatureZone {
  id: string;
  label: string;
  required?: boolean;
  description?: string;
}

interface ConsentFormTemplate {
  id: string;
  name: string;
  description?: string;
  form_type: string;
  fields: FormField[];
  signature_zones: SignatureZone[];
}

interface ConsentFormViewerProps {
  template: ConsentFormTemplate;
  initialData?: Record<string, any>;
  onSubmit: (data: { formData: Record<string, any>; signatures: Record<string, string> }) => void;
  isSubmitting?: boolean;
  disabled?: boolean;
}

export function ConsentFormViewer({
  template,
  initialData = {},
  onSubmit,
  isSubmitting = false,
  disabled = false
}: ConsentFormViewerProps) {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);

  const totalSteps = template.signature_zones.length > 0 ? 2 : 1;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSignatureChange = (zoneId: string, signatureData: string | null) => {
    setSignatures(prev => {
      if (signatureData) {
        return { ...prev, [zoneId]: signatureData };
      } else {
        const { [zoneId]: removed, ...rest } = prev;
        return rest;
      }
    });
  };

  const validateStep = () => {
    if (currentStep === 0) {
      // Validate required form fields
      const requiredFields = template.fields.filter(f => f.required && f.type !== 'signature');
      return requiredFields.every(field => {
        const value = formData[field.id];
        if (field.type === 'checkbox') return value === true;
        return value && String(value).trim() !== '';
      });
    } else {
      // Validate required signatures
      const requiredSignatures = template.signature_zones.filter(z => z.required !== false);
      return requiredSignatures.every(zone => signatures[zone.id]);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onSubmit({ formData, signatures });
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              disabled={disabled}
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type="date"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              disabled={disabled}
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={field.id}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              disabled={disabled}
              rows={4}
            />
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="flex items-start space-x-3">
            <Checkbox
              id={field.id}
              checked={value || false}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
              disabled={disabled}
            />
            <div className="space-y-1">
              <Label htmlFor={field.id} className="cursor-pointer">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {field.description && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              )}
            </div>
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={value || ''}
              onValueChange={(val) => handleFieldChange(field.id, val)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || 'Select...'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>{template.name}</CardTitle>
              {template.description && (
                <CardDescription>{template.description}</CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Step {currentStep + 1} of {totalSteps}
              </span>
              <span className="text-muted-foreground">
                {currentStep === 0 ? 'Form Information' : 'Signature'}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      {currentStep === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Form Information</CardTitle>
            <CardDescription>Please fill out all required fields</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {template.fields
              .filter(f => f.type !== 'signature')
              .map(renderField)}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Electronic Signature</CardTitle>
            <CardDescription>
              Please sign below to complete this form. Your signature is legally binding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {template.signature_zones.map((zone) => (
              <div key={zone.id} className="space-y-3">
                <div>
                  <Label>
                    {zone.label}
                    {zone.required !== false && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {zone.description && (
                    <p className="text-sm text-muted-foreground mt-1">{zone.description}</p>
                  )}
                </div>
                <SignaturePad
                  onSignatureChange={(data) => handleSignatureChange(zone.id, data)}
                  disabled={disabled}
                />
              </div>
            ))}

            {/* Signature timestamp and compliance info */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Date & Time: {format(new Date(), 'PPpp')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Your signature will be securely recorded with timestamp and IP address
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0 || isSubmitting}
        >
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!validateStep() || isSubmitting || disabled}
        >
          {isSubmitting ? (
            'Submitting...'
          ) : currentStep === totalSteps - 1 ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Submit Signed Form
            </>
          ) : (
            'Continue to Signature'
          )}
        </Button>
      </div>
    </div>
  );
}
