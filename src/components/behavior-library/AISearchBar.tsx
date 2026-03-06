import { useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Sparkles, Loader2, X } from 'lucide-react';
import type { AISearchResult } from '@/hooks/useBxTags';

interface AISearchBarProps {
  onSearch: (query: string, itemType?: string) => Promise<void>;
  results: AISearchResult[];
  isSearching: boolean;
  onResultClick?: (result: AISearchResult) => void;
  placeholder?: string;
  itemTypeFilter?: string;
}

export function AISearchBar({
  onSearch,
  results,
  isSearching,
  onResultClick,
  placeholder = 'AI search behaviors, strategies, settings...',
  itemTypeFilter,
}: AISearchBarProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        onSearch(value, itemTypeFilter);
        setShowResults(true);
      }, 600);
    } else {
      setShowResults(false);
    }
  }, [onSearch, itemTypeFilter]);

  const handleClear = () => {
    setQuery('');
    setShowResults(false);
  };

  const typeColors: Record<string, string> = {
    problem: 'bg-destructive/10 text-destructive',
    goal: 'bg-primary/10 text-primary',
    objective: 'bg-accent/20 text-accent-foreground',
    strategy: 'bg-secondary text-secondary-foreground',
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        {isSearching ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
        ) : (
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
        )}
        <Input
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={handleClear}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {showResults && results.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-80 overflow-y-auto shadow-lg">
          <CardContent className="p-2 space-y-1">
            <p className="text-xs text-muted-foreground px-2 py-1">
              <Sparkles className="w-3 h-3 inline mr-1" />
              {results.length} result{results.length !== 1 ? 's' : ''} found via AI
            </p>
            {results.map((r, idx) => (
              <button
                key={`${r.type}-${r.id}-${idx}`}
                className="w-full text-left p-2.5 rounded-md hover:bg-accent/50 transition-colors flex items-start gap-3"
                onClick={() => {
                  onResultClick?.(r);
                  setShowResults(false);
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium truncate">{r.name}</span>
                    <Badge className={`text-[10px] ${typeColors[r.type] || ''}`}>
                      {r.type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                      {r.relevance_score}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{r.reason}</p>
                  {r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {r.tags.slice(0, 5).map((tag, i) => (
                        <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{tag}</span>
                      ))}
                      {r.tags.length > 5 && (
                        <span className="text-[10px] text-muted-foreground">+{r.tags.length - 5}</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {showResults && !isSearching && results.length === 0 && query.trim().length >= 2 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg">
          <CardContent className="p-4 text-center">
            <Search className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
