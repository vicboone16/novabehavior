import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddressResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

interface ParsedAddress {
  display_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  lat: number;
  lng: number;
}

interface AddressAutocompleteProps {
  value?: string;
  onSelect: (address: ParsedAddress) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function AddressAutocomplete({
  value = '',
  onSelect,
  placeholder = 'Start typing an address...',
  className,
  disabled = false,
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [results, setResults] = useState<AddressResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const searchAddresses = useCallback(async (query: string) => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=us`,
        {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
          },
        }
      );
      const data: AddressResult[] = await response.json();
      setResults(data);
      if (data.length > 0) {
        setOpen(true);
      }
    } catch (error) {
      console.error('Address search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAddresses(newValue);
    }, 300);
  };

  const parseAddress = (result: AddressResult): ParsedAddress => {
    const addr = result.address || {};
    const houseNumber = addr.house_number || '';
    const road = addr.road || '';
    const address_line1 = [houseNumber, road].filter(Boolean).join(' ');
    const city = addr.city || addr.town || addr.village || '';
    const state = addr.state || '';
    const zip_code = addr.postcode || '';

    return {
      display_name: result.display_name,
      address_line1,
      address_line2: '',
      city,
      state,
      zip_code,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    };
  };

  const handleSelect = (result: AddressResult) => {
    const parsed = parseAddress(result);
    setInputValue(parsed.address_line1 || result.display_name);
    setOpen(false);
    onSelect(parsed);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn('relative', className)}>
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="pl-9 pr-8"
            disabled={disabled}
            onFocus={() => {
              if (results.length > 0) setOpen(true);
            }}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandList>
            {results.length === 0 && !loading && inputValue.length >= 3 && (
              <CommandEmpty>No addresses found.</CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup>
                {results.map((result, index) => (
                  <CommandItem
                    key={`${result.lat}-${result.lon}-${index}`}
                    value={result.display_name}
                    onSelect={() => handleSelect(result)}
                    className="cursor-pointer"
                  >
                    <MapPin className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm">{result.display_name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
