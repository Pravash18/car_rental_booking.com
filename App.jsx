import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PaymentPage from './pages/PaymentPage';
import LoadingSpinner from './components/LoadingSpinner';

// Protected route: redirect to /login if not authenticated
function ProtectedRoute({ children }) {
  const { isAuthenticated, initialized } = useAuth();

  if (!initialized) {
    return <LoadingSpinner fullScreen message="Initializing..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Guest-only route: redirect to /dashboard if already logged in
function GuestRoute({ children }) {
  const { isAuthenticated, initialized } = useAuth();

  if (!initialized) {
    return <LoadingSpinner fullScreen message="Initializing..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public landing page */}
      <Route path="/" element={<Landing />} />

      {/* Auth page (guests only) */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />

      {/* Dashboard (public browse, auth for booking) */}
      <Route path="/dashboard" element={<Dashboard />} />

      {/* Payment page (auth required) */}
      <Route
        path="/payment/:bookingId"
        element={
          <ProtectedRoute>
            <PaymentPage />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
