import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { parseCSVFile, importWFPData, type WFPImportData } from '../lib/wfpImport';
import { cacheUtils } from '../lib/cachedFirestore';

const WFPImport: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [preview, setPreview] = useState<WFPImportData[]>([]);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  const handleLogout = () => {
    const shouldLogout = window.confirm('Are you sure you want to log out?');
    if (!shouldLogout) return;
    logout();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setPreview([]);
    setResults(null);

    try {
      // First, let's see the raw CSV content
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        console.log('Raw CSV content (first 500 chars):', text.substring(0, 500));
        
        // Now parse it
        parseCSVFile(file).then(data => {
          console.log('Parsed data:', data);
          // Sort by allocation amount (largest to smallest) for preview
          const sortedData = data.sort((a, b) => {
            const allocationA = parseFloat(a.Allocation.replace(/[₱,]/g, '')) || 0;
            const allocationB = parseFloat(b.Allocation.replace(/[₱,]/g, '')) || 0;
            return allocationB - allocationA; // Descending order
          });
          setPreview(sortedData.slice(0, 5)); // Show first 5 rows as preview
        }).catch(err => {
          console.error('Parse error:', err);
          setError(err.message || 'Failed to parse CSV file');
        });
      };
      reader.readAsText(file);
    } catch (err: any) {
      setError(err.message || 'Failed to read file');
    }
  };

  const handleImport = async () => {
    if (!user || preview.length === 0) return;

    setImporting(true);
    setError('');
    setImportProgress({ current: 0, total: 0 });

    try {
      // Get all data (not just preview)
      const file = fileInputRef.current?.files?.[0];
      if (!file) throw new Error('No file selected');

      const allData = await parseCSVFile(file);
      setImportProgress({ current: 0, total: allData.length });
      
      const importResults = await importWFPData(allData, user.uid, (progress) => {
        setImportProgress({ current: progress.current, total: progress.total });
      });
      
      setResults(importResults);
      
      // Clear cache after successful import
      cacheUtils.invalidate(['*']);
      
      // Show success message
      if (importResults.success > 0) {
        setTimeout(() => {
          navigate('/wfp');
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  const formatCurrency = (amount: string) => {
    // Handle both formats: with and without ₱ symbol
    const cleanAmount = amount.replace(/[₱,]/g, '');
    const numAmount = parseFloat(cleanAmount) || 0;
    
    // Debug logging
    console.log(`Formatting currency: "${amount}" -> "${cleanAmount}" -> ${numAmount}`);
    
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(numAmount);
  };

  const formatBeneficiaries = (row: any) => {
    const total = parseInt(row['Beneficiaries Total']) || 0;
    const male = parseInt(row.Male) || 0;
    const female = parseInt(row.Female) || 0;
    
    if (total === 0) {
      return '0';
    }
    
    // If male and female are both 0 but total has value, just show total
    if (male === 0 && female === 0 && total > 0) {
      return total.toString();
    }
    
    // If we have gender breakdown, show it
    if (male > 0 || female > 0) {
      return `${total} (M: ${male} / F: ${female})`;
    }
    
    // Default to total
    return total.toString();
  };

  return (
    <div className="min-h-screen bg-primary-50">
      <Navbar user={user} onLogout={handleLogout} />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold text-primary-800 mb-6">Import WFP Activities</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        {results && (
          <div className={`mb-4 p-4 border rounded ${
            results.success > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <h3 className="font-semibold mb-2">Import Results</h3>
            <p>Successfully imported: {results.success} activities</p>
            {results.failed > 0 && <p>Failed: {results.failed} activities</p>}
            {results.errors.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer">View Errors</summary>
                <ul className="mt-2 text-sm">
                  {results.errors.map((err: string, index: number) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              </details>
            )}
            {results.success > 0 && (
              <p className="mt-2 text-sm">Redirecting to WFP Dashboard...</p>
            )}
          </div>
        )}

        {/* File Upload */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Select CSV File</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer mt-4 inline-block px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700"
            >
              Choose CSV File
            </label>
            <p className="text-xs text-gray-500 mt-2">
              CSV should have columns: Budget Code, Campus, College, Project, Activity, Beneficiaries Total, Male, Female, Allocation, Last Updated<br/>
              Note: Allocation can be "4,000.00" (without ₱ symbol) and dates can be "2/19/2026"
            </p>
          </div>
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Preview (Top 5 by Allocation)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Budget Code</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Campus</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">College</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Beneficiaries</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Allocation</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.map((row, index) => {
                    return (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm">{row['Budget Code']}</td>
                        <td className="px-4 py-2 text-sm">{row.Campus}</td>
                        <td className="px-4 py-2 text-sm">{row.College}</td>
                        <td className="px-4 py-2 text-sm">{row.Project}</td>
                        <td className="px-4 py-2 text-sm">{row.Activity}</td>
                        <td className="px-4 py-2 text-sm">
                          {formatBeneficiaries(row)}
                        </td>
                        <td className="px-4 py-2 text-sm">{formatCurrency(row.Allocation)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-6 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Import All Data'}
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Import Instructions</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Export your WFP data from Google Sheets as CSV</li>
            <li>Ensure your CSV has these exact column headers: Budget Code, Campus, College, Project, Activity, Beneficiaries Total, Male, Female, Allocation, Last Updated</li>
            <li>Allocation can be "4,000.00" (without ₱ symbol) or "₱4,000.00"</li>
            <li>Date format can be "2/19/2026" (MM/DD/YYYY)</li>
            <li>Beneficiary counts: Total is required, Male/Female are optional (use 0 if unknown)</li>
            <li>Upload the CSV file using the button above</li>
            <li>Review the preview and click "Import All Data"</li>
          </ol>
        </div>
      </div>
      
      {/* Loading Modal */}
      {importing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Importing WFP Data</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please wait while we import your data...
              </p>
              
              {importProgress.total > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{importProgress.current} / {importProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round((importProgress.current / importProgress.total) * 100)}% complete
                  </p>
                </div>
              )}
              
              <p className="text-xs text-gray-500">
                Do not close this window while importing is in progress.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WFPImport;
