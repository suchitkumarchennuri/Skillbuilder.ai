import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Lazy load components
const AuthPage = lazy(() => import('./components/AuthPage').then(module => ({ default: module.AuthPage })));
const LandingPage = lazy(() => import('./components/LandingPage').then(module => ({ default: module.LandingPage })));
const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute').then(module => ({ default: module.ProtectedRoute })));

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route 
          path="/" 
          element={
            user && location.pathname === '/' ? (
              <Navigate to="/dashboard" state={{ from: location }} replace />
            ) : (
              <LandingPage />
            )
          } 
        />
        <Route 
          path="/login" 
          element={
            user ? (
              <Navigate to="/dashboard" state={{ from: location }} replace />
            ) : (
              <AuthPage />
            )
          } 
        />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;