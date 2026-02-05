import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Send, 
  MoreHorizontal, 
  ExternalLink, 
  XCircle, 
  Copy, 
  Eye,
  Loader2 
} from 'lucide-react';
import { useObservationRequests } from '@/hooks/useObservationRequests';
import { ObservationRequest, REQUEST_TYPE_LABELS, STATUS_LABELS } from '@/types/observationRequest';
import { useToast } from '@/hooks/use-toast';
import { ResponseViewerDialog } from './ResponseViewerDialog';

interface RequestStatusTableProps {
  studentId?: string;
}

export function RequestStatusTable({ studentId }: RequestStatusTableProps) {
  const { requests, isLoading, sendRequest, cancelRequest } = useObservationRequests(studentId);
  const { toast } = useToast();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [viewingRequest, setViewingRequest] = useState<ObservationRequest | null>(null);

  const handleSendRequest = async (requestId: string) => {
    setSendingId(requestId);
    await sendRequest(requestId);
    setSendingId(null);
  };

  const handleCopyLink = (request: ObservationRequest) => {
    const link = `${window.location.origin}/observation/${request.access_token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link Copied',
      description: 'Observation form link copied to clipboard',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = STATUS_LABELS[status] || { label: status, color: 'bg-gray-500' };
    return (
      <Badge className={`${statusInfo.color} text-white`}>
        {statusInfo.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No observation requests yet</p>
        <p className="text-sm">Create a request to send to teachers or parents</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Recipient</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{request.recipient_name}</p>
                  <p className="text-xs text-muted-foreground">{request.recipient_email}</p>
                </div>
              </TableCell>
              <TableCell>
                {REQUEST_TYPE_LABELS[request.request_type] || request.request_type}
              </TableCell>
              <TableCell>{getStatusBadge(request.status)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {request.expires_at 
                  ? format(new Date(request.expires_at), 'MMM d, yyyy')
                  : '-'}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {request.status === 'pending' && (
                      <DropdownMenuItem 
                        onClick={() => handleSendRequest(request.id)}
                        disabled={sendingId === request.id}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send Email
                      </DropdownMenuItem>
                    )}
                    {request.status === 'completed' && (
                      <DropdownMenuItem onClick={() => setViewingRequest(request)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Response
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleCopyLink(request)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => window.open(`/observation/${request.access_token}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Form
                    </DropdownMenuItem>
                    {request.status !== 'completed' && request.status !== 'expired' && (
                      <DropdownMenuItem 
                        onClick={() => cancelRequest(request.id)}
                        className="text-destructive"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel Request
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {viewingRequest && (
        <ResponseViewerDialog
          open={!!viewingRequest}
          onOpenChange={() => setViewingRequest(null)}
          request={viewingRequest}
        />
      )}
    </>
  );
}
