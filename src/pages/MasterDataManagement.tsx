import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMasterData } from '../contexts/MasterDataContext';
import Navbar from '../components/Navbar';
import type { FundCategory, FundingSource } from '../lib/masterDataFirestore';

const MasterDataManagement: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    fundCategories,
    fundingSources,
    loading,
    error,
    addFundCategory,
    addFundingSource,
    updateFundCategory,
    updateFundingSource,
    deleteFundCategory,
    deleteFundingSource,
  } = useMasterData();

  const [activeTab, setActiveTab] = useState<'categories' | 'sources'>('categories');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FundCategory | null>(null);
  const [editingSource, setEditingSource] = useState<FundingSource | null>(null);

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    code: '',
    description: '',
  });

  const [sourceForm, setSourceForm] = useState({
    name: '',
    code: '',
    description: '',
  });

  const handleLogout = () => {
    const shouldLogout = window.confirm('Are you sure you want to log out?');
    if (!shouldLogout) return;
    logout();
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: '', code: '', description: '' });
    setEditingCategory(null);
  };

  const resetSourceForm = () => {
    setSourceForm({ name: '', code: '', description: '' });
    setEditingSource(null);
  };

  const handleSaveCategory = async () => {
    if (!user) return;
    
    try {
      if (editingCategory) {
        await updateFundCategory(editingCategory.id!, categoryForm);
      } else {
        await addFundCategory({
          ...categoryForm,
          isActive: true,
          createdBy: user.uid,
        });
      }
      
      resetCategoryForm();
      setShowCategoryModal(false);
      alert(editingCategory ? 'Category updated successfully!' : 'Category added successfully!');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleSaveSource = async () => {
    if (!user) return;
    
    try {
      if (editingSource) {
        await updateFundingSource(editingSource.id!, sourceForm);
      } else {
        await addFundingSource({
          ...sourceForm,
          isActive: true,
          createdBy: user.uid,
        });
      }
      
      resetSourceForm();
      setShowSourceModal(false);
      alert(editingSource ? 'Funding source updated successfully!' : 'Funding source added successfully!');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleEditCategory = (category: FundCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      code: category.code,
      description: category.description || '',
    });
    setShowCategoryModal(true);
  };

  const handleEditSource = (source: FundingSource) => {
    setEditingSource(source);
    setSourceForm({
      name: source.name,
      code: source.code,
      description: source.description || '',
    });
    setShowSourceModal(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      await deleteFundCategory(id);
      alert('Category deleted successfully!');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this funding source?')) return;
    
    try {
      await deleteFundingSource(id);
      alert('Funding source deleted successfully!');
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50">
      <Navbar user={user} onLogout={handleLogout} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary-800">Master Data Management</h1>
          <p className="text-gray-600 mt-1">Manage fund categories and funding sources</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('categories')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'categories'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Fund Categories
              </button>
              <button
                onClick={() => setActiveTab('sources')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'sources'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Funding Sources
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Fund Categories Tab */}
            {activeTab === 'categories' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Fund Categories</h2>
                  <button
                    onClick={() => {
                      resetCategoryForm();
                      setShowCategoryModal(true);
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Add Category
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {fundCategories.map((category) => (
                        <tr key={category.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {category.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {category.code}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {category.description || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditCategory(category)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id!)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Funding Sources Tab */}
            {activeTab === 'sources' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Funding Sources</h2>
                  <button
                    onClick={() => {
                      resetSourceForm();
                      setShowSourceModal(true);
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Add Funding Source
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {fundingSources.map((source) => (
                        <tr key={source.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {source.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {source.code}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {source.description || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditSource(source)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSource(source.id!)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingCategory ? 'Edit Fund Category' : 'Add Fund Category'}
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., GAD"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  type="text"
                  value={categoryForm.code}
                  onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., GAD"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  resetCategoryForm();
                  setShowCategoryModal(false);
                }}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={!categoryForm.name || !categoryForm.code}
                className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {editingCategory ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Funding Source Modal */}
      {showSourceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingSource ? 'Edit Funding Source' : 'Add Funding Source'}
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={sourceForm.name}
                  onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., GAD Fund"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  type="text"
                  value={sourceForm.code}
                  onChange={(e) => setSourceForm({ ...sourceForm, code: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., GAD"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={sourceForm.description}
                  onChange={(e) => setSourceForm({ ...sourceForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  resetSourceForm();
                  setShowSourceModal(false);
                }}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSource}
                disabled={!sourceForm.name || !sourceForm.code}
                className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {editingSource ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterDataManagement;
