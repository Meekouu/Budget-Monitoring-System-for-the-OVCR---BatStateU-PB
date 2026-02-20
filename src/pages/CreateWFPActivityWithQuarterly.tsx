import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createWFPActivity } from '../lib/cachedFirestore';
import { CAMPUS_DISPLAY_NAMES } from '../lib/constants';
import Navbar from '../components/Navbar';

const CreateWFPActivityWithQuarterly: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    budgetCode: '',
    campusId: 'pb',
    programName: '',
    projectName: '',
    activityName: '',
    beneficiaries: 0,
    allocation: 0,
    // Quarterly targets
    q1Target: 0,
    q2Target: 0,
    q3Target: 0,
    q4Target: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      
      await createWFPActivity({
        ...formData,
        status: 'planned',
        lastUpdated: new Date(),
        createdBy: user.uid,
        // Initialize accomplished values to 0
        q1Accomplished: 0,
        q2Accomplished: 0,
        q3Accomplished: 0,
        q4Accomplished: 0,
        // Calculate initial indicators
        physicalAccomplishment: 0,
        budgetUtilization: 0,
      });

      navigate('/wfp');
    } catch (error: any) {
      alert('Failed to create activity: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-primary-50">
      <Navbar user={user} onLogout={() => {}} />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Create WFP Activity with Quarterly Tracking</h1>
            <p className="text-sm text-gray-500 mt-1">Add a new activity with quarterly targets</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget Code</label>
                <input
                  type="text"
                  required
                  value={formData.budgetCode}
                  onChange={(e) => handleInputChange('budgetCode', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., 250180001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                <select
                  value={formData.campusId}
                  onChange={(e) => handleInputChange('campusId', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {Object.entries(CAMPUS_DISPLAY_NAMES).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program Name</label>
                <input
                  type="text"
                  required
                  value={formData.programName}
                  onChange={(e) => handleInputChange('programName', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., CABEIHM"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={formData.projectName}
                  onChange={(e) => handleInputChange('projectName', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter project name"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Activity Name</label>
                <input
                  type="text"
                  required
                  value={formData.activityName}
                  onChange={(e) => handleInputChange('activityName', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Describe the activity"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Beneficiaries</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.beneficiaries}
                  onChange={(e) => handleInputChange('beneficiaries', parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget Allocation</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.allocation}
                  onChange={(e) => handleInputChange('allocation', parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Quarterly Targets */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quarterly Targets</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Q1 Target</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.q1Target}
                    onChange={(e) => handleInputChange('q1Target', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Q2 Target</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.q2Target}
                    onChange={(e) => handleInputChange('q2Target', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Q3 Target</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.q3Target}
                    onChange={(e) => handleInputChange('q3Target', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Q4 Target</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.q4Target}
                    onChange={(e) => handleInputChange('q4Target', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Total Annual Target:</strong> {formData.q1Target + formData.q2Target + formData.q3Target + formData.q4Target} beneficiaries
                </p>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/wfp')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Activity'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateWFPActivityWithQuarterly;
