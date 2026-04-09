import { Navigate } from 'react-router';

export function Meetings() {
  return <Navigate to="/agenda?view=meetings" replace />;
}
