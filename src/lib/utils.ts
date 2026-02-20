import { CAMPUS_ID_MAP, COLLEGE_MAP, CAMPUS_MAP, STATUS_COLORS, WORKFLOW_STAGES } from './constants';

// Parse CSV line handling quotes and commas
export const parseCSVLine = (line: string): string[] => {
  if (!line || line.trim() === '') {
    return [];
  }
  
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      // Handle escaped quotes
      if (i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i += 2; // Skip both quotes
      } else {
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
};

// Extract campus ID from Campus_College column
export const extractCampusId = (campusCollege: string): string => {
  const lower = campusCollege.toLowerCase();
  for (const [name, id] of Object.entries(CAMPUS_ID_MAP)) {
    if (lower.includes(name)) return id;
  }
  return 'pb'; // Default
};

// Extract college ID from Campus_College column
export const extractCollegeId = (campusCollege: string): string | undefined => {
  const lower = campusCollege.toLowerCase();
  for (const [name, id] of Object.entries(COLLEGE_MAP)) {
    if (lower.includes(name)) return id;
  }
  return undefined;
};

// Parse currency string to number
export const parseCurrency = (currencyString: string): number => {
  if (!currencyString) return 0;
  // Handle both formats: "₱4,000.00" and "4,000.00"
  const cleaned = currencyString.replace(/[₱,\s]/g, '');
  return parseFloat(cleaned) || 0;
};

// Format number as currency
export const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) || 0 : amount;
  
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(numAmount);
};

// Get status color class
export const getStatusColor = (status: string): string => {
  return STATUS_COLORS[status] || STATUS_COLORS['Draft'];
};

// Format beneficiaries display
export const formatBeneficiaries = (row: any, totalField: string = 'Total_Ben', maleField: string = 'Male', femaleField: string = 'Female'): string => {
  const total = parseInt(row[totalField]) || 0;
  const male = parseInt(row[maleField]) || 0;
  const female = parseInt(row[femaleField]) || 0;
  
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

// Budget code generation based on campus and incrementing
export const generateBudgetCode = async (campusId: string, programName: string): Promise<string> => {
  const campusCode = CAMPUS_MAP[campusId] || 'PB';
  
  // Get program code from program name
  let programCode = 'EXT'; // Default for Extension programs
  if (programName && programName !== '--None--') {
    // Extract the acronym part (before the dash or first word)
    if (programName.includes(' - ')) {
      programCode = programName.split(' - ')[0];
    } else if (programName.includes(' ')) {
      programCode = programName.split(' ')[0];
    } else {
      programCode = programName.toUpperCase();
    }
  }
  
  try {
    // Import the cached Firestore functions to get existing activities
    const { getAllWFPActivities } = await import('./cachedFirestore');
    
    // Get all activities to find the highest budget code for this campus-program combination
    const activities = await getAllWFPActivities(1, 1000);
    
    // Filter activities by campus and program pattern
    const campusProgramPattern = `${campusCode}-${programCode}-`;
    const campusProgramActivities = activities.filter(activity => 
      activity.budgetCode && activity.budgetCode.startsWith(campusProgramPattern)
    );
    
    // Find the highest sequence number for this campus-program combination
    let maxSequence = 0;
    campusProgramActivities.forEach(activity => {
      const parts = activity.budgetCode.split('-');
      if (parts.length === 3) {
        const sequence = parseInt(parts[2]);
        if (!isNaN(sequence) && sequence > maxSequence) {
          maxSequence = sequence;
        }
      }
    });
    
    // Increment by 1 and format with 3 digits
    const newSequence = maxSequence + 1;
    const formattedSequence = newSequence.toString().padStart(3, '0');
    
    return `${campusCode}-${programCode}-${formattedSequence}`;
    
  } catch (error) {
    console.error('Error generating budget code:', error);
    // Fallback to campus-program-001 if there's an error
    return `${campusCode}-${programCode}-001`;
  }
};

// Get campus display name
export const getCampusDisplayName = (campusId: string): string => {
  const displayNames: Record<string, string> = {
    'pb': 'Pablo Borbon',
    'lemery': 'Lemery',
    'rosario': 'Rosario',
    'san-juan': 'San Juan',
  };
  return displayNames[campusId] || campusId;
};

// Get workflow stage configuration
export const getWorkflowStageConfig = (stage: string) => {
  return WORKFLOW_STAGES[stage] || WORKFLOW_STAGES.proposal;
};

// Map status to system status
export const mapStatusToSystem = (status: string): 'planned' | 'ongoing' | 'completed' | 'cancelled' => {
  if (!status) return 'planned';
  
  const statusLower = status.toLowerCase().trim();
  switch (statusLower) {
    case 'completed':
    case 'complete':
    case 'done':
      return 'completed';
    case 'ongoing':
    case 'in progress':
    case 'in-progress':
    case 'active':
      return 'ongoing';
    case 'cancelled':
    case 'canceled':
    case 'terminated':
      return 'cancelled';
    case 'planned':
    case 'pending':
    case 'scheduled':
    default:
      return 'planned';
  }
};

// Map campus name to ID
export const mapCampusNameToId = (campusName: string): string => {
  const campusMap: { [key: string]: string } = {
    'Pablo Borbon': 'pb',
    'Lemery': 'lemery',
    'Rosario': 'rosario',
    'San Juan': 'san-juan',
  };
  return campusMap[campusName] || campusName.toLowerCase().replace(/\s+/g, '-');
};

// Parse date string
export const parseDate = (dateString: string): Date => {
  // Handle Excel date format or regular date string (MM/DD/YYYY)
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Try parsing MM/DD/YYYY format
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0]);
    const day = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
      return new Date(year, month - 1, day);
    }
  }
  
  return new Date(); // Fallback to current date
};
