import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ObservationRequest, ObservationEntry } from '@/types/observationRequest';

interface ResponseViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ObservationRequest;
}

export function ResponseViewerDialog({
  open,
  onOpenChange,
  request,
}: ResponseViewerDialogProps) {
  const responseData = request.response_data;

  if (!responseData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No Response Data</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">No response data available for this request.</p>
        </DialogContent>
      </Dialog>
    );
  }

  const observations = responseData.observations || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Observation Response</DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>From: {request.recipient_name}</span>
            <span>•</span>
            <span>
              Completed: {request.completed_at 
                ? format(new Date(request.completed_at), 'MMM d, yyyy h:mm a')
                : 'Unknown'}
            </span>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4">
            {observations.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No observations recorded
              </p>
            ) : (
              observations.map((entry: ObservationEntry, index: number) => (
                <Card key={entry.id || index}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{entry.behaviorName || 'Behavior'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <Badge variant="outline">{entry.type}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {entry.type === 'frequency' && entry.count !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Count: </span>
                          <span className="font-medium">{entry.count}</span>
                        </div>
                      )}
                      {entry.type === 'duration' && entry.durationMinutes !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Duration: </span>
                          <span className="font-medium">{entry.durationMinutes} min</span>
                        </div>
                      )}
                      {entry.type === 'abc' && (
                        <>
                          {entry.antecedent && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Antecedent: </span>
                              <span>{entry.antecedent}</span>
                            </div>
                          )}
                          {entry.consequence && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Consequence: </span>
                              <span>{entry.consequence}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {entry.notes && (
                      <p className="text-sm mt-2 text-muted-foreground border-t pt-2">
                        {entry.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}

            {responseData.notes && (
              <Card>
                <CardContent className="pt-4">
                  <p className="font-medium mb-2">Additional Notes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {responseData.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
