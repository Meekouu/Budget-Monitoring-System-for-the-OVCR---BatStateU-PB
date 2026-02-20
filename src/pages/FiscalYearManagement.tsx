import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import {
  exportAllData,
  downloadBackup,
  wipeTransactionalData,
  wipeAllData,
  saveArchiveRecord,
  getArchiveRecords,
  getCollectionCounts,
  restoreFromBackup,
  type FiscalYearArchive,
  type BackupData,
} from '../lib/fiscalYearFirestore';

const COLLECTION_LABELS: Record<string, string> = {
  budgetTransactions: 'Budget Transactions',
  budgetLines: 'Budget Lines',
  wfpActivities: 'WFP Activities',
  extensionBudgetAllocations: 'Extension Budget Allocations',
  campuses: 'Campuses',
  colleges: 'Colleges',
  programs: 'Programs',
  projects: 'Projects',
  activities: 'Activities',
  fundingSources: 'Funding Sources',
  fundCategories: 'Fund Categories',
  extensionPrograms: 'Extension Programs',
};

const FiscalYearManagement: React.FC = () => {
  const { user, logout } = useAuth();
  const currentYear = new Date().getFullYear();

  const [loading, setLoading] = useState(true);
  const [collectionCounts, setCollectionCounts] = useState<Record<string, number>>({});
  const [archives, setArchives] = useState<FiscalYearArchive[]>([]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [archiveNotes, setArchiveNotes] = useState('');
  const [wipeMode, setWipeMode] = useState<'transactional' | 'all'>('transactional');
  const [confirmText, setConfirmText] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [progress, setProgress] = useState({ collection: '', current: 0, total: 0 });
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [lastResult, setLastResult] = useState<{ type: string; message: string } | null>(null);

  const handleLogout = () => {
    const shouldLogout = window.confirm('Are you sure you want to log out?');
    if (!shouldLogout) return;
    logout();
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [counts, archiveRecords] = await Promise.all([
        getCollectionCounts(),
        getArchiveRecords(),
      ]);
      setCollectionCounts(counts);
      setArchives(archiveRecords.sort((a, b) => b.fiscalYear - a.fiscalYear));
    } catch (error: any) {
      console.error('Error loading fiscal year data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRecords = Object.values(collectionCounts).reduce((sum, c) => sum + c, 0);
  const transactionalCount = ['budgetTransactions', 'budgetLines', 'wfpActivities', 'extensionBudgetAllocations']
    .reduce((sum, key) => sum + (collectionCounts[key] || 0), 0);

  const handleExportAndDownload = async () => {
    if (!user) return;
    try {
      setIsExporting(true);
      setLastResult(null);
      const backup = await exportAllData(selectedYear, user.displayName || user.email || 'Unknown');
      downloadBackup(backup);
      setLastResult({
        type: 'success',
        message: `Backup downloaded successfully! ${backup.metadata.totalRecords} records exported for FY ${selectedYear}.`,
      });
    } catch (error: any) {
      setLastResult({ type: 'error', message: `Export failed: ${error.message}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleArchiveAndWipe = async () => {
    if (!user) return;
    if (confirmText !== `RESET FY ${selectedYear}`) {
      alert(`Please type "RESET FY ${selectedYear}" to confirm.`);
      return;
    }

    try {
      setIsWiping(true);
      setLastResult(null);

      // Step 1: Export backup first
      setProgress({ collection: 'Exporting backup...', current: 0, total: 0 });
      const backup = await exportAllData(selectedYear, user.displayName || user.email || 'Unknown');
      downloadBackup(backup);

      // Step 2: Save archive record
      const collectionCountsForArchive: Record<string, number> = {};
      for (const [key, docs] of Object.entries(backup.collections)) {
        collectionCountsForArchive[key] = docs.length;
      }
      await saveArchiveRecord(
        selectedYear,
        user.displayName || user.email || 'Unknown',
        backup.metadata.totalRecords,
        collectionCountsForArchive,
        archiveNotes || `End of FY ${selectedYear} archive`
      );

      // Step 3: Wipe data
      const onProgress = (col: string, deleted: number, total: number) => {
        setProgress({ collection: COLLECTION_LABELS[col] || col, current: deleted, total });
      };

      let results: Record<string, number>;
      if (wipeMode === 'all') {
        results = await wipeAllData(onProgress);
      } else {
        results = await wipeTransactionalData(onProgress);
      }

      const totalDeleted = Object.values(results).reduce((sum, c) => sum + c, 0);

      setLastResult({
        type: 'success',
        message: `FY ${selectedYear} archived and ${totalDeleted} records wiped successfully. Backup has been downloaded.`,
      });

      // Reset form
      setConfirmText('');
      setArchiveNotes('');
      setShowWipeConfirm(false);

      // Reload data
      await loadData();
    } catch (error: any) {
      setLastResult({ type: 'error', message: `Archive & wipe failed: ${error.message}` });
    } finally {
      setIsWiping(false);
      setProgress({ collection: '', current: 0, total: 0 });
    }
  };

  const handleRestoreFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const confirmed = window.confirm(
      'WARNING: Restoring from a backup will ADD data to existing collections. ' +
      'This will not replace existing data. Continue?'
    );
    if (!confirmed) return;

    try {
      setIsRestoring(true);
      setLastResult(null);

      const text = await file.text();
      const backup: BackupData = JSON.parse(text);

      if (!backup.metadata || !backup.collections) {
        throw new Error('Invalid backup file format');
      }

      const onProgress = (col: string, restored: number, total: number) => {
        setProgress({ collection: COLLECTION_LABELS[col] || col, current: restored, total });
      };

      const results = await restoreFromBackup(backup, onProgress);
      const totalRestored = Object.values(results).reduce((sum, c) => sum + c, 0);

      setLastResult({
        type: 'success',
        message: `Restored ${totalRestored} records from FY ${backup.metadata.fiscalYear} backup.`,
      });

      await loadData();
    } catch (error: any) {
      setLastResult({ type: 'error', message: `Restore failed: ${error.message}` });
    } finally {
      setIsRestoring(false);
      setProgress({ collection: '', current: 0, total: 0 });
      // Reset file input
      event.target.value = '';
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-primary-50">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
            <p className="text-gray-600 mt-2">Only administrators can manage fiscal year data.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50">
      <Navbar user={user} onLogout={handleLogout} />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Fiscal Year Management</h1>
          <p className="text-gray-600 mt-1">Archive, backup, and reset data for fiscal year transitions</p>
        </div>

        {/* Status Message */}
        {lastResult && (
          <div className={`mb-6 p-4 rounded-lg border ${
            lastResult.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {lastResult.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <p className="text-sm font-medium">{lastResult.message}</p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {(isExporting || isWiping || isRestoring) && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="text-sm font-medium text-blue-800">
                {isExporting ? 'Exporting data...' : isWiping ? 'Wiping data...' : 'Restoring data...'}
              </p>
            </div>
            {progress.collection && (
              <div>
                <p className="text-xs text-blue-700 mb-1">
                  {progress.collection} {progress.total > 0 ? `(${progress.current}/${progress.total})` : ''}
                </p>
                {progress.total > 0 && (
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-600 transition-all"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    ></div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600">Loading data...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Data Overview */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Data Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-blue-600 font-medium">Total Records</p>
                  <p className="text-2xl font-bold text-blue-900">{totalRecords.toLocaleString()}</p>
                  <p className="text-xs text-blue-500 mt-1">Across all collections</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <p className="text-sm text-orange-600 font-medium">Transactional Data</p>
                  <p className="text-2xl font-bold text-orange-900">{transactionalCount.toLocaleString()}</p>
                  <p className="text-xs text-orange-500 mt-1">Budget transactions, lines, WFP, allocations</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-green-600 font-medium">Master Data</p>
                  <p className="text-2xl font-bold text-green-900">{(totalRecords - transactionalCount).toLocaleString()}</p>
                  <p className="text-xs text-green-500 mt-1">Campuses, programs, projects, etc.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Collection</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Records</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Object.entries(collectionCounts).map(([key, count]) => {
                      const isTransactional = ['budgetTransactions', 'budgetLines', 'wfpActivities', 'extensionBudgetAllocations'].includes(key);
                      return (
                        <tr key={key} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">{COLLECTION_LABELS[key] || key}</td>
                          <td className="px-4 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              isTransactional ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {isTransactional ? 'Transactional' : 'Master Data'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">{count.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Backup & Export */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Backup & Export</h2>
              <p className="text-sm text-gray-500 mb-4">Download a full backup of all data as a JSON file. This can be used to restore data later.</p>

              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fiscal Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(year => (
                      <option key={year} value={year}>FY {year}</option>
                    ))}
                  </select>
                </div>
                <div className="pt-6">
                  <button
                    onClick={handleExportAndDownload}
                    disabled={isExporting || totalRecords === 0}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {isExporting ? 'Exporting...' : 'Download Backup'}
                  </button>
                </div>
              </div>
            </div>

            {/* Restore from Backup */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Restore from Backup</h2>
              <p className="text-sm text-gray-500 mb-4">
                Upload a previously exported JSON backup file to restore data. Data will be <strong>added</strong> to existing collections.
              </p>
              <label className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {isRestoring ? 'Restoring...' : 'Upload & Restore Backup'}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreFromFile}
                  disabled={isRestoring}
                  className="hidden"
                />
              </label>
            </div>

            {/* New Fiscal Year Reset */}
            <div className="bg-white shadow rounded-lg p-6 border-2 border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <h2 className="text-lg font-semibold text-red-900">Start New Fiscal Year</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Archive current data and wipe the system for a new fiscal year. A backup will be automatically downloaded before any data is deleted.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wipe Mode</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="wipeMode"
                        value="transactional"
                        checked={wipeMode === 'transactional'}
                        onChange={() => setWipeMode('transactional')}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">Transactional Only</span>
                        <p className="text-xs text-gray-500">Wipe budget transactions, lines, WFP activities, and allocations. Keep master data (campuses, programs, etc.)</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="wipeMode"
                        value="all"
                        checked={wipeMode === 'all'}
                        onChange={() => setWipeMode('all')}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-red-900">Full Reset</span>
                        <p className="text-xs text-gray-500">Wipe ALL data including master data. Complete fresh start.</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Archive Notes (optional)</label>
                  <textarea
                    value={archiveNotes}
                    onChange={(e) => setArchiveNotes(e.target.value)}
                    placeholder={`End of FY ${selectedYear} notes...`}
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {!showWipeConfirm ? (
                  <button
                    onClick={() => setShowWipeConfirm(true)}
                    disabled={totalRecords === 0}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Archive & Start New Year
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                    <p className="text-sm font-medium text-red-800 mb-3">
                      ⚠️ This will {wipeMode === 'all' ? 'delete ALL data' : `delete ${transactionalCount} transactional records`} after downloading a backup.
                      This action cannot be undone.
                    </p>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-red-800 mb-1">
                        Type <strong>RESET FY {selectedYear}</strong> to confirm:
                      </label>
                      <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={`RESET FY ${selectedYear}`}
                        className="w-64 border border-red-300 rounded-md px-3 py-2 text-sm focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleArchiveAndWipe}
                        disabled={isWiping || confirmText !== `RESET FY ${selectedYear}`}
                        className="px-4 py-2 text-sm bg-red-700 text-white rounded-md hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isWiping ? 'Processing...' : 'Confirm Archive & Wipe'}
                      </button>
                      <button
                        onClick={() => { setShowWipeConfirm(false); setConfirmText(''); }}
                        className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Archive History */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Archive History</h2>
              {archives.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <p className="text-sm">No archives yet. Archives are created when you start a new fiscal year.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fiscal Year</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Archived Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Archived By</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Records</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {archives.map(archive => (
                        <tr key={archive.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">FY {archive.fiscalYear}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {archive.archivedAt.toLocaleDateString('en-PH', {
                              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{archive.archivedBy}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{archive.totalRecords.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{archive.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FiscalYearManagement;
