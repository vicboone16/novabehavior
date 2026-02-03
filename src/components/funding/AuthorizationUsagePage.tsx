import { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  AlertTriangle,
  FileText,
  Loader2,
  Filter,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface AuthorizationUsagePageProps {
  studentId: string;
}

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
}

interface AuthorizedService {
  id: string;
  authorization_id: string;
  service_name: string;
  cpt_code: string | null;
  unit_type: string;
  units_approved: number;
  units_used: number;
  units_remaining: number;
  authorization: Authorization;
}

interface SessionDeduction {
  id: string;
  session_id: string;
  units_deducted: number;
  created_at: string;
  deduction_reason: string;
}

export function AuthorizationUsagePage({ studentId }: AuthorizationUsagePageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [services, setServices] = useState<AuthorizedService[]>([]);
  const [sessionDeductions, setSessionDeductions] = useState<SessionDeduction[]>([]);

  // Filters
  const [selectedAuthId, setSelectedAuthId] = useState<string>('all');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Expanded service details
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [studentId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch authorizations
      const { data: authData } = await supabase
        .from('authorizations')
        .select('id, auth_number, start_date, end_date, status, units_approved, units_used, units_remaining, unit_type')
        .eq('student_id', studentId)
        .order('end_date', { ascending: false });

      // Fetch authorized services with authorization details
      const { data: serviceData } = await supabase
        .from('authorized_services')
        .select(`
          id, authorization_id, service_name, cpt_code, unit_type, 
          units_approved, units_used, units_remaining,
          authorization:authorizations(id, auth_number, start_date, end_date, status, units_approved, units_used, units_remaining, unit_type)
        `)
        .eq('student_id', studentId)
        .eq('is_active', true);

      // Fetch session deductions
      const { data: deductionData } = await supabase
        .from('unit_deduction_ledger')
        .select('id, session_id, units_deducted, created_at, deduction_reason')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      setAuthorizations(authData || []);
      setServices((serviceData || []) as unknown as AuthorizedService[]);
      setSessionDeductions(deductionData || []);

      // Set default date range
      if (authData && authData.length > 0) {
        const activeAuth = authData.find(a => a.status === 'active') || authData[0];
        setDateFrom(activeAuth.start_date);
        setDateTo(format(new Date(), 'yyyy-MM-dd'));
      }
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter services
  const filteredServices = services.filter(s => {
    if (selectedAuthId !== 'all' && s.authorization_id !== selectedAuthId) return false;
    if (selectedServiceId !== 'all' && s.id !== selectedServiceId) return false;
    return true;
  });

  // Calculate totals
  const totalUnitsApproved = filteredServices.reduce((sum, s) => sum + s.units_approved, 0);
  const totalUnitsUsed = filteredServices.reduce((sum, s) => sum + s.units_used, 0);
  const totalUnitsRemaining = totalUnitsApproved - totalUnitsUsed;
  const usagePercent = totalUnitsApproved > 0 ? (totalUnitsUsed / totalUnitsApproved) * 100 : 0;

  // Find next expiration
  const activeAuths = authorizations.filter(a => a.status === 'active');
  const nextExpiration = activeAuths.length > 0 
    ? activeAuths.reduce((earliest, a) => 
        new Date(a.end_date) < new Date(earliest.end_date) ? a : earliest
      )
    : null;
  const daysUntilExpiration = nextExpiration 
    ? differenceInDays(parseISO(nextExpiration.end_date), new Date())
    : null;

  const getServiceStatus = (service: AuthorizedService) => {
    const usagePercent = service.units_approved > 0 
      ? (service.units_used / service.units_approved) * 100 
      : 0;

    if (service.units_remaining <= 0) {
      return { label: 'Exhausted', variant: 'destructive' as const };
    }
    if (usagePercent >= 80) {
      return { label: 'Low Units', variant: 'secondary' as const };
    }
    if (service.authorization?.status === 'expired') {
      return { label: 'Expired', variant: 'destructive' as const };
    }
    return { label: 'Active', variant: 'default' as const };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">No authorized services configured</p>
        <p className="text-sm">Add services through the authorization setup to track usage.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Authorization Usage</h2>
        <p className="text-sm text-muted-foreground">
          Tracks insurance units deducted from sessions.
        </p>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[150px]">
              <Label className="text-xs">Authorization</Label>
              <Select value={selectedAuthId} onValueChange={setSelectedAuthId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Active" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Active Authorizations</SelectItem>
                  {authorizations.map(auth => (
                    <SelectItem key={auth.id} value={auth.id}>
                      {auth.auth_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <Label className="text-xs">Service</Label>
              <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.service_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[120px]">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                className="h-9"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="min-w-[120px]">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                className="h-9"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="min-w-[140px]">
              <Label className="text-xs">Session Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="counted">Counted Toward Auth</SelectItem>
                  <SelectItem value="needs_review">Needs Review</SelectItem>
                  <SelectItem value="excluded">Excluded / Non-Billable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Units Approved</p>
            <p className="text-2xl font-bold">{totalUnitsApproved.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Units Used</p>
            <p className="text-2xl font-bold">{totalUnitsUsed.toLocaleString()}</p>
            <Progress value={usagePercent} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Units Remaining</p>
            <p className={cn(
              "text-2xl font-bold",
              usagePercent >= 80 && "text-amber-600"
            )}>
              {totalUnitsRemaining.toLocaleString()}
              {usagePercent >= 80 && (
                <AlertTriangle className="w-4 h-4 inline ml-2" />
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Next Expiration</p>
            {nextExpiration ? (
              <>
                <p className="text-lg font-semibold">
                  {format(parseISO(nextExpiration.end_date), 'MMM d, yyyy')}
                </p>
                <p className={cn(
                  "text-sm",
                  daysUntilExpiration && daysUntilExpiration <= 30 
                    ? "text-amber-600" 
                    : "text-muted-foreground"
                )}>
                  {daysUntilExpiration} days remaining
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Service Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Authorization #</TableHead>
                <TableHead>Unit Type</TableHead>
                <TableHead className="text-right">Approved</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.map(service => {
                const status = getServiceStatus(service);
                const isExpanded = expandedServiceId === service.id;
                const serviceDeductions = sessionDeductions.filter(
                  d => d.session_id // Would need to join with authorized_service_id
                );

                return (
                  <Collapsible key={service.id} open={isExpanded} asChild>
                    <>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => setExpandedServiceId(isExpanded ? null : service.id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="font-medium">
                          {service.service_name}
                          {service.cpt_code && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({service.cpt_code})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {service.authorization?.auth_number}
                        </TableCell>
                        <TableCell className="capitalize">
                          {service.unit_type.replace('_', ' ')}
                        </TableCell>
                        <TableCell className="text-right">{service.units_approved}</TableCell>
                        <TableCell className="text-right">{service.units_used}</TableCell>
                        <TableCell className="text-right font-medium">
                          {service.units_remaining}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View Sessions
                          </Button>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={9} className="p-4">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Recent Session Deductions</p>
                              {sessionDeductions.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  No sessions have deducted units yet.
                                </p>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Date</TableHead>
                                      <TableHead>Units Deducted</TableHead>
                                      <TableHead>Reason</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sessionDeductions.slice(0, 5).map(d => (
                                      <TableRow key={d.id}>
                                        <TableCell>
                                          {format(parseISO(d.created_at), 'MMM d, yyyy h:mm a')}
                                        </TableCell>
                                        <TableCell>{d.units_deducted}</TableCell>
                                        <TableCell className="capitalize">
                                          {d.deduction_reason}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
