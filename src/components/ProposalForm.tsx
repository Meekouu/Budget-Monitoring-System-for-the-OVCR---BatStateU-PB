import React, { useState, useEffect } from 'react';
import type { BudgetTransaction } from '../types/budget';
import { createBudgetTransaction } from '../lib/budgetFirestore';
import { useAuth } from '../contexts/AuthContext';
import { useMasterData } from '../contexts/MasterDataContext';

interface ProposalFormProps {
  onSuccess?: () => void;
}

const ProposalForm: React.FC<ProposalFormProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const { fundCategories, fundingSources } = useMasterData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [campuses, setCampuses] = useState<any[]>([]);
  const [budgetCodeSearch, setBudgetCodeSearch] = useState('');
  const [generatingBudgetCode, setGeneratingBudgetCode] = useState(false);

  // Program/College options matching WFP Activity Form
  const getProgramOptionsByCampus = (campusId: string) => {
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

  const fundCategoryOptions = fundCategories.map(cat => cat.name);

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

  const [formData, setFormData] = useState({
    programName: '',
    projectName: '',
    activityName: '',
    campusId: '',
    collegeId: '',
    beneficiariesMale: 0,
    beneficiariesFemale: 0,
    beneficiariesTotal: 0,
    specifyGenderBreakdown: false, // New field for checkbox
    implementationDate: '',
    motherProposalId: '',
    isConsolidatedPR: false,
    otherFunding: '',
    amountRequested: 0,
    isSupplemental: false,
    fundCategory: '',
    fundingSource: '',
    trackingNo: '',
    remarks: '',
    budgetCode: '',
  });

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        // Use hardcoded campus data to ensure dropdown always works
        const campusData = [
          { id: 'pb', name: 'Pablo Borbon' },
          { id: 'lemery', name: 'Lemery' },
          { id: 'rosario', name: 'Rosario' },
          { id: 'san-juan', name: 'San Juan' },
        ];
        setCampuses(campusData);
      } catch (err) {
        console.error('Error loading master data:', err);
        setError('Failed to load master data');
      }
    };
    loadMasterData();
  }, []);

  useEffect(() => {
    if (formData.specifyGenderBreakdown) {
      // When gender breakdown is specified, calculate total from male + female
      const total = formData.beneficiariesMale + formData.beneficiariesFemale;
      setFormData(prev => ({ ...prev, beneficiariesTotal: total }));
    } else {
      // When gender breakdown is not specified, reset male/female to 0
      setFormData(prev => ({ 
        ...prev, 
        beneficiariesMale: 0, 
        beneficiariesFemale: 0 
      }));
    }
  }, [formData.beneficiariesMale, formData.beneficiariesFemale, formData.specifyGenderBreakdown]);

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
        }));
      }
    } else {
      // Reset program if no campus selected
      setFormData(prev => ({
        ...prev,
        programName: '',
      }));
    }
  }, [formData.campusId]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? Number(value) : value,
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
      const transactionData: Omit<BudgetTransaction, 'id' | 'createdAt' | 'updatedAt'> = {
        ...formData,
        status: 'Evaluation',
        dateReceived: new Date(),
        attachments: [],
        createdBy: user.uid,
        approvedBy: undefined,
        approvedAt: undefined,
        prNo: undefined,
        prAmount: undefined,
        allObsNo: undefined,
        obligationDate: undefined,
        obligationAmount: undefined,
        supplierPayee: undefined,
        particulars: undefined,
        dvNo: undefined,
        dvAmount: undefined,
      };

      await createBudgetTransaction(transactionData);
      onSuccess?.();
    } catch (err: any) {
      console.error('Error creating proposal:', err);
      setError(err.message || 'Failed to create proposal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6 text-primary-800">Create New Proposal</h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
            <input
              type="text"
              name="projectName"
              value={formData.projectName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity Name</label>
            <input
              type="text"
              name="activityName"
              value={formData.activityName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
        </div>

        {/* Beneficiaries */}
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="specifyGenderBreakdown"
              checked={formData.specifyGenderBreakdown}
              onChange={handleInputChange}
              className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label className="text-sm font-medium text-gray-700">
              Specify gender breakdown (Male/Female)
            </label>
          </div>

          {formData.specifyGenderBreakdown ? (
            // Show gender breakdown fields when checkbox is checked
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Male Beneficiaries</label>
                <input
                  type="number"
                  name="beneficiariesMale"
                  value={formData.beneficiariesMale}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Female Beneficiaries</label>
                <input
                  type="number"
                  name="beneficiariesFemale"
                  value={formData.beneficiariesFemale}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Beneficiaries</label>
                <input
                  type="number"
                  name="beneficiariesTotal"
                  value={formData.beneficiariesTotal}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
                <p className="mt-1 text-xs text-gray-500">Auto-calculated from Male + Female</p>
              </div>
            </div>
          ) : (
            // Show only total field when checkbox is unchecked
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Beneficiaries</label>
              <input
                type="number"
                name="beneficiariesTotal"
                value={formData.beneficiariesTotal}
                onChange={handleInputChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Total number of beneficiaries (gender not specified)</p>
            </div>
          )}
        </div>

        {/* Implementation Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Proposed Implementation</label>
          <input
            type="text"
            name="implementationDate"
            value={formData.implementationDate}
            onChange={handleInputChange}
            placeholder="e.g., March 1-31, 2025"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Budget Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Budget Code 
              <span className="ml-2 text-xs text-green-600 font-medium">(Auto-generated)</span>
            </label>
            <div className="space-y-2">
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
                  : 'Automatically generated based on campus and program selection (CAMPUS-PROGRAM-CODE format)'
                }
              </p>
              
              {/* Optional: Show existing budget codes for reference */}
              <details className="mt-2">
                <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                  Or manually enter a budget code
                </summary>
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    placeholder="Search budget codes..."
                    value={budgetCodeSearch}
                    onChange={(e) => setBudgetCodeSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                  <div className="text-xs text-gray-500">
                    Manual budget code entry
                  </div>
                </div>
              </details>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Requested</label>
            <input
              type="number"
              name="amountRequested"
              value={formData.amountRequested}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
        </div>

        {/* Fund Category and Source */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fund Category</label>
            <select
              name="fundCategory"
              value={formData.fundCategory}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Select Fund Category</option>
              {fundCategoryOptions.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Funding Source</label>
            <select
              name="fundingSource"
              value={formData.fundingSource}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Select Funding Source</option>
              {fundingSources.map(source => (
                <option key={source.id} value={source.name}>{source.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="isSupplemental"
              checked={formData.isSupplemental}
              onChange={handleInputChange}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Supplemental Fund</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="isConsolidatedPR"
              checked={formData.isConsolidatedPR}
              onChange={handleInputChange}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Consolidated PR</span>
          </label>
        </div>

        {/* Additional Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tracking No.</label>
            <input
              type="text"
              name="trackingNo"
              value={formData.trackingNo}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mother Proposal ID</label>
            <input
              type="text"
              name="motherProposalId"
              value={formData.motherProposalId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Other Funding</label>
          <input
            type="text"
            name="otherFunding"
            value={formData.otherFunding}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Proposal'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProposalForm;
