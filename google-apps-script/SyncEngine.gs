/**
 * RDES Budget Monitoring - Google Apps Script Sync Engine
 * 
 * This script syncs data from the "Human-Layout" Google Sheet to Firebase Firestore
 * 
 * Setup Instructions:
 * 1. Create a new Google Apps Script project
 * 2. Copy this code into the Script Editor
 * 3. Set up Firebase service account credentials
 * 4. Configure triggers for automatic syncing
 */

// Configuration
const CONFIG = {
  // Firebase Project Configuration
  FIREBASE_PROJECT_ID: 'your-firebase-project-id',
  FIREBASE_BASE_URL: 'https://firestore.googleapis.com/v1/projects/',
  
  // Sheet Configuration
  SHEET_NAME: 'RDES Budget Monitoring 2025',
  SUMMARY_START_ROW: 6,
  DATA_START_ROW: 11,
  
  // Column mappings (adjust based on your sheet layout)
  COLUMNS: {
    PAP_TITLE: 1,        // Column A
    IMPLEMENTATION: 2,   // Column B
    CAMPUS: 3,          // Column C (dropdown)
    CONSOLIDATED_PR: 4,  // Column D
    AMOUNT_REQUESTED: 5, // Column E
    OBLIGATED: 6,       // Column F
    BALANCE: 7          // Column G
  },
  
  // Campus mappings from dropdown values
  CAMPUS_MAPPINGS: {
    'Rosario': 'rosario',
    'Lemery': 'lemery',
    'San Juan': 'san-juan',
    'Pablo Sorbon': 'pablo-sorbon'
  }
};

/**
 * Main sync function - call this from triggers or manually
 */
function syncBudgetData() {
  try {
    Logger.log('Starting budget data sync...');
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) {
      throw new Error(`Sheet "${CONFIG.SHEET_NAME}" not found`);
    }
    
    // Get fiscal year from sheet name
    const fiscalYear = extractFiscalYear(CONFIG.SHEET_NAME);
    
    // Sync summary data
    const summaryData = syncSummaryData(sheet, fiscalYear);
    
    // Sync PAPs data
    const papsData = syncPapsData(sheet, fiscalYear);
    
    // Send to Firebase
    const results = {
      summary: sendToFirestore('summary_budgets', summaryData),
      paps: sendToFirestore('paps', papsData)
    };
    
    Logger.log('Sync completed successfully');
    Logger.log(`Summary: ${results.summary.success ? 'Success' : 'Failed'}`);
    Logger.log(`PAPs: ${results.paps.success ? 'Success' : 'Failed'}`);
    
    return results;
    
  } catch (error) {
    Logger.log(`Sync failed: ${error.message}`);
    throw error;
  }
}

/**
 * Extract fiscal year from sheet name
 */
function extractFiscalYear(sheetName) {
  const match = sheetName.match(/(\d{4})/);
  return match ? parseInt(match[1]) : new Date().getFullYear();
}

/**
 * Sync summary data from the header section
 */
function syncSummaryData(sheet, fiscalYear) {
  const summaryData = {
    id: `${fiscalYear}_overall_summary`,
    fiscalYear: fiscalYear,
    lastSyncedAt: new Date().toISOString()
  };
  
  // Extract summary values from row 6 (adjust based on your sheet)
  const summaryRow = sheet.getRange(CONFIG.SUMMARY_START_ROW, 1, 1, 20).getValues()[0];
  
  // Map these based on your actual sheet structure
  summaryData.contingencyAllocated = parseNumber(summaryRow[8]) || 0;  // Column I
  summaryData.contingencyObligated = parseNumber(summaryRow[9]) || 0;   // Column J
  summaryData.contingencyBalance = parseNumber(summaryRow[6]) || 0;     // Column G
  
  summaryData.pbAllocated = parseNumber(summaryRow[10]) || 0;           // Column K
  summaryData.pbObligated = parseNumber(summaryRow[11]) || 0;           // Column L
  summaryData.pbBalance = parseNumber(summaryRow[7]) || 0;              // Column H
  
  summaryData.lemeryAllocated = parseNumber(summaryRow[12]) || 0;      // Column M
  summaryData.lemeryObligated = parseNumber(summaryRow[13]) || 0;       // Column N
  summaryData.lemeryBalance = parseNumber(summaryRow[14]) || 0;        // Column O
  
  summaryData.rosarioAllocated = parseNumber(summaryRow[14]) || 0;     // Column O
  summaryData.rosarioObligated = parseNumber(summaryRow[15]) || 0;      // Column P
  summaryData.rosarioBalance = parseNumber(summaryRow[16]) || 0;       // Column Q
  
  summaryData.sanJuanAllocated = parseNumber(summaryRow[16]) || 0;     // Column Q
  summaryData.sanJuanObligated = parseNumber(summaryRow[17]) || 0;      // Column R
  summaryData.sanJuanBalance = parseNumber(summaryRow[18]) || 0;       // Column S
  
  return summaryData;
}

/**
 * Sync PAPs data from the main data table
 */
function syncPapsData(sheet, fiscalYear) {
  const papsData = [];
  const lastRow = sheet.getLastRow();
  
  // Start from data row and go to the end
  for (let row = CONFIG.DATA_START_ROW; row <= lastRow; row++) {
    const rowData = sheet.getRange(row, 1, 1, 10).getValues()[0];
    
    // Skip empty rows or summary rows (adjust logic as needed)
    const title = rowData[CONFIG.COLUMNS.PAP_TITLE - 1];
    if (!title || title.toString().trim() === '') continue;
    
    // Skip if it looks like a summary row (e.g., contains "BUILDING SULONG SULONG" as a group header)
    if (isSummaryRow(title)) continue;
    
    const pap = {
      id: `${fiscalYear}_${row}`,
      fiscalYear: fiscalYear,
      title: title.toString().trim(),
      proposedImplementation: rowData[CONFIG.COLUMNS.IMPLEMENTATION - 1]?.toString().trim() || '',
      campusId: mapCampus(rowData[CONFIG.COLUMNS.CAMPUS - 1]),
      consolidatedPR: parseNumber(rowData[CONFIG.COLUMNS.CONSOLIDATED_PR - 1]),
      amountRequested: parseNumber(rowData[CONFIG.COLUMNS.AMOUNT_REQUESTED - 1]),
      obligated: parseNumber(rowData[CONFIG.COLUMNS.OBLIGATED - 1]),
      balance: parseNumber(rowData[CONFIG.COLUMNS.BALANCE - 1]),
      sheetRow: row,
      lastSyncedAt: new Date().toISOString()
    };
    
    papsData.push(pap);
  }
  
  return papsData;
}

/**
 * Check if a row is a summary/header row
 */
function isSummaryRow(title) {
  const summaryKeywords = ['BUILDING SULONG SULONG', 'TOTAL', 'SUMMARY', 'BALANCE'];
  const titleStr = title.toString().toUpperCase();
  return summaryKeywords.some(keyword => titleStr.includes(keyword));
}

/**
 * Map campus dropdown value to campus ID
 */
function mapCampus(campusValue) {
  if (!campusValue) return null;
  
  const campusStr = campusValue.toString().trim();
  return CONFIG.CAMPUS_MAPPINGS[campusStr] || null;
}

/**
 * Parse number from cell value, handling "N/A" and empty cells
 */
function parseNumber(value) {
  if (!value || value === 'N/A' || value === 'n/a') return null;
  
  const num = parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? null : num;
}

/**
 * Send data to Firebase Firestore
 */
function sendToFirestore(collection, data) {
  try {
    const url = `${CONFIG.FIREBASE_BASE_URL}${CONFIG.FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}`;
    
    const payload = Array.isArray(data) 
      ? data.map(item => createFirestoreDocument(item))
      : createFirestoreDocument(data);
    
    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      headers: {
        'Authorization': 'Bearer ' + getFirebaseAccessToken()
      }
    };
    
    if (Array.isArray(data)) {
      // For batch operations, you might need to use Firestore batch API
      // For now, we'll send individual documents
      const results = [];
      for (const item of data) {
        const docUrl = `${url}/${item.id}`;
        options.payload = JSON.stringify(createFirestoreDocument(item));
        const response = UrlFetchApp.fetch(docUrl, options);
        results.push({ id: item.id, success: response.getResponseCode() === 200 });
      }
      return { success: true, results };
    } else {
      const response = UrlFetchApp.fetch(`${url}/${data.id}`, options);
      return { success: response.getResponseCode() === 200 };
    }
    
  } catch (error) {
    Logger.log(`Firestore error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Create Firestore document structure
 */
function createFirestoreDocument(data) {
  const fields = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id') continue; // Skip ID, it's used in the document path
    
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'number') {
      fields[key] = { doubleValue: value };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (value instanceof Date) {
      fields[key] = { timestampValue: value.toISOString() };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else {
      fields[key] = { stringValue: String(value) };
    }
  }
  
  return { fields };
}

/**
 * Get Firebase access token (requires service account setup)
 */
function getFirebaseAccessToken() {
  // This requires setting up a service account and storing the private key
  // For now, return a placeholder - you'll need to implement OAuth2 flow
  
  // TODO: Implement proper OAuth2 with service account
  // 1. Store service account key in Script Properties
  // 2. Use JWT to get access token
  
  const scriptProperties = PropertiesService.getScriptProperties();
  const serviceAccountKey = scriptProperties.getProperty('FIREBASE_SERVICE_ACCOUNT_KEY');
  
  if (!serviceAccountKey) {
    throw new Error('Firebase service account key not configured. Please set FIREBASE_SERVICE_ACCOUNT_KEY in Script Properties.');
  }
  
  // Placeholder - implement actual JWT signing here
  // For now, you'll need to manually get an access token and update this
  return 'your-access-token-here';
}

/**
 * Setup triggers for automatic syncing
 */
function createTriggers() {
  // Time-based trigger - every 30 minutes
  ScriptApp.newTrigger('syncBudgetData')
    .timeBased()
    .everyMinutes(30)
    .create();
  
  // On-edit trigger (optional - might be too frequent)
  // ScriptApp.newTrigger('syncBudgetData')
  //   .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
  //   .onEdit()
  //   .create();
}

/**
 * Test function - run this to test the sync
 */
function testSync() {
  try {
    const results = syncBudgetData();
    Logger.log('Test sync results: ' + JSON.stringify(results));
  } catch (error) {
    Logger.log('Test sync failed: ' + error.message);
  }
}

/**
 * Setup function - run this once to configure the script
 */
function setup() {
  // Set up script properties
  const scriptProperties = PropertiesService.getScriptProperties();
  
  // You'll need to manually set these:
  // scriptProperties.setProperty('FIREBASE_PROJECT_ID', 'your-project-id');
  // scriptProperties.setProperty('FIREBASE_SERVICE_ACCOUNT_KEY', 'your-service-account-key-json');
  
  // Create triggers
  createTriggers();
  
  Logger.log('Setup completed. Please configure Firebase credentials in Script Properties.');
}
