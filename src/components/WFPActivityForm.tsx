import React, { useState, useEffect } from 'react';
import type { WFPActivity, WFPActivityStatus } from '../types/wfp';
import { createWFPActivity, updateWFPActivity } from '../lib/wfpFirestore';
import { useAuth } from '../contexts/AuthContext';

interface WFPActivityFormProps {
  onSuccess?: () => void;
  initialData?: Partial<WFPActivity>;
  editMode?: boolean;
}

const WFPActivityForm: React.FC<WFPActivityFormProps> = ({ onSuccess, initialData, editMode = false }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [campuses, setCampuses] = useState<any[]>([]);
  const [generatingBudgetCode, setGeneratingBudgetCode] = useState(false);

  const [formData, setFormData] = useState({
    budgetCode: initialData?.budgetCode || '',
    campusId: initialData?.campusId || '',
    programName: initialData?.programName || '',
    projectName: initialData?.projectName || '',
    activityName: initialData?.activityName || '',
    beneficiaries: initialData?.beneficiaries || 0,
    allocation: initialData?.allocation || 0,
    status: initialData?.status || 'planned' as WFPActivityStatus,
    actualBeneficiaries: initialData?.actualBeneficiaries || undefined,
    actualExpenditure: initialData?.actualExpenditure || undefined,
    completionDate: initialData?.completionDate ? new Date(initialData.completionDate).toISOString().split('T')[0] : '',
    notes: initialData?.notes || '',
  });

  const statusOptions: WFPActivityStatus[] = ['planned', 'ongoing', 'completed', 'cancelled'];

  const getProgramOptionsByCampus = (campusId: string) => {
  // Filter options based on campus
  switch (campusId) {
    case 'pb':
      return [
        'CABEIHM - College of Accountancy, Business, Economics and International Hospitality Management',
        'CAS - College of Arts and Sciences',
        'CCJE - College of Criminal Justice and Education',
        'CHS - College of Health Sciences',
        'CTE - College of Teacher Education',
        'COM - College of Medicine',
        'COL - College of Law',
        '--None--',
      ];
    case 'lemery':
      return [
        '--None--',
      ];
    case 'rosario':
      return [
        'Rosario Campus Programs',
        '--None--',
      ];
    case 'san-juan':
      return [
        'San Juan Campus Programs',
        '--None--',
      ];
    default:
      return ['--None--'];
  }
};

// Budget code generation based on campus and incrementing
const generateBudgetCode = async (campusId: string, programName: string): Promise<string> => {
  const campusCodeMap: { [key: string]: string } = {
    'pb': 'PB',
    'lemery': 'LEM', 
    'rosario': 'ROS',
    'san-juan': 'SJ',
  };
  
  const campusCode = campusCodeMap[campusId] || 'PB';
  
  // Get program code from program name
  let programCode = 'NONE';
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
    const { getAllWFPActivities } = await import('../lib/cachedFirestore');
    
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

  useEffect(() => {
    // Use hardcoded campus data to ensure dropdown always works
    const campusData = [
      { id: 'pb', name: 'Pablo Borbon' },
      { id: 'lemery', name: 'Lemery' },
      { id: 'rosario', name: 'Rosario' },
      { id: 'san-juan', name: 'San Juan' },
    ];
    console.log('Setting campus data:', campusData);
    setCampuses(campusData);
  }, []);

  // Auto-generate budget code when campus or program changes
  useEffect(() => {
    const generateCode = async () => {
      if (formData.campusId && formData.programName) {
        try {
          setGeneratingBudgetCode(true);
          const generatedBudgetCode = await generateBudgetCode(formData.campusId, formData.programName);
          setFormData(prev => ({
            ...prev,
            budgetCode: generatedBudgetCode,
          }));
        } catch (error) {
          console.error('Error generating budget code:', error);
        } finally {
          setGeneratingBudgetCode(false);
        }
      }
    };
    
    generateCode();
  }, [formData.campusId, formData.programName]);

  // Reset program when campus changes
  useEffect(() => {
    if (formData.campusId) {
      // Check if current program is valid for the new campus
      const validPrograms = getProgramOptionsByCampus(formData.campusId);
      if (!validPrograms.includes(formData.programName)) {
        // Default to '--None--' for campus changes
        setFormData(prev => ({
          ...prev,
          programName: '--None--',
          budgetCode: '',
        }));
      }
    } else {
      // Reset program and budget code if no campus selected
      setFormData(prev => ({
        ...prev,
        programName: '',
        budgetCode: '',
      }));
    }
  }, [formData.campusId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const activityData: Omit<WFPActivity, 'id' | 'createdAt' | 'updatedAt'> = {
        ...formData,
        lastUpdated: new Date(),
        completionDate: formData.completionDate ? new Date(formData.completionDate) : undefined,
        createdBy: user.uid,
      };

      if (editMode && initialData?.id) {
        await updateWFPActivity(initialData.id, activityData);
      } else {
        await createWFPActivity(activityData);
      }

      onSuccess?.();
    } catch (err: any) {
      console.error('Error saving WFP activity:', err);
      setError(err.message || 'Failed to save activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6 text-primary-800">
        {editMode ? 'Edit WFP Activity' : 'Create WFP Activity'}
      </h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Budget Code 
              <span className="ml-2 text-xs text-green-600 font-medium">(Auto-generated)</span>
            </label>
            <input
              type="text"
              name="budgetCode"
              value={formData.budgetCode}
              onChange={handleInputChange}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={generatingBudgetCode ? 'Generating...' : 'Select campus and program to auto-generate'}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              {generatingBudgetCode 
                ? 'Finding next available budget code...' 
                : 'Automatically generated based on existing codes (+1 increment)'
              }
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
            <select
              name="campusId"
              value={formData.campusId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Select Campus</option>
              {campuses.map(campus => (
                <option key={campus.id} value={campus.id}>{campus.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Program/College</label>
            <select
              name="programName"
              value={formData.programName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Select Program/College</option>
              {getProgramOptionsByCampus(formData.campusId).map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {!formData.campusId && (
              <p className="mt-1 text-xs text-gray-500">
                Select a campus first to see available programs
              </p>
            )}
            {formData.campusId === 'lemery' && (
              <p className="mt-1 text-xs text-gray-500">
                No specific programs available for Lemery campus
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <input
              type="text"
              name="projectName"
              value={formData.projectName}
              onChange={handleInputChange}
              placeholder="e.g., Project SM Sunrise Weaving Association"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity</label>
            <input
              type="text"
              name="activityName"
              value={formData.activityName}
              onChange={handleInputChange}
              placeholder="e.g., Activity 1 - Sales budgeting and Forecasting"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
        </div>

        {/* Financial Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Planned Beneficiaries</label>
            <input
              type="number"
              name="beneficiaries"
              value={formData.beneficiaries}
              onChange={handleInputChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Allocation (₱)</label>
            <input
              type="number"
              name="allocation"
              value={formData.allocation}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actual Results (shown when status is completed) */}
        {(formData.status === 'completed' || formData.actualBeneficiaries || formData.actualExpenditure) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Actual Beneficiaries</label>
              <input
                type="number"
                name="actualBeneficiaries"
                value={formData.actualBeneficiaries || ''}
                onChange={handleInputChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Actual Expenditure (₱)</label>
              <input
                type="number"
                name="actualExpenditure"
                value={formData.actualExpenditure || ''}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Completion Date</label>
              <input
                type="date"
                name="completionDate"
                value={formData.completionDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Additional notes about the activity..."
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : (editMode ? 'Update Activity' : 'Create Activity')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WFPActivityForm;
