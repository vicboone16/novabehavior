import { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  AlertTriangle,
  Users,
  Loader2,
  Filter,
  ChevronDown,
  ChevronRight,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface Authorization {
  id: string;
  auth_number: string;
  start_date: string;
  end_date: string;
  status: string;
  units_approved: number;
  units_used: number;
  units_remaining: number;
  unit_type: string | null;
  student_id: string;
  student: {
    id: string;
    name: string;
  };
  payer: {
    id: string;
    name: string;
  } | null;
}

export function GlobalAuthorizationDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [lowUnitsOnly, setLowUnitsOnly] = useState(false);
  const [expandedAuthId, setExpandedAuthId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('authorizations')
        .select(`
          id, auth_number, start_date, end_date, status, 
          units_approved, units_used, units_remaining, unit_type, student_id,
          student:students(id, name),
          payer:payers(id, name)
        `)
        .order('end_date', { ascending: true });

      if (error) throw error;
      setAuthorizations((data as unknown as Authorization[]) || []);
    } catch (error) {
      console.error('Error fetching authorizations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter authorizations
  const filteredAuths = authorizations.filter(auth => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const studentName = auth.student?.name?.toLowerCase() || '';
      const authNumber = auth.auth_number?.toLowerCase() || '';
      const payerName = auth.payer?.name?.toLowerCase() || '';
      if (!studentName.includes(searchLower) && 
          !authNumber.includes(searchLower) && 
          !payerName.includes(searchLower)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && auth.status !== statusFilter) return false;
    if (expiringOnly) {
      const daysToExpiry = differenceInDays(parseISO(auth.end_date), new Date());
      if (daysToExpiry > 30) return false;
    }
    if (lowUnitsOnly) {
      const usagePercent = auth.units_approved > 0 
        ? (auth.units_used / auth.units_approved) * 100 
        : 0;
      if (usagePercent < 80) return false;
    }
    return true;
  });

  // Stats
  const activeAuths = authorizations.filter(a => a.status === 'active');
  const expiringAuths = activeAuths.filter(a => 
    differenceInDays(parseISO(a.end_date), new Date()) <= 30
  );
  const lowUnitAuths = activeAuths.filter(a => {
    const usagePercent = a.units_approved > 0 ? (a.units_used / a.units_approved) * 100 : 0;
    return usagePercent >= 80;
  });
  const exhaustedAuths = activeAuths.filter(a => 
    a.units_remaining !== null && a.units_remaining <= 0
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      expired: 'destructive',
      pending: 'outline',
      exhausted: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const getExpiryWarning = (endDate: string) => {
    const daysLeft = differenceInDays(parseISO(endDate), new Date());
    if (daysLeft < 0) return <Badge variant="destructive">Expired</Badge>;
    if (daysLeft <= 7) return <Badge variant="destructive">{daysLeft}d left</Badge>;
    if (daysLeft <= 30) return <Badge variant="outline" className="text-amber-600">{daysLeft}d left</Badge>;
    return null;
  };

  const getUsagePercent = (auth: Authorization) => {
    if (!auth.units_approved) return 0;
    return Math.round((auth.units_used / auth.units_approved) * 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeAuths.length}</p>
                <p className="text-sm text-muted-foreground">Active Authorizations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={expiringAuths.length > 0 ? 'border-amber-300' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{expiringAuths.length}</p>
                <p className="text-sm text-muted-foreground">Expiring (30 days)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={lowUnitAuths.length > 0 ? 'border-amber-300' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lowUnitAuths.length}</p>
                <p className="text-sm text-muted-foreground">Low Units (&gt;80% used)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={exhaustedAuths.length > 0 ? 'border-destructive' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{exhaustedAuths.length}</p>
                <p className="text-sm text-muted-foreground">Exhausted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client, auth #, or payer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-[150px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant={expiringOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExpiringOnly(!expiringOnly)}
            >
              <Clock className="h-4 w-4 mr-2" />
              Expiring Soon
            </Button>

            <Button
              variant={lowUnitsOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLowUnitsOnly(!lowUnitsOnly)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Low Units
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Authorizations Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Authorizations</CardTitle>
          <CardDescription>
            {filteredAuths.length} of {authorizations.length} authorizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Auth #</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Alerts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAuths.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No authorizations found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAuths.map(auth => {
                  const usagePercent = getUsagePercent(auth);
                  const isExpanded = expandedAuthId === auth.id;
                  
                  return (
                    <Collapsible key={auth.id} asChild open={isExpanded}>
                      <>
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                          <TableCell>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setExpandedAuthId(isExpanded ? null : auth.id)}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>
                          <TableCell>
                            <Link 
                              to={`/students/${auth.student_id}`}
                              className="font-medium hover:underline"
                            >
                              {auth.student?.name || 'Unknown'}
                            </Link>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{auth.auth_number}</TableCell>
                          <TableCell>{auth.payer?.name || '-'}</TableCell>
                          <TableCell>{getStatusBadge(auth.status)}</TableCell>
                          <TableCell className="text-sm">
                            {format(parseISO(auth.start_date), 'MM/dd/yy')} - {format(parseISO(auth.end_date), 'MM/dd/yy')}
                          </TableCell>
                          <TableCell>
                            <div className="w-[120px]">
                              <div className="flex justify-between text-xs mb-1">
                                <span>{auth.units_used} / {auth.units_approved}</span>
                                <span>{usagePercent}%</span>
                              </div>
                              <Progress 
                                value={usagePercent} 
                                className={cn(
                                  "h-2",
                                  usagePercent >= 90 && "bg-destructive/20",
                                  usagePercent >= 80 && usagePercent < 90 && "bg-amber-100"
                                )}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {getExpiryWarning(auth.end_date)}
                              {usagePercent >= 80 && usagePercent < 100 && (
                                <Badge variant="outline" className="text-amber-600">
                                  Low Units
                                </Badge>
                              )}
                              {(auth.units_remaining !== null && auth.units_remaining <= 0) && (
                                <Badge variant="destructive">Exhausted</Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={8}>
                              <div className="py-4 px-6 space-y-3">
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Unit Type:</span>
                                    <span className="ml-2 font-medium">{auth.unit_type || 'Not specified'}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Remaining:</span>
                                    <span className="ml-2 font-medium">{auth.units_remaining ?? 'N/A'} units</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Days Left:</span>
                                    <span className="ml-2 font-medium">
                                      {Math.max(0, differenceInDays(parseISO(auth.end_date), new Date()))} days
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" asChild>
                                    <Link to={`/students/${auth.student_id}`}>
                                      <Users className="h-4 w-4 mr-2" />
                                      View Client
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
