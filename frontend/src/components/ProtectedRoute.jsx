import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function ProtectedRoute({ allowedGroups, children }) {
  // ⚠️ TEMPORARY BYPASS — remove this line to re-enable auth guard
  // return children;

  // --- Real auth guard below (uncomment by removing the `return children;` above) ---
  const { isAuthenticated, groups, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user belongs to at least one allowed group
  const hasAccess = allowedGroups.some(group => groups.includes(group));

  if (!hasAccess) {
    // Redirect to the appropriate dashboard based on their actual group
    if (groups.includes('SuperAdmin')) {
      return <Navigate to="/admin" replace />;
    }
    if (groups.includes('Students')) {
      return <Navigate to="/student" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}
