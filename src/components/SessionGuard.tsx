import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface SessionGuardProps {
  children: React.ReactNode;
}

const SessionGuard: React.FC<SessionGuardProps> = ({ children }) => {
  const { user, isSessionExpired, logout } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      if (!user) {
        setIsValid(false);
        setIsChecking(false);
        return;
      }

      try {
        if (isSessionExpired()) {
          console.log('Session expired, logging out...');
          await logout();
          setIsValid(false);
        } else {
          // Session is valid, check if we need to refresh
          setIsValid(true);
        }
      } catch (error) {
        console.error('Session check failed:', error);
        await logout();
        setIsValid(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkSession();

    // Set up periodic session checks
    const interval = setInterval(checkSession, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [user, isSessionExpired, logout]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-primary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking session...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-primary-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="mb-4">
            <svg className="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Session Expired</h2>
          <p className="text-gray-600 mb-4">Your session has expired. Please log in again.</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default SessionGuard;
