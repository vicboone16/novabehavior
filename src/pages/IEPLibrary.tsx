import { useState } from 'react';
import { Search, Plus, Filter, BookOpen, MoreHorizontal, Copy, Archive, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIEPLibrary } from '@/hooks/useIEPLibrary';
import { DOMAIN_DISPLAY_NAMES, GRADE_BAND_DISPLAY_NAMES } from '@/types/iepLibrary';

export default function IEPLibrary() {
  const { libraryItems, isLoading, filters, setFilters, archiveLibraryItem, duplicateLibraryItem } = useIEPLibrary();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            IEP Accommodations & Modifications Library
          </h1>
          <p className="text-muted-foreground">
            Searchable library of supports for school-based students
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add New Item
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, description, or topic..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Library Items */}
      <ScrollArea className="h-[600px]">
        <div className="grid gap-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading library items...</div>
          ) : libraryItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No items found.</div>
          ) : (
            libraryItems.map(item => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{item.title}</span>
                        <Badge variant={item.item_type === 'accommodation' ? 'default' : 'destructive'}>
                          {item.item_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {item.domains.slice(0, 3).map(d => (
                          <Badge key={d} variant="outline" className="text-xs">{DOMAIN_DISPLAY_NAMES[d] || d}</Badge>
                        ))}
                        {item.grade_band.slice(0, 2).map(g => (
                          <Badge key={g} variant="secondary" className="text-xs">{GRADE_BAND_DISPLAY_NAMES[g] || g}</Badge>
                        ))}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Edit className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateLibraryItem(item.id)}><Copy className="w-4 h-4 mr-2" />Duplicate</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => archiveLibraryItem(item.id)} className="text-destructive"><Archive className="w-4 h-4 mr-2" />Archive</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
