import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

const Reports: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    const shouldLogout = window.confirm('Are you sure you want to log out?');
    if (!shouldLogout) return;
    logout();
  };

  return (
    <div className="min-h-screen bg-primary-50">
      <Navbar user={user} onLogout={handleLogout} />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-primary-800 mb-2">Reports</h1>
        <p className="text-gray-600 mb-8">Generate and export budget monitoring reports</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Fund Utilization Report</h3>
            <p className="text-sm text-gray-600 mb-4">Summary of fund allocations, obligations, and disbursements across all campuses.</p>
            <span className="inline-block px-3 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">Coming Soon</span>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Workflow Status Report</h3>
            <p className="text-sm text-gray-600 mb-4">Track proposals through each stage of the budget workflow from WFP to disbursement.</p>
            <span className="inline-block px-3 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">Coming Soon</span>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Campus Comparison Report</h3>
            <p className="text-sm text-gray-600 mb-4">Compare budget performance and utilization rates across different campuses.</p>
            <span className="inline-block px-3 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">Coming Soon</span>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Supplemental Fund Report</h3>
            <p className="text-sm text-gray-600 mb-4">Detailed tracking of supplemental fund requests and disbursements.</p>
            <span className="inline-block px-3 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">Coming Soon</span>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Underutilized Funds Report</h3>
            <p className="text-sm text-gray-600 mb-4">Identify funds with low utilization rates that may need reallocation.</p>
            <span className="inline-block px-3 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">Coming Soon</span>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Beneficiary Impact Report</h3>
            <p className="text-sm text-gray-600 mb-4">Summary of beneficiaries reached through extension programs by campus and gender.</p>
            <span className="inline-block px-3 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
