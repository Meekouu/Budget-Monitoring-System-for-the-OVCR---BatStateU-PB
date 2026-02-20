import React, { useState, useEffect } from 'react';
import type { WFPActivity, WFPActivityStatus } from '../types/wfp';
import { getCampuses } from '../lib/budgetFirestore';
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
  const allOptions = [
    // Pablo Borbon (PB) Campus Programs
    'CABEIHM - College of Accountancy, Business, Economics and International Hospitality Management',
    'CAS - College of Arts and Sciences',
    'CCJE - College of Criminal Justice and Education',
    'CHS - College of Health Sciences',
    'CTE - College of Teacher Education',
    'COM - College of Medicine',
    'COL - College of Law',
    
    // Lemery Campus
    'Lemery Campus Programs',
    
    // Rosario Campus  
    'Rosario Campus Programs',
    
    // San Juan Campus
    'San Juan Campus Programs',
    
    // General/None
    '--None--',
  ];

  if (!campusId) {
    return allOptions;
  }

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
        'Lemery Campus Programs',
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

// Budget code mapping based on campus and program/college
const generateBudgetCode = (campusId: string, programName: string): string => {
  const programCode = programName.split(' - ')[0].split(' ')[0]; // Get the acronym part
  
  const campusCodeMap: { [key: string]: string } = {
    'pb': '250',
    'lemery': '251',
    'rosario': '252',
    'san-juan': '253',
  };
  
  const programCodeMap: { [key: string]: string } = {
    'CABEIHM': '180005',
    'CAS': '180100',
    'CCJE': '191459',
    'CHS': '180108',
    'CTE': '180134',
    'COM': '291030',
    'COL': '291415',
    'Lemery': '280041',
    'Rosario': '280066',
    'San': '291415',
    '--None--': '999999',
  };
  
  const campusPrefix = campusCodeMap[campusId] || '250';
  const programSuffix = programCodeMap[programCode] || '999999';
  
  return `${campusPrefix}${programSuffix}`;
};

  useEffect(() => {
    const loadData = async () => {
      try {
        const campusesData = await getCampuses();
        setCampuses(campusesData);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load master data');
      }
    };
    loadData();
  }, []);

  // Auto-generate budget code when campus or program changes
  useEffect(() => {
    if (formData.campusId && formData.programName) {
      const generatedBudgetCode = generateBudgetCode(formData.campusId, formData.programName);
      setFormData(prev => ({
        ...prev,
        budgetCode: generatedBudgetCode,
      }));
    }
  }, [formData.campusId, formData.programName]);

  // Reset program when campus changes
  useEffect(() => {
    if (formData.campusId) {
      // Check if current program is valid for the new campus
      const validPrograms = getProgramOptionsByCampus(formData.campusId);
      if (!validPrograms.includes(formData.programName)) {
        setFormData(prev => ({
          ...prev,
          programName: '',
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
              placeholder="Select campus and program to auto-generate"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Automatically generated based on campus and program selection
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
