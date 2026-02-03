import { useState } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIEPLibrarySearch } from '@/hooks/useIEPLibrarySearch';
import { IEPFilterPanel } from '@/components/iep-supports/IEPFilterPanel';
import { IEPResultCard } from '@/components/iep-supports/IEPResultCard';

export default function IEPLibrary() {
  const {
    query,
    searchResults,
    isLoading,
    setSearchText,
    toggleFilter,
    clearFilters,
    hasActiveFilters
  } = useIEPLibrarySearch();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            IEP / 504 Supports Library
          </h1>
          <p className="text-muted-foreground">
            Searchable library of accommodations and modifications
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add New Item
        </Button>
      </div>

      <IEPFilterPanel
        query={query}
        facets={searchResults.facets}
        onSearchChange={setSearchText}
        onToggleFilter={toggleFilter}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <div className="text-sm text-muted-foreground">
        {searchResults.total} items found
      </div>

      <ScrollArea className="h-[600px]">
        <div className="grid gap-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : searchResults.items.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No items found matching your criteria.
              </CardContent>
            </Card>
          ) : (
            searchResults.items.map(item => (
              <IEPResultCard
                key={item.id}
                item={item}
                showActions={false}
                onAction={() => {}}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
