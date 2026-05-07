import { Navigate, useParams, useSearchParams } from 'react-router-dom';

/**
 * Redirects legacy /intelligence/* deep links into the Dashboard tab view,
 * preserving any client/classroom context as query parameters so the
 * Dashboard can scope to the right student/classroom.
 */
export function ClientIntelligenceRedirect() {
  const { clientId } = useParams<{ clientId: string }>();
  const [params] = useSearchParams();
  const search = new URLSearchParams(params);
  search.set('view', 'intelligence');
  if (clientId) search.set('clientId', clientId);
  return <Navigate to={`/?${search.toString()}`} replace />;
}

export function ClassroomIntelligenceRedirect() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const [params] = useSearchParams();
  const search = new URLSearchParams(params);
  search.set('view', 'operations');
  if (classroomId) search.set('classroomId', classroomId);
  return <Navigate to={`/?${search.toString()}`} replace />;
}
