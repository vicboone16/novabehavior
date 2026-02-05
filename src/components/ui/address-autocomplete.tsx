import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { MapPin, Loader2, Check } from 'lucide-react';
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

export interface ParsedAddress {
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
  const [showResults, setShowResults] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [results, setResults] = useState<AddressResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddresses = useCallback(async (query: string) => {
    if (query.length < 3) {
      setResults([]);
      setShowResults(false);
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
      setShowResults(data.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Address search error:', error);
      setResults([]);
      setShowResults(false);
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
    setShowResults(false);
    setResults([]);
    onSelect(parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-9 pr-8"
          disabled={disabled}
          onFocus={() => {
            if (results.length > 0) setShowResults(true);
          }}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      
      {showResults && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <Command>
            <CommandList>
              <CommandGroup>
                {results.map((result, index) => (
                  <CommandItem
                    key={`${result.lat}-${result.lon}-${index}`}
                    value={result.display_name}
                    onSelect={() => handleSelect(result)}
                    className={cn(
                      "cursor-pointer flex items-center gap-2 px-3 py-2",
                      selectedIndex === index && "bg-accent"
                    )}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm flex-1">{result.display_name}</span>
                    {selectedIndex === index && <Check className="h-4 w-4 text-primary" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
