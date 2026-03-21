import { Navigate, useLocation } from 'react-router-dom';

export default function NovaAI() {
  const location = useLocation();
  return <Navigate to={`/ask-nova${location.search}`} replace />;
}
