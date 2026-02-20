import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { BudgetTransaction } from '../types/budget';
import { getBudgetTransactionsByUser } from '../lib/budgetFirestore';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

const ProposalList: React.FC = () => {
  const { user, logout } = useAuth();
  const [proposals, setProposals] = useState<BudgetTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleLogout = () => {
    const shouldLogout = window.confirm('Are you sure you want to log out?');
    if (!shouldLogout) return;
    logout();
  };

  useEffect(() => {
    const loadProposals = async () => {
      if (!user) return;
      
      try {
        const data = await getBudgetTransactionsByUser(user.uid);
        setProposals(data);
      } catch (err: any) {
        console.error('Error loading proposals:', err);
        setError(err.message || 'Failed to load proposals');
      } finally {
        setLoading(false);
      }
    };
    loadProposals();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Evaluation': return 'bg-yellow-100 text-yellow-800';
      case 'Proposal': return 'bg-blue-100 text-blue-800';
      case 'PR': return 'bg-purple-100 text-purple-800';
      case 'Obligated': return 'bg-orange-100 text-orange-800';
      case 'Disbursed': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Returned': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-50">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading proposals...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50">
      <Navbar user={user} onLogout={handleLogout} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary-800">My Proposals</h1>
          <Link
            to="/proposals/create"
            className="px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700"
          >
            Create New Proposal
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        {proposals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No proposals yet</h3>
            <p className="text-gray-600 mb-4">Create your first proposal to get started.</p>
            <Link
              to="/proposals/create"
              className="px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700"
            >
              Create Proposal
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Budget Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {proposals.map((proposal) => (
                    <tr key={proposal.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(proposal.dateReceived).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {proposal.activityName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {proposal.projectName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {proposal.budgetCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₱{proposal.amountRequested.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(proposal.status)}`}>
                          {proposal.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          to={`/proposals/${proposal.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProposalList;
