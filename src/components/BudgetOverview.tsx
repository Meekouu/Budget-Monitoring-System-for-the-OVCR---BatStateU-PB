import React from 'react';

const BudgetOverview: React.FC = () => {
  // Mock data - will be replaced with Firebase data
  const budgetData = {
    totalAllocated: 4136000,
    totalObligated: 2747348.20,
    totalBalance: 1388651.80,
    utilizationRate: 66.4,
    campuses: [
      {
        name: 'Lemery',
        allocated: 286000,
        obligated: 191234.50,
        balance: 94765.50,
        utilizationRate: 66.8
      },
      {
        name: 'Rosario',
        allocated: 374000,
        obligated: 248567.80,
        balance: 125432.20,
        utilizationRate: 66.5
      },
      {
        name: 'San Juan',
        allocated: 176000,
        obligated: 112345.90,
        balance: 63654.10,
        utilizationRate: 63.8
      },
      {
        name: 'Contingency',
        allocated: 2200000,
        obligated: 1456789.00,
        balance: 743211.00,
        utilizationRate: 66.2
      },
      {
        name: 'Personnel Benefits',
        allocated: 1100000,
        obligated: 738411.00,
        balance: 361589.00,
        utilizationRate: 67.1
      }
    ]
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'text-danger-600 bg-danger-50';
    if (rate >= 60) return 'text-warning-600 bg-warning-50';
    return 'text-success-600 bg-success-50';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Allocated</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(budgetData.totalAllocated)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-warning-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-warning-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.293a1 1 0 00-1.414 1.414L14.586 10l-1.293 1.293a1 1 0 101.414 1.414L16 11.414l1.293 1.293a1 1 0 001.414-1.414L17.414 10l1.293-1.293a1 1 0 00-1.414-1.414L16 8.586l-1.293-1.293z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Obligated</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(budgetData.totalObligated)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-success-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(budgetData.totalBalance)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getUtilizationColor(budgetData.utilizationRate)}`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Utilization Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {budgetData.utilizationRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Campus Breakdown */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Campus-wise Budget Breakdown</h3>
        <div className="space-y-4">
          {budgetData.campuses.map((campus, index) => (
            <div key={index} className="border-b border-gray-200 pb-4 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">{campus.name}</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getUtilizationColor(campus.utilizationRate)}`}>
                  {campus.utilizationRate.toFixed(1)}%
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Allocated</p>
                  <p className="font-medium text-gray-900">{formatCurrency(campus.allocated)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Obligated</p>
                  <p className="font-medium text-gray-900">{formatCurrency(campus.obligated)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Balance</p>
                  <p className="font-medium text-gray-900">{formatCurrency(campus.balance)}</p>
                </div>
              </div>
              
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      campus.utilizationRate >= 80 ? 'bg-danger-500' :
                      campus.utilizationRate >= 60 ? 'bg-warning-500' : 'bg-success-500'
                    }`}
                    style={{ width: `${campus.utilizationRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BudgetOverview;
