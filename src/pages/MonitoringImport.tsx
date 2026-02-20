import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { createBudgetTransaction } from '../lib/budgetFirestore';
import { parseCSVLine, extractCampusId, extractCollegeId, parseCurrency } from '../lib/utils';
import type { WorkflowStage, BudgetTransactionStatus } from '../types/budget';

type SpreadsheetType = 'wfp' | 'proposal' | 'monitoring' | 'supplemental' | 'bur1' | 'bur2';

// Map raw status text from CSV to a valid BudgetTransactionStatus
const mapStatus = (rawStatus: string, stage: SpreadsheetType): BudgetTransactionStatus => {
  const s = (rawStatus || '').toLowerCase().trim();
  
  // Direct matches
  if (s.includes('draft')) return 'Draft';
  if (s.includes('evaluat')) return 'Evaluation';
  if (s.includes('reject')) return 'Rejected';
  if (s.includes('return')) return 'Returned';
  if (s.includes('disburs')) return 'Disbursed';
  if (s.includes('obligat')) return 'Obligated';
  if (s.includes('approv')) return 'Proposal';
  if (s.includes('pr') && !s.includes('pro')) return 'PR';
  
  // Map "Proposal" / "Monitoring" from Process Monitoring column
  if (s === 'proposal') return 'Evaluation';
  if (s === 'monitoring') return 'Obligated';
  
  // Default based on workflow stage
  switch (stage) {
    case 'proposal': return 'Evaluation';
    case 'monitoring': return 'Obligated';
    case 'supplemental': return 'Obligated';
    case 'bur1': return 'PR';
    case 'bur2': return 'Disbursed';
    default: return 'Evaluation';
  }
};


const SPREADSHEET_TYPES: Record<string, any> = {
  wfp: {
    type: 'wfp',
    label: 'WFP Activities',
    description: 'Work and Financial Plan activities with budget allocation',
    color: 'indigo',
  },
  proposal: {
    type: 'proposal',
    label: 'Proposal Logs',
    description: 'Extension project proposals with beneficiary and budget tracking',
    color: 'blue',
  },
  monitoring: {
    type: 'monitoring',
    label: 'Monitoring (Detailed ORS)',
    description: 'Monitoring with obligation and disbursement details',
    color: 'green',
  },
  supplemental: {
    type: 'supplemental',
    label: 'Monitoring - Supplemental',
    description: 'Supplemental fund monitoring with financial tracking',
    color: 'yellow',
  },
  bur1: {
    type: 'bur1',
    label: 'BUR1 - Proposal Fund',
    description: 'Proposed funds awaiting approval',
    color: 'orange',
  },
  bur2: {
    type: 'bur2',
    label: 'BUR2 - ALOBS (Allocated Budgets)',
    description: 'Approved obligations ready for disbursement',
    color: 'purple',
  },
};


// Detect spreadsheet type from headers
const detectSpreadsheetType = (headers: string[]): { type: SpreadsheetType; confidence: number } => {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Define expected headers for each type
  const wfpHeaders = [
    'budget code',
    'program',
    'project',
    'activity',
    'campus/category',
    'date received',
    'amount requested',
    'status',
    'process',
    'stage',
    'male',
    'female',
    'total ben',
    'implementation date',
    'allobs',
    'obligation date',
    'obligated',
    'supplier/payee',
    'particulars',
    'dv no.',
    'dv amount',
    'pr no.',
    'pr amount'
  ];
  
  const proposalHeaders = [
    'process monitoring',
    'date received',
    'program',
    'project',
    'activity',
    'campus',
    'college',
    'male',
    'female',
    'total',
    'date of proposed implementation',
    'mother proposals',
    'consolidated pr',
    'other funding',
    'amount requested',
    'supplemental',
    'gad/mds',
    'fund source',
    'budget code',
    'tracking no.',
    'remarks',
    'attachments',
    'pr no.',
    'amount'
  ];
  
  const monitoringHeaders = [
    'budget code',
    'program',
    'project',
    'activity',
    'campus',
    'allocation',
    'obligation',
    'disbursement',
    'balance',
    'all obs no.',
    'obligation date',
    'obligation amount',
    'supplier/payee',
    'particulars',
    'dv no.',
    'dv amount'
  ];
  
  const bur1Headers = [
    'budget code',
    'program',
    'project',
    'activity',
    'campus',
    'allocation',
    'balance',
    'status',
    'remarks'
  ];
  
  const bur2Headers = [
    'budget code',
    'program',
    'project',
    'activity',
    'campus',
    'allocation',
    'obligated',
    'balance',
    'all obs no.',
    'obligation date',
    'obligation amount',
    'supplier/payee',
    'particulars',
    'dv no.',
    'dv amount',
    'status'
  ];
  
  // Calculate match score for each type
  const calculateMatchScore = (expectedHeaders: string[]): number => {
    let matches = 0;
    expectedHeaders.forEach(header => {
      if (normalizedHeaders.some(h => h.includes(header) || header.includes(h))) {
        matches++;
      }
    });
    return matches / expectedHeaders.length;
  };
  
  const wfpScore = calculateMatchScore(wfpHeaders);
  const proposalScore = calculateMatchScore(proposalHeaders);
  const monitoringScore = calculateMatchScore(monitoringHeaders);
  const bur1Score = calculateMatchScore(bur1Headers);
  const bur2Score = calculateMatchScore(bur2Headers);
  
  // Determine the best match
  const scores = [
    { type: 'wfp' as SpreadsheetType, score: wfpScore },
    { type: 'proposal' as SpreadsheetType, score: proposalScore },
    { type: 'monitoring' as SpreadsheetType, score: monitoringScore },
    { type: 'bur1' as SpreadsheetType, score: bur1Score },
    { type: 'bur2' as SpreadsheetType, score: bur2Score }
  ];
  
  const bestMatch = scores.reduce((best, current) => 
    current.score > best.score ? current : best
  );
  
  // Special check for supplemental (monitoring with supplemental flag)
  if (bestMatch.type === 'monitoring' && normalizedHeaders.some(h => h.includes('supplemental'))) {
    return { type: 'supplemental', confidence: bestMatch.score };
  }
  
  // Return the best match if it has at least 50% match
  if (bestMatch.score >= 0.5) {
    return { type: bestMatch.type, confidence: bestMatch.score };
  }
  
  // Default to proposal if no good match
  return { type: 'proposal', confidence: bestMatch.score };
};

const MonitoringImport: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedType, setSelectedType] = useState<SpreadsheetType | null>(null);
  const [detectedType, setDetectedType] = useState<SpreadsheetType | null>(null);
  const [detectionConfidence, setDetectionConfidence] = useState<number>(0);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [preview, setPreview] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const handleLogout = () => {
    const shouldLogout = window.confirm('Are you sure you want to log out?');
    if (!shouldLogout) return;
    logout();
  };

  const activeType = selectedType || detectedType || 'proposal';
  const typeInfo = SPREADSHEET_TYPES[activeType];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    // Prevent processing the same file multiple times
    if (currentFile && file.name === currentFile.name && file.size === currentFile.size && file.lastModified === currentFile.lastModified) {
      return; // Silently ignore duplicate selections
    }

    // Reset all states
    setError('');
    setPreview([]);
    setHeaders([]);
    setDetectedType(null);
    setResults(null);
    setCurrentFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        console.log('Raw file content:', text.substring(0, 200)); // Debug log
        
        const lines = text.split('\n').filter(l => l.trim());
        console.log('Parsed lines:', lines.length); // Debug log
        
        if (lines.length < 2) {
          setError('CSV must have a header row and at least one data row');
          return;
        }

        console.log('First line (headers):', lines[0]); // Debug log
        let hdrs = parseCSVLine(lines[0]);
        
        // Fallback: if parsing failed, try a simpler approach
        if (hdrs.length === 0 || (hdrs.length === 1 && hdrs[0] === lines[0])) {
          console.log('Primary parser failed, trying fallback...'); // Debug log
          hdrs = lines[0].split(',').map(h => h.replace(/^"(.*)"$/, '$1').trim());
        }
        
        console.log('Parsed headers:', hdrs); // Debug log
        
        if (hdrs.length === 0) {
          setError(`Failed to parse CSV headers. File appears to be empty or invalid. 
                    Expected format: comma-separated values with headers in the first row.
                    File starts with: "${text.substring(0, 100)}..."`);
          return;
        }
        
        if (hdrs.length === 1 && hdrs[0] === lines[0]) {
          setError(`CSV parsing failed. The file might not be properly formatted as CSV.
                    Try saving the file as CSV format from your spreadsheet application.
                    Raw header line: "${lines[0]}"`);
          return;
        }
        
        setHeaders(hdrs);

        const detected = detectSpreadsheetType(hdrs);
        setDetectedType(detected.type);
        setDetectionConfidence(detected.confidence);
        if (!selectedType) setSelectedType(null); // let detection drive it

        const dataLines = lines.slice(1);
        setTotalRows(dataLines.length);

        // Parse first 5 rows for preview
        const previewRows: any[] = [];
        for (let i = 0; i < Math.min(5, dataLines.length); i++) {
          const cols = parseCSVLine(dataLines[i]);
          const row: any = {};
          hdrs.forEach((h, idx) => { row[h] = cols[idx] || ''; });
          previewRows.push(row);
        }
        setPreview(previewRows);
      } catch (err) {
        setError('Failed to parse CSV file');
      }
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!user || preview.length === 0) return;

    setImporting(true);
    setError('');
    setImportProgress({ current: 0, total: 0 });

    try {
      const file = fileInputRef.current?.files?.[0];
      if (!file) throw new Error('No file selected');

      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const text = ev.target?.result as string;
          const lines = text.split('\n').filter(l => l.trim());
          
          // Find header row - look for row containing "Budget Code"
          let headerIndex = 0;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes('budget code')) {
              headerIndex = i;
              break;
            }
          }
          
          let hdrs = parseCSVLine(lines[headerIndex]);
          
          // Fallback parser
          if (hdrs.length === 0 || (hdrs.length === 1 && hdrs[0] === lines[headerIndex])) {
            hdrs = lines[headerIndex].split(',').map(h => h.replace(/^"(.*)"$/, '$1').trim());
          }
          
          const dataLines = lines.slice(headerIndex + 1);

          setImportProgress({ current: 0, total: dataLines.length });

          let success = 0;
          let failed = 0;
          const errors: string[] = [];

          for (let i = 0; i < dataLines.length; i++) {
            try {
              // Skip empty rows or rows with no meaningful data
              const cols = parseCSVLine(dataLines[i]);
              if (cols.length === 0 || (cols.length === 1 && cols[0].trim() === '')) {
                continue;
              }
              
              const row: any = {};
              hdrs.forEach((h, idx) => { row[h] = cols[idx] || ''; });

              const txn = mapRowToTransaction(row, hdrs, activeType, user.uid);
              if (txn) {
                await createBudgetTransaction(txn as any);
                success++;
              } else {
                failed++;
                errors.push(`Row ${headerIndex + i + 2}: Could not map data`);
              }
            } catch (err: any) {
              failed++;
              errors.push(`Row ${headerIndex + i + 2}: ${err.message || 'Unknown error'}`);
            }
            setImportProgress({ current: i + 1, total: dataLines.length });
          }

          setResults({ success, failed, errors });
          if (success > 0) {
            setTimeout(() => navigate('/monitoring'), 3000);
          }
        } catch (err: any) {
          setError(err.message || 'Import failed');
        } finally {
          setImporting(false);
          setImportProgress({ current: 0, total: 0 });
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      setError(err.message || 'Import failed');
      setImporting(false);
    }
  };

  // Map a parsed row to a BudgetTransaction based on the spreadsheet type
  const mapRowToTransaction = (row: any, hdrs: string[], type: SpreadsheetType, userId: string) => {
    // Find column values flexibly
    const find = (keywords: string[]): string => {
      for (const kw of keywords) {
        const key = hdrs.find(h => h.toLowerCase().includes(kw.toLowerCase()));
        if (key && row[key]) return row[key];
      }
      return '';
    };

    const campusRaw = find(['Campus', 'campus', 'Campus/Category', 'category']);
    const collegeRaw = find(['College', 'college']);
    const campusId = extractCampusId(campusRaw || collegeRaw);
    const collegeId = extractCollegeId(collegeRaw || campusRaw) || null;

    const base: any = {
      budgetCode: find(['Budget Code', 'budget_code', 'Budget']),
      status: mapStatus(find(['Status', 'Process', 'process monitoring']), type),
      dateReceived: new Date(find(['Date Received', 'Date_Received', 'date received']) || new Date()),
      programName: find(['Program', 'PROGRAMS', 'program']),
      projectName: find(['Project', 'PROJECTS', 'project']),
      activityName: find(['Activity', 'ACTIVITIES', 'activity', 'Project_Activity']),
      campusId,
      collegeId,
      beneficiariesMale: (type === 'supplemental' || type === 'bur1' || type === 'bur2') ? 0 : (parseInt(find(['Male', 'male'])) || 0),
      beneficiariesFemale: (type === 'supplemental' || type === 'bur1' || type === 'bur2') ? 0 : (parseInt(find(['Female', 'female'])) || 0),
      beneficiariesTotal: (type === 'supplemental' || type === 'bur1' || type === 'bur2') ? 0 : (parseInt(find(['Total', 'total_ben', 'Beneficiaries Total'])) || 0),
      implementationDate: find(['Implementation', 'Date of Proposed Implementation', 'implementation_date']),
      motherProposalId: find(['Mother Proposal', 'mother']),
      isConsolidatedPR: find(['Consolidated', 'consolidated pr']).toLowerCase() === 'yes',
      otherFunding: find(['Other Funding', 'other funding']),
      amountRequested: parseCurrency(find(['Amount Requested', 'amount_requested', 'Allocation'])),
      isSupplemental: type === 'supplemental' || find(['Supplemental', 'supplemental']).toLowerCase() === 'yes',
      stage: type as WorkflowStage,
      fundCategory: find(['Gad', 'GAD/MDS', 'Fund Category', 'fund category']) || 'Extension',
      fundingSource: find(['Fund Source', 'Source', 'funding source', 'Budget Source']) || 'University Fund',
      trackingNo: find(['Tracking', 'tracking_no']),
      remarks: find(['Remarks', 'remarks']),
      attachments: [],
      createdBy: userId,
    };

    // Financial tracking fields (wfp, monitoring, supplemental, bur1, bur2)
    if (type === 'wfp' || type === 'monitoring' || type === 'supplemental' || type === 'bur2') {
      base.allObsNo = find(['ALLOBS', 'allobs', 'OBS NO']);
      base.obligationDate = find(['DATE', 'Obligation Date']) ? new Date(find(['DATE', 'Obligation Date'])) : undefined;
      base.obligationAmount = parseCurrency(find(['Obligation', 'OBLIGATIONS', 'Obligated']));
      base.supplierPayee = find(['Supplier', 'SUPPLIER/PAYEE', 'Payee']);
      base.particulars = find(['Particulars', 'PARTICULARS']);
      base.dvNo = find(['DV', 'DISBURSEMENT VOUCHER', 'DV NO']);
      base.dvAmount = parseCurrency(find(['DV Amount', 'DV AMOUNT']));
      base.prNo = find(['PR No', 'PR NO', 'pr_no']);
      base.prAmount = parseCurrency(find(['PR Amount', 'Amount']));
    }

    // BUR2 specific
    if (type === 'bur2') {
      base.approvedAmount = parseCurrency(find(['Approved', 'ALOBS Amount']));
      base.balance = parseCurrency(find(['Balance']));
    }

    // BUR1 specific
    if (type === 'bur1') {
      base.balance = parseCurrency(find(['Balance']));
    }

    // Skip rows with no meaningful data
    if (!base.budgetCode && !base.activityName && !base.amountRequested) {
      return null;
    }

    return base;
  };

  const getColorClasses = (color: string) => {
    const map: Record<string, { bg: string; border: string; text: string; badge: string }> = {
      blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800', badge: 'bg-blue-100 text-blue-800' },
      green: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-800', badge: 'bg-green-100 text-green-800' },
      yellow: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-800' },
      orange: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-800' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-800', badge: 'bg-purple-100 text-purple-800' },
    };
    return map[color] || map.blue;
  };

  return (
    <div className="min-h-screen bg-primary-50">
      <Navbar user={user} onLogout={handleLogout} />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold text-primary-800 mb-2">Import Monitoring Data</h1>
        <p className="text-gray-600 mb-6">Upload CSV files from any stage of the budget workflow</p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>
        )}

        {results && (
          <div className={`mb-4 p-4 border rounded ${results.success > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <h3 className="font-semibold mb-2">Import Results</h3>
            <p>Successfully imported: {results.success} records</p>
            {results.failed > 0 && <p>Failed: {results.failed} records</p>}
            {results.errors.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer">View Errors</summary>
                <ul className="mt-2 text-sm">
                  {results.errors.map((err: string, i: number) => <li key={i}>{err}</li>)}
                </ul>
              </details>
            )}
            {results.success > 0 && <p className="mt-2 text-sm">Redirecting to Monitoring Dashboard...</p>}
          </div>
        )}

        {/* Spreadsheet Type Selector */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">1. Select Spreadsheet Type</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.values(SPREADSHEET_TYPES).map((t) => {
              const colors = getColorClasses(t.color);
              const isSelected = activeType === t.type;
              const isDetected = detectedType === t.type;
              return (
                <button
                  key={t.type}
                  onClick={() => setSelectedType(t.type)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? `${colors.bg} ${colors.border} ring-2 ring-offset-1`
                      : 'bg-white border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-semibold ${isSelected ? colors.text : 'text-gray-900'}`}>
                      {t.label}
                    </span>
                    {isDetected && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                        Detected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{t.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">2. Upload CSV File</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" id="monitoring-file-upload" />
            <label htmlFor="monitoring-file-upload" className="cursor-pointer mt-4 inline-block px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700">
              Choose CSV File
            </label>
            <p className="text-xs text-gray-500 mt-2">
              The system will auto-detect your spreadsheet type based on column headers.
            </p>
          </div>
        </div>

        {/* Detection Result */}
        {detectedType && (
          <div className={`mb-6 p-4 rounded-lg border ${getColorClasses(typeInfo.color).bg} ${getColorClasses(typeInfo.color).border}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-semibold ${getColorClasses(typeInfo.color).text}`}>
                  Detected: {typeInfo.label}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{typeInfo.description}</p>
                <p className="text-xs text-gray-500 mt-1">{totalRows} data rows found &middot; {headers.length} columns detected</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getColorClasses(typeInfo.color).badge}`}>
                {typeInfo.label}
              </span>
            </div>
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">3. Preview Data (First 5 Rows)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.map((row, ri) => (
                    <tr key={ri}>
                      {headers.map((h, ci) => (
                        <td key={ci} className="px-3 py-2 text-sm whitespace-nowrap max-w-[200px] truncate" title={row[h]}>
                          {row[h] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Importing as: <span className={`font-semibold ${getColorClasses(typeInfo.color).text}`}>{typeInfo.label}</span>
                  &middot; {totalRows} total rows
                </p>
                {detectedType && (
                  <p className="text-xs text-gray-400 mt-1">
                    Detection confidence: {Math.round(detectionConfidence * 100)}%
                    {detectionConfidence < 0.7 && (
                      <span className="ml-2 text-amber-600">
                        ⚠️ Low confidence - consider selecting manually
                      </span>
                    )}
                  </p>
                )}
              </div>
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-6 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {importing ? 'Importing...' : `Import All ${totalRows} Rows`}
              </button>
            </div>
          </div>
        )}

        {/* Workflow Reference */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Budget Workflow Stages</h3>
          <div className="flex flex-wrap items-center gap-2">
            {Object.values(SPREADSHEET_TYPES).map((t, i) => {
              const colors = getColorClasses(t.color);
              return (
                <React.Fragment key={t.type}>
                  {i > 0 && <span className="text-gray-400 text-lg">&rarr;</span>}
                  <div className={`px-3 py-2 rounded-lg ${colors.bg} ${colors.border} border`}>
                    <span className={`text-sm font-medium ${colors.text}`}>{t.label}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Each stage represents a step in the budget lifecycle from proposal to disbursement.
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Import Instructions</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Select the spreadsheet type or let the system auto-detect it</li>
            <li>Upload your CSV file exported from Excel or Google Sheets</li>
            <li>The system will detect columns and map them to the appropriate fields</li>
            <li>Review the preview data to ensure correct mapping</li>
            <li>Click "Import All" to process all rows</li>
            <li>After import, you'll be redirected to the Monitoring Dashboard</li>
          </ol>
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-1">Supported Spreadsheet Types:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
              <li><strong>Proposal Logs</strong> — Status, Date, Activity, Campus, Beneficiaries, Amount, Budget Code, Tracking No.</li>
              <li><strong>Monitoring (Detailed ORS)</strong> — Budget Code, Programs, Projects, Activities, Obligation &amp; Disbursement details</li>
              <li><strong>Supplemental</strong> — Same as Monitoring but for supplemental funds</li>
              <li><strong>BUR1 Proposal Fund</strong> — Proposed fund tracking with allocation and balance</li>
              <li><strong>BUR2 ALOBS</strong> — Approved obligations with financial transaction details</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Loading Modal */}
      {importing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Importing {typeInfo.label}
              </h3>
              <p className="text-sm text-gray-600 mb-4">Please wait while we import your data...</p>
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
              <p className="text-xs text-gray-500">Do not close this window while importing.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringImport;
