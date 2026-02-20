import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useExtensionBudget } from '../contexts/ExtensionBudgetContext';
import Navbar from '../components/Navbar';
import { getAllBudgetTransactions, getBudgetTransactionsByStatus } from '../lib/budgetFirestore';
import { getAllWFPActivities } from '../lib/wfpFirestore';
import { WORKFLOW_STAGES, CAMPUS_DISPLAY_NAMES } from '../lib/constants';
import type { BudgetTransaction } from '../types/budget';

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'approved':
    case 'completed':
    case 'disbursed':
      return 'bg-green-100 text-green-800';
    case 'evaluation':
    case 'pending':
    case 'ongoing':
      return 'bg-yellow-100 text-yellow-800';
    case 'obligated':
    case 'pr':
      return 'bg-orange-100 text-orange-800';
    case 'rejected':
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getCampusName = (campusId: string) => {
  const campusMap: Record<string, string> = {
    'pb': 'Pablo Borbon',
    'lemery': 'Lemery',
    'rosario': 'Rosario',
    'san-juan': 'San Juan',
  };
  return campusMap[campusId] || campusId;
};

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { allocation: extensionBudget } = useExtensionBudget();
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();
  const [allTransactions, setAllTransactions] = useState<BudgetTransaction[]>([]);
  const [dashboardData, setDashboardData] = useState({
    totalTransactions: 0,
    pendingProposals: 0,
    approvedProposals: 0,
    totalAmountRequested: 0,
    totalAmountObligated: 0,
    wfpActivities: 0,
    completedActivities: 0,
    ongoingActivities: 0,
    recentTransactions: [] as BudgetTransaction[],
    recentActivities: [] as any[],
    campusBreakdown: {} as Record<string, number>,
    stageCounts: {} as Record<string, number>,
  });

  const handleLogout = () => {
    const shouldLogout = window.confirm('Are you sure you want to log out?');
    if (!shouldLogout) return;
    logout();
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Fetch all budget transactions (from imports)
        const transactions = await getAllBudgetTransactions();
        setAllTransactions(transactions);
        
        // Fetch proposals by status
        const pendingProposals = await getBudgetTransactionsByStatus('Evaluation');
        const approvedProposals = await getBudgetTransactionsByStatus('Approved');
        
        // Fetch WFP activities
        const wfpActivities = await getAllWFPActivities();
        
        // Calculate statistics from real data
        const totalRequested = transactions.reduce((sum: number, t: BudgetTransaction) => sum + (t.amountRequested || 0), 0);
        const totalObligated = transactions.reduce((sum: number, t: BudgetTransaction) => sum + (t.obligationAmount || 0), 0);
        
        // Campus breakdown
        const campusStats: Record<string, number> = {};
        transactions.forEach((t: BudgetTransaction) => {
          const campus = t.campusId || 'Unknown';
          campusStats[campus] = (campusStats[campus] || 0) + 1;
        });
        
        // Stage counts
        const stageCounts: Record<string, number> = {};
        transactions.forEach((t: any) => {
          const stage = t.stage || 'proposal';
          stageCounts[stage] = (stageCounts[stage] || 0) + 1;
        });
        
        setDashboardData({
          totalTransactions: transactions.length,
          pendingProposals: pendingProposals.length,
          approvedProposals: approvedProposals.length,
          totalAmountRequested: totalRequested,
          totalAmountObligated: totalObligated,
          wfpActivities: wfpActivities.length,
          completedActivities: wfpActivities.filter(a => a.status === 'completed').length,
          ongoingActivities: wfpActivities.filter(a => a.status === 'ongoing').length,
          recentTransactions: transactions.slice(0, 5),
          recentActivities: wfpActivities.slice(0, 5),
          campusBreakdown: campusStats,
          stageCounts,
        });
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, [user]);

  // Compute fund utilization data
  const extensionBudgetTotal = extensionBudget?.totalBudget || 0;
  const totalRequested = allTransactions.reduce((sum, t) => sum + (t.amountRequested || 0), 0);
  const totalObligated = allTransactions.reduce((sum, t) => sum + (t.obligationAmount || 0), 0);
  const totalDisbursed = allTransactions.reduce((sum, t) => sum + (t.dvAmount || 0), 0);
  const totalRemaining = extensionBudgetTotal - totalRequested;
  const bur1Utilization = extensionBudgetTotal > 0 ? (totalRequested / extensionBudgetTotal) * 100 : 0;
  const bur2Utilization = extensionBudgetTotal > 0 ? (totalObligated / extensionBudgetTotal) * 100 : 0;

  // Fund utilization by campus
  const campusFundData = Object.entries(CAMPUS_DISPLAY_NAMES).map(([campusId, campusName]) => {
    const campusTxns = allTransactions.filter(t => t.campusId === campusId);
    const allocated = campusTxns.reduce((sum, t) => sum + (t.amountRequested || 0), 0);
    const obligated = campusTxns.reduce((sum, t) => sum + (t.obligationAmount || 0), 0);
    const disbursed = campusTxns.reduce((sum, t) => sum + (t.dvAmount || 0), 0);
    const remaining = allocated - obligated;
    const utilization = allocated > 0 ? (obligated / allocated) * 100 : 0;
    return { campusId, campusName, allocated, obligated, disbursed, remaining, utilization, count: campusTxns.length };
  });

  // Fund allocation by category
  const categoryData = allTransactions.reduce((acc, t) => {
    const cat = t.fundCategory || 'Uncategorized';
    if (!acc[cat]) acc[cat] = { allocated: 0, obligated: 0, disbursed: 0, count: 0 };
    acc[cat].allocated += t.amountRequested || 0;
    acc[cat].obligated += t.obligationAmount || 0;
    acc[cat].disbursed += t.dvAmount || 0;
    acc[cat].count += 1;
    return acc;
  }, {} as Record<string, { allocated: number; obligated: number; disbursed: number; count: number }>);

  const getUtilizationBarColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 bg-green-50';
    if (rate >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Compute stage financial summaries from real data
  const stageFinancials = Object.keys(WORKFLOW_STAGES).map(stageKey => {
    const stageTransactions = allTransactions.filter((t: any) => (t.stage || 'proposal') === stageKey);
    const totalAmount = stageTransactions.reduce((sum: number, t: BudgetTransaction) => sum + (t.amountRequested || 0), 0);
    const totalBeneficiaries = stageTransactions.reduce((sum: number, t: BudgetTransaction) => {
      // Don't count beneficiaries for supplemental, bur1, bur2 stages
      if (!stageKey || ['supplemental', 'bur1', 'bur2'].includes(stageKey)) return sum;
      return sum + (t.beneficiariesTotal || 0);
    }, 0);
    const config = WORKFLOW_STAGES[stageKey];
    return {
      key: stageKey,
      label: config.label,
      color: config.color,
      bgColor: config.bgColor,
      borderColor: config.borderColor,
      count: stageTransactions.length,
      totalAmount,
      totalBeneficiaries,
    };
  });

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
              RDES Budget Monitoring for Fiscal Year {currentYear} &bull; Welcome back, {user?.displayName}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              {/* Quick Actions */}
              <div className="mb-8">
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <a href="/proposals/create" className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <h3 className="text-sm font-medium text-gray-900">Create Proposal</h3>
                        <p className="text-xs text-gray-500 mt-1">Submit a new budget proposal</p>
                      </a>
                      <a href="/monitoring" className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <h3 className="text-sm font-medium text-gray-900">Budget Monitoring</h3>
                        <p className="text-xs text-gray-500 mt-1">View all workflow stages</p>
                      </a>
                      <a href="/monitoring/import" className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <h3 className="text-sm font-medium text-gray-900">Import Data</h3>
                        <p className="text-xs text-gray-500 mt-1">Upload CSV files for monitoring</p>
                      </a>
                      <a href="/wfp" className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <h3 className="text-sm font-medium text-gray-900">WFP Activities</h3>
                        <p className="text-xs text-gray-500 mt-1">Track WFP-funded activities</p>
                      </a>
                      {user?.role === 'admin' && (
                        <a href="/approvals" className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <h3 className="text-sm font-medium text-gray-900">Approval Queue</h3>
                          <p className="text-xs text-gray-500 mt-1">Review pending proposals</p>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white shadow rounded-lg p-6">
                  <p className="text-sm font-medium text-gray-600">Total Records</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData.totalTransactions}</p>
                  <p className="text-xs text-gray-500">Across all stages</p>
                </div>
                <div className="bg-white shadow rounded-lg p-6">
                  <p className="text-sm font-medium text-gray-600">Total Requested</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(dashboardData.totalAmountRequested)}</p>
                  <p className="text-xs text-gray-500">All proposals</p>
                </div>
                <div className="bg-white shadow rounded-lg p-6">
                  <p className="text-sm font-medium text-gray-600">Total Obligated</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(dashboardData.totalAmountObligated)}</p>
                  <p className="text-xs text-gray-500">Committed funds</p>
                </div>
                <div className="bg-white shadow rounded-lg p-6">
                  <p className="text-sm font-medium text-gray-600">Extension Budget</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {extensionBudget ? formatCurrency(extensionBudget.totalBudget) : formatCurrency(0)}
                  </p>
                  <p className="text-xs text-gray-500">Total allocation</p>
                </div>
              </div>


              {/* Budget Utilization Overview */}
              <div className="bg-white shadow rounded-lg p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-medium text-gray-900">Budget Utilization Overview</h2>
                  <a href="/funds" className="text-sm text-primary-600 hover:text-primary-800 font-medium">
                    Fund Management &rarr;
                  </a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase font-medium">Extension Budget</p>
                    <p className="text-xl font-bold text-purple-600">{formatCurrency(extensionBudgetTotal)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase font-medium">Total Requested</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(totalRequested)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase font-medium">Total Obligated</p>
                    <p className="text-xl font-bold text-orange-600">{formatCurrency(totalObligated)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase font-medium">Total Disbursed</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(totalDisbursed)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase font-medium">Remaining</p>
                    <p className="text-xl font-bold text-cyan-600">{formatCurrency(totalRemaining)}</p>
                  </div>
                </div>
                {/* Utilization Progress Bars */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">BUR1 (Requested) vs Budget</span>
                      <span className="font-medium text-gray-900">{bur1Utilization.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className={`h-3 rounded-full ${getUtilizationBarColor(bur1Utilization)}`} style={{ width: `${Math.min(bur1Utilization, 100)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">BUR2 (Obligated/ALOBS) vs Budget</span>
                      <span className="font-medium text-gray-900">{bur2Utilization.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className={`h-3 rounded-full ${getUtilizationBarColor(bur2Utilization)}`} style={{ width: `${Math.min(bur2Utilization, 100)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Disbursed vs Obligated</span>
                      <span className="font-medium text-gray-900">{totalObligated > 0 ? ((totalDisbursed / totalObligated) * 100).toFixed(1) : '0.0'}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="h-3 rounded-full bg-green-500" style={{ width: `${totalObligated > 0 ? Math.min((totalDisbursed / totalObligated) * 100, 100) : 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fund Utilization by Campus */}
              <div className="bg-white shadow rounded-lg p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Fund Utilization by Campus</h2>
                  <a href="/funds" className="text-sm text-primary-600 hover:text-primary-800 font-medium">
                    View Details &rarr;
                  </a>
                </div>
                <div className="overflow-x-auto">
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
                      {campusFundData.map(campus => (
                        <tr key={campus.campusId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{campus.campusName}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(campus.allocated)}</td>
                          <td className="px-4 py-3 text-sm text-right text-orange-600">{formatCurrency(campus.obligated)}</td>
                          <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(campus.disbursed)}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">{formatCurrency(campus.remaining)}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div className={`h-2 rounded-full ${getUtilizationBarColor(campus.utilization)}`} style={{ width: `${Math.min(campus.utilization, 100)}%` }}></div>
                              </div>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getUtilizationColor(campus.utilization)}`}>
                                {campus.utilization.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-500">{campus.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fund Allocation by Category */}
              {Object.keys(categoryData).length > 0 && (
                <div className="bg-white shadow rounded-lg p-6 mb-8">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Fund Allocation by Category</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(categoryData).map(([category, data]) => {
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
                              <span className="font-medium text-blue-600">{formatCurrency(data.allocated - data.obligated)}</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                            <div className={`h-2 rounded-full ${getUtilizationBarColor(utilization)}`} style={{ width: `${Math.min(utilization, 100)}%` }}></div>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">{data.count} transaction{data.count !== 1 ? 's' : ''}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}


              {/* Recent Records */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Records</h2>
                  <div className="space-y-3">
                    {dashboardData.recentTransactions.length > 0 ? (
                      dashboardData.recentTransactions.map((txn: BudgetTransaction) => (
                        <div key={txn.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{txn.activityName || txn.programName}</p>
                            <p className="text-xs text-gray-500">
                              {getCampusName(txn.campusId)} &bull; {formatCurrency(txn.amountRequested || 0)}
                              {txn.budgetCode && ` \u2022 ${txn.budgetCode}`}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${getStatusColor(txn.status)}`}>
                            {txn.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No records yet. Import data to get started.</p>
                    )}
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
