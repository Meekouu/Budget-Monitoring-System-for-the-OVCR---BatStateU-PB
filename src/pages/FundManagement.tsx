import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useExtensionBudget } from '../contexts/ExtensionBudgetContext';
import Navbar from '../components/Navbar';
import { getBudgetTransactionsByUser, getCampuses, createCampus } from '../lib/budgetFirestore';
import { formatCurrency, getCampusDisplayName } from '../lib/utils';
import { CAMPUS_DISPLAY_NAMES, EXTENSION_BUDGET_CATEGORIES } from '../lib/constants';
import type { BudgetTransaction } from '../types/budget';

interface FundSummary {
  campusId: string;
  campusName: string;
  totalAllocated: number;
  totalObligated: number;
  totalDisbursed: number;
  remaining: number;
  utilizationRate: number;
  transactionCount: number;
}

interface FundAdjustment {
  id: string;
  campusId: string;
  fromCategory: string;
  toCategory: string;
  amount: number;
  reason: string;
  date: Date;
  adjustedBy: string;
}

const FundManagement: React.FC = () => {
  const { user, logout } = useAuth();
  const { allocation: extensionBudget, loading: budgetLoading, updateAllocation, refreshAllocation } = useExtensionBudget();
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'underutilized' | 'adjustments' | 'extension'>('overview');
  const [adjustments, setAdjustments] = useState<FundAdjustment[]>([]);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showAddCampusModal, setShowAddCampusModal] = useState(false);
  const [dynamicCampuses, setDynamicCampuses] = useState<Record<string, string>>({ ...CAMPUS_DISPLAY_NAMES });
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [editingAllocations, setEditingAllocations] = useState<Record<string, number>>({});
  const [adjustForm, setAdjustForm] = useState({
    campusId: 'pb',
    fromCategory: '',
    toCategory: '',
    amount: '',
    reason: '',
  });
  const [newCampusForm, setNewCampusForm] = useState({
    id: '',
    name: '',
  });

  const handleLogout = () => {
    const shouldLogout = window.confirm('Are you sure you want to log out?');
    if (!shouldLogout) return;
    logout();
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const [transactionsData, campusesData] = await Promise.all([
          getBudgetTransactionsByUser(user.uid),
          getCampuses()
        ]);
        setTransactions(transactionsData);
        
        // Update dynamic campuses with database entries
        const dbCampuses: Record<string, string> = {};

        const looksLikeFirestoreAutoId = (id: string) => {
          // Firestore auto IDs are typically 20 chars of [A-Za-z0-9]
          if (!id) return false;
          if (id.includes('-')) return false;
          return /^[A-Za-z0-9]{20,}$/.test(id);
        };

        campusesData.forEach(campus => {
          if (looksLikeFirestoreAutoId(campus.id)) return;
          dbCampuses[campus.id] = campus.name;
        });
        setDynamicCampuses({ ...CAMPUS_DISPLAY_NAMES, ...dbCampuses });
      } catch (err: any) {
        setError(err.message || 'Failed to load fund data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const campusIdSet = new Set<string>([
    ...Object.keys(dynamicCampuses),
    ...transactions.map(t => t.campusId).filter((id): id is string => Boolean(id)),
  ]);

  const campusIds = Array.from(campusIdSet);

  const getCampusName = (campusId: string) => {
    return dynamicCampuses[campusId] || getCampusDisplayName(campusId);
  };

  // Compute fund summaries by campus
  const fundSummaries: FundSummary[] = campusIds.map(campusId => {
    const campusTransactions = transactions.filter(t => t.campusId === campusId);
    const totalAllocated = campusTransactions.reduce((sum, t) => sum + (t.amountRequested || 0), 0);
    const totalObligated = campusTransactions.reduce((sum, t) => sum + (t.obligationAmount || 0), 0);
    const totalDisbursed = campusTransactions.reduce((sum, t) => sum + (t.dvAmount || 0), 0);
    const remaining = totalAllocated - totalObligated;
    const utilizationRate = totalAllocated > 0 ? (totalObligated / totalAllocated) * 100 : 0;

    return {
      campusId,
      campusName: getCampusName(campusId),
      totalAllocated,
      totalObligated,
      totalDisbursed,
      remaining,
      utilizationRate,
      transactionCount: campusTransactions.length,
    };
  });

  // Compute fund summaries by category
  const categorySummaries = transactions.reduce((acc, t) => {
    const cat = t.fundCategory || 'Uncategorized';
    if (!acc[cat]) {
      acc[cat] = { allocated: 0, obligated: 0, disbursed: 0, remaining: 0, count: 0 };
    }
    acc[cat].allocated += t.amountRequested || 0;
    acc[cat].obligated += t.obligationAmount || 0;
    acc[cat].disbursed += t.dvAmount || 0;
    acc[cat].remaining += (t.amountRequested || 0) - (t.obligationAmount || 0);
    acc[cat].count += 1;
    return acc;
  }, {} as Record<string, { allocated: number; obligated: number; disbursed: number; remaining: number; count: number }>);

  // Identify underutilized funds (utilization < 50% with remaining > 0)
  const underutilizedFunds = transactions
    .filter(t => {
      const allocated = t.amountRequested || 0;
      const obligated = t.obligationAmount || 0;
      if (allocated === 0) return false;
      const utilization = (obligated / allocated) * 100;
      return utilization < 50 && (allocated - obligated) > 0;
    })
    .sort((a, b) => {
      const remainingA = (a.amountRequested || 0) - (a.obligationAmount || 0);
      const remainingB = (b.amountRequested || 0) - (b.obligationAmount || 0);
      return remainingB - remainingA;
    });

  // Totals
  const extensionBudgetTotal = extensionBudget?.totalBudget || 0;
  const totalAllocated = fundSummaries.reduce((sum, f) => sum + f.totalAllocated, 0);
  const totalObligated = fundSummaries.reduce((sum, f) => sum + f.totalObligated, 0);
  const totalDisbursed = fundSummaries.reduce((sum, f) => sum + f.totalDisbursed, 0);
  const totalRemaining = extensionBudgetTotal - totalAllocated;
  const bur1Utilization = extensionBudgetTotal > 0 ? (totalAllocated / extensionBudgetTotal) * 100 : 0;
  const bur2Utilization = extensionBudgetTotal > 0 ? (totalObligated / extensionBudgetTotal) * 100 : 0;

  const handleAdjustSubmit = () => {
    if (!adjustForm.fromCategory || !adjustForm.toCategory || !adjustForm.amount || !adjustForm.reason) {
      alert('Please fill in all fields');
      return;
    }
    if (adjustForm.fromCategory === adjustForm.toCategory) {
      alert('Source and destination categories must be different');
      return;
    }

    const newAdjustment: FundAdjustment = {
      id: `ADJ-${Date.now()}`,
      campusId: adjustForm.campusId,
      fromCategory: adjustForm.fromCategory,
      toCategory: adjustForm.toCategory,
      amount: parseFloat(adjustForm.amount),
      reason: adjustForm.reason,
      date: new Date(),
      adjustedBy: user?.displayName || 'Unknown',
    };

    setAdjustments(prev => [newAdjustment, ...prev]);
    setShowAdjustModal(false);
    setAdjustForm({ campusId: 'pb', fromCategory: '', toCategory: '', amount: '', reason: '' });
  };

  const handleAddCampus = async () => {
    if (!newCampusForm.id || !newCampusForm.name) {
      alert('Please fill in all fields');
      return;
    }

    // Check if campus ID already exists
    if (dynamicCampuses[newCampusForm.id]) {
      alert('Campus ID already exists');
      return;
    }

    try {
      // Add to database
      await createCampus(newCampusForm.id, { name: newCampusForm.name });
      
      // Update local state
      setDynamicCampuses(prev => ({ ...prev, [newCampusForm.id]: newCampusForm.name }));
      
      // Reset form and close modal
      setNewCampusForm({ id: '', name: '' });
      setShowAddCampusModal(false);
      
      alert('Campus added successfully!');
    } catch (error: any) {
      alert('Failed to add campus: ' + error.message);
    }
  };

  const handleEditBudget = () => {
    if (extensionBudget) {
      setEditingAllocations({ ...extensionBudget.allocations });
      setIsEditingBudget(true);
    }
  };

  const handleSaveBudget = async () => {
    try {
      await updateAllocation(editingAllocations);
      setIsEditingBudget(false);
      await refreshAllocation();
      alert('Budget allocations saved successfully!');
    } catch (error: any) {
      alert('Failed to save budget allocations: ' + error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingAllocations({});
    setIsEditingBudget(false);
  };

  const handleAllocationChange = (category: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditingAllocations(prev => ({ ...prev, [category]: numValue }));
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 bg-green-50';
    if (rate >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getUtilizationBarColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-50">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading fund data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50">
      <Navbar user={user} onLogout={handleLogout} />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fund Management</h1>
            <p className="text-gray-600 mt-1">Monitor and manage fund allocations across campuses</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddCampusModal(true)}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Campus
            </button>
            <button
              onClick={() => setShowAdjustModal(true)}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Adjust Funds
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-purple-500">
            <p className="text-xs font-medium text-gray-500 uppercase">Extension Budget</p>
            <p className="text-xl font-bold text-purple-600 mt-1">{formatCurrency(extensionBudgetTotal)}</p>
            <p className="text-xs text-gray-400 mt-1">Total allocation</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-blue-500">
            <p className="text-xs font-medium text-gray-500 uppercase">Total Requested</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(totalAllocated)}</p>
            <p className="text-xs text-gray-400 mt-1">{transactions.length} transactions</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-orange-500">
            <p className="text-xs font-medium text-gray-500 uppercase">Total Obligated</p>
            <p className="text-xl font-bold text-orange-600 mt-1">{formatCurrency(totalObligated)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-green-500">
            <p className="text-xs font-medium text-gray-500 uppercase">Total Disbursed</p>
            <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(totalDisbursed)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-cyan-500">
            <p className="text-xs font-medium text-gray-500 uppercase">Remaining Budget</p>
            <p className="text-xl font-bold text-cyan-600 mt-1">{formatCurrency(totalRemaining)}</p>
            <p className="text-xs text-gray-400 mt-1">Budget - Requested</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5 border-l-4 border-red-500 mt-4 mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Utilization</p>
              <p className="text-sm text-gray-600 mt-1">BUR1 (Requested) and BUR2 (Obligated/ALOBS) vs Extension Budget</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">BUR1 (Requested)</p>
                <p className={`text-sm font-bold ${bur1Utilization >= 80 ? 'text-green-600' : bur1Utilization >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {bur1Utilization.toFixed(2)}%
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${getUtilizationBarColor(bur1Utilization)}`}
                  style={{ width: `${Math.min(bur1Utilization, 100)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">BUR2 (Obligated/ALOBS)</p>
                <p className={`text-sm font-bold ${bur2Utilization >= 80 ? 'text-green-600' : bur2Utilization >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {bur2Utilization.toFixed(2)}%
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${getUtilizationBarColor(bur2Utilization)}`}
                  style={{ width: `${Math.min(bur2Utilization, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'overview'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Fund Overview
              </button>
              <button
                onClick={() => setActiveTab('underutilized')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'underutilized'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Underutilized Funds
                {underutilizedFunds.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">
                    {underutilizedFunds.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('adjustments')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'adjustments'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Fund Adjustments
                {adjustments.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                    {adjustments.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('extension')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'extension'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Extension Budget
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Fund Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                {/* By Campus */}
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Fund Allocation by Campus</h3>
                <div className="overflow-x-auto mb-8">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campus</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Allocated</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Obligated</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Disbursed</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Utilization</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Items</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {fundSummaries.map(summary => (
                        <tr key={summary.campusId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{summary.campusName}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(summary.totalAllocated)}</td>
                          <td className="px-4 py-3 text-sm text-right text-orange-600">{formatCurrency(summary.totalObligated)}</td>
                          <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(summary.totalDisbursed)}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">{formatCurrency(summary.remaining)}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${getUtilizationBarColor(summary.utilizationRate)}`}
                                  style={{ width: `${Math.min(summary.utilizationRate, 100)}%` }}
                                ></div>
                              </div>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getUtilizationColor(summary.utilizationRate)}`}>
                                {summary.utilizationRate.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-500">{summary.transactionCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* By Category */}
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Fund Allocation by Category</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(categorySummaries).map(([category, data]) => {
                    const utilization = data.allocated > 0 ? (data.obligated / data.allocated) * 100 : 0;
                    return (
                      <div key={category} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-medium text-gray-900">{category}</h4>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getUtilizationColor(utilization)}`}>
                            {utilization.toFixed(0)}% used
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Allocated:</span>
                            <span className="font-medium">{formatCurrency(data.allocated)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Obligated:</span>
                            <span className="text-orange-600">{formatCurrency(data.obligated)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Remaining:</span>
                            <span className="font-medium text-blue-600">{formatCurrency(data.remaining)}</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                          <div
                            className={`h-2 rounded-full ${getUtilizationBarColor(utilization)}`}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{data.count} transaction{data.count !== 1 ? 's' : ''}</p>
                      </div>
                    );
                  })}
                  {Object.keys(categorySummaries).length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      No fund categories found. Import data to see fund breakdowns.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Underutilized Funds Tab */}
            {activeTab === 'underutilized' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Underutilized Funds</h3>
                    <p className="text-sm text-gray-500">Transactions with less than 50% utilization rate — candidates for reallocation</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {underutilizedFunds.length} item{underutilizedFunds.length !== 1 ? 's' : ''} found
                  </div>
                </div>

                {underutilizedFunds.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-lg font-medium">All funds are well-utilized</p>
                    <p className="text-sm mt-1">No transactions with utilization below 50%</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget Code</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campus</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Allocated</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Obligated</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Utilization</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {underutilizedFunds.map(t => {
                          const allocated = t.amountRequested || 0;
                          const obligated = t.obligationAmount || 0;
                          const remaining = allocated - obligated;
                          const utilization = allocated > 0 ? (obligated / allocated) * 100 : 0;
                          return (
                            <tr key={t.id} className="hover:bg-red-50">
                              <td className="px-4 py-3 text-sm font-mono text-gray-900">{t.budgetCode}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{t.activityName || t.projectName || '—'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{getCampusName(t.campusId)}</td>
                              <td className="px-4 py-3 text-sm text-right">{formatCurrency(allocated)}</td>
                              <td className="px-4 py-3 text-sm text-right text-orange-600">{formatCurrency(obligated)}</td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-red-600">{formatCurrency(remaining)}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getUtilizationColor(utilization)}`}>
                                  {utilization.toFixed(0)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {underutilizedFunds.length > 0 && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="text-sm font-medium text-amber-800 mb-1">Total Underutilized Funds</h4>
                    <p className="text-2xl font-bold text-amber-900">
                      {formatCurrency(underutilizedFunds.reduce((sum, t) => sum + ((t.amountRequested || 0) - (t.obligationAmount || 0)), 0))}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      These funds may be candidates for reallocation. Use the "Adjust Funds" button to reallocate.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Fund Adjustments Tab */}
            {activeTab === 'adjustments' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Fund Adjustment History</h3>
                    <p className="text-sm text-gray-500">Record of all fund reallocations and adjustments</p>
                  </div>
                  <button
                    onClick={() => setShowAdjustModal(true)}
                    className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                  >
                    + New Adjustment
                  </button>
                </div>

                {adjustments.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-lg font-medium">No adjustments yet</p>
                    <p className="text-sm mt-1">Click "Adjust Funds" to create a fund reallocation</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campus</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"></th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">By</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {adjustments.map(adj => (
                          <tr key={adj.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-xs font-mono text-gray-500">{adj.id}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {adj.date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{getCampusName(adj.campusId)}</td>
                            <td className="px-4 py-3 text-sm text-red-600 font-medium">{adj.fromCategory}</td>
                            <td className="px-4 py-3 text-center text-gray-400">→</td>
                            <td className="px-4 py-3 text-sm text-green-600 font-medium">{adj.toCategory}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(adj.amount)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{adj.reason}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{adj.adjustedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Extension Budget Tab */}
            {activeTab === 'extension' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Extension Budget Breakdown</h3>
                    <p className="text-sm text-gray-500">As per Proposals Per Campus</p>
                  </div>
                  {!isEditingBudget ? (
                    <button
                      onClick={handleEditBudget}
                      disabled={budgetLoading || !extensionBudget}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Edit Budget
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveBudget}
                        className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      >
                        Save Changes
                      </button>
                    </div>
                  )}
                </div>

                {budgetLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                  </div>
                ) : extensionBudget ? (
                  <>
                    {/* Extension Budget Summary */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">EXTENSION BUDGET</p>
                          <p className="text-xl font-bold text-gray-900">
                            {formatCurrency(extensionBudget.totalBudget)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Requested</p>
                          <p className="text-xl font-bold text-blue-600">
                            {formatCurrency(totalAllocated)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Obligated</p>
                          <p className="text-xl font-bold text-orange-600">{formatCurrency(totalObligated)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Disbursed</p>
                          <p className="text-xl font-bold text-green-600">{formatCurrency(totalDisbursed)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Remaining Balance</p>
                          <p className="text-xl font-bold text-cyan-600">
                            {formatCurrency(totalRemaining)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">BUR1 Utilization (Requested)</p>
                          <p className="text-lg font-bold text-gray-900">{bur1Utilization.toFixed(2)}%</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full ${getUtilizationBarColor(bur1Utilization)}`}
                            style={{ width: `${Math.min(bur1Utilization, 100)}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <p className="text-sm text-gray-600">BUR2 Utilization (Obligated / ALOBS)</p>
                          <p className="text-lg font-bold text-gray-900">{bur2Utilization.toFixed(2)}%</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full ${getUtilizationBarColor(bur2Utilization)}`}
                            style={{ width: `${Math.min(bur2Utilization, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Extension Budget Table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campus/Category</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Allocated</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Requested</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Obligated (ALOBS)</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">BUR1</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">BUR2</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {Object.entries(EXTENSION_BUDGET_CATEGORIES).map(([key, name]) => {
                            const currentAllocations = isEditingBudget ? editingAllocations : extensionBudget.allocations;
                            const allocation = currentAllocations[key] || 0;
                            // Calculate expenditure from transactions matching this budget category
                            const categoryTransactions = transactions.filter(t => {
                              const cat = (t.fundCategory || '').toLowerCase();
                              return cat.includes(key.toLowerCase()) || key.toLowerCase().includes(cat);
                            });
                            const requested = categoryTransactions.reduce((sum, t) => sum + (t.amountRequested || 0), 0);
                            const obligated = categoryTransactions.reduce((sum, t) => sum + (t.obligationAmount || 0), 0);
                            const balance = allocation - obligated;
                            const bur1 = allocation > 0 ? (requested / allocation) * 100 : 0;
                            const bur2 = allocation > 0 ? (obligated / allocation) * 100 : 0;
                            
                            return (
                              <tr key={key} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{name}</td>
                                <td className="px-4 py-3 text-sm text-right">
                                  {isEditingBudget ? (
                                    <input
                                      type="number"
                                      value={allocation}
                                      onChange={(e) => handleAllocationChange(key, e.target.value)}
                                      className="w-32 px-2 py-1 text-right border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                      min="0"
                                    />
                                  ) : (
                                    formatCurrency(allocation)
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-right">{formatCurrency(requested)}</td>
                                <td className="px-4 py-3 text-sm text-right text-orange-600">{formatCurrency(obligated)}</td>
                                <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(balance)}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                    bur1 >= 80 ? 'bg-green-100 text-green-800' :
                                    bur1 >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {bur1.toFixed(2)}%
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                    bur2 >= 80 ? 'bg-green-100 text-green-800' :
                                    bur2 >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {bur2.toFixed(2)}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {isEditingBudget && (
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-4 py-3 text-sm">TOTAL</td>
                              <td className="px-4 py-3 text-sm text-right">
                                {formatCurrency(Object.values(editingAllocations).reduce((sum, val) => sum + val, 0))}
                              </td>
                              <td className="px-4 py-3 text-sm text-right">{formatCurrency(0)}</td>
                              <td className="px-4 py-3 text-sm text-right">
                                {formatCurrency(Object.values(editingAllocations).reduce((sum, val) => sum + val, 0))}
                              </td>
                              <td className="px-4 py-3 text-center">-</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>No extension budget data found</p>
                  </div>
                )}

                {/* PAPs Section */}
                <div className="mt-8">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">PAPs Details</h4>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PAP's Title</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date of Proposed Implementation</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount Requested</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                            No PAPs added yet
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Adjust Funds Modal */}
        {showAdjustModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Adjust Fund Allocation</h3>
                <p className="text-sm text-gray-500">Reallocate funds between categories</p>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                  <select
                    value={adjustForm.campusId}
                    onChange={e => setAdjustForm(prev => ({ ...prev, campusId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    {campusIds.map((id) => (
                      <option key={id} value={id}>{getCampusName(id)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Category</label>
                  <select
                    value={adjustForm.fromCategory}
                    onChange={e => setAdjustForm(prev => ({ ...prev, fromCategory: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select source category</option>
                    <option value="GAD">GAD</option>
                    <option value="MDS">MDS</option>
                    <option value="STF">STF</option>
                    <option value="Extension">Extension</option>
                    <option value="Supplemental">Supplemental</option>
                    <option value="University Fund">University Fund</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Category</label>
                  <select
                    value={adjustForm.toCategory}
                    onChange={e => setAdjustForm(prev => ({ ...prev, toCategory: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select destination category</option>
                    <option value="GAD">GAD</option>
                    <option value="MDS">MDS</option>
                    <option value="STF">STF</option>
                    <option value="Extension">Extension</option>
                    <option value="Supplemental">Supplemental</option>
                    <option value="University Fund">University Fund</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (PHP)</label>
                  <input
                    type="number"
                    value={adjustForm.amount}
                    onChange={e => setAdjustForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Adjustment</label>
                  <textarea
                    value={adjustForm.reason}
                    onChange={e => setAdjustForm(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Explain why this reallocation is needed..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjustSubmit}
                  className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-colors"
                >
                  Submit Adjustment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Campus Modal */}
        {showAddCampusModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Add New Campus</h3>
                <p className="text-sm text-gray-500">Add a new campus or entry (PAP) to the system</p>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campus ID</label>
                  <input
                    type="text"
                    value={newCampusForm.id}
                    onChange={e => setNewCampusForm(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                    placeholder="e.g., alaminos"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Unique identifier (e.g., alaminos, nasugbu)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campus Name</label>
                  <input
                    type="text"
                    value={newCampusForm.name}
                    onChange={e => setNewCampusForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Alaminos Campus"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Full display name of the campus</p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddCampusModal(false);
                    setNewCampusForm({ id: '', name: '' });
                  }}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCampus}
                  className="px-4 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                >
                  Add Campus
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FundManagement;
