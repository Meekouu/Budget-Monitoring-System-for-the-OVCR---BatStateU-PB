import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ExtensionBudgetProvider } from './contexts/ExtensionBudgetContext';
import { MasterDataProvider } from './contexts/MasterDataContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LoadingSpinner from './components/LoadingSpinner';
import ProposalList from './pages/ProposalList';
import CreateProposal from './pages/CreateProposal';
import MonitoringDashboard from './pages/MonitoringDashboard';
import MonitoringImport from './pages/MonitoringImport';
import FundManagement from './pages/FundManagement';
import Reports from './pages/Reports';
import ApprovalQueue from './pages/ApprovalQueue';
import MasterDataManagement from './pages/MasterDataManagement';
import FiscalYearManagement from './pages/FiscalYearManagement';

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
        path="/monitoring"
        element={
          <ProtectedRoute>
            <MonitoringDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/monitoring/import"
        element={
          <ProtectedRoute>
            <MonitoringImport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/funds"
        element={
          <ProtectedRoute>
            <FundManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
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
        path="/master-data"
        element={
          <ProtectedRoute>
            <MasterDataManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/fiscal-year"
        element={
          <ProtectedRoute>
            <FiscalYearManagement />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <MasterDataProvider>
      <ExtensionBudgetProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-primary-50">
              <AppRoutes />
            </div>
          </Router>
        </AuthProvider>
      </ExtensionBudgetProvider>
    </MasterDataProvider>
  );
};

export default App;
