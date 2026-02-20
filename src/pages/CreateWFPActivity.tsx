import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import WFPActivityForm from '../components/WFPActivityForm';

const CreateWFPActivity: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    const shouldLogout = window.confirm('Are you sure you want to log out?');
    if (!shouldLogout) return;
    logout();
  };

  const handleSuccess = () => {
    navigate('/wfp');
  };

  return (
    <div className="min-h-screen bg-primary-50">
      <Navbar user={user} onLogout={handleLogout} />
      <div className="container mx-auto px-4 py-8">
        <WFPActivityForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
};

export default CreateWFPActivity;
