import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LoadingSpinner from './components/LoadingSpinner';
import ProposalList from './pages/ProposalList';
import CreateProposal from './pages/CreateProposal';
import ApprovalQueue from './pages/ApprovalQueue';
import AdminTools from './pages/AdminTools';
import WFPDashboard from './pages/WFPDashboard';
import CreateWFPActivity from './pages/CreateWFPActivity';
import WFPImport from './pages/WFPImport';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { firebaseUser, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { firebaseUser, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (firebaseUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/proposals"
        element={
          <ProtectedRoute>
            <ProposalList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/proposals/create"
        element={
          <ProtectedRoute>
            <CreateProposal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/approvals"
        element={
          <ProtectedRoute>
            <ApprovalQueue />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tools"
        element={
          <ProtectedRoute>
            <AdminTools />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wfp"
        element={
          <ProtectedRoute>
            <WFPDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wfp/create"
        element={
          <ProtectedRoute>
            <CreateWFPActivity />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wfp/import"
        element={
          <ProtectedRoute>
            <WFPImport />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-primary-50">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
