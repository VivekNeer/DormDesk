import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import './auth/cognito'; // Initialize Cognito config

import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CategoryAdminDashboard from './pages/CategoryAdminDashboard';

const CATEGORY_ADMIN_GROUPS = ['FoodAdmin', 'WaterAdmin', 'RoomAdmin', 'ElectricalAdmin', 'CleaningAdmin'];

// Smart redirect: if logged in, go to correct dashboard; otherwise go to login
function RootRedirect() {
  const { isAuthenticated, groups, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    if (groups.includes('SuperAdmin')) {
      return <Navigate to="/admin" replace />;
    }
    if (groups.some(g => CATEGORY_ADMIN_GROUPS.includes(g))) {
      return <Navigate to="/category-admin" replace />;
    }
    return <Navigate to="/student" replace />;
  }

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/student" element={
            <ProtectedRoute allowedGroups={['Students']}>
              <StudentDashboard />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute allowedGroups={['SuperAdmin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/category-admin" element={
            <ProtectedRoute allowedGroups={CATEGORY_ADMIN_GROUPS}>
              <CategoryAdminDashboard />
            </ProtectedRoute>
          } />

          {/* Smart root redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}