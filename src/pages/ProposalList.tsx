import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { BudgetTransaction } from '../types/budget';
import { getBudgetTransactionsByUser, deleteBudgetTransaction } from '../lib/budgetFirestore';
import { formatCurrency, getStatusColor, getCampusDisplayName } from '../lib/utils';
import { PAGINATION } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { usePerformance } from '../lib/performance';
import Navbar from '../components/Navbar';

const ProposalList: React.FC = () => {
  const { user, logout } = useAuth();
  const [proposals, setProposals] = useState<BudgetTransaction[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<BudgetTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterColumn, setFilterColumn] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const rowsPerPage = PAGINATION.proposalRowsPerPage;
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when search changes
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounced column filter effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when filter changes
    }, 100); // 100ms delay for column changes

    return () => clearTimeout(timer);
  }, [filterColumn]);

  const handleLogout = () => {
    const shouldLogout = window.confirm('Are you sure you want to log out?');
    if (!shouldLogout) return;
    logout();
  };

  const { measureAsync } = usePerformance();

  useEffect(() => {
    const loadProposals = async () => {
      if (!user) return;
      
      try {
        const data = await measureAsync('load-proposals-list', async () => {
          return await getBudgetTransactionsByUser(user.uid);
        });
        setProposals(data);
        setFilteredProposals(data);
      } catch (err: any) {
        console.error('Error loading proposals:', err);
        setError(err.message || 'Failed to load proposals');
      } finally {
        setLoading(false);
      }
    };
    loadProposals();
  }, [user, measureAsync]);

  // Filter proposals based on search and column
  useEffect(() => {
    let filtered = proposals;
    
    if (debouncedSearchTerm) {
      filtered = filtered.filter(proposal => {
        const searchValue = debouncedSearchTerm.toLowerCase();
        
        switch (filterColumn) {
          case 'activity':
            return proposal.activityName.toLowerCase().includes(searchValue);
          case 'budgetCode':
            return proposal.budgetCode.toLowerCase().includes(searchValue);
          case 'campus':
            return getCampusDisplayName(proposal.campusId).toLowerCase().includes(searchValue);
          case 'status':
            return proposal.status.toLowerCase().includes(searchValue);
          case 'amount':
            return proposal.amountRequested.toString().includes(searchValue);
          case 'trackingNo':
            return (proposal.trackingNo || '').toLowerCase().includes(searchValue);
          case 'all':
          default:
            return (
              proposal.activityName.toLowerCase().includes(searchValue) ||
              proposal.budgetCode.toLowerCase().includes(searchValue) ||
              getCampusDisplayName(proposal.campusId).toLowerCase().includes(searchValue) ||
              proposal.status.toLowerCase().includes(searchValue) ||
              proposal.amountRequested.toString().includes(searchValue) ||
              (proposal.trackingNo || '').toLowerCase().includes(searchValue) ||
              (proposal.projectName || '').toLowerCase().includes(searchValue)
            );
        }
      });
    }
    
    setFilteredProposals(filtered);
  }, [proposals, debouncedSearchTerm, filterColumn]);

  // Pagination
  const totalPages = Math.ceil(filteredProposals.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentProposals = filteredProposals.slice(startIndex, endIndex);

  

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDelete = async (proposalId: string) => {
    if (!user) return;
    
    try {
      await measureAsync('delete-proposal', async () => {
        await deleteBudgetTransaction(proposalId);
        // Remove from local state
        setProposals(prev => prev.filter(p => p.id !== proposalId));
        setFilteredProposals(prev => prev.filter(p => p.id !== proposalId));
        setDeleteConfirm(null);
      });
    } catch (err: any) {
      setError(err.message || 'Failed to delete proposal');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-50">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50">
      <Navbar user={user} onLogout={handleLogout} />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              My Proposals
            </h1>
            <p className="mt-2 text-gray-600">
              Manage and track your budget proposals
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Proposals List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-medium text-gray-900 mb-4 sm:mb-0">
                  Proposals ({filteredProposals.length} total)
                </h2>
                <div className="flex gap-3">
                  <Link
                    to="/proposals/import"
                    className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700"
                  >
                    Import CSV
                  </Link>
                  <Link
                    to="/proposals/create"
                    className="px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700"
                  >
                    Create New Proposal
                  </Link>
                </div>
              </div>
              
              {/* Search and Filter Controls */}
              <div className="mt-4 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search proposals..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {searchTerm !== debouncedSearchTerm && (
                    <div className="absolute right-3 top-2.5">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                    </div>
                  )}
                </div>
                <div className="sm:w-48">
                  <select
                    value={filterColumn}
                    onChange={(e) => setFilterColumn(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All Columns</option>
                    <option value="activity">Activity</option>
                    <option value="budgetCode">Budget Code</option>
                    <option value="campus">Campus</option>
                    <option value="status">Status</option>
                    <option value="amount">Amount</option>
                    <option value="trackingNo">Tracking No</option>
                  </select>
                </div>
              </div>
            </div>
            
            {currentProposals.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'No matching proposals found' : 'No proposals yet'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'Try adjusting your search or filters' : 'Create your first proposal to get started.'}
                </p>
                {!searchTerm && (
                  <Link
                    to="/proposals/create"
                    className="px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700"
                  >
                    Create Proposal
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200" style={{ minWidth: '1200px', tableLayout: 'fixed' }}>
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '120px' }}>
                          Date Received
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '140px' }}>
                          Budget Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '120px' }}>
                          Campus
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '280px' }}>
                          Activity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '120px' }}>
                          Amount Requested
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px' }}>
                          Beneficiaries
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px' }}>
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '120px' }}>
                          Tracking No
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentProposals.map((proposal) => (
                        <tr key={proposal.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '120px' }}>
                            <div className="truncate" title={new Date(proposal.dateReceived).toLocaleDateString()}>
                              {new Date(proposal.dateReceived).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '140px' }}>
                            <div className="truncate" title={proposal.budgetCode}>
                              {proposal.budgetCode}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '120px' }}>
                            <div className="truncate" title={getCampusDisplayName(proposal.campusId)}>
                              {getCampusDisplayName(proposal.campusId)}
                            </div>
                          </td>
                          <td className="px-6 py-4" style={{ width: '280px' }}>
                            <div>
                              <div className="text-sm font-medium text-gray-900 truncate" title={proposal.activityName}>
                                {proposal.activityName}
                              </div>
                              {proposal.projectName && (
                                <div className="text-sm text-gray-500 truncate" title={proposal.projectName}>
                                  {proposal.projectName}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '120px' }}>
                            <div className="truncate" title={formatCurrency(proposal.amountRequested)}>
                              {formatCurrency(proposal.amountRequested)}
                            </div>
                            {proposal.obligationAmount && (
                              <div className="text-gray-500 text-xs truncate" title={formatCurrency(proposal.obligationAmount)}>
                                Obligated: {formatCurrency(proposal.obligationAmount)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '100px' }}>
                            <div className="truncate" title={proposal.beneficiariesTotal.toString()}>
                              {proposal.beneficiariesTotal}
                            </div>
                            {(proposal.beneficiariesMale > 0 || proposal.beneficiariesFemale > 0) && (
                              <div className="text-gray-500 text-xs">
                                {proposal.beneficiariesMale}M / {proposal.beneficiariesFemale}F
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap" style={{ width: '100px' }}>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(proposal.status)}`}>
                              {proposal.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '120px' }}>
                            <div className="truncate" title={proposal.trackingNo || 'N/A'}>
                              {proposal.trackingNo || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ width: '100px' }}>
                            <div className="flex space-x-2">
                              <Link
                                to={`/proposals/${proposal.id}`}
                                className="text-primary-600 hover:text-primary-900"
                                title="View proposal"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </Link>
                              <button
                                onClick={() => setDeleteConfirm(proposal.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete proposal"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredProposals.length)} of {filteredProposals.length} results
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        
                        {/* Page numbers */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-1 text-sm border rounded-md ${
                                currentPage === pageNum
                                  ? 'bg-primary-600 text-white border-primary-600'
                                  : 'border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Proposal</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to delete this proposal? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProposalList;
