import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { 
  getFundCategories, 
  getFundingSources, 
  createFundCategory, 
  createFundingSource,
  updateFundCategory,
  updateFundingSource,
  deleteFundCategory,
  deleteFundingSource,
  type FundCategory,
  type FundingSource
} from '../lib/masterDataFirestore';

interface MasterDataContextType {
  fundCategories: FundCategory[];
  fundingSources: FundingSource[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  addFundCategory: (category: Omit<FundCategory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  addFundingSource: (source: Omit<FundingSource, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateFundCategory: (id: string, data: Partial<FundCategory>) => Promise<void>;
  updateFundingSource: (id: string, data: Partial<FundingSource>) => Promise<void>;
  deleteFundCategory: (id: string) => Promise<void>;
  deleteFundingSource: (id: string) => Promise<void>;
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

export const useMasterData = () => {
  const context = useContext(MasterDataContext);
  if (!context) {
    throw new Error('useMasterData must be used within MasterDataProvider');
  }
  return context;
};

interface MasterDataProviderProps {
  children: ReactNode;
}

export const MasterDataProvider: React.FC<MasterDataProviderProps> = ({ children }) => {
  const [fundCategories, setFundCategories] = useState<FundCategory[]>([]);
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [categoriesData, sourcesData] = await Promise.all([
        getFundCategories(),
        getFundingSources(),
      ]);
      
      setFundCategories(categoriesData);
      setFundingSources(sourcesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load master data');
      console.error('Error loading master data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await loadData();
  };

  const addFundCategory = async (category: Omit<FundCategory, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const id = await createFundCategory(category);
      await loadData();
      return id;
    } catch (err: any) {
      throw new Error('Failed to add fund category: ' + err.message);
    }
  };

  const addFundingSource = async (source: Omit<FundingSource, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const id = await createFundingSource(source);
      await loadData();
      return id;
    } catch (err: any) {
      throw new Error('Failed to add funding source: ' + err.message);
    }
  };

  const updateFundCategoryHandler = async (id: string, data: Partial<FundCategory>) => {
    try {
      await updateFundCategory(id, data);
      await loadData();
    } catch (err: any) {
      throw new Error('Failed to update fund category: ' + err.message);
    }
  };

  const updateFundingSourceHandler = async (id: string, data: Partial<FundingSource>) => {
    try {
      await updateFundingSource(id, data);
      await loadData();
    } catch (err: any) {
      throw new Error('Failed to update funding source: ' + err.message);
    }
  };

  const deleteFundCategoryHandler = async (id: string) => {
    try {
      await deleteFundCategory(id);
      await loadData();
    } catch (err: any) {
      throw new Error('Failed to delete fund category: ' + err.message);
    }
  };

  const deleteFundingSourceHandler = async (id: string) => {
    try {
      await deleteFundingSource(id);
      await loadData();
    } catch (err: any) {
      throw new Error('Failed to delete funding source: ' + err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <MasterDataContext.Provider
      value={{
        fundCategories,
        fundingSources,
        loading,
        error,
        refreshData,
        addFundCategory,
        addFundingSource,
        updateFundCategory: updateFundCategoryHandler,
        updateFundingSource: updateFundingSourceHandler,
        deleteFundCategory: deleteFundCategoryHandler,
        deleteFundingSource: deleteFundingSourceHandler,
      }}
    >
      {children}
    </MasterDataContext.Provider>
  );
};
