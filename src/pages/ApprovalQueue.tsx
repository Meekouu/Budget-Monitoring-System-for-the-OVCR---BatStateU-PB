import React, { useState, useEffect } from 'react';
import type { BudgetTransaction } from '../types/budget';
import { getBudgetTransactionsByStatus, updateBudgetTransaction } from '../lib/budgetFirestore';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

const ApprovalQueue: React.FC = () => {
  const { user, logout } = useAuth();
  const [proposals, setProposals] = useState<BudgetTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleLogout = () => {
    const shouldLogout = window.confirm('Are you sure you want to log out?');
    if (!shouldLogout) return;
    logout();
  };

  useEffect(() => {
    const loadProposals = async () => {
      try {
        const data = await getBudgetTransactionsByStatus('Evaluation');
        setProposals(data);
      } catch (err: any) {
        console.error('Error loading proposals:', err);
        setError(err.message || 'Failed to load proposals');
      } finally {
        setLoading(false);
      }
    };
    loadProposals();
  }, []);

  const handleApprove = async (proposalId: string) => {
    if (!user) return;
    
    setActionLoading(proposalId);
    try {
      await updateBudgetTransaction(proposalId, {
        status: 'Proposal',
        approvedBy: user.uid,
        approvedAt: new Date(),
      });
      setProposals(prev => prev.filter(p => p.id !== proposalId));
    } catch (err: any) {
      console.error('Error approving proposal:', err);
      setError(err.message || 'Failed to approve proposal');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReturn = async (proposalId: string) => {
    if (!user) return;
    
    setActionLoading(proposalId);
    try {
      await updateBudgetTransaction(proposalId, {
        status: 'Returned',
        approvedBy: user.uid,
        approvedAt: new Date(),
      });
      setProposals(prev => prev.filter(p => p.id !== proposalId));
    } catch (err: any) {
      console.error('Error returning proposal:', err);
      setError(err.message || 'Failed to return proposal');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (proposalId: string) => {
    if (!user) return;
    
    setActionLoading(proposalId);
    try {
      await updateBudgetTransaction(proposalId, {
        status: 'Rejected',
        approvedBy: user.uid,
        approvedAt: new Date(),
      });
      setProposals(prev => prev.filter(p => p.id !== proposalId));
    } catch (err: any) {
      console.error('Error rejecting proposal:', err);
      setError(err.message || 'Failed to reject proposal');
    } finally {
      setActionLoading(null);
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
        <h1 className="text-3xl font-bold text-primary-800 mb-6">Approval Queue</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        {proposals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No proposals pending approval</h3>
            <p className="text-gray-600">All proposals have been processed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="bg-white shadow rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{proposal.activityName}</h3>
                    <p className="text-sm text-gray-600">{proposal.projectName}</p>
                    <p className="text-sm text-gray-600">{proposal.programName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Budget Code: {proposal.budgetCode}</p>
                    <p className="text-sm font-medium text-gray-700">
                      Amount: ₱{proposal.amountRequested.toLocaleString()}
                    </p>
                    <p className="text-sm font-medium text-gray-700">
                      Fund Category: {proposal.fundCategory}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Submitted: {new Date(proposal.dateReceived).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Beneficiaries: {proposal.beneficiariesTotal} ({proposal.beneficiariesMale}M, {proposal.beneficiariesFemale}F)
                    </p>
                    {proposal.implementationDate && (
                      <p className="text-sm text-gray-600">
                        Implementation: {proposal.implementationDate}
                      </p>
                    )}
                  </div>
                </div>

                {proposal.remarks && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Remarks:</h4>
                    <p className="text-sm text-gray-600">{proposal.remarks}</p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={() => handleApprove(proposal.id)}
                    disabled={actionLoading === proposal.id}
                    className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading === proposal.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReturn(proposal.id)}
                    disabled={actionLoading === proposal.id}
                    className="px-4 py-2 bg-yellow-600 text-white font-medium rounded-md hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {actionLoading === proposal.id ? 'Processing...' : 'Return'}
                  </button>
                  <button
                    onClick={() => handleReject(proposal.id)}
                    disabled={actionLoading === proposal.id}
                    className="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading === proposal.id ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalQueue;
