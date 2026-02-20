import { createWFPActivity } from './wfpFirestore';
import type { WFPActivity } from '../types/wfp';

export interface WFPImportData {
  'Budget Code': string;
  Campus: string;
  College: string;
  Project: string;
  Activity: string;
  'Beneficiaries Total': number;
  Male: number;
  Female: number;
  Allocation: string; // Currency format like "₱4,000.00"
  'Last Updated': string;
}

export const parseCurrency = (currencyString: string): number => {
  // Handle both formats: "₱4,000.00" and "4,000.00"
  // Remove currency symbol and commas, then parse as number
  const cleaned = currencyString.replace(/[₱,]/g, '');
  const parsed = parseFloat(cleaned);
  
  // Debug logging
  console.log(`Parsing currency: "${currencyString}" -> "${cleaned}" -> ${parsed}`);
  
  return parsed || 0;
};

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

export const mapCampusNameToId = (campusName: string): string => {
  const campusMap: { [key: string]: string } = {
    'Pablo Borbon': 'pb',
    'Lemery': 'lemery',
    'Rosario': 'rosario',
    'San Juan': 'san-juan',
  };
  return campusMap[campusName] || campusName.toLowerCase().replace(/\s+/g, '-');
};

export const importWFPData = async (
  data: WFPImportData[], 
  userId: string,
  onProgress?: (progress: { current: number; total: number }) => void
) => {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  console.log('Starting import of', data.length, 'rows');

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    try {
      console.log(`Processing row ${i + 1}:`, row);
      
      // Update progress
      if (onProgress) {
        onProgress({ current: i + 1, total: data.length });
      }
      
      // Validate required fields
      if (!row['Budget Code'] || !row.Campus || !row.Allocation) {
        throw new Error('Missing required fields: Budget Code, Campus, or Allocation');
      }
      
      const activityData: Omit<WFPActivity, 'id' | 'createdAt' | 'updatedAt'> = {
        budgetCode: row['Budget Code'],
        campusId: mapCampusNameToId(row.Campus),
        programName: row.College, // Changed from Program/College to College
        projectName: row.Project,
        activityName: row.Activity,
        beneficiaries: row['Beneficiaries Total'], // Use total beneficiaries
        allocation: parseCurrency(row.Allocation),
        lastUpdated: parseDate(row['Last Updated']),
        status: 'planned',
        createdBy: userId,
      };

      console.log('Creating activity:', activityData);
      await createWFPActivity(activityData);
      results.success++;
      console.log(`Successfully imported row ${i + 1}`);
    } catch (error: any) {
      console.error(`Error in row ${i + 1}:`, error);
      results.failed++;
      results.errors.push(`Row ${i + 1}: ${error.message}`);
    }
  }

  console.log('Import completed:', results);
  return results;
};

// Function to handle CSV file upload and parsing
export const parseCSVFile = (file: File): Promise<WFPImportData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          reject(new Error('CSV file must have at least a header and one data row'));
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data: WFPImportData[] = [];

        console.log('CSV Headers:', headers);
        console.log('Total lines:', lines.length);

        // Validate headers
        const requiredHeaders = ['Budget Code', 'Campus', 'College', 'Project', 'Activity', 'Beneficiaries Total', 'Male', 'Female', 'Allocation', 'Last Updated'];
        const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
        if (missingHeaders.length > 0) {
          console.error('Missing required headers:', missingHeaders);
          reject(new Error(`CSV is missing required headers: ${missingHeaders.join(', ')}`));
          return;
        }

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue; // Skip empty lines
          
          // Handle quoted fields that may contain commas
          const values: string[] = [];
          let currentValue = '';
          let inQuotes = false;
          
          for (let charIndex = 0; charIndex < line.length; charIndex++) {
            const char = line[charIndex];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(currentValue.trim());
              currentValue = '';
            } else {
              currentValue += char;
            }
          }
          values.push(currentValue.trim()); // Add last value
          
          console.log(`Row ${i}:`, values);
          
          if (values.length !== headers.length) {
            console.warn(`Row ${i} has ${values.length} values but expected ${headers.length}`);
            continue; // Skip malformed rows
          }

          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index];
          });

          // Convert beneficiary counts to numbers
          const totalBeneficiaries = parseInt(String(row['Beneficiaries Total']).replace(/,/g, '')) || 0;
          const male = parseInt(String(row.Male).replace(/,/g, '')) || 0;
          const female = parseInt(String(row.Female).replace(/,/g, '')) || 0;
          
          row['Beneficiaries Total'] = totalBeneficiaries;
          row.Male = male;
          row.Female = female;

          // Debug allocation parsing specifically
          const allocationValue = row.Allocation;
          console.log('Raw allocation value:', JSON.stringify(allocationValue));
          console.log('Type of allocation:', typeof allocationValue);
          console.log('Allocation after replace:', allocationValue.replace(/[₱,]/g, ''));
          console.log('Parsed allocation:', parseFloat(allocationValue.replace(/[₱,]/g, '')));

          // Debug: log the parsed data
          console.log('Parsed row:', row);
          console.log('Beneficiaries - Total:', totalBeneficiaries, 'Male:', male, 'Female:', female);

          data.push(row as WFPImportData);
        }

        resolve(data);
      } catch (error) {
        console.error('CSV parsing error:', error);
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};
