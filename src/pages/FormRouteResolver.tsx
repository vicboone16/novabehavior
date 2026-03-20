import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import PublicFormPage from './PublicFormPage';
import { ParentPortalView } from '@/components/intake-forms';

export default function FormRouteResolver() {
  const { token } = useParams<{ token: string }>();
  const [routeType, setRouteType] = useState<'checking' | 'intake' | 'public'>('checking');

  useEffect(() => {
    let cancelled = false;

    const resolveRoute = async () => {
      if (!token) {
        if (!cancelled) setRouteType('public');
        return;
      }

      const { data, error } = await supabase
        .from('form_delivery_links')
        .select('token')
        .eq('token', token)
        .maybeSingle();

      if (cancelled) return;

      if (!error && data) {
        setRouteType('intake');
        return;
      }

      setRouteType('public');
    };

    resolveRoute();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token || routeType === 'public') {
    return <PublicFormPage />;
  }

  if (routeType === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <ParentPortalView token={token} />;
}