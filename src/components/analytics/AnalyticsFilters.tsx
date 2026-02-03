import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface AnalyticsFiltersProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
  filters: {
    staffId: string | null;
    payerId: string | null;
  };
  onFiltersChange: (filters: { staffId: string | null; payerId: string | null }) => void;
}

export function AnalyticsFilters({ 
  dateRange, 
  onDateRangeChange, 
  filters, 
  onFiltersChange 
}: AnalyticsFiltersProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {/* Date Range Picker */}
      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <CalendarIcon className="w-4 h-4" />
            <span className="hidden sm:inline">
              {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onDateRangeChange({ from: range.from, to: range.to });
                setDatePickerOpen(false);
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {/* Quick Presets */}
      <Select
        value=""
        onValueChange={(value) => {
          const today = new Date();
          let from = new Date();
          
          switch (value) {
            case '7d':
              from.setDate(today.getDate() - 7);
              break;
            case '30d':
              from.setDate(today.getDate() - 30);
              break;
            case '90d':
              from.setDate(today.getDate() - 90);
              break;
            case 'ytd':
              from = new Date(today.getFullYear(), 0, 1);
              break;
          }
          
          onDateRangeChange({ from, to: today });
        }}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Quick select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
          <SelectItem value="ytd">Year to date</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
