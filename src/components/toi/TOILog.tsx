import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Play, Plus, Download, CalendarIcon, Filter } from 'lucide-react';
import { useTOIEvents } from '@/hooks/useTOIEvents';
import { TOISummaryCards } from './TOISummaryCards';
import { TOIEventsTable } from './TOIEventsTable';
import { StartTOIDialog } from './StartTOIDialog';
import { EndTOIDialog } from './EndTOIDialog';
import { ManualTOIEntryDialog } from './ManualTOIEntryDialog';
import { EditTOIDrawer } from './EditTOIDrawer';
import {
  TOIEvent,
  TOIEventType,
  TOILocation,
  TOI_EVENT_LABELS,
  TOI_LOCATION_LABELS,
} from '@/types/toi';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';

interface TOILogProps {
  studentId: string;
  studentName: string;
  isAdmin?: boolean;
}

type DateFilter = 'today' | 'week' | 'custom';
type StatusFilter = 'all' | 'running' | 'ended';

export function TOILog({ studentId, studentName, isAdmin = false }: TOILogProps) {
  // Filter states
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<TOIEventType | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<TOILocation | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Dialog states
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TOIEvent | null>(null);

  // Calculate date range based on filter
  const dateRange = useMemo(() => {
    const now = new Date();
    if (dateFilter === 'today') {
      return { start: startOfDay(now), end: endOfDay(now) };
    } else if (dateFilter === 'week') {
      return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    } else if (customDateRange?.from && customDateRange?.to) {
      return { start: startOfDay(customDateRange.from), end: endOfDay(customDateRange.to) };
    }
    return undefined;
  }, [dateFilter, customDateRange]);

  const {
    events,
    loading,
    activeEvent,
    startTOI,
    endTOI,
    updateTOI,
    deleteTOI,
    addManualEntry,
    getTodaySummary,
    getWeekSummary,
    getRangeSummary,
  } = useTOIEvents({
    studentId,
    dateRange,
    eventType: typeFilter !== 'all' ? typeFilter : undefined,
    location: locationFilter !== 'all' ? locationFilter : undefined,
    statusFilter,
  });

  // Event handlers
  const handleStart = async (data: any) => {
    await startTOI({
      student_id: studentId,
      ...data,
    });
  };

  const handleEnd = async (eventId: string, endTime: string) => {
    await endTOI(eventId, endTime);
  };

  const handleManualSave = async (data: any) => {
    await addManualEntry({
      student_id: studentId,
      ...data,
    });
  };

  const handleEdit = async (eventId: string, updates: any) => {
    await updateTOI(eventId, updates);
  };

  const handleDelete = async (eventId: string) => {
    await deleteTOI(eventId);
  };

  const handleEndEvent = (event: TOIEvent) => {
    setSelectedEvent(event);
    setEndDialogOpen(true);
  };

  const handleEditEvent = (event: TOIEvent) => {
    setSelectedEvent(event);
    setEditDrawerOpen(true);
  };

  const handleDeleteEvent = async (event: TOIEvent) => {
    await deleteTOI(event.id);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <TOISummaryCards
        todaySummary={getTodaySummary()}
        weekSummary={getWeekSummary()}
        getRangeSummary={getRangeSummary}
      />

      {/* Actions & Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle className="text-lg">TOI Log (Time Out of Instruction)</CardTitle>
            <div className="flex flex-wrap gap-2">
              {activeEvent ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleEndEvent(activeEvent)}
                >
                  End TOI
                </Button>
              ) : (
                <Button size="sm" onClick={() => setStartDialogOpen(true)}>
                  <Play className="mr-2 h-4 w-4" />
                  Start TOI
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setManualEntryOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Manual Entry
              </Button>
              {isAdmin && (
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters Row */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            {/* Date Range Filter */}
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>

            {dateFilter === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDateRange?.from && customDateRange?.to
                      ? `${format(customDateRange.from, 'MMM d')} - ${format(customDateRange.to, 'MMM d')}`
                      : 'Pick dates'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={customDateRange}
                    onSelect={setCustomDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}

            {/* Type Filter */}
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as TOIEventType | 'all')}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(TOI_EVENT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Location Filter */}
            <Select
              value={locationFilter}
              onValueChange={(v) => setLocationFilter(v as TOILocation | 'all')}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {Object.entries(TOI_LOCATION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Events Table */}
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : (
            <TOIEventsTable
              events={events}
              onEndEvent={handleEndEvent}
              onEditEvent={handleEditEvent}
              onDeleteEvent={handleDeleteEvent}
            />
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <StartTOIDialog
        open={startDialogOpen}
        onOpenChange={setStartDialogOpen}
        onStart={handleStart}
      />

      <EndTOIDialog
        open={endDialogOpen}
        onOpenChange={setEndDialogOpen}
        event={selectedEvent}
        onEnd={handleEnd}
        onEdit={() => {
          setEndDialogOpen(false);
          setEditDrawerOpen(true);
        }}
      />

      <ManualTOIEntryDialog
        open={manualEntryOpen}
        onOpenChange={setManualEntryOpen}
        onSave={handleManualSave}
      />

      <EditTOIDrawer
        open={editDrawerOpen}
        onOpenChange={setEditDrawerOpen}
        event={selectedEvent}
        onSave={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
