import { Navigate } from 'react-router-dom';
import { getToken } from '../lib/auth';

function ProtectedRoute({ children }) {
  const token = getToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default ProtectedRoute;
