import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useExtensionBudget } from '../contexts/ExtensionBudgetContext';
import Navbar from '../components/Navbar';
import { getBudgetTransactionsByUser, createBudgetTransaction, updateBudgetTransaction } from '../lib/budgetFirestore';
import { createFundCategory, getFundCategories, initializeDefaultMasterData, type FundCategory } from '../lib/masterDataFirestore';
import { formatCurrency, getStatusColor, getWorkflowStageConfig } from '../lib/utils';
import { WORKFLOW_STAGES } from '../lib/constants';
import type { BudgetTransaction, BudgetTransactionStatus, WorkflowStage } from '../types/budget';

const STAGE_CONFIG = WORKFLOW_STAGES;

const MonitoringDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { allocation: extensionBudget } = useExtensionBudget();
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fundCategories, setFundCategories] = useState<FundCategory[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [activeStage, setActiveStage] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<BudgetTransaction | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    budgetCode: '',
    activityName: '',
    programName: '',
    projectName: '',
    campusId: 'pb',
    collegeId: undefined as string | undefined,
    amountRequested: 0,
    status: 'Draft' as BudgetTransactionStatus,
    stage: 'proposal' as WorkflowStage,
    beneficiariesMale: 0,
    beneficiariesFemale: 0,
    beneficiariesTotal: 0,
    hasGenderBreakdown: false,
    remarks: '',
    fundCategory: '' as string,
  });

  const handleLogout = () => {
    const shouldLogout = window.confirm('Are you sure you want to log out?');
    if (!shouldLogout) return;
    logout();
  };

  const refreshCategories = async (userId: string) => {
    // Ensure default categories exist (including LEX/STEP)
    await initializeDefaultMasterData(userId);
    const categories = await getFundCategories();
    setFundCategories(categories);
    return categories;
  };

  const handleAddCategory = async () => {
    if (!user) return;
    const name = newCategoryName.trim();
    if (!name) {
      alert('Please enter a category name');
      return;
    }

    try {
      setSaving(true);
      const code = name.toUpperCase().replace(/\s+/g, '-').slice(0, 12);

      await createFundCategory({
        name,
        code,
        description: '',
        isActive: true,
        createdBy: user.uid,
      });

      const categories = await refreshCategories(user.uid);
      // Select newly created category if present
      const created = categories.find(c => c.name === name);
      setFormData(prev => ({ ...prev, fundCategory: created?.name || name }));
      setNewCategoryName('');
      setShowAddCategory(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add category');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEntry = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      const newTransaction: Partial<BudgetTransaction> = {
        ...formData,
        dateReceived: new Date(),
        createdBy: user.uid,
        attachments: [],
        trackingNo: '',
        implementationDate: '',
        motherProposalId: '',
        isConsolidatedPR: false,
        otherFunding: '',
        isSupplemental: false,
        fundCategory: formData.fundCategory || 'Extension',
        fundingSource: 'University Fund',
      };
      
      await createBudgetTransaction(newTransaction as any);
      
      // Reload data
      const data = await getBudgetTransactionsByUser(user.uid);
      setTransactions(data);
      
      // Reset form and close modal
      setFormData({
        budgetCode: '',
        activityName: '',
        programName: '',
        projectName: '',
        campusId: 'pb',
        collegeId: undefined,
        amountRequested: 0,
        status: 'Draft',
        stage: 'proposal',
        beneficiariesMale: 0,
        beneficiariesFemale: 0,
        beneficiariesTotal: 0,
        hasGenderBreakdown: false,
        remarks: '',
        fundCategory: fundCategories[0]?.name || '',
      });
      setShowAddModal(false);
      
    } catch (err: any) {
      setError(err.message || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const handleEditEntry = (transaction: BudgetTransaction) => {
    setEditingTransaction(transaction);
    setFormData({
      budgetCode: transaction.budgetCode || '',
      activityName: transaction.activityName || '',
      programName: transaction.programName || '',
      projectName: transaction.projectName || '',
      campusId: transaction.campusId || 'pb',
      collegeId: transaction.collegeId || undefined,
      amountRequested: transaction.amountRequested || 0,
      status: transaction.status || 'Draft',
      stage: (transaction as any).stage || 'proposal',
      beneficiariesMale: transaction.beneficiariesMale || 0,
      beneficiariesFemale: transaction.beneficiariesFemale || 0,
      beneficiariesTotal: transaction.beneficiariesTotal || 0,
      hasGenderBreakdown: (transaction.beneficiariesMale || 0) > 0 || (transaction.beneficiariesFemale || 0) > 0,
      remarks: transaction.remarks || '',
      fundCategory: transaction.fundCategory || fundCategories[0]?.name || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateEntry = async () => {
    if (!user || !editingTransaction) return;
    
    try {
      setSaving(true);
      
      // Filter out undefined values to prevent Firestore errors
      const filteredData: any = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined) {
          filteredData[key] = value;
        }
      });
      filteredData.id = editingTransaction.id;
      
      await updateBudgetTransaction(editingTransaction.id, filteredData);
      
      // Reload data
      const data = await getBudgetTransactionsByUser(user.uid);
      setTransactions(data);
      
      // Reset form and close modal
      setFormData({
        budgetCode: '',
        activityName: '',
        programName: '',
        projectName: '',
        campusId: 'pb',
        collegeId: undefined,
        amountRequested: 0,
        status: 'Draft',
        stage: 'proposal',
        beneficiariesMale: 0,
        beneficiariesFemale: 0,
        beneficiariesTotal: 0,
        hasGenderBreakdown: false,
        remarks: '',
        fundCategory: fundCategories[0]?.name || '',
      });
      setEditingTransaction(null);
      setShowEditModal(false);
      
    } catch (err: any) {
      setError(err.message || 'Failed to update entry');
    } finally {
      setSaving(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const [data, categories] = await Promise.all([
          getBudgetTransactionsByUser(user.uid),
          refreshCategories(user.uid)
        ]);
        setTransactions(data);
        if (categories.length > 0) {
          setFormData(prev => ({ ...prev, fundCategory: categories[0].name }));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  // Compute stage counts
  const stageCounts = transactions.reduce((acc, t) => {
    const stage = (t as any).stage || 'proposal';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Compute financial summaries
  const financialSummary = transactions.reduce(
    (acc, t) => {
      acc.totalRequested += t.amountRequested || 0;
      acc.totalObligated += t.obligationAmount || 0;
      acc.totalDisbursed += t.dvAmount || 0;
      acc.totalApproved += (t as any).approvedAmount || 0;
      return acc;
    },
    { totalRequested: 0, totalObligated: 0, totalDisbursed: 0, totalApproved: 0 }
  );

  // Filter transactions
  const filtered = transactions.filter((t) => {
    const stage = (t as any).stage || 'proposal';
    if (activeStage !== 'all' && stage !== activeStage) return false;
    if (!debouncedSearch) return true;
    const search = debouncedSearch.toLowerCase();
    return (
      (t.budgetCode || '').toLowerCase().includes(search) ||
      (t.programName || '').toLowerCase().includes(search) ||
      (t.projectName || '').toLowerCase().includes(search) ||
      (t.activityName || '').toLowerCase().includes(search) ||
      (t.campusId || '').toLowerCase().includes(search) ||
      (t.status || '').toLowerCase().includes(search) ||
      (t.trackingNo || '').toLowerCase().includes(search) ||
      (t.supplierPayee || '').toLowerCase().includes(search)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const currentRows = filtered.slice(startIdx, startIdx + rowsPerPage);


  const getStageBadge = (stage: string) => {
    const cfg = getWorkflowStageConfig(stage);
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bgColor} ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-50">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50">
      <Navbar user={user} onLogout={handleLogout} />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Monitoring Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Complete budget lifecycle tracking</p>
            </div>
            <div className="flex gap-3 mt-3 sm:mt-0">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
              >
                Add Entry
              </button>
              <Link
                to="/monitoring/import"
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700"
              >
                Import Data
              </Link>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>
          )}

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-5 border-l-4 border-blue-500">
              <p className="text-sm text-gray-500">Total Requested</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(financialSummary.totalRequested)}</p>
              <p className="text-xs text-gray-400 mt-1">{transactions.length} transactions</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5 border-l-4 border-purple-500">
              <p className="text-sm text-gray-500">Extension Budget</p>
              <p className="text-xl font-bold text-gray-900">{extensionBudget ? formatCurrency(extensionBudget.totalBudget) : formatCurrency(0)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5 border-l-4 border-orange-500">
              <p className="text-sm text-gray-500">Total Obligated</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(financialSummary.totalObligated)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5 border-l-4 border-green-500">
              <p className="text-sm text-gray-500">Total Disbursed</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(financialSummary.totalDisbursed)}</p>
            </div>
          </div>

          {/* Workflow Stage Filter */}
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setActiveStage('all'); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeStage === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Stages ({transactions.length})
              </button>
              {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => { setActiveStage(key); setCurrentPage(1); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeStage === key
                      ? `${cfg.bgColor} ${cfg.color} ring-2 ring-offset-1`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cfg.label} ({stageCounts[key] || 0})
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Search by budget code, activity, campus, supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
                <span className="text-sm text-gray-500 self-center">
                  {filtered.length} results
                </span>
              </div>
            </div>

            {/* Table */}
            {currentRows.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {debouncedSearch ? 'No matching records' : 'No monitoring data yet'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {debouncedSearch ? 'Try adjusting your search' : 'Import data to get started.'}
                </p>
                {!debouncedSearch && (
                  <Link to="/monitoring/import" className="text-primary-600 hover:text-primary-800 font-medium">
                    Import Data &rarr;
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beneficiaries</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentRows.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{getStageBadge((t as any).stage || 'proposal')}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-900">{t.budgetCode || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="max-w-[200px] truncate" title={t.activityName}>
                            {t.activityName || t.projectName || '-'}
                          </div>
                          {t.programName && (
                            <div className="text-xs text-gray-400 truncate">{t.programName}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{t.campusId || '-'}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(t.amountRequested)}</td>
                        <td className="px-4 py-3 text-sm">
                          {(['supplemental', 'bur1', 'bur2'].includes((t as any).stage)) ? (
                            <span className="text-gray-400">-</span>
                          ) : (
                            <div className="text-sm">
                              <div>{t.beneficiariesTotal || 0} total</div>
                              {(t.beneficiariesMale || 0) > 0 && (t.beneficiariesFemale || 0) > 0 && (
                                <div className="text-xs text-gray-500">
                                  {t.beneficiariesMale}M / {t.beneficiariesFemale}F
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(t.status)}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{t.trackingNo || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleEditEntry(t)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {startIdx + 1}-{Math.min(startIdx + rowsPerPage, filtered.length)} of {filtered.length}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 border rounded text-sm ${
                          currentPage === page ? 'bg-primary-600 text-white border-primary-600' : 'hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add New Entry</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Code</label>
                  <input
                    type="text"
                    value={formData.budgetCode}
                    onChange={(e) => setFormData({...formData, budgetCode: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., PB-EXT-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Activity Name *</label>
                  <input
                    type="text"
                    value={formData.activityName}
                    onChange={(e) => setFormData({...formData, activityName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter activity name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Program Name</label>
                  <input
                    type="text"
                    value={formData.programName}
                    onChange={(e) => setFormData({...formData, programName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter program name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.fundCategory}
                      onChange={(e) => setFormData({ ...formData, fundCategory: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" disabled>Select a category</option>
                      {fundCategories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddCategory(true)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                    >
                      + Add
                    </button>
                  </div>
                  {showAddCategory && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="New category name (e.g., LEX, STEP)"
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        disabled={saving}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAddCategory(false); setNewCategoryName(''); }}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Stage</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({...formData, stage: e.target.value as WorkflowStage})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="wfp">WFP Activities</option>
                    <option value="proposal">Proposal Logs</option>
                    <option value="monitoring">Monitoring (ORS)</option>
                    <option value="supplemental">Supplemental</option>
                    <option value="bur1">BUR1 - Proposal Fund</option>
                    <option value="bur2">BUR2 - ALOBS (Allocated Budgets)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as BudgetTransactionStatus})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Evaluation">Evaluation</option>
                    <option value="Proposal">Proposal</option>
                    <option value="PR">PR</option>
                    <option value="Obligated">Obligated</option>
                    <option value="Disbursed">Disbursed</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Returned">Returned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Requested (PHP)</label>
                  <input
                    type="number"
                    value={formData.amountRequested || ''}
                    onChange={(e) => setFormData({...formData, amountRequested: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                {!['monitoring', 'supplemental', 'bur1', 'bur2'].includes(formData.stage) && (
                  <>
                    <div className="md:col-span-2">
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                        <input
                          type="checkbox"
                          checked={formData.hasGenderBreakdown}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              hasGenderBreakdown: e.target.checked,
                              beneficiariesMale: e.target.checked ? formData.beneficiariesMale : 0,
                              beneficiariesFemale: e.target.checked ? formData.beneficiariesFemale : 0,
                              beneficiariesTotal: !e.target.checked ? formData.beneficiariesTotal : (formData.beneficiariesMale + formData.beneficiariesFemale)
                            });
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Specify male/female breakdown</span>
                      </label>
                    </div>

                    {formData.hasGenderBreakdown ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Male Beneficiaries</label>
                          <input
                            type="number"
                            value={formData.beneficiariesMale || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              beneficiariesMale: parseInt(e.target.value) || 0,
                              beneficiariesTotal: (parseInt(e.target.value) || 0) + formData.beneficiariesFemale
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                            min="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Female Beneficiaries</label>
                          <input
                            type="number"
                            value={formData.beneficiariesFemale || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              beneficiariesFemale: parseInt(e.target.value) || 0,
                              beneficiariesTotal: formData.beneficiariesMale + (parseInt(e.target.value) || 0)
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                            min="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Total Beneficiaries (Auto-calculated)</label>
                          <input
                            type="number"
                            value={formData.beneficiariesTotal || ''}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                            placeholder="0"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Beneficiaries</label>
                        <input
                          type="number"
                          value={formData.beneficiariesTotal || ''}
                          onChange={(e) => setFormData({...formData, beneficiariesTotal: parseInt(e.target.value) || 0})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter total number of beneficiaries"
                          min="0"
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Enter any additional notes or remarks"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEntry}
                  disabled={saving || !formData.activityName}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Edit Entry</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingTransaction(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Code</label>
                  <input
                    type="text"
                    value={formData.budgetCode}
                    onChange={(e) => setFormData({...formData, budgetCode: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., PB-EXT-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Activity Name *</label>
                  <input
                    type="text"
                    value={formData.activityName}
                    onChange={(e) => setFormData({...formData, activityName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter activity name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Program Name</label>
                  <input
                    type="text"
                    value={formData.programName}
                    onChange={(e) => setFormData({...formData, programName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter program name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.fundCategory}
                    onChange={(e) => setFormData({ ...formData, fundCategory: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" disabled>Select a category</option>
                    {fundCategories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Stage</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({...formData, stage: e.target.value as WorkflowStage})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="wfp">WFP Activities</option>
                    <option value="proposal">Proposal Logs</option>
                    <option value="monitoring">Monitoring (ORS)</option>
                    <option value="supplemental">Supplemental</option>
                    <option value="bur1">BUR1 - Proposal Fund</option>
                    <option value="bur2">BUR2 - ALOBS (Allocated Budgets)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as BudgetTransactionStatus})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Evaluation">Evaluation</option>
                    <option value="Proposal">Proposal</option>
                    <option value="PR">PR</option>
                    <option value="Obligated">Obligated</option>
                    <option value="Disbursed">Disbursed</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Returned">Returned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Requested (PHP)</label>
                  <input
                    type="number"
                    value={formData.amountRequested || ''}
                    onChange={(e) => setFormData({...formData, amountRequested: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                {!['monitoring', 'supplemental', 'bur1', 'bur2'].includes(formData.stage) && (
                  <>
                    <div className="md:col-span-2">
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                        <input
                          type="checkbox"
                          checked={formData.hasGenderBreakdown}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              hasGenderBreakdown: e.target.checked,
                              beneficiariesMale: e.target.checked ? formData.beneficiariesMale : 0,
                              beneficiariesFemale: e.target.checked ? formData.beneficiariesFemale : 0,
                              beneficiariesTotal: !e.target.checked ? formData.beneficiariesTotal : (formData.beneficiariesMale + formData.beneficiariesFemale)
                            });
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Specify male/female breakdown</span>
                      </label>
                    </div>

                    {formData.hasGenderBreakdown ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Male Beneficiaries</label>
                          <input
                            type="number"
                            value={formData.beneficiariesMale || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              beneficiariesMale: parseInt(e.target.value) || 0,
                              beneficiariesTotal: (parseInt(e.target.value) || 0) + formData.beneficiariesFemale
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                            min="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Female Beneficiaries</label>
                          <input
                            type="number"
                            value={formData.beneficiariesFemale || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              beneficiariesFemale: parseInt(e.target.value) || 0,
                              beneficiariesTotal: formData.beneficiariesMale + (parseInt(e.target.value) || 0)
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                            min="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Total Beneficiaries (Auto-calculated)</label>
                          <input
                            type="number"
                            value={formData.beneficiariesTotal || ''}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                            placeholder="0"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Beneficiaries</label>
                        <input
                          type="number"
                          value={formData.beneficiariesTotal || ''}
                          onChange={(e) => setFormData({...formData, beneficiariesTotal: parseInt(e.target.value) || 0})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter total number of beneficiaries"
                          min="0"
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Enter any additional notes or remarks"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingTransaction(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateEntry}
                  disabled={saving || !formData.activityName}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Update Entry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default MonitoringDashboard;
