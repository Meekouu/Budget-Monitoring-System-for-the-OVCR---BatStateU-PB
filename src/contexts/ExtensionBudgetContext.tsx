import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { updateExtensionBudgetAllocation, getOrCreateExtensionBudgetAllocation } from '../lib/extensionProgramsFirestore';
import type { ExtensionBudgetAllocation } from '../lib/extensionProgramsFirestore';

interface ExtensionBudgetContextType {
  allocation: ExtensionBudgetAllocation | null;
  loading: boolean;
  updateAllocation: (allocations: Record<string, number>) => Promise<void>;
  refreshAllocation: () => Promise<void>;
  currentYear: number;
}

const ExtensionBudgetContext = createContext<ExtensionBudgetContextType | undefined>(undefined);

export const useExtensionBudget = () => {
  const context = useContext(ExtensionBudgetContext);
  if (!context) {
    throw new Error('useExtensionBudget must be used within ExtensionBudgetProvider');
  }
  return context;
};

interface ExtensionBudgetProviderProps {
  children: ReactNode;
}

export const ExtensionBudgetProvider: React.FC<ExtensionBudgetProviderProps> = ({ children }) => {
  const [allocation, setAllocation] = useState<ExtensionBudgetAllocation | null>(null);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();

  const loadAllocation = async () => {
    try {
      setLoading(true);
      // Default allocations if none exist
      const defaultAllocations: Record<string, number> = {
        contingency: 320000,
        pb: 800000,
        lemery: 600000,
        rosario: 500000,
        'san-juan': 400000,
        lex: 300000,
        step: 280000,
      };
      
      const data = await getOrCreateExtensionBudgetAllocation(currentYear, defaultAllocations);
      setAllocation(data);
    } catch (error) {
      console.error('Failed to load extension budget allocation:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAllocation = async (allocations: Record<string, number>) => {
    if (!allocation?.id) return;
    
    try {
      const totalBudget = Object.values(allocations).reduce((sum, val) => sum + val, 0);
      await updateExtensionBudgetAllocation(allocation.id, {
        allocations,
        totalBudget,
      });
      
      setAllocation(prev => prev ? { ...prev, allocations, totalBudget } : null);
    } catch (error) {
      console.error('Failed to update extension budget allocation:', error);
      throw error;
    }
  };

  const refreshAllocation = async () => {
    await loadAllocation();
  };

  useEffect(() => {
    loadAllocation();
  }, []);

  return (
    <ExtensionBudgetContext.Provider
      value={{
        allocation,
        loading,
        updateAllocation,
        refreshAllocation,
        currentYear,
      }}
    >
      {children}
    </ExtensionBudgetContext.Provider>
  );
};
