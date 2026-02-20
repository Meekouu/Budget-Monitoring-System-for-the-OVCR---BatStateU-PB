import React, { useState, useEffect } from 'react';
import type { BudgetTransaction, Campus, College, FundingSource, BudgetLine } from '../types/budget';
import { getCampuses, getColleges, getFundingSources, getBudgetLines, createBudgetTransaction } from '../lib/budgetFirestore';
import { useAuth } from '../contexts/AuthContext';

interface ProposalFormProps {
  onSuccess?: () => void;
}

const ProposalForm: React.FC<ProposalFormProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);

  const [formData, setFormData] = useState({
    programName: '',
    projectName: '',
    activityName: '',
    campusId: '',
    collegeId: '',
    beneficiariesMale: 0,
    beneficiariesFemale: 0,
    beneficiariesTotal: 0,
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

  const fundCategories = ['GAD', 'MDS', 'STF', 'Extension', 'SUPP'];

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [campusesData, collegesData, fundingSourcesData, budgetLinesData] = await Promise.all([
          getCampuses(),
          getColleges(),
          getFundingSources(),
          getBudgetLines(),
        ]);
        setCampuses(campusesData);
        setColleges(collegesData);
        setFundingSources(fundingSourcesData);
        setBudgetLines(budgetLinesData);
      } catch (err) {
        console.error('Error loading master data:', err);
        setError('Failed to load master data');
      }
    };
    loadMasterData();
  }, []);

  useEffect(() => {
    const total = formData.beneficiariesMale + formData.beneficiariesFemale;
    setFormData(prev => ({ ...prev, beneficiariesTotal: total }));
  }, [formData.beneficiariesMale, formData.beneficiariesFemale]);

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Program Name</label>
            <input
              type="text"
              name="programName"
              value={formData.programName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
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

        {/* Campus and College */}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">College</label>
            <select
              name="collegeId"
              value={formData.collegeId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select College (Optional)</option>
              {colleges.map(college => (
                <option key={college.id} value={college.id}>{college.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Beneficiaries */}
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
              required
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
              required
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
          </div>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Budget Code</label>
            <select
              name="budgetCode"
              value={formData.budgetCode}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Select Budget Code</option>
              {budgetLines.map(line => (
                <option key={line.id} value={line.budgetCode}>
                  {line.budgetCode} - {line.allocationAmount.toLocaleString()}
                </option>
              ))}
            </select>
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
              {fundCategories.map(category => (
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
