import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ObservationRequest, ObservationResponseData } from '@/types/observationRequest';

export function useObservationRequests(studentId?: string, showAll?: boolean) {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<ObservationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Admins and super_admins can see all requests
  const canViewAll = showAll || userRole === 'admin' || userRole === 'super_admin';

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      let query = supabase
        .from('observation_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // Only filter by creator for non-admin roles
      if (!canViewAll) {
        query = query.eq('created_by', user.id);
      }

      if (studentId) {
        query = query.eq('student_id', studentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests((data || []) as unknown as ObservationRequest[]);
    } catch (error) {
      console.error('Error fetching observation requests:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, studentId, canViewAll]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const createRequest = async (request: {
    student_id: string;
    request_type: string;
    target_behaviors?: string[];
    instructions?: string;
    recipient_name: string;
    recipient_email: string;
    recipient_role?: string;
  }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('observation_requests')
        .insert({
          ...request,
          created_by: user.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Request Created',
        description: 'Observation request created successfully',
      });

      await fetchRequests();
      return data as unknown as ObservationRequest;
    } catch (error) {
      console.error('Error creating request:', error);
      toast({
        title: 'Error',
        description: 'Failed to create observation request',
        variant: 'destructive',
      });
      return null;
    }
  };

  const sendRequest = async (requestId: string) => {
    try {
      // Call the unified magic link email function
      const { data, error: fnError } = await supabase.functions.invoke('send-magic-link-email', {
        body: { type: 'observation', recordId: requestId },
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        // Fallback: just update status if edge function fails
        const { error } = await supabase
          .from('observation_requests')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString() 
          })
          .eq('id', requestId);

        if (error) throw error;

        toast({
          title: 'Request Marked as Sent',
          description: 'Email delivery failed but the link has been generated. Use "Copy Link" to share manually.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Email Sent',
          description: 'Observation request email delivered successfully',
        });
      }

      await fetchRequests();
    } catch (error) {
      console.error('Error sending request:', error);
      toast({
        title: 'Error',
        description: 'Failed to send request',
        variant: 'destructive',
      });
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('observation_requests')
        .update({ status: 'expired' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Request Cancelled',
        description: 'Observation request has been voided',
      });

      await fetchRequests();
    } catch (error) {
      console.error('Error cancelling request:', error);
    }
  };

  const voidRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('observation_requests')
        .update({ status: 'expired' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Request Voided',
        description: 'Observation request has been voided',
      });

      await fetchRequests();
    } catch (error) {
      console.error('Error voiding request:', error);
    }
  };

  return {
    requests,
    isLoading,
    createRequest,
    sendRequest,
    cancelRequest,
    voidRequest,
    refresh: fetchRequests,
  };
}

// Hook for public form (no auth required)
export function usePublicObservationRequest(token: string) {
  const [request, setRequest] = useState<ObservationRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const { data, error } = await supabase
          .from('observation_requests')
          .select('*')
          .eq('access_token', token)
          .single();

        if (error) throw error;

        const req = data as unknown as ObservationRequest;
        
        // Check if expired
        if (req.expires_at && new Date(req.expires_at) < new Date()) {
          setError('This observation request has expired');
          return;
        }

        if (req.status === 'completed') {
          setError('This observation request has already been completed');
          return;
        }

        // Mark as opened
        if (req.status === 'sent' || req.status === 'pending') {
          await supabase
            .from('observation_requests')
            .update({ 
              status: 'opened', 
              opened_at: new Date().toISOString() 
            })
            .eq('id', req.id);
        }

        setRequest(req);
      } catch (err) {
        console.error('Error fetching request:', err);
        setError('Observation request not found');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchRequest();
    }
  }, [token]);

  const submitResponse = async (responseData: ObservationResponseData) => {
    if (!request) return false;

    try {
      const { error } = await supabase
        .from('observation_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          response_data: responseData as unknown as null,
        })
        .eq('id', request.id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error submitting response:', err);
      return false;
    }
  };

  return {
    request,
    isLoading,
    error,
    submitResponse,
  };
}
