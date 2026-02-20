import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { seedDatabase } from '../lib/seedDatabase';

const AdminTools: React.FC = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogout = () => {
    const shouldLogout = window.confirm('Are you sure you want to log out?');
    if (!shouldLogout) return;
    logout();
  };

  const handleSeedDatabase = async () => {
    if (!user?.role || user.role !== 'admin') {
      setMessage('Only administrators can seed the database.');
      return;
    }

    setLoading(true);
    setMessage('');
    
    try {
      await seedDatabase();
      setMessage('Database seeded successfully!');
    } catch (error: any) {
      console.error('Seeding error:', error);
      setMessage(`Error seeding database: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-primary-50">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
            Access denied. Admin privileges required.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50">
      <Navbar user={user} onLogout={handleLogout} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-primary-800 mb-6">Admin Tools</h1>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Database Seeding</h2>
          <p className="text-gray-600 mb-4">
            This will populate the database with initial master data (campuses, colleges, programs, projects, activities, funding sources, and budget lines).
            Only run this once on a fresh database.
          </p>
          
          <button
            onClick={handleSeedDatabase}
            disabled={loading}
            className="px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Seeding...' : 'Seed Database'}
          </button>
          
          {message && (
            <div className={`mt-4 p-4 rounded ${
              message.includes('Error') 
                ? 'bg-red-50 border border-red-200 text-red-700' 
                : 'bg-green-50 border border-green-200 text-green-700'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTools;
