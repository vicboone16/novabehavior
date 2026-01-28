import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ApprovalCheckProps {
  children: React.ReactNode;
}

export function ApprovalCheck({ children }: ApprovalCheckProps) {
  const { user, loading: authLoading } = useAuth();
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkApproval = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_approved')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error checking approval status:', error);
          setIsApproved(false);
        } else {
          setIsApproved(profile?.is_approved ?? false);
        }
      } catch (err) {
        console.error('Error checking approval:', err);
        setIsApproved(false);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      checkApproval();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isApproved === false) {
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
}
