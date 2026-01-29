import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Users, GraduationCap, School } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  id: string;
  name: string;
  type: 'student' | 'user';
  subtitle?: string;
  school?: string;
  grade?: string;
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (!user) return;
    
    const checkAdmin = async () => {
      const { data } = await supabase.rpc('is_admin', { _user_id: user.id });
      setIsAdmin(!!data);
    };
    
    checkAdmin();
  }, [user]);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!user || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      // Search students
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, name, school, grade, user_id')
        .eq('is_archived', false)
        .ilike('name', `%${searchQuery}%`)
        .limit(10);

      if (studentsData) {
        // Get students user has access to
        const { data: accessData } = await supabase
          .from('user_student_access')
          .select('student_id')
          .eq('user_id', user.id);
        
        const accessIds = new Set(accessData?.map(a => a.student_id) || []);

        // Filter students based on access
        const accessibleStudents = studentsData.filter(s => 
          s.user_id === user.id || accessIds.has(s.id) || isAdmin
        );

        accessibleStudents.forEach(s => {
          searchResults.push({
            id: s.id,
            name: s.name,
            type: 'student',
            school: s.school || undefined,
            grade: s.grade || undefined,
            subtitle: [s.grade ? `Grade ${s.grade}` : null, s.school].filter(Boolean).join(' • ') || undefined,
          });
        });
      }

      // Search users (admin only)
      if (isAdmin) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, display_name, email, first_name, last_name')
          .or(`display_name.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .limit(10);

        if (profilesData) {
          profilesData.forEach(p => {
            const displayName = p.display_name || 
              [p.first_name, p.last_name].filter(Boolean).join(' ') || 
              p.email || 
              'Unknown User';
            
            searchResults.push({
              id: p.user_id,
              name: displayName,
              type: 'user',
              subtitle: p.email || undefined,
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
      if (query) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery('');
    
    if (result.type === 'student') {
      navigate(`/students/${result.id}`);
    } else {
      navigate(`/admin?user=${result.id}`);
    }
  };

  const studentResults = results.filter(r => r.type === 'student');
  const userResults = results.filter(r => r.type === 'user');

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 text-muted-foreground"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden md:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Search students or users..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.length < 2 ? (
            <CommandEmpty>Type at least 2 characters to search...</CommandEmpty>
          ) : isLoading ? (
            <CommandEmpty>Searching...</CommandEmpty>
          ) : results.length === 0 ? (
            <CommandEmpty>No results found.</CommandEmpty>
          ) : (
            <>
              {studentResults.length > 0 && (
                <CommandGroup heading="Students">
                  {studentResults.map((result) => (
                    <CommandItem
                      key={`student-${result.id}`}
                      value={result.name}
                      onSelect={() => handleSelect(result)}
                      className="gap-3 cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{result.name}</p>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {result.school && <School className="w-3 h-3" />}
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">Student</Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {userResults.length > 0 && (
                <CommandGroup heading="Users">
                  {userResults.map((result) => (
                    <CommandItem
                      key={`user-${result.id}`}
                      value={result.name}
                      onSelect={() => handleSelect(result)}
                      className="gap-3 cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-4 h-4 text-secondary-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{result.name}</p>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">User</Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
