/**
 * DemoSearch — universal search input for demo ecosystem pages.
 */

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DemoSearchProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function DemoSearch({ placeholder = 'Search learners, features, help…', value, onChange, className }: DemoSearchProps) {
  return (
    <div className={`relative ${className || ''}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 h-11 rounded-xl border-border bg-card"
      />
    </div>
  );
}
