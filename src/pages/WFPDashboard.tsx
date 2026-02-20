import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { WFPActivity } from '../types/wfp';
import { getAllWFPActivities, getWFPSummary, deleteWFPActivity, updateWFPActivity } from '../lib/cachedFirestore';
import { useAuth } from '../contexts/AuthContext';
import { usePerformance } from '../lib/performance';
import Navbar from '../components/Navbar';

const WFPDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activities, setActivities] = useState<WFPActivity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<WFPActivity[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterColumn, setFilterColumn] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const rowsPerPage = 5;
  const [editingActivity, setEditingActivity] = useState<WFPActivity | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
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
    const loadData = async () => {
      try {
        const [activitiesData, summaryData] = await measureAsync('load-wfp-dashboard-data', async () => {
          const [activities, summary] = await Promise.all([
            getAllWFPActivities(1, 100), // Get first 100 for dashboard
            getWFPSummary(),
          ]);
          return [activities, summary];
        });
        
        setActivities(activitiesData);
        setFilteredActivities(activitiesData);
        setSummary(summaryData);
      } catch (err: any) {
        console.error('Error loading WFP data:', err);
        setError(err.message || 'Failed to load WFP data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [measureAsync]);

  // Filter activities based on search and column
  useEffect(() => {
    let filtered = activities;
    
    if (debouncedSearchTerm) {
      filtered = filtered.filter(activity => {
        const searchValue = debouncedSearchTerm.toLowerCase();
        
        switch (filterColumn) {
          case 'budgetCode':
            return activity.budgetCode.toLowerCase().includes(searchValue);
          case 'campus':
            return getCampusDisplayName(activity.campusId).toLowerCase().includes(searchValue);
          case 'program':
            return activity.programName.toLowerCase().includes(searchValue);
          case 'project':
            return activity.projectName.toLowerCase().includes(searchValue);
          case 'activity':
            return activity.activityName.toLowerCase().includes(searchValue);
          case 'status':
            return activity.status.toLowerCase().includes(searchValue);
          case 'all':
          default:
            return (
              activity.budgetCode.toLowerCase().includes(searchValue) ||
              getCampusDisplayName(activity.campusId).toLowerCase().includes(searchValue) ||
              activity.programName.toLowerCase().includes(searchValue) ||
              activity.projectName.toLowerCase().includes(searchValue) ||
              activity.activityName.toLowerCase().includes(searchValue) ||
              activity.status.toLowerCase().includes(searchValue) ||
              activity.beneficiaries.toString().includes(searchValue) ||
              activity.allocation.toString().includes(searchValue)
            );
        }
      });
    }
    
    setFilteredActivities(filtered);
  }, [activities, debouncedSearchTerm, filterColumn]);

  // Pagination
  const totalPages = Math.ceil(filteredActivities.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentActivities = filteredActivities.slice(startIndex, endIndex);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'ongoing': return 'bg-blue-100 text-blue-800';
      case 'planned': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCampusDisplayName = (campusId: string) => {
    const campusMap: { [key: string]: string } = {
      'pb': 'Pablo Borbon',
      'lemery': 'Lemery',
      'rosario': 'Rosario',
      'san-juan': 'San Juan',
    };
    return campusMap[campusId] || campusId;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleEdit = (activity: WFPActivity) => {
    setEditingActivity(activity);
    setShowEditModal(true);
  };

  const handleDelete = async (activityId: string) => {
    if (!user) return;
    
    try {
      await measureAsync('delete-wfp-activity', async () => {
        await deleteWFPActivity(activityId);
        // Remove from local state
        setActivities(prev => prev.filter(a => a.id !== activityId));
        setFilteredActivities(prev => prev.filter(a => a.id !== activityId));
        setDeleteConfirm(null);
        
        // Reload summary
        const summaryData = await getWFPSummary(true); // Force refresh
        setSummary(summaryData);
      });
    } catch (err: any) {
      setError(err.message || 'Failed to delete activity');
    }
  };

  const handleUpdateActivity = async (updatedData: Partial<WFPActivity>) => {
    if (!editingActivity || !user) return;
    
    try {
      await measureAsync('update-wfp-activity', async () => {
        await updateWFPActivity(editingActivity.id, updatedData);
        
        // Update local state
        setActivities(prev => prev.map(a => 
          a.id === editingActivity.id ? { ...a, ...updatedData } : a
        ));
        setFilteredActivities(prev => prev.map(a => 
          a.id === editingActivity.id ? { ...a, ...updatedData } : a
        ));
        
        setShowEditModal(false);
        setEditingActivity(null);
        
        // Reload summary
        const summaryData = await getWFPSummary(true); // Force refresh
        setSummary(summaryData);
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update activity');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-50">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading WFP Dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50">
      <Navbar user={user} onLogout={handleLogout} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary-800">WFP Activities Dashboard</h1>
          <Link
            to="/wfp/create"
            className="px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700"
          >
            Create Activity
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100-4h-.5a1 1 0 000-2H8a2 2 0 012-2h2a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Activities</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalActivities}</p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Allocation</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalAllocation)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Beneficiaries</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalBeneficiaries.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.completed}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Breakdown */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Planned</h3>
              <p className="text-xl font-bold text-yellow-600">{summary.planned}</p>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Ongoing</h3>
              <p className="text-xl font-bold text-blue-600">{summary.ongoing}</p>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Completed</h3>
              <p className="text-xl font-bold text-green-600">{summary.completed}</p>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Cancelled</h3>
              <p className="text-xl font-bold text-red-600">{summary.cancelled}</p>
            </div>
          </div>
        )}

        {/* Activities List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-medium text-gray-900 mb-4 sm:mb-0">
                WFP Activities ({filteredActivities.length} total)
              </h2>
              <div className="flex gap-3">
                <Link
                  to="/wfp/import"
                  className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700"
                >
                  Import WFP Data
                </Link>
                <Link
                  to="/wfp/create"
                  className="px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700"
                >
                  Create Activity
                </Link>
              </div>
            </div>
            
            {/* Search and Filter Controls */}
            <div className="mt-4 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search activities..."
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
                  <option value="budgetCode">Budget Code</option>
                  <option value="campus">Campus</option>
                  <option value="program">Program</option>
                  <option value="project">Project</option>
                  <option value="activity">Activity</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200" style={{ minWidth: '1000px', tableLayout: 'fixed' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '140px' }}>
                    Budget Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '120px' }}>
                    Campus
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '280px' }}>
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px' }}>
                    Beneficiaries
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '140px' }}>
                    Allocation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px' }}>
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '120px' }}>
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentActivities.map((activity) => (
                  <tr key={activity.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '140px' }}>
                      <div className="truncate" title={activity.budgetCode}>
                        {activity.budgetCode}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '120px' }}>
                      <div className="truncate" title={getCampusDisplayName(activity.campusId)}>
                        {getCampusDisplayName(activity.campusId)}
                      </div>
                    </td>
                    <td className="px-6 py-4" style={{ width: '280px' }}>
                      <div>
                        <div className="text-sm font-medium text-gray-900 truncate" title={activity.activityName}>
                          {activity.activityName}
                        </div>
                        <div className="text-sm text-gray-500 truncate" title={activity.projectName}>
                          {activity.projectName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '100px' }}>
                      {activity.beneficiaries}
                      {activity.actualBeneficiaries && (
                        <span className="text-gray-500"> / {activity.actualBeneficiaries}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '140px' }}>
                      {formatCurrency(activity.allocation)}
                      {activity.actualExpenditure && (
                        <div className="text-gray-500">{formatCurrency(activity.actualExpenditure)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" style={{ width: '100px' }}>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(activity.status)}`}>
                        {activity.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" style={{ width: '120px' }}>
                      {activity.lastUpdated instanceof Date 
                        ? activity.lastUpdated.toLocaleDateString()
                        : new Date(activity.lastUpdated).toLocaleDateString()
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ width: '100px' }}>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(activity)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Edit activity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(activity.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete activity"
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
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredActivities.length)} of {filteredActivities.length} results
                </div>
                <div className="flex gap-2">
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
          
          {filteredActivities.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {debouncedSearchTerm ? 'No activities found matching your search.' : 'No WFP activities found.'}
              </p>
              {!debouncedSearchTerm && (
                <Link
                  to="/wfp/create"
                  className="mt-4 inline-block text-primary-600 hover:text-primary-500"
                >
                  Create your first activity
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this WFP activity? This action cannot be undone.
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
      
      {/* Edit Modal */}
      {showEditModal && editingActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit WFP Activity</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget Code</label>
                <input
                  type="text"
                  value={editingActivity.budgetCode}
                  onChange={(e) => setEditingActivity({...editingActivity, budgetCode: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Activity Name</label>
                <input
                  type="text"
                  value={editingActivity.activityName}
                  onChange={(e) => setEditingActivity({...editingActivity, activityName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={editingActivity.projectName}
                  onChange={(e) => setEditingActivity({...editingActivity, projectName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiaries</label>
                  <input
                    type="number"
                    value={editingActivity.beneficiaries}
                    onChange={(e) => setEditingActivity({...editingActivity, beneficiaries: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allocation</label>
                  <input
                    type="number"
                    value={editingActivity.allocation}
                    onChange={(e) => setEditingActivity({...editingActivity, allocation: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editingActivity.status}
                  onChange={(e) => setEditingActivity({...editingActivity, status: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="planned">Planned</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingActivity(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateActivity(editingActivity)}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WFPDashboard;
