import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    const shouldLogout = window.confirm('Are you sure you want to log out?');
    if (!shouldLogout) return;
    logout();
  };

  return (
    <div className="min-h-screen bg-primary-50">
      <Navbar user={user} onLogout={handleLogout} />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Budget Monitoring Dashboard
            </h1>
            <p className="mt-2 text-gray-600">
              RDES Budget Monitoring for Fiscal Year 2025
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100-4h-.5a1 1 0 000-2H8a2 2 0 012-2h2a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">My Proposals</p>
                  <p className="text-2xl font-bold text-gray-900">
                    <a href="/proposals" className="text-primary-600 hover:text-primary-700">View All</a>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">WFP Activities</p>
                  <p className="text-2xl font-bold text-gray-900">
                    <a href="/wfp" className="text-orange-600 hover:text-orange-700">Track</a>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-success-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Create Proposal</p>
                  <p className="text-2xl font-bold text-gray-900">
                    <a href="/proposals/create" className="text-success-600 hover:text-success-700">New</a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Quick Actions
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <a
                    href="/proposals/create"
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <h3 className="text-sm font-medium text-gray-900">Create Proposal</h3>
                    <p className="text-xs text-gray-500 mt-1">Submit a new budget proposal</p>
                  </a>
                  <a
                    href="/proposals"
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <h3 className="text-sm font-medium text-gray-900">My Proposals</h3>
                    <p className="text-xs text-gray-500 mt-1">View and track your proposals</p>
                  </a>
                  <a
                    href="/wfp"
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <h3 className="text-sm font-medium text-gray-900">WFP Activities</h3>
                    <p className="text-xs text-gray-500 mt-1">Track WFP-funded activities</p>
                  </a>
                  <a
                    href="/wfp/import"
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <h3 className="text-sm font-medium text-gray-900">Import WFP Data</h3>
                    <p className="text-xs text-gray-500 mt-1">Import from Google Sheets</p>
                  </a>
                  {user?.role === 'admin' && (
                    <>
                      <a
                        href="/approvals"
                        className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <h3 className="text-sm font-medium text-gray-900">Approval Queue</h3>
                        <p className="text-xs text-gray-500 mt-1">Review pending proposals</p>
                      </a>
                      <a
                        href="/admin/tools"
                        className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <h3 className="text-sm font-medium text-gray-900">Admin Tools</h3>
                        <p className="text-xs text-gray-500 mt-1">Database management</p>
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
