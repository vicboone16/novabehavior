import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, User, GraduationCap, School, X, Filter, 
  ChevronDown, Building2, Tag, BookOpen, MapPin, Calendar,
  Users, Briefcase, Star, Clock, AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

import { getZodiacSign, ZODIAC_LABELS, ZODIAC_SYMBOLS, ZodiacSign } from '@/types/behavior';

interface SearchResult {
  id: string;
  name: string;
  type: 'student' | 'user';
  subtitle?: string;
  school?: string;
  grade?: string;
  caseTypes?: string[];
  assessmentMode?: boolean;
  isArchived?: boolean;
  zodiacSign?: ZodiacSign;
}

interface SearchFilters {
  type: 'all' | 'students' | 'users';
  grade: string;
  school: string;
  letterStart: string;
  caseType: string;
  assessmentMode: 'all' | 'fba' | 'regular';
  status: 'active' | 'archived' | 'all';
  zodiacSign: string;
}

const GRADES = ['Pre-K', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'Post-Secondary'];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const CASE_TYPES = ['ABA', 'Consultation', 'Assessment Only', 'School-Based', 'Home-Based', 'Telehealth'];
const ZODIAC_SIGNS: ZodiacSign[] = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

export function GlobalSearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [schools, setSchools] = useState<string[]>([]);
  
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    grade: 'all',
    school: 'all',
    letterStart: 'all',
    caseType: 'all',
    assessmentMode: 'all',
    status: 'active',
    zodiacSign: 'all',
  });

  // Check if user is admin
  useEffect(() => {
    if (!user) return;
    
    const checkAdmin = async () => {
      const { data } = await supabase.rpc('is_admin', { _user_id: user.id });
      setIsAdmin(!!data);
    };
    
    checkAdmin();
  }, [user]);

  // Load available schools for filter
  useEffect(() => {
    if (!user) return;
    
    const loadSchools = async () => {
      const { data } = await supabase
        .from('students')
        .select('school')
        .not('school', 'is', null)
        .eq('is_archived', false);
      
      if (data) {
        const uniqueSchools = [...new Set(data.map(s => s.school).filter(Boolean))] as string[];
        setSchools(uniqueSchools.sort());
      }
    };
    
    loadSchools();
  }, [user]);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open]);

  // Search function with filters
  const performSearch = useCallback(async (searchQuery: string, currentFilters: SearchFilters) => {
    if (!user) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      // Search students
      if (currentFilters.type === 'all' || currentFilters.type === 'students') {
        let studentsQuery = supabase
          .from('students')
          .select('id, name, school, grade, user_id, case_types, assessment_mode_enabled, is_archived, date_of_birth')
          .limit(50);

        // Apply status filter
        if (currentFilters.status === 'active') {
          studentsQuery = studentsQuery.eq('is_archived', false);
        } else if (currentFilters.status === 'archived') {
          studentsQuery = studentsQuery.eq('is_archived', true);
        }

        // Apply text search
        if (searchQuery.length >= 2) {
          studentsQuery = studentsQuery.ilike('name', `%${searchQuery}%`);
        }

        // Apply grade filter
        if (currentFilters.grade !== 'all') {
          studentsQuery = studentsQuery.eq('grade', currentFilters.grade);
        }

        // Apply school filter
        if (currentFilters.school !== 'all') {
          studentsQuery = studentsQuery.eq('school', currentFilters.school);
        }

        // Apply letter filter
        if (currentFilters.letterStart !== 'all') {
          studentsQuery = studentsQuery.ilike('name', `${currentFilters.letterStart}%`);
        }

        // Apply assessment mode filter
        if (currentFilters.assessmentMode === 'fba') {
          studentsQuery = studentsQuery.eq('assessment_mode_enabled', true);
        } else if (currentFilters.assessmentMode === 'regular') {
          studentsQuery = studentsQuery.eq('assessment_mode_enabled', false);
        }

        const { data: studentsData } = await studentsQuery;

        if (studentsData) {
          // Get students user has access to
          const { data: accessData } = await supabase
            .from('user_student_access')
            .select('student_id')
            .eq('user_id', user.id);
          
          const accessIds = new Set(accessData?.map(a => a.student_id) || []);

          // Filter students based on access
          let accessibleStudents = studentsData.filter(s => 
            s.user_id === user.id || accessIds.has(s.id) || isAdmin
          );

          // Apply case type filter (post-query since it's a JSON array)
          if (currentFilters.caseType !== 'all') {
            accessibleStudents = accessibleStudents.filter(s => {
              const caseTypes = (s.case_types as string[]) || [];
              return caseTypes.some(ct => 
                ct.toLowerCase().includes(currentFilters.caseType.toLowerCase())
              );
            });
          }

          // Apply zodiac sign filter for students
          if (currentFilters.zodiacSign !== 'all') {
            accessibleStudents = accessibleStudents.filter(s => {
              if (!s.date_of_birth) return false;
              const zodiac = getZodiacSign(new Date(s.date_of_birth));
              return zodiac === currentFilters.zodiacSign;
            });
          }

          accessibleStudents.forEach(s => {
            const zodiac = s.date_of_birth ? getZodiacSign(new Date(s.date_of_birth)) : undefined;
            searchResults.push({
              id: s.id,
              name: s.name,
              type: 'student',
              school: s.school || undefined,
              grade: s.grade || undefined,
              caseTypes: (s.case_types as string[]) || [],
              assessmentMode: s.assessment_mode_enabled || false,
              isArchived: s.is_archived || false,
              zodiacSign: zodiac,
              subtitle: [s.grade ? `Grade ${s.grade}` : null, s.school].filter(Boolean).join(' • ') || undefined,
            });
          });
        }
      }

      // Search users (admin only)
      if (isAdmin && (currentFilters.type === 'all' || currentFilters.type === 'users')) {
        let profilesQuery = supabase
          .from('profiles')
          .select('user_id, display_name, email, first_name, last_name, date_of_birth')
          .limit(30);

        if (searchQuery.length >= 2) {
          profilesQuery = profilesQuery.or(
            `display_name.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
          );
        }

        // Apply letter filter to users
        if (currentFilters.letterStart !== 'all') {
          profilesQuery = profilesQuery.or(
            `first_name.ilike.${currentFilters.letterStart}%,last_name.ilike.${currentFilters.letterStart}%,display_name.ilike.${currentFilters.letterStart}%`
          );
        }

        const { data: profilesData } = await profilesQuery;

        if (profilesData) {
          // Apply zodiac sign filter for users
          let filteredProfiles = profilesData;
          if (currentFilters.zodiacSign !== 'all') {
            filteredProfiles = profilesData.filter(p => {
              if (!p.date_of_birth) return false;
              const zodiac = getZodiacSign(new Date(p.date_of_birth));
              return zodiac === currentFilters.zodiacSign;
            });
          }

          filteredProfiles.forEach(p => {
            const displayName = p.display_name || 
              [p.first_name, p.last_name].filter(Boolean).join(' ') || 
              p.email || 
              'Unknown User';
            const zodiac = p.date_of_birth ? getZodiacSign(new Date(p.date_of_birth)) : undefined;
            
            searchResults.push({
              id: p.user_id,
              name: displayName,
              type: 'user',
              subtitle: p.email || undefined,
              zodiacSign: zodiac,
            });
          });
        }
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      // Search when we have a query OR when filters are applied
      const hasActiveFilters = 
        filters.grade !== 'all' || 
        filters.school !== 'all' || 
        filters.letterStart !== 'all' || 
        filters.caseType !== 'all' ||
        filters.assessmentMode !== 'all' ||
        filters.status !== 'active' ||
        filters.type !== 'all' ||
        filters.zodiacSign !== 'all';

      if (query.length >= 2 || hasActiveFilters) {
        performSearch(query, filters);
      } else {
        setResults([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, filters, performSearch]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery('');
    
    if (result.type === 'student') {
      navigate(`/students/${result.id}`);
    } else {
      navigate(`/admin?user=${result.id}`);
    }
  };

  const clearFilters = () => {
    setFilters({
      type: 'all',
      grade: 'all',
      school: 'all',
      letterStart: 'all',
      caseType: 'all',
      assessmentMode: 'all',
      status: 'active',
      zodiacSign: 'all',
    });
  };

  const activeFilterCount = [
    filters.type !== 'all',
    filters.grade !== 'all',
    filters.school !== 'all',
    filters.letterStart !== 'all',
    filters.caseType !== 'all',
    filters.assessmentMode !== 'all',
    filters.status !== 'active',
    filters.zodiacSign !== 'all',
  ].filter(Boolean).length;

  const studentResults = results.filter(r => r.type === 'student');
  const userResults = results.filter(r => r.type === 'user');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-muted-foreground min-w-[180px] justify-start"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline flex-1 text-left">Search...</span>
          <kbd className="hidden md:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[420px] p-0 bg-background border shadow-lg" 
        align="start"
        sideOffset={8}
      >
        {/* Search Input */}
        <div className="flex items-center gap-2 p-3 border-b">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            placeholder="Search students, users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 p-0 h-auto focus-visible:ring-0 text-sm"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => setQuery('')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
          <Button
            variant={showFilters ? "secondary" : "ghost"}
            size="sm"
            className="gap-1 shrink-0"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-3 h-3" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="default" className="h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="p-3 border-b bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">FILTERS</span>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearFilters}>
                  Clear all
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Type Filter */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" /> Type
                </label>
                <Select
                  value={filters.type}
                  onValueChange={(v) => setFilters(f => ({ ...f, type: v as SearchFilters['type'] }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="students">Clients</SelectItem>
                    {isAdmin && <SelectItem value="users">Users</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Status
                </label>
                <Select
                  value={filters.status}
                  onValueChange={(v) => setFilters(f => ({ ...f, status: v as SearchFilters['status'] }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Grade Filter */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" /> Grade
                </label>
                <Select
                  value={filters.grade}
                  onValueChange={(v) => setFilters(f => ({ ...f, grade: v }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Any grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any grade</SelectItem>
                    {GRADES.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Letter Filter */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Starts with
                </label>
                <Select
                  value={filters.letterStart}
                  onValueChange={(v) => setFilters(f => ({ ...f, letterStart: v }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Any letter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any letter</SelectItem>
                    {LETTERS.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* School Filter */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <School className="w-3 h-3" /> School
                </label>
                <Select
                  value={filters.school}
                  onValueChange={(v) => setFilters(f => ({ ...f, school: v }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Any school" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any school</SelectItem>
                    {schools.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Case Type Filter */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> Case Type
                </label>
                <Select
                  value={filters.caseType}
                  onValueChange={(v) => setFilters(f => ({ ...f, caseType: v }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Any type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any type</SelectItem>
                    {CASE_TYPES.map(ct => (
                      <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assessment Mode Filter */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Star className="w-3 h-3" /> Assessment Mode
                </label>
                <Select
                  value={filters.assessmentMode}
                  onValueChange={(v) => setFilters(f => ({ ...f, assessmentMode: v as SearchFilters['assessmentMode'] }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All students</SelectItem>
                    <SelectItem value="fba">FBA/Assessment mode only</SelectItem>
                    <SelectItem value="regular">Regular students only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Zodiac Sign Filter */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  ✨ Zodiac
                </label>
                <Select
                  value={filters.zodiacSign}
                  onValueChange={(v) => setFilters(f => ({ ...f, zodiacSign: v }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Any sign" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any sign</SelectItem>
                    {ZODIAC_SIGNS.map(sign => (
                      <SelectItem key={sign} value={sign}>
                        {ZODIAC_SYMBOLS[sign]} {ZODIAC_LABELS[sign]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <ScrollArea className="max-h-[320px]">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Clock className="w-5 h-5 mx-auto mb-2 animate-spin" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {query.length < 2 && activeFilterCount === 0 ? (
                <>Type to search or use filters</>
              ) : (
                <>No results found</>
              )}
            </div>
          ) : (
            <div className="p-1">
              {studentResults.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Students ({studentResults.length})
                  </div>
                  {studentResults.map((result) => (
                    <button
                      key={`student-${result.id}`}
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{result.name}</p>
                          {result.zodiacSign && (
                            <span className="text-sm" title={ZODIAC_LABELS[result.zodiacSign]}>
                              {ZODIAC_SYMBOLS[result.zodiacSign]}
                            </span>
                          )}
                          {result.assessmentMode && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">FBA</Badge>
                          )}
                          {result.isArchived && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">Archived</Badge>
                          )}
                        </div>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            {result.school && <School className="w-3 h-3 shrink-0" />}
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </>
              )}

              {studentResults.length > 0 && userResults.length > 0 && (
                <Separator className="my-1" />
              )}

              {userResults.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Users ({userResults.length})
                  </div>
                  {userResults.map((result) => (
                    <button
                      key={`user-${result.id}`}
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-secondary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{result.name}</p>
                          {result.zodiacSign && (
                            <span className="text-sm" title={ZODIAC_LABELS[result.zodiacSign]}>
                              {ZODIAC_SYMBOLS[result.zodiacSign]}
                            </span>
                          )}
                        </div>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">User</Badge>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer with quick tips */}
        <div className="px-3 py-2 border-t bg-muted/30 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Press ESC to close</span>
          <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
