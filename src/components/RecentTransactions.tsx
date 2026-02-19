import React from 'react';

const RecentTransactions: React.FC = () => {
  // Mock data - will be replaced with Firebase data
  const transactions = [
    {
      id: '1',
      title: 'BUILDING SULONG SULONG - Renovation',
      campus: 'Rosario',
      amountRequested: 50000,
      obligated: 35000,
      balance: 15000,
      date: '2025-01-15',
      status: 'active'
    },
    {
      id: '2',
      title: 'Laboratory Equipment Purchase',
      campus: 'Lemery',
      amountRequested: 75000,
      obligated: 60000,
      balance: 15000,
      date: '2025-01-12',
      status: 'active'
    },
    {
      id: '3',
      title: 'Office Supplies - Q1 2025',
      campus: 'San Juan',
      amountRequested: 25000,
      obligated: 25000,
      balance: 0,
      date: '2025-01-10',
      status: 'completed'
    },
    {
      id: '4',
      title: 'Computer Equipment Upgrade',
      campus: 'Pablo Sorbon',
      amountRequested: 45000,
      obligated: 20000,
      balance: 25000,
      date: '2025-01-08',
      status: 'active'
    },
    {
      id: '5',
      title: 'Vehicle Maintenance',
      campus: 'Rosario',
      amountRequested: 30000,
      obligated: 15000,
      balance: 15000,
      date: '2025-01-05',
      status: 'active'
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success-100 text-success-800';
      case 'active':
        return 'bg-primary-100 text-primary-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Recent PAPs</h3>
        <a href="#" className="text-sm text-primary-600 hover:text-primary-500">
          View all
        </a>
      </div>
      
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="border-b border-gray-200 pb-4 last:border-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                  {transaction.title}
                </h4>
                <div className="flex items-center mt-1 space-x-2">
                  <span className="text-xs text-gray-500">{transaction.campus}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{formatDate(transaction.date)}</span>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                {transaction.status}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-gray-500">Requested</p>
                <p className="font-medium text-gray-900">{formatCurrency(transaction.amountRequested)}</p>
              </div>
              <div>
                <p className="text-gray-500">Obligated</p>
                <p className="font-medium text-gray-900">{formatCurrency(transaction.obligated)}</p>
              </div>
              <div>
                <p className="text-gray-500">Balance</p>
                <p className={`font-medium ${transaction.balance === 0 ? 'text-success-600' : 'text-gray-900'}`}>
                  {formatCurrency(transaction.balance)}
                </p>
              </div>
            </div>
            
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-primary-500"
                  style={{ 
                    width: `${((transaction.amountRequested - transaction.balance) / transaction.amountRequested) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button className="w-full text-center text-sm text-primary-600 hover:text-primary-500 font-medium">
          Load more transactions
        </button>
      </div>
    </div>
  );
};

export default RecentTransactions;
